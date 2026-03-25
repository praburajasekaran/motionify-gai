
import { S3Client } from "@aws-sdk/client-s3";

// Simulate missing env vars
const R2_ACCOUNT_ID = undefined;
const R2_ACCESS_KEY_ID = undefined;
const R2_SECRET_ACCESS_KEY = undefined;
const R2_BUCKET_NAME = undefined;

console.log("Starting reproduction script...");

try {
    const endpoint = R2_ACCOUNT_ID?.startsWith('http')
        ? R2_ACCOUNT_ID
        : `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    
    console.log(`Endpoint: ${endpoint}`);

    const R2 = new S3Client({
        region: "auto",
        endpoint: endpoint,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID || "",
            secretAccessKey: R2_SECRET_ACCESS_KEY || "",
        },
        forcePathStyle: true,
    });
    
    console.log("S3Client created successfully.");
} catch (error) {
    console.error("CRASHED during S3Client initialization:");
    console.error(error);
}
