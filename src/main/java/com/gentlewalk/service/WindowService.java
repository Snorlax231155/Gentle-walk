package com.gentlewalk.service;

import com.gentlewalk.config.AppProperties;
import com.gentlewalk.domain.TrafficLight;
import com.gentlewalk.domain.WindowResult;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class WindowService {

    private final AppProperties properties;

    public WindowService(AppProperties properties) {
        this.properties = properties;
    }

    /**
     * Finds the cleanest walking window of given duration between earliest and latest hours.
     *
     * @param pm24 24 hourly values (hours 0 to 23)
     * @param hours window duration in hours (e.g. 1, 2)
     * @param earliest earliest starting hour allowed (inclusive, default 5)
     * @param latest latest starting hour allowed (inclusive, default 20)
     * @return WindowResult with start hour, end hour, mean PM2.5, worst-slot mean PM2.5, and traffic light
     */
    public WindowResult bestWindow(List<Double> pm24, int hours, int earliest, int latest) {
        if (pm24 == null || pm24.isEmpty()) {
            throw new IllegalArgumentException("Hourly PM2.5 data must not be empty");
        }
        int effectiveHours = Math.max(1, Math.min(hours, 6));
        int effectiveEarliest = Math.max(0, Math.min(earliest, 23));
        int effectiveLatest = Math.max(effectiveEarliest, Math.min(latest, 23 - effectiveHours));

        int bestStart = effectiveEarliest;
        double minMean = Double.MAX_VALUE;
        double maxMean = Double.MIN_VALUE;

        for (int s = effectiveEarliest; s <= effectiveLatest; s++) {
            double sum = 0.0;
            for (int h = 0; h < effectiveHours; h++) {
                int idx = Math.min(s + h, pm24.size() - 1);
                sum += pm24.get(idx);
            }
            double mean = sum / effectiveHours;

            if (mean < minMean) {
                minMean = mean;
                bestStart = s;
            }
            if (mean > maxMean) {
                maxMean = mean;
            }
        }

        TrafficLight trafficLight = classifyTrafficLight(minMean);

        return new WindowResult(
                bestStart,
                bestStart + effectiveHours,
                round(minMean),
                round(maxMean),
                trafficLight,
                pm24
        );
    }

    public TrafficLight classifyTrafficLight(double pm25Value) {
        double greenMax = properties.trafficLight() != null ? properties.trafficLight().greenMax() : 60.0;
        double yellowMax = properties.trafficLight() != null ? properties.trafficLight().yellowMax() : 90.0;

        if (pm25Value <= greenMax) {
            return TrafficLight.GREEN;
        } else if (pm25Value <= yellowMax) {
            return TrafficLight.YELLOW;
        } else {
            return TrafficLight.RED;
        }
    }

    private double round(double val) {
        return Math.round(val * 10.0) / 10.0;
    }
}
