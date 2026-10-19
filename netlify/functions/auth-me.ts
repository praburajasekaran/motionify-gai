import { compose, withCORS, withAuth, withRateLimit, type NetlifyEvent, type AuthResult, type NetlifyResponse } from './_shared/middleware';
import { RATE_LIMITS } from './_shared/rateLimit';
import { query } from './_shared/db';
import { readProjectMemberships } from './_shared/project-memberships';

export const handler = compose(
    withCORS(['GET']),
    withAuth(),
    withRateLimit(RATE_LIMITS.api, 'auth_me')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
    // Fetch current profile data, timezone, and project count in parallel.
    // The JWT proves identity, but the response should reflect profile edits.
    let profile = {
        email: auth!.user!.email,
        role: auth!.user!.role,
        name: auth!.user!.fullName,
    };
    let timezone: string | null = null;
    let projectCount: number | undefined;
    let projectTeamMemberships: Record<string, {
        projectId: string;
        isPrimaryContact: boolean;
        joinedAt?: string;
    }> = {};

    try {
        const [profileResult, preferencesResult, memberships] = await Promise.all([
            query('SELECT email, full_name, role FROM users WHERE id = $1', [auth!.user!.userId]),
            query('SELECT timezone FROM user_preferences WHERE user_id = $1', [auth!.user!.userId]),
            readProjectMemberships(auth!.user!.userId),
        ]);

        if (profileResult.rows.length > 0) {
            profile = {
                email: profileResult.rows[0].email,
                role: profileResult.rows[0].role,
                name: profileResult.rows[0].full_name,
            };
        }
        if (preferencesResult.rows.length > 0) {
            timezone = preferencesResult.rows[0].timezone;
        }
        projectTeamMemberships = memberships;
        if (auth!.user!.role === 'client') {
            projectCount = Object.keys(projectTeamMemberships).length;
        }
    } catch (e) {
        // Non-critical — fall back to token profile and browser defaults
    }

    return {
        statusCode: 200,
        headers: {},
        body: JSON.stringify({
            success: true,
            user: {
                id: auth!.user!.userId,
                email: profile.email,
                role: profile.role,
                name: profile.name,
                timezone,
                projectTeamMemberships,
                ...(projectCount !== undefined && { projectCount }),
            },
        }),
    };
});
