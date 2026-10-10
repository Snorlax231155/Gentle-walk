package com.gentlewalk.domain;

public record NodeCoordinate(
        long id,
        double lat,
        double lon,
        double elevationM
) {
    public NodeCoordinate(long id, double lat, double lon) {
        this(id, lat, lon, 0.0);
    }
}
