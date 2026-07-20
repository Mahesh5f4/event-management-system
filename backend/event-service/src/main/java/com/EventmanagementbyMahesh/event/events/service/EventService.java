package com.EventmanagementbyMahesh.event.events.service;

import com.EventmanagementbyMahesh.event.events.dto.*;
import com.EventmanagementbyMahesh.event.events.entity.Event;
import com.EventmanagementbyMahesh.event.events.repository.EventRepository;
import com.EventmanagementbyMahesh.event.common.dto.PageResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;

@Service
public class EventService {
    private static final Logger logger = LoggerFactory.getLogger(EventService.class);

    private final EventRepository repo;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public EventService(EventRepository repo, StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.repo = repo;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    private void evictCache() {
        try {
            Set<String> keys = redisTemplate.keys("event:*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        } catch (Exception e) {
            logger.warn("Failed to evict redis cache", e);
        }
    }

    @Transactional
    public EventResponse create(CreateEventRequest req) {
        Event e = new Event();
        e.setTitle(req.title);
        e.setDescription(req.description);
        e.setLocation(req.location);
        e.setStartTime(req.startTime);
        e.setEndTime(req.endTime);
        e.setPrice(req.price);
        e.setTotalSeats(req.totalSeats);
        e.setAvailableSeats(req.totalSeats);
        e.setImageUrl(req.imageUrl);
        Event saved = repo.save(e);
        evictCache();
        return toResponse(saved);
    }

    public PageResponse<EventResponse> getAll(int page, int size) {
        String cacheKey = "event:page:" + page + ":size:" + size;
        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.readValue(cached, new TypeReference<PageResponse<EventResponse>>() {});
            }
        } catch (Exception e) {
            logger.warn("Redis GET error for key {}: {}", cacheKey, e.getMessage());
        }

        Pageable pageable = PageRequest.of(page, size);
        Page<EventResponse> eventPage = repo.findByEndTimeAfterOrderByIdDesc(LocalDateTime.now(), pageable).map(this::toResponse);
        PageResponse<EventResponse> response = PageResponse.of(eventPage);

        try {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(response), Duration.ofMinutes(5));
        } catch (Exception e) {
            logger.warn("Redis PUT error for key {}: {}", cacheKey, e.getMessage());
        }

        return response;
    }

    public EventResponse getById(Long id) {
        String cacheKey = "event:" + id;
        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.readValue(cached, EventResponse.class);
            }
        } catch (Exception e) {
            logger.warn("Redis GET error for key {}: {}", cacheKey, e.getMessage());
        }

        Event event = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));
        
        if (event.getEndTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Event has expired");
        }
        
        EventResponse response = toResponse(event);

        try {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(response), Duration.ofMinutes(5));
        } catch (Exception e) {
            logger.warn("Redis PUT error for key {}: {}", cacheKey, e.getMessage());
        }

        return response;
    }

    @Transactional
    public Map<String, Object> update(Long id, UpdateEventRequest req) {
        Event e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));

        if (req.title != null) e.setTitle(req.title);
        if (req.description != null) e.setDescription(req.description);
        if (req.location != null) e.setLocation(req.location);
        if (req.price != null) e.setPrice(req.price);
        if (req.startTime != null) e.setStartTime(req.startTime);
        if (req.endTime != null) e.setEndTime(req.endTime);
        if (req.imageUrl != null) e.setImageUrl(req.imageUrl);
        if (req.totalSeats != null) {
            int difference = req.totalSeats - e.getTotalSeats();
            e.setTotalSeats(req.totalSeats);
            e.setAvailableSeats(e.getAvailableSeats() + difference);
        }

        repo.save(e);
        evictCache();
        return Map.of("id", e.getId());
    }

    @Transactional
    public void delete(Long id) {
        repo.deleteById(id);
        evictCache();
    }

    @Transactional
    public void deductSeats(Long id, int count) {
        Event event = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));
        if (event.getAvailableSeats() < count) {
            throw new RuntimeException("Not enough seats available. Requested: "
                    + count + ", Available: " + event.getAvailableSeats());
        }
        event.setAvailableSeats(event.getAvailableSeats() - count);
        repo.save(event);
        evictCache();
    }

    @Transactional
    public void addSeats(Long id, int count) {
        Event event = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));
        event.setAvailableSeats(event.getAvailableSeats() + count);
        repo.save(event);
        evictCache();
    }

    private EventResponse toResponse(Event e) {
        return new EventResponse(
                e.getId(), e.getTitle(), e.getDescription(), e.getLocation(),
                e.getStartTime(), e.getEndTime(), e.getPrice(),
                e.getAvailableSeats(), e.getTotalSeats(), e.getImageUrl()
        );
    }
}
