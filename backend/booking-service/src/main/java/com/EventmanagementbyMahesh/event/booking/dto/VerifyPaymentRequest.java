package com.EventmanagementbyMahesh.event.booking.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Payload sent by frontend after user completes Razorpay payment")
public class VerifyPaymentRequest {

    @NotBlank(message = "Razorpay Order ID is required")
    @Schema(description = "Razorpay Order ID", example = "order_XXXXXXXXXXXXXXXX")
    public String razorpayOrderId;

    @NotBlank(message = "Razorpay Payment ID is required")
    @Schema(description = "Razorpay Payment ID from success handler", example = "pay_XXXXXXXXXXXXXXXX")
    public String razorpayPaymentId;

    @NotBlank(message = "Razorpay Signature is required")
    @Schema(description = "HMAC-SHA256 signature from Razorpay success handler")
    public String razorpaySignature;
}
