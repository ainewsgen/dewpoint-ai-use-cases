import { API_BASE_URL } from '../config';

export async function fetchTemplates() {
    const res = await fetch(`${API_BASE_URL}/api/templates`);
    if (!res.ok) throw new Error('Failed to fetch templates');
    return res.json();
}
