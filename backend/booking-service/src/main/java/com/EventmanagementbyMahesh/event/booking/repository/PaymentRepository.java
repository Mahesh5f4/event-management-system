package com.EventmanagementbyMahesh.event.booking.repository;

import com.EventmanagementbyMahesh.event.booking.entity.Payment;
import com.EventmanagementbyMahesh.event.booking.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);

    Optional<Payment> findByBookingId(Long bookingId);

    List<Payment> findByUserEmailOrderByCreatedAtDesc(String userEmail);

    boolean existsByRazorpayOrderIdAndStatus(String razorpayOrderId, PaymentStatus status);
}
