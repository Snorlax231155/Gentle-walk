package com.gentlewalk.api;

import com.gentlewalk.api.dto.CreateCommunityRouteRequest;
import com.gentlewalk.domain.CommunityRoute;
import com.gentlewalk.service.CommunityRouteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/community")
@Tag(name = "Community Trails", description = "Pokémon GO style community-shared elder walking routes and rest stop milestones")
public class CommunityRouteController {

    private final CommunityRouteService communityRouteService;

    public CommunityRouteController(CommunityRouteService communityRouteService) {
        this.communityRouteService = communityRouteService;
    }

    @GetMapping("/routes")
    @Operation(summary = "Get community walking trails sorted by proximity to elder walker or popularity")
    public ResponseEntity<List<CommunityRoute>> getCommunityRoutes(
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lon,
            @RequestParam(required = false, defaultValue = "50.0") Double radiusKm) {
        return ResponseEntity.ok(communityRouteService.getRoutes(lat, lon, radiusKm));
    }

    @GetMapping("/routes/{id}")
    @Operation(summary = "Get single community trail by ID")
    public ResponseEntity<CommunityRoute> getRouteById(@PathVariable String id) {
        return communityRouteService.getRoute(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/routes")
    @Operation(summary = "Submit a custom community walking route with rest stops and elder tags")
    public ResponseEntity<CommunityRoute> submitRoute(@Valid @RequestBody CreateCommunityRouteRequest request) {
        CommunityRoute created = communityRouteService.submitRoute(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/routes/{id}/cheer")
    @Operation(summary = "Cheer or give an Elder-Approved stamp to a community route")
    public ResponseEntity<CommunityRoute> cheerRoute(@PathVariable String id) {
        return communityRouteService.cheerRoute(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/routes/{id}/walk")
    @Operation(summary = "Record that an elder walked this community route")
    public ResponseEntity<CommunityRoute> recordWalk(@PathVariable String id) {
        return communityRouteService.logWalk(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
