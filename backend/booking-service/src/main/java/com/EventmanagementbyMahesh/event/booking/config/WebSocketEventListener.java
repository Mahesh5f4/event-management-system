package com.EventmanagementbyMahesh.event.booking.config;

import com.EventmanagementbyMahesh.event.booking.service.SeatLockService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.List;

@Component
public class WebSocketEventListener {

    private final SeatLockService seatLockService;
    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketEventListener(SeatLockService seatLockService, SimpMessagingTemplate messagingTemplate) {
        this.seatLockService = seatLockService;
        this.messagingTemplate = messagingTemplate;
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String userId = (String) headerAccessor.getSessionAttributes().get("userId");
        Long eventId = (Long) headerAccessor.getSessionAttributes().get("eventId");

        if (userId != null && eventId != null) {
            List<String> userSeats = seatLockService.getSeatsLockedByUser(eventId, userId);
            if (!userSeats.isEmpty()) {
                seatLockService.unlockMultipleSeats(eventId, userSeats);
                List<String> lockedSeats = seatLockService.getLockedSeats(eventId);
                messagingTemplate.convertAndSend("/topic/event/" + eventId + "/seats", lockedSeats);
            }
        }
    }
}
