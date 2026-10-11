package com.gentlewalk.air;

import com.gentlewalk.air.dto.OpenMeteoAirResponse;
import com.gentlewalk.config.AppProperties;
import com.gentlewalk.config.CacheConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.ArrayList;
import com.gentlewalk.cache.NoopSharedCacheStore;
import com.gentlewalk.cache.SharedCacheStore;

import java.util.List;

@Component
public class AirQualityClient {

    private static final Logger log = LoggerFactory.getLogger(AirQualityClient.class);
    private final RestClient restClient;
    private final AppProperties properties;
    private final SharedCacheStore sharedCacheStore;

    @org.springframework.beans.factory.annotation.Autowired
    public AirQualityClient(AppProperties properties, RestClient.Builder restClientBuilder, SharedCacheStore sharedCacheStore) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
        this.sharedCacheStore = sharedCacheStore != null ? sharedCacheStore : new NoopSharedCacheStore();
    }

    public AirQualityClient(AppProperties properties, RestClient.Builder restClientBuilder) {
        this(properties, restClientBuilder, new NoopSharedCacheStore());
    }

    @Cacheable(value = CacheConfig.AIR_QUALITY_CACHE, key = "T(java.lang.String).format('%.2f,%.2f', #lat, #lon)")
    public List<Double> getHourlyPm25(double lat, double lon) {
        // Check shared cache store first (e.g. AWS DynamoDB)
        var cached = sharedCacheStore.getAirQuality(lat, lon);
        if (cached.isPresent()) {
            log.info("Serving hourly PM2.5 from shared cache store for ({}, {})", lat, lon);
            return sanitizeAndNormalize24Hours(cached.get());
        }

        String baseUrl = properties.openMeteo() != null && properties.openMeteo().airQualityBaseUrl() != null
                ? properties.openMeteo().airQualityBaseUrl()
                : "https://air-quality-api.open-meteo.com/v1/air-quality";

        log.info("Fetching hourly PM2.5 from Open-Meteo for ({}, {})", lat, lon);

        try {
            OpenMeteoAirResponse response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme(baseUrl.startsWith("https") ? "https" : "http")
                            .host(extractHost(baseUrl))
                            .path(extractPath(baseUrl))
                            .queryParam("latitude", lat)
                            .queryParam("longitude", lon)
                            .queryParam("hourly", "pm2_5")
                            .queryParam("forecast_days", 1)
                            .queryParam("timezone", "auto")
                            .build())
                    .retrieve()
                    .body(OpenMeteoAirResponse.class);

            if (response == null || response.hourly() == null || response.hourly().pm25() == null) {
                log.warn("Empty PM2.5 response received from Open-Meteo; falling back to demo series");
                return DemoAirData.get24HourSeries();
            }

            return sanitizeAndNormalize24Hours(response.hourly().pm25());
        } catch (Exception e) {
            log.error("Failed to query Open-Meteo Air Quality API: {}", e.getMessage());
            throw new RuntimeException("Open-Meteo Air Quality API request failed: " + e.getMessage(), e);
        }
    }

    public List<Double> sanitizeAndNormalize24Hours(List<Double> rawValues) {
        if (rawValues == null || rawValues.isEmpty()) {
            return DemoAirData.get24HourSeries();
        }

        // Take up to 24 entries or pad
        List<Double> series = new ArrayList<>();
        int count = Math.min(rawValues.size(), 24);
        for (int i = 0; i < count; i++) {
            series.add(rawValues.get(i));
        }

        // If fewer than 24, pad with the last available value or fallback
        while (series.size() < 24) {
            series.add(series.isEmpty() ? 50.0 : series.getLast());
        }

        // Clean nulls / NaNs using nearest-neighbor or linear interpolation
        for (int i = 0; i < 24; i++) {
            Double val = series.get(i);
            if (val == null || Double.isNaN(val) || val < 0.0) {
                // Find left valid
                Double left = null;
                for (int l = i - 1; l >= 0; l--) {
                    if (series.get(l) != null && !Double.isNaN(series.get(l)) && series.get(l) >= 0.0) {
                        left = series.get(l);
                        break;
                    }
                }
                // Find right valid
                Double right = null;
                for (int r = i + 1; r < 24; r++) {
                    if (series.get(r) != null && !Double.isNaN(series.get(r)) && series.get(r) >= 0.0) {
                        right = series.get(r);
                        break;
                    }
                }

                if (left != null && right != null) {
                    series.set(i, (left + right) / 2.0);
                } else if (left != null) {
                    series.set(i, left);
                } else if (right != null) {
                    series.set(i, right);
                } else {
                    series.set(i, 50.0); // Heuristic moderate fallback
                }
            }
        }

        return series;
    }

    private String extractHost(String url) {
        try {
            java.net.URI uri = java.net.URI.create(url);
            return uri.getHost();
        } catch (Exception e) {
            return "air-quality-api.open-meteo.com";
        }
    }

    private String extractPath(String url) {
        try {
            java.net.URI uri = java.net.URI.create(url);
            String path = uri.getPath();
            return (path == null || path.isBlank()) ? "/v1/air-quality" : path;
        } catch (Exception e) {
            return "/v1/air-quality";
        }
    }
}
