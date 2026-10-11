package com.gentlewalk.graph;

import com.gentlewalk.config.AppProperties;
import com.gentlewalk.config.CacheConfig;
import com.gentlewalk.graph.dto.ElevationResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class ElevationClient {

    private static final Logger log = LoggerFactory.getLogger(ElevationClient.class);
    private static final int MAX_BATCH_SIZE = 100;

    private final RestClient restClient;
    private final AppProperties properties;
    private final Cache elevationCache;

    public ElevationClient(AppProperties properties, RestClient.Builder restClientBuilder, CacheManager cacheManager) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
        this.elevationCache = cacheManager != null ? cacheManager.getCache(CacheConfig.ELEVATION_CACHE) : null;
    }

    /**
     * Resolves elevations for a list of [lat, lon] coordinates, checking cache and batching up to 100 per request.
     */
    public List<Double> getElevations(List<double[]> coordinates) {
        if (coordinates == null || coordinates.isEmpty()) {
            return List.of();
        }

        List<Double> results = new ArrayList<>(coordinates.size());
        List<Integer> missingIndices = new ArrayList<>();
        List<double[]> missingCoords = new ArrayList<>();

        for (int i = 0; i < coordinates.size(); i++) {
            double[] c = coordinates.get(i);
            String cacheKey = String.format("%.5f,%.5f", c[0], c[1]);
            Double cached = elevationCache != null ? elevationCache.get(cacheKey, Double.class) : null;
            if (cached != null) {
                results.add(cached);
            } else {
                results.add(null);
                missingIndices.add(i);
                missingCoords.add(c);
            }
        }

        if (missingCoords.isEmpty()) {
            return results;
        }

        String baseUrl = properties.openMeteo() != null && properties.openMeteo().elevationBaseUrl() != null
                ? properties.openMeteo().elevationBaseUrl()
                : "https://api.open-meteo.com/v1/elevation";

        // Query missing coordinates in batches of up to MAX_BATCH_SIZE
        for (int i = 0; i < missingCoords.size(); i += MAX_BATCH_SIZE) {
            int end = Math.min(i + MAX_BATCH_SIZE, missingCoords.size());
            List<double[]> batch = missingCoords.subList(i, end);

            String latParam = batch.stream().map(c -> String.format("%.5f", c[0])).collect(Collectors.joining(","));
            String lonParam = batch.stream().map(c -> String.format("%.5f", c[1])).collect(Collectors.joining(","));

            try {
                ElevationResponse response = restClient.get()
                        .uri(baseUrl + "?latitude=" + latParam + "&longitude=" + lonParam)
                        .retrieve()
                        .body(ElevationResponse.class);

                List<Double> elevList = response != null && response.elevation() != null
                        ? response.elevation()
                        : List.of();

                for (int b = 0; b < batch.size(); b++) {
                    int originalIdx = missingIndices.get(i + b);
                    double elev = (b < elevList.size() && elevList.get(b) != null) ? elevList.get(b) : 0.0;
                    results.set(originalIdx, elev);

                    double[] c = batch.get(b);
                    String cacheKey = String.format("%.5f,%.5f", c[0], c[1]);
                    if (elevationCache != null) {
                        elevationCache.put(cacheKey, elev);
                    }
                }
            } catch (Exception e) {
                log.warn("Elevation query failed for batch; falling back to 0.0: {}", e.getMessage());
                for (int b = 0; b < batch.size(); b++) {
                    int originalIdx = missingIndices.get(i + b);
                    results.set(originalIdx, 0.0);
                }
                // If it's a 429 rate limit, stop hammering Open-Meteo and default remaining to flat (0.0)
                if (e.getMessage() != null && e.getMessage().contains("429")) {
                    log.warn("Rate limit hit on Open-Meteo elevation API; gracefully defaulting remaining {} points to 0.0m", missingCoords.size() - (i + batch.size()));
                    for (int rem = i + batch.size(); rem < missingCoords.size(); rem++) {
                        results.set(missingIndices.get(rem), 0.0);
                    }
                    break;
                }
            }
        }

        return results;
    }
}
