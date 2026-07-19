package com.EventmanagementbyMahesh.event.booking.controller;

import com.EventmanagementbyMahesh.event.booking.dto.RevenueResponse;
import com.EventmanagementbyMahesh.event.booking.entity.Booking;
import com.EventmanagementbyMahesh.event.booking.entity.BookingStatus;
import com.EventmanagementbyMahesh.event.booking.repository.BookingRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AnalyticsController.class)
@AutoConfigureMockMvc(addFilters = false) // Disable security filters for pure controller test
public class AnalyticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BookingRepository bookingRepository;

    @MockBean
    private RestTemplate restTemplate;

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetTrafficAnalytics_Success() throws Exception {
        // Mock auth service response
        Map<String, Object> authResponse = new HashMap<>();
        authResponse.put("totalUsers", 100L);
        authResponse.put("activeUsersCount", 10L);
        Mockito.when(restTemplate.getForObject(anyString(), any())).thenReturn(authResponse);

        // Mock bookings
        Booking b1 = new Booking();
        b1.setEventId(101L); b1.setEventTitle("Event A"); b1.setEventPrice(50.0); b1.setTicketCount(2); b1.setStatus(BookingStatus.CONFIRMED);
        Booking b2 = new Booking();
        b2.setEventId(102L); b2.setEventTitle("Event B"); b2.setEventPrice(100.0); b2.setTicketCount(1); b2.setStatus(BookingStatus.CONFIRMED);
        Booking b3 = new Booking();
        b3.setEventId(101L); b3.setEventTitle("Event A"); b3.setEventPrice(50.0); b3.setTicketCount(3); b3.setStatus(BookingStatus.CANCELLED);

        Mockito.when(bookingRepository.findAll()).thenReturn(Arrays.asList(b1, b2, b3));

        mockMvc.perform(get("/admin/analytics/traffic")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUsers").value(100))
                .andExpect(jsonPath("$.activeUsersCount").value(10))
                .andExpect(jsonPath("$.totalRevenue").value(200.0)) // (50*2) + (100*1)
                .andExpect(jsonPath("$.topEvents[0].title").value("Event A"))
                .andExpect(jsonPath("$.topEvents[0].ticketsSold").value(2))
                .andExpect(jsonPath("$.topEvents[0].revenue").value(100.0));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetTrafficAnalytics_AuthServiceDown_Fallback() throws Exception {
        // Mock auth service failure
        Mockito.when(restTemplate.getForObject(anyString(), any())).thenThrow(new RuntimeException("Connection refused"));

        // Mock bookings empty
        Mockito.when(bookingRepository.findAll()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/analytics/traffic")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUsers").value(0))
                .andExpect(jsonPath("$.activeUsersCount").value(0))
                .andExpect(jsonPath("$.totalRevenue").value(0.0));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetRevenueAnalytics() throws Exception {
        RevenueResponse r1 = new RevenueResponse(101L, "Event A", 4L, 200.0);
        Mockito.when(bookingRepository.calculateRevenueByEvent()).thenReturn(Arrays.asList(r1));

        mockMvc.perform(get("/admin/analytics/revenue")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].eventId").value(101))
                .andExpect(jsonPath("$.data[0].totalRevenue").value(200.0));
    }
}
