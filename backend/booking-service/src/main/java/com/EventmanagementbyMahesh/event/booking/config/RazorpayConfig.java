package com.EventmanagementbyMahesh.event.booking.config;

import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Razorpay client configuration.
 * Credentials are injected from environment variables -- never hardcoded.
 * Switching from test to live requires only changing RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.
 */
@Configuration
public class RazorpayConfig {

    private static final Logger log = LoggerFactory.getLogger(RazorpayConfig.class);

    @Value("${razorpay.key-id}")
    private String keyId;

    @Value("${razorpay.key-secret}")
    private String keySecret;

    @Bean
    public RazorpayClient razorpayClient() {
        try {
            log.info("Initializing Razorpay client (key prefix: {}...)",
                     keyId != null && keyId.length() > 8 ? keyId.substring(0, 8) : "N/A");
            return new RazorpayClient(keyId, keySecret);
        } catch (RazorpayException e) {
            log.error("Failed to initialize Razorpay client: {}", e.getMessage());
            throw new IllegalStateException("Razorpay client initialization failed. " +
                    "Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.", e);
        }
    }
}