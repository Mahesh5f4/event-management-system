package com.EventmanagementbyMahesh.event.booking.service;

import com.EventmanagementbyMahesh.event.booking.dto.BookingRequest;
import com.EventmanagementbyMahesh.event.booking.dto.EventResponse;
import com.EventmanagementbyMahesh.event.booking.dto.UserDto;
import com.EventmanagementbyMahesh.event.booking.repository.BookingRepository;
import com.EventmanagementbyMahesh.event.common.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

public class BookingServiceIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @MockBean
    private RestTemplate restTemplate;

    @BeforeEach
    void setUp() {
        bookingRepository.deleteAll();
        redisTemplate.getConnectionFactory().getConnection().serverCommands().flushAll();
    }

    @Test
    void testRealRedisLockingAndDatabasePersist() throws InterruptedException {
        int numThreads = 15;
        AtomicInteger availableSeats = new AtomicInteger(5); // Only 5 seats available

        UserDto userDto = new UserDto();
        userDto.setId(42L);
        userDto.setEmail("user@example.com");
        userDto.setName("Test User");
        when(restTemplate.getForObject(contains("/users/by-email"), eq(UserDto.class))).thenReturn(userDto);

        when(restTemplate.getForObject(contains("/api/events/internal/"), eq(EventResponse.class)))
                .thenAnswer(invocation -> {
                    EventResponse event = new EventResponse();
                    event.setId(1L);
                    event.setTitle("Test Event");
                    event.setAvailableSeats(availableSeats.get());
                    event.setPrice(50.0);
                    event.setStartTime(LocalDateTime.now().plusDays(2));
                    event.setLocation("Test Arena");
                    return event;
                });

        doAnswer(invocation -> {
            String url = invocation.getArgument(0);
            int count = 1;
            if (url.contains("count=")) {
                String countStr = url.substring(url.indexOf("count=") + 6);
                count = Integer.parseInt(countStr);
            }
            if (availableSeats.get() < count) {
                throw new RuntimeException("409 Conflict: Optimistic Locking Failure");
            }
            availableSeats.addAndGet(-count);
            return null;
        }).when(restTemplate).put(anyString(), any());

        ExecutorService executorService = Executors.newFixedThreadPool(numThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(numThreads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < numThreads; i++) {
            final String email = "user" + i + "@example.com";
            executorService.submit(() -> {
                try {
                    startLatch.await();
                    BookingRequest req = new BookingRequest();
                    req.eventId = 1L;
                    req.ticketCount = 1;
                    req.seats = List.of("A1");
                    
                    bookingService.bookTickets(email, req);
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        startLatch.countDown(); // Release the hounds
        finishLatch.await(30, TimeUnit.SECONDS);
        executorService.shutdown();

        // Assertions
        assertEquals(5, successCount.get(), "Exactly 5 bookings should succeed due to seat constraints");
        assertEquals(10, failureCount.get(), "10 bookings should fail");
        assertEquals(0, availableSeats.get(), "All seats should be consumed");
        assertEquals(5, bookingRepository.count(), "Exactly 5 bookings should be saved in MySQL");
    }
}
