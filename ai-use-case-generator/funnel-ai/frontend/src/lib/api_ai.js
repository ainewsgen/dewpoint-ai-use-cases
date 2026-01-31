const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export async function generateDraft(leadId, type, tone) {
    const response = await fetch(`${API_BASE_URL}/ai/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, type, tone })
    });
    if (!response.ok) throw new Error('Failed to generate draft');
    return response.json();
}

export async function generateTaskSuggestions() {
    const response = await fetch(`${API_BASE_URL}/ai/generate-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to generate task suggestions');
    return response.json();
}
