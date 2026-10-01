import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { compose, withCORS, withAuth, withRateLimit, type NetlifyEvent, type AuthResult } from './_shared/middleware';
import { SCHEMAS } from './_shared/schemas';
import { getCorsHeaders } from "./_shared/cors";
import { query as dbQuery } from './_shared/db';
import { getR2Client, getR2Config } from './_shared/r2';
import {
    AuthorizationError,
    createAuthorizationResponse,
    requireCommentAccess,
    requireDeliverableAccess,
    requireProjectAccess,
    requireProposalAccess,
    type AuthorizationUser,
} from './_shared/authorization';

type QueryFunction = (text: string, params?: any[]) => Promise<{ rows: any[] }>;
type AccessGuard = (
    user: AuthorizationUser | undefined | null,
    objectId: string,
    options?: { operation?: string }
) => Promise<unknown>;

export interface R2DownloadAuthorizationDependencies {
    query: QueryFunction;
    requireDeliverable: AccessGuard;
    requireProposal: AccessGuard;
    requireProject: AccessGuard;
}

const defaultDownloadAuthorizationDependencies: R2DownloadAuthorizationDependencies = {
    query: dbQuery,
    requireDeliverable: requireDeliverableAccess,
    requireProposal: requireProposalAccess,
    requireProject: requireProjectAccess,
};

/**
 * Resolve a stored R2 key to its owning object and enforce that object's
 * authorization guard. Returns false only for an unrecognized key.
 */
export async function authorizeR2DownloadKey(
    key: string,
    user: AuthorizationUser | undefined | null,
    dependencies: R2DownloadAuthorizationDependencies = defaultDownloadAuthorizationDependencies
): Promise<boolean> {
    const deliverableResult = await dependencies.query(`
        SELECT d.id, d.project_id, d.status, p.client_user_id
        FROM deliverables d
        JOIN projects p ON d.project_id = p.id
        WHERE d.beta_file_key = $1 OR d.final_file_key = $1
    `, [key]);

    if (deliverableResult.rows.length > 0) {
        await dependencies.requireDeliverable(user, deliverableResult.rows[0].id, {
            operation: 'r2.downloadDeliverable',
        });
        return true;
    }

    const attachmentResult = await dependencies.query(`
        SELECT ca.id, pc.proposal_id
        FROM comment_attachments ca
        JOIN proposal_comments pc ON ca.comment_id = pc.id
        WHERE ca.r2_key = $1
    `, [key]);

    if (attachmentResult.rows.length > 0) {
        await dependencies.requireProposal(user, attachmentResult.rows[0].proposal_id, {
            operation: 'r2.downloadCommentAttachment',
        });
        return true;
    }

    const projectFileResult = await dependencies.query(`
        SELECT id, project_id
        FROM project_files
        WHERE r2_key = $1
    `, [key]);

    if (projectFileResult.rows.length > 0) {
        await dependencies.requireProject(user, projectFileResult.rows[0].project_id, {
            operation: 'r2.downloadProjectFile',
        });
        return true;
    }

    return Boolean(user?.userId && key.startsWith(`uploads/${user.userId}/`));
}

export const handler = compose(
    withCORS(['GET', 'POST']),
    withAuth(),
    withRateLimit({ windowMs: 60 * 1000, maxRequests: 20 }, 'r2_presign') // Strict: 20 per minute
)(async (event: NetlifyEvent, auth?: AuthResult) => {
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    const r2Config = getR2Config();
    if (!r2Config) {
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

            // Security: Resolve key ownership before generating presigned URL.
            const authorized = await authorizeR2DownloadKey(key, auth?.user);
            if (!authorized) {
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

            const command = new GetObjectCommand({
                Bucket: r2Config.bucketName,
                Key: key,
            });

            const signedUrl = await getSignedUrl(getR2Client(r2Config), command, { expiresIn: 3600 });
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
                Bucket: r2Config.bucketName,
                Key: key,
                ContentType: fileType,
                ContentLength: fileSize,
            });

            const signedUrl = await getSignedUrl(getR2Client(r2Config), command, { expiresIn: 3600 });

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
