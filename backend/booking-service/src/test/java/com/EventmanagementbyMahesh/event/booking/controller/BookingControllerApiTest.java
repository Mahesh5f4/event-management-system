package com.EventmanagementbyMahesh.event.booking.controller;

import com.EventmanagementbyMahesh.event.booking.dto.BookingRequest;
import com.EventmanagementbyMahesh.event.booking.dto.BookingResponse;
import com.EventmanagementbyMahesh.event.booking.service.BookingService;
import com.EventmanagementbyMahesh.event.common.security.RateLimiterService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BookingController.class)
public class BookingControllerApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private BookingService bookingService;

    @MockBean
    private RateLimiterService rateLimiterService;

    @MockBean
    private com.EventmanagementbyMahesh.event.booking.repository.BookingRepository bookingRepository;

    @MockBean
    private org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate;

    @MockBean
    private org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

    @MockBean
    private com.EventmanagementbyMahesh.event.booking.service.PdfTicketService pdfTicketService;

    @Test
    @WithMockUser(username = "user@example.com")
    void bookTickets_Success() throws Exception {
        BookingRequest req = new BookingRequest();
        req.eventId = 1L;
        req.ticketCount = 2;
        req.seats = List.of("A1", "A2");

        when(rateLimiterService.isAllowed(anyString(), anyInt(), anyInt())).thenReturn(true);
        when(bookingService.bookTickets(anyString(), any(BookingRequest.class)))
                .thenReturn(new BookingResponse(1L, 1L, "Test Event", "Test Arena", "2024-01-01T10:00:00", 100.0, 1L, "user@example.com", 2, List.of("A1", "A2"), "CONFIRMED"));

        org.springframework.data.redis.core.ValueOperations<String, String> valueOps = org.mockito.Mockito.mock(org.springframework.data.redis.core.ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);

        mockMvc.perform(post("/bookings")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockUser(username = "user@example.com")
    void bookTickets_RateLimited() throws Exception {
        BookingRequest req = new BookingRequest();
        req.eventId = 1L;
        req.ticketCount = 2;

        when(rateLimiterService.isAllowed(anyString(), anyInt(), anyInt())).thenReturn(false);

        mockMvc.perform(post("/bookings")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Too many booking attempts. Please wait a minute."));
    }

    @Test
    @WithMockUser(username = "user@example.com")
    void bookTickets_ValidationFailure_NegativeTickets() throws Exception {
        BookingRequest req = new BookingRequest();
        req.eventId = 1L;
        req.ticketCount = -1; // Invalid

        when(rateLimiterService.isAllowed(anyString(), anyInt(), anyInt())).thenReturn(true);

        mockMvc.perform(post("/bookings")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.validationErrors.ticketCount").value("At least 1 ticket must be booked"));
    }

    @Test
    void bookTickets_Unauthorized() throws Exception {
        BookingRequest req = new BookingRequest();
        req.eventId = 1L;
        req.ticketCount = 1;

        mockMvc.perform(post("/bookings")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }
}
