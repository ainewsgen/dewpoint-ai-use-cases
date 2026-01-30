const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export async function fetchEvents(start, end) {
    const params = new URLSearchParams();
    if (start) params.append('start', start.toISOString());
    if (end) params.append('end', end.toISOString());

    const response = await fetch(`${API_BASE_URL}/calendar/events?${params.toString()}`);
    if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
    }
    return response.json();
}

export async function createEvent(eventData) {
    const response = await fetch(`${API_BASE_URL}/calendar/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
    });
    if (!response.ok) {
        throw new Error('Failed to create event');
    }
    return response.json();
}

export async function updateEvent(id, eventData) {
    const response = await fetch(`${API_BASE_URL}/calendar/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
    });
    if (!response.ok) {
        throw new Error('Failed to update event');
    }
    return response.json();
}

export async function deleteEvent(id) {
    const response = await fetch(`${API_BASE_URL}/calendar/events/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete event');
    }
    return response.json();
}
