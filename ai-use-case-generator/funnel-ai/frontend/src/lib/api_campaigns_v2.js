import { API_BASE_URL } from '../config';

export async function fetchCampaigns() {
    const res = await fetch(`${API_BASE_URL}/api/campaigns`);
    if (!res.ok) throw new Error('Failed to fetch campaigns');
    return res.json();
}

export async function fetchCampaign(id) {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${id}`);
    if (!res.ok) throw new Error('Failed to fetch campaign');
    return res.json();
}

export async function createCampaign(data) {
    const res = await fetch(`${API_BASE_URL}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create campaign');
    return res.json();
}

export async function addCampaignStep(campaignId, stepData) {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stepData),
    });
    if (!res.ok) throw new Error('Failed to add step');
    return res.json();
}

export async function deleteCampaignStep(campaignId, stepId) {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/steps/${stepId}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete step');
    return res.json();
}

// Ensure updateCampaignStep is implemented if we used it
// Ensure updateCampaignStep is implemented if we used it
export async function updateCampaignStep(campaignId, stepId, updates) {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/steps/${stepId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update step');
    return res.json();
}

export async function addLeadsToCampaign(campaignId, leadIds) {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadIds),
    });
    if (!res.ok) throw new Error('Failed to add leads to campaign');
    return res.json();
}

export async function updateCampaign(campaignId, updates) {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update campaign');
    return res.json();
}

export async function launchCampaign(campaignId) {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/launch`, {
        method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to launch campaign');
    return res.json();
}

export async function triggerCampaignRun() {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/test-run`, {
        method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to run campaigns');
    return res.json();
}
