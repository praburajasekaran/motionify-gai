/**
 * API Client for Landing Page Portal
 * 
 * Provides a centralized fetch wrapper with:
 * - Automatic credentials: 'include' for cookie-based auth
 * - Common headers (Content-Type: application/json)
 * - Consistent error handling
 */

const API_BASE = import.meta.env.VITE_API_URL || '/.netlify/functions';

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}

/**
 * Make an API request with credentials automatically included
 */
export async function apiFetch(
    path: string,
    options: RequestInit = {}
): Promise<Response> {
    const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

    return fetch(url, {
        ...options,
        credentials: 'include', // ALWAYS included for cookie-based auth
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
}

/**
 * API helper methods with typed responses
 */
export const api = {
    /**
     * GET request
     */
    async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
        try {
            const response = await apiFetch(endpoint, { method: 'GET' });
            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || { code: 'API_ERROR', message: data.message || 'Request failed' },
                };
            }

            return { success: true, data: data.data || data };
        } catch (error: any) {
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: error.message || 'Network error' },
            };
        }
    },

    /**
     * POST request
     */
    async post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
        try {
            const response = await apiFetch(endpoint, {
                method: 'POST',
                body: body ? JSON.stringify(body) : undefined,
            });
            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || { code: 'API_ERROR', message: data.message || 'Request failed' },
                };
            }

            return { success: true, data: data.data || data };
        } catch (error: any) {
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: error.message || 'Network error' },
            };
        }
    },

    /**
     * PATCH request
     */
    async patch<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
        try {
            const response = await apiFetch(endpoint, {
                method: 'PATCH',
                body: body ? JSON.stringify(body) : undefined,
            });
            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || { code: 'API_ERROR', message: data.message || 'Request failed' },
                };
            }

            return { success: true, data: data.data || data };
        } catch (error: any) {
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: error.message || 'Network error' },
            };
        }
    },

    /**
     * DELETE request
     */
    async delete<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
        try {
            const response = await apiFetch(endpoint, {
                method: 'DELETE',
                body: body ? JSON.stringify(body) : undefined,
            });

            // Some DELETE endpoints return empty response
            const text = await response.text();
            const data = text ? JSON.parse(text) : {};

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || { code: 'API_ERROR', message: data.message || 'Request failed' },
                };
            }

            return { success: true, data: data.data || data };
        } catch (error: any) {
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: error.message || 'Network error' },
            };
        }
    },
};

export default api;
