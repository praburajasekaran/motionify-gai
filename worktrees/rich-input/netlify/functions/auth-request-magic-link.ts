/**
 * POST /api/auth/request-magic-link
 *
 * Request a magic link for passwordless login.
 *
 * Security:
 * - Always returns success message to prevent email enumeration
 * - Rate limited to 5 requests per hour per email
 * - If email doesn't exist, no token is created but same response is returned
 *
 * Test Cases:
 * - TC-AUTH-002: Unregistered email returns generic success
 */

import crypto from 'crypto';
import { sendEmail } from './send-email';
import {
    query,
    validateCors,
    getCorsHeaders,
    validateRequest,
    magicLinkRequestSchema,
    rateLimitMagicLink,
    createRateLimitResponse,
    createLogger,
    getCorrelationId,
} from './_shared';

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

/**
 * Send a magic link login email
 */
async function sendMagicLinkEmail(data: {
    to: string;
    userName: string;
    magicLink: string;
}) {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; color: #333; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <img src="https://motionify.studio/motionify-dark-logo.png" alt="Motionify Studio" width="180" style="display: inline-block;" />
      </div>

      <p style="margin: 0 0 16px;">Hi <strong>${data.userName}</strong>,</p>
      <p style="margin: 0 0 24px; color: #555;">Click the button below to log in to your account:</p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.magicLink}" style="background-color: #7c3aed; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 15px;">Log In</a>
      </div>

      <p style="font-size: 13px; color: #888; margin: 24px 0 0;">This link expires in 15 minutes.</p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 24px;">

      <p style="font-size: 12px; color: #aaa; text-align: center; margin: 0;">
        <a href="https://motionify.studio" style="color: #7c3aed; text-decoration: none;">motionify.studio</a>
      </p>
    </div>
  `;

    return sendEmail({
        to: data.to,
        subject: 'Log in to Motionify Portal',
        html,
    });
}

export const handler = async (event: NetlifyEvent): Promise<NetlifyResponse> => {
    const correlationId = getCorrelationId(event.headers);
    const logger = createLogger('auth-request-magic-link', correlationId);
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    // Handle CORS
    const corsResult = validateCors(event);
    if (corsResult) {
        return corsResult;
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    // Validate request body
    const validation = validateRequest(event.body, magicLinkRequestSchema, origin);
    if (!validation.success) {
        return validation.response;
    }

    const { email, rememberMe } = validation.data;

    // Rate limit check
    const rateLimitResult = await rateLimitMagicLink(email);
    if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded for magic link request', { email: email.slice(0, 3) + '***' });
        return createRateLimitResponse(rateLimitResult, headers);
    }

    try {
        // Check if user exists - but don't reveal this in response (TC-AUTH-002)
        const userResult = await query(
            'SELECT id, email, full_name, role FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        // Always return same success message (security - prevent email enumeration)
        const successResponse = {
            success: true,
            message: 'If this email exists in our system, a magic link has been sent. Check your inbox.',
        };

        // If user doesn't exist, just return success without creating token
        // This satisfies TC-AUTH-002: Unregistered email returns generic success
        if (userResult.rows.length === 0) {
            logger.info('Magic link requested for unregistered email', { email: email.slice(0, 3) + '***' });
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(successResponse),
            };
        }

        const user = userResult.rows[0];

        // Generate secure token
        const token = crypto.randomBytes(32).toString('base64url');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Store token in database
        await query(
            `INSERT INTO magic_link_tokens (email, token, expires_at, remember_me)
             VALUES ($1, $2, $3, $4)`,
            [email.toLowerCase(), token, expiresAt, rememberMe]
        );

        // Build magic link URL
        const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || process.env.PORTAL_URL || 'http://localhost:5173';
        const magicLink = `${portalUrl}/login?token=${token}&email=${encodeURIComponent(email)}`;

        // Send the magic link email
        const emailResult = await sendMagicLinkEmail({
            to: email,
            userName: user.full_name || email.split('@')[0],
            magicLink,
        });

        // DEVELOPMENT: Always log the magic link for local testing
        const isLocalDev = portalUrl.includes('localhost');
        if (isLocalDev) {
            logger.info('Magic link generated for local testing', { magicLink });
        }

        if (emailResult) {
            logger.info('Magic link email sent', { email: email.slice(0, 3) + '***' });
        } else {
            logger.error('Failed to send magic link email', undefined, { email: email.slice(0, 3) + '***' });
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(successResponse),
        };

    } catch (error) {
        logger.error('Magic link request failed', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'An error occurred. Please try again.',
                },
            }),
        };
    }
};
