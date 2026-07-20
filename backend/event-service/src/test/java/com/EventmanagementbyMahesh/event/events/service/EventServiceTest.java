package com.EventmanagementbyMahesh.event.events.service;

import com.EventmanagementbyMahesh.event.events.dto.CreateEventRequest;
import com.EventmanagementbyMahesh.event.events.dto.EventResponse;
import com.EventmanagementbyMahesh.event.events.dto.UpdateEventRequest;
import com.EventmanagementbyMahesh.event.events.entity.Event;
import com.EventmanagementbyMahesh.event.events.repository.EventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EventServiceTest {

    @Mock
    private EventRepository repo;

    @InjectMocks
    private EventService service;

    private Event event;

    @BeforeEach
    void setUp() {
        event = new Event();
        event.setId(1L);
        event.setTitle("Tech Conf");
        event.setDescription("A technology conference");
        event.setLocation("New York");
        event.setPrice(100.0);
        event.setTotalSeats(100);
        event.setAvailableSeats(100);
        event.setStartTime(LocalDateTime.now().plusDays(1));
        event.setEndTime(LocalDateTime.now().plusDays(2));
        event.setImageUrl("image.png");
    }

    @Test
    void create_Success() {
        CreateEventRequest req = new CreateEventRequest();
        req.title = "Tech Conf";
        req.description = "A technology conference";
        req.location = "New York";
        req.price = 100.0;
        req.totalSeats = 100;
        req.startTime = LocalDateTime.now().plusDays(1);
        req.endTime = LocalDateTime.now().plusDays(2);
        req.imageUrl = "image.png";

        when(repo.save(any(Event.class))).thenReturn(event);

        EventResponse response = service.create(req);

        assertNotNull(response);
        assertEquals("Tech Conf", response.title);
        verify(repo).save(any(Event.class));
    }

    @Test
    void getById_Success() {
        when(repo.findById(1L)).thenReturn(Optional.of(event));

        EventResponse response = service.getById(1L);

        assertNotNull(response);
        assertEquals(1L, response.id);
    }

    @Test
    void getById_ExpiredEvent_ThrowsException() {
        event.setEndTime(LocalDateTime.now().minusDays(1));
        when(repo.findById(1L)).thenReturn(Optional.of(event));

        assertThrows(RuntimeException.class, () -> service.getById(1L));
    }

    @Test
    void getById_NotFound_ThrowsException() {
        when(repo.findById(1L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.getById(1L));
    }

    @Test
    void getAll_Success() {
        when(repo.findByEndTimeAfterOrderByIdDesc(any(LocalDateTime.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(event)));

        Page<EventResponse> result = service.getAll(0, 10);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("Tech Conf", result.getContent().get(0).title);
    }

    @Test
    void update_Success() {
        UpdateEventRequest req = new UpdateEventRequest();
        req.title = "New Tech Conf";
        req.price = 150.0;
        req.totalSeats = 150; // increased by 50
        req.description = "New description";
        req.location = "New location";
        req.startTime = LocalDateTime.now().plusDays(2);
        req.endTime = LocalDateTime.now().plusDays(3);
        req.imageUrl = "new_image.png";

        when(repo.findById(1L)).thenReturn(Optional.of(event));
        when(repo.save(any(Event.class))).thenReturn(event);

        Map<String, Object> result = service.update(1L, req);

        assertNotNull(result);
        assertEquals(1L, result.get("id"));
        assertEquals("New Tech Conf", event.getTitle());
        assertEquals(150, event.getTotalSeats());
        assertEquals(150, event.getAvailableSeats()); // 100 + 50 difference
    }

    @Test
    void update_NotFound_ThrowsException() {
        when(repo.findById(1L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> service.update(1L, new UpdateEventRequest()));
    }

    @Test
    void delete_Success() {
        doNothing().when(repo).deleteById(1L);
        assertDoesNotThrow(() -> service.delete(1L));
        verify(repo).deleteById(1L);
    }

    @Test
    void deductSeats_Success() {
        when(repo.findById(1L)).thenReturn(Optional.of(event));

        assertDoesNotThrow(() -> service.deductSeats(1L, 5));
        assertEquals(95, event.getAvailableSeats());
        verify(repo).save(event);
    }

    @Test
    void deductSeats_NotEnoughSeats_ThrowsException() {
        event.setAvailableSeats(2);
        when(repo.findById(1L)).thenReturn(Optional.of(event));

        assertThrows(RuntimeException.class, () -> service.deductSeats(1L, 5));
    }

    @Test
    void deductSeats_NotFound_ThrowsException() {
        when(repo.findById(1L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> service.deductSeats(1L, 5));
    }

    @Test
    void addSeats_Success() {
        when(repo.findById(1L)).thenReturn(Optional.of(event));

        assertDoesNotThrow(() -> service.addSeats(1L, 5));
        assertEquals(105, event.getAvailableSeats());
        verify(repo).save(event);
    }
}
