import { createClearAuthCookie } from './_shared/jwt';
import { getCorsHeaders, validateCors } from './_shared';

export const handler = async (event: any) => {
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    const corsResult = validateCors(event);
    if (corsResult) return corsResult;

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    return {
        statusCode: 200,
        headers: {
            ...headers,
            'Set-Cookie': createClearAuthCookie(),
        },
        body: JSON.stringify({ success: true, message: 'Logged out' }),
    };
};
