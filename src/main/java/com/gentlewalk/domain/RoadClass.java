package com.gentlewalk.domain;

public enum RoadClass {
    PRIMARY,
    SECONDARY,
    RESIDENTIAL,
    FOOTPATH,
    PARK_PATH;

    public static RoadClass fromOsmHighway(String highwayTag) {
        if (highwayTag == null) {
            return RESIDENTIAL;
        }
        return switch (highwayTag.toLowerCase().trim()) {
            case "footway", "path", "pedestrian", "steps", "track", "cycleway", "bridleway" -> FOOTPATH;
            case "motorway", "trunk", "primary", "motorway_link", "trunk_link", "primary_link" -> PRIMARY;
            case "secondary", "tertiary", "secondary_link", "tertiary_link" -> SECONDARY;
            default -> RESIDENTIAL;
        };
    }
}
