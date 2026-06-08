package com.EventmanagementbyMahesh.event.events.controller;

import com.EventmanagementbyMahesh.event.common.ApiResponse;
import com.EventmanagementbyMahesh.event.events.dto.ReviewRequest;
import com.EventmanagementbyMahesh.event.events.dto.ReviewResponse;
import com.EventmanagementbyMahesh.event.events.dto.UserDto;
import com.EventmanagementbyMahesh.event.events.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@RestController
@RequestMapping("/events/{eventId}/reviews")
@Tag(name = "Review APIs", description = "Submit and retrieve event reviews. Requires authentication.")
public class ReviewController {

    private final ReviewService reviewService;
    private final RestTemplate restTemplate;

    @Value("${AUTH_SERVICE_URL:http://localhost:8081}")
    private String authServiceUrl;

    public ReviewController(ReviewService reviewService, RestTemplate restTemplate) {
        this.reviewService = reviewService;
        this.restTemplate = restTemplate;
    }

    @Operation(summary = "Submit a review for an event",
            description = "Allows an authenticated user to post a rating and review for a specific event. Each user can only review an event once.",
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Review submitted successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "User has already reviewed this event (DUPLICATE_REVIEW)"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Not authenticated"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Event not found")
    })
    @PostMapping
    public ResponseEntity<ApiResponse<ReviewResponse>> addReview(
            @Parameter(description = "Event ID to review") @PathVariable Long eventId,
            @AuthenticationPrincipal String email,
            @RequestBody ReviewRequest request) {

        if (email == null) {
            throw new com.EventmanagementbyMahesh.event.events.exception.ReviewException(
                "You must be logged in to post a review",
                org.springframework.http.HttpStatus.UNAUTHORIZED,
                "AUTH_REQUIRED"
            );
        }

        String userUrl = authServiceUrl + "/api/auth/internal/users/by-email?email=" + email;
        UserDto user = restTemplate.getForObject(userUrl, UserDto.class);
        if (user == null) {
            throw new RuntimeException("User not found");
        }

        return ResponseEntity.ok(ApiResponse.ok(
                reviewService.addReview(eventId, user, request),
                "Review submitted successfully"
        ));
    }

    @Operation(summary = "Get all reviews for an event",
            description = "Returns all reviews for a given event, ordered by most recent first.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Reviews fetched successfully")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> getReviews(
            @Parameter(description = "Event ID") @PathVariable Long eventId) {
        return ResponseEntity.ok(ApiResponse.ok(
                reviewService.getEventReviews(eventId),
                "Reviews fetched successfully"
        ));
    }
}
