/**
 * R2 Storage Utilities
 *
 * Reusable helpers for Cloudflare R2 operations.
 */

import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

// Handle if R2_ACCOUNT_ID is the full endpoint URL
const endpoint = R2_ACCOUNT_ID?.startsWith('http')
  ? R2_ACCOUNT_ID
  : `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const r2Client = new S3Client({
  region: 'auto',
  endpoint: endpoint,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
});

/**
 * Delete a file from R2 storage
 * @param fileKey - The key (path) of the file to delete
 */
export async function deleteFromR2(fileKey: string): Promise<void> {
  if (!fileKey) return;

  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
    })
  );
}

/**
 * Delete multiple files from R2 storage
 * @param fileKeys - Array of keys to delete
 */
export async function deleteMultipleFromR2(fileKeys: string[]): Promise<void> {
  const validKeys = fileKeys.filter(Boolean);
  await Promise.all(validKeys.map((key) => deleteFromR2(key)));
}
