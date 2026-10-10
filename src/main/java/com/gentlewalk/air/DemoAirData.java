package com.gentlewalk.air;

import java.util.List;

public final class DemoAirData {

    // 24 hourly values for today (hours 0 to 23) in ug/m3.
    // Dawn smog peak around 07:00-08:00 (inversion layer & morning traffic)
    // Cleaner trough in afternoon around 14:00-16:00 (thermal dispersion)
    // Evening rise around 20:00.
    private static final List<Double> SYNTHETIC_HOURLY_PM25 = List.of(
            72.0,  // 00:00
            68.0,  // 01:00
            65.0,  // 02:00
            64.0,  // 03:00
            68.0,  // 04:00
            78.0,  // 05:00
            98.0,  // 06:00
            128.0, // 07:00 (Dawn peak)
            135.0, // 08:00 (Morning traffic peak)
            110.0, // 09:00
            88.0,  // 10:00
            74.0,  // 11:00
            62.0,  // 12:00
            54.0,  // 13:00
            46.0,  // 14:00
            42.0,  // 15:00 (Cleanest afternoon slot)
            45.0,  // 16:00
            55.0,  // 17:00
            72.0,  // 18:00
            92.0,  // 19:00
            104.0, // 20:00 (Evening traffic/cooking peak)
            96.0,  // 21:00
            85.0,  // 22:00
            78.0   // 23:00
    );

    private DemoAirData() {}

    public static List<Double> get24HourSeries() {
        return SYNTHETIC_HOURLY_PM25;
    }
}
