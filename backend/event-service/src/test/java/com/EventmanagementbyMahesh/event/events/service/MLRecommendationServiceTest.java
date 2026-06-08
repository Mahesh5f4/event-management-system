package com.EventmanagementbyMahesh.event.events.service;

import com.EventmanagementbyMahesh.event.events.dto.EventResponse;
import com.EventmanagementbyMahesh.event.events.entity.Event;
import com.EventmanagementbyMahesh.event.events.repository.EventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MLRecommendationServiceTest {

    @Mock
    private EventRepository eventRepository;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private MLRecommendationService mlRecommendationService;

    private Event event;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(mlRecommendationService, "mlServiceUrl", "http://localhost:8001");
        ReflectionTestUtils.setField(mlRecommendationService, "restTemplate", restTemplate);

        event = new Event();
        event.setId(2L);
        event.setTitle("Recommended Event");
        event.setAverageRating(4.5);
    }

    @Test
    void getRecommendations_Success() {
        when(eventRepository.findAll()).thenReturn(List.of(event));
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class)))
                .thenReturn(Map.of("recommended_event_ids", List.of(2)));
        when(eventRepository.findById(2L)).thenReturn(Optional.of(event));

        List<EventResponse> result = mlRecommendationService.getRecommendations(1L);

        assertEquals(1, result.size());
        assertEquals("Recommended Event", result.get(0).title);
    }

    @Test
    void getRecommendations_NullResponse_ReturnsEmpty() {
        when(eventRepository.findAll()).thenReturn(List.of(event));
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class))).thenReturn(null);

        List<EventResponse> result = mlRecommendationService.getRecommendations(1L);

        assertTrue(result.isEmpty());
    }

    @Test
    void getRecommendations_NoRecommendedIds_ReturnsEmpty() {
        when(eventRepository.findAll()).thenReturn(List.of(event));
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class))).thenReturn(Map.of());

        List<EventResponse> result = mlRecommendationService.getRecommendations(1L);

        assertTrue(result.isEmpty());
    }

    @Test
    void getRecommendations_ExceptionThrown_ReturnsEmpty() {
        when(eventRepository.findAll()).thenThrow(new RuntimeException("DB Error"));

        List<EventResponse> result = mlRecommendationService.getRecommendations(1L);

        assertTrue(result.isEmpty());
    }

    @Test
    void getRecommendations_EntityNotFound_IgnoresMissing() {
        when(eventRepository.findAll()).thenReturn(List.of(event));
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class)))
                .thenReturn(Map.of("recommended_event_ids", List.of(99))); // ID 99 doesn't exist
        when(eventRepository.findById(99L)).thenReturn(Optional.empty());

        List<EventResponse> result = mlRecommendationService.getRecommendations(1L);

        assertTrue(result.isEmpty());
    }
}
