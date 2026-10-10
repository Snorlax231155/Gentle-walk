package com.gentlewalk.validation;

import com.gentlewalk.air.AirQualityClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.List;

@Service
public class StationComparisonService {

    private static final Logger log = LoggerFactory.getLogger(StationComparisonService.class);

    private final AirQualityClient airQualityClient;

    public record ComparisonReport(
            String stationId,
            String stationName,
            int sampleCount,
            double mae,
            double bias,
            String notes
    ) {}

    public record HandheldValidationReport(
            double loopAMeanSensorPm25,
            double loopBMeanSensorPm25,
            String empiricalWinner,
            String modelWinner,
            boolean rankingMatches,
            double percentageDifference
    ) {}

    public StationComparisonService(AirQualityClient airQualityClient) {
        this.airQualityClient = airQualityClient;
    }

    /**
     * Compares model forecast with ground station measurements.
     */
    public ComparisonReport compareWithGroundStation(List<Double> modelHourly, List<Double> stationHourly) {
        if (modelHourly == null || stationHourly == null || modelHourly.isEmpty() || stationHourly.isEmpty()) {
            throw new IllegalArgumentException("Model and station series must not be empty");
        }

        int count = Math.min(modelHourly.size(), stationHourly.size());
        double sumAbsDiff = 0.0;
        double sumDiff = 0.0;
        int validPoints = 0;

        for (int i = 0; i < count; i++) {
            Double m = modelHourly.get(i);
            Double s = stationHourly.get(i);
            if (m != null && s != null && !Double.isNaN(m) && !Double.isNaN(s)) {
                double diff = m - s;
                sumAbsDiff += Math.abs(diff);
                sumDiff += diff;
                validPoints++;
            }
        }

        if (validPoints == 0) {
            return new ComparisonReport("N/A", "Unknown", 0, 0.0, 0.0, "No overlapping valid hourly points");
        }

        double mae = sumAbsDiff / validPoints;
        double bias = sumDiff / validPoints;

        return new ComparisonReport(
                "OPENAQ_STATION",
                "Nearest Reference Ground Station",
                validPoints,
                Math.round(mae * 100.0) / 100.0,
                Math.round(bias * 100.0) / 100.0,
                "Comparison over " + validPoints + " hourly observations."
        );
    }

    /**
     * Validates handheld sensor readings recorded along two loops against the model's ranking.
     * CSV format expected: loop_id,timestamp,pm25
     * e.g.
     * A,2026-10-10T15:00:00,38.5
     * B,2026-10-10T15:00:00,62.1
     */
    public HandheldValidationReport validateHandheldSensorCsv(String csvContent, double modelDoseLoopA, double modelDoseLoopB) {
        List<Double> readingsA = new ArrayList<>();
        List<Double> readingsB = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new StringReader(csvContent))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#") || line.toLowerCase().startsWith("loop")) {
                    continue; // Skip header or comments
                }
                String[] parts = line.split(",");
                if (parts.length >= 3) {
                    String loopId = parts[0].trim().toUpperCase();
                    double pm = Double.parseDouble(parts[2].trim());
                    if (loopId.equals("A")) {
                        readingsA.add(pm);
                    } else if (loopId.equals("B")) {
                        readingsB.add(pm);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse handheld sensor CSV: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid sensor CSV format: " + e.getMessage(), e);
        }

        if (readingsA.isEmpty() || readingsB.isEmpty()) {
            throw new IllegalArgumentException("CSV must contain valid readings for both Loop A and Loop B");
        }

        double meanA = readingsA.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double meanB = readingsB.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);

        String empiricalWinner = meanA <= meanB ? "Loop A (Clean)" : "Loop B (Typical)";
        String modelWinner = modelDoseLoopA <= modelDoseLoopB ? "Loop A (Clean)" : "Loop B (Typical)";
        boolean rankingMatches = empiricalWinner.equals(modelWinner);

        double pctDiff = Math.abs(meanA - meanB) / Math.max(meanA, meanB) * 100.0;

        return new HandheldValidationReport(
                Math.round(meanA * 10.0) / 10.0,
                Math.round(meanB * 10.0) / 10.0,
                empiricalWinner,
                modelWinner,
                rankingMatches,
                Math.round(pctDiff * 10.0) / 10.0
        );
    }
}
