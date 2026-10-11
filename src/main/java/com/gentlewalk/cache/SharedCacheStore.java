package com.gentlewalk.cache;

import com.gentlewalk.graph.dto.OverpassResponse;

import java.util.List;
import java.util.Optional;

/**
 * Common contract for shared / remote L2 cache lookups (AWS DynamoDB & S3).
 * Falls back transparently when records are not present.
 */
public interface SharedCacheStore {
    Optional<List<Double>> getAirQuality(double lat, double lon);
    Optional<OverpassResponse> getOverpassData(double lat, double lon, int radiusM);
}
