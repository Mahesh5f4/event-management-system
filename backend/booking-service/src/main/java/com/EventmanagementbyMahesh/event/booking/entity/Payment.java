package com.EventmanagementbyMahesh.event.booking.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Represents a Razorpay payment record tied to a booking.
 * Stores all Razorpay identifiers and signature for audit/verification.
 */
@Entity
@Table(name = "payments", indexes = {
        @Index(name = "idx_payment_razorpay_order", columnList = "razorpay_order_id"),
        @Index(name = "idx_payment_booking", columnList = "booking_id"),
        @Index(name = "idx_payment_status", columnList = "status")
})
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The confirmed booking ID (set after payment verification). */
    @Column(name = "booking_id")
    private Long bookingId;

    /** Razorpay Order ID returned on order creation (e.g. order_XXXXXXXX). */
    @Column(name = "razorpay_order_id", nullable = false, unique = true)
    private String razorpayOrderId;

    /** Razorpay Payment ID returned after user completes payment (e.g. pay_XXXXXXXX). */
    @Column(name = "razorpay_payment_id")
    private String razorpayPaymentId;

    /** HMAC-SHA256 signature sent by Razorpay for verification. */
    @Column(name = "razorpay_signature")
    private String razorpaySignature;

    /** Amount in paise (INR minor unit). */
    @Column(nullable = false)
    private Long amount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    /** Payment method (card, upi, netbanking, wallet, etc.) -- populated after verification. */
    @Column(name = "payment_method")
    private String paymentMethod;

    /** Snapshot: user email at time of order creation. */
    @Column(name = "user_email")
    private String userEmail;

    /** Snapshot: event ID for which payment was made. */
    @Column(name = "event_id")
    private Long eventId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = PaymentStatus.PENDING;
        }
        if (this.currency == null) {
            this.currency = "INR";
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }
    public String getRazorpayOrderId() { return razorpayOrderId; }
    public void setRazorpayOrderId(String razorpayOrderId) { this.razorpayOrderId = razorpayOrderId; }
    public String getRazorpayPaymentId() { return razorpayPaymentId; }
    public void setRazorpayPaymentId(String razorpayPaymentId) { this.razorpayPaymentId = razorpayPaymentId; }
    public String getRazorpaySignature() { return razorpaySignature; }
    public void setRazorpaySignature(String razorpaySignature) { this.razorpaySignature = razorpaySignature; }
    public Long getAmount() { return amount; }
    public void setAmount(Long amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public PaymentStatus getStatus() { return status; }
    public void setStatus(PaymentStatus status) { this.status = status; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}