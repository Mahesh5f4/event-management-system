package com.EventmanagementbyMahesh.event.booking.controller;

import com.EventmanagementbyMahesh.event.booking.service.SeatLockService;
import com.EventmanagementbyMahesh.event.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/seats")
@Tag(name = "Seat Lock APIs", description = "Distributed, Redis-backed seat locking via HTTP REST and WebSocket. Prevents double-booking of seats during checkout.")
@SecurityRequirement(name = "Bearer Authentication")
public class SeatLockController {

    private final SeatLockService seatLockService;
    private final SimpMessagingTemplate messagingTemplate;

    public SeatLockController(SeatLockService seatLockService, SimpMessagingTemplate messagingTemplate) {
        this.seatLockService = seatLockService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/register/{eventId}/{userId}")
    public void registerSession(@DestinationVariable Long eventId,
                                @DestinationVariable String userId,
                                SimpMessageHeaderAccessor headerAccessor) {
        headerAccessor.getSessionAttributes().put("eventId", eventId);
        headerAccessor.getSessionAttributes().put("userId", userId);
    }

    @Operation(summary = "Lock a seat",
            description = "Atomically locks a specific seat for an event for 5 minutes using Redis SETNX. Returns 409 if the seat is already locked by another user.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Seat locked successfully for 5 minutes"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Seat is already being held by another user")
    })
    @PostMapping("/{eventId}/lock")
    public ResponseEntity<ApiResponse<Boolean>> lockSeat(
            Authentication auth,
            @Parameter(description = "Event ID") @PathVariable Long eventId,
            @RequestBody Map<String, String> body) {
        String seatId = body.get("seatId");
        String userId = auth.getName();
        boolean locked = seatLockService.lockSeat(eventId, seatId, userId);
        if (locked) {
            broadcastUpdate(eventId);
            return ResponseEntity.ok(ApiResponse.ok(true, "Seat locked for 5 minutes"));
        } else {
            return ResponseEntity.status(409).body(ApiResponse.error("Seat is already being booked by someone else"));
        }
    }

    @Operation(summary = "Unlock a seat",
            description = "Releases a previously locked seat for a given event. Broadcasts the update via WebSocket.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Seat unlocked successfully")
    @PostMapping("/{eventId}/unlock")
    public ResponseEntity<ApiResponse<Boolean>> unlockSeat(
            @Parameter(description = "Event ID") @PathVariable Long eventId,
            @RequestBody Map<String, String> body) {
        String seatId = body.get("seatId");
        seatLockService.unlockSeat(eventId, seatId);
        broadcastUpdate(eventId);
        return ResponseEntity.ok(ApiResponse.ok(true, "Seat unlocked"));
    }

    @Operation(summary = "Unlock multiple seats",
            description = "Releases multiple seat locks at once for a given event. Used when a user abandons checkout.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Seats unlocked successfully")
    @PostMapping("/{eventId}/unlock-multiple")
    public ResponseEntity<ApiResponse<Boolean>> unlockMultiple(
            @Parameter(description = "Event ID") @PathVariable Long eventId,
            @RequestBody Map<String, List<String>> body) {
        List<String> seatIds = body.get("seatIds");
        if (seatIds != null && !seatIds.isEmpty()) {
            seatLockService.unlockMultipleSeats(eventId, seatIds);
            broadcastUpdate(eventId);
        }
        return ResponseEntity.ok(ApiResponse.ok(true, "Seats unlocked"));
    }

    @Operation(summary = "Get currently locked seats",
            description = "Returns a list of all seat IDs currently locked by any user for a given event.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Locked seat list returned")
    @GetMapping("/{eventId}/locked")
    public ResponseEntity<ApiResponse<List<String>>> getLockedSeats(
            @Parameter(description = "Event ID") @PathVariable Long eventId) {
        List<String> lockedSeats = seatLockService.getLockedSeats(eventId);
        return ResponseEntity.ok(ApiResponse.ok(lockedSeats, "Fetched all currently locked seats"));
    }

    @Operation(summary = "Get my locked seats",
            description = "Returns a list of seat IDs locked by the currently authenticated user for a given event.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Your locked seats returned")
    @GetMapping("/{eventId}/my-locks")
    public ResponseEntity<ApiResponse<List<String>>> getMyLockedSeats(
            Authentication auth,
            @Parameter(description = "Event ID") @PathVariable Long eventId) {
        if (auth == null) return ResponseEntity.ok(ApiResponse.ok(List.of(), "Not authenticated"));
        String userId = auth.getName();
        List<String> myLockedSeats = seatLockService.getSeatsLockedByUser(eventId, userId);
        return ResponseEntity.ok(ApiResponse.ok(myLockedSeats, "Fetched your locked seats"));
    }

    private void broadcastUpdate(Long eventId) {
        List<String> lockedSeats = seatLockService.getLockedSeats(eventId);
        messagingTemplate.convertAndSend("/topic/event/" + eventId + "/seats", lockedSeats);
    }
}
