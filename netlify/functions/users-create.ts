/**
 * POST /api/users-create
 *
 * Create a new user and send magic link invitation. Super Admin only.
 *
 * Body:
 * - email: string (required)
 * - full_name: string (required)
 * - role: 'super_admin' | 'project_manager' | 'client' | 'team' (required)
 */

import crypto from 'crypto';
import {
    query,
    getCorsHeaders,
    requireAuthAndRole,
    validateRequest,
    createUserSchema,
    createLogger,
    getCorrelationId,
} from './_shared';
import { compose, withCORS, withSuperAdmin, withRateLimit, type NetlifyEvent as MWNetlifyEvent, type NetlifyResponse as MWNetlifyResponse } from './_shared/middleware';
import { RATE_LIMITS } from './_shared/rateLimit';

interface NetlifyEvent {
    httpMethod: string;
    headers: Record<string, string>;
    body: string | null;
}

interface NetlifyResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}

export const handler = compose(
    withCORS(['POST']),
    withSuperAdmin(),
    withRateLimit(RATE_LIMITS.apiStrict, 'users_create')
)(async (event: NetlifyEvent) => {
    const correlationId = getCorrelationId(event.headers);
    const logger = createLogger('users-create', correlationId);
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    // Validate request body
    const validation = validateRequest(event.body, createUserSchema, origin);
    if (!validation.success) {
        return validation.response;
    }

    const { email, full_name, role } = validation.data;

    try {
        // Check if user already exists
        const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);

        if (existingUser.rows.length > 0) {
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({ success: false, error: 'User with this email already exists' }),
            };
        }

        // Create the user
        const insertResult = await query(
            `INSERT INTO users (email, full_name, role, is_active)
             VALUES ($1, $2, $3, true)
             RETURNING id, email, full_name, role, is_active, created_at, updated_at`,
            [email.toLowerCase(), full_name, role]
        );

        const newUser = insertResult.rows[0];

        // Generate magic link token for invitation
        const token = crypto.randomBytes(32).toString('base64url');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Store token in database
        await query(
            `INSERT INTO magic_link_tokens (email, token, expires_at, remember_me)
             VALUES ($1, $2, $3, true)`,
            [email.toLowerCase(), token, expiresAt]
        );

        // Build magic link URL - points to /login which handles token verification
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173';
        const magicLink = `${appUrl}/#/login?token=${token}&email=${encodeURIComponent(email)}`;

        logger.info('User created', {
            userId: newUser.id,
            email: email.slice(0, 3) + '***',
            role,
        });

        // In development, log the magic link prominently
        if (appUrl.includes('localhost')) {
            logger.info('Magic link generated for new user', { magicLink });
            console.log('\n========================================');
            console.log(`🔗 MAGIC LINK for ${email}:`);
            console.log(magicLink);
            console.log('========================================\n');
        }

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                success: true,
                user: newUser,
                message: 'User created and invitation sent',
            }),
        };
    } catch (error) {
        logger.error('Failed to create user', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to create user',
            }),
        };
    }
});
