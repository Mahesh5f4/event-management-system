package com.EventmanagementbyMahesh.event.booking.controller;

import com.EventmanagementbyMahesh.event.booking.service.SeatLockService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SeatLockController.class)
@AutoConfigureMockMvc(addFilters = false)
public class SeatLockControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SeatLockService seatLockService;

    @MockBean
    private SimpMessagingTemplate messagingTemplate;

    @Test
    @WithMockUser(username = "user1")
    void testLockSeat_Success() throws Exception {
        Mockito.when(seatLockService.lockSeat(anyLong(), anyString(), eq("user1"))).thenReturn(true);
        Mockito.when(seatLockService.getLockedSeats(anyLong())).thenReturn(List.of("A1"));

        mockMvc.perform(post("/seats/1/lock")
                        .principal(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("user1", "pass"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"seatId\":\"A1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        Mockito.verify(messagingTemplate).convertAndSend(eq("/topic/event/1/seats"), Mockito.anyList());
    }

    @Test
    @WithMockUser(username = "user1")
    void testLockSeat_Conflict() throws Exception {
        Mockito.when(seatLockService.lockSeat(anyLong(), anyString(), eq("user1"))).thenReturn(false);

        mockMvc.perform(post("/seats/1/lock")
                        .principal(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("user1", "pass"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"seatId\":\"A1\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void testUnlockSeat() throws Exception {
        mockMvc.perform(post("/seats/1/unlock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"seatId\":\"A1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        Mockito.verify(seatLockService).unlockSeat(1L, "A1");
        Mockito.verify(messagingTemplate).convertAndSend(eq("/topic/event/1/seats"), Mockito.anyList());
    }

    @Test
    void testUnlockMultiple() throws Exception {
        mockMvc.perform(post("/seats/1/unlock-multiple")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"seatIds\":[\"A1\", \"A2\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        Mockito.verify(seatLockService).unlockMultipleSeats(1L, Arrays.asList("A1", "A2"));
    }

    @Test
    void testGetLockedSeats() throws Exception {
        Mockito.when(seatLockService.getLockedSeats(1L)).thenReturn(Arrays.asList("A1", "B2"));

        mockMvc.perform(get("/seats/1/locked"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0]").value("A1"))
                .andExpect(jsonPath("$.data[1]").value("B2"));
    }

    @Test
    @WithMockUser(username = "user1")
    void testGetMyLockedSeats() throws Exception {
        Mockito.when(seatLockService.getSeatsLockedByUser(1L, "user1")).thenReturn(Arrays.asList("A1"));

        mockMvc.perform(get("/seats/1/my-locks")
                        .principal(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("user1", "pass")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0]").value("A1"));
    }
}
