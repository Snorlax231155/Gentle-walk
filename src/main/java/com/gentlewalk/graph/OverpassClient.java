package com.gentlewalk.graph;

import com.gentlewalk.config.AppProperties;
import com.gentlewalk.config.CacheConfig;
import com.gentlewalk.graph.dto.OverpassResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Component
public class OverpassClient {

    private static final Logger log = LoggerFactory.getLogger(OverpassClient.class);
    private final RestClient restClient;
    private final AppProperties properties;

    public OverpassClient(AppProperties properties, RestClient.Builder restClientBuilder) {
        this.properties = properties;
        String userAgent = properties.overpass() != null && properties.overpass().userAgent() != null
                ? properties.overpass().userAgent()
                : "GentleWalk/1.0 (hackathon-elder-planner)";

        this.restClient = restClientBuilder
                .defaultHeader(HttpHeaders.USER_AGENT, userAgent)
                .build();
    }

    @Cacheable(value = CacheConfig.GRAPH_CACHE, key = "T(java.lang.String).format('%.3f,%.3f,%d', #lat, #lon, #radiusM)")
    public OverpassResponse fetchOsmData(double lat, double lon, int radiusM) {
        String baseUrl = properties.overpass() != null && properties.overpass().baseUrl() != null
                ? properties.overpass().baseUrl()
                : "https://overpass-api.de/api/interpreter";

        String query = buildQuery(lat, lon, radiusM);
        log.info("Querying Overpass API around ({}, {}) with radius {}m", lat, lon, radiusM);

        int maxRetries = properties.overpass() != null ? properties.overpass().retryCount() : 1;
        long backoffMs = properties.overpass() != null ? properties.overpass().retryBackoffMs() : 1500;

        Exception lastException = null;
        for (int attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    log.info("Retrying Overpass API (attempt {} of {})...", attempt, maxRetries);
                    Thread.sleep(backoffMs);
                }

                OverpassResponse response = restClient.post()
                        .uri(baseUrl)
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .body("data=" + java.net.URLEncoder.encode(query, java.nio.charset.StandardCharsets.UTF_8))
                        .retrieve()
                        .body(OverpassResponse.class);

                if (response != null && response.elements() != null) {
                    return response;
                }
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Overpass request was interrupted", ie);
            } catch (Exception e) {
                log.warn("Overpass API attempt {} failed: {}", attempt + 1, e.getMessage());
                lastException = e;
            }
        }

        throw new RuntimeException("Failed to fetch OpenStreetMap data from Overpass after retries: "
                + (lastException != null ? lastException.getMessage() : "unknown error"), lastException);
    }

    public String buildQuery(double lat, double lon, int radiusM) {
        return String.format(
                java.util.Locale.US,
                "[out:json][timeout:25];" +
                "(" +
                "way[\"highway\"](around:%d,%.6f,%.6f);" +
                "node[\"amenity\"=\"bench\"](around:%d,%.6f,%.6f);" +
                "way[\"leisure\"=\"park\"](around:%d,%.6f,%.6f);" +
                ");" +
                "out body geom;",
                radiusM, lat, lon,
                radiusM, lat, lon,
                radiusM, lat, lon
        );
    }
}
