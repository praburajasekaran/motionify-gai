/**
 * Centralized API response transformers
 * Eliminates duplication of try-catch blocks and error handling across API files
 */

import { safeJsonParse } from './api-helpers';

/**
 * Generic API response type with success/error structure
 */
export interface ApiResponse<T = any> {
    success: boolean;
    error?: string;
    [key: string]: any;
}

/**
 * Transform a fetch response into a standardized API response
 * Handles common error cases and response parsing
 * 
 * @param response - The fetch Response object
 * @param options - Transform options
 * @returns Standardized API response object
 */
export async function transformApiResponse<T extends ApiResponse>(
    response: Response,
    options: {
        /** Error message to use if response is not ok and no error in response body */
        defaultError: string;
        /** Optional function to transform successful response data */
        transformData?: (data: any) => Partial<T>;
        /** Optional operation name for logging */
        operationName?: string;
    }
): Promise<T> {
    try {
        const result = await safeJsonParse(response);

        if (!response.ok) {
            return {
                success: false,
                error: result.error || options.defaultError,
            } as T;
        }

        // Apply custom data transformation if provided
        const transformedData = options.transformData
            ? options.transformData(result)
            : result;

        return {
            success: true,
            ...transformedData,
        } as T;
    } catch (error: any) {
        if (options.operationName) {
            console.error(`Error ${options.operationName}:`, error);
        }
        return {
            success: false,
            error: error.message || options.defaultError,
        } as T;
    }
}

/**
 * Wrapper for API calls with standardized error handling
 * Eliminates the need for try-catch blocks in individual API functions
 * 
 * @param fetcher - Async function that returns a fetch Response
 * @param options - Transform options
 * @returns Standardized API response
 */
export async function apiCall<T extends ApiResponse>(
    fetcher: () => Promise<Response>,
    options: {
        /** Error message to use if response fails */
        defaultError: string;
        /** Optional function to transform successful response data */
        transformData?: (data: any) => Partial<T>;
        /** Optional operation name for logging */
        operationName?: string;
    }
): Promise<T> {
    try {
        const response = await fetcher();
        return transformApiResponse<T>(response, options);
    } catch (error: any) {
        if (options.operationName) {
            console.error(`Error ${options.operationName}:`, error);
        }
        return {
            success: false,
            error: error.message || options.defaultError,
        } as T;
    }
}

/**
 * Helper to build URL with query parameters
 */
export function buildUrlWithParams(
    baseUrl: string,
    params?: Record<string, string | number | boolean | undefined>
): string {
    if (!params) return baseUrl;

    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
        }
    });

    const queryString = queryParams.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Helper for GET requests with query parameters
 */
export async function apiGet<T extends ApiResponse>(
    url: string,
    params?: Record<string, string | number | boolean | undefined>,
    options?: {
        defaultError?: string;
        transformData?: (data: any) => Partial<T>;
        operationName?: string;
    }
): Promise<T> {
    const fullUrl = buildUrlWithParams(url, params);

    return apiCall<T>(
        () => fetch(fullUrl, {
            method: 'GET',
            credentials: 'include',
        }),
        {
            defaultError: options?.defaultError || 'Failed to fetch data',
            transformData: options?.transformData,
            operationName: options?.operationName,
        }
    );
}

/**
 * Helper for POST requests
 */
export async function apiPost<T extends ApiResponse>(
    url: string,
    body?: any,
    options?: {
        defaultError?: string;
        transformData?: (data: any) => Partial<T>;
        operationName?: string;
    }
): Promise<T> {
    return apiCall<T>(
        () => fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: body ? JSON.stringify(body) : undefined,
        }),
        {
            defaultError: options?.defaultError || 'Failed to create resource',
            transformData: options?.transformData,
            operationName: options?.operationName,
        }
    );
}

/**
 * Helper for PATCH requests
 */
export async function apiPatch<T extends ApiResponse>(
    url: string,
    body?: any,
    options?: {
        defaultError?: string;
        transformData?: (data: any) => Partial<T>;
        operationName?: string;
    }
): Promise<T> {
    return apiCall<T>(
        () => fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: body ? JSON.stringify(body) : undefined,
        }),
        {
            defaultError: options?.defaultError || 'Failed to update resource',
            transformData: options?.transformData,
            operationName: options?.operationName,
        }
    );
}

/**
 * Helper for DELETE requests
 */
export async function apiDelete<T extends ApiResponse>(
    url: string,
    options?: {
        defaultError?: string;
        transformData?: (data: any) => Partial<T>;
        operationName?: string;
    }
): Promise<T> {
    return apiCall<T>(
        () => fetch(url, {
            method: 'DELETE',
            credentials: 'include',
        }),
        {
            defaultError: options?.defaultError || 'Failed to delete resource',
            transformData: options?.transformData,
            operationName: options?.operationName,
        }
    );
}

