package com.gentlewalk.domain;

import java.util.List;
import java.util.Objects;

public class PathEdge {
    private final long edgeId;
    private final long sourceNodeId;
    private final long targetNodeId;
    private final double lengthMeters;
    private final RoadClass roadClass;
    private final double slopePercent;
    private final boolean hasBench;
    private final boolean isHotspot;
    private final List<double[]> coordinates; // list of [lat, lon]

    public PathEdge(long edgeId,
                    long sourceNodeId,
                    long targetNodeId,
                    double lengthMeters,
                    RoadClass roadClass,
                    double slopePercent,
                    boolean hasBench,
                    boolean isHotspot,
                    List<double[]> coordinates) {
        this.edgeId = edgeId;
        this.sourceNodeId = sourceNodeId;
        this.targetNodeId = targetNodeId;
        this.lengthMeters = lengthMeters;
        this.roadClass = roadClass;
        this.slopePercent = slopePercent;
        this.hasBench = hasBench;
        this.isHotspot = isHotspot;
        this.coordinates = coordinates != null ? List.copyOf(coordinates) : List.of();
    }

    public PathEdge withHotspot(boolean hotspot) {
        return new PathEdge(
                this.edgeId,
                this.sourceNodeId,
                this.targetNodeId,
                this.lengthMeters,
                this.roadClass,
                this.slopePercent,
                this.hasBench,
                hotspot,
                this.coordinates
        );
    }

    public PathEdge withRoadClass(RoadClass newRoadClass) {
        return new PathEdge(
                this.edgeId,
                this.sourceNodeId,
                this.targetNodeId,
                this.lengthMeters,
                newRoadClass,
                this.slopePercent,
                this.hasBench,
                this.isHotspot,
                this.coordinates
        );
    }

    public PathEdge withBench(boolean bench) {
        return new PathEdge(
                this.edgeId,
                this.sourceNodeId,
                this.targetNodeId,
                this.lengthMeters,
                this.roadClass,
                this.slopePercent,
                bench,
                this.isHotspot,
                this.coordinates
        );
    }

    public PathEdge withSlope(double slope) {
        return new PathEdge(
                this.edgeId,
                this.sourceNodeId,
                this.targetNodeId,
                this.lengthMeters,
                this.roadClass,
                slope,
                this.hasBench,
                this.isHotspot,
                this.coordinates
        );
    }

    public double[] midpoint() {
        if (coordinates.isEmpty()) {
            return new double[]{0.0, 0.0};
        }
        if (coordinates.size() == 1) {
            return coordinates.getFirst();
        }
        double[] first = coordinates.getFirst();
        double[] last = coordinates.getLast();
        return new double[]{(first[0] + last[0]) / 2.0, (first[1] + last[1]) / 2.0};
    }

    public long getEdgeId() {
        return edgeId;
    }

    public long getSourceNodeId() {
        return sourceNodeId;
    }

    public long getTargetNodeId() {
        return targetNodeId;
    }

    public double getLengthMeters() {
        return lengthMeters;
    }

    public RoadClass getRoadClass() {
        return roadClass;
    }

    public double getSlopePercent() {
        return slopePercent;
    }

    public boolean isHasBench() {
        return hasBench;
    }

    public boolean isHotspot() {
        return isHotspot;
    }

    public List<double[]> getCoordinates() {
        return coordinates;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PathEdge pathEdge = (PathEdge) o;
        return edgeId == pathEdge.edgeId;
    }

    @Override
    public int hashCode() {
        return Objects.hash(edgeId);
    }

    @Override
    public String toString() {
        return "PathEdge{" +
                "id=" + edgeId +
                ", (" + sourceNodeId + "->" + targetNodeId + ')' +
                ", len=" + String.format("%.1f", lengthMeters) + "m" +
                ", class=" + roadClass +
                ", slope=" + slopePercent + "%" +
                ", bench=" + hasBench +
                ", hotspot=" + isHotspot +
                '}';
    }
}
