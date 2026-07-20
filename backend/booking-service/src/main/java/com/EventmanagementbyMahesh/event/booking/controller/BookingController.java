package com.EventmanagementbyMahesh.event.booking.controller;

import com.EventmanagementbyMahesh.event.booking.dto.*;
import com.EventmanagementbyMahesh.event.booking.repository.BookingRepository;
import com.EventmanagementbyMahesh.event.booking.service.BookingService;
import com.EventmanagementbyMahesh.event.common.ApiResponse;
import com.EventmanagementbyMahesh.event.common.config.RabbitMQConfig;
import com.EventmanagementbyMahesh.event.common.security.RateLimiterService;
import com.EventmanagementbyMahesh.event.booking.service.PdfTicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import com.EventmanagementbyMahesh.event.common.dto.PageResponse;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/bookings")
@Tag(name = "Booking APIs", description = "Ticket booking, status polling, seat querying, and PDF ticket download")
@SecurityRequirement(name = "Bearer Authentication")
public class BookingController {

    private final BookingService service;
    private final BookingRepository bookingRepo;
    private final RateLimiterService rateLimiter;
    private final RabbitTemplate rabbitTemplate;
    private final StringRedisTemplate redisTemplate;
    private final PdfTicketService pdfTicketService;

    public BookingController(BookingService service,
                             BookingRepository bookingRepo,
                             RateLimiterService rateLimiter,
                             RabbitTemplate rabbitTemplate,
                             StringRedisTemplate redisTemplate,
                             PdfTicketService pdfTicketService) {
        this.service = service;
        this.bookingRepo = bookingRepo;
        this.rateLimiter = rateLimiter;
        this.rabbitTemplate = rabbitTemplate;
        this.redisTemplate = redisTemplate;
        this.pdfTicketService = pdfTicketService;
    }

    @Operation(summary = "Create a booking (async)",
            description = "Initiates an asynchronous booking request via RabbitMQ. Returns a correlationId to poll for status. Rate-limited to 500 requests per minute per user.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "202", description = "Booking request accepted and queued for processing"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "429", description = "Rate limit exceeded – too many booking attempts"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Not authenticated")
    })
    @PostMapping
    public ResponseEntity<?> book(Authentication auth, @Valid @RequestBody BookingRequest req) {
        String email = auth.getName();
        if (!rateLimiter.isAllowed("booking:" + email, 500, 60)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ApiResponse.error("Too many booking attempts. Please wait a minute."));
        }
        BookingMessage message = new BookingMessage(email, req);
        redisTemplate.opsForValue().set("booking_status:" + message.correlationId, "PENDING");
        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.ROUTING_KEY, message);
        return ResponseEntity.accepted().body(ApiResponse.ok(
            java.util.Map.of("bookingId", message.correlationId, "status", "PENDING"),
            "Booking request accepted and queued"
        ));
    }

    @Operation(summary = "Poll booking status",
            description = "Checks the current processing status of an async booking by its correlationId. Status can be: PENDING, CONFIRMED, FAILED.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Status fetched successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Booking correlationId not found")
    })
    @GetMapping("/status/{correlationId}")
    public ResponseEntity<?> getStatus(
            @Parameter(description = "The correlationId returned when the booking was created") @PathVariable String correlationId) {
        String status = redisTemplate.opsForValue().get("booking_status:" + correlationId);
        
        // Fallback for Razorpay synchronous flow where correlationId is the actual database ID
        if (status == null) {
            try {
                Long bookingId = Long.parseLong(correlationId);
                return bookingRepo.findById(bookingId)
                        .map(b -> {
                            String mappedStatus = b.getStatus().name();
                            // Map CONFIRMED to COMPLETED for frontend Redux compatibility
                            if (mappedStatus.equals("CONFIRMED")) mappedStatus = "COMPLETED";
                            return ResponseEntity.ok(ApiResponse.ok(
                                java.util.Map.of("status", mappedStatus, "message", "", "id", b.getId().toString()),
                                "Booking status fetched"
                            ));
                        })
                        .orElse(ResponseEntity.notFound().build());
            } catch (NumberFormatException e) {
                return ResponseEntity.notFound().build();
            }
        }

        String message = redisTemplate.opsForValue().get("booking_message:" + correlationId);
        String id = redisTemplate.opsForValue().get("booking_id:" + correlationId);
        return ResponseEntity.ok(ApiResponse.ok(
            java.util.Map.of("status", status, "message", message != null ? message : "", "id", id != null ? id : ""),
            "Booking status fetched"
        ));
    }

    @Operation(summary = "Get booked seat IDs for an event",
            description = "Returns a list of seat IDs that have already been booked for a given event.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Booked seats returned")
    @GetMapping("/event/{eventId}/seats")
    public ResponseEntity<ApiResponse<List<String>>> getBookedSeats(
            @Parameter(description = "Event ID") @PathVariable Long eventId) {
        List<String> seats = service.getBookedSeatsForEvent(eventId);
        return ResponseEntity.ok(ApiResponse.ok(seats, "Booked seats fetched"));
    }

    @Operation(summary = "Get my bookings",
            description = "Returns a paginated list of all bookings made by the currently authenticated user.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Bookings fetched successfully")
    @GetMapping("/my-bookings")
    public ResponseEntity<ApiResponse<PageResponse<BookingResponse>>> getMyBookings(
            Authentication auth,
            @Parameter(description = "Page number (0-indexed)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size", example = "10") @RequestParam(defaultValue = "10") int size) {
        String email = auth.getName();
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<BookingResponse> bookings = service.getMyBookings(email, pageable);
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.of(bookings), "Bookings fetched successfully"));
    }

    @Operation(summary = "Download PDF ticket",
            description = "Generates and returns a downloadable PDF ticket for a confirmed booking.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "PDF ticket returned as binary attachment"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Booking not found")
    })
    @GetMapping("/{id}/ticket")
    public ResponseEntity<byte[]> downloadTicket(@Parameter(description = "Booking ID") @PathVariable Long id) {
        return bookingRepo.findById(id)
                .map(booking -> {
                    byte[] pdf = pdfTicketService.generateTicket(booking);
                    return ResponseEntity.ok()
                            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=ticket-" + id + ".pdf")
                            .contentType(MediaType.APPLICATION_PDF)
                            .body(pdf);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
