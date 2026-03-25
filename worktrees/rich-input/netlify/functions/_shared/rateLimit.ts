/**
 * Shared Rate Limiting Module
 *
 * Provides rate limiting using database-backed tracking:
 * - Per-IP rate limiting for anonymous requests
 * - Per-user rate limiting for authenticated requests
 * - Configurable time windows and limits
 * - Automatic cleanup of old entries
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
 * Check rate limit using database
 * Creates rate_limit_entries table if it doesn't exist
 */
export async function checkRateLimit(
    identifier: string,
    action: string,
    config: RateLimitConfig
): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = new Date(now - config.windowMs);
    const resetAt = new Date(now + config.windowMs);

    try {
        // Ensure table exists (idempotent)
        await query(`
            CREATE TABLE IF NOT EXISTS rate_limit_entries (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                identifier VARCHAR(255) NOT NULL,
                action VARCHAR(100) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT rate_limit_unique UNIQUE (identifier, action, created_at)
            )
        `);

        // Create index if not exists
        await query(`
            CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup
            ON rate_limit_entries (identifier, action, created_at)
        `);

        // Count requests in current window
        const countResult = await query<{ count: string }>(
            `SELECT COUNT(*) as count FROM rate_limit_entries
             WHERE identifier = $1 AND action = $2 AND created_at > $3`,
            [identifier, action, windowStart]
        );

        const currentCount = parseInt(countResult.rows[0].count, 10);
        const remaining = Math.max(0, config.maxRequests - currentCount);

        if (currentCount >= config.maxRequests) {
            // Rate limited
            const oldestInWindow = await query<{ created_at: Date }>(
                `SELECT created_at FROM rate_limit_entries
                 WHERE identifier = $1 AND action = $2 AND created_at > $3
                 ORDER BY created_at ASC LIMIT 1`,
                [identifier, action, windowStart]
            );

            let retryAfter = Math.ceil(config.windowMs / 1000);
            if (oldestInWindow.rows.length > 0) {
                const oldest = new Date(oldestInWindow.rows[0].created_at).getTime();
                retryAfter = Math.ceil((oldest + config.windowMs - now) / 1000);
            }

            logger.warn('Rate limit exceeded', {
                identifier: identifier.includes('@') ? identifier.replace(/(.{2}).*@/, '$1***@') : identifier,
                action,
                currentCount,
                limit: config.maxRequests,
            });

            return {
                allowed: false,
                remaining: 0,
                resetAt,
                retryAfter,
            };
        }

        // Record this request
        await query(
            `INSERT INTO rate_limit_entries (identifier, action) VALUES ($1, $2)`,
            [identifier, action]
        );

        // Cleanup old entries (async, don't wait)
        cleanupOldEntries(config.windowMs).catch(err => {
            logger.error('Rate limit cleanup failed', err);
        });

        return {
            allowed: true,
            remaining: remaining - 1,
            resetAt,
        };

    } catch (error) {
        // On error, allow the request (fail open) but log
        logger.error('Rate limit check failed', error);
        return {
            allowed: true,
            remaining: config.maxRequests,
            resetAt,
        };
    }
}

/**
 * Cleanup old rate limit entries
 */
async function cleanupOldEntries(windowMs: number): Promise<void> {
    const cutoff = new Date(Date.now() - windowMs * 2); // Keep 2x window for safety

    await query(
        `DELETE FROM rate_limit_entries WHERE created_at < $1`,
        [cutoff]
    );
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
