package com.EventmanagementbyMahesh.event.booking.service;

import com.EventmanagementbyMahesh.event.booking.dto.*;
import com.EventmanagementbyMahesh.event.booking.entity.Payment;
import com.EventmanagementbyMahesh.event.booking.entity.PaymentStatus;
import com.EventmanagementbyMahesh.event.booking.repository.PaymentRepository;
import com.EventmanagementbyMahesh.event.common.config.RabbitMQConfig;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

/**
 * Core payment service integrating Razorpay Test Mode.
 *
 * Workflow:
 *   1. createOrder()    -- creates Razorpay order + PENDING booking + PENDING payment record
 *   2. verifyPayment()  -- verifies HMAC-SHA256 signature, confirms booking, fires RabbitMQ event
 *   3. handleWebhook()  -- processes async Razorpay webhook events
 *
 * Switching from Test to Live requires only changing RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET.
 */
@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
    private static final String HMAC_ALGO = "HmacSHA256";

    private final RazorpayClient razorpayClient;
    private final PaymentRepository paymentRepo;
    private final BookingService bookingService;
    private final RabbitTemplate rabbitTemplate;
    private final RestTemplate restTemplate;

    @Value("${razorpay.key-id}")
    private String razorpayKeyId;

    @Value("${razorpay.key-secret}")
    private String razorpayKeySecret;

    @Value("${razorpay.webhook-secret}")
    private String razorpayWebhookSecret;

    @Value("${razorpay.currency:INR}")
    private String currency;

    @Value("${AUTH_SERVICE_URL:http://localhost:8081}")
    private String authServiceUrl;

    public PaymentService(RazorpayClient razorpayClient,
                          PaymentRepository paymentRepo,
                          BookingService bookingService,
                          RabbitTemplate rabbitTemplate,
                          RestTemplate restTemplate) {
        this.razorpayClient = razorpayClient;
        this.paymentRepo = paymentRepo;
        this.bookingService = bookingService;
        this.rabbitTemplate = rabbitTemplate;
        this.restTemplate = restTemplate;
    }

    // CREATE ORDER

    /**
     * Step 1: Creates a Razorpay order and a PENDING booking.
     * Returns order details for frontend to launch Razorpay Checkout.
     */
    @Transactional
    public CreateOrderResponse createOrder(String userEmail, CreateOrderRequest req) {
        log.info("Creating Razorpay order for user={}, eventId={}, tickets={}",
                 userEmail, req.eventId, req.ticketCount);

        // Fetch user details for Checkout prefill
        String userUrl = authServiceUrl + "/api/auth/internal/users/by-email?email=" + userEmail;
        UserDto user;
        try {
            user = restTemplate.getForObject(userUrl, UserDto.class);
        } catch (Exception e) {
            log.error("Failed to fetch user {}: {}", userEmail, e.getMessage());
            throw new RuntimeException("User not found");
        }
        if (user == null) throw new RuntimeException("User not found");

        // Create PENDING booking (seats deducted, booking is PENDING)
        BookingRequest bookingReq = new BookingRequest();
        bookingReq.eventId = req.eventId;
        bookingReq.ticketCount = req.ticketCount;
        bookingReq.seats = req.seats;
        BookingResponse pendingBooking = bookingService.createPendingBooking(userEmail, bookingReq);

        // Calculate amount in paise (Razorpay uses minor currency unit)
        long amountInPaise = Math.round(pendingBooking.eventPrice * req.ticketCount * 100);
        // Add convenience fee: Rs 150 = 15000 paise
        amountInPaise += 15000L;

        // Create Razorpay Order
        Order razorpayOrder;
        try {
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", currency);
            orderRequest.put("receipt", "booking_" + pendingBooking.bookingId);
            orderRequest.put("notes", new JSONObject()
                    .put("bookingId", pendingBooking.bookingId)
                    .put("eventId", req.eventId)
                    .put("userEmail", userEmail));
            razorpayOrder = razorpayClient.orders.create(orderRequest);
        } catch (RazorpayException e) {
            log.error("Razorpay order creation failed for booking {}: {}", pendingBooking.bookingId, e.getMessage());
            // Roll back the pending booking on Razorpay failure
            bookingService.cancelBooking(pendingBooking.bookingId);
            throw new RuntimeException("Payment gateway error. Please try again.");
        }

        String razorpayOrderId = razorpayOrder.get("id");
        log.info("Razorpay order created: {} for booking: {}", razorpayOrderId, pendingBooking.bookingId);

        // Persist Payment record
        Payment payment = new Payment();
        payment.setRazorpayOrderId(razorpayOrderId);
        payment.setAmount(amountInPaise);
        payment.setCurrency(currency);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setUserEmail(userEmail);
        payment.setEventId(req.eventId);
        payment.setBookingId(pendingBooking.bookingId);
        paymentRepo.save(payment);

        return new CreateOrderResponse(
                razorpayOrderId,
                amountInPaise,
                currency,
                razorpayKeyId,
                pendingBooking.eventTitle,
                user.getName() != null ? user.getName() : userEmail,
                userEmail
        );
    }

    // VERIFY PAYMENT

    /**
     * Step 2: Verifies Razorpay signature and confirms the booking.
     * NEVER trust frontend payment status -- always verify HMAC on backend.
     */
    @Transactional
    public BookingResponse verifyPayment(String userEmail, VerifyPaymentRequest req) {
        log.info("Verifying payment: orderId={}, paymentId={}", req.razorpayOrderId, req.razorpayPaymentId);

        // Fetch payment record
        Payment payment = paymentRepo.findByRazorpayOrderId(req.razorpayOrderId)
                .orElseThrow(() -> new RuntimeException("Payment record not found for order: " + req.razorpayOrderId));

        // Idempotency guard -- prevent duplicate verification
        if (payment.getStatus() == PaymentStatus.PAID) {
            log.warn("Duplicate verification attempt for order: {}", req.razorpayOrderId);
            throw new IllegalStateException("Payment already verified for this order.");
        }
        if (payment.getStatus() == PaymentStatus.FAILED) {
            throw new IllegalStateException("This payment has already failed.");
        }

        // Security: verify Razorpay HMAC-SHA256 signature
        boolean signatureValid = verifySignature(req.razorpayOrderId, req.razorpayPaymentId, req.razorpaySignature);
        if (!signatureValid) {
            log.error("Invalid Razorpay signature for order: {}", req.razorpayOrderId);
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepo.save(payment);
            bookingService.cancelBooking(payment.getBookingId());
            publishPaymentEvent(RabbitMQConfig.PAYMENT_ROUTING_KEY_FAILED, buildPaymentEvent(payment, "INVALID_SIGNATURE"));
            throw new SecurityException("Payment signature verification failed. Booking cancelled.");
        }

        // Update payment record
        payment.setRazorpayPaymentId(req.razorpayPaymentId);
        payment.setRazorpaySignature(req.razorpaySignature);
        payment.setStatus(PaymentStatus.PAID);
        paymentRepo.save(payment);

        // Confirm the booking
        bookingService.confirmBooking(payment.getBookingId());
        log.info("Booking {} confirmed after payment verification", payment.getBookingId());

        // Publish payment completed event to RabbitMQ
        publishPaymentEvent(RabbitMQConfig.PAYMENT_ROUTING_KEY_COMPLETED, buildPaymentEvent(payment, "PAID"));

        // Return booking response
        BookingResponse result = new BookingResponse();
        result.bookingId = payment.getBookingId();
        result.status = "CONFIRMED";
        result.userEmail = userEmail;
        result.eventId = payment.getEventId();
        return result;
    }

    // WEBHOOK

    /**
     * Handles Razorpay webhook events.
     * Verified using RAZORPAY_WEBHOOK_SECRET (not JWT).
     */
    @Transactional
    public void handleWebhook(String payload, String razorpaySignatureHeader) {
        log.info("Received Razorpay webhook");

        if (!verifyWebhookSignature(payload, razorpaySignatureHeader)) {
            log.error("Webhook signature verification failed");
            throw new SecurityException("Invalid webhook signature");
        }

        try {
            JSONObject event = new JSONObject(payload);
            String eventType = event.getString("event");
            log.info("Razorpay webhook event type: {}", eventType);

            switch (eventType) {
                case "payment.captured" -> handlePaymentCaptured(event);
                case "payment.failed"   -> handlePaymentFailed(event);
                case "order.paid"       -> log.info("Order paid webhook received (handled via /verify)");
                default -> log.info("Unhandled webhook event type: {}", eventType);
            }
        } catch (Exception e) {
            log.error("Error processing webhook: {}", e.getMessage());
            throw new RuntimeException("Webhook processing failed: " + e.getMessage());
        }
    }

    // QUERY METHODS

    public PaymentResponse getPaymentById(Long id) {
        Payment p = paymentRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment not found: " + id));
        return toResponse(p);
    }

    public PaymentResponse getPaymentByBookingId(Long bookingId) {
        Payment p = paymentRepo.findByBookingId(bookingId)
                .orElseThrow(() -> new RuntimeException("Payment not found for booking: " + bookingId));
        return toResponse(p);
    }

    // PRIVATE HELPERS

    /**
     * Verifies HMAC-SHA256 signature for payment.
     * Formula: HMAC_SHA256(razorpayOrderId + "|" + razorpayPaymentId, keySecret)
     */
    private boolean verifySignature(String orderId, String paymentId, String receivedSignature) {
        try {
            String payload = orderId + "|" + paymentId;
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(razorpayKeySecret.getBytes(StandardCharsets.UTF_8), HMAC_ALGO));
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String computedSignature = HexFormat.of().formatHex(hash);
            return computedSignature.equals(receivedSignature);
        } catch (Exception e) {
            log.error("Signature verification error: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Verifies HMAC-SHA256 webhook signature.
     * Formula: HMAC_SHA256(webhookPayload, webhookSecret)
     */
    private boolean verifyWebhookSignature(String payload, String receivedSignature) {
        try {
            if (receivedSignature == null || receivedSignature.isBlank()) return false;
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(razorpayWebhookSecret.getBytes(StandardCharsets.UTF_8), HMAC_ALGO));
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String computedSignature = HexFormat.of().formatHex(hash);
            return computedSignature.equals(receivedSignature);
        } catch (Exception e) {
            log.error("Webhook signature verification error: {}", e.getMessage());
            return false;
        }
    }

    private void handlePaymentCaptured(JSONObject event) {
        try {
            String orderId = event.getJSONObject("payload")
                    .getJSONObject("payment").getJSONObject("entity")
                    .getString("order_id");
            paymentRepo.findByRazorpayOrderId(orderId).ifPresent(payment -> {
                if (payment.getStatus() == PaymentStatus.PENDING) {
                    payment.setStatus(PaymentStatus.PAID);
                    paymentRepo.save(payment);
                    bookingService.confirmBooking(payment.getBookingId());
                    publishPaymentEvent(RabbitMQConfig.PAYMENT_ROUTING_KEY_COMPLETED, buildPaymentEvent(payment, "PAID"));
                    log.info("Payment captured via webhook for order: {}", orderId);
                }
            });
        } catch (Exception e) {
            log.error("Error handling payment.captured webhook: {}", e.getMessage());
        }
    }

    private void handlePaymentFailed(JSONObject event) {
        try {
            String orderId = event.getJSONObject("payload")
                    .getJSONObject("payment").getJSONObject("entity")
                    .getString("order_id");
            paymentRepo.findByRazorpayOrderId(orderId).ifPresent(payment -> {
                if (payment.getStatus() == PaymentStatus.PENDING) {
                    payment.setStatus(PaymentStatus.FAILED);
                    paymentRepo.save(payment);
                    bookingService.cancelBooking(payment.getBookingId());
                    publishPaymentEvent(RabbitMQConfig.PAYMENT_ROUTING_KEY_FAILED, buildPaymentEvent(payment, "FAILED"));
                    log.info("Payment failed via webhook for order: {}", orderId);
                }
            });
        } catch (Exception e) {
            log.error("Error handling payment.failed webhook: {}", e.getMessage());
        }
    }

    private Map<String, Object> buildPaymentEvent(Payment payment, String eventStatus) {
        return Map.of(
            "paymentId",       payment.getId() != null ? payment.getId() : 0L,
            "bookingId",       payment.getBookingId() != null ? payment.getBookingId() : 0L,
            "razorpayOrderId", payment.getRazorpayOrderId(),
            "amount",          payment.getAmount(),
            "currency",        payment.getCurrency(),
            "status",          eventStatus,
            "userEmail",       payment.getUserEmail(),
            "eventId",         payment.getEventId() != null ? payment.getEventId() : 0L
        );
    }

    private void publishPaymentEvent(String routingKey, Map<String, Object> payload) {
        try {
            rabbitTemplate.convertAndSend(RabbitMQConfig.PAYMENT_EXCHANGE, routingKey, payload);
            log.info("Published payment event [{}] to RabbitMQ", routingKey);
        } catch (Exception e) {
            log.error("Failed to publish payment event: {}", e.getMessage());
        }
    }

    private PaymentResponse toResponse(Payment p) {
        return new PaymentResponse(
            p.getId(), p.getBookingId(), p.getRazorpayOrderId(), p.getRazorpayPaymentId(),
            p.getAmount(), p.getCurrency(), p.getStatus().name(), p.getPaymentMethod(),
            p.getUserEmail(), p.getEventId(), p.getCreatedAt(), p.getUpdatedAt()
        );
    }
}