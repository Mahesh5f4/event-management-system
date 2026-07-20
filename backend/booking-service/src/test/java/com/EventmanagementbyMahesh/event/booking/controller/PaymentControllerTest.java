package com.EventmanagementbyMahesh.event.booking.controller;

import com.EventmanagementbyMahesh.event.booking.dto.BookingResponse;
import com.EventmanagementbyMahesh.event.booking.dto.CreateOrderRequest;
import com.EventmanagementbyMahesh.event.booking.dto.CreateOrderResponse;
import com.EventmanagementbyMahesh.event.booking.dto.VerifyPaymentRequest;
import com.EventmanagementbyMahesh.event.booking.service.PaymentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PaymentControllerTest {

    private MockMvc mockMvc;

    @Mock
    private PaymentService paymentService;

    @InjectMocks
    private PaymentController paymentController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(paymentController).build();
    }

    @Test
    void createOrder_Success() throws Exception {
        CreateOrderRequest req = new CreateOrderRequest();
        req.eventId = 1L;
        req.ticketCount = 2;

        CreateOrderResponse res = new CreateOrderResponse(
                "order_123", 1000L, "INR", "key_123", "Title", "Name", "test@example.com"
        );

        when(paymentService.createOrder(eq("test@example.com"), any())).thenReturn(res);

        mockMvc.perform(post("/bookings/payments/create-order")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req))
                .principal(new UsernamePasswordAuthenticationToken("test@example.com", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.razorpayOrderId").value("order_123"));
    }

    @Test
    void verifyPayment_Success() throws Exception {
        VerifyPaymentRequest req = new VerifyPaymentRequest();
        req.razorpayOrderId = "order_123";
        req.razorpayPaymentId = "pay_123";
        req.razorpaySignature = "sig_123";

        BookingResponse res = new BookingResponse();
        res.bookingId = 1L;
        res.status = "CONFIRMED";

        when(paymentService.verifyPayment(eq("test@example.com"), any())).thenReturn(res);

        mockMvc.perform(post("/bookings/payments/verify")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req))
                .principal(new UsernamePasswordAuthenticationToken("test@example.com", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"));
    }
}
