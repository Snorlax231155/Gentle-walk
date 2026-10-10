package com.gentlewalk.graph.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ElevationResponse(
        @JsonProperty("elevation") List<Double> elevation
) {}
