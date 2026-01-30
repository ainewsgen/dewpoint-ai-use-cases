import { API_BASE_URL } from '../config';

const BASE = `${API_BASE_URL}/api`;

export async function fetchStages() {
    const res = await fetch(`${BASE}/pipeline/stages`);
    if (!res.ok) throw new Error('Failed to fetch stages');
    return res.json();
}

export async function fetchDeals() {
    const res = await fetch(`${BASE}/pipeline/deals`);
    if (!res.ok) throw new Error('Failed to fetch deals');
    return res.json();
}

export async function createDeal(data) {
    const res = await fetch(`${BASE}/pipeline/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create deal');
    return res.json();
}

export async function moveDeal(dealId, stageId) {
    const res = await fetch(`${BASE}/pipeline/deals/${dealId}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: stageId })
    });
    if (!res.ok) throw new Error('Failed to move deal');
    return res.json();
}

export async function updateDeal(dealId, data) {
    const res = await fetch(`${BASE}/pipeline/deals/${dealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update deal');
    return res.json();
}
