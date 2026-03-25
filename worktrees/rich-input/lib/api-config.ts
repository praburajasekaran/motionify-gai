/**
 * API Configuration and Client
 *
 * Provides a centralized API client with:
 * - Automatic authentication header injection
 * - 401 response handling with redirect to login
 * - Error normalization
 */

import { getAuthToken, clearAuthSession } from './auth';

// API Base URL
// Use relative path in development so requests go through Vite proxy (for cookie handling)
// In production, VITE_API_URL should be set to the actual API endpoint
export const API_BASE = import.meta.env.VITE_API_URL || '/.netlify/functions';

// Request options type
interface RequestOptions extends RequestInit {
    skipAuth?: boolean;
}

// API Response type
interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    message?: string;
}

/**
 * Handle 401 Unauthorized responses
 */
function handleUnauthorized(): void {
    clearAuthSession();
    // Only redirect if not already on login page
    if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?session=expired';
    }
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T = any>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<ApiResponse<T>> {
    const { skipAuth = false, ...fetchOptions } = options;

    // Build headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers as Record<string, string>),
    };

    // Add auth header if not skipped and token exists
    if (!skipAuth) {
        const token = getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    // Build full URL
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            headers,
            credentials: 'include', // Send httpOnly cookies with requests
        });

        // Handle 401 Unauthorized
        if (response.status === 401) {
            handleUnauthorized();
            return {
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Session expired. Please log in again.',
                },
            };
        }

        // Parse response
        const data = await response.json();

        // Handle non-2xx responses
        if (!response.ok) {
            return {
                success: false,
                error: data.error || {
                    code: 'API_ERROR',
                    message: data.message || 'An error occurred',
                },
            };
        }

        return {
            success: true,
            data: data.data || data,
            message: data.message,
        };
    } catch (error: any) {
        console.error('API request failed:', error);
        return {
            success: false,
            error: {
                code: 'NETWORK_ERROR',
                message: error.message || 'Network error. Please check your connection.',
            },
        };
    }
}

/**
 * API Client with common methods
 */
export const api = {
    /**
     * GET request
     */
    get: <T = any>(endpoint: string, options?: RequestOptions) =>
        apiRequest<T>(endpoint, { ...options, method: 'GET' }),

    /**
     * POST request
     */
    post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        }),

    /**
     * PUT request
     */
    put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        }),

    /**
     * PATCH request
     */
    patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        }),

    /**
     * DELETE request
     */
    delete: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'DELETE',
            body: body ? JSON.stringify(body) : undefined,
        }),
};

// Export for backward compatibility
export default api;
