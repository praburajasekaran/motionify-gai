import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js API route proxy for auth-verify-magic-link
 * Proxies to Netlify function in development
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const netlifyFunctionUrl = process.env.NETLIFY_FUNCTIONS_URL || 'http://localhost:8888/.netlify/functions/auth-verify-magic-link';
        
        const response = await fetch(netlifyFunctionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        // Get response text first to check if it's JSON
        const responseText = await response.text();
        let data;
        
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            // If response is not JSON, it's likely an error from Netlify
            console.error('Non-JSON response from Netlify function:', responseText.substring(0, 200));
            return NextResponse.json(
                { 
                    error: 'Function not available',
                    code: 'FUNCTION_ERROR',
                    message: 'The authentication service is not available. Please make sure Netlify Dev is running.',
                    hint: 'Run: netlify dev (from project root)'
                },
                { status: 503 }
            );
        }

        // Forward Set-Cookie header if present before creating response
        const setCookie = response.headers.get('Set-Cookie');
        
        const nextResponse = NextResponse.json(data, { status: response.status });
        
        if (setCookie) {
            nextResponse.headers.set('Set-Cookie', setCookie);
        }
        
        return nextResponse;
    } catch (error: any) {
        console.error('Error proxying auth-verify-magic-link:', error);
        
        // Check if it's a connection error
        if (error.message?.includes('fetch failed') || error.code === 'ECONNREFUSED') {
            return NextResponse.json(
                { 
                    error: 'Service unavailable',
                    code: 'SERVICE_UNAVAILABLE',
                    message: 'Cannot connect to authentication service. Please make sure Netlify Dev is running.',
                    hint: 'Run: netlify dev (from project root)'
                },
                { status: 503 }
            );
        }
        
        return NextResponse.json(
            { 
                error: 'Failed to verify magic link', 
                code: 'VERIFY_FAILED',
                message: error.message || 'An unexpected error occurred',
                hint: 'Make sure Netlify Dev is running. Run: netlify dev (from project root)'
            },
            { status: 500 }
        );
    }
}
