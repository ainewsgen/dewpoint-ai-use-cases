const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const actionApi = {
    // Outreach
    sendEmail: async (leadId, subject = "Hello", body = "Just checking in.") => {
        const response = await fetch(`${API_BASE}/actions/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead_id: leadId, subject, body })
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Failed to send email' }));
            throw new Error(error.detail || 'Failed to send email');
        }
        return await response.json();
    },

    sendSMS: async (leadId, message = "Hi there!") => {
        const response = await fetch(`${API_BASE}/actions/sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead_id: leadId, message })
        });
        if (!response.ok) throw new Error('Failed to send SMS');
        return await response.json();
    },

    sendLinkedInDM: async (leadId, message = "Let's connect.") => {
        const response = await fetch(`${API_BASE}/actions/linkedin_dm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead_id: leadId, message })
        });
        if (!response.ok) throw new Error('Failed to send LinkedIn DM');
        return await response.json();
    },

    // CRM Actions
    addToPipeline: async (leadId, stageId = 1) => {
        const response = await fetch(`${API_BASE}/actions/pipeline/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead_id: leadId, stage_id: stageId })
        });
        if (!response.ok) throw new Error('Failed to add to pipeline');
        return await response.json();
    },

    scheduleFollowUp: async (leadId, scheduledAt, notes = "", title = null, type = "task") => {
        const response = await fetch(`${API_BASE}/actions/followup/schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead_id: leadId, scheduled_at: scheduledAt, notes, title, type })
        });
        if (!response.ok) throw new Error('Failed to schedule follow-up');
        return await response.json();
    },

    addNote: async (leadId, content) => {
        const response = await fetch(`${API_BASE}/actions/note/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead_id: leadId, content })
        });
        if (!response.ok) throw new Error('Failed to add note');
        return await response.json();
    },

    markContacted: async (leadId) => {
        const response = await fetch(`${API_BASE}/actions/contacted?lead_id=${leadId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Failed to mark as contacted');
        return await response.json();
    },

    getDetails: async (leadId) => {
        const response = await fetch(`${API_BASE}/actions/details/${leadId}`);
        if (!response.ok) throw new Error('Failed to get details');
        return await response.json();
    }
};
