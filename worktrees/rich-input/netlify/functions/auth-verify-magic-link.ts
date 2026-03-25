/**
 * GET /api/auth/verify-magic-link?token=xxx&email=xxx
 * POST /api/auth/verify-magic-link { token, email }
 *
 * Verify magic link token and create session.
 * Handles both standard auth magic links and inquiry verification links.
 */

import crypto from 'crypto';
import { sendNewInquiryNotificationEmail } from './send-email';
import {
    query,
    transaction,
    validateCors,
    getCorsHeaders,
    createJWT,
    validateRequest,
    magicLinkVerifySchema,
    rateLimitLogin,
    getClientIP,
    createRateLimitResponse,
    createLogger,
    getCorrelationId,
} from './_shared';
import type { PoolClient } from './_shared';
import { generateJWT, createAuthCookie } from './_shared/jwt';

interface NetlifyEvent {
    httpMethod: string;
    headers: Record<string, string>;
    body: string | null;
    queryStringParameters: Record<string, string> | null;
}

interface NetlifyResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}

const generateInquiryNumber = async (client: PoolClient): Promise<string> => {
    const year = new Date().getFullYear();

    const result = await client.query(
        `SELECT inquiry_number FROM inquiries
         WHERE inquiry_number LIKE $1
         ORDER BY inquiry_number DESC LIMIT 1`,
        [`INQ-${year}-%`]
    );

    let maxNumber = 0;
    if (result.rows.length > 0) {
        const match = result.rows[0].inquiry_number.match(/INQ-\d{4}-(\d+)/);
        if (match) {
            maxNumber = parseInt(match[1], 10);
        }
    }

    const nextNumber = maxNumber + 1;
    return `INQ-${year}-${String(nextNumber).padStart(3, '0')}`;
};

export const handler = async (event: NetlifyEvent): Promise<NetlifyResponse> => {
    const correlationId = getCorrelationId(event.headers);
    const logger = createLogger('auth-verify-magic-link', correlationId);
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    // Handle CORS
    const corsResult = validateCors(event);
    if (corsResult) {
        return corsResult;
    }

    // Rate limit by IP
    const clientIP = getClientIP(event.headers);
    const rateLimitResult = await rateLimitLogin(clientIP);
    if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded for login verification', { ip: clientIP.slice(0, 10) + '***' });
        return createRateLimitResponse(rateLimitResult, headers);
    }

    let token: string | undefined;
    let email: string | undefined;

    // Support both GET (query params) and POST (body)
    if (event.httpMethod === 'GET') {
        token = event.queryStringParameters?.token;
        email = event.queryStringParameters?.email;
    } else if (event.httpMethod === 'POST') {
        const validation = validateRequest(event.body, magicLinkVerifySchema, origin);
        if (!validation.success) {
            return validation.response;
        }
        token = validation.data.token;
        email = validation.data.email;
    } else {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    // Validate token exists
    if (!token) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: {
                    code: 'TOKEN_INVALID',
                    message: 'Token is required',
                    field: 'token',
                },
            }),
        };
    }

    try {
        // Use transaction for atomic operations
        const result = await transaction(async (client) => {
            let userId: string;
            let userEmail: string;
            let userFullName: string;
            let userRole: string;
            let userAvatar: string | null = null;
            let rememberMe = false;
            let isNewInquiry = false;
            let inquiryId: string | undefined;
            let createdInquiryNumber: string | undefined;

            // 1. Try to find standard Auth Magic Link
            const authLinkResult = await client.query(
                `SELECT id, email, token, expires_at, used_at, remember_me
                 FROM magic_link_tokens
                 WHERE token = $1`,
                [token]
            );

            if (authLinkResult.rows.length > 0) {
                const tokenRecord = authLinkResult.rows[0];

                // Validate email if provided
                if (email && tokenRecord.email.toLowerCase() !== email.toLowerCase()) {
                    throw {
                        statusCode: 401,
                        code: 'INVALID_EMAIL',
                        message: 'Email does not match token',
                    };
                }

                userEmail = tokenRecord.email;
                rememberMe = tokenRecord.remember_me;

                if (tokenRecord.used_at !== null) {
                    throw {
                        statusCode: 401,
                        code: 'TOKEN_ALREADY_USED',
                        message: 'This magic link has already been used. Please request a new one.',
                    };
                }

                if (new Date() > new Date(tokenRecord.expires_at)) {
                    throw {
                        statusCode: 401,
                        code: 'TOKEN_EXPIRED',
                        message: 'This magic link has expired. Please request a new one.',
                    };
                }

                // Mark as used
                await client.query(`UPDATE magic_link_tokens SET used_at = NOW() WHERE id = $1`, [tokenRecord.id]);

                // Get user
                const userResult = await client.query(
                    `SELECT id, email, full_name, role, profile_picture_url FROM users WHERE email = $1`,
                    [userEmail.toLowerCase()]
                );

                if (userResult.rows.length === 0) {
                    throw {
                        statusCode: 401,
                        code: 'USER_NOT_FOUND',
                        message: 'User account not found.',
                    };
                }

                const user = userResult.rows[0];
                userId = user.id;
                userFullName = user.full_name;
                userRole = user.role;
                userAvatar = user.profile_picture_url;
            } else {
                // 2. Try to find Pending Inquiry Verification
                const inquiryResult = await client.query(
                    `SELECT * FROM pending_inquiry_verifications WHERE token = $1`,
                    [token]
                );

                if (inquiryResult.rows.length === 0) {
                    throw {
                        statusCode: 401,
                        code: 'TOKEN_NOT_FOUND',
                        message: 'Invalid or expired magic link.',
                    };
                }

                const pendingInquiry = inquiryResult.rows[0];

                if (new Date() > new Date(pendingInquiry.expires_at)) {
                    throw {
                        statusCode: 401,
                        code: 'TOKEN_EXPIRED',
                        message: 'This magic link has expired.',
                    };
                }

                // Process Inquiry Verification
                const payload = pendingInquiry.payload;
                userEmail = pendingInquiry.email;

                // Delete pending record immediately to prevent reuse
                await client.query(`DELETE FROM pending_inquiry_verifications WHERE id = $1`, [pendingInquiry.id]);

                // Check if user exists
                const userCheck = await client.query(
                    `SELECT id, full_name, role, profile_picture_url FROM users WHERE email = $1`,
                    [userEmail]
                );

                if (userCheck.rows.length > 0) {
                    // Existing user
                    const user = userCheck.rows[0];
                    userId = user.id;
                    userFullName = user.full_name;
                    userRole = user.role;
                    userAvatar = user.profile_picture_url;
                } else {
                    // Create new user with info from inquiry form
                    const newUser = await client.query(
                        `INSERT INTO users (email, full_name, role) VALUES ($1, $2, 'client') RETURNING id, full_name, role`,
                        [userEmail, payload.contactName]
                    );
                    userId = newUser.rows[0].id;
                    userFullName = newUser.rows[0].full_name;
                    userRole = newUser.rows[0].role;
                }

                // Create Inquiry
                const inquiryNumber = await generateInquiryNumber(client);
                const newInquiryResult = await client.query(
                    `INSERT INTO inquiries (
                        inquiry_number, contact_name, contact_email, company_name,
                        contact_phone, project_notes, quiz_answers, recommended_video_type, client_user_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING id`,
                    [
                        inquiryNumber,
                        payload.contactName,
                        payload.contactEmail.toLowerCase(),
                        payload.companyName || null,
                        payload.contactPhone || null,
                        payload.projectNotes || null,
                        JSON.stringify(payload.quizAnswers),
                        payload.recommendedVideoType,
                        userId,
                    ]
                );

                isNewInquiry = true;
                inquiryId = newInquiryResult.rows[0].id;
                createdInquiryNumber = inquiryNumber;

                // Send notification to admin about new inquiry (async, don't wait)
                const portalUrl = process.env.PORTAL_URL || 'http://localhost:3003';
                const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@motionify.com';
                sendNewInquiryNotificationEmail({
                    to: adminEmail,
                    inquiryNumber: inquiryNumber,
                    clientName: payload.contactName,
                    clientEmail: payload.contactEmail,
                    companyName: payload.companyName,
                    recommendedVideoType: payload.recommendedVideoType,
                    portalUrl: portalUrl,
                }).catch((emailError) => {
                    logger.error('Failed to send admin notification email', emailError);
                });

                logger.info('Inquiry created', { inquiryNumber });
            }

            // 3. Create Session (Common for both flows)
            const sessionDurationSeconds = rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60;
            const sessionExpiresAt = new Date(Date.now() + sessionDurationSeconds * 1000);

            // Generate JWT using new jwt.ts module
            const user = {
                id: userId,
                email: userEmail,
                role: userRole,
                fullName: userFullName,
            };
            const jwtToken = generateJWT(user, rememberMe);
            const jwtTokenHash = crypto.createHash('sha256').update(jwtToken).digest('hex');

            await client.query(
                `INSERT INTO sessions (user_id, jwt_token_hash, remember_me, expires_at, token)
                 VALUES ($1, $2, $3, $4, $5)`,
                [userId, jwtTokenHash, rememberMe, sessionExpiresAt, crypto.randomUUID()]
            );

            await client.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [userId]);

            logger.info('User authenticated', { userId, role: userRole });

            return {
                user: {
                    id: userId,
                    email: userEmail,
                    fullName: userFullName,
                    role: userRole,
                    avatarUrl: userAvatar,
                },
                token: jwtToken,
                rememberMe: rememberMe,
                expiresAt: sessionExpiresAt.toISOString(),
                inquiryCreated: isNewInquiry,
                inquiryId: inquiryId,
                inquiryNumber: createdInquiryNumber,
            };
        });

        // Set httpOnly cookie with JWT token
        const authCookie = createAuthCookie(result.token, result.rememberMe);

        // Remove token and rememberMe from response body (token is in cookie now)
        const { token: unusedToken, rememberMe, ...dataWithoutToken } = result;

        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Set-Cookie': authCookie,
            },
            body: JSON.stringify({
                success: true,
                data: {
                    ...dataWithoutToken,
                    // Note: token NOT included in response (set in cookie only)
                },
                message: result.inquiryCreated ? 'Inquiry verified and created successfully' : 'Login successful',
            }),
        };
    } catch (error: any) {
        // Handle structured errors from transaction
        if (error.statusCode && error.code) {
            return {
                statusCode: error.statusCode,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message,
                    },
                }),
            };
        }

        logger.error('Verification failed', error);
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
