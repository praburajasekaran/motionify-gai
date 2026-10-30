/**
 * Shared Rate Limiting Module
 *
 * Provides rate limiting using database-backed tracking:
 * - Per-IP rate limiting for anonymous requests
 * - Per-user rate limiting for authenticated requests
 * - Configurable time windows and limits
 */

import { query } from './db';
import { createLogger } from './logger';

const logger = createLogger('rate-limit');

// Rate limit configurations
export interface RateLimitConfig {
    windowMs: number;     // Time window in milliseconds
    maxRequests: number;  // Maximum requests per window
}

// Default rate limits
export const RATE_LIMITS = {
    // Magic link requests: 5 per hour per email
    magicLink: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 5,
    },
    // Login attempts: 10 per hour per IP
    login: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 10,
    },
    // General API: 100 per minute per user
    api: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100,
    },
    // Strict API (sensitive operations): 10 per minute
    apiStrict: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10,
    },
    // Auth actions (magic link verification, etc.): 5 per hour
    authAction: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 5,
    },
} as const;

// Rate limit result
export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
    retryAfter?: number; // seconds
}

/**
 * Extract client IP from Netlify event headers
 */
export function getClientIP(headers: Record<string, string>): string {
    // Netlify/Cloudflare headers
    return headers['x-nf-client-connection-ip'] ||
           headers['x-forwarded-for']?.split(',')[0].trim() ||
           headers['x-real-ip'] ||
           headers['client-ip'] ||
           'unknown';
}

/**
 * Check and record a request using the migrated database function.
 */
export async function checkRateLimit(
    identifier: string,
    action: string,
    config: RateLimitConfig
): Promise<RateLimitResult> {
    const now = Date.now();
    const resetAt = new Date(now + config.windowMs);

    try {
        const result = await query<{ allowed: boolean; remaining: number; reset_at: Date; retry_after: number | null }>(
            'SELECT * FROM public.consume_rate_limit($1, $2, $3, $4)',
            [identifier, action, config.windowMs, config.maxRequests]
        );
        const row = result.rows[0];
        if (!row) throw new Error('Rate limit returned no result');
        if (!row.allowed) {
            logger.warn('Rate limit exceeded', {
                identifier: identifier.includes('@') ? identifier.replace(/(.{2}).*@/, '$1***@') : identifier,
                action,
                limit: config.maxRequests,
            });
            return { allowed: false, remaining: 0, resetAt: row.reset_at, retryAfter: row.retry_after ?? 60 };
        }

        return { allowed: true, remaining: row.remaining, resetAt: row.reset_at };

    } catch (error) {
        // Fail closed for security - deny requests when rate limit check fails
        logger.error('Rate limit check failed, denying request (fail-closed)', error);
        return {
            allowed: false,
            remaining: 0,
            resetAt,
            retryAfter: 60,
        };
    }
}

/**
 * Create rate limit response headers
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetAt.toISOString(),
    };

    if (result.retryAfter) {
        headers['Retry-After'] = result.retryAfter.toString();
    }

    return headers;
}

/**
 * Create rate limit exceeded response
 */
export function createRateLimitResponse(
    result: RateLimitResult,
    corsHeaders: Record<string, string>
): {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
} {
    return {
        statusCode: 429,
        headers: {
            ...corsHeaders,
            ...getRateLimitHeaders(result),
        },
        body: JSON.stringify({
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
                retryAfter: result.retryAfter,
            },
        }),
    };
}

/**
 * Rate limit middleware for magic link requests
 */
export async function rateLimitMagicLink(email: string): Promise<RateLimitResult> {
    return checkRateLimit(email.toLowerCase(), 'magic_link', RATE_LIMITS.magicLink);
}

/**
 * Rate limit middleware for login attempts
 */
export async function rateLimitLogin(ip: string): Promise<RateLimitResult> {
    return checkRateLimit(ip, 'login', RATE_LIMITS.login);
}

/**
 * Rate limit middleware for general API requests
 */
export async function rateLimitApi(userId: string): Promise<RateLimitResult> {
    return checkRateLimit(userId, 'api', RATE_LIMITS.api);
}

/**
 * Rate limit middleware for sensitive operations
 */
export async function rateLimitStrict(identifier: string): Promise<RateLimitResult> {
    return checkRateLimit(identifier, 'api_strict', RATE_LIMITS.apiStrict);
}
