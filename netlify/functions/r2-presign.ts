
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Config } from "@netlify/functions";

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

export default async (req: Request) => {
    // CORS Preflight
    if (req.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        });
    }

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
        console.error("Missing R2 environment variables");
        return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const url = new URL(req.url);

        // GET: Generate Download URL
        if (req.method === "GET") {
            const key = url.searchParams.get("key");
            if (!key) {
                return new Response(JSON.stringify({ error: "Missing 'key' parameter" }), {
                    status: 400,
                    headers: { "Access-Control-Allow-Origin": "*" }
                });
            }

            const command = new GetObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
            });

            const signedUrl = await getSignedUrl(R2, command, { expiresIn: 3600 });
            return new Response(JSON.stringify({ url: signedUrl }), {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            });
        }

        // POST: Generate Upload URL
        if (req.method === "POST") {
            const body = await req.json();
            const { fileName, fileType, projectId, folder, customKey } = body;

            if (!fileName || !fileType || !projectId) {
                return new Response(JSON.stringify({ error: "Missing required fields" }), {
                    status: 400,
                    headers: { "Access-Control-Allow-Origin": "*" }
                });
            }

            let key;
            if (customKey) {
                // Use provided custom key (e.g. for thumbnails matching video keys)
                // Security Note: In production, validate this key belongs to projectId
                key = customKey;
            } else {
                // Default folder to 'misc' if not provided
                const targetFolder = folder || 'misc';
                key = `projects/${projectId}/${targetFolder}/${Date.now()}-${fileName}`;
            }

            const command = new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
                ContentType: fileType,
            });

            const signedUrl = await getSignedUrl(R2, command, { expiresIn: 3600 });

            return new Response(JSON.stringify({
                uploadUrl: signedUrl,
                key: key,
            }), {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            });
        }

        return new Response("Method not allowed", { status: 405 });

    } catch (error: any) {
        console.error("R2 Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        });
    }
};

export const config: Config = {
    path: "/.netlify/functions/r2-presign",
};
