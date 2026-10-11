package com.gentlewalk.domain;

import java.time.Instant;
import java.util.List;

public record CommunityRoute(
        String id,
        String title,
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
        List<List<Double>> coordinates,
        List<CommunityStop> stops,
        int walkersCount,
        int cheersCount,
        Instant createdAt
) {
    public CommunityRoute withCheersCount(int newCheers) {
        return new CommunityRoute(
                id, title, author, description, tags, startLat, startLon,
                lengthMeters, durationMinutes, benchCount, estimatedPm25,
                trafficLight, coordinates, stops, walkersCount, newCheers, createdAt
        );
    }

    public CommunityRoute withWalkersCount(int newWalkers) {
        return new CommunityRoute(
                id, title, author, description, tags, startLat, startLon,
                lengthMeters, durationMinutes, benchCount, estimatedPm25,
                trafficLight, coordinates, stops, newWalkers, cheersCount, createdAt
        );
    }
}
