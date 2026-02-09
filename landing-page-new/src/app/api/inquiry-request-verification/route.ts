import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js API route proxy for inquiry-request-verification
 * Proxies to Netlify function in development
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const functionsBase = process.env.NETLIFY_FUNCTIONS_URL
            || 'http://localhost:8888/.netlify/functions';
        const netlifyFunctionUrl = `${functionsBase}/inquiry-request-verification`;

        console.log('[inquiry-request-verification proxy] Proxying to:', netlifyFunctionUrl);

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
            console.error('[inquiry-request-verification proxy] Non-JSON response:', responseText.substring(0, 200));
            return NextResponse.json(
                {
                    success: false,
                    error: 'Function not available',
                    message: 'The inquiry service is not available. Please make sure Netlify Dev is running.',
                    hint: 'Run: netlify dev (from project root)'
                },
                { status: 503, headers: corsHeaders }
            );
        }

        console.log('[inquiry-request-verification proxy] Response status:', response.status, 'success:', data.success);

        return NextResponse.json(data, { status: response.status, headers: corsHeaders });
    } catch (error: any) {
        console.error('[inquiry-request-verification proxy] Error:', error);

        // Check if it's a connection error
        if (error.message?.includes('fetch failed') || error.code === 'ECONNREFUSED') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Service unavailable',
                    message: 'Cannot connect to inquiry service. Please make sure Netlify Dev is running.',
                    hint: 'Run: netlify dev (from project root)'
                },
                { status: 503, headers: corsHeaders }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                message: error.message || 'An unexpected error occurred',
                hint: 'Make sure Netlify Dev is running. Run: netlify dev (from project root)'
            },
            { status: 500, headers: corsHeaders }
        );
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}
