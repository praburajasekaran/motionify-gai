import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { readJSON, writeJSON, STORAGE_FILES } from '@/lib/storage';

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

interface PendingVerification {
    id: string;
    email: string;
    token: string;
    payload: InquiryVerificationPayload;
    expiresAt: string;
    createdAt: string;
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

// We need a separate storage file for pending verifications
const PENDING_VERIFICATIONS_FILE = 'pending-verifications.json';

export async function POST(request: NextRequest) {
    try {
        const body: InquiryVerificationPayload = await request.json();
        const { contactEmail, contactName, recommendedVideoType } = body;

        if (!contactEmail || !contactName) {
            return NextResponse.json(
                { error: 'Name and email are required' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Generate token
        const token = crypto.randomBytes(32).toString('base64url');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

        // Read existing pending verifications
        const pendingVerifications = await readJSON<PendingVerification>(PENDING_VERIFICATIONS_FILE);

        // Create new pending verification
        const verification: PendingVerification = {
            id: crypto.randomUUID(),
            email: contactEmail.toLowerCase(),
            token,
            payload: body,
            expiresAt: expiresAt.toISOString(),
            createdAt: new Date().toISOString(),
        };

        pendingVerifications.push(verification);
        await writeJSON(PENDING_VERIFICATIONS_FILE, pendingVerifications);

        // Generate magic link (for development, we log it)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const magicLink = `${appUrl}/auth/verify?token=${token}&type=inquiry`;

        // Log for dev (keep for debugging)
        console.log(`✨ Inquiry Verification Magic Link for ${contactEmail}:`);
        console.log(magicLink);

        // In a production environment, you would send an email here
        // For now, we just return success and log the link
        console.log(`✅ Verification request created for ${contactEmail}`);

        return NextResponse.json(
            {
                success: true,
                message: 'Verification email sent',
                // Include magic link in development for testing
                ...(process.env.NODE_ENV === 'development' && { magicLink }),
            },
            { status: 200, headers: corsHeaders }
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Inquiry verification request error:', message);
        return NextResponse.json(
            { error: 'Internal server error', message },
            { status: 500, headers: corsHeaders }
        );
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}
