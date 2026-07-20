package com.EventmanagementbyMahesh.event.booking.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Razorpay order details returned to frontend to launch Checkout")
public class CreateOrderResponse {

    @Schema(description = "Razorpay Order ID", example = "order_XXXXXXXXXXXXXXXX")
    public String razorpayOrderId;

    @Schema(description = "Amount in paise (INR minor unit)", example = "50000")
    public Long amount;

    @Schema(description = "Currency code", example = "INR")
    public String currency;

    @Schema(description = "Razorpay Key ID (public) for Checkout initialization")
    public String keyId;

    @Schema(description = "Event title for Checkout modal description")
    public String eventTitle;

    @Schema(description = "User name for prefill")
    public String userName;

    @Schema(description = "User email for prefill")
    public String userEmail;

    public CreateOrderResponse() {}

    public CreateOrderResponse(String razorpayOrderId, Long amount, String currency,
                               String keyId, String eventTitle, String userName, String userEmail) {
        this.razorpayOrderId = razorpayOrderId;
        this.amount = amount;
        this.currency = currency;
        this.keyId = keyId;
        this.eventTitle = eventTitle;
        this.userName = userName;
        this.userEmail = userEmail;
    }
}
