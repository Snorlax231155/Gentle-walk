package com.gentlewalk.domain;

import java.util.List;

public record WindowResult(
        int startHour,
        int endHour,
        double meanPm25,
        double worstSlotMean,
        TrafficLight trafficLight,
        List<Double> hourlyPm25
) {}
