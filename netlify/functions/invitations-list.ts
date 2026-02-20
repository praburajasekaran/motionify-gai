import { query as dbQuery } from './_shared/db';
import { compose, withCORS, withAuth, withRateLimit, type NetlifyEvent, type NetlifyResponse } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';

export const handler = compose(
  withCORS(['GET', 'OPTIONS']),
  withAuth(),
  withRateLimit(RATE_LIMITS.api, 'invitations_list')
)(async (event: NetlifyEvent) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  // Extract projectId from path
  const pathParts = event.path.split('/');
  const projectId = pathParts[pathParts.length - 1];

  if (!projectId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Project ID is required' }),
    };
  }

  const { status } = event.queryStringParameters || {};

  try {
    // Build query with optional status filter
    let sql = `
      SELECT pi.*, u.full_name as invited_by_name
      FROM project_invitations pi
      LEFT JOIN users u ON pi.invited_by = u.id
      WHERE pi.project_id = $1
    `;
    const params: any[] = [projectId];

    if (status) {
      sql += ' AND pi.status = $2';
      params.push(status);
    }

    sql += ' ORDER BY pi.created_at DESC';

    const result = await dbQuery(sql, params);

    // Format response
    const invitations = result.rows.map((row) => ({
      id: row.id,
      project_id: row.project_id,
      email: row.email,
      role: row.role,
      status: row.status,
      expires_at: row.expires_at,
      created_at: row.created_at,
      invited_by_name: row.invited_by_name || undefined,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        invitations,
        total: invitations.length,
      }),
    };
  } catch (error) {
    console.error('List invitations error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to list invitations',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
});
