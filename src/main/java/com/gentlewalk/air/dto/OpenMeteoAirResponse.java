package com.gentlewalk.air.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record OpenMeteoAirResponse(
        @JsonProperty("latitude") Double latitude,
        @JsonProperty("longitude") Double longitude,
        @JsonProperty("timezone") String timezone,
        @JsonProperty("hourly") HourlyData hourly
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record HourlyData(
            @JsonProperty("time") List<String> time,
            @JsonProperty("pm2_5") List<Double> pm25
    ) {}
}
