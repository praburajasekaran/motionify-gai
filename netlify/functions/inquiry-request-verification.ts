import { query as dbQuery } from './_shared/db';
import crypto from 'crypto';
import { sendInquiryVerificationEmail } from './send-email';
import { compose, withCORS, withRateLimit, type NetlifyEvent, type NetlifyResponse } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { absoluteInquiryVerificationUrl, appOriginFromEnv } from '../../shared/canonical-links';
import { getAppEnvironment } from './_shared/app-env';
import { createLogger, getCorrelationId } from './_shared/logger';

interface QuizSelections {
    niche?: string | null;
    audience?: string | null;
    style?: string | null;
    mood?: string | null;
    duration?: string | null;
}

interface InquiryVerificationPayload {
    contactName: string;
    contactEmail: string;
    companyName?: string;
    contactPhone?: string;
    projectNotes?: string;
    quizAnswers: QuizSelections;
    recommendedVideoType: string;
}

export const handler = compose(
    withCORS(['POST', 'OPTIONS']),
    withRateLimit(RATE_LIMITS.authAction, 'inquiry_verification')
)(async (event: NetlifyEvent) => {
    const correlationId = getCorrelationId(event.headers);
    const logger = createLogger('inquiry-request-verification', correlationId);
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        const payload: InquiryVerificationPayload = JSON.parse(event.body || '{}');
        const { contactEmail, contactName, recommendedVideoType } = payload;

        if (!contactEmail || !contactName) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Name and email are required' }),
            };
        }

        // Generate token
        const token = crypto.randomBytes(32).toString('base64url');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry for inquiries

        // Store in pending_inquiry_verifications
        await dbQuery(
            `INSERT INTO pending_inquiry_verifications (
        email, token, payload, expires_at
      ) VALUES ($1, $2, $3, $4)`,
            [
                contactEmail.toLowerCase(),
                token,
                JSON.stringify(payload),
                expiresAt
            ]
        );

        // Generate public inquiry verification link
        const magicLink = absoluteInquiryVerificationUrl({ token }, appOriginFromEnv(process.env));

        if (getAppEnvironment(process.env) === 'development') {
            logger.debug('Inquiry verification link generated for local development', { magicLink });
        }

        // Send the actual verification email
        const emailResult = await sendInquiryVerificationEmail({
            to: contactEmail,
            contactName: contactName,
            magicLink: magicLink,
            recommendedVideoType: recommendedVideoType || 'Video',
            correlationId,
        });

        if (emailResult.status === 'failed') {
            await dbQuery(
                'DELETE FROM pending_inquiry_verifications WHERE token = $1',
                [token]
            );
            logger.error('Inquiry verification email delivery failed', undefined, {
                providerCode: emailResult.code,
                retryable: emailResult.retryable,
            });
            return {
                statusCode: 503,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: {
                        code: 'EMAIL_DELIVERY_FAILED',
                        message: 'We could not send the verification email. Please try again.',
                    },
                }),
            };
        }

        const isDev = getAppEnvironment(process.env) === 'development';

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Verification email sent',
                ...(isDev && { magicLink }),
            }),
        };

    } catch (error) {
        logger.error('Inquiry verification request failed', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
            }),
        };
    }
});
