package com.EventmanagementbyMahesh.event.events.controller;

import com.EventmanagementbyMahesh.event.common.ApiResponse;
import com.EventmanagementbyMahesh.event.events.dto.ReviewRequest;
import com.EventmanagementbyMahesh.event.events.dto.ReviewResponse;
import com.EventmanagementbyMahesh.event.events.dto.UserDto;
import com.EventmanagementbyMahesh.event.events.entity.Review;
import com.EventmanagementbyMahesh.event.events.service.ReviewService;
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
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ReviewController.class)
@AutoConfigureMockMvc(addFilters = false)
public class ReviewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ReviewService reviewService;

    @MockBean
    private RestTemplate restTemplate;

    @Test
    void testAddReview() throws Exception {
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("user1@example.com", "pass", java.util.Collections.singletonList(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER")))
        );

        UserDto userDto = new UserDto();
        userDto.setId(10L);
        userDto.setEmail("user1@example.com");

        Mockito.when(restTemplate.getForObject(anyString(), eq(UserDto.class)))
                .thenReturn(userDto);

        ReviewResponse response = new ReviewResponse(1L, "John Doe", null, 5, "Great!", null, LocalDateTime.now());

        Mockito.when(reviewService.addReview(anyLong(), any(UserDto.class), any(ReviewRequest.class)))
                .thenReturn(response);

        mockMvc.perform(post("/events/1/reviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5, \"comment\":\"Great!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.rating").value(5));
        
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    @Test
    void testGetEventReviews() throws Exception {
        ReviewResponse review1 = new ReviewResponse(1L, "John", null, 5, "Great", null, LocalDateTime.now());
        ReviewResponse review2 = new ReviewResponse(2L, "Jane", null, 4, "Good", null, LocalDateTime.now());

        Mockito.when(reviewService.getEventReviews(1L)).thenReturn(Arrays.asList(review1, review2));

        mockMvc.perform(get("/events/1/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[1].id").value(2));
    }
}
