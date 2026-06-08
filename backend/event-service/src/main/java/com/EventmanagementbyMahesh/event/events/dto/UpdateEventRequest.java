package com.EventmanagementbyMahesh.event.events.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "Request payload for partially updating an event. Only provided fields are updated.")
public class UpdateEventRequest {
    @Schema(description = "Updated event title", example = "Tech Summit 2026 – Extended")
    public String title;

    @Schema(description = "Updated event description")
    public String description;

    @Schema(description = "Updated venue location", example = "Hyderabad International Convention Centre")
    public String location;

    @Schema(description = "Updated ticket price in INR", example = "1299.00")
    public Double price;

    @Schema(description = "Updated event start date and time", example = "2026-09-02T10:00:00")
    public LocalDateTime startTime;

    @Schema(description = "Updated event end date and time", example = "2026-09-02T20:00:00")
    public LocalDateTime endTime;

    @Schema(description = "Updated cover image URL")
    public String imageUrl;

    @Schema(description = "Updated total seats. Available seats will be adjusted by the difference.", example = "600")
    public Integer totalSeats;
}
