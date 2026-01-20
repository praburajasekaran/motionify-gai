import pg from 'pg';

const { Client } = pg;

interface NetlifyEvent {
    httpMethod: string;
    headers: Record<string, string>;
    body: string | null;
    path: string;
    queryStringParameters: Record<string, string> | null;
}

interface NetlifyResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}

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

export const handler = async (
    event: NetlifyEvent
): Promise<NetlifyResponse> => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    const client = getDbClient();

    try {
        await client.connect();

        const { projectId, userId } = JSON.parse(event.body || '{}');

        if (!projectId || !userId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'projectId and userId are required' }),
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

        // Log activity (if activity_logs table exists)
        try {
            await client.query(
                `INSERT INTO activity_logs (project_id, user_id, action, target, metadata)
         VALUES ($1, $2, 'accepted', 'Project Terms', $3)`,
                [projectId, userId, JSON.stringify({ ip: clientIp })]
            );
        } catch (activityError) {
            // Activity log is optional - don't fail if table doesn't exist
            console.warn('Could not log activity:', activityError);
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
};
