package com.EventmanagementbyMahesh.event.booking.controller;

import com.EventmanagementbyMahesh.event.booking.config.SecurityConfig;
import com.EventmanagementbyMahesh.event.booking.dto.BookingRequest;
import com.EventmanagementbyMahesh.event.booking.dto.BookingResponse;
import com.EventmanagementbyMahesh.event.booking.entity.Booking;
import com.EventmanagementbyMahesh.event.booking.entity.BookingStatus;
import com.EventmanagementbyMahesh.event.booking.repository.BookingRepository;
import com.EventmanagementbyMahesh.event.booking.service.BookingService;
import com.EventmanagementbyMahesh.event.booking.service.PdfTicketService;
import com.EventmanagementbyMahesh.event.common.security.JwtUtil;
import com.EventmanagementbyMahesh.event.common.security.RateLimiterService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BookingController.class)
@Import(SecurityConfig.class)
class BookingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private BookingService bookingService;

    @MockBean
    private BookingRepository bookingRepository;

    @MockBean
    private RateLimiterService rateLimiterService;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    @MockBean
    private StringRedisTemplate redisTemplate;

    @MockBean
    private ValueOperations<String, String> valueOperations;

    @MockBean
    private PdfTicketService pdfTicketService;

    @MockBean
    private JwtUtil jwtUtil; // Required by SecurityConfig

    @Test
    @WithMockUser(username = "user@example.com")
    void bookTicketsAcceptedAndQueued() throws Exception {
        BookingRequest request = new BookingRequest();
        request.eventId = 1L;
        request.ticketCount = 2;
        request.seats = List.of("A1", "A2");

        when(rateLimiterService.isAllowed(eq("booking:user@example.com"), anyInt(), anyInt())).thenReturn(true);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        mockMvc.perform(post("/bookings")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("PENDING"));

        verify(rabbitTemplate).convertAndSend(anyString(), anyString(), any(Object.class));
    }

    @Test
    @WithMockUser(username = "user@example.com")
    void bookTicketsBlockedByRateLimiter() throws Exception {
        BookingRequest request = new BookingRequest();
        request.eventId = 1L;
        request.ticketCount = 2;

        when(rateLimiterService.isAllowed(eq("booking:user@example.com"), anyInt(), anyInt())).thenReturn(false);

        mockMvc.perform(post("/bookings")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void getBookingStatusSuccessfully() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("booking_status:corr-123")).thenReturn("CONFIRMED");
        when(valueOperations.get("booking_id:corr-123")).thenReturn("99");

        mockMvc.perform(get("/bookings/status/corr-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.data.id").value("99"));
    }

    @Test
    void getBookingStatusNotFound() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("booking_status:corr-999")).thenReturn(null);

        mockMvc.perform(get("/bookings/status/corr-999"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "user@example.com")
    void getMyBookingsSuccessfully() throws Exception {
        BookingResponse bookingResponse = new BookingResponse(100L, 1L, "Concert", "Hall A",
                "2026-06-08T18:00", 500.0, 10L, "user@example.com", 2, List.of("A1", "A2"), "CONFIRMED");

        when(bookingService.getMyBookings(eq("user@example.com"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(bookingResponse)));

        mockMvc.perform(get("/bookings")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].bookingId").value(100L));
    }

    @Test
    @WithMockUser(username = "user@example.com")
    void downloadTicketPdfSuccessfully() throws Exception {
        Booking booking = new Booking();
        org.springframework.test.util.ReflectionTestUtils.setField(booking, "id", 100L);
        booking.setSeats("A1,A2");

        when(bookingRepository.findById(100L)).thenReturn(Optional.of(booking));
        when(pdfTicketService.generateTicket(booking)).thenReturn(new byte[]{1, 2, 3});

        mockMvc.perform(get("/bookings/100/ticket"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", MediaType.APPLICATION_PDF_VALUE))
                .andExpect(header().string("Content-Disposition", "attachment; filename=ticket-100.pdf"));
    }
}
