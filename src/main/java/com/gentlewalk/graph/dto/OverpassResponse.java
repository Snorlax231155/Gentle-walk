package com.gentlewalk.graph.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record OverpassResponse(
        @JsonProperty("elements") List<Element> elements
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Element(
            @JsonProperty("type") String type,
            @JsonProperty("id") Long id,
            @JsonProperty("lat") Double lat,
            @JsonProperty("lon") Double lon,
            @JsonProperty("nodes") List<Long> nodes,
            @JsonProperty("geometry") List<GeoPoint> geometry,
            @JsonProperty("tags") Map<String, String> tags
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GeoPoint(
            @JsonProperty("lat") Double lat,
            @JsonProperty("lon") Double lon
    ) {}
}
