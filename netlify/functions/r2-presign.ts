import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { compose, withCORS, withAuth, withRateLimit, withValidation, type NetlifyEvent, type AuthResult } from './_shared/middleware';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
import { getCorsHeaders } from "./_shared/cors";
import { query as dbQuery } from './_shared/db';
import {
    AuthorizationError,
    createAuthorizationResponse,
    requireCommentAccess,
    requireDeliverableAccess,
    requireProjectAccess,
    requireProposalAccess,
} from './_shared/authorization';

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

    try {
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

            // Security: Resolve key ownership before generating presigned URL
            const keyOwnershipResult = await dbQuery(`
                SELECT d.id, d.project_id, d.status, p.client_user_id
                FROM deliverables d
                JOIN projects p ON d.project_id = p.id
                WHERE d.beta_file_key = $1 OR d.final_file_key = $1
            `, [key]);

            // If key not found in deliverables, check comment_attachments
            if (keyOwnershipResult.rows.length === 0) {
                const attachmentResult = await dbQuery(`
                    SELECT ca.id, pc.proposal_id
                    FROM comment_attachments ca
                    JOIN proposal_comments pc ON ca.comment_id = pc.id
                    WHERE ca.r2_key = $1
                `, [key]);

                if (attachmentResult.rows.length > 0) {
                    await requireProposalAccess(auth?.user, attachmentResult.rows[0].proposal_id, {
                        operation: 'r2.downloadCommentAttachment',
                    });
                } else {
                    // Key not found in deliverables OR attachments
                    if (key.startsWith(`uploads/${auth?.user?.userId}/`)) {
                        // Allow - user's own upload
                    } else {
                        console.warn(`R2 presign denied: unrecognized key pattern "${key}" for user ${auth?.user?.userId}`);
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
                const deliverable = keyOwnershipResult.rows[0];
                await requireDeliverableAccess(auth?.user, deliverable.id, {
                    operation: 'r2.downloadDeliverable',
                });
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

            const { fileName, fileType, fileSize, commentId, projectId, folder, revisionRequestId } = validation.data as any;

            // Generate secure key
            const timestamp = Date.now();
            const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

            let key: string;
            if (commentId) {
                await requireCommentAccess(auth?.user, commentId, { operation: 'r2.uploadCommentAttachment' });
                key = `comments/${commentId}/${timestamp}-${sanitizedFileName}`;
            } else if (revisionRequestId) {
                const revisionResult = await dbQuery(
                    `SELECT deliverable_id FROM revision_requests WHERE id = $1`,
                    [revisionRequestId]
                );
                if (revisionResult.rows.length === 0) {
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Revision request not found' } }),
                    };
                }
                await requireDeliverableAccess(auth?.user, revisionResult.rows[0].deliverable_id, {
                    operation: 'r2.uploadRevisionAttachment',
                });
                key = `revisions/${revisionRequestId}/${timestamp}-${sanitizedFileName}`;
            } else if (projectId && folder) {
                await requireProjectAccess(auth?.user, projectId, { operation: 'r2.uploadProjectFile' });
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
        if (error instanceof AuthorizationError) {
            return createAuthorizationResponse(error, origin);
        }
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
    }
});
