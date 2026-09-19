/**
 * R2 Storage Utilities
 *
 * Reusable helpers for Cloudflare R2 operations.
 */

import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint: string;
}

type R2Environment = Record<string, string | undefined>;

export interface R2DeleteClient {
  send(command: DeleteObjectCommand): Promise<unknown>;
}

export interface DeleteFromR2Options {
  client?: R2DeleteClient;
  bucketName?: string;
}

let cachedClient: S3Client | null = null;
let cachedClientKey: string | null = null;

/**
 * Read and normalize the complete R2 configuration.
 * Returns null when any required setting is absent.
 */
export function getR2Config(env: R2Environment = process.env): R2Config | null {
  const accountId = env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = env.R2_BUCKET_NAME?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpoint: accountId.startsWith('http')
      ? accountId
      : `https://${accountId}.r2.cloudflarestorage.com`,
  };
}

export function getR2Client(config: R2Config): S3Client {
  const clientKey = `${config.endpoint}\0${config.accessKeyId}\0${config.secretAccessKey}`;
  if (!cachedClient || cachedClientKey !== clientKey) {
    cachedClient = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
    cachedClientKey = clientKey;
  }

  return cachedClient;
}

function requireR2Config(): R2Config {
  const config = getR2Config();
  if (!config) {
    throw new Error('R2 storage is not configured');
  }
  return config;
}

function isObjectNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as {
    name?: string;
    Code?: string;
    code?: string;
    $metadata?: { httpStatusCode?: number };
  };
  const code = candidate.name || candidate.Code || candidate.code;
  return candidate.$metadata?.httpStatusCode === 404 || code === 'NoSuchKey' || code === 'NotFound';
}

/**
 * Delete a file from R2 storage
 * @param fileKey - The key (path) of the file to delete
 */
export async function deleteFromR2(
  fileKey: string,
  options: DeleteFromR2Options = {}
): Promise<void> {
  if (!fileKey) return;

  const config = options.client && options.bucketName ? null : requireR2Config();
  const client = options.client || (getR2Client(config!) as R2DeleteClient);
  const bucketName = options.bucketName || config!.bucketName;

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      })
    );
  } catch (error) {
    // S3 DeleteObject is normally idempotent, but compatible providers may
    // still surface a not-found response. Treat it as a completed deletion.
    if (isObjectNotFoundError(error)) return;
    throw error;
  }
}

/**
 * Delete multiple files from R2 storage
 * @param fileKeys - Array of keys to delete
 */
export async function deleteMultipleFromR2(fileKeys: string[]): Promise<void> {
  const validKeys = fileKeys.filter(Boolean);
  await Promise.all(validKeys.map((key) => deleteFromR2(key)));
}
