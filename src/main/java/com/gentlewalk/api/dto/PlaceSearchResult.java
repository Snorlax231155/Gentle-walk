package com.gentlewalk.api.dto;

public record PlaceSearchResult(
        String name,
        String displayName,
        double lat,
        double lon,
        boolean isCurated
) {}
