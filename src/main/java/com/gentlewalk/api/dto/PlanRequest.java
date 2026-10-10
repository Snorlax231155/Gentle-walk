package com.gentlewalk.api.dto;

import com.gentlewalk.domain.Sensitivity;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record PlanRequest(
        @NotNull(message = "Latitude is required")
        @DecimalMin(value = "-90.0", message = "Latitude must be >= -90.0")
        @DecimalMax(value = "90.0", message = "Latitude must be <= 90.0")
        Double lat,

        @NotNull(message = "Longitude is required")
        @DecimalMin(value = "-180.0", message = "Longitude must be >= -180.0")
        @DecimalMax(value = "180.0", message = "Longitude must be <= 180.0")
        Double lon,

        @Min(value = 300, message = "Radius must be at least 300 meters")
        @Max(value = 1500, message = "Radius must be at most 1500 meters")
        Integer radiusM,

        @Min(value = 10, message = "Walking minutes must be at least 10")
        @Max(value = 40, message = "Walking minutes must be at most 40")
        Integer minutes,

        Sensitivity sensitivity,

        Boolean lowMobility,

        @Min(value = 0, message = "Hour must be between 0 and 23")
        @Max(value = 23, message = "Hour must be between 0 and 23")
        Integer hour,

        List<HotspotDto> hotspots,

        Boolean demo
) {
    public PlanRequest {
        if (radiusM == null) radiusM = 800;
        if (minutes == null) minutes = 20;
        if (sensitivity == null) sensitivity = Sensitivity.NORMAL;
        if (lowMobility == null) lowMobility = false;
        if (hotspots == null) hotspots = List.of();
        if (demo == null) demo = false;
    }
}
