package com.gentlewalk.graph;

import com.gentlewalk.cache.NoopSharedCacheStore;
import com.gentlewalk.cache.SharedCacheStore;
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
import java.util.ArrayList;
import java.util.List;

@Component
public class OverpassClient {

    private static final Logger log = LoggerFactory.getLogger(OverpassClient.class);
    private final RestClient restClient;
    private final AppProperties properties;
    private final SharedCacheStore sharedCacheStore;

    @org.springframework.beans.factory.annotation.Autowired
    public OverpassClient(AppProperties properties, RestClient.Builder restClientBuilder, SharedCacheStore sharedCacheStore) {
        this.properties = properties;
        this.sharedCacheStore = sharedCacheStore != null ? sharedCacheStore : new NoopSharedCacheStore();
        String userAgent = properties.overpass() != null && properties.overpass().userAgent() != null
                ? properties.overpass().userAgent()
                : "GentleWalk/1.0 (hackathon-elder-planner)";

        this.restClient = restClientBuilder
                .defaultHeader(HttpHeaders.USER_AGENT, userAgent)
                .build();
    }

    public OverpassClient(AppProperties properties, RestClient.Builder restClientBuilder) {
        this(properties, restClientBuilder, new NoopSharedCacheStore());
    }

    @Cacheable(value = CacheConfig.GRAPH_CACHE, key = "T(java.lang.String).format('%.3f,%.3f,%d', #lat, #lon, #radiusM)")
    public OverpassResponse fetchOsmData(double lat, double lon, int radiusM) {
        // Check shared cache store first (e.g. AWS S3)
        var cached = sharedCacheStore.getOverpassData(lat, lon, radiusM);
        if (cached.isPresent()) {
            log.info("Serving OpenStreetMap data from shared cache store for ({}, {}, {}m)", lat, lon, radiusM);
            return cached.get();
        }

        String configuredUrl = properties.overpass() != null && properties.overpass().baseUrl() != null
                ? properties.overpass().baseUrl()
                : "https://overpass.openstreetmap.fr/api/interpreter";

        List<String> endpoints = new ArrayList<>();
        endpoints.add(configuredUrl);
        if (!configuredUrl.contains("overpass-api.de")) {
            endpoints.add("https://overpass-api.de/api/interpreter");
        } else {
            endpoints.add("https://overpass.openstreetmap.fr/api/interpreter");
        }

        String query = buildQuery(lat, lon, radiusM);
        log.info("Querying Overpass API around ({}, {}) with radius {}m", lat, lon, radiusM);

        Exception lastException = null;
        for (String endpoint : endpoints) {
            try {
                log.info("Attempting Overpass query on endpoint: {}", endpoint);
                OverpassResponse response = restClient.post()
                        .uri(endpoint)
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .body("data=" + java.net.URLEncoder.encode(query, java.nio.charset.StandardCharsets.UTF_8))
                        .retrieve()
                        .body(OverpassResponse.class);

                if (response != null && response.elements() != null && !response.elements().isEmpty()) {
                    return response;
                }
            } catch (Exception e) {
                log.warn("Overpass endpoint {} failed: {}", endpoint, e.getMessage());
                lastException = e;
            }
        }

        throw new RuntimeException("Failed to fetch OpenStreetMap data from Overpass after trying mirrors: "
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
