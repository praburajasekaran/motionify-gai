import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js API route proxy for auth-logout
 * Proxies to Netlify function in development
 */
export async function POST(request: NextRequest) {
    try {
        const cookies = request.headers.get('cookie') || '';
        const functionsBase = process.env.NETLIFY_FUNCTIONS_URL || 'http://localhost:8888/.netlify/functions';
        const netlifyFunctionUrl = `${functionsBase}/auth-logout`;
        
        const response = await fetch(netlifyFunctionUrl, {
            method: 'POST',
            headers: {
                'Cookie': cookies,
            },
        });

        const data = await response.json().catch(() => ({ message: 'Logged out' }));
        const nextResponse = NextResponse.json(data, { status: response.status });
        
        // Forward Set-Cookie header if present
        const setCookie = response.headers.get('Set-Cookie');
        if (setCookie) {
            nextResponse.headers.set('Set-Cookie', setCookie);
        }
        
        return nextResponse;
    } catch (error: any) {
        console.error('Error proxying auth-logout:', error);
        return NextResponse.json(
            { 
                error: 'Failed to logout', 
                message: error.message,
                hint: 'Make sure Netlify Dev is running. Run: netlify dev (from project root)'
            },
            { status: 500 }
        );
    }
}
