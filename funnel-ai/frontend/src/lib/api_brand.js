import { authenticatedFetch } from './api_client';

export async function fetchBrandSettings() {
    const res = await authenticatedFetch('/api/brand/me');
    if (!res.ok) throw new Error('Failed to fetch brand settings');
    return res.json();
}

export async function updateBrandSettings(data) {
    const res = await authenticatedFetch('/api/brand/me', {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update brand settings');
    return res.json();
}

export async function uploadBrandDocument(file) {
    const formData = new FormData();
    formData.append('file', file);

    // authenticatedFetch sets Content-Type to json by default, needing override for FormData
    // Actually authenticatedFetch implementation:
    // const headers = { 'Content-Type': 'application/json', ...options.headers };
    // We need to UNSET Content-Type for FormData to let browser set boundary

    // Workaround: We might need to modify authenticatedFetch or just pass a special header

    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8005'}/api/brand/me/documents`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    if (!res.ok) throw new Error('Failed to upload document');
    return res.json();
}

export async function deleteBrandDocument(filename) {
    const res = await authenticatedFetch(`/api/brand/me/documents/${filename}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
}

export async function extractBrandColors(url) {
    const res = await authenticatedFetch('/api/brand/extract-colors', {
        method: 'POST',
        body: JSON.stringify({ url })
    });
    if (!res.ok) throw new Error('Failed to extract colors');
    return res.json();
}
