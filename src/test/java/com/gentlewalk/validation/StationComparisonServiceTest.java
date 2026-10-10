package com.gentlewalk.validation;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StationComparisonServiceTest {

    private final StationComparisonService comparisonService = new StationComparisonService(null);

    @Test
    @DisplayName("Calculates MAE and bias accurately between model and ground station")
    void testCompareWithGroundStation() {
        List<Double> model = List.of(50.0, 60.0, 70.0);
        List<Double> station = List.of(45.0, 65.0, 68.0);
        // Diffs: +5.0, -5.0, +2.0
        // Abs diffs: 5.0, 5.0, 2.0 -> sum 12.0 / 3 = 4.0 MAE
        // Diffs sum: 2.0 / 3 = 0.67 Bias

        StationComparisonService.ComparisonReport report = comparisonService.compareWithGroundStation(model, station);

        assertThat(report.sampleCount()).isEqualTo(3);
        assertThat(report.mae()).isEqualTo(4.0);
        assertThat(report.bias()).isEqualTo(0.67);
    }

    @Test
    @DisplayName("Validates handheld sensor CSV ranking against model predictions")
    void testValidateHandheldSensorCsv() {
        String csv = """
                loop,time,pm25
                A,15:00,38.0
                A,15:05,42.0
                B,15:00,68.0
                B,15:05,72.0
                """;

        StationComparisonService.HandheldValidationReport report =
                comparisonService.validateHandheldSensorCsv(csv, 15.0, 28.0);

        assertThat(report.loopAMeanSensorPm25()).isEqualTo(40.0);
        assertThat(report.loopBMeanSensorPm25()).isEqualTo(70.0);
        assertThat(report.rankingMatches()).isTrue();
        assertThat(report.empiricalWinner()).isEqualTo("Loop A (Clean)");
        assertThat(report.modelWinner()).isEqualTo("Loop A (Clean)");
    }
}
