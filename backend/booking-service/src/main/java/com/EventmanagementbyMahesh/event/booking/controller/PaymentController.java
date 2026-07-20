package com.EventmanagementbyMahesh.event.booking.controller;

import com.EventmanagementbyMahesh.event.booking.dto.*;
import com.EventmanagementbyMahesh.event.booking.service.PaymentService;
import com.EventmanagementbyMahesh.event.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for Razorpay payment operations.
 * All endpoints (except /webhook) require JWT authentication.
 * /webhook is verified by Razorpay-Signature header instead.
 */
@RestController
@RequestMapping("/payments")
@Tag(name = "Payment APIs", description = "Razorpay Test Mode integration for ticket purchases")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @Operation(
        summary = "Create Razorpay order",
        description = "Creates a Razorpay order and a PENDING booking. Returns order details for frontend Checkout."
    )
    @SecurityRequirement(name = "Bearer Authentication")
    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(
            Authentication auth,
            @Valid @RequestBody CreateOrderRequest req) {
        try {
            CreateOrderResponse response = paymentService.createOrder(auth.getName(), req);
            return ResponseEntity.ok(ApiResponse.ok(response, "Razorpay order created successfully"));
        } catch (RuntimeException e) {
            log.warn("Order creation failed for user {}: {}", auth.getName(), e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @Operation(
        summary = "Verify Razorpay payment",
        description = "Verifies HMAC-SHA256 signature from Razorpay and confirms booking. " +
                      "Never trust frontend payment status -- always verify on backend."
    )
    @SecurityRequirement(name = "Bearer Authentication")
    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(
            Authentication auth,
            @Valid @RequestBody VerifyPaymentRequest req) {
        try {
            BookingResponse booking = paymentService.verifyPayment(auth.getName(), req);
            return ResponseEntity.ok(ApiResponse.ok(booking, "Payment verified and booking confirmed"));
        } catch (SecurityException e) {
            log.error("Signature verification failed for user {}: {}", auth.getName(), e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Payment signature verification failed. Booking cancelled."));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        } catch (RuntimeException e) {
            log.error("Payment verification error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Payment verification failed. Please contact support."));
        }
    }

    @Operation(
        summary = "Razorpay webhook handler",
        description = "Receives async payment events from Razorpay. " +
                      "Verified via X-Razorpay-Signature header (not JWT). " +
                      "Configure this URL in Razorpay Dashboard > Webhooks."
    )
    @PostMapping("/webhook")
    public ResponseEntity<?> handleWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String razorpaySignature) {
        try {
            paymentService.handleWebhook(payload, razorpaySignature);
            return ResponseEntity.ok(ApiResponse.ok(null, "Webhook processed"));
        } catch (SecurityException e) {
            log.error("Webhook signature invalid");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid webhook signature"));
        } catch (Exception e) {
            log.error("Webhook processing error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Webhook processing failed"));
        }
    }

    @Operation(summary = "Get payment by ID")
    @SecurityRequirement(name = "Bearer Authentication")
    @GetMapping("/{id}")
    public ResponseEntity<?> getPayment(@PathVariable Long id) {
        try {
            PaymentResponse payment = paymentService.getPaymentById(id);
            return ResponseEntity.ok(ApiResponse.ok(payment, "Payment fetched"));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Get payment by booking ID")
    @SecurityRequirement(name = "Bearer Authentication")
    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<?> getPaymentByBooking(@PathVariable Long bookingId) {
        try {
            PaymentResponse payment = paymentService.getPaymentByBookingId(bookingId);
            return ResponseEntity.ok(ApiResponse.ok(payment, "Payment fetched"));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}