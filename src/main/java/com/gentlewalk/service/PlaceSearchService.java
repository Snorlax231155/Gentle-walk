package com.gentlewalk.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gentlewalk.api.dto.PlaceSearchResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PlaceSearchService {

    private static final Logger log = LoggerFactory.getLogger(PlaceSearchService.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    // Curated high-quality parks and walking areas
    private static final List<PlaceSearchResult> CURATED_PLACES = List.of(
            new PlaceSearchResult("Lodhi Gardens", "Lodhi Gardens, Lodhi Estate, New Delhi, Delhi, India", 28.5933, 77.2215, true),
            new PlaceSearchResult("Sanjay Van", "Sanjay Van Forest Reserve, Qutub Institutional Area, South Delhi, India", 28.5284, 77.1741, true),
            new PlaceSearchResult("Cubbon Park", "Cubbon Park, Kasturba Road, Bengaluru, Karnataka, India", 12.9763, 77.5929, true),
            new PlaceSearchResult("Lalbagh Botanical Garden", "Lalbagh Botanical Garden, Mavalli, Bengaluru, Karnataka, India", 12.9507, 77.5848, true),
            new PlaceSearchResult("Deer Park & Hauz Khas", "Deer Park, Hauz Khas, New Delhi, Delhi, India", 28.5529, 77.1937, true),
            new PlaceSearchResult("Nehru Park", "Nehru Park, Chanakyapuri, New Delhi, Delhi, India", 28.5912, 77.1942, true),
            new PlaceSearchResult("Sunder Nursery", "Sunder Nursery Heritage Park, Nizamuddin, New Delhi, Delhi, India", 28.5956, 77.2433, true),
            new PlaceSearchResult("India Habitat Centre", "India Habitat Centre (Sheltered Corridors), Lodhi Road, New Delhi, India", 28.5898, 77.2250, true),
            new PlaceSearchResult("Connaught Place Central Park", "Central Park, Rajiv Chowk, Connaught Place, New Delhi, India", 28.6328, 77.2197, true),
            new PlaceSearchResult("Swarn Jayanti Park", "Swarn Jayanti Park, Rohini Sector 10, Delhi, India", 28.7126, 77.1189, true),
            new PlaceSearchResult("Marine Drive", "Marine Drive Promenade, Churchgate, Mumbai, Maharashtra, India", 18.9438, 72.8234, true),
            new PlaceSearchResult("Shivaji Park", "Shivaji Park, Dadar West, Mumbai, Maharashtra, India", 19.0269, 72.8381, true),
            new PlaceSearchResult("Upper Lake VIP Road", "Upper Lake Promenade, VIP Road, Bhopal, Madhya Pradesh, India", 23.2332, 77.3828, true),
            new PlaceSearchResult("Nehru Park Indore", "Nehru Park, Shivaji Nagar, Indore, Madhya Pradesh, India", 22.7196, 75.8577, true),
            new PlaceSearchResult("Crescent Water Park", "Crescent Park & Colony, Sehore / Bhopal Road, Madhya Pradesh, India", 23.0756, 76.8596, true)
    );

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NominatimItem(
            String place_id,
            String lat,
            String lon,
            String name,
            String display_name
    ) {}

    public PlaceSearchService(RestClient.Builder restClientBuilder, ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(3000));
        requestFactory.setReadTimeout(Duration.ofMillis(3000));

        this.restClient = restClientBuilder
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.USER_AGENT, "GentleWalk/1.0 (hackathon-elder-planner; contact: dev@gentlewalk.local)")
                .build();
    }

    public List<PlaceSearchResult> searchPlaces(String query) {
        if (query == null || query.trim().isEmpty()) {
            return CURATED_PLACES.stream().limit(6).collect(Collectors.toList());
        }

        String qLower = query.toLowerCase().trim();
        List<PlaceSearchResult> results = new ArrayList<>();

        // 1. Search curated places first (instant match)
        for (PlaceSearchResult place : CURATED_PLACES) {
            if (place.name().toLowerCase().contains(qLower) || place.displayName().toLowerCase().contains(qLower)) {
                results.add(place);
            }
        }

        // 2. Query Nominatim if query length >= 3
        if (qLower.length() >= 3) {
            try {
                String encoded = URLEncoder.encode(query.trim(), StandardCharsets.UTF_8);
                String url = "https://nominatim.openstreetmap.org/search?format=json&q=" + encoded + "&limit=5&addressdetails=1";

                String json = restClient.get()
                        .uri(url)
                        .retrieve()
                        .body(String.class);

                if (json != null && !json.isBlank()) {
                    List<NominatimItem> items = objectMapper.readValue(json, new TypeReference<List<NominatimItem>>() {});
                    for (NominatimItem item : items) {
                        try {
                            double lat = Double.parseDouble(item.lat());
                            double lon = Double.parseDouble(item.lon());
                            String name = item.name() != null && !item.name().isBlank()
                                    ? item.name()
                                    : (item.display_name() != null ? item.display_name().split(",")[0] : query);

                            // Check duplicate by proximity (< 200m)
                            boolean isDuplicate = results.stream().anyMatch(r ->
                                    Math.abs(r.lat() - lat) < 0.002 && Math.abs(r.lon() - lon) < 0.002
                            );

                            if (!isDuplicate) {
                                results.add(new PlaceSearchResult(
                                        name,
                                        item.display_name() != null ? item.display_name() : name,
                                        lat,
                                        lon,
                                        false
                                ));
                            }
                        } catch (Exception parseEx) {
                            // ignore individual malformed record
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Nominatim search query [{}] failed or timed out: {}", query, e.getMessage());
            }
        }

        return results;
    }
}
