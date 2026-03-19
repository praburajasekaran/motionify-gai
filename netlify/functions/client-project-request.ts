import { query as dbQuery } from './_shared/db';
import { compose, withCORS, withAuth, withRateLimit, type NetlifyEvent, type AuthResult } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';

interface CreateProjectRequestPayload {
    title: string;
    description: string;
    tentativeDeadline: string; // ISO date string
    clientUserId?: string; // Only used by admin/support acting on behalf of client
}

const generateRequestNumber = async (): Promise<string> => {
    const year = new Date().getFullYear();

    const result = await dbQuery(
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
    withAuth(),
    withRateLimit(RATE_LIMITS.apiStrict, 'client_project_request')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);
    const userRole = auth!.user!.role;
    const userId = auth!.user!.userId;

    // Only client, super_admin, and support roles can access this endpoint
    if (!['client', 'super_admin', 'support'].includes(userRole)) {
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'You do not have permission to access project requests' }),
        };
    }

    try {
        // GET: Fetch project requests
        if (event.httpMethod === 'GET') {
            // Clients can only see their own requests (derived from token)
            // Admin/support can view any client's requests via query param
            let targetUserId: string;
            if (userRole === 'client') {
                targetUserId = userId;
            } else {
                const { clientUserId } = event.queryStringParameters || {};
                if (!clientUserId) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'clientUserId query parameter is required for admin access' }),
                    };
                }
                targetUserId = clientUserId;
            }

            const result = await dbQuery(
                `SELECT * FROM project_requests
         WHERE client_user_id = $1
         ORDER BY created_at DESC`,
                [targetUserId]
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

            // Derive clientUserId: clients use their own ID, admin/support can specify
            let targetUserId: string;
            if (userRole === 'client') {
                targetUserId = userId;
            } else {
                if (!payload.clientUserId) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'clientUserId is required when creating on behalf of a client' }),
                    };
                }
                targetUserId = payload.clientUserId;
            }

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

            const requestNumber = await generateRequestNumber();

            const result = await dbQuery(
                `INSERT INTO project_requests (
          request_number, client_user_id, title, description, tentative_deadline, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
                [
                    requestNumber,
                    targetUserId,
                    payload.title.trim(),
                    payload.description.trim(),
                    payload.tentativeDeadline,
                    'pending',
                ]
            );

            const projectRequest = result.rows[0];

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
                message: 'An unexpected error occurred',
            }),
        };
    }
});
