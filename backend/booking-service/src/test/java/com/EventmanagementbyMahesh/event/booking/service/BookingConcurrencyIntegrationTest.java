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
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class BookingConcurrencyIntegrationTest {

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
    void testConcurrentBookingsSameSeats() throws InterruptedException {
        // 10 concurrent requests booking the same event seats.
        // Let's say only 1 seat is available.
        int numThreads = 10;
        AtomicInteger availableSeats = new AtomicInteger(1);
        AtomicReference<String> activeLock = new AtomicReference<>(null);

        // Stub user service call
        UserDto userDto = new UserDto();
        userDto.setId(42L);
        userDto.setEmail("user@example.com");
        userDto.setName("User Name");
        when(restTemplate.getForObject(contains("/users/by-email"), eq(UserDto.class))).thenReturn(userDto);

        // Stub event service fetch call
        when(restTemplate.getForObject(contains("/api/events/internal/"), eq(EventResponse.class)))
                .thenAnswer(invocation -> {
                    EventResponse event = new EventResponse();
                    event.setId(1L);
                    event.setTitle("Concert");
                    event.setAvailableSeats(availableSeats.get());
                    event.setPrice(100.0);
                    event.setStartTime(LocalDateTime.now().plusDays(1));
                    event.setLocation("Arena");
                    return event;
                });

        // Stub seat deduction call
        doAnswer(invocation -> {
            String url = invocation.getArgument(0);
            int count = 1;
            if (url.contains("count=")) {
                String countStr = url.substring(url.indexOf("count=") + 6);
                count = Integer.parseInt(countStr);
            }
            availableSeats.addAndGet(-count);
            return null;
        }).when(restTemplate).put(anyString(), any());

        // Stub Redis ops
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class)))
                .thenAnswer(invocation -> {
                    String val = invocation.getArgument(1);
                    return activeLock.compareAndSet(null, val);
                });
        when(valueOperations.get(anyString())).thenAnswer(invocation -> activeLock.get());
        when(redisTemplate.delete(anyString())).thenAnswer(invocation -> {
            activeLock.set(null);
            return true;
        });

        // Stub database booking save
        when(bookingRepo.save(any(Booking.class))).thenAnswer(invocation -> {
            Booking b = invocation.getArgument(0);
            Booking saved = new Booking();
            org.springframework.test.util.ReflectionTestUtils.setField(saved, "id", (long) (ThreadLocalRandom.current().nextInt(1000000)));
            saved.setEventId(b.getEventId());
            saved.setUserId(b.getUserId());
            saved.setUserEmail(b.getUserEmail());
            saved.setTicketCount(b.getTicketCount());
            saved.setSeats(b.getSeats());
            saved.setStatus(BookingStatus.CONFIRMED);
            return saved;
        });

        ExecutorService executorService = Executors.newFixedThreadPool(numThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(numThreads);

        List<BookingResponse> successes = Collections.synchronizedList(new ArrayList<>());
        List<Exception> failures = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < numThreads; i++) {
            final String email = "user" + i + "@example.com";
            executorService.submit(() -> {
                try {
                    startLatch.await();
                    BookingRequest req = new BookingRequest();
                    req.eventId = 1L;
                    req.ticketCount = 1;
                    req.seats = List.of("A1");

                    BookingResponse res = bookingService.bookTickets(email, req);
                    successes.add(res);
                } catch (Exception e) {
                    failures.add(e);
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        finishLatch.await(15, TimeUnit.SECONDS);
        executorService.shutdown();

        // Since only 1 ticket was available, only 1 request should succeed.
        assertEquals(1, successes.size());
        assertEquals(9, failures.size());
        assertEquals(0, availableSeats.get());
    }

    @Test
    void testConcurrentBookingsLimitedInventory() throws InterruptedException {
        // 50 concurrent requests competing for limited event inventory (10 seats).
        int numThreads = 50;
        int initialSeats = 10;
        AtomicInteger availableSeats = new AtomicInteger(initialSeats);
        AtomicReference<String> activeLock = new AtomicReference<>(null);

        // Stub user service call
        UserDto userDto = new UserDto();
        userDto.setId(42L);
        userDto.setEmail("user@example.com");
        userDto.setName("User Name");
        when(restTemplate.getForObject(contains("/users/by-email"), eq(UserDto.class))).thenReturn(userDto);

        // Stub event service fetch call
        when(restTemplate.getForObject(contains("/api/events/internal/"), eq(EventResponse.class)))
                .thenAnswer(invocation -> {
                    EventResponse event = new EventResponse();
                    event.setId(1L);
                    event.setTitle("Concert");
                    event.setAvailableSeats(availableSeats.get());
                    event.setPrice(100.0);
                    event.setStartTime(LocalDateTime.now().plusDays(1));
                    event.setLocation("Arena");
                    return event;
                });

        // Stub seat deduction call
        doAnswer(invocation -> {
            String url = invocation.getArgument(0);
            int count = 1;
            if (url.contains("count=")) {
                String countStr = url.substring(url.indexOf("count=") + 6);
                count = Integer.parseInt(countStr);
            }
            availableSeats.addAndGet(-count);
            return null;
        }).when(restTemplate).put(anyString(), any());

        // Stub Redis ops
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class)))
                .thenAnswer(invocation -> {
                    String val = invocation.getArgument(1);
                    return activeLock.compareAndSet(null, val);
                });
        when(valueOperations.get(anyString())).thenAnswer(invocation -> activeLock.get());
        when(redisTemplate.delete(anyString())).thenAnswer(invocation -> {
            activeLock.set(null);
            return true;
        });

        // Stub database booking save
        when(bookingRepo.save(any(Booking.class))).thenAnswer(invocation -> {
            Booking b = invocation.getArgument(0);
            Booking saved = new Booking();
            org.springframework.test.util.ReflectionTestUtils.setField(saved, "id", (long) (ThreadLocalRandom.current().nextInt(1000000)));
            saved.setEventId(b.getEventId());
            saved.setUserId(b.getUserId());
            saved.setUserEmail(b.getUserEmail());
            saved.setTicketCount(b.getTicketCount());
            saved.setSeats(b.getSeats());
            saved.setStatus(BookingStatus.CONFIRMED);
            return saved;
        });

        ExecutorService executorService = Executors.newFixedThreadPool(numThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(numThreads);

        List<BookingResponse> successes = Collections.synchronizedList(new ArrayList<>());
        List<Exception> failures = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < numThreads; i++) {
            final String email = "user" + i + "@example.com";
            executorService.submit(() -> {
                try {
                    startLatch.await();
                    BookingRequest req = new BookingRequest();
                    req.eventId = 1L;
                    req.ticketCount = 1;
                    req.seats = List.of("Seat-" + ThreadLocalRandom.current().nextInt(1000));

                    BookingResponse res = bookingService.bookTickets(email, req);
                    successes.add(res);
                } catch (Exception e) {
                    failures.add(e);
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        finishLatch.await(20, TimeUnit.SECONDS);
        executorService.shutdown();

        // Exactly 10 tickets should succeed because inventory is 10.
        assertEquals(10, successes.size());
        assertEquals(40, failures.size());
        assertEquals(0, availableSeats.get());
    }
}
