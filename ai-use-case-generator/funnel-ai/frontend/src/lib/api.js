import { authenticatedFetch } from './api_client';

export async function fetchLeads(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.source) params.append('source', filters.source);
    if (filters.min_score) params.append('min_score', filters.min_score);
    if (filters.next_action_before) params.append('next_action_before', filters.next_action_before);
    if (filters.sort_by) params.append('sort_by', filters.sort_by);
    if (filters.sort_order) params.append('sort_order', filters.sort_order);
    if (filters.search) params.append('search', filters.search);

    const response = await authenticatedFetch(`/api/leads/?${params.toString()}`);
    if (!response.ok) {
        throw new Error('Failed to fetch leads');
    }
    return response.json();
}

export async function createLead(leadData, force = false) {
    // Sanitize data: convert empty strings to null
    const sanitizedData = Object.entries(leadData).reduce((acc, [key, value]) => {
        acc[key] = value === '' ? null : value;
        return acc;
    }, {});

    const endpoint = force ? '/api/leads/?force=true' : '/api/leads/';
    const response = await authenticatedFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(sanitizedData),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create lead');
    }
    return response.json();
}

export async function recalculateLeads() {
    const response = await authenticatedFetch('/api/leads/recalculate', {
        method: 'POST',
    });
    if (!response.ok) {
        throw new Error('Failed to recalculate leads');
    }
    return response.json();
}

export async function updateLead(leadId, leadData) {
    // Sanitize data
    const sanitizedData = Object.entries(leadData).reduce((acc, [key, value]) => {
        acc[key] = value === '' ? null : value;
        return acc;
    }, {});

    const response = await authenticatedFetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        body: JSON.stringify(sanitizedData),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update lead');
    }
    return response.json();
}

export async function sourceLeads(searchParams) {
    const response = await authenticatedFetch('/api/scraper/search', {
        method: 'POST',
        body: JSON.stringify(searchParams),
    });
    if (!response.ok) {
        throw new Error('Failed to source leads');
    }
    return response.json();
}

export async function disqualifyLead(leadId, reason) {
    const response = await authenticatedFetch(`/api/leads/${leadId}/disqualify`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });
    if (!response.ok) {
        throw new Error('Failed to disqualify lead');
    }
    return response.json();
}
