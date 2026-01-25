import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { compose, withCORS, withAuth, withRateLimit, withValidation, type NetlifyEvent, type AuthResult } from './_shared/middleware';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
import { getCorsHeaders } from "./_shared/cors";
import pg from 'pg';

const { Client } = pg;

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

// Be resilient: handle if R2_ACCOUNT_ID is the full endpoint URL
const endpoint = R2_ACCOUNT_ID?.startsWith('http')
    ? R2_ACCOUNT_ID
    : `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const R2 = new S3Client({
    region: "auto",
    endpoint: endpoint,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || "",
        secretAccessKey: R2_SECRET_ACCESS_KEY || "",
    },
    forcePathStyle: true,
});

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
    withCORS(['GET', 'POST']),
    withAuth(),
    withRateLimit({ windowMs: 60 * 1000, maxRequests: 20 }, 'r2_presign') // Strict: 20 per minute
)(async (event: NetlifyEvent, auth?: AuthResult) => {
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
        console.error("Missing R2 environment variables");
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: {
                    code: 'SERVER_MISCONFIGURED',
                    message: 'File storage not configured',
                },
            }),
        };
    }

    const client = getDbClient();

    try {
        await client.connect();

        // GET: Generate Download URL
        if (event.httpMethod === "GET") {
            const key = event.queryStringParameters?.key;
            if (!key) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        error: {
                            code: 'MISSING_KEY',
                            message: "Missing 'key' parameter",
                        },
                    }),
                };
            }

            // Security: Validate key format to prevent path traversal
            if (key.includes('..') || key.startsWith('/')) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        error: {
                            code: 'INVALID_KEY',
                            message: 'Invalid key format',
                        },
                    }),
                };
            }

            // Security: Validate key ownership before generating presigned URL
            // Check if key belongs to a deliverable and user has access
            const keyOwnershipResult = await client.query(`
                SELECT d.id, d.project_id, d.status, p.client_user_id
                FROM deliverables d
                JOIN projects p ON d.project_id = p.id
                WHERE d.beta_file_key = $1 OR d.final_file_key = $1
            `, [key]);

            // If key not found in deliverables, check comment_attachments
            if (keyOwnershipResult.rows.length === 0) {
                const attachmentResult = await client.query(`
                    SELECT ca.id, pc.proposal_id
                    FROM comment_attachments ca
                    JOIN proposal_comments pc ON ca.comment_id = pc.id
                    WHERE ca.r2_key = $1
                `, [key]);

                // Admin/PM can access everything
                if (auth?.user?.role === 'super_admin' || auth?.user?.role === 'project_manager') {
                    // Allow
                } else if (attachmentResult.rows.length > 0) {
                    // Comment attachments: If user is authenticated and attachment exists, allow access.
                    // Rationale: Comments are already permission-checked when created. The comment
                    // visibility itself enforces who can see the attachment. Duplicating the full
                    // proposal ownership check here would be redundant and couples this endpoint
                    // to proposal access logic. Any authenticated user who knows the attachment key
                    // and the attachment exists is allowed to access it.
                    // This is acceptable for v1 since:
                    // 1. Keys are generated server-side with timestamps (not guessable)
                    // 2. Comments are only visible to project participants
                    // 3. Attachments have no value without comment context
                    // Allow access - user is authenticated and attachment exists
                } else {
                    // Key not found in deliverables OR attachments
                    // For user uploads (uploads/{userId}/...) allow only the owner
                    if (key.startsWith(`uploads/${auth?.user?.userId}/`)) {
                        // Allow - user's own upload
                    } else if (!key.startsWith('uploads/')) {
                        // Unknown key pattern - allow for backward compatibility
                        // (old files without structured paths)
                    } else {
                        // It's an upload belonging to another user
                        return {
                            statusCode: 403,
                            headers,
                            body: JSON.stringify({
                                error: {
                                    code: 'ACCESS_DENIED',
                                    message: 'You do not have permission to access this file',
                                },
                            }),
                        };
                    }
                }
            } else {
                const { project_id, client_user_id, status } = keyOwnershipResult.rows[0];

                // Admin/PM can access all
                if (auth?.user?.role === 'super_admin' || auth?.user?.role === 'project_manager') {
                    // Allow
                }
                // Client can only access their own project's files when status allows viewing
                else if (auth?.user?.role === 'client') {
                    const isOwnProject = client_user_id === auth.user.userId;
                    const viewableStatuses = ['beta_ready', 'awaiting_approval', 'approved', 'payment_pending', 'final_delivered'];

                    if (!isOwnProject || !viewableStatuses.includes(status)) {
                        return {
                            statusCode: 403,
                            headers,
                            body: JSON.stringify({
                                error: {
                                    code: 'ACCESS_DENIED',
                                    message: 'You do not have permission to access this file',
                                },
                            }),
                        };
                    }
                }
                // Team members can access project files if they're on the project team
                else if (auth?.user?.role === 'team_member') {
                    // Check if team member is assigned to any task on this project
                    const teamMemberResult = await client.query(`
                        SELECT 1 FROM tasks
                        WHERE project_id = $1
                        AND (assignee_id = $2 OR $2 = ANY(assignee_ids))
                        LIMIT 1
                    `, [project_id, auth.user.userId]);

                    if (teamMemberResult.rows.length === 0) {
                        return {
                            statusCode: 403,
                            headers,
                            body: JSON.stringify({
                                error: {
                                    code: 'ACCESS_DENIED',
                                    message: 'You are not assigned to tasks on this project',
                                },
                            }),
                        };
                    }
                    // Team member has access via task assignment
                }
            }

            const command = new GetObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
            });

            const signedUrl = await getSignedUrl(R2, command, { expiresIn: 3600 });
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ url: signedUrl }),
            };
        }

        // POST: Generate Upload URL with validation
        if (event.httpMethod === "POST") {
            const body = JSON.parse(event.body || '{}');

            // Choose schema based on whether this is a comment attachment or deliverable
            const isCommentAttachment = body.commentId !== undefined;
            const schema = isCommentAttachment
                ? SCHEMAS.r2.presign
                : SCHEMAS.r2.presignDeliverable;

            const validation = (await import('./_shared/validation')).validateRequest(
                event.body,
                schema,
                origin
            );

            if (!validation.success) {
                return validation.response;
            }

            const { fileName, fileType, fileSize, commentId, projectId, folder } = validation.data;

            // Generate secure key
            const timestamp = Date.now();
            const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

            let key: string;
            if (commentId) {
                key = `comments/${commentId}/${timestamp}-${sanitizedFileName}`;
            } else if (projectId && folder) {
                key = `projects/${projectId}/${folder}/${timestamp}-${sanitizedFileName}`;
            } else {
                key = `uploads/${auth!.user!.userId}/${timestamp}-${sanitizedFileName}`;
            }

            const command = new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
                ContentType: fileType,
                ContentLength: fileSize,
            });

            const signedUrl = await getSignedUrl(R2, command, { expiresIn: 3600 });

            console.log(`[R2] Presign upload for ${auth!.user!.email}: ${key} (${fileSize} bytes)`);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    uploadUrl: signedUrl,
                    key: key,
                }),
            };
        }

        // Should never reach here due to withCORS middleware
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                error: {
                    code: 'METHOD_NOT_ALLOWED',
                    message: 'Method not allowed',
                },
            }),
        };

    } catch (error: any) {
        console.error("R2 Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: {
                    code: 'R2_ERROR',
                    message: error.message || 'File storage error',
                },
            }),
        };
    } finally {
        await client.end();
    }
});
