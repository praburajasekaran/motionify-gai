import { query } from './db';

/**
 * Shared activity logger for all Netlify functions.
 * Uses the connection pool — no client.connect() / client.end() needed.
 * Fire-and-forget safe: errors are logged but never thrown.
 */
export async function logActivity(params: {
  type: string;
  userId: string;
  userName: string;
  projectId?: string;
  inquiryId?: string;
  details?: Record<string, string | number>;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO activities (type, user_id, user_name, project_id, inquiry_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.type,
        params.userId,
        params.userName,
        params.projectId ?? null,
        params.inquiryId ?? null,
        JSON.stringify(params.details ?? {}),
      ]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
