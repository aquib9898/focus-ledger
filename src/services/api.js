const API_BASE = '/api';

function getToken() {
    return localStorage.getItem('focus_auth_token');
}

async function request(method, path, body = null) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method,
        headers,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${path}`, config);

    // Handle token expiry
    if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'Token expired') {
            localStorage.removeItem('focus_auth_token');
            localStorage.removeItem('focus_auth_user');
            window.dispatchEvent(new Event('auth-expired'));
        }
        throw new Error(data.error || 'Unauthorized');
    }

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed with status ${res.status}`);
    }

    return res.json();
}

export const api = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    delete: (path) => request('DELETE', path),
};
