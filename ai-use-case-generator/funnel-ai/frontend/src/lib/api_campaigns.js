import { API_BASE_URL } from './api_constants'; // Better practice to extract this

const BASE = import.meta.env.VITE_API_URL || '/api';

export async function fetchCampaigns() {
    const response = await fetch(`${BASE}/campaigns`);
    if (!response.ok) throw new Error('Failed to fetch campaigns');
    return response.json();
}

export async function createCampaign(data) {
    const response = await fetch(`${BASE}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create campaign');
    return response.json();
}
