package com.EventmanagementbyMahesh.event.booking.integration;

import com.EventmanagementbyMahesh.event.booking.consumer.BookingConsumer;
import com.EventmanagementbyMahesh.event.booking.dto.BookingMessage;
import com.EventmanagementbyMahesh.event.booking.dto.BookingRequest;
import com.EventmanagementbyMahesh.event.booking.dto.EventResponse;
import com.EventmanagementbyMahesh.event.booking.dto.UserDto;
import com.EventmanagementbyMahesh.event.booking.entity.Booking;
import com.EventmanagementbyMahesh.event.booking.entity.BookingStatus;
import com.EventmanagementbyMahesh.event.booking.repository.BookingRepository;
import com.EventmanagementbyMahesh.event.common.metrics.BookingMetrics;
import com.EventmanagementbyMahesh.event.common.service.EmailService;
import com.EventmanagementbyMahesh.event.common.security.RateLimiterService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.listener.RabbitListenerContainerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(
        properties = {
                "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.amqp.RabbitAutoConfiguration",
                "spring.cache.type=none",
                "spring.main.allow-bean-definition-overriding=true",
                "AUTH_SERVICE_URL=http://localhost:8081",
                "EVENT_SERVICE_URL=http://localhost:8082"
        }
)
@AutoConfigureMockMvc
public class BookingFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BookingConsumer bookingConsumer;

    @MockBean
    private BookingRepository bookingRepo;

    @MockBean
    private StringRedisTemplate redisTemplate;

    @MockBean
    private ValueOperations<String, String> valueOperations;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    @MockBean
    private RateLimiterService rateLimiter;

    @MockBean
    private RestTemplate restTemplate;

    @MockBean
    private BookingMetrics bookingMetrics;

    @MockBean
    private EmailService emailService;

    @MockBean
    private ConnectionFactory connectionFactory;

    @MockBean
    private RabbitListenerContainerFactory<?> rabbitListenerContainerFactory;

    private final Map<String, String> redisMockStore = new HashMap<>();

    @BeforeEach
    void setUp() {
        redisMockStore.clear();

        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        doAnswer(invocation -> {
            String key = invocation.getArgument(0);
            String val = invocation.getArgument(1);
            redisMockStore.put(key, val);
            return null;
        }).when(valueOperations).set(anyString(), anyString());

        doAnswer(invocation -> {
            String key = invocation.getArgument(0);
            String val = invocation.getArgument(1);
            redisMockStore.put(key, val);
            return null;
        }).when(valueOperations).set(anyString(), anyString(), any(Duration.class));

        when(valueOperations.get(anyString())).thenAnswer(invocation -> {
            String key = invocation.getArgument(0);
            return redisMockStore.get(key);
        });

        when(rateLimiter.isAllowed(anyString(), anyInt(), anyInt())).thenReturn(true);
    }

    @Test
    @WithMockUser(username = "user@example.com", roles = {"USER"})
    void testEndToEndBookingFlow() throws Exception {
        // 1. Submit a Booking Request via POST /bookings
        String requestJson = "{\"eventId\":1,\"ticketCount\":2,\"seats\":[\"A1\",\"A2\"]}";

        MvcResult postResult = mockMvc.perform(post("/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.bookingId").exists())
                .andReturn();

        String responseBody = postResult.getResponse().getContentAsString();
        String correlationId = responseBody.split("\"bookingId\":\"")[1].split("\"")[0];
        assertTrue(correlationId.length() > 0);

        assertEquals("PENDING", redisMockStore.get("booking_status:" + correlationId));

        verify(rabbitTemplate, times(1)).convertAndSend(anyString(), anyString(), any(BookingMessage.class));

        // 2. Fetch Status before consumption -> Expect PENDING
        mockMvc.perform(get("/bookings/status/" + correlationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.message").value(""));

        // 3. Simulate consumer processing the message
        UserDto userDto = new UserDto();
        userDto.setId(42L);
        userDto.setEmail("user@example.com");
        userDto.setName("User Name");
        when(restTemplate.getForObject(contains("/users/by-email"), eq(UserDto.class))).thenReturn(userDto);

        EventResponse eventResponse = new EventResponse();
        eventResponse.setId(1L);
        eventResponse.setTitle("Concert");
        eventResponse.setAvailableSeats(10);
        eventResponse.setPrice(100.0);
        eventResponse.setStartTime(LocalDateTime.now().plusDays(1));
        eventResponse.setLocation("Arena");
        when(restTemplate.getForObject(contains("/api/events/internal/"), eq(EventResponse.class))).thenReturn(eventResponse);

        when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);

        long generatedBookingId = 999L;
        Booking booking = new Booking();
        booking.setEventId(1L);
        booking.setUserId(42L);
        booking.setUserEmail("user@example.com");
        booking.setTicketCount(2);
        booking.setSeats("A1,A2");
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setEventTitle("Concert");
        booking.setEventLocation("Arena");
        booking.setEventTime(LocalDateTime.now().plusDays(1).toString());
        booking.setEventPrice(100.0);
        org.springframework.test.util.ReflectionTestUtils.setField(booking, "id", generatedBookingId);
        when(bookingRepo.save(any(Booking.class))).thenReturn(booking);

        BookingRequest req = new BookingRequest();
        req.eventId = 1L;
        req.ticketCount = 2;
        req.seats = List.of("A1", "A2");
        BookingMessage bookingMessage = new BookingMessage("user@example.com", req);
        org.springframework.test.util.ReflectionTestUtils.setField(bookingMessage, "correlationId", correlationId);

        bookingConsumer.consume(bookingMessage);

        // 4. Fetch Status after consumption -> Expect COMPLETED with booking ID 999
        mockMvc.perform(get("/bookings/status/" + correlationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.id").value("999"));

        // 5. Download ticket -> Expect PDF content type
        when(bookingRepo.findById(generatedBookingId)).thenReturn(Optional.of(booking));
        mockMvc.perform(get("/bookings/" + generatedBookingId + "/ticket"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=ticket-999.pdf"))
                .andExpect(content().contentType(MediaType.APPLICATION_PDF));
    }
}
