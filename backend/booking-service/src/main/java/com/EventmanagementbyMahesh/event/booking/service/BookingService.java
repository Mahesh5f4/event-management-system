package com.EventmanagementbyMahesh.event.booking.service;

import com.EventmanagementbyMahesh.event.booking.dto.*;
import com.EventmanagementbyMahesh.event.booking.entity.Booking;
import com.EventmanagementbyMahesh.event.booking.entity.BookingStatus;
import com.EventmanagementbyMahesh.event.booking.repository.BookingRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.EventmanagementbyMahesh.event.common.metrics.BookingMetrics;
import com.EventmanagementbyMahesh.event.common.service.EmailService;
import com.EventmanagementbyMahesh.event.common.dto.PageResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
public class BookingService {

    private static final int MAX_RETRIES = 15;
    private static final String LOCK_KEY_PREFIX = "lock:event:";

    @Value("${AUTH_SERVICE_URL:http://localhost:8081}")
    private String authServiceUrl;

    @Value("${EVENT_SERVICE_URL:http://localhost:8082}")
    private String eventServiceUrl;

    private final BookingRepository bookingRepo;
    private final SeatLockService seatLockService;
    private final BookingMetrics bookingMetrics;
    private final StringRedisTemplate redisTemplate;
    private final EmailService emailService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public BookingService(BookingRepository bookingRepo,
                          SeatLockService seatLockService,
                          BookingMetrics bookingMetrics,
                          StringRedisTemplate redisTemplate,
                          EmailService emailService,
                          RestTemplate restTemplate,
                          ObjectMapper objectMapper) {
        this.bookingRepo = bookingRepo;
        this.seatLockService = seatLockService;
        this.bookingMetrics = bookingMetrics;
        this.redisTemplate = redisTemplate;
        this.emailService = emailService;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Book tickets with optimistic locking + retry logic.
     */
    public BookingResponse bookTickets(String userEmail, BookingRequest req) {
        // Fetch UserDto via REST
        String userUrl = authServiceUrl + "/api/auth/internal/users/by-email?email=" + userEmail;
        UserDto user = restTemplate.getForObject(userUrl, UserDto.class);
        if (user == null) {
            throw new RuntimeException("User not found");
        }

        String lockKey = LOCK_KEY_PREFIX + req.eventId;
        String lockValue = UUID.randomUUID().toString();

        for (int attempt = 0; attempt < MAX_RETRIES; attempt++) {
            // Attempt to acquire Redis Lock
            Boolean acquired = redisTemplate.opsForValue().setIfAbsent(lockKey, lockValue, Duration.ofSeconds(10));
            
            if (Boolean.TRUE.equals(acquired)) {
                try {
                    BookingResponse response = attemptBooking(user, req);
                    bookingMetrics.incrementSuccess();
                    
                    // Send Email Confirmation
                    emailService.sendBookingConfirmation(
                        user.getEmail(),
                        response.eventTitle,
                        String.join(", ", response.seats),
                        response.ticketCount,
                        response.eventPrice * response.ticketCount
                    );
                    
                    return response;
                } catch (Exception e) {
                    if (e.getMessage() != null && (e.getMessage().contains("Conflict") || e.getMessage().contains("Optimistic") || e.getMessage().contains("500") || e.getMessage().contains("409"))) {
                        // Fall through to retry logic
                    } else {
                        bookingMetrics.incrementFailure(e.getMessage());
                        throw e;
                    }
                } finally {
                    // Release lock only if we own it
                    String currentLockValue = redisTemplate.opsForValue().get(lockKey);
                    if (lockValue.equals(currentLockValue)) {
                        redisTemplate.delete(lockKey);
                    }
                }
            }

            // Back-off and Retry
            if (attempt == MAX_RETRIES - 1) {
                bookingMetrics.incrementFailure("concurrency_limit");
                throw new IllegalStateException("Booking failed due to high concurrency. Please try again.");
            }
            
            try { Thread.sleep(50L + (long)(Math.random() * 50)); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
        }
        bookingMetrics.incrementFailure("unknown");
        throw new IllegalStateException("Booking failed. Please try again.");
    }

    @Transactional
    protected BookingResponse attemptBooking(UserDto user, BookingRequest req) {
        // 1. Fetch fresh event state via REST
        String eventUrl = eventServiceUrl + "/api/events/internal/" + req.eventId;
        EventResponse event = restTemplate.getForObject(eventUrl, EventResponse.class);
        if (event == null) {
            throw new RuntimeException("Event not found");
        }

        if (event.getAvailableSeats() < req.ticketCount) {
            throw new RuntimeException("Not enough seats available. Requested: "
                    + req.ticketCount + ", Available: " + event.getAvailableSeats());
        }

        // 2. Deduct seats in event-service via HTTP PUT
        String deductUrl = eventServiceUrl + "/api/events/internal/" + req.eventId + "/deduct-seats?count=" + req.ticketCount;
        restTemplate.put(deductUrl, null);

        // 3. Save Booking in local database
        Booking booking = new Booking();
        booking.setEventId(event.getId());
        booking.setUserId(user.getId());
        booking.setUserEmail(user.getEmail());
        booking.setTicketCount(req.ticketCount);
        
        // Take snapshot of event details for historical preservation
        booking.setEventTitle(event.getTitle());
        booking.setEventLocation(event.getLocation());
        booking.setEventTime(event.getStartTime().toString());
        booking.setImageUrl(event.getImageUrl());
        booking.setEventPrice(event.getPrice());
        
        if (req.seats != null && !req.seats.isEmpty()) {
            booking.setSeats(String.join(",", req.seats));
        }
        
        Booking saved = bookingRepo.save(booking);

        if (req.seats != null && !req.seats.isEmpty()) {
            seatLockService.unlockMultipleSeats(event.getId(), req.seats);
        }

        // Evict caches
        evictUserBookingsCache(user.getEmail());
        evictEventsCache();

        return toResponse(saved, event);
    }

    /**
     * Creates a PENDING booking (before Razorpay payment). Called by PaymentService.
     * Deducts seats optimistically — restored if payment fails.
     */
    @Transactional
    public BookingResponse createPendingBooking(String userEmail, BookingRequest req) {
        String userUrl = authServiceUrl + "/api/auth/internal/users/by-email?email=" + userEmail;
        UserDto user = restTemplate.getForObject(userUrl, UserDto.class);
        if (user == null) throw new RuntimeException("User not found");

        String eventUrl = eventServiceUrl + "/api/events/internal/" + req.eventId;
        EventResponse event = restTemplate.getForObject(eventUrl, EventResponse.class);
        if (event == null) throw new RuntimeException("Event not found");

        if (event.getAvailableSeats() < req.ticketCount) {
            throw new RuntimeException("Not enough seats available. Requested: "
                    + req.ticketCount + ", Available: " + event.getAvailableSeats());
        }

        // Deduct seats immediately to prevent overselling during payment window
        String deductUrl = eventServiceUrl + "/api/events/internal/" + req.eventId
                + "/deduct-seats?count=" + req.ticketCount;
        restTemplate.put(deductUrl, null);

        Booking booking = new Booking();
        booking.setEventId(event.getId());
        booking.setUserId(user.getId());
        booking.setUserEmail(user.getEmail());
        booking.setTicketCount(req.ticketCount);
        booking.setEventTitle(event.getTitle());
        booking.setEventLocation(event.getLocation());
        booking.setEventTime(event.getStartTime().toString());
        booking.setImageUrl(event.getImageUrl());
        booking.setEventPrice(event.getPrice());
        booking.setStatus(BookingStatus.PENDING);
        if (req.seats != null && !req.seats.isEmpty()) {
            booking.setSeats(String.join(",", req.seats));
        }

        Booking saved = bookingRepo.save(booking);
        return toResponse(saved, event);
    }

    /**
     * Confirms a PENDING booking after successful Razorpay payment verification.
     */
    @Transactional
    public void confirmBooking(Long bookingId) {
        Booking booking = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalStateException("Cannot confirm booking with status: " + booking.getStatus());
        }
        booking.setStatus(BookingStatus.CONFIRMED);
        bookingRepo.save(booking);
        if (booking.getSeats() != null && !booking.getSeats().isEmpty()) {
            seatLockService.unlockMultipleSeats(booking.getEventId(),
                    List.of(booking.getSeats().split(",")));
        }
        evictUserBookingsCache(booking.getUserEmail());
        evictEventsCache();
    }

    @Transactional
    public void cancelBooking(Long bookingId) {
        Booking booking = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));
        if (booking.getStatus() != BookingStatus.PENDING) {
            return; // Already processed
        }
        booking.setStatus(BookingStatus.FAILED);
        bookingRepo.save(booking);
        // Restore seats — best-effort
        String restoreUrl = eventServiceUrl + "/api/events/internal/" + booking.getEventId()
                + "/restore-seats?count=" + booking.getTicketCount();
        try { restTemplate.put(restoreUrl, null); } catch (Exception e) {
            System.err.println("[BookingService] Seat restore failed for booking " + bookingId + ": " + e.getMessage());
        }
        if (booking.getSeats() != null && !booking.getSeats().isEmpty()) {
            seatLockService.unlockMultipleSeats(booking.getEventId(),
                    List.of(booking.getSeats().split(",")));
        }
        evictUserBookingsCache(booking.getUserEmail());
        evictEventsCache();
    }

    public void evictUserBookingsCache(String userEmail) {
        try {
            java.util.Set<String> keys = redisTemplate.keys("userBookingsV2:" + userEmail + "*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        } catch (Exception e) {
            // ignore
        }
    }

    public void evictEventsCache() {
        try {
            java.util.Set<String> keys = redisTemplate.keys("event:*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        } catch (Exception e) {
            // ignore
        }
    }

    public Page<BookingResponse> getMyBookings(String userEmail, Pageable pageable) {
        String cacheKey = "userBookingsV2:" + userEmail + ":" + pageable.getPageNumber() + ":" + pageable.getPageSize();
        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                PageResponse<BookingResponse> pr = objectMapper.readValue(cached, new TypeReference<PageResponse<BookingResponse>>() {});
                return new org.springframework.data.domain.PageImpl<>(pr.content, pageable, pr.totalElements);
            }
        } catch (Exception e) {
            // ignore
        }

        Page<BookingResponse> result = bookingRepo.findByUserEmail(userEmail, pageable).map(this::toResponse);

        try {
            PageResponse<BookingResponse> pr = PageResponse.of(result);
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(pr), Duration.ofMinutes(5));
        } catch (Exception e) {
            // ignore
        }
        return result;
    }

    public List<String> getBookedSeatsForEvent(Long eventId) {
        return bookingRepo.findByEventIdAndStatus(eventId, BookingStatus.CONFIRMED)
                .stream()
                .filter(b -> b.getSeats() != null)
                .flatMap(b -> List.of(b.getSeats().split(",")).stream())
                .toList();
    }

    private BookingResponse toResponse(Booking b) {
        return toResponse(b, null);
    }

    private BookingResponse toResponse(Booking b, EventResponse event) {
        List<String> seatList = b.getSeats() != null ? 
            List.of(b.getSeats().split(",")) : List.of();
            
        String title = event != null ? event.getTitle() : b.getEventTitle();
        String location = event != null ? event.getLocation() : b.getEventLocation();
        String time = event != null ? event.getStartTime().toString() : b.getEventTime();
        Double price = event != null ? event.getPrice() : b.getEventPrice();
        String img = event != null ? event.getImageUrl() : b.getImageUrl();

        return new BookingResponse(
                b.getId(), b.getEventId(), title, location, time, price, b.getUserId(),
                b.getUserEmail(), b.getTicketCount(), seatList, b.getStatus().name()
        );
    }
}
