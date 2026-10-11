package com.gentlewalk.service;

import com.gentlewalk.config.AppProperties;
import com.gentlewalk.domain.PathEdge;
import com.gentlewalk.domain.RoadClass;
import com.gentlewalk.domain.Sensitivity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class DoseServiceTest {

    private DoseService doseService;
    private AppProperties properties;

    @BeforeEach
    void setUp() {
        AppProperties.SensitivityProperties sensitivityProps = new AppProperties.SensitivityProperties(1.0, 1.5, 2.0);
        AppProperties.ClassFactorProperties classFactorProps = new AppProperties.ClassFactorProperties(1.6, 1.4, 1.15, 1.0, 0.7);

        properties = new AppProperties(
                60.0,       // walkSpeed = 60 m/min
                0.02,       // breathing = 0.02 m3/min
                sensitivityProps,
                classFactorProps,
                0.3,        // hotspot penalty
                5.0,        // max slope low mobility %
                0.9,        // bench cost multiplier
                null, null, null, null, null, "Disclaimer", null
        );
        doseService = new DoseService(properties);
    }

    @Test
    @DisplayName("Calculates edge dose with exact formula")
    void testCalculateEdgeDose() {
        // Edge: 60 meters footpath -> 1.0 minute walk
        PathEdge edge = new PathEdge(
                1L, 10L, 20L, 60.0, RoadClass.FOOTPATH, 2.0, false, false,
                List.of(new double[]{0, 0}, new double[]{0, 0.0005})
        );

        // PM2.5 = 50 ug/m3, class factor = 1.0, minutes = 1.0, breathing = 0.02, sensitivity NORMAL (1.0)
        // Dose = 50 * 1.0 * 1.0 * 0.02 * 1.0 = 1.0 ug
        double dose = doseService.calculateEdgeDose(edge, 50.0, Sensitivity.NORMAL);
        assertThat(dose).isCloseTo(1.0, within(0.0001));

        // Sensitivity VERY_SENSITIVE (2.0) -> dose = 2.0 ug
        double doseSensitive = doseService.calculateEdgeDose(edge, 50.0, Sensitivity.VERY_SENSITIVE);
        assertThat(doseSensitive).isCloseTo(2.0, within(0.0001));
    }

    @Test
    @DisplayName("Hotspot penalty increases edge dose")
    void testHotspotPenalty() {
        // Edge with hotspot
        PathEdge normalEdge = new PathEdge(
                1L, 10L, 20L, 60.0, RoadClass.FOOTPATH, 2.0, false, false, List.of()
        );
        PathEdge hotspotEdge = normalEdge.withHotspot(true);

        double baseDose = doseService.calculateEdgeDose(normalEdge, 50.0, Sensitivity.NORMAL); // 1.0
        double hotspotDose = doseService.calculateEdgeDose(hotspotEdge, 50.0, Sensitivity.NORMAL); // 50 * (1.0 + 0.3) * 1 * 0.02 * 1 = 1.3

        assertThat(hotspotDose).isCloseTo(1.3, within(0.0001));
        assertThat(hotspotDose).isGreaterThan(baseDose);
    }

    @Test
    @DisplayName("Bench multiplier lowers routing cost")
    void testBenchCostMultiplier() {
        PathEdge noBench = new PathEdge(
                1L, 10L, 20L, 60.0, RoadClass.FOOTPATH, 2.0, false, false, List.of()
        );
        PathEdge withBench = noBench.withBench(true);

        double costNoBench = doseService.calculateEdgeRoutingCost(noBench, 50.0, Sensitivity.NORMAL, false);
        double costWithBench = doseService.calculateEdgeRoutingCost(withBench, 50.0, Sensitivity.NORMAL, false);

        assertThat(costWithBench).isCloseTo(costNoBench * 0.9, within(0.0001));
    }

    @Test
    @DisplayName("lowMobility=true excludes edges exceeding slope limit")
    void testLowMobilitySlopeExclusion() {
        PathEdge gentleEdge = new PathEdge(
                1L, 10L, 20L, 60.0, RoadClass.FOOTPATH, 4.5, false, false, List.of()
        );
        PathEdge steepEdge = new PathEdge(
                2L, 20L, 30L, 60.0, RoadClass.FOOTPATH, 8.0, false, false, List.of()
        );

        // Gentle edge is traversable in both modes
        assertThat(doseService.isEdgeTraversable(gentleEdge, false)).isTrue();
        assertThat(doseService.isEdgeTraversable(gentleEdge, true)).isTrue();

        // Steep edge is traversable only when lowMobility=false
        assertThat(doseService.isEdgeTraversable(steepEdge, false)).isTrue();
        assertThat(doseService.isEdgeTraversable(steepEdge, true)).isFalse();

        // Routing cost is POSITIVE_INFINITY when lowMobility is true
        assertThat(doseService.calculateEdgeRoutingCost(steepEdge, 50.0, Sensitivity.NORMAL, true))
                .isEqualTo(Double.POSITIVE_INFINITY);
    }
}
