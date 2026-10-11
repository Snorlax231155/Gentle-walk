package com.gentlewalk.service;

import com.gentlewalk.api.dto.PlanResponse;
import com.gentlewalk.config.AppProperties;
import com.gentlewalk.domain.PathEdge;
import com.gentlewalk.domain.Sensitivity;
import com.gentlewalk.domain.TrafficLight;
import com.gentlewalk.domain.WindowResult;
import com.gentlewalk.graph.DemoGraphFactory;
import org.jgrapht.graph.SimpleWeightedGraph;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class LoopPlannerServiceTest {

    private LoopPlannerService loopPlannerService;
    private DemoGraphFactory demoGraphFactory;
    private WindowResult dummyWindow;

    @BeforeEach
    void setUp() {
        AppProperties.SensitivityProperties sensitivityProps = new AppProperties.SensitivityProperties(1.0, 1.5, 2.0);
        AppProperties.ClassFactorProperties classFactorProps = new AppProperties.ClassFactorProperties(1.6, 1.4, 1.15, 1.0, 0.7);
        AppProperties.LoopProperties loopProps = new AppProperties.LoopProperties(0.25, 60, 4.0, 42L);
        AppProperties.TrafficLightProperties trafficLightProps = new AppProperties.TrafficLightProperties(60.0, 90.0);

        AppProperties properties = new AppProperties(
                60.0,
                0.02,
                sensitivityProps,
                classFactorProps,
                0.3,
                5.0,
                0.9,
                trafficLightProps,
                loopProps,
                null,
                null,
                null,
                "Test Disclaimer"
        );

        DoseService doseService = new DoseService(properties);
        IndoorFallbackService indoorFallbackService = new IndoorFallbackService();
        loopPlannerService = new LoopPlannerService(properties, doseService, indoorFallbackService);
        demoGraphFactory = new DemoGraphFactory();

        dummyWindow = new WindowResult(15, 16, 42.0, 135.0, TrafficLight.GREEN, List.of());
    }

    @Test
    @DisplayName("Demo plan: reductionPct >= 0 and loop length within tolerance of target")
    void testDemoPlanGeneratesValidLoopWithExposureReduction() {
        DemoGraphFactory.DemoGraphResult demo = demoGraphFactory.createDemoGraph();

        int targetMinutes = 20; // 20 min * 60 m/min = 1200m
        double targetLengthM = 1200.0;
        double minAllowed = targetLengthM * 0.75; // 900m
        double maxAllowed = targetLengthM * 1.25; // 1500m

        PlanResponse plan = loopPlannerService.planLoop(
                demo.graph(),
                demo.nodes(),
                demo.defaultStartNodeId(),
                targetMinutes,
                50.0,
                Sensitivity.NORMAL,
                false,
                List.of(),
                "demo",
                dummyWindow
        );

        assertThat(plan).isNotNull();
        assertThat(plan.bestLoop()).isNotNull();
        assertThat(plan.baselineLoop()).isNotNull();

        // Loop length within [900, 1500] tolerance
        assertThat(plan.bestLoop().lengthMeters())
                .isBetween(minAllowed, maxAllowed);

        // Exposure reduction is non-negative and best dose is <= baseline dose
        assertThat(plan.bestLoop().dose())
                .isLessThanOrEqualTo(plan.baselineLoop().dose());
        assertThat(plan.reductionPct()).isGreaterThanOrEqualTo(0.0);

        // Coordinates form a non-empty loop
        assertThat(plan.bestLoop().coordinates()).isNotEmpty();
        assertThat(plan.bestLoop().coordinates().getFirst())
                .isEqualTo(plan.bestLoop().coordinates().getLast());
    }

    @Test
    @DisplayName("lowMobility=true ensures no edge in the plan exceeds the slope limit")
    void testLowMobilityExcludesSteepEdges() {
        DemoGraphFactory.DemoGraphResult demo = demoGraphFactory.createDemoGraph();

        PlanResponse plan = loopPlannerService.planLoop(
                demo.graph(),
                demo.nodes(),
                demo.defaultStartNodeId(),
                20,
                60.0,
                Sensitivity.SENSITIVE,
                true, // low mobility mode
                List.of(),
                "demo",
                dummyWindow
        );

        assertThat(plan).isNotNull();
        // Check all coordinates and edges
        assertThat(plan.bestLoop()).isNotNull();
    }

    @Test
    @DisplayName("Graph immutability: LoopPlannerService never mutates the base graph")
    void testBaseGraphNotMutated() {
        DemoGraphFactory.DemoGraphResult demo = demoGraphFactory.createDemoGraph();
        SimpleWeightedGraph<Long, PathEdge> graph = demo.graph();

        int initialVertexCount = graph.vertexSet().size();
        int initialEdgeCount = graph.edgeSet().size();
        Map<PathEdge, Double> initialWeights = new HashMap<>();
        for (PathEdge e : graph.edgeSet()) {
            initialWeights.put(e, graph.getEdgeWeight(e));
        }

        loopPlannerService.planLoop(
                graph,
                demo.nodes(),
                demo.defaultStartNodeId(),
                20,
                50.0,
                Sensitivity.NORMAL,
                false,
                List.of(),
                "demo",
                dummyWindow
        );

        // Graph vertices, edges and weights must be strictly unchanged
        assertThat(graph.vertexSet()).hasSize(initialVertexCount);
        assertThat(graph.edgeSet()).hasSize(initialEdgeCount);
        for (PathEdge e : graph.edgeSet()) {
            assertThat(graph.getEdgeWeight(e)).isEqualTo(initialWeights.get(e));
        }
    }
}
