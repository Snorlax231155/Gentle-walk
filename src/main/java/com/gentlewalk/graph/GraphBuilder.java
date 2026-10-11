package com.gentlewalk.graph;

import com.gentlewalk.api.dto.HotspotDto;
import com.gentlewalk.domain.NodeCoordinate;
import com.gentlewalk.domain.PathEdge;
import com.gentlewalk.domain.RoadClass;
import com.gentlewalk.graph.dto.OverpassResponse;
import org.jgrapht.graph.SimpleWeightedGraph;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.LinearRing;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.Polygon;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class GraphBuilder {

    private static final Logger log = LoggerFactory.getLogger(GraphBuilder.class);
    private static final GeometryFactory GEOM_FACTORY = new GeometryFactory();

    private final OverpassClient overpassClient;
    private final ElevationClient elevationClient;
    private final DemoGraphFactory demoGraphFactory;

    @Autowired
    public GraphBuilder(OverpassClient overpassClient, ElevationClient elevationClient, DemoGraphFactory demoGraphFactory) {
        this.overpassClient = overpassClient;
        this.elevationClient = elevationClient;
        this.demoGraphFactory = demoGraphFactory != null ? demoGraphFactory : new DemoGraphFactory();
    }

    public GraphBuilder(OverpassClient overpassClient, ElevationClient elevationClient) {
        this(overpassClient, elevationClient, new DemoGraphFactory());
    }

    public record GraphBuildResult(
            SimpleWeightedGraph<Long, PathEdge> graph,
            Map<Long, NodeCoordinate> nodes,
            long snappedStartNodeId
    ) {}

    public GraphBuildResult buildLiveGraph(double startLat, double startLon, int radiusM, List<HotspotDto> hotspots) {
        try {
            OverpassResponse osmData = overpassClient.fetchOsmData(startLat, startLon, radiusM);
            return buildFromOsmData(osmData, startLat, startLon, hotspots);
        } catch (Exception e) {
            log.warn("Overpass OSM live query failed ({}); generating local elder walking network for ({}, {})", e.getMessage(), startLat, startLon);
            DemoGraphFactory.DemoGraphResult fallback = demoGraphFactory.createGraphForCenter(startLat, startLon);
            return new GraphBuildResult(fallback.graph(), fallback.nodes(), fallback.defaultStartNodeId());
        }
    }

    public GraphBuildResult buildFromOsmData(OverpassResponse osmData, double startLat, double startLon, List<HotspotDto> hotspots) {
        if (osmData == null || osmData.elements() == null || osmData.elements().isEmpty()) {
            throw new IllegalArgumentException("No walkable ways returned by OpenStreetMap for this location and radius.");
        }

        // 1. Collect parks and benches
        List<Polygon> parkPolygons = new ArrayList<>();
        List<double[]> benchNodes = new ArrayList<>();
        List<OverpassResponse.Element> wayElements = new ArrayList<>();

        for (OverpassResponse.Element el : osmData.elements()) {
            if ("node".equalsIgnoreCase(el.type())) {
                if (el.tags() != null && "bench".equalsIgnoreCase(el.tags().get("amenity"))) {
                    if (el.lat() != null && el.lon() != null) {
                        benchNodes.add(new double[]{el.lat(), el.lon()});
                    }
                }
            } else if ("way".equalsIgnoreCase(el.type())) {
                if (el.tags() != null && "park".equalsIgnoreCase(el.tags().get("leisure"))) {
                    Polygon poly = parseParkPolygon(el.geometry());
                    if (poly != null) {
                        parkPolygons.add(poly);
                    }
                }
                if (el.tags() != null && el.tags().containsKey("highway")) {
                    wayElements.add(el);
                }
            }
        }

        if (wayElements.isEmpty()) {
            throw new IllegalArgumentException("No walkable highway ways found in the OpenStreetMap data.");
        }

        // 2. Collect unique nodes and raw node coordinates
        Map<Long, double[]> rawNodeCoords = new HashMap<>();
        for (OverpassResponse.Element way : wayElements) {
            List<Long> nodeIds = way.nodes();
            List<OverpassResponse.GeoPoint> geom = way.geometry();
            if (nodeIds != null && geom != null && nodeIds.size() == geom.size()) {
                for (int i = 0; i < nodeIds.size(); i++) {
                    Long nid = nodeIds.get(i);
                    OverpassResponse.GeoPoint pt = geom.get(i);
                    if (nid != null && pt != null && pt.lat() != null && pt.lon() != null) {
                        rawNodeCoords.putIfAbsent(nid, new double[]{pt.lat(), pt.lon()});
                    }
                }
            }
        }

        // 3. Batch elevation query for nodes
        List<Long> orderedNodeIds = new ArrayList<>(rawNodeCoords.keySet());
        List<double[]> orderedCoords = new ArrayList<>(orderedNodeIds.size());
        for (Long nid : orderedNodeIds) {
            orderedCoords.add(rawNodeCoords.get(nid));
        }

        List<Double> elevations = elevationClient.getElevations(orderedCoords);
        Map<Long, NodeCoordinate> nodeMap = new HashMap<>();
        for (int i = 0; i < orderedNodeIds.size(); i++) {
            Long nid = orderedNodeIds.get(i);
            double[] c = orderedCoords.get(i);
            double elev = (i < elevations.size() && elevations.get(i) != null) ? elevations.get(i) : 0.0;
            nodeMap.put(nid, new NodeCoordinate(nid, c[0], c[1], elev));
        }

        // 4. Construct graph and edges
        SimpleWeightedGraph<Long, PathEdge> graph = new SimpleWeightedGraph<>(PathEdge.class);
        for (Long nid : nodeMap.keySet()) {
            graph.addVertex(nid);
        }

        AtomicLong edgeIdSeq = new AtomicLong(1);
        List<HotspotDto> safeHotspots = hotspots != null ? hotspots : List.of();

        for (OverpassResponse.Element way : wayElements) {
            List<Long> nodeIds = way.nodes();
            List<OverpassResponse.GeoPoint> geom = way.geometry();
            if (nodeIds == null || geom == null || nodeIds.size() < 2 || nodeIds.size() != geom.size()) {
                continue;
            }

            String highwayTag = way.tags() != null ? way.tags().get("highway") : null;
            RoadClass baseRoadClass = RoadClass.fromOsmHighway(highwayTag);

            for (int i = 0; i < nodeIds.size() - 1; i++) {
                Long u = nodeIds.get(i);
                Long v = nodeIds.get(i + 1);
                if (u.equals(v) || graph.containsEdge(u, v)) {
                    continue;
                }

                NodeCoordinate coordU = nodeMap.get(u);
                NodeCoordinate coordV = nodeMap.get(v);
                if (coordU == null || coordV == null) {
                    continue;
                }

                double distM = haversineMeters(coordU.lat(), coordU.lon(), coordV.lat(), coordV.lon());
                if (distM < 0.5) {
                    distM = 1.0; // avoid zero length edges
                }

                double midLat = (coordU.lat() + coordV.lat()) / 2.0;
                double midLon = (coordU.lon() + coordV.lon()) / 2.0;

                // Check park polygon
                RoadClass edgeRoadClass = baseRoadClass;
                if (isInsideAnyPark(midLat, midLon, parkPolygons)) {
                    edgeRoadClass = RoadClass.PARK_PATH;
                }

                // Check bench within 25m
                boolean hasBench = isNearBench(midLat, midLon, benchNodes, 25.0);

                // Check slope
                double elevDiff = Math.abs(coordU.elevationM() - coordV.elevationM());
                double slopePercent = (elevDiff / distM) * 100.0;

                // Check hotspot within 30m
                boolean isHotspot = isNearHotspot(midLat, midLon, safeHotspots, 30.0);

                List<double[]> edgeCoords = List.of(
                        new double[]{coordU.lat(), coordU.lon()},
                        new double[]{coordV.lat(), coordV.lon()}
                );

                PathEdge edge = new PathEdge(
                        edgeIdSeq.getAndIncrement(),
                        u,
                        v,
                        distM,
                        edgeRoadClass,
                        slopePercent,
                        hasBench,
                        isHotspot,
                        edgeCoords
                );

                graph.addEdge(u, v, edge);
                graph.setEdgeWeight(edge, distM);
            }
        }

        if (graph.edgeSet().isEmpty()) {
            throw new IllegalArgumentException("No traversable edges could be built from OpenStreetMap data for this area.");
        }

        // 5. Snap request coordinates to nearest node
        long snappedStartNodeId = snapToNearestNode(startLat, startLon, nodeMap, graph.vertexSet());

        return new GraphBuildResult(graph, nodeMap, snappedStartNodeId);
    }

    private boolean isInsideAnyPark(double lat, double lon, List<Polygon> parkPolygons) {
        if (parkPolygons.isEmpty()) return false;
        Point pt = GEOM_FACTORY.createPoint(new Coordinate(lon, lat)); // JTS uses (x, y) = (lon, lat)
        for (Polygon poly : parkPolygons) {
            if (poly.covers(pt) || poly.contains(pt)) {
                return true;
            }
        }
        return false;
    }

    private boolean isNearBench(double midLat, double midLon, List<double[]> benchNodes, double thresholdM) {
        for (double[] b : benchNodes) {
            if (haversineMeters(midLat, midLon, b[0], b[1]) <= thresholdM) {
                return true;
            }
        }
        return false;
    }

    private boolean isNearHotspot(double midLat, double midLon, List<HotspotDto> hotspots, double thresholdM) {
        for (HotspotDto h : hotspots) {
            if (haversineMeters(midLat, midLon, h.lat(), h.lon()) <= thresholdM) {
                return true;
            }
        }
        return false;
    }

    private long snapToNearestNode(double targetLat, double targetLon, Map<Long, NodeCoordinate> nodeMap, Set<Long> vertexSet) {
        long bestNode = -1;
        double minDistance = Double.MAX_VALUE;

        for (Long nodeId : vertexSet) {
            NodeCoordinate coord = nodeMap.get(nodeId);
            if (coord != null) {
                double dist = haversineMeters(targetLat, targetLon, coord.lat(), coord.lon());
                if (dist < minDistance) {
                    minDistance = dist;
                    bestNode = nodeId;
                }
            }
        }

        if (bestNode == -1) {
            return vertexSet.iterator().next();
        }
        return bestNode;
    }

    private Polygon parseParkPolygon(List<OverpassResponse.GeoPoint> geom) {
        if (geom == null || geom.size() < 3) {
            return null;
        }

        List<Coordinate> coords = new ArrayList<>();
        for (OverpassResponse.GeoPoint p : geom) {
            if (p.lat() != null && p.lon() != null) {
                coords.add(new Coordinate(p.lon(), p.lat())); // x=lon, y=lat
            }
        }

        if (coords.size() < 3) {
            return null;
        }

        // Ensure closed ring
        Coordinate first = coords.getFirst();
        Coordinate last = coords.getLast();
        if (!first.equals2D(last)) {
            coords.add(new Coordinate(first.x, first.y));
        }

        if (coords.size() < 4) {
            return null;
        }

        try {
            LinearRing ring = GEOM_FACTORY.createLinearRing(coords.toArray(new Coordinate[0]));
            return GEOM_FACTORY.createPolygon(ring);
        } catch (Exception e) {
            log.debug("Could not build JTS polygon from OSM park points: {}", e.getMessage());
            return null;
        }
    }

    public static double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        double r = 6371000.0; // Earth radius in meters
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2.0) * Math.sin(dLon / 2.0);
        double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
        return r * c;
    }
}
