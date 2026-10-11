package com.gentlewalk.domain;

import java.util.List;

public record IndoorVenue(
        String name,
        String category, // "Shopping Mall", "Museum & Cultural Centre", "Indoor Community Centre"
        double lat,
        double lon,
        double distanceKm,
        double estimatedLoopMeters,
        String filtrationStatus, // e.g. "Centrally Air-Conditioned with MERV 13 / HEPA Filtration"
        boolean hasRestBenches,
        boolean elevatorAccessible,
        String openingHours,
        String seniorTip,
        List<String> amenities
) {}
