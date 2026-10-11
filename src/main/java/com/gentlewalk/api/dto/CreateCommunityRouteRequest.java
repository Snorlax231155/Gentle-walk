package com.gentlewalk.api.dto;

import com.gentlewalk.domain.CommunityStop;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CreateCommunityRouteRequest(
        @NotBlank(message = "Route title is required")
        String title,

        @NotBlank(message = "Author name is required")
        String author,

        String description,
        List<String> tags,
        double startLat,
        double startLon,
        double lengthMeters,
        int durationMinutes,
        int benchCount,
        double estimatedPm25,
        String trafficLight,

        @NotEmpty(message = "Route coordinates must not be empty")
        List<List<Double>> coordinates,

        List<CommunityStop> stops
) {}
