import { API_BASE_URL } from '../config';

async function authenticatedFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');

    // Ensure headers exist
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // If body is FormData, let the browser set Content-Type (multipart/form-data with boundary)
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Handle 401 Unauthorized globally-ish (or let caller handle)
    if (response.status === 401) {
        // Optional: Redirect to login or dispatch event
        // window.location.href = '/login'; // Rough but effective for now
    }

    return response;
}

export { authenticatedFetch };
