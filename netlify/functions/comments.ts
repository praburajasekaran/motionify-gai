import pg from 'pg';
import { requireAuth } from './_shared/auth';
import { getCorsHeaders } from './_shared/cors';

const { Client } = pg;

interface NetlifyEvent {
    httpMethod: string;
    headers: Record<string, string>;
    body: string | null;
    queryStringParameters: Record<string, string> | null;
}

interface Comment {
    id: string;
    proposalId: string;
    userId: string;
    userName: string;
    content: string;
    isEdited: boolean;
    createdAt: string;
    updatedAt: string;
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

const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};

const MAX_CONTENT_LENGTH = 10000;
const MIN_CONTENT_LENGTH = 1;

export const handler = async (
    event: NetlifyEvent
): Promise<{
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}> => {
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    const client = getDbClient();

    try {
        await client.connect();

        if (event.httpMethod === 'GET') {
            const params = event.queryStringParameters || {};
            const { proposalId } = params;

            if (!proposalId || !isValidUUID(proposalId)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Valid proposalId is required',
                    }),
                };
            }

            const result = await client.query(
                `SELECT 
                    id,
                    proposal_id as "proposalId",
                    user_id as "userId",
                    user_name as "userName",
                    content,
                    is_edited as "isEdited",
                    created_at as "createdAt",
                    updated_at as "updatedAt"
                FROM proposal_comments
                WHERE proposal_id = $1
                ORDER BY created_at ASC`,
                [proposalId]
            );

            const comments: Comment[] = result.rows.map(row => ({
                id: row.id,
                proposalId: row.proposalId,
                userId: row.userId,
                userName: row.userName,
                content: row.content,
                isEdited: row.isEdited,
                createdAt: new Date(row.createdAt).toISOString(),
                updatedAt: new Date(row.updatedAt).toISOString(),
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    comments,
                }),
            };
        }

        if (event.httpMethod === 'POST') {
            const authResult = await requireAuth(event);

            if (!('user' in authResult)) {
                return (authResult as { success: false; response: { statusCode: number; headers: Record<string, string>; body: string } }).response;
            }

            const user = authResult.user;
            const body = event.body ? JSON.parse(event.body) : {};
            const { proposalId, content } = body;

            if (!proposalId || !isValidUUID(proposalId)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Valid proposalId is required',
                    }),
                };
            }

            if (!content || typeof content !== 'string') {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Content is required and must be a string',
                    }),
                };
            }

            const trimmedContent = content.trim();
            if (trimmedContent.length < MIN_CONTENT_LENGTH || trimmedContent.length > MAX_CONTENT_LENGTH) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: `Content must be between ${MIN_CONTENT_LENGTH} and ${MAX_CONTENT_LENGTH} characters`,
                    }),
                };
            }

            const result = await client.query(
                `INSERT INTO proposal_comments (proposal_id, user_id, user_name, content)
                VALUES ($1, $2, $3, $4)
                RETURNING 
                    id,
                    proposal_id as "proposalId",
                    user_id as "userId",
                    user_name as "userName",
                    content,
                    is_edited as "isEdited",
                    created_at as "createdAt",
                    updated_at as "updatedAt"`,
                [proposalId, user.id, user.fullName, trimmedContent]
            );

            const comment: Comment = {
                ...result.rows[0],
                isEdited: result.rows[0].isEdited,
                createdAt: new Date(result.rows[0].createdAt).toISOString(),
                updatedAt: new Date(result.rows[0].updatedAt).toISOString(),
            };

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({
                    success: true,
                    comment,
                }),
            };
        }

        if (event.httpMethod === 'PUT') {
            const authResult = await requireAuth(event);

            if (!('user' in authResult)) {
                return (authResult as { success: false; response: { statusCode: number; headers: Record<string, string>; body: string } }).response;
            }

            const user = authResult.user;
            const body = event.body ? JSON.parse(event.body) : {};
            const { id, content } = body;

            if (!id || !isValidUUID(id)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Valid comment ID is required',
                    }),
                };
            }

            if (!content || typeof content !== 'string') {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Content is required and must be a string',
                    }),
                };
            }

            const trimmedContent = content.trim();
            if (trimmedContent.length < MIN_CONTENT_LENGTH || trimmedContent.length > MAX_CONTENT_LENGTH) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: `Content must be between ${MIN_CONTENT_LENGTH} and ${MAX_CONTENT_LENGTH} characters`,
                    }),
                };
            }

            const commentCheck = await client.query(
                'SELECT user_id, content FROM proposal_comments WHERE id = $1',
                [id]
            );

            if (commentCheck.rows.length === 0) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Comment not found',
                    }),
                };
            }

            if (commentCheck.rows[0].user_id !== user.id) {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'You can only edit your own comments',
                    }),
                };
            }

            const result = await client.query(
                `UPDATE proposal_comments
                SET content = $1, is_edited = true, updated_at = NOW()
                WHERE id = $2
                RETURNING 
                    id,
                    proposal_id as "proposalId",
                    user_id as "userId",
                    user_name as "userName",
                    content,
                    is_edited as "isEdited",
                    created_at as "createdAt",
                    updated_at as "updatedAt"`,
                [trimmedContent, id]
            );

            const comment: Comment = {
                ...result.rows[0],
                isEdited: result.rows[0].isEdited,
                createdAt: new Date(result.rows[0].createdAt).toISOString(),
                updatedAt: new Date(result.rows[0].updatedAt).toISOString(),
            };

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    comment,
                }),
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Method not allowed',
            }),
        };

    } catch (error) {
        console.error('comments error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
            }),
        };
    } finally {
        await client.end();
    }
};
