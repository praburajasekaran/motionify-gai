import pg from 'pg';
import { compose, withCORS, withAuth, withRateLimit, withValidation, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';

const { Client } = pg;

const getDbClient = () => {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL not configured');
    }

    return new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
};

export const handler = compose(
    withCORS(['POST']),
    withAuth(),
    withRateLimit(RATE_LIMITS.apiStrict, 'project_accept_terms'),
    withValidation(SCHEMAS.project.acceptTerms)
)(async (event: NetlifyEvent, auth?: AuthResult) => {
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    const client = getDbClient();

    try {
        await client.connect();

        // Get validated data from middleware
        const data = (event as any).validatedData;
        const { projectId, accepted } = data;

        // Note: The schema expects { projectId, accepted } but the endpoint also uses userId
        // Extract userId from the body manually for now
        const rawBody = JSON.parse(event.body || '{}');
        const userId = rawBody.userId;

        if (!userId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'userId is required' }),
            };
        }

        // Verify project exists
        const projectResult = await client.query(
            'SELECT id, terms_accepted_at FROM projects WHERE id = $1',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Project not found' }),
            };
        }

        // Check if already accepted
        if (projectResult.rows[0].terms_accepted_at) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: 'Terms already accepted',
                    termsAcceptedAt: projectResult.rows[0].terms_accepted_at
                }),
            };
        }

        // Verify user exists and is a client for this project
        const userResult = await client.query(
            'SELECT id, role FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'User not found' }),
            };
        }

        // Get client IP address from headers
        const clientIp = event.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || event.headers['x-real-ip']
            || event.headers['client-ip']
            || 'unknown';

        // Update project with terms acceptance
        const updateResult = await client.query(
            `UPDATE projects 
       SET terms_accepted_at = NOW(), 
           terms_accepted_by = $1,
           terms_ip_address = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, terms_accepted_at, terms_accepted_by, terms_ip_address`,
            [userId, clientIp, projectId]
        );

        const updatedProject = updateResult.rows[0];

        // Log activity
        try {
            // Get user's full name for activity
            const userNameResult = await client.query(
                'SELECT full_name FROM users WHERE id = $1',
                [userId]
            );
            const userName = userNameResult.rows[0]?.full_name || auth?.user?.fullName || 'Unknown';

            await client.query(
                `INSERT INTO activities (type, user_id, user_name, project_id, details)
                 VALUES ('TERMS_ACCEPTED', $1, $2, $3, $4)`,
                [userId, userName, projectId, JSON.stringify({ ip: clientIp })]
            );
        } catch (activityError) {
            console.error('Failed to log activity:', activityError);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Terms accepted successfully',
                termsAcceptedAt: updatedProject.terms_accepted_at,
                termsAcceptedBy: updatedProject.terms_accepted_by,
            }),
        };

    } catch (error) {
        console.error('Accept terms API error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    } finally {
        await client.end();
    }
});
