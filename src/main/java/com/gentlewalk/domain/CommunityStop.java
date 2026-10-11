package com.gentlewalk.domain;

public record CommunityStop(
        String id,
        String name,
        String type, // e.g. "BENCH", "SHADE", "WATER", "VIEWPOINT", "SANCTUARY"
        String description,
        double lat,
        double lon
) {}
