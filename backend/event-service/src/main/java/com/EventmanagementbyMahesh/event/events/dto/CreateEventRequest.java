package com.EventmanagementbyMahesh.event.events.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "Request payload for creating a new event")
public class CreateEventRequest {
    @Schema(description = "Event title", example = "Tech Summit 2026")
    public String title;

    @Schema(description = "Detailed description of the event", example = "An annual gathering of technology leaders.")
    public String description;

    @Schema(description = "Physical or virtual venue location", example = "Bengaluru Convention Centre")
    public String location;

    @Schema(description = "Event start date and time (ISO 8601)", example = "2026-09-01T09:00:00")
    public LocalDateTime startTime;

    @Schema(description = "Event end date and time (ISO 8601)", example = "2026-09-01T18:00:00")
    public LocalDateTime endTime;

    @Schema(description = "Ticket price in INR", example = "999.99")
    public Double price;

    @Schema(description = "Total number of seats available", example = "500")
    public Integer totalSeats;

    @Schema(description = "URL to the event's cover image", example = "https://cdn.example.com/events/tech-summit.jpg")
    public String imageUrl;
}
