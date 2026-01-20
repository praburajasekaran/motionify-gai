import pg from 'pg';

const { Client } = pg;

interface NetlifyEvent {
    httpMethod: string;
    headers: Record<string, string>;
    body: string;
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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
        'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    const { userId } = event.queryStringParameters || {};

    if (!userId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'User ID is required' }),
        };
    }

    const client = getDbClient();

    try {
        await client.connect();

        if (event.httpMethod === 'GET') {
            // Fetch settings
            const result = await client.query(
                `SELECT * FROM user_preferences WHERE user_id = $1`,
                [userId]
            );

            // If no settings exist, return defaults (all true based on typical requirements, or use generic defaults)
            if (result.rows.length === 0) {
                // Consider creating default row here or just returning defaults
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        preferences: {
                            email_task_assignment: true,
                            email_mention: true,
                            email_project_update: true,
                            email_marketing: false
                        }
                    }),
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    preferences: result.rows[0],
                }),
            };

        } else if (event.httpMethod === 'PUT') {
            // Update settings
            const body = JSON.parse(event.body || '{}');
            const {
                email_task_assignment,
                email_mention,
                email_project_update,
                email_marketing
            } = body;

            // Upsert / Insert or Update
            const query = `
                INSERT INTO user_preferences (
                    user_id, 
                    email_task_assignment, 
                    email_mention, 
                    email_project_update, 
                    email_marketing,
                    updated_at
                )
                VALUES ($1, $2, $3, $4, $5, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    email_task_assignment = EXCLUDED.email_task_assignment,
                    email_mention = EXCLUDED.email_mention,
                    email_project_update = EXCLUDED.email_project_update,
                    email_marketing = EXCLUDED.email_marketing,
                    updated_at = NOW()
                RETURNING *;
            `;

            const result = await client.query(query, [
                userId,
                // Use existing values if not provided, or default to true/false logic if strictly typed
                // But for simplicity assume body has boolean values or undefined
                email_task_assignment ?? true,
                email_mention ?? true,
                email_project_update ?? true,
                email_marketing ?? false
            ]);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    preferences: result.rows[0],
                }),
            };
        } else {
            return {
                statusCode: 405,
                headers,
                body: JSON.stringify({ success: false, error: 'Method not allowed' }),
            };
        }

    } catch (error) {
        console.error('users-settings error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to process settings request',
            }),
        };
    } finally {
        await client.end();
    }
};
