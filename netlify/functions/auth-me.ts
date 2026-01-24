import { compose, withCORS, withAuth, withRateLimit, type NetlifyEvent, type AuthResult } from './_shared/middleware';
import { RATE_LIMITS } from './_shared/rateLimit';
import { getCorsHeaders } from './_shared/cors';

export const handler = compose(
    withCORS(['GET']),
    withAuth(),
    withRateLimit(RATE_LIMITS.api, 'auth_me')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            user: {
                id: auth!.user!.userId,
                email: auth!.user!.email,
                role: auth!.user!.role,
                name: auth!.user!.fullName,
            },
        }),
    };
});
