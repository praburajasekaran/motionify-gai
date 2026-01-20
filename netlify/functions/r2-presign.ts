
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Handler } from "@netlify/functions";
import { getCorsHeaders } from "./_shared/cors";

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

export const handler: Handler = async (event, context) => {
    const headers = getCorsHeaders(event.headers.origin || event.headers.Origin);

    // CORS Preflight
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers,
            body: '',
        };
    }

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
        console.error("Missing R2 environment variables");
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Server misconfiguration" }),
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
                    body: JSON.stringify({ error: "Missing 'key' parameter" }),
                };
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

        // POST: Generate Upload URL
        if (event.httpMethod === "POST") {
            const body = JSON.parse(event.body || '{}');
            const { fileName, fileType, projectId, folder, customKey } = body;

            if (!fileName || !fileType || !projectId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: "Missing required fields" }),
                };
            }

            let key;
            if (customKey) {
                key = customKey;
            } else {
                const targetFolder = folder || 'misc';
                key = `projects/${projectId}/${targetFolder}/${Date.now()}-${fileName}`;
            }

            const command = new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
                ContentType: fileType,
            });

            const signedUrl = await getSignedUrl(R2, command, { expiresIn: 3600 });

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    uploadUrl: signedUrl,
                    key: key,
                }),
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: "Method not allowed" }),
        };

    } catch (error: any) {
        console.error("R2 Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
