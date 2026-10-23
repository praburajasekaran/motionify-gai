import { query as dbQuery, transaction } from './_shared/db';
import { compose, withCORS, withAuth, withRateLimit, type NetlifyEvent, type AuthResult } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { logActivity } from './_shared/logActivity';

interface CreateProjectRequestPayload {
    title: string;
    description: string;
    tentativeDeadline: string; // ISO date string
    clientUserId?: string; // Only used by admin/support acting on behalf of client
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    withCORS(['GET', 'POST', 'PUT', 'OPTIONS']),
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
            const targetUserId = userRole === 'client'
                ? userId
                : event.queryStringParameters?.clientUserId || null;
            if (targetUserId && !UUID_PATTERN.test(targetUserId)) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid clientUserId' }) };
            }

            const result = await dbQuery(
                `SELECT pr.*, u.full_name AS client_name, u.email AS client_email,
                        i.inquiry_number
                   FROM project_requests pr
                   JOIN users u ON u.id = pr.client_user_id
                   LEFT JOIN inquiries i ON i.id = pr.inquiry_id
                  WHERE ($1::uuid IS NULL OR pr.client_user_id = $1)
                  ORDER BY pr.created_at DESC`,
                [targetUserId]
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result.rows),
            };
        }

        if (event.httpMethod === 'PUT') {
            if (!['super_admin', 'support'].includes(userRole)) {
                return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) };
            }

            const { requestId } = JSON.parse(event.body || '{}');
            if (typeof requestId !== 'string' || !UUID_PATTERN.test(requestId)) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid requestId is required' }) };
            }

            const conversion = await transaction(async (client) => {
                const requestResult = await client.query(
                    `SELECT pr.*, to_char(pr.tentative_deadline, 'YYYY-MM-DD') AS deadline,
                            u.full_name AS client_name, u.email AS client_email
                       FROM project_requests pr
                       JOIN users u ON u.id = pr.client_user_id
                      WHERE pr.id = $1
                      FOR UPDATE OF pr`,
                    [requestId]
                );
                const request = requestResult.rows[0];
                if (!request) return { error: 'Project request not found', statusCode: 404 };

                if (request.inquiry_id) {
                    const linked = await client.query(
                        'SELECT id, inquiry_number FROM inquiries WHERE id = $1',
                        [request.inquiry_id]
                    );
                    return { inquiryId: linked.rows[0].id, inquiryNumber: linked.rows[0].inquiry_number, created: false };
                }
                if (['rejected', 'cancelled', 'converted'].includes(request.status)) {
                    return { error: 'This request cannot be reviewed', statusCode: 409 };
                }

                await client.query("SELECT pg_advisory_xact_lock(hashtext('client-request-inquiry-number'))");
                const year = new Date().getFullYear();
                const latest = await client.query(
                    `SELECT COALESCE(MAX(substring(inquiry_number FROM '[0-9]+$')::integer), 0) AS last_number
                       FROM inquiries
                      WHERE inquiry_number ~ $1`,
                    [`^INQ-${year}-[0-9]+$`]
                );
                const sequence = Number(latest.rows[0].last_number) + 1;
                const inquiryNumber = `INQ-${year}-${String(sequence).padStart(3, '0')}`;
                const inquiry = await client.query(
                    `INSERT INTO inquiries (
                        inquiry_number, contact_name, contact_email, project_notes,
                        quiz_answers, recommended_video_type, client_user_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING id`,
                    [
                        inquiryNumber,
                        request.client_name || request.client_email,
                        request.client_email,
                        `${request.title}\n\n${request.description}\n\nTentative deadline: ${request.deadline}`,
                        JSON.stringify({
                            source: 'client_project_request',
                            niche: 'Not specified',
                            audience: 'Not specified',
                            style: 'Not specified',
                            mood: 'Not specified',
                            duration: 'Not specified',
                        }),
                        'Custom project',
                        request.client_user_id,
                    ]
                );
                await client.query(
                    `UPDATE project_requests
                        SET status = 'converted', inquiry_id = $2
                      WHERE id = $1`,
                    [requestId, inquiry.rows[0].id]
                );
                return { inquiryId: inquiry.rows[0].id, inquiryNumber, created: true };
            });

            if ('error' in conversion) {
                return { statusCode: conversion.statusCode, headers, body: JSON.stringify({ error: conversion.error }) };
            }
            if (conversion.created) {
                try {
                    await logActivity({
                        type: 'INQUIRY_CREATED',
                        userId,
                        userName: auth!.user!.fullName || 'Motionify Studio',
                        inquiryId: conversion.inquiryId,
                        details: { inquiryNumber: conversion.inquiryNumber, source: 'client_project_request' },
                    });
                } catch (error) {
                    console.error('Failed to log project request conversion:', error);
                }
            }
            return { statusCode: 200, headers, body: JSON.stringify(conversion) };
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
