import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js API route proxy for auth-me
 * Proxies to Netlify function in development
 */
export async function GET(request: NextRequest) {
    try {
        const cookies = request.headers.get('cookie') || '';
        const functionsBase = process.env.NETLIFY_FUNCTIONS_URL || 'http://localhost:8888/.netlify/functions';
        const netlifyFunctionUrl = `${functionsBase}/auth-me`;
        
        const response = await fetch(netlifyFunctionUrl, {
            method: 'GET',
            headers: {
                'Cookie': cookies,
            },
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        console.error('Error proxying auth-me:', error);
        return NextResponse.json(
            { 
                error: 'Failed to get current user', 
                message: error.message,
                hint: 'Make sure Netlify Dev is running. Run: netlify dev (from project root)'
            },
            { status: 500 }
        );
    }
}
