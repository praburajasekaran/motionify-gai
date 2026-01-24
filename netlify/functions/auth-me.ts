import { requireAuthFromCookie, createUnauthorizedResponseForCookie } from './_shared/auth';
import { getCorsHeaders, validateCors } from './_shared';

export const handler = async (event: any) => {
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    const corsResult = validateCors(event);
    if (corsResult) return corsResult;

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    const auth = await requireAuthFromCookie(event);
    if (!auth.authorized) {
        return createUnauthorizedResponseForCookie(auth, origin);
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            user: {
                id: auth.user!.userId,
                email: auth.user!.email,
                role: auth.user!.role,
                name: auth.user!.fullName,
            },
        }),
    };
};
