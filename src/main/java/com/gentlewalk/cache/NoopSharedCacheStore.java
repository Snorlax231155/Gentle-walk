package com.gentlewalk.cache;

import com.gentlewalk.graph.dto.OverpassResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Default no-op cache store when gentlewalk.cache.store is caffeine (or default).
 * Local development and offline tests use this implementation without contacting AWS.
 */
@Component
@ConditionalOnProperty(name = "gentlewalk.cache.store", havingValue = "caffeine", matchIfMissing = true)
public class NoopSharedCacheStore implements SharedCacheStore {

    @Override
    public Optional<List<Double>> getAirQuality(double lat, double lon) {
        return Optional.empty();
    }

    @Override
    public Optional<OverpassResponse> getOverpassData(double lat, double lon, int radiusM) {
        return Optional.empty();
    }
}
