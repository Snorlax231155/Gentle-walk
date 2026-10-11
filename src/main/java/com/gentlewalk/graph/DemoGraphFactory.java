package com.gentlewalk.graph;

import com.gentlewalk.domain.NodeCoordinate;
import com.gentlewalk.domain.PathEdge;
import com.gentlewalk.domain.RoadClass;
import org.jgrapht.graph.SimpleWeightedGraph;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class DemoGraphFactory {

    public static final double BASE_LAT = 28.6139;
    public static final double BASE_LON = 77.2090;
    public static final double LAT_STEP = 60.0 / 111000.0; // ~60m spacing in lat
    public static final double LON_STEP = 60.0 / (111000.0 * Math.cos(Math.toRadians(28.6139))); // ~60m spacing in lon
    public static final int GRID_SIZE = 14;

    public record DemoGraphResult(
            SimpleWeightedGraph<Long, PathEdge> graph,
            Map<Long, NodeCoordinate> nodes,
            long defaultStartNodeId
    ) {}

    public DemoGraphResult createDemoGraph() {
        return createGraphForCenter(BASE_LAT, BASE_LON);
    }

    public DemoGraphResult createGraphForCenter(double centerLat, double centerLon) {
        SimpleWeightedGraph<Long, PathEdge> graph = new SimpleWeightedGraph<>(PathEdge.class);
        Map<Long, NodeCoordinate> nodes = new HashMap<>();
        AtomicLong edgeIdGen = new AtomicLong(1);

        double latStep = 60.0 / 111000.0;
        double cosLat = Math.cos(Math.toRadians(centerLat));
        double lonStep = 60.0 / (111000.0 * (Math.abs(cosLat) > 0.001 ? Math.abs(cosLat) : 1.0));

        // 1. Create 14x14 nodes centered around (centerLat, centerLon)
        for (int r = 0; r < GRID_SIZE; r++) {
            for (int c = 0; c < GRID_SIZE; c++) {
                long nodeId = (long) r * 100 + c;
                double lat = centerLat + (r - GRID_SIZE / 2.0) * latStep;
                double lon = centerLon + (c - GRID_SIZE / 2.0) * lonStep;
                double elevation = (r >= 10 && c >= 10) ? 220.0 + (r + c) * 3.0 : 210.0;
                NodeCoordinate coord = new NodeCoordinate(nodeId, lat, lon, elevation);
                nodes.put(nodeId, coord);
                graph.addVertex(nodeId);
            }
        }

        // 2. Connect horizontal and vertical edges
        for (int r = 0; r < GRID_SIZE; r++) {
            for (int c = 0; c < GRID_SIZE; c++) {
                long u = (long) r * 100 + c;

                // Horizontal neighbor (r, c+1)
                if (c + 1 < GRID_SIZE) {
                    long v = (long) r * 100 + (c + 1);
                    addEdge(graph, nodes, edgeIdGen, u, v, r, c, r, c + 1);
                }

                // Vertical neighbor (r+1, c)
                if (r + 1 < GRID_SIZE) {
                    long v = (long) (r + 1) * 100 + c;
                    addEdge(graph, nodes, edgeIdGen, u, v, r, c, r + 1, c);
                }
            }
        }

        // Default start node near park: row 2, col 2 -> ID 202
        long startNodeId = 202L;

        return new DemoGraphResult(graph, nodes, startNodeId);
    }

    private void addEdge(SimpleWeightedGraph<Long, PathEdge> graph,
                         Map<Long, NodeCoordinate> nodes,
                         AtomicLong edgeIdGen,
                         long u, long v,
                         int r1, int c1, int r2, int c2) {
        NodeCoordinate coordU = nodes.get(u);
        NodeCoordinate coordV = nodes.get(v);

        double lengthM = 60.0; // uniform 60m spacing

        // Road class logic:
        // - Primary along row 5
        // - Secondary along col 9
        // - Park with benches in corner (rows 0..3, cols 0..3)
        // - Steep patch (8% slope) in rows 10..12, cols 10..12
        // - Hotspot near main junction (row 5, col 9)

        boolean inPark = (r1 <= 3 && c1 <= 3 && r2 <= 3 && c2 <= 3);
        boolean isPrimary = (r1 == 5 && r2 == 5);
        boolean isSecondary = (c1 == 9 && c2 == 9);

        RoadClass roadClass;
        boolean hasBench = false;
        if (inPark) {
            roadClass = RoadClass.PARK_PATH;
            hasBench = true; // park has benches
        } else if (isPrimary) {
            roadClass = RoadClass.PRIMARY;
        } else if (isSecondary) {
            roadClass = RoadClass.SECONDARY;
        } else if ((r1 % 2 == 0 && r2 % 2 == 0) || (c1 % 2 == 0 && c2 % 2 == 0)) {
            roadClass = RoadClass.FOOTPATH;
        } else {
            roadClass = RoadClass.RESIDENTIAL;
        }

        // Steep patch
        double slope = 1.0;
        if (r1 >= 10 && c1 >= 10 && r2 >= 10 && c2 >= 10) {
            slope = 8.0; // 8% slope
        }

        // Hotspot near junction (5, 9)
        boolean isHotspot = (r1 == 5 && c1 == 9) || (r2 == 5 && c2 == 9) ||
                (Math.abs(r1 - 5) <= 1 && Math.abs(c1 - 9) <= 1 && Math.abs(r2 - 5) <= 1 && Math.abs(c2 - 9) <= 1 && (isPrimary || isSecondary));

        List<double[]> coords = List.of(
                new double[]{coordU.lat(), coordU.lon()},
                new double[]{coordV.lat(), coordV.lon()}
        );

        PathEdge edge = new PathEdge(
                edgeIdGen.getAndIncrement(),
                u,
                v,
                lengthM,
                roadClass,
                slope,
                hasBench,
                isHotspot,
                coords
        );

        graph.addEdge(u, v, edge);
        graph.setEdgeWeight(edge, lengthM);
    }
}
