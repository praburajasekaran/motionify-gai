import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js API route proxy for auth-request-magic-link
 * Proxies to Netlify function in development
 * 
 * To use this in development, either:
 * 1. Run `netlify dev` (recommended - runs both Next.js and Netlify functions)
 * 2. Set NETLIFY_FUNCTIONS_URL environment variable to point to Netlify Dev server
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Try to proxy to Netlify Dev server
        const netlifyFunctionUrl = process.env.NETLIFY_FUNCTIONS_URL || 'http://localhost:8888/.netlify/functions/auth-request-magic-link';
        
        const response = await fetch(netlifyFunctionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        console.error('Error proxying auth-request-magic-link:', error);
        return NextResponse.json(
            { 
                error: 'Failed to request magic link', 
                message: error.message,
                hint: 'Make sure Netlify Dev is running. Run: netlify dev (from project root)'
            },
            { status: 500 }
        );
    }
}
