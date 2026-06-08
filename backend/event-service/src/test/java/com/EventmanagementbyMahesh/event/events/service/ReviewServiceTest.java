package com.EventmanagementbyMahesh.event.events.service;

import com.EventmanagementbyMahesh.event.events.dto.ReviewRequest;
import com.EventmanagementbyMahesh.event.events.dto.ReviewResponse;
import com.EventmanagementbyMahesh.event.events.dto.UserDto;
import com.EventmanagementbyMahesh.event.events.entity.Event;
import com.EventmanagementbyMahesh.event.events.entity.Review;
import com.EventmanagementbyMahesh.event.events.exception.ReviewException;
import com.EventmanagementbyMahesh.event.events.repository.EventRepository;
import com.EventmanagementbyMahesh.event.events.repository.ReviewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock
    private ReviewRepository reviewRepository;
    
    @Mock
    private EventRepository eventRepository;

    @InjectMocks
    private ReviewService reviewService;

    private Event event;
    private UserDto user;

    @BeforeEach
    void setUp() {
        event = new Event();
        event.setId(1L);
        event.setAverageRating(0.0);
        event.setReviewCount(0);

        user = new UserDto(1L, "user@example.com", "User Name", "avatar.png");
    }

    @Test
    void addReview_Success() {
        ReviewRequest request = new ReviewRequest();
        request.setRating(5);
        request.setComment("Great event!");

        Review review = Review.builder()
                .id(1L).event(event).userId(user.getId()).userName(user.getName())
                .rating(5).comment("Great event!")
                .build();

        when(eventRepository.findById(1L)).thenReturn(Optional.of(event));
        when(reviewRepository.existsByEventIdAndUserId(1L, 1L)).thenReturn(false);
        when(reviewRepository.save(any(Review.class))).thenReturn(review);
        when(reviewRepository.getAverageRatingByEventId(1L)).thenReturn(5.0);
        when(reviewRepository.getReviewCountByEventId(1L)).thenReturn(1L);

        ReviewResponse response = reviewService.addReview(1L, user, request);

        assertNotNull(response);
        assertEquals(5, response.getRating());
        assertEquals(5.0, event.getAverageRating());
        assertEquals(1, event.getReviewCount());
        verify(eventRepository).save(event);
    }

    @Test
    void addReview_EventNotFound_ThrowsException() {
        when(eventRepository.findById(1L)).thenReturn(Optional.empty());

        ReviewException ex = assertThrows(ReviewException.class, 
            () -> reviewService.addReview(1L, user, new ReviewRequest()));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
    }

    @Test
    void addReview_DuplicateReview_ThrowsException() {
        when(eventRepository.findById(1L)).thenReturn(Optional.of(event));
        when(reviewRepository.existsByEventIdAndUserId(1L, 1L)).thenReturn(true);

        ReviewException ex = assertThrows(ReviewException.class, 
            () -> reviewService.addReview(1L, user, new ReviewRequest()));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    void addReview_NullAverages_HandledGracefully() {
        ReviewRequest request = new ReviewRequest();
        request.setRating(4);

        Review review = Review.builder().id(1L).build();

        when(eventRepository.findById(1L)).thenReturn(Optional.of(event));
        when(reviewRepository.existsByEventIdAndUserId(1L, 1L)).thenReturn(false);
        when(reviewRepository.save(any(Review.class))).thenReturn(review);
        when(reviewRepository.getAverageRatingByEventId(1L)).thenReturn(null);
        when(reviewRepository.getReviewCountByEventId(1L)).thenReturn(null);

        reviewService.addReview(1L, user, request);

        assertEquals(0.0, event.getAverageRating());
        assertEquals(0, event.getReviewCount());
    }

    @Test
    void getEventReviews_Success() {
        Review review = Review.builder()
            .id(1L).userName(null).rating(5).comment("Nice").build();

        when(reviewRepository.findByEventIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(review));

        List<ReviewResponse> responses = reviewService.getEventReviews(1L);

        assertEquals(1, responses.size());
        assertEquals("Anonymous", responses.get(0).getUserName()); // Fallback logic check
    }
}
