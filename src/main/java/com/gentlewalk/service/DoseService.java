package com.gentlewalk.service;

import com.gentlewalk.config.AppProperties;
import com.gentlewalk.domain.PathEdge;
import com.gentlewalk.domain.RoadClass;
import com.gentlewalk.domain.Sensitivity;
import org.springframework.stereotype.Service;

@Service
public class DoseService {

    private final AppProperties properties;

    public DoseService(AppProperties properties) {
        this.properties = properties;
    }

    public double getSensitivityMultiplier(Sensitivity sensitivity) {
        Sensitivity s = sensitivity != null ? sensitivity : Sensitivity.NORMAL;
        if (properties.sensitivity() == null) {
            return switch (s) {
                case NORMAL -> 1.0;
                case SENSITIVE -> 1.5;
                case VERY_SENSITIVE -> 2.0;
            };
        }
        return switch (s) {
            case NORMAL -> properties.sensitivity().normal();
            case SENSITIVE -> properties.sensitivity().sensitive();
            case VERY_SENSITIVE -> properties.sensitivity().verySensitive();
        };
    }

    public double getClassFactor(RoadClass roadClass) {
        RoadClass rc = roadClass != null ? roadClass : RoadClass.RESIDENTIAL;
        if (properties.classFactor() == null) {
            return switch (rc) {
                case PRIMARY -> 1.6;
                case SECONDARY -> 1.4;
                case RESIDENTIAL -> 1.15;
                case FOOTPATH -> 1.0;
                case PARK_PATH -> 0.7;
            };
        }
        return switch (rc) {
            case PRIMARY -> properties.classFactor().primary();
            case SECONDARY -> properties.classFactor().secondary();
            case RESIDENTIAL -> properties.classFactor().residential();
            case FOOTPATH -> properties.classFactor().footpath();
            case PARK_PATH -> properties.classFactor().parkPath();
        };
    }

    public double calculateEdgeMinutes(PathEdge edge) {
        double speed = properties.walkSpeedMPerMin() > 0 ? properties.walkSpeedMPerMin() : 60.0;
        return edge.getLengthMeters() / speed;
    }

    /**
     * Inhaled dose on an edge in micrograms (ug):
     * dose = PM2.5(hour) x (classFactor + hotspotPenalty) x minutes x breathingRate x sensitivity
     */
    public double calculateEdgeDose(PathEdge edge, double hourlyPm25, Sensitivity sensitivity) {
        double pathFactor = getClassFactor(edge.getRoadClass());
        if (edge.isHotspot()) {
            double penalty = properties.hotspotPenalty() > 0 ? properties.hotspotPenalty() : 0.3;
            pathFactor += penalty;
        }

        double minutes = calculateEdgeMinutes(edge);
        double breathing = properties.breathingM3PerMin() > 0 ? properties.breathingM3PerMin() : 0.02;
        double sensMult = getSensitivityMultiplier(sensitivity);

        return hourlyPm25 * pathFactor * minutes * breathing * sensMult;
    }

    /**
     * Routing cost: dose modulated by bench availability (bench bonus gives lower effective cost).
     * In low mobility mode, slopes exceeding maxSlopeLowMobilityPercent are untraversable.
     */
    public double calculateEdgeRoutingCost(PathEdge edge, double hourlyPm25, Sensitivity sensitivity, boolean lowMobility) {
        if (!isEdgeTraversable(edge, lowMobility)) {
            return Double.POSITIVE_INFINITY;
        }

        double dose = calculateEdgeDose(edge, hourlyPm25, sensitivity);
        if (edge.isHasBench()) {
            double benchMultiplier = properties.benchCostMultiplier() > 0 ? properties.benchCostMultiplier() : 0.9;
            return dose * benchMultiplier;
        }
        return dose;
    }

    public boolean isEdgeTraversable(PathEdge edge, boolean lowMobility) {
        if (!lowMobility) {
            return true;
        }
        double maxSlope = properties.maxSlopeLowMobilityPercent() > 0
                ? properties.maxSlopeLowMobilityPercent()
                : 5.0;
        return edge.getSlopePercent() <= maxSlope;
    }
}
