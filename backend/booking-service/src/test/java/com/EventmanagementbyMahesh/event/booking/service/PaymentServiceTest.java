package com.EventmanagementbyMahesh.event.booking.service;

import com.EventmanagementbyMahesh.event.booking.dto.*;
import com.EventmanagementbyMahesh.event.booking.entity.Payment;
import com.EventmanagementbyMahesh.event.booking.entity.PaymentStatus;
import com.EventmanagementbyMahesh.event.booking.repository.PaymentRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import org.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private RazorpayClient razorpayClient;
    @Mock
    private PaymentRepository paymentRepo;
    @Mock
    private BookingService bookingService;
    @Mock
    private RabbitTemplate rabbitTemplate;
    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(paymentService, "razorpayKeyId", "rzp_test_123");
        ReflectionTestUtils.setField(paymentService, "razorpayKeySecret", "secret123");
        ReflectionTestUtils.setField(paymentService, "razorpayWebhookSecret", "webhook123");
        ReflectionTestUtils.setField(paymentService, "currency", "INR");
        ReflectionTestUtils.setField(paymentService, "authServiceUrl", "http://auth-service:8081");
    }

    @Test
    void createOrder_Success() throws Exception {
        // Arrange
        String userEmail = "test@example.com";
        CreateOrderRequest req = new CreateOrderRequest();
        req.eventId = 1L;
        req.ticketCount = 2;

        UserDto mockUser = new UserDto();
        mockUser.setEmail(userEmail);
        mockUser.setName("Test User");
        when(restTemplate.getForObject(anyString(), eq(UserDto.class))).thenReturn(mockUser);

        BookingResponse mockBooking = new BookingResponse();
        mockBooking.bookingId = 100L;
        mockBooking.eventPrice = 500.0;
        when(bookingService.createPendingBooking(eq(userEmail), any())).thenReturn(mockBooking);

        // Mock Razorpay Order
        Order mockOrder = mock(Order.class);
        when(mockOrder.get("id")).thenReturn("order_12345");
        
        // Need to deep mock razorpayClient.orders.create()
        // RazorpayClient has a public 'orders' field of type OrderClient
        com.razorpay.OrderClient mockOrderClient = mock(com.razorpay.OrderClient.class);
        ReflectionTestUtils.setField(razorpayClient, "orders", mockOrderClient);
        when(mockOrderClient.create(any(JSONObject.class))).thenReturn(mockOrder);

        // Act
        CreateOrderResponse res = paymentService.createOrder(userEmail, req);

        // Assert
        assertNotNull(res);
        assertEquals("order_12345", res.razorpayOrderId);
        // (500 * 2 * 100) + 15000 = 115000 paise
        assertEquals(115000L, res.amount);
        assertEquals("INR", res.currency);
        
        verify(paymentRepo, times(1)).save(any(Payment.class));
    }

    @Test
    void verifyPayment_InvalidSignature_ThrowsException() {
        // Arrange
        String userEmail = "test@example.com";
        VerifyPaymentRequest req = new VerifyPaymentRequest();
        req.razorpayOrderId = "order_123";
        req.razorpayPaymentId = "pay_123";
        req.razorpaySignature = "invalid_signature";

        Payment mockPayment = new Payment();
        mockPayment.setBookingId(100L);
        mockPayment.setStatus(PaymentStatus.PENDING);
        mockPayment.setAmount(1000L);
        mockPayment.setCurrency("INR");
        mockPayment.setUserEmail(userEmail);
        mockPayment.setRazorpayOrderId("order_123");
        when(paymentRepo.findByRazorpayOrderId("order_123")).thenReturn(Optional.of(mockPayment));

        // Act & Assert
        assertThrows(SecurityException.class, () -> paymentService.verifyPayment(userEmail, req));
        
        verify(paymentRepo, times(1)).save(mockPayment); // Saves as FAILED
        verify(bookingService, times(1)).cancelBooking(100L);
    }
}
