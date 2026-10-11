package com.gentlewalk.service;

import com.gentlewalk.domain.IndoorVenue;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class IndoorFallbackServiceTest {

    private final IndoorFallbackService indoorFallbackService = new IndoorFallbackService();

    @Test
    @DisplayName("Finds nearby indoor venues with HEPA filtration and elder tips")
    void testGetIndoorFallbacks() {
        // Query near South Delhi / Lodhi Gardens
        List<IndoorVenue> venues = indoorFallbackService.getIndoorFallbacks(28.5933, 77.2215, 3);

        assertThat(venues).isNotEmpty();
        assertThat(venues.size()).isLessThanOrEqualTo(3);

        IndoorVenue nearest = venues.getFirst();
        assertThat(nearest.name()).isNotEmpty();
        assertThat(nearest.filtrationStatus()).containsIgnoringCase("filtration");
        assertThat(nearest.hasRestBenches()).isTrue();
        assertThat(nearest.elevatorAccessible()).isTrue();
        assertThat(nearest.seniorTip()).isNotEmpty();
        assertThat(nearest.distanceKm()).isGreaterThanOrEqualTo(0.0);
    }
}
