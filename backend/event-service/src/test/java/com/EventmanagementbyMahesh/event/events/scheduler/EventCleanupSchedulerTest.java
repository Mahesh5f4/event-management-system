package com.EventmanagementbyMahesh.event.events.scheduler;

import com.EventmanagementbyMahesh.event.events.entity.Event;
import com.EventmanagementbyMahesh.event.events.repository.EventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EventCleanupSchedulerTest {

    @Mock
    private EventRepository eventRepository;

    @InjectMocks
    private EventCleanupScheduler scheduler;

    @Test
    void deleteExpiredEvents_EventsFound_DeletesThem() {
        Event event = new Event();
        event.setId(1L);

        when(eventRepository.findAllByEndTimeBefore(any())).thenReturn(List.of(event));

        scheduler.deleteExpiredEvents();

        verify(eventRepository).deleteAll(List.of(event));
    }

    @Test
    void deleteExpiredEvents_NoEvents_DoesNothing() {
        when(eventRepository.findAllByEndTimeBefore(any())).thenReturn(Collections.emptyList());

        scheduler.deleteExpiredEvents();

        verify(eventRepository, never()).deleteAll(any());
    }
}
