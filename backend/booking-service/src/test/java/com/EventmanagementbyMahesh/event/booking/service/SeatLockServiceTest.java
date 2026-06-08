package com.EventmanagementbyMahesh.event.booking.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.Set;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SeatLockServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;

    @Test
    void lockSeatReturnsTrueWhenRedisSetIfAbsentSucceeds() {
        SeatLockService service = new SeatLockService(redisTemplate);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent("seat_lock:5:A1", "user1", 5, TimeUnit.MINUTES)).thenReturn(true);

        boolean locked = service.lockSeat(5L, "A1", "user1");

        assertTrue(locked);
    }

    @Test
    void getLockedSeatsParsesSeatIdsFromRedisKeys() {
        SeatLockService service = new SeatLockService(redisTemplate);
        when(redisTemplate.keys("seat_lock:10:*")).thenReturn(Set.of("seat_lock:10:A1", "seat_lock:10:B2"));

        var lockedSeats = service.getLockedSeats(10L);

        assertEquals(2, lockedSeats.size());
        assertTrue(lockedSeats.contains("A1"));
        assertTrue(lockedSeats.contains("B2"));
    }

    @Test
    void lockSeatReturnsFalseWhenRedisThrows() {
        SeatLockService service = new SeatLockService(redisTemplate);
        when(redisTemplate.opsForValue()).thenThrow(new RuntimeException("Redis down"));

        assertFalse(service.lockSeat(1L, "A2", "u2"));
    }
}
