package com.gentlewalk.api.dto;

public record HotspotDto(
        double lat,
        double lon,
        String description
) {
    public HotspotDto(double lat, double lon) {
        this(lat, lon, "User reported hotspot");
    }
}
