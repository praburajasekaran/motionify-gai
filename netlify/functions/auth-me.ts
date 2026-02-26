import { compose, withCORS, withAuth, withRateLimit, type NetlifyEvent, type AuthResult, type NetlifyResponse } from './_shared/middleware';
import { RATE_LIMITS } from './_shared/rateLimit';
import { query } from './_shared/db';

export const handler = compose(
    withCORS(['GET']),
    withRateLimit(RATE_LIMITS.api, 'auth_me'),
    withAuth()
)(async (event: NetlifyEvent, auth?: AuthResult) => {
    // Fetch timezone and project count in parallel (both non-critical, fall back gracefully)
    let timezone: string | null = null;
    let projectCount: number | undefined;

    try {
        const queries = [
            query('SELECT timezone FROM user_preferences WHERE user_id = $1', [auth!.user!.userId]),
        ];

        // For client users, include project count to avoid an extra redirect fetch
        if (auth!.user!.role === 'client') {
            queries.push(
                query('SELECT COUNT(*)::int as count FROM project_members WHERE user_id = $1', [auth!.user!.userId])
            );
        }

        const results = await Promise.all(queries);

        if (results[0].rows.length > 0) {
            timezone = results[0].rows[0].timezone;
        }
        if (results[1]?.rows.length > 0) {
            projectCount = results[1].rows[0].count;
        }
    } catch (e) {
        // Non-critical — fall back to browser defaults
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
                ...(projectCount !== undefined && { projectCount }),
            },
        }),
    };
});
