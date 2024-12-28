import { getAuthToken } from '@/lib/authService';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

export const createHeaders = (token = null) => {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
};

export const handleApiResponse = async (response) => {
    const text = await response.text();
    let data;

    try {
        data = text ? JSON.parse(text) : {};
    } catch (error) {
        throw new ApiError('Invalid response format from server', response.status);
    }

    if (!response.ok) {
        throw new ApiError(data.error || response.statusText, response.status);
    }

    return data.data || data;
};

export const fetchWithAuth = async (url, options = {}) => {
    const token = getAuthToken();
    if (!token) {
        throw new ApiError('Authentication required', 401);
    }

    const headers = createHeaders(token);
    const response = await fetch(url, {
        ...options,
        headers: {
            ...headers,
            ...options.headers,
        },
    });

    return handleApiResponse(response);
};

export async function deleteRequest(endpoint) {
    try {
        console.log('Making DELETE request to:', endpoint);
        const response = await fetchWithAuth(endpoint, {
            method: 'DELETE'
        });
        
        // If we get here, the request was successful
        return true;  // or return response if you need the data
    } catch (error) {
        console.error('API Utils DELETE error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        throw new ApiError(error.message || 'Failed to delete resource', error.status || 500);
    }
}