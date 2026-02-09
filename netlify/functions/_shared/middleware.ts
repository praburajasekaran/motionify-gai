/**
 * Composable Middleware for Netlify Functions
 *
 * Provides reusable middleware that can be composed together:
 * - withAuth: Require authentication
 * - withRateLimit: Apply rate limiting
 * - withValidation: Validate request body
 * - compose: Chain multiple middlewares
 */

import { z } from 'zod';
import { requireAuthFromCookie, requireSuperAdmin, requireSupport, type CookieAuthResult } from './auth';
import { checkRateLimit, createRateLimitResponse, getClientIP, type RateLimitConfig } from './rateLimit';
import { validateRequest } from './validation';
import { getCorsHeaders, validateCors } from './cors';
import { createLogger } from './logger';

const logger = createLogger('middleware');

export interface NetlifyEvent {
    httpMethod: string;
    headers: Record<string, string>;
    body: string | null;
    path: string;
    queryStringParameters?: Record<string, string>;
}

export interface NetlifyResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}

// Auth result compatible with the compose pattern
export interface AuthResult {
    authorized: boolean;
    user?: {
        userId: string;
        email: string;
        role: string;
        fullName: string;
    };
    error?: string;
    statusCode?: number;
}

export type Handler = (event: NetlifyEvent, auth?: AuthResult) => Promise<NetlifyResponse>;
export type Middleware = (handler: Handler) => Handler;

/**
 * Create standardized unauthorized response
 */
export function createUnauthorizedResponse(auth: AuthResult, origin?: string): NetlifyResponse {
    const headers = getCorsHeaders(origin);

    return {
        statusCode: auth.statusCode || 401,
        headers,
        body: JSON.stringify({
            error: {
                code: auth.statusCode === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED',
                message: auth.error || 'Authentication required',
            },
        }),
    };
}

/**
 * Require authentication - any authenticated user
 */
export function withAuth(): Middleware {
    return (handler: Handler) => async (event: NetlifyEvent) => {
        const auth = await requireAuthFromCookie(event);

        if (!auth.authorized) {
            const origin = event.headers.origin || event.headers.Origin;
            return createUnauthorizedResponse(auth, origin);
        }

        return handler(event, auth);
    };
}

/**
 * Require Super Admin role
 */
export function withSuperAdmin(): Middleware {
    return (handler: Handler) => async (event: NetlifyEvent) => {
        const auth = await requireSuperAdmin(event);

        if (!auth.authorized) {
            const origin = event.headers.origin || event.headers.Origin;
            return createUnauthorizedResponse(auth, origin);
        }

        return handler(event, auth);
    };
}

/**
 * Require Project Manager or Super Admin role
 */
export function withProjectManager(): Middleware {
    return (handler: Handler) => async (event: NetlifyEvent) => {
        const auth = await requireSupport(event);

        if (!auth.authorized) {
            const origin = event.headers.origin || event.headers.Origin;
            return createUnauthorizedResponse(auth, origin);
        }

        return handler(event, auth);
    };
}

/**
 * Apply rate limiting
 */
export function withRateLimit(config: RateLimitConfig, action?: string): Middleware {
    return (handler: Handler) => async (event: NetlifyEvent, auth?: AuthResult) => {
        const origin = event.headers.origin || event.headers.Origin;
        const headers = getCorsHeaders(origin);

        // Get identifier (authenticated user or IP)
        // Use the auth passed from previous middleware if available, otherwise check cookie
        let identifier: string;
        if (auth?.user?.userId) {
            identifier = auth.user.userId;
        } else {
            try {
                const freshAuth = await requireAuthFromCookie(event);
                identifier = freshAuth.user?.userId || getClientIP(event.headers);
            } catch {
                identifier = getClientIP(event.headers);
            }
        }

        const actionName = action || event.path || 'api';
        const result = await checkRateLimit(identifier, actionName, config);

        if (!result.allowed) {
            return createRateLimitResponse(result, headers);
        }

        // Pass auth through to the next handler
        return handler(event, auth);
    };
}

/**
 * Validate request body against Zod schema
 */
export function withValidation(schema: z.ZodSchema): Middleware {
    return (handler: Handler) => async (event: NetlifyEvent) => {
        const origin = event.headers.origin || event.headers.Origin;

        const validation = validateRequest(event.body, schema, origin);

        // Type guard: check if validation failed
        if (!validation.success) {
            // TypeScript knows this must be the error case
            return validation.response;
        }

        // TypeScript knows validation.data exists here
        // Attach validated data to event for handler to use
        (event as any).validatedData = validation.data;

        return handler(event);
    };
}

/**
 * Compose multiple middlewares together
 * Middlewares are applied right-to-left (like function composition)
 *
 * Example:
 * export const handler = compose(
 *   withAuth(),
 *   withRateLimit(RATE_LIMITS.api),
 *   withValidation(createProposalSchema)
 * )(async (event, auth) => {
 *   // Handler code here
 * });
 */
export function compose(...middlewares: Middleware[]): (handler: Handler) => Handler {
    return (handler: Handler) => {
        return middlewares.reduceRight(
            (composedHandler, middleware) => middleware(composedHandler),
            handler
        );
    };
}

/**
 * Standard CORS + Method validation wrapper
 */
export function withCORS(allowedMethods: string[]): Middleware {
    return (handler: Handler) => async (event: NetlifyEvent) => {
        const origin = event.headers.origin || event.headers.Origin;
        const headers = getCorsHeaders(origin);

        // Handle preflight
        const corsResult = validateCors(event);
        if (corsResult) return corsResult;

        // Validate method
        if (!allowedMethods.includes(event.httpMethod)) {
            return {
                statusCode: 405,
                headers,
                body: JSON.stringify({
                    error: {
                        code: 'METHOD_NOT_ALLOWED',
                        message: `Method ${event.httpMethod} not allowed. Allowed: ${allowedMethods.join(', ')}`,
                    },
                }),
            };
        }

        // Call handler and merge CORS headers into response
        try {
            const response = await handler(event);
            return {
                ...response,
                headers: {
                    ...headers,
                    ...response.headers,
                },
            };
        } catch (error: any) {
            console.error('Unhandled error in handler:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: {
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'An unexpected error occurred',
                        details: error.message,
                    },
                }),
            };
        }
    };
}
