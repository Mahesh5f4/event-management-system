package com.EventmanagementbyMahesh.event.booking.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "Full payment details")
public class PaymentResponse {

    public Long id;
    public Long bookingId;
    public String razorpayOrderId;
    public String razorpayPaymentId;
    public Long amount;
    public String currency;
    public String status;
    public String paymentMethod;
    public String userEmail;
    public Long eventId;
    public LocalDateTime createdAt;
    public LocalDateTime updatedAt;

    public PaymentResponse() {}

    public PaymentResponse(Long id, Long bookingId, String razorpayOrderId, String razorpayPaymentId,
                           Long amount, String currency, String status, String paymentMethod,
                           String userEmail, Long eventId, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.bookingId = bookingId;
        this.razorpayOrderId = razorpayOrderId;
        this.razorpayPaymentId = razorpayPaymentId;
        this.amount = amount;
        this.currency = currency;
        this.status = status;
        this.paymentMethod = paymentMethod;
        this.userEmail = userEmail;
        this.eventId = eventId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
