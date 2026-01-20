import pg from 'pg';
import { requireAuth } from './_shared/auth';
import { getCorsHeaders } from './_shared/cors';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const { Client } = pg;

interface NetlifyEvent {
    httpMethod: string;
    headers: Record<string, string>;
    body: string | null;
    queryStringParameters: Record<string, string> | null;
}

interface Attachment {
    id: string;
    commentId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedBy: string;
    createdAt: string;
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

// Allowed file types for attachments
const ALLOWED_FILE_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_NAME_LENGTH = 255;

// R2 configuration for download URL generation
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

const getR2Endpoint = () => {
    if (!R2_ACCOUNT_ID) return null;
    return R2_ACCOUNT_ID?.startsWith('http')
        ? R2_ACCOUNT_ID
        : `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
};

const getR2Client = () => {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
        return null;
    }
    
    const endpoint = getR2Endpoint();
    return new S3Client({
        region: "auto",
        endpoint: endpoint!,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID || "",
            secretAccessKey: R2_SECRET_ACCESS_KEY || "",
        },
        forcePathStyle: true,
    });
};

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

        // GET: Fetch attachments for a comment
        if (event.httpMethod === 'GET') {
            const params = event.queryStringParameters || {};
            const { commentId, attachmentId } = params;

            // Generate download URL for a specific attachment
            if (attachmentId) {
                if (!isValidUUID(attachmentId)) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            error: 'Valid attachmentId is required',
                        }),
                    };
                }

                // Fetch the attachment to get the r2_key
                const attachmentResult = await client.query(
                    'SELECT id, r2_key, file_name FROM comment_attachments WHERE id = $1',
                    [attachmentId]
                );

                if (attachmentResult.rows.length === 0) {
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            error: 'Attachment not found',
                        }),
                    };
                }

                const attachment = attachmentResult.rows[0];
                const r2Client = getR2Client();

                if (!r2Client) {
                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            error: 'R2 configuration missing',
                        }),
                    };
                }

                try {
                    const command = new GetObjectCommand({
                        Bucket: R2_BUCKET_NAME,
                        Key: attachment.r2_key,
                    });

                    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            url: signedUrl,
                            fileName: attachment.file_name,
                        }),
                    };
                } catch (error) {
                    console.error('Error generating download URL:', error);
                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            error: 'Failed to generate download URL',
                        }),
                    };
                }
            }

            // Fetch attachments for a comment
            if (!commentId || !isValidUUID(commentId)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Valid commentId is required',
                    }),
                };
            }

            const result = await client.query(
                `SELECT 
                    id,
                    comment_id as "commentId",
                    file_name as "fileName",
                    file_type as "fileType",
                    file_size as "fileSize",
                    uploaded_by as "uploadedBy",
                    created_at as "createdAt"
                FROM comment_attachments
                WHERE comment_id = $1
                ORDER BY created_at ASC`,
                [commentId]
            );

            const attachments: Attachment[] = result.rows.map(row => ({
                id: row.id,
                commentId: row.commentId,
                fileName: row.fileName,
                fileType: row.fileType,
                fileSize: row.fileSize,
                uploadedBy: row.uploadedBy,
                createdAt: new Date(row.createdAt).toISOString(),
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    attachments,
                }),
            };
        }

        // POST: Create attachment record
        if (event.httpMethod === 'POST') {
            const authResult = await requireAuth(event);

            if (!('user' in authResult)) {
                return (authResult as { success: false; response: { statusCode: number; headers: Record<string, string>; body: string } }).response;
            }

            const user = authResult.user;
            const body = event.body ? JSON.parse(event.body) : {};
            const { commentId, fileName, fileType, fileSize, r2Key } = body;

            // Validate commentId
            if (!commentId || !isValidUUID(commentId)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Valid commentId is required',
                    }),
                };
            }

            // Validate fileName
            if (!fileName || typeof fileName !== 'string') {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'fileName is required and must be a string',
                    }),
                };
            }

            if (fileName.length > MAX_FILE_NAME_LENGTH) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: `fileName must be ${MAX_FILE_NAME_LENGTH} characters or less`,
                    }),
                };
            }

            // Validate fileType
            if (!fileType || typeof fileType !== 'string') {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'fileType is required and must be a string',
                    }),
                };
            }

            if (!ALLOWED_FILE_TYPES.includes(fileType)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: `Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`,
                    }),
                };
            }

            // Validate fileSize
            if (typeof fileSize !== 'number' || fileSize < 0) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'fileSize is required and must be a positive number',
                    }),
                };
            }

            if (fileSize > MAX_FILE_SIZE) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: `File size must be ${MAX_FILE_SIZE / (1024 * 1024)}MB or less`,
                    }),
                };
            }

            // Validate r2Key
            if (!r2Key || typeof r2Key !== 'string') {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'r2Key is required and must be a string',
                    }),
                };
            }

            // Verify comment exists
            const commentCheck = await client.query(
                'SELECT id FROM proposal_comments WHERE id = $1',
                [commentId]
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

            // Insert the attachment record
            const result = await client.query(
                `INSERT INTO comment_attachments (comment_id, file_name, file_type, file_size, r2_key, uploaded_by)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING 
                    id,
                    comment_id as "commentId",
                    file_name as "fileName",
                    file_type as "fileType",
                    file_size as "fileSize",
                    uploaded_by as "uploadedBy",
                    created_at as "createdAt"`,
                [commentId, fileName, fileType, fileSize, r2Key, user.id]
            );

            const attachment: Attachment = {
                ...result.rows[0],
                createdAt: new Date(result.rows[0].createdAt).toISOString(),
            };

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({
                    success: true,
                    attachment,
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
        console.error('attachments error:', error);
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
