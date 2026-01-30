import pg from 'pg';
import crypto from 'crypto';
import { sendInquiryVerificationEmail } from './send-email';
import { compose, withCORS, withRateLimit, type NetlifyEvent, type NetlifyResponse } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';

const { Client } = pg;

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

const getDbClient = () => {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL not configured');
    }

    return new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
};

export const handler = compose(
    withCORS(['POST', 'OPTIONS']),
    withRateLimit(RATE_LIMITS.authAction, 'inquiry_verification')
)(async (event: NetlifyEvent) => {
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    const client = getDbClient();

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

        await client.connect();

        // Generate token
        const token = crypto.randomBytes(32).toString('base64url');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry for inquiries

        // Store in pending_inquiry_verifications
        await client.query(
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

        // Generate magic link
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const magicLink = `${appUrl}/auth/verify?token=${token}&type=inquiry`;

        // Log for dev (keep for debugging)
        console.log(`✨ Inquiry Verification Magic Link for ${contactEmail}:`);
        console.log(magicLink);

        // Send the actual verification email
        try {
            await sendInquiryVerificationEmail({
                to: contactEmail,
                contactName: contactName,
                magicLink: magicLink,
                recommendedVideoType: recommendedVideoType || 'Video',
            });
            console.log(`✅ Verification email sent to ${contactEmail}`);
        } catch (emailError) {
            console.error('❌ Failed to send verification email:', emailError);
            // Don't fail the request if email fails - token is already created
            // and link is logged to console for dev testing
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Verification email sent'
            }),
        };

    } catch (error) {
        console.error('Inquiry verification request error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    } finally {
        await client.end();
    }
});
