import pg from 'pg';
import { requireAuth } from './_shared/auth';
import { getCorsHeaders } from './_shared/cors';
import { sendCommentNotificationEmail } from './send-email';
import { compose, withCORS, withRateLimit, type NetlifyEvent } from './_shared/middleware';
import { RATE_LIMITS } from './_shared/rateLimit';

const { Client } = pg;

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

export const handler = compose(
    withCORS(['GET', 'POST', 'PUT', 'OPTIONS']),
    withRateLimit(RATE_LIMITS.api, 'comments')
)(async (event: NetlifyEvent) => {
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    let client;

    try {
        client = getDbClient();
        await client.connect();

        if (event.httpMethod === 'GET') {
            const params = event.queryStringParameters || {};
            const { proposalId, since } = params;

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

            // Build query with optional since filter for efficient polling
            let query = `SELECT 
                id,
                proposal_id as "proposalId",
                author_id as "userId",
                user_name as "userName",
                content,
                false as "isEdited",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM proposal_comments
            WHERE proposal_id = $1`;
            const queryParams: string[] = [proposalId];

            if (since) {
                // Validate since is a valid ISO timestamp
                const sinceDate = new Date(since);
                if (isNaN(sinceDate.getTime())) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            error: 'Invalid since parameter - must be valid ISO timestamp',
                        }),
                    };
                }
                query += ` AND created_at > $2`;
                queryParams.push(sinceDate.toISOString());
            }

            query += ` ORDER BY created_at ASC`;

            const result = await client.query(query, queryParams);

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

            // Determine author_type based on user role
            const authorType = user.role === 'client' ? 'CLIENT' : 'ADMIN';

            const result = await client.query(
                `INSERT INTO proposal_comments (proposal_id, author_id, author_type, user_name, content)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING 
                    id,
                    proposal_id as "proposalId",
                    author_id as "userId",
                    user_name as "userName",
                    content,
                    false as "isEdited",
                    created_at as "createdAt",
                    updated_at as "updatedAt"`,
                [proposalId, user.id, authorType, user.fullName, trimmedContent]
            );

            const comment: Comment = {
                ...result.rows[0],
                isEdited: result.rows[0].isEdited,
                createdAt: new Date(result.rows[0].createdAt).toISOString(),
                updatedAt: new Date(result.rows[0].updatedAt).toISOString(),
            };

            // ========================================================================
            // Send comment notification email
            // ========================================================================
            try {
                // Determine commenter role for email subject
                const commenterRole = user.role === 'client' ? 'client' : 'admin';

                // Get the other party's info based on commenter role
                let recipientEmail: string | null = null;
                let recipientUserId: string | null = null;
                let proposalNumber: string | undefined;

                if (user.role === 'client') {
                    // Client posted comment - notify superadmin(s)
                    // Get superadmin email and user ID for this proposal
                    const adminResult = await client.query(
                        `SELECT email, id FROM users WHERE role IN ('super_admin', 'project_manager') ORDER BY created_at ASC LIMIT 1`
                    );
                    if (adminResult.rows.length > 0) {
                        recipientEmail = adminResult.rows[0].email;
                        recipientUserId = adminResult.rows[0].id;
                    }
                } else {
                    // Admin posted comment - notify client
                    const proposalResult = await client.query(
                        `SELECT p.id, i.contact_email, i.inquiry_number, p.client_user_id 
                         FROM proposals p 
                         JOIN inquiries i ON p.inquiry_id = i.id 
                         WHERE p.id = $1`,
                        [proposalId]
                    );
                    if (proposalResult.rows.length > 0) {
                        recipientEmail = proposalResult.rows[0].contact_email;
                        recipientUserId = proposalResult.rows[0].client_user_id;
                        proposalNumber = proposalResult.rows[0].inquiry_number;
                    }
                }

                // Send email if recipient found (don't notify sender)
                if (recipientEmail) {
                    const commentPreview = trimmedContent.substring(0, 100);
                    await sendCommentNotificationEmail({
                        to: recipientEmail,
                        commenterName: user.fullName,
                        commenterRole,
                        commentPreview,
                        proposalId,
                        proposalNumber,
                    });
                    console.log(`✅ Comment notification sent to ${recipientEmail}`);
                } else {
                    console.warn(`⚠️ Could not find recipient email for comment notification on proposal ${proposalId}`);
                }

                // ========================================================================
                // Create in-app notification record
                // ========================================================================
                if (recipientUserId && recipientUserId !== user.id) {
                    try {
                        const commentPreview = trimmedContent.substring(0, 100);
                        const proposalUrl = `${process.env.URL || 'http://localhost:5173'}/proposal/${proposalId}`;

                        await client.query(
                            `INSERT INTO notifications (user_id, project_id, type, title, message, action_url, actor_id, actor_name)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                            [
                                recipientUserId,
                                proposalId,
                                'comment_created',
                                'New Comment',
                                `"${user.fullName}" commented: "${commentPreview}"`,
                                proposalUrl,
                                user.id,
                                user.fullName,
                            ]
                        );
                        console.log(`✅ In-app notification created for user ${recipientUserId}`);
                    } catch (notifError) {
                        // Log but don't fail
                        console.error('❌ Failed to create in-app notification:', notifError);
                    }
                }
            } catch (emailError) {
                // Log but don't fail the comment creation
                console.error('❌ Failed to send comment notification email:', emailError);
            }

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
                'SELECT author_id, content FROM proposal_comments WHERE id = $1',
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

            if (commentCheck.rows[0].author_id !== user.id) {
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
                SET content = $1, updated_at = NOW()
                WHERE id = $2
                RETURNING 
                    id,
                    proposal_id as "proposalId",
                    author_id as "userId",
                    user_name as "userName",
                    content,
                    true as "isEdited",
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
        if (client) await client.end();
    }
});
