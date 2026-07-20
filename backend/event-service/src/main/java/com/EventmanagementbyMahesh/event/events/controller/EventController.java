package com.EventmanagementbyMahesh.event.events.controller;

import com.EventmanagementbyMahesh.event.common.ApiResponse;
import com.EventmanagementbyMahesh.event.events.dto.*;
import com.EventmanagementbyMahesh.event.events.service.EventService;
import com.EventmanagementbyMahesh.event.events.service.MLRecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.EventmanagementbyMahesh.event.common.dto.PageResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/events")
@Tag(name = "Event APIs", description = "Event lifecycle management: create, read, update, delete events and fetch recommendations")
public class EventController {

    private final EventService service;
    private final MLRecommendationService recommendationService;

    public EventController(EventService service, MLRecommendationService recommendationService) {
        this.service = service;
        this.recommendationService = recommendationService;
    }

    @Operation(summary = "Get ML event recommendations",
            description = "Fetches a list of recommended events for a given event ID using the ML recommendation engine.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Recommended events returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Event not found")
    })
    @GetMapping("/{id}/recommendations")
    public ResponseEntity<ApiResponse<List<EventResponse>>> getRecommendations(
            @Parameter(description = "ID of the source event") @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(
                recommendationService.getRecommendations(id),
                "Recommended events fetched successfully"
        ));
    }

    @Operation(summary = "Create a new event",
            description = "Creates a new event. Requires ADMIN role. Evicts the events cache.",
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Event created successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Access denied - requires ADMIN role"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request body")
    })
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<ApiResponse<EventResponse>> create(@RequestBody CreateEventRequest req) {
        EventResponse response = service.create(req);
        return ResponseEntity.ok(ApiResponse.ok(response, "Event created successfully"));
    }

    @Operation(summary = "Get all active events (paginated)",
            description = "Returns a paginated list of all upcoming events, ordered by start time descending.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Events fetched successfully")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<EventResponse>>> getAll(
            @Parameter(description = "Page number (0-indexed)", example = "0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Number of events per page", example = "10") @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll(page, size), "Events fetched successfully"));
    }

    @Operation(summary = "Get event by ID",
            description = "Returns a single event by ID. Returns 404 if not found, or 400 if the event has expired.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Event fetched successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Event not found"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Event has expired")
    })
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EventResponse>> getById(
            @Parameter(description = "Event ID") @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getById(id), "Event fetched successfully"));
    }

    @Operation(summary = "Update an event",
            description = "Partially updates an event's details. Requires ADMIN role. Only supplied fields are updated.",
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Event updated successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Access denied - requires ADMIN role"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Event not found")
    })
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> update(
            @Parameter(description = "Event ID") @PathVariable Long id,
            @RequestBody UpdateEventRequest req) {
        Map<String, Object> result = service.update(id, req);
        return ResponseEntity.ok(ApiResponse.ok(result, "Event updated successfully"));
    }

    @Operation(summary = "Delete an event",
            description = "Permanently deletes an event by ID. Requires ADMIN role.",
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Event deleted successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Access denied - requires ADMIN role")
    })
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> delete(
            @Parameter(description = "Event ID") @PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Event deleted successfully"));
    }

    @Operation(summary = "Internal: Deduct seats",
            description = "Internal service call to deduct available seats after a booking is confirmed.")
    @PutMapping("/internal/{id}/deduct-seats")
    public ResponseEntity<?> deductSeats(
            @PathVariable Long id,
            @Parameter(description = "Number of seats to deduct") @RequestParam int count) {
        service.deductSeats(id, count);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Internal: Add seats",
            description = "Internal service call to restore available seats after a booking is cancelled.")
    @PutMapping("/internal/{id}/add-seats")
    public ResponseEntity<?> addSeats(
            @PathVariable Long id,
            @Parameter(description = "Number of seats to restore") @RequestParam int count) {
        service.addSeats(id, count);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Internal: Get event by ID (raw)",
            description = "Internal service call that returns the raw EventResponse without API wrapper.")
    @GetMapping("/internal/{id}")
    public ResponseEntity<EventResponse> getInternalById(
            @Parameter(description = "Event ID") @PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }
}
