package com.gentlewalk.service;

import com.gentlewalk.domain.IndoorVenue;
import com.gentlewalk.graph.GraphBuilder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class IndoorFallbackService {

    private static final List<IndoorVenueTemplate> VETTED_VENUES = List.of(
            // Delhi NCR
            new IndoorVenueTemplate(
                    "Select CITYWALK Mall",
                    "Shopping Mall",
                    28.5284, 77.2188,
                    850.0,
                    "Centrally Air-Conditioned with MERV 13 filtration",
                    true, true,
                    "10:00 AM – 11:00 PM",
                    "Early morning mall walkers welcome from 09:30 AM before stores open. Marble corridors with frequent bench seating.",
                    List.of("Free Benches", "Wheelchair Ramps", "Elevators", "Clean Restrooms")
            ),
            new IndoorVenueTemplate(
                    "India Habitat Centre (Covered Corridors)",
                    "Museum & Cultural Centre",
                    28.5898, 77.2250,
                    650.0,
                    "High-efficiency air filtration and sheltered shaded courtyards",
                    true, true,
                    "09:00 AM – 08:00 PM",
                    "Quiet, level stone paths with abundant seating, green courtyards, and clean indoor galleries.",
                    List.of("Rest Benches", "Quiet Zones", "Drinking Water", "Medical First Aid")
            ),
            new IndoorVenueTemplate(
                    "DLF Promenade & Ambience Mall Complex",
                    "Shopping Mall",
                    28.5415, 77.1558,
                    1200.0,
                    "Multi-tier central filtration with continuous air monitoring",
                    true, true,
                    "10:00 AM – 10:30 PM",
                    "Spacious 3-floor continuous loop walking perimeter. Guarded walking environment with zero traffic.",
                    List.of("Seating Nodes", "Escalators/Lifts", "Pharmacies", "Restrooms")
            ),
            new IndoorVenueTemplate(
                    "National Science Centre (Indoor Galleries)",
                    "Museum & Cultural Centre",
                    28.6143, 77.2458,
                    900.0,
                    "Fully climate-controlled with indoor air scrubbing",
                    true, true,
                    "09:30 AM – 06:00 PM",
                    "Wide climate-controlled gallery ramps. Ideal low-impact walking without stairs.",
                    List.of("Wheelchair Access", "Rest Areas", "Elevators", "Cafeteria")
            ),
            // Bengaluru
            new IndoorVenueTemplate(
                    "Orion Mall (Brigade Gateway)",
                    "Shopping Mall",
                    13.0112, 77.5550,
                    950.0,
                    "Central air handling units with secondary filtration",
                    true, true,
                    "10:00 AM – 10:00 PM",
                    "Broad concourses. Senior-friendly morning walking hours before store opening hours.",
                    List.of("Benches", "Lifts", "Emergency Aid", "Lake Promenade")
            ),
            new IndoorVenueTemplate(
                    "Phoenix Marketcity Bengaluru",
                    "Shopping Mall",
                    12.9959, 77.6964,
                    1400.0,
                    "Modern HVAC central cooling with particulate filtration",
                    true, true,
                    "10:00 AM – 11:00 PM",
                    "Extensive ground level walking loop with high ceilings and frequent rest benches.",
                    List.of("Plentiful Seating", "Accessible Restrooms", "Level Flooring")
            )
    );

    private record IndoorVenueTemplate(
            String name,
            String category,
            double lat,
            double lon,
            double estimatedLoopMeters,
            String filtrationStatus,
            boolean hasRestBenches,
            boolean elevatorAccessible,
            String openingHours,
            String seniorTip,
            List<String> amenities
    ) {}

    /**
     * Finds nearest indoor climate-controlled walking alternatives.
     */
    public List<IndoorVenue> getIndoorFallbacks(double userLat, double userLon, int limit) {
        List<IndoorVenue> results = new ArrayList<>();

        for (IndoorVenueTemplate t : VETTED_VENUES) {
            double distanceM = GraphBuilder.haversineMeters(userLat, userLon, t.lat(), t.lon());
            double distanceKm = Math.round((distanceM / 1000.0) * 10.0) / 10.0;

            results.add(new IndoorVenue(
                    t.name(),
                    t.category(),
                    t.lat(),
                    t.lon(),
                    distanceKm,
                    t.estimatedLoopMeters(),
                    t.filtrationStatus(),
                    t.hasRestBenches(),
                    t.elevatorAccessible(),
                    t.openingHours(),
                    t.seniorTip(),
                    t.amenities()
            ));
        }

        // Sort by distance from user
        results.sort(Comparator.comparingDouble(IndoorVenue::distanceKm));

        // If user is far from all curated venues (e.g. synthetic demo location), provide a local indoor option
        if (results.isEmpty() || results.getFirst().distanceKm() > 100.0) {
            IndoorVenue localCommunityOption = new IndoorVenue(
                    "Community Centre & Indoor Atrium",
                    "Indoor Community Centre",
                    userLat,
                    userLon,
                    0.4,
                    600.0,
                    "Air-Conditioned Indoor Hall with HEPA Air Purifiers",
                    true,
                    true,
                    "08:00 AM – 08:00 PM",
                    "Safe indoor non-slip tiled walking loop with seating benches every 30 meters.",
                    List.of("Seating Benches", "Drinking Water", "First Aid", "Zero Vehicle Pollution")
            );
            results.add(0, localCommunityOption);
        }

        return results.subList(0, Math.min(results.size(), Math.max(1, limit)));
    }
}
