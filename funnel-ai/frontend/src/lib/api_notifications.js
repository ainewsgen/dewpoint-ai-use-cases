const BASE = import.meta.env.VITE_API_URL || '/api';

export async function fetchNotifications() {
    const res = await fetch(`${BASE}/notifications?unread_only=false&limit=10`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
}

export async function markAsRead(id) {
    const res = await fetch(`${BASE}/notifications/${id}/read`, { method: 'PUT' });
    if (!res.ok) throw new Error('Failed to mark read');
    return res.json();
}

export async function markAllRead() {
    const res = await fetch(`${BASE}/notifications/read-all`, { method: 'PUT' });
    if (!res.ok) throw new Error('Failed to mark all read');
    return res.json();
}
