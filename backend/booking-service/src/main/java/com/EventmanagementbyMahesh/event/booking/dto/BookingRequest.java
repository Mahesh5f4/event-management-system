package com.EventmanagementbyMahesh.event.booking.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.List;

@Schema(description = "Request payload for initiating a ticket booking")
public class BookingRequest {
    @NotNull(message = "Event ID cannot be null")
    @Schema(description = "ID of the event to book tickets for", example = "42")
    public Long eventId;

    @NotNull(message = "Ticket count cannot be null")
    @Min(value = 1, message = "At least 1 ticket must be booked")
    @Schema(description = "Number of tickets to purchase", example = "2")
    public Integer ticketCount;

    @Schema(description = "List of specific seat IDs to book (for allocated seating events)", example = "[\"A1\", \"A2\"]")
    public List<String> seats;
}
