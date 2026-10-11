package com.gentlewalk.service;

import com.gentlewalk.api.dto.HotspotDto;
import com.gentlewalk.api.dto.PlanResponse;
import com.gentlewalk.config.AppProperties;
import com.gentlewalk.domain.*;
import com.gentlewalk.graph.GraphBuilder;
import org.jgrapht.Graph;
import org.jgrapht.GraphPath;
import org.jgrapht.alg.interfaces.ShortestPathAlgorithm;
import org.jgrapht.alg.shortestpath.DijkstraShortestPath;
import org.jgrapht.graph.AsWeightedGraph;
import org.jgrapht.graph.SimpleWeightedGraph;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class LoopPlannerService {

    private static final Logger log = LoggerFactory.getLogger(LoopPlannerService.class);

    private final AppProperties properties;
    private final DoseService doseService;
    private final IndoorFallbackService indoorFallbackService;

    public LoopPlannerService(AppProperties properties, DoseService doseService, IndoorFallbackService indoorFallbackService) {
        this.properties = properties;
        this.doseService = doseService;
        this.indoorFallbackService = indoorFallbackService;
    }

    public record PlannedLoop(
            LoopResult loopResult,
            List<PathEdge> edges,
            List<Long> vertices
    ) {}

    public PlanResponse planLoop(SimpleWeightedGraph<Long, PathEdge> baseGraph,
                                 Map<Long, NodeCoordinate> nodeMap,
                                 long startNodeId,
                                 int targetMinutes,
                                 double hourlyPm25,
                                 Sensitivity sensitivity,
                                 boolean lowMobility,
                                 List<HotspotDto> hotspots,
                                 String mode,
                                 WindowResult windowInfo) {

        double walkSpeed = properties.walkSpeedMPerMin() > 0 ? properties.walkSpeedMPerMin() : 60.0;
        double targetLengthM = targetMinutes * walkSpeed;
        double tolerance = properties.loop() != null && properties.loop().lengthTolerance() > 0
                ? properties.loop().lengthTolerance()
                : 0.25;
        double minAcceptableLength = targetLengthM * (1.0 - tolerance);
        double maxAcceptableLength = targetLengthM * (1.0 + tolerance);

        // Filter / prepare hotspot awareness
        Set<PathEdge> dynamicHotspotEdges = findEdgesNearHotspots(baseGraph, hotspots);

        // 1. Build weights for Clean mode and Typical mode
        Map<PathEdge, Double> cleanBaseWeights = new HashMap<>();
        Map<PathEdge, Double> typicalBaseWeights = new HashMap<>();

        for (PathEdge edge : baseGraph.edgeSet()) {
            PathEdge effectiveEdge = dynamicHotspotEdges.contains(edge) ? edge.withHotspot(true) : edge;

            // In low mobility mode, steep slopes are excluded
            if (lowMobility && !doseService.isEdgeTraversable(effectiveEdge, true)) {
                cleanBaseWeights.put(edge, 1e9); // effectively impassable
                typicalBaseWeights.put(edge, 1e9);
            } else {
                double cleanCost = doseService.calculateEdgeRoutingCost(effectiveEdge, hourlyPm25, sensitivity, lowMobility);
                cleanBaseWeights.put(edge, Math.max(0.001, cleanCost));
                typicalBaseWeights.put(edge, Math.max(0.1, edge.getLengthMeters()));
            }
        }

        // 2. Select turnaround candidate nodes using Dijkstra from start on length
        List<Long> turnaroundCandidates = selectTurnaroundCandidates(baseGraph, startNodeId, targetLengthM);

        if (turnaroundCandidates.isEmpty()) {
            log.warn("No turnaround candidates found within range; using all reachable non-start nodes");
            turnaroundCandidates = baseGraph.vertexSet().stream()
                    .filter(v -> !v.equals(startNodeId))
                    .limit(20)
                    .toList();
        }

        // 3. Generate candidate loops for Clean and Typical
        List<PlannedLoop> cleanCandidates = generateCandidateLoops(
                baseGraph, nodeMap, startNodeId, turnaroundCandidates,
                cleanBaseWeights, dynamicHotspotEdges, hourlyPm25, sensitivity, walkSpeed,
                minAcceptableLength, maxAcceptableLength, targetLengthM
        );

        List<PlannedLoop> typicalCandidates = generateCandidateLoops(
                baseGraph, nodeMap, startNodeId, turnaroundCandidates,
                typicalBaseWeights, dynamicHotspotEdges, hourlyPm25, sensitivity, walkSpeed,
                minAcceptableLength, maxAcceptableLength, targetLengthM
        );

        if (cleanCandidates.isEmpty()) {
            throw new IllegalStateException("Could not generate any viable clean walking loop for the requested parameters.");
        }
        if (typicalCandidates.isEmpty()) {
            typicalCandidates = cleanCandidates;
        }

        // 4. Select Best (minimum dose in clean set)
        PlannedLoop bestLoop = cleanCandidates.stream()
                .min(Comparator.comparingDouble(l -> l.loopResult().dose()))
                .orElse(cleanCandidates.getFirst());

        // 5. Select Baseline (loop in typical set closest to typical median dose)
        PlannedLoop baselineLoop = selectMedianDoseLoop(typicalCandidates);

        // 6. Metrics comparison
        double bestDose = bestLoop.loopResult().dose();
        double baselineDose = baselineLoop.loopResult().dose();
        double reductionPct = baselineDose > 0.0001
                ? Math.max(0.0, ((baselineDose - bestDose) / baselineDose) * 100.0)
                : 0.0;
        double extraMinutes = Math.round((bestLoop.loopResult().durationMinutes() - baselineLoop.loopResult().durationMinutes()) * 10.0) / 10.0;

        String disclaimer = properties.disclaimer() != null
                ? properties.disclaimer()
                : "Gentle Walk is an algorithmic planning aid and not medical advice.";

        NodeCoordinate startCoord = nodeMap.get(startNodeId);
        double sLat = startCoord != null ? startCoord.lat() : 28.6139;
        double sLon = startCoord != null ? startCoord.lon() : 77.2090;
        List<IndoorVenue> indoorFallbacks = indoorFallbackService != null
                ? indoorFallbackService.getIndoorFallbacks(sLat, sLon, 4)
                : List.of();

        return new PlanResponse(
                mode,
                windowInfo,
                bestLoop.loopResult(),
                baselineLoop.loopResult(),
                Math.round(reductionPct * 10.0) / 10.0,
                extraMinutes,
                disclaimer,
                indoorFallbacks
        );
    }

    private List<Long> selectTurnaroundCandidates(SimpleWeightedGraph<Long, PathEdge> graph, long startNodeId, double targetLengthM) {
        DijkstraShortestPath<Long, PathEdge> dijkstra = new DijkstraShortestPath<>(graph);
        ShortestPathAlgorithm.SingleSourcePaths<Long, PathEdge> paths = dijkstra.getPaths(startNodeId);

        List<Long> candidates = new ArrayList<>();
        double lowerBound = 0.3 * targetLengthM;
        double upperBound = 1.1 * targetLengthM;

        for (Long v : graph.vertexSet()) {
            if (v.equals(startNodeId)) continue;
            double dist = paths.getWeight(v);
            if (!Double.isInfinite(dist)) {
                double twoTimesDist = 2.0 * dist;
                if (twoTimesDist >= lowerBound && twoTimesDist <= upperBound) {
                    candidates.add(v);
                }
            }
        }

        // Shuffle with fixed seed for deterministic repeatability
        long seed = properties.loop() != null ? properties.loop().randomSeed() : 42L;
        Collections.shuffle(candidates, new Random(seed));

        int maxCandidates = properties.loop() != null && properties.loop().maxCandidates() > 0
                ? properties.loop().maxCandidates()
                : 60;

        return candidates.subList(0, Math.min(candidates.size(), maxCandidates));
    }

    private List<PlannedLoop> generateCandidateLoops(SimpleWeightedGraph<Long, PathEdge> baseGraph,
                                                     Map<Long, NodeCoordinate> nodeMap,
                                                     long startNodeId,
                                                     List<Long> turnaroundCandidates,
                                                     Map<PathEdge, Double> baseWeights,
                                                     Set<PathEdge> dynamicHotspotEdges,
                                                     double hourlyPm25,
                                                     Sensitivity sensitivity,
                                                     double walkSpeed,
                                                     double minAcceptableLength,
                                                     double maxAcceptableLength,
                                                     double targetLengthM) {

        double returnPenalty = properties.loop() != null && properties.loop().returnPathPenalty() > 1.0
                ? properties.loop().returnPathPenalty()
                : 4.0;

        Graph<Long, PathEdge> outwardGraph = new AsWeightedGraph<>(baseGraph, baseWeights, false);
        DijkstraShortestPath<Long, PathEdge> outwardDijkstra = new DijkstraShortestPath<>(outwardGraph);
        ShortestPathAlgorithm.SingleSourcePaths<Long, PathEdge> outwardPaths = outwardDijkstra.getPaths(startNodeId);

        List<PlannedLoop> loops = new ArrayList<>();
        PlannedLoop bestFallback = null;
        double minFallbackDiff = Double.MAX_VALUE;

        for (Long turnaround : turnaroundCandidates) {
            GraphPath<Long, PathEdge> outPath = outwardPaths.getPath(turnaround);
            if (outPath == null) continue;

            List<PathEdge> outEdges = outPath.getEdgeList();
            if (outEdges.isEmpty()) continue;

            // Prepare return graph with penalized outward edges (DO NOT mutate baseGraph)
            Set<PathEdge> outEdgeSet = new HashSet<>(outEdges);
            Map<PathEdge, Double> returnWeights = new HashMap<>(baseWeights.size());
            for (Map.Entry<PathEdge, Double> entry : baseWeights.entrySet()) {
                PathEdge e = entry.getKey();
                double weight = entry.getValue();
                if (outEdgeSet.contains(e)) {
                    weight = weight * returnPenalty;
                }
                returnWeights.put(e, weight);
            }

            Graph<Long, PathEdge> returnGraph = new AsWeightedGraph<>(baseGraph, returnWeights, false);
            DijkstraShortestPath<Long, PathEdge> returnDijkstra = new DijkstraShortestPath<>(returnGraph);
            GraphPath<Long, PathEdge> returnPath = returnDijkstra.getPath(turnaround, startNodeId);
            if (returnPath == null) continue;

            List<PathEdge> retEdges = returnPath.getEdgeList();
            if (retEdges.isEmpty()) continue;

            // Assemble loop
            List<PathEdge> fullEdges = new ArrayList<>(outEdges);
            fullEdges.addAll(retEdges);

            List<Long> fullVertices = new ArrayList<>(outPath.getVertexList());
            List<Long> retVertices = returnPath.getVertexList();
            for (int i = 1; i < retVertices.size(); i++) {
                fullVertices.add(retVertices.get(i));
            }

            // Calculate metrics
            double totalLength = 0.0;
            double totalDose = 0.0;
            int benchCount = 0;
            Map<String, Double> roadClassBreakdown = new HashMap<>();

            for (PathEdge edge : fullEdges) {
                PathEdge effectiveEdge = dynamicHotspotEdges.contains(edge) ? edge.withHotspot(true) : edge;
                double edgeLen = effectiveEdge.getLengthMeters();
                totalLength += edgeLen;
                totalDose += doseService.calculateEdgeDose(effectiveEdge, hourlyPm25, sensitivity);
                if (effectiveEdge.isHasBench()) {
                    benchCount++;
                }
                String roadClassName = effectiveEdge.getRoadClass().name();
                roadClassBreakdown.put(roadClassName, roadClassBreakdown.getOrDefault(roadClassName, 0.0) + edgeLen);
            }

            double durationMins = totalLength / walkSpeed;

            // Build GeoJSON coordinate array [[lon, lat], ...]
            List<List<Double>> geoJsonCoords = new ArrayList<>();
            for (Long vid : fullVertices) {
                NodeCoordinate nc = nodeMap.get(vid);
                if (nc != null) {
                    geoJsonCoords.add(List.of(nc.lon(), nc.lat()));
                }
            }

            LoopResult loopResult = new LoopResult(
                    Math.round(totalLength * 10.0) / 10.0,
                    Math.round(durationMins * 10.0) / 10.0,
                    Math.round(totalDose * 100.0) / 100.0,
                    benchCount,
                    geoJsonCoords,
                    roadClassBreakdown
            );

            PlannedLoop plannedLoop = new PlannedLoop(loopResult, fullEdges, fullVertices);

            // Check tolerance acceptance
            if (totalLength >= minAcceptableLength && totalLength <= maxAcceptableLength) {
                loops.add(plannedLoop);
            } else {
                double diff = Math.abs(totalLength - targetLengthM);
                if (diff < minFallbackDiff) {
                    minFallbackDiff = diff;
                    bestFallback = plannedLoop;
                }
            }
        }

        if (loops.isEmpty() && bestFallback != null) {
            log.info("No loops within strict tolerance; using closest loop of length {}m (target: {}m)",
                    bestFallback.loopResult().lengthMeters(), targetLengthM);
            loops.add(bestFallback);
        }

        return loops;
    }

    private PlannedLoop selectMedianDoseLoop(List<PlannedLoop> loops) {
        if (loops.size() == 1) {
            return loops.getFirst();
        }
        List<PlannedLoop> sorted = new ArrayList<>(loops);
        sorted.sort(Comparator.comparingDouble(l -> l.loopResult().dose()));

        int medianIdx = sorted.size() / 2;
        double medianDose = sorted.get(medianIdx).loopResult().dose();

        return sorted.stream()
                .min(Comparator.comparingDouble(l -> Math.abs(l.loopResult().dose() - medianDose)))
                .orElse(sorted.getFirst());
    }

    private Set<PathEdge> findEdgesNearHotspots(SimpleWeightedGraph<Long, PathEdge> graph, List<HotspotDto> hotspots) {
        if (hotspots == null || hotspots.isEmpty()) {
            return Set.of();
        }
        Set<PathEdge> result = new HashSet<>();
        for (PathEdge edge : graph.edgeSet()) {
            double[] mid = edge.midpoint();
            for (HotspotDto h : hotspots) {
                if (GraphBuilder.haversineMeters(mid[0], mid[1], h.lat(), h.lon()) <= 30.0) {
                    result.add(edge);
                    break;
                }
            }
        }
        return result;
    }
}
