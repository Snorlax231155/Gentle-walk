package com.gentlewalk.api;

import com.gentlewalk.air.AirQualityClient;
import com.gentlewalk.air.DemoAirData;
import com.gentlewalk.api.dto.PlanRequest;
import com.gentlewalk.api.dto.PlanResponse;
import com.gentlewalk.api.dto.WindowResponse;
import com.gentlewalk.config.AppProperties;
import com.gentlewalk.domain.NodeCoordinate;
import com.gentlewalk.domain.PathEdge;
import com.gentlewalk.domain.WindowResult;
import com.gentlewalk.graph.DemoGraphFactory;
import com.gentlewalk.graph.GraphBuilder;
import com.gentlewalk.service.LoopPlannerService;
import com.gentlewalk.service.WindowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.jgrapht.graph.SimpleWeightedGraph;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@Tag(name = "Gentle Walk API", description = "Hyperlocal walking planner optimizing inhaled particulate exposure for elders")
public class WalkController {

    private final AirQualityClient airQualityClient;
    private final WindowService windowService;
    private final DemoGraphFactory demoGraphFactory;
    private final GraphBuilder graphBuilder;
    private final LoopPlannerService loopPlannerService;
    private final AppProperties properties;

    public WalkController(AirQualityClient airQualityClient,
                          WindowService windowService,
                          DemoGraphFactory demoGraphFactory,
                          GraphBuilder graphBuilder,
                          LoopPlannerService loopPlannerService,
                          AppProperties properties) {
        this.airQualityClient = airQualityClient;
        this.windowService = windowService;
        this.demoGraphFactory = demoGraphFactory;
        this.graphBuilder = graphBuilder;
        this.loopPlannerService = loopPlannerService;
        this.properties = properties;
    }

    @GetMapping("/health")
    @Operation(summary = "Health check")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "gentle-walk",
                "timestamp", Instant.now().toString()
        ));
    }

    @GetMapping("/window")
    @Operation(summary = "Find the cleanest walking window today and 24-hour PM2.5 forecast")
    public ResponseEntity<WindowResponse> getWindow(
            @RequestParam(defaultValue = "28.6139") double lat,
            @RequestParam(defaultValue = "77.2090") double lon,
            @RequestParam(defaultValue = "1") int hours,
            @RequestParam(defaultValue = "false") boolean demo) {

        List<Double> pm24 = demo
                ? DemoAirData.get24HourSeries()
                : airQualityClient.getHourlyPm25(lat, lon);

        String mode = demo ? "demo" : "live";
        WindowResult window = windowService.bestWindow(pm24, hours, 5, 20);

        String disclaimer = properties.disclaimer() != null
                ? properties.disclaimer()
                : "Gentle Walk is an algorithmic planning aid and not medical advice.";

        return ResponseEntity.ok(new WindowResponse(mode, window, disclaimer));
    }

    @PostMapping("/plan")
    @Operation(summary = "Plan cleanest vs typical walking loop under elder constraints")
    public ResponseEntity<PlanResponse> plan(@Valid @RequestBody PlanRequest request) {
        boolean isDemo = Boolean.TRUE.equals(request.demo());
        String mode = isDemo ? "demo" : "live";

        // 1. Air quality series
        List<Double> pm24 = isDemo
                ? DemoAirData.get24HourSeries()
                : airQualityClient.getHourlyPm25(request.lat(), request.lon());

        WindowResult window = windowService.bestWindow(pm24, 1, 5, 20);

        // 2. Walking hour selection (default = best window start)
        int walkHour = request.hour() != null ? request.hour() : window.startHour();
        walkHour = Math.max(0, Math.min(23, walkHour));
        double hourlyPm25 = pm24.get(walkHour);

        // 3. Graph retrieval
        SimpleWeightedGraph<Long, PathEdge> graph;
        Map<Long, NodeCoordinate> nodeMap;
        long startNodeId;

        if (isDemo) {
            DemoGraphFactory.DemoGraphResult demoGraph = demoGraphFactory.createDemoGraph();
            graph = demoGraph.graph();
            nodeMap = demoGraph.nodes();
            startNodeId = demoGraph.defaultStartNodeId();
        } else {
            GraphBuilder.GraphBuildResult liveResult = graphBuilder.buildLiveGraph(
                    request.lat(),
                    request.lon(),
                    request.radiusM(),
                    request.hotspots()
            );
            graph = liveResult.graph();
            nodeMap = liveResult.nodes();
            startNodeId = liveResult.snappedStartNodeId();
        }

        // 4. Loop planning
        PlanResponse planResponse = loopPlannerService.planLoop(
                graph,
                nodeMap,
                startNodeId,
                request.minutes(),
                hourlyPm25,
                request.sensitivity(),
                Boolean.TRUE.equals(request.lowMobility()),
                request.hotspots(),
                mode,
                window
        );

        return ResponseEntity.ok(planResponse);
    }
}
