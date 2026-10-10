package com.gentlewalk.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "gentlewalk")
public record AppProperties(
        double walkSpeedMPerMin,
        double breathingM3PerMin,
        SensitivityProperties sensitivity,
        ClassFactorProperties classFactor,
        double hotspotPenalty,
        double maxSlopeLowMobilityPercent,
        double benchCostMultiplier,
        TrafficLightProperties trafficLight,
        LoopProperties loop,
        OverpassProperties overpass,
        OpenMeteoProperties openMeteo,
        CorsProperties cors,
        String disclaimer
) {
    public record SensitivityProperties(
            double normal,
            double sensitive,
            double verySensitive
    ) {}

    public record ClassFactorProperties(
            double primary,
            double secondary,
            double residential,
            double footpath,
            double parkPath
    ) {}

    public record TrafficLightProperties(
            double greenMax,
            double yellowMax
    ) {}

    public record LoopProperties(
            double lengthTolerance,
            int maxCandidates,
            double returnPathPenalty,
            long randomSeed
    ) {}

    public record OverpassProperties(
            String baseUrl,
            String userAgent,
            int timeoutMs,
            int retryCount,
            long retryBackoffMs
    ) {}

    public record OpenMeteoProperties(
            String airQualityBaseUrl,
            String elevationBaseUrl,
            int timeoutMs
    ) {}

    public record CorsProperties(
            List<String> allowedOrigins
    ) {}
}
