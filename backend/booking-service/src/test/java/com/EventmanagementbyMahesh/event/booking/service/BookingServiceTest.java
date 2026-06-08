package com.EventmanagementbyMahesh.event.booking.service;

import com.EventmanagementbyMahesh.event.booking.dto.BookingRequest;
import com.EventmanagementbyMahesh.event.booking.dto.BookingResponse;
import com.EventmanagementbyMahesh.event.booking.dto.EventResponse;
import com.EventmanagementbyMahesh.event.booking.dto.UserDto;
import com.EventmanagementbyMahesh.event.booking.entity.Booking;
import com.EventmanagementbyMahesh.event.booking.entity.BookingStatus;
import com.EventmanagementbyMahesh.event.booking.repository.BookingRepository;
import com.EventmanagementbyMahesh.event.common.metrics.BookingMetrics;
import com.EventmanagementbyMahesh.event.common.service.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepo;

    @Mock
    private SeatLockService seatLockService;

    @Mock
    private BookingMetrics bookingMetrics;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private EmailService emailService;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private BookingService bookingService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(bookingService, "authServiceUrl", "http://localhost:8081");
        ReflectionTestUtils.setField(bookingService, "eventServiceUrl", "http://localhost:8082");
    }

    @Test
    void bookTicketsSuccess() {
        BookingRequest req = new BookingRequest();
        req.eventId = 1L;
        req.ticketCount = 2;
        req.seats = List.of("A1", "A2");

        UserDto userDto = new UserDto();
        userDto.setId(10L);
        userDto.setEmail("user@example.com");
        userDto.setName("User Name");
        userDto.setAvatarUrl("avatar");
        EventResponse eventResponse = new EventResponse();
        eventResponse.setId(1L);
        eventResponse.setTitle("Concert");
        eventResponse.setAvailableSeats(10);
        eventResponse.setTotalSeats(10);
        eventResponse.setStartTime(LocalDateTime.now().plusDays(1));
        eventResponse.setPrice(100.0);

        when(restTemplate.getForObject(contains("/users/by-email"), eq(UserDto.class))).thenReturn(userDto);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        
        final String[] activeLock = new String[1];
        when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenAnswer(invocation -> {
            activeLock[0] = invocation.getArgument(1);
            return true;
        });
        when(valueOperations.get(anyString())).thenAnswer(invocation -> activeLock[0]);

        when(restTemplate.getForObject(contains("/internal/1"), eq(EventResponse.class))).thenReturn(eventResponse);

        Booking booking = new Booking();
        booking.setEventId(1L);
        booking.setUserId(10L);
        booking.setUserEmail("user@example.com");
        booking.setTicketCount(2);
        booking.setSeats("A1,A2");
        booking.setStatus(BookingStatus.CONFIRMED);
        org.springframework.test.util.ReflectionTestUtils.setField(booking, "id", 100L);

        when(bookingRepo.save(any(Booking.class))).thenReturn(booking);

        BookingResponse response = bookingService.bookTickets("user@example.com", req);

        assertNotNull(response);
        assertEquals(100L, response.bookingId);
        assertEquals("user@example.com", response.userEmail);
        assertEquals(2, response.ticketCount);

        verify(emailService).sendBookingConfirmation(eq("user@example.com"), anyString(), anyString(), anyInt(), anyDouble());
        verify(bookingMetrics).incrementSuccess();
        verify(redisTemplate).delete(anyString()); // verify lock released
    }

    @Test
    void bookTicketsThrowsWhenUserNotFound() {
        BookingRequest req = new BookingRequest();
        req.eventId = 1L;

        when(restTemplate.getForObject(anyString(), eq(UserDto.class))).thenReturn(null);

        RuntimeException exception = assertThrows(RuntimeException.class, () ->
                bookingService.bookTickets("unknown@example.com", req));

        assertTrue(exception.getMessage().contains("User not found"));
    }

    @Test
    void bookTicketsThrowsWhenLockContentionExceeded() {
        BookingRequest req = new BookingRequest();
        req.eventId = 1L;

        UserDto userDto = new UserDto();
        userDto.setId(10L);
        userDto.setEmail("user@example.com");
        userDto.setName("User Name");
        userDto.setAvatarUrl("avatar");
        when(restTemplate.getForObject(anyString(), eq(UserDto.class))).thenReturn(userDto);

        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(false);

        IllegalStateException exception = assertThrows(IllegalStateException.class, () ->
                bookingService.bookTickets("user@example.com", req));

        assertTrue(exception.getMessage().contains("Booking failed due to high concurrency"));
        verify(bookingMetrics).incrementFailure("concurrency_limit");
    }
}
