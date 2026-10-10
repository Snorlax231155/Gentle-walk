package com.gentlewalk.domain;

import java.util.List;
import java.util.Map;

public record LoopResult(
        double lengthMeters,
        double durationMinutes,
        double dose,
        int benchCount,
        List<List<Double>> coordinates, // GeoJSON [lon, lat] pairs
        Map<String, Double> roadClassBreakdownMeters
) {}
