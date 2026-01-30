import { authenticatedFetch } from './api_client';

export async function fetchUser() {
    const res = await authenticatedFetch('/api/users/me');
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
}

export async function updateUser(data) {
    const res = await authenticatedFetch('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update user');
    return res.json();
}

export async function upgradePlan(planTier, clientTimestamp) {
    const res = await authenticatedFetch('/api/users/me/upgrade', {
        method: 'POST',
        body: JSON.stringify({ plan_tier: planTier, client_timestamp: clientTimestamp })
    });
    if (!res.ok) throw new Error('Failed to upgrade plan');
    return res.json();
}
