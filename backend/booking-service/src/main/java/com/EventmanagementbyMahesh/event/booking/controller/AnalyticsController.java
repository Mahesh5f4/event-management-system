package com.EventmanagementbyMahesh.event.booking.controller;

import com.EventmanagementbyMahesh.event.booking.entity.Booking;
import com.EventmanagementbyMahesh.event.booking.entity.BookingStatus;
import com.EventmanagementbyMahesh.event.booking.repository.BookingRepository;
import com.EventmanagementbyMahesh.event.booking.dto.RevenueResponse;
import com.EventmanagementbyMahesh.event.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/analytics")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Analytics APIs", description = "Admin-only endpoints for traffic, user, and revenue analytics. Requires ADMIN role.")
@SecurityRequirement(name = "Bearer Authentication")
public class AnalyticsController {

    private final BookingRepository bookingRepository;
    private final RestTemplate restTemplate;

    @Value("${AUTH_SERVICE_URL:http://localhost:8081}")
    private String authServiceUrl;

    public AnalyticsController(BookingRepository bookingRepository, RestTemplate restTemplate) {
        this.bookingRepository = bookingRepository;
        this.restTemplate = restTemplate;
    }

    @Operation(summary = "Get traffic and revenue dashboard",
            description = "Returns aggregated analytics: total users, active users (from auth-service), total revenue, and top 3 events by ticket sales.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Analytics returned successfully")
    @GetMapping("/traffic")
    public ResponseEntity<Map<String, Object>> getTrafficAnalytics() {
        String userUrl = authServiceUrl + "/api/auth/internal/users/analytics";
        Map<String, Object> userStats = null;
        try {
            userStats = restTemplate.getForObject(userUrl, Map.class);
        } catch (Exception e) {
            userStats = new HashMap<>();
            userStats.put("totalUsers", 0L);
            userStats.put("activeUsersCount", 0L);
            userStats.put("activeUsers", List.of());
        }

        List<Booking> allBookings = bookingRepository.findAll();
        long totalUsers = userStats.containsKey("totalUsers") ? ((Number) userStats.get("totalUsers")).longValue() : 0L;
        long activeUsersCount = userStats.containsKey("activeUsersCount") ? ((Number) userStats.get("activeUsersCount")).longValue() : 0L;
        Object activeUsers = userStats.getOrDefault("activeUsers", List.of());

        double totalRevenue = allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CONFIRMED)
                .mapToDouble(b -> b.getEventPrice() != null ? (b.getEventPrice() * b.getTicketCount()) : 0.0)
                .sum();

        List<Map<String, Object>> topEvents = allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CONFIRMED)
                .collect(Collectors.groupingBy(b -> b.getEventId() + ":" + b.getEventTitle(), Collectors.summingInt(Booking::getTicketCount)))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(3)
                .map(entry -> {
                    String[] parts = entry.getKey().split(":", 2);
                    String title = parts.length > 1 ? parts[1] : "Unknown Event";
                    double price = allBookings.stream()
                            .filter(b -> b.getEventId().toString().equals(parts[0]) && b.getEventPrice() != null)
                            .mapToDouble(Booking::getEventPrice).findFirst().orElse(0.0);
                    Map<String, Object> map = new HashMap<>();
                    map.put("title", title);
                    map.put("ticketsSold", entry.getValue());
                    map.put("revenue", price * entry.getValue());
                    return map;
                })
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("totalUsers", totalUsers);
        response.put("activeUsersCount", activeUsersCount);
        response.put("activeUsers", activeUsers);
        response.put("totalRevenue", totalRevenue);
        response.put("topEvents", topEvents);
        response.put("timestamp", LocalDateTime.now());
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Get revenue breakdown by event",
            description = "Returns revenue grouped by each event, including total tickets sold and revenue generated.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Revenue analytics returned successfully")
    @GetMapping("/revenue")
    public ResponseEntity<ApiResponse<List<RevenueResponse>>> getRevenueAnalytics() {
        List<RevenueResponse> data = bookingRepository.calculateRevenueByEvent();
        return ResponseEntity.ok(ApiResponse.ok(data, "Revenue analytics fetched successfully"));
    }
}
