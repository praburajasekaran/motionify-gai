import { compose, withCORS, withAuth, withRateLimit, type NetlifyEvent, type AuthResult, type NetlifyResponse } from './_shared/middleware';
import { RATE_LIMITS } from './_shared/rateLimit';
import { query } from './_shared/db';

export const handler = compose(
    withCORS(['GET']),
    withRateLimit(RATE_LIMITS.api, 'auth_me'),
    withAuth()
)(async (event: NetlifyEvent, auth?: AuthResult) => {
    // Fetch timezone from user_preferences (non-critical, fall back to null)
    let timezone: string | null = null;
    try {
        const result = await query(
            'SELECT timezone FROM user_preferences WHERE user_id = $1',
            [auth!.user!.userId]
        );
        if (result.rows.length > 0) {
            timezone = result.rows[0].timezone;
        }
    } catch (e) {
        // Non-critical — fall back to browser default
    }

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
                timezone,
            },
        }),
    };
});
