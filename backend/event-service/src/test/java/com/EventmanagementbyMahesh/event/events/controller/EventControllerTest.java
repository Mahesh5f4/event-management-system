package com.EventmanagementbyMahesh.event.events.controller;

import com.EventmanagementbyMahesh.event.events.dto.CreateEventRequest;
import com.EventmanagementbyMahesh.event.events.dto.EventResponse;
import com.EventmanagementbyMahesh.event.events.dto.UpdateEventRequest;
import com.EventmanagementbyMahesh.event.events.service.EventService;
import com.EventmanagementbyMahesh.event.events.service.MLRecommendationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(EventController.class)
@AutoConfigureMockMvc(addFilters = false) // Bypass security filters for unit testing controllers
class EventControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private EventService eventService;

    @MockBean
    private MLRecommendationService recommendationService;

    private EventResponse mockResponse;

    @BeforeEach
    void setUp() {
        mockResponse = new EventResponse(
                1L, "Tech Conf", "Description", "New York",
                LocalDateTime.now(), LocalDateTime.now().plusDays(1),
                100.0, 100, 100, "image.png"
        );
    }

    @Test
    void getRecommendations_ReturnsList() throws Exception {
        when(recommendationService.getRecommendations(1L)).thenReturn(List.of(mockResponse));

        mockMvc.perform(get("/events/1/recommendations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title").value("Tech Conf"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void create_ReturnsEvent() throws Exception {
        CreateEventRequest req = new CreateEventRequest();
        req.title = "Tech Conf";

        when(eventService.create(any())).thenReturn(mockResponse);

        mockMvc.perform(post("/events")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Tech Conf"));
    }

    @Test
    void getAll_ReturnsPage() throws Exception {
        when(eventService.getAll(0, 10)).thenReturn(new PageImpl<>(List.of(mockResponse)));

        mockMvc.perform(get("/events?page=0&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].title").value("Tech Conf"));
    }

    @Test
    void getById_ReturnsEvent() throws Exception {
        when(eventService.getById(1L)).thenReturn(mockResponse);

        mockMvc.perform(get("/events/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Tech Conf"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void update_ReturnsMap() throws Exception {
        UpdateEventRequest req = new UpdateEventRequest();
        req.title = "Updated Conf";

        when(eventService.update(eq(1L), any())).thenReturn(Map.of("id", 1L));

        mockMvc.perform(patch("/events/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void delete_ReturnsOk() throws Exception {
        doNothing().when(eventService).delete(1L);

        mockMvc.perform(delete("/events/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Event deleted successfully"));
    }

    @Test
    void deductSeats_ReturnsOk() throws Exception {
        doNothing().when(eventService).deductSeats(1L, 2);

        mockMvc.perform(put("/events/internal/1/deduct-seats?count=2"))
                .andExpect(status().isOk());
    }

    @Test
    void addSeats_ReturnsOk() throws Exception {
        doNothing().when(eventService).addSeats(1L, 2);

        mockMvc.perform(put("/events/internal/1/add-seats?count=2"))
                .andExpect(status().isOk());
    }

    @Test
    void getInternalById_ReturnsEventDirectly() throws Exception {
        when(eventService.getById(1L)).thenReturn(mockResponse);

        mockMvc.perform(get("/events/internal/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Tech Conf"));
    }
}
