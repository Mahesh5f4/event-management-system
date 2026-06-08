package com.EventmanagementbyMahesh.event.events.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request payload for submitting an event review")
public class ReviewRequest {
    @Schema(description = "Rating between 1 and 5", example = "5")
    private Integer rating;

    @Schema(description = "Written review comment", example = "Amazing event, highly organised!")
    private String comment;

    @Schema(description = "Optional image URL to attach to the review", example = "https://cdn.example.com/photos/review1.jpg")
    private String imageUrl;
}
