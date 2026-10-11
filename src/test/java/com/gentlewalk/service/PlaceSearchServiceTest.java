package com.gentlewalk.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gentlewalk.api.dto.PlaceSearchResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PlaceSearchServiceTest {

    @Test
    @DisplayName("PlaceSearchService finds curated parks matching 'lodhi'")
    void testCuratedSearchLodhi() {
        PlaceSearchService service = new PlaceSearchService(RestClient.builder(), new ObjectMapper());
        List<PlaceSearchResult> results = service.searchPlaces("lodhi");

        assertFalse(results.isEmpty());
        assertTrue(results.stream().anyMatch(r -> r.name().toLowerCase().contains("lodhi")));
        assertTrue(results.stream().anyMatch(PlaceSearchResult::isCurated));
    }

    @Test
    @DisplayName("PlaceSearchService finds curated places matching 'delhi'")
    void testCuratedSearchDelhi() {
        PlaceSearchService service = new PlaceSearchService(RestClient.builder(), new ObjectMapper());
        List<PlaceSearchResult> results = service.searchPlaces("delhi");

        assertFalse(results.isEmpty());
        assertTrue(results.stream().anyMatch(r -> r.displayName().toLowerCase().contains("delhi")));
    }

    @Test
    @DisplayName("Empty search returns default curated highlights")
    void testEmptySearchReturnsCurated() {
        PlaceSearchService service = new PlaceSearchService(RestClient.builder(), new ObjectMapper());
        List<PlaceSearchResult> results = service.searchPlaces("");

        assertFalse(results.isEmpty());
        assertTrue(results.stream().allMatch(PlaceSearchResult::isCurated));
    }
}
