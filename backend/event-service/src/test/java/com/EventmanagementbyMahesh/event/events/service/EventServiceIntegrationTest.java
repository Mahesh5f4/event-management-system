package com.EventmanagementbyMahesh.event.events.service;

import com.EventmanagementbyMahesh.event.common.AbstractIntegrationTest;
import com.EventmanagementbyMahesh.event.events.dto.CreateEventRequest;
import com.EventmanagementbyMahesh.event.events.dto.EventResponse;
import com.EventmanagementbyMahesh.event.events.dto.UpdateEventRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class EventServiceIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private EventService eventService;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Test
    void testEventCrudAndCaching() throws Exception {
        // Clear Redis cache before testing
        redisTemplate.getConnectionFactory().getConnection().serverCommands().flushAll();

        // 1. Create Event
        CreateEventRequest req = new CreateEventRequest();
        req.title = "Integration Test Event";
        req.description = "A great event for integration testing.";
        req.location = "Virtual";
        req.price = 50.0;
        req.totalSeats = 100;
        req.startTime = LocalDateTime.now().plusDays(10);
        req.endTime = LocalDateTime.now().plusDays(11);
        req.imageUrl = "https://example.com/image.png";

        EventResponse created = eventService.create(req);
        assertNotNull(created);
        assertNotNull(created.id);
        assertEquals("Integration Test Event", created.title);

        // Verify it was evicted from cache (if any existed before, which they didn't)
        Boolean hasKey = redisTemplate.hasKey("event::" + created.id);
        assertFalse(hasKey != null ? hasKey : false, "Cache should not have the event before we read it");

        // 2. Read Event (Cache Miss -> DB hit -> Populate Cache)
        EventResponse read1 = eventService.getById(created.id);
        assertEquals(created.id, read1.id);

        // Verify cache is now populated
        hasKey = redisTemplate.hasKey("event::" + created.id);
        assertTrue(hasKey != null ? hasKey : false, "Cache should be populated after getById");

        // 3. Read Event (Cache Hit)
        // Spring handles the cache hit transparently, so we just verify the call succeeds.
        EventResponse read2 = eventService.getById(created.id);
        assertEquals(created.id, read2.id);

        // 4. Update Event (Cache Evict)
        UpdateEventRequest updateReq = new UpdateEventRequest();
        updateReq.title = "Updated Integration Test Event";
        eventService.update(created.id, updateReq);

        // Verify it was evicted
        hasKey = redisTemplate.hasKey("event::" + created.id);
        assertFalse(hasKey != null ? hasKey : false, "Cache should be evicted after update");

        // 5. Read again (Cache Miss -> DB hit)
        EventResponse read3 = eventService.getById(created.id);
        assertEquals("Updated Integration Test Event", read3.title);

        // Verify it is cached again
        hasKey = redisTemplate.hasKey("event::" + created.id);
        assertTrue(hasKey != null ? hasKey : false, "Cache should be populated after getById again");

        // 6. Delete Event (Cache Evict)
        eventService.delete(created.id);

        // Verify eviction
        hasKey = redisTemplate.hasKey("event::" + created.id);
        assertFalse(hasKey != null ? hasKey : false, "Cache should be evicted after delete");
    }
}
