import pg from 'pg';
import { compose, withCORS, withRateLimit, type NetlifyEvent, type NetlifyResponse } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';

const { Client } = pg;

interface CreateProjectRequestPayload {
    title: string;
    description: string;
    tentativeDeadline: string; // ISO date string
    clientUserId: string;
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

const generateRequestNumber = async (client: pg.Client): Promise<string> => {
    const year = new Date().getFullYear();

    const result = await client.query(
        `SELECT request_number FROM project_requests 
     WHERE request_number LIKE $1 
     ORDER BY request_number DESC LIMIT 1`,
        [`REQ-${year}-%`]
    );

    let maxNumber = 0;
    if (result.rows.length > 0) {
        const match = result.rows[0].request_number.match(/REQ-\d{4}-(\d+)/);
        if (match) {
            maxNumber = parseInt(match[1], 10);
        }
    }

    const nextNumber = maxNumber + 1;
    return `REQ-${year}-${String(nextNumber).padStart(3, '0')}`;
};

export const handler = compose(
    withCORS(['GET', 'POST', 'OPTIONS']),
    withRateLimit(RATE_LIMITS.apiStrict, 'client_project_request')
)(async (event: NetlifyEvent) => {
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    const client = getDbClient();

    try {
        await client.connect();

        // GET: Fetch project requests for a client
        if (event.httpMethod === 'GET') {
            const { clientUserId } = event.queryStringParameters || {};

            if (!clientUserId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'clientUserId is required' }),
                };
            }

            const result = await client.query(
                `SELECT * FROM project_requests 
         WHERE client_user_id = $1 
         ORDER BY created_at DESC`,
                [clientUserId]
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result.rows),
            };
        }

        // POST: Create new project request
        if (event.httpMethod === 'POST') {
            const payload: CreateProjectRequestPayload = JSON.parse(event.body || '{}');

            // Validation
            if (!payload.title || payload.title.trim().length < 3) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Title must be at least 3 characters' }),
                };
            }

            if (!payload.description || payload.description.trim().length < 10) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Description must be at least 10 characters' }),
                };
            }

            if (!payload.tentativeDeadline) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Tentative deadline is required' }),
                };
            }

            const deadlineDate = new Date(payload.tentativeDeadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (deadlineDate < today) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Deadline must be a future date' }),
                };
            }

            if (!payload.clientUserId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Client user ID is required' }),
                };
            }

            const requestNumber = await generateRequestNumber(client);

            const result = await client.query(
                `INSERT INTO project_requests (
          request_number, client_user_id, title, description, tentative_deadline, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
                [
                    requestNumber,
                    payload.clientUserId,
                    payload.title.trim(),
                    payload.description.trim(),
                    payload.tentativeDeadline,
                    'pending',
                ]
            );

            const projectRequest = result.rows[0];

            // TODO: Add notification to super admin here
            // This could be done by inserting into notifications table
            // or by calling a send-email function

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({
                    success: true,
                    requestNumber: projectRequest.request_number,
                    projectRequest,
                }),
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };

    } catch (error) {
        console.error('Client Project Request API error:', error);
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
