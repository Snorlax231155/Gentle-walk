package com.gentlewalk.service;

import com.gentlewalk.config.AppProperties;
import com.gentlewalk.domain.TrafficLight;
import com.gentlewalk.domain.WindowResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class WindowServiceTest {

    private WindowService windowService;

    @BeforeEach
    void setUp() {
        AppProperties.TrafficLightProperties trafficLightProps = new AppProperties.TrafficLightProperties(60.0, 90.0);
        AppProperties properties = new AppProperties(
                60.0, 0.02, null, null, 0.3, 5.0, 0.9,
                trafficLightProps, null, null, null, null, "Disclaimer", null
        );
        windowService = new WindowService(properties);
    }

    @Test
    @DisplayName("Traffic light thresholds: 60 -> GREEN, 61 -> YELLOW, 90 -> YELLOW, 91 -> RED")
    void testTrafficLightThresholds() {
        assertThat(windowService.classifyTrafficLight(59.9)).isEqualTo(TrafficLight.GREEN);
        assertThat(windowService.classifyTrafficLight(60.0)).isEqualTo(TrafficLight.GREEN);
        assertThat(windowService.classifyTrafficLight(60.1)).isEqualTo(TrafficLight.YELLOW);
        assertThat(windowService.classifyTrafficLight(61.0)).isEqualTo(TrafficLight.YELLOW);
        assertThat(windowService.classifyTrafficLight(89.9)).isEqualTo(TrafficLight.YELLOW);
        assertThat(windowService.classifyTrafficLight(90.0)).isEqualTo(TrafficLight.YELLOW);
        assertThat(windowService.classifyTrafficLight(90.1)).isEqualTo(TrafficLight.RED);
        assertThat(windowService.classifyTrafficLight(91.0)).isEqualTo(TrafficLight.RED);
        assertThat(windowService.classifyTrafficLight(150.0)).isEqualTo(TrafficLight.RED);
    }

    @Test
    @DisplayName("bestWindow returns the expected slot on a hand-made 24-hour series")
    void testBestWindowOnSyntheticSeries() {
        // Create 24 hours with a clear dip at hour 15 (value 35.0)
        List<Double> series = new ArrayList<>(Collections.nCopies(24, 100.0));
        series.set(15, 35.0);
        series.set(16, 40.0);

        WindowResult result = windowService.bestWindow(series, 1, 5, 20);

        assertThat(result.startHour()).isEqualTo(15);
        assertThat(result.endHour()).isEqualTo(16);
        assertThat(result.meanPm25()).isEqualTo(35.0);
        assertThat(result.trafficLight()).isEqualTo(TrafficLight.GREEN);
    }

    @Test
    @DisplayName("bestWindow handles multi-hour windows correctly")
    void testMultiHourWindow() {
        List<Double> series = new ArrayList<>(Collections.nCopies(24, 80.0));
        series.set(14, 40.0);
        series.set(15, 42.0); // 2-hour window 14-16 average = 41.0

        WindowResult result = windowService.bestWindow(series, 2, 5, 20);

        assertThat(result.startHour()).isEqualTo(14);
        assertThat(result.endHour()).isEqualTo(16);
        assertThat(result.meanPm25()).isEqualTo(41.0);
        assertThat(result.trafficLight()).isEqualTo(TrafficLight.GREEN);
    }
}
