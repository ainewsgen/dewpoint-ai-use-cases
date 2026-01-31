const BASE = import.meta.env.VITE_API_URL || '/api';

export async function fetchProposals() {
    const res = await fetch(`${BASE}/proposals`);
    if (!res.ok) throw new Error('Failed to fetch proposals');
    return res.json();
}

export async function createProposal(data) {
    const res = await fetch(`${BASE}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create proposal');
    return res.json();
}
