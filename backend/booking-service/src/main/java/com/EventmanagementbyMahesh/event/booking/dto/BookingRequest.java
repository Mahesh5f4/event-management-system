package com.EventmanagementbyMahesh.event.booking.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Request payload for initiating a ticket booking")
public class BookingRequest {
    @Schema(description = "ID of the event to book tickets for", example = "42")
    public Long eventId;

    @Schema(description = "Number of tickets to purchase", example = "2")
    public Integer ticketCount;

    @Schema(description = "List of specific seat IDs to book (for allocated seating events)", example = "[\"A1\", \"A2\"]")
    public List<String> seats;
}
