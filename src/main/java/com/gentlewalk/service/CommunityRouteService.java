package com.gentlewalk.service;

import com.gentlewalk.api.dto.CreateCommunityRouteRequest;
import com.gentlewalk.domain.CommunityRoute;
import com.gentlewalk.domain.CommunityStop;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class CommunityRouteService {

    private static final Logger log = LoggerFactory.getLogger(CommunityRouteService.class);
    private final Map<String, CommunityRoute> routeStore = new ConcurrentHashMap<>();

    public CommunityRouteService() {
        seedInitialRoutes();
    }

    public List<CommunityRoute> getRoutes(Double userLat, Double userLon, Double radiusKm) {
        List<CommunityRoute> all = new ArrayList<>(routeStore.values());

        if (userLat == null || userLon == null) {
            // Sort by most popular (cheers + walkers) then newest
            return all.stream()
                    .sorted(Comparator.comparingInt((CommunityRoute r) -> r.cheersCount() + r.walkersCount()).reversed()
                            .thenComparing(CommunityRoute::createdAt, Comparator.reverseOrder()))
                    .collect(Collectors.toList());
        }

        double maxDist = (radiusKm != null && radiusKm > 0) ? radiusKm : 50.0; // default 50km

        List<CommunityRoute> nearby = all.stream()
                .filter(r -> haversineKm(userLat, userLon, r.startLat(), r.startLon()) <= maxDist)
                .sorted(Comparator.comparingDouble(r -> haversineKm(userLat, userLon, r.startLat(), r.startLon())))
                .collect(Collectors.toList());

        // If no routes strictly within radius, fallback to all routes sorted by distance
        if (nearby.isEmpty()) {
            return all.stream()
                    .sorted(Comparator.comparingDouble(r -> haversineKm(userLat, userLon, r.startLat(), r.startLon())))
                    .collect(Collectors.toList());
        }

        return nearby;
    }

    public Optional<CommunityRoute> getRoute(String id) {
        return Optional.ofNullable(routeStore.get(id));
    }

    public CommunityRoute submitRoute(CreateCommunityRouteRequest req) {
        String id = "cr-" + UUID.randomUUID().toString().substring(0, 8);
        List<CommunityStop> stops = req.stops() != null ? req.stops() : List.of();

        // If no stops provided, generate PokéStop style landmarks at key intervals
        if (stops.isEmpty() && req.coordinates() != null && req.coordinates().size() >= 3) {
            stops = generateAutoStops(req.coordinates(), req.title());
        }

        List<String> tags = (req.tags() != null && !req.tags().isEmpty())
                ? req.tags()
                : List.of("🚶 Community Walk", "🪑 Elder Approved", "🌳 Clean Air Trail");

        CommunityRoute route = new CommunityRoute(
                id,
                req.title().trim(),
                req.author().trim(),
                req.description() != null ? req.description().trim() : "Elder-friendly community trail discovered by local walkers.",
                tags,
                req.startLat(),
                req.startLon(),
                req.lengthMeters() > 0 ? req.lengthMeters() : 1200.0,
                req.durationMinutes() > 0 ? req.durationMinutes() : 20,
                req.benchCount() >= 0 ? req.benchCount() : 3,
                req.estimatedPm25() > 0 ? req.estimatedPm25() : 18.5,
                req.trafficLight() != null ? req.trafficLight() : "GREEN",
                req.coordinates(),
                stops,
                1, // Creator is first walker
                1, // Initial thumbs up
                Instant.now()
        );

        routeStore.put(id, route);
        log.info("Submitted new community route [{}] '{}' by '{}' with {} stops", id, route.title(), route.author(), stops.size());
        return route;
    }

    public Optional<CommunityRoute> cheerRoute(String routeId) {
        CommunityRoute existing = routeStore.get(routeId);
        if (existing == null) {
            return Optional.empty();
        }
        CommunityRoute updated = existing.withCheersCount(existing.cheersCount() + 1);
        routeStore.put(routeId, updated);
        log.info("Cheered community route [{}], new cheer count: {}", routeId, updated.cheersCount());
        return Optional.of(updated);
    }

    public Optional<CommunityRoute> logWalk(String routeId) {
        CommunityRoute existing = routeStore.get(routeId);
        if (existing == null) {
            return Optional.empty();
        }
        CommunityRoute updated = existing.withWalkersCount(existing.walkersCount() + 1);
        routeStore.put(routeId, updated);
        log.info("Walk recorded on community route [{}], total walkers: {}", routeId, updated.walkersCount());
        return Optional.of(updated);
    }

    private List<CommunityStop> generateAutoStops(List<List<Double>> coords, String routeTitle) {
        List<CommunityStop> generated = new ArrayList<>();
        int n = coords.size();

        // Start landmark
        List<Double> pStart = coords.get(0);
        generated.add(new CommunityStop(
                "stop-start-" + UUID.randomUUID().toString().substring(0, 4),
                "Trailhead / Entry Plaza",
                "SANCTUARY",
                "Safe, step-free starting point with shade.",
                pStart.get(1), pStart.get(0)
        ));

        // Midpoint landmark
        if (n >= 4) {
            List<Double> pMid = coords.get(n / 2);
            generated.add(new CommunityStop(
                    "stop-mid-" + UUID.randomUUID().toString().substring(0, 4),
                    "Community Rest Stop",
                    "BENCH",
                    "Shaded sitting area with rest benches every 50 meters.",
                    pMid.get(1), pMid.get(0)
            ));
        }

        // Three-quarters point landmark
        if (n >= 6) {
            List<Double> pScenic = coords.get((3 * n) / 4);
            generated.add(new CommunityStop(
                    "stop-scenic-" + UUID.randomUUID().toString().substring(0, 4),
                    "Oxygen Canopy Bower",
                    "SHADE",
                    "Dense green tree canopy with lowest particulate exposure.",
                    pScenic.get(1), pScenic.get(0)
            ));
        }

        return generated;
    }

    private void seedInitialRoutes() {
        // 1. Lodhi Gardens, New Delhi
        List<List<Double>> lodhiCoords = List.of(
                List.of(77.2215, 28.5933), List.of(77.2223, 28.5940), List.of(77.2235, 28.5945),
                List.of(77.2242, 28.5938), List.of(77.2238, 28.5925), List.of(77.2222, 28.5920),
                List.of(77.2215, 28.5933)
        );
        List<CommunityStop> lodhiStops = List.of(
                new CommunityStop("ls-1", "Ancient Banyan Rest Point", "SHADE", "Centuries-old banyan tree with deep shade and stone benches.", 28.5938, 77.2225),
                new CommunityStop("ls-2", "Rose Garden Pavilion", "BENCH", "Sheltered octagonal pavilion facing the fragrance garden.", 28.5942, 77.2237),
                new CommunityStop("ls-3", "Sikandar Lodi Step-Free Walkway", "SANCTUARY", "100% paved, wide ramp path with clear morning air.", 28.5926, 28.5926 > 30 ? 77.2225 : 77.2228)
        );
        routeStore.put("cr-lodhi-1", new CommunityRoute(
                "cr-lodhi-1",
                "Lodhi Heritage Banyan & Rose Walk",
                "Dadi Shanti & Lodhi Morning Walkers",
                "A peaceful, flat loop through the historic garden paths with rest benches positioned every 100 meters and fresh morning oxygen.",
                List.of("🌳 Shaded Canopy", "🪑 8 Benches", "🌸 Flower Gardens", "🦯 Zero Steps"),
                28.5933, 77.2215, 1350.0, 24, 8, 16.2, "GREEN",
                lodhiCoords, lodhiStops, 64, 42,
                Instant.now().minusSeconds(86400 * 3)
        ));

        // 2. Cubbon Park, Bengaluru
        List<List<Double>> cubbonCoords = List.of(
                List.of(77.5929, 12.9763), List.of(77.5938, 12.9772), List.of(77.5946, 12.9768),
                List.of(77.5941, 12.9755), List.of(77.5930, 12.9758), List.of(77.5929, 12.9763)
        );
        List<CommunityStop> cubbonStops = List.of(
                new CommunityStop("cs-1", "Bamboo Grove Gazebo", "SHADE", "Tall bamboo thickets offering total sun protection and birdsong.", 12.9768, 77.5936),
                new CommunityStop("cs-2", "Bandstand Elders Circle", "BENCH", "Historic bandstand seating area where senior walk clubs gather.", 12.9760, 77.5940),
                new CommunityStop("cs-3", "Chilled Water Dispenser Point", "WATER", "Clean municipal RO drinking water facility.", 12.9757, 77.5932)
        );
        routeStore.put("cr-cubbon-1", new CommunityRoute(
                "cr-cubbon-1",
                "Cubbon Park Bamboo Bower Promenade",
                "Capt. Narayanan (Retd.)",
                "Breathe pristine fresh air under Bengaluru's towering bamboo canopies. Broad asphalt walk with zero bicycle/vehicle crossing.",
                List.of("🎍 Bamboo Groves", "🚰 Drinking Water", "🪑 Plentiful Benches", "🟢 Low PM2.5"),
                12.9763, 77.5929, 1100.0, 18, 6, 14.8, "GREEN",
                cubbonCoords, cubbonStops, 53, 37,
                Instant.now().minusSeconds(86400 * 5)
        ));

        // 3. Sanjay Van, South Delhi
        List<List<Double>> sanjayCoords = List.of(
                List.of(77.1741, 28.5284), List.of(77.1752, 28.5293), List.of(77.1760, 28.5288),
                List.of(77.1755, 28.5276), List.of(77.1742, 28.5280), List.of(77.1741, 28.5284)
        );
        List<CommunityStop> sanjayStops = List.of(
                new CommunityStop("sv-1", "Peacock Sanctuary Point", "VIEWPOINT", "Open clearing where peacocks and spotted doves feed in morning.", 28.5290, 77.1750),
                new CommunityStop("sv-2", "Neem Tree Rest Bench", "SHADE", "Pair of cast-iron benches under fragrant medicinal neem trees.", 28.5281, 77.1756)
        );
        routeStore.put("cr-sanjay-1", new CommunityRoute(
                "cr-sanjay-1",
                "Sanjay Van Peacock Woods Loop",
                "Dr. K. S. Verma (Elder Ornithology Club)",
                "Gentle paved pathway shielded deep inside the ridge forest away from vehicular exhaust fumes.",
                List.of("🦚 Peacock Spotting", "🌿 Forest Ozone", "🪑 5 Benches", "🔇 Silent Zone"),
                28.5284, 77.1741, 1420.0, 25, 5, 17.0, "GREEN",
                sanjayCoords, sanjayStops, 39, 28,
                Instant.now().minusSeconds(86400 * 2)
        ));

        // 4. Crescent Park / Sehore Colony Lake Promenade
        List<List<Double>> sehoreCoords = List.of(
                List.of(76.8596, 23.0756), List.of(76.8604, 23.0762), List.of(76.8612, 23.0758),
                List.of(76.8608, 23.0749), List.of(76.8598, 23.0750), List.of(76.8596, 23.0756)
        );
        List<CommunityStop> sehoreStops = List.of(
                new CommunityStop("seh-1", "Lakeside Breeze Gazebo", "VIEWPOINT", "Scenic open pavilion catching fresh water currents.", 23.0760, 76.8606),
                new CommunityStop("seh-2", "Colony Elders Kiosk", "BENCH", "Covered pergola with wooden benches and chess boards.", 23.0752, 76.8602)
        );
        routeStore.put("cr-sehore-1", new CommunityRoute(
                "cr-sehore-1",
                "Sehore Crescent Lake Promenade",
                "Grandpa Ramesh & Neighbors",
                "A gentle, flat lakefront walking trail in the colony with zero road traffic, smooth paving, and cool evening breeze.",
                List.of("🌊 Lake View", "🪑 Shaded Rest Areas", "🚶 100% Flat", "💡 Solar Lit"),
                23.0756, 76.8596, 980.0, 16, 4, 15.4, "GREEN",
                sehoreCoords, sehoreStops, 31, 21,
                Instant.now().minusSeconds(86400)
        ));

        // 5. Central Park Connaught Place, New Delhi
        List<List<Double>> cpCoords = List.of(
                List.of(77.2197, 28.6328), List.of(77.2205, 28.6335), List.of(77.2212, 28.6330),
                List.of(77.2208, 28.6320), List.of(77.2198, 28.6322), List.of(77.2197, 28.6328)
        );
        List<CommunityStop> cpStops = List.of(
                new CommunityStop("cp-1", "National Flag Lawn Benches", "BENCH", "Wide green lawns with numerous park benches and security.", 28.6333, 77.2206),
                new CommunityStop("cp-2", "Sheltered Metro Arcade", "SHADE", "Covered colonnade offering cool shelter and water fountains.", 28.6323, 77.2202)
        );
        routeStore.put("cr-cp-1", new CommunityRoute(
                "cr-cp-1",
                "CP Central Circular Promenade",
                "CP Seniors Walk Society",
                "Completely pedestrianized, wide tiled walkway above Rajiv Chowk with gentle slopes and immediate emergency assistance nearby.",
                List.of("🏙️ Central Park", "🪑 Plentiful Seating", "♿ Wheelchair Ramp", "🛡️ High Safety"),
                28.6328, 77.2197, 850.0, 14, 12, 19.8, "YELLOW",
                cpCoords, cpStops, 58, 35,
                Instant.now().minusSeconds(86400 * 4)
        ));
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return 6371.0 * c;
    }
}
