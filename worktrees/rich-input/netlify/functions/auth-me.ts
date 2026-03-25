import { compose, withCORS, withAuth, withRateLimit, type NetlifyEvent, type AuthResult, type NetlifyResponse } from './_shared/middleware';
import { RATE_LIMITS } from './_shared/rateLimit';

export const handler = compose(
    withCORS(['GET']),
    withRateLimit(RATE_LIMITS.api, 'auth_me'),
    withAuth()
)(async (event: NetlifyEvent, auth?: AuthResult) => {
    return {
        statusCode: 200,
        headers: {},
        body: JSON.stringify({
            success: true,
            user: {
                id: auth!.user!.userId,
                email: auth!.user!.email,
                role: auth!.user!.role,
                name: auth!.user!.fullName,
            },
        }),
    };
});
