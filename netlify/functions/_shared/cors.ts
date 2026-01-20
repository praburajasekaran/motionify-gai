/**
 * Shared CORS Configuration Module
 *
 * Provides centralized CORS handling with:
 * - Environment-specific allowed origins
 * - Configurable methods and headers
 * - Preflight request handling
 */

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';

// Allowed origins configuration
const ALLOWED_ORIGINS_PROD = [
    'https://portal.motionify.studio',
    'https://motionify.studio',
    'https://www.motionify.studio',
    // Add Netlify preview URLs pattern
];

const ALLOWED_ORIGINS_DEV = [
    'http://localhost:3000',
    'http://localhost:3003',
    'http://localhost:5173',
    'http://localhost:8888',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
];

// Get additional allowed origins from environment
function getCustomOrigins(): string[] {
    const customOrigins = process.env.CORS_ALLOWED_ORIGINS;
    if (customOrigins) {
        return customOrigins.split(',').map(o => o.trim()).filter(Boolean);
    }
    return [];
}

/**
 * Get all allowed origins based on environment
 */
export function getAllowedOrigins(): string[] {
    const customOrigins = getCustomOrigins();

    if (isProduction) {
        return [...ALLOWED_ORIGINS_PROD, ...customOrigins];
    }

    // In development, allow both dev and production origins
    return [...ALLOWED_ORIGINS_DEV, ...ALLOWED_ORIGINS_PROD, ...customOrigins];
}

/**
 * Check if an origin is allowed
 */
export function isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) {
        // Allow requests with no origin (e.g., server-to-server)
        return true;
    }

    const allowedOrigins = getAllowedOrigins();

    // Check exact match
    if (allowedOrigins.includes(origin)) {
        return true;
    }

    // Check Netlify preview URLs (deploy previews)
    if (origin.match(/^https:\/\/[a-z0-9-]+--motionify.*\.netlify\.app$/)) {
        return true;
    }

    return false;
}

/**
 * Get CORS headers for a request
 */
export function getCorsHeaders(requestOrigin?: string): Record<string, string> {
    const origin = requestOrigin && isOriginAllowed(requestOrigin)
        ? requestOrigin
        : getAllowedOrigins()[0];

    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Id',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
        'Content-Type': 'application/json',
    };
}

/**
 * Handle CORS preflight (OPTIONS) request
 */
export function handleCorsPrelight(requestOrigin?: string): {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
} {
    return {
        statusCode: 204,
        headers: getCorsHeaders(requestOrigin),
        body: '',
    };
}

/**
 * Create an error response for invalid origin
 */
export function createCorsError(): {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
} {
    return {
        statusCode: 403,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            success: false,
            error: {
                code: 'CORS_ERROR',
                message: 'Origin not allowed',
            },
        }),
    };
}

/**
 * CORS middleware helper
 * Returns null if CORS is valid, or an error response if not
 */
export function validateCors(event: {
    httpMethod: string;
    headers: Record<string, string>;
}): { statusCode: number; headers: Record<string, string>; body: string } | null {
    const origin = event.headers.origin || event.headers.Origin;

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return handleCorsPrelight(origin);
    }

    // In production, validate origin
    if (isProduction && origin && !isOriginAllowed(origin)) {
        return createCorsError();
    }

    return null;
}
