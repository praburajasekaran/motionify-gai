/**
 * Scheduled Token Cleanup Job
 *
 * Runs daily to clean up expired tokens and sessions:
 * - Expired magic link tokens (> 24 hours old)
 * - Expired sessions
 * - Old rate limit entries
 *
 * Schedule: Daily at 3:00 AM UTC
 */

import type { Config, Context } from '@netlify/functions';
import { getPool, createLogger, generateCorrelationId } from './_shared';

export default async function handler(req: Request, context: Context) {
    const correlationId = generateCorrelationId();
    const logger = createLogger('scheduled-token-cleanup', correlationId);

    logger.info('Starting scheduled token cleanup');

    const pool = getPool();

    try {
        // 1. Delete expired magic link tokens (expired > 24 hours ago)
        const magicLinkResult = await pool.query(`
            DELETE FROM magic_link_tokens
            WHERE expires_at < NOW() - INTERVAL '24 hours'
        `);

        // 2. Delete expired sessions
        const sessionResult = await pool.query(`
            DELETE FROM sessions
            WHERE expires_at < NOW()
        `);

        // 3. Delete old pending inquiry verifications (expired > 24 hours ago)
        const inquiryVerificationResult = await pool.query(`
            DELETE FROM pending_inquiry_verifications
            WHERE expires_at < NOW() - INTERVAL '24 hours'
        `);

        // 4. Delete old rate limit entries (> 2 hours old)
        let rateLimitDeleted = 0;
        try {
            const rateLimitResult = await pool.query(`
                DELETE FROM rate_limit_entries
                WHERE created_at < NOW() - INTERVAL '2 hours'
            `);
            rateLimitDeleted = rateLimitResult.rowCount || 0;
        } catch (error) {
            // Rate limit table might not exist yet
            logger.warn('Rate limit cleanup skipped (table may not exist)');
        }

        const stats = {
            magicLinksDeleted: magicLinkResult.rowCount || 0,
            sessionsDeleted: sessionResult.rowCount || 0,
            pendingInquiriesDeleted: inquiryVerificationResult.rowCount || 0,
            rateLimitEntriesDeleted: rateLimitDeleted,
        };

        logger.info('Token cleanup completed', stats);

        return new Response(
            JSON.stringify({
                success: true,
                ...stats,
                timestamp: new Date().toISOString(),
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    } catch (error) {
        logger.error('Token cleanup failed', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}

// Netlify Scheduled Function configuration
// Runs daily at 3:00 AM UTC
export const config: Config = {
    schedule: '0 3 * * *',
};
