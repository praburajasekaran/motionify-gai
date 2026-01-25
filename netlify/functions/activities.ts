import pg from 'pg';
import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent, type NetlifyResponse } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
import { validateRequest } from './_shared/validation';

const { Client } = pg;

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

export const handler = compose(
  withCORS(['GET', 'POST', 'OPTIONS']),
  withAuth(),
  withRateLimit(RATE_LIMITS.api, 'activities')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  const client = getDbClient();

  try {
    await client.connect();

    // GET - Fetch activities by context (inquiry, proposal, or project)
    if (event.httpMethod === 'GET') {
      const { inquiryId, proposalId, projectId, limit = '50' } = event.queryStringParameters || {};

      let query = `
        SELECT
          id, type, user_id, user_name,
          target_user_id, target_user_name,
          inquiry_id, proposal_id, project_id,
          details, created_at
        FROM activities
        WHERE 1=1
      `;
      const params: (string | number)[] = [];
      let paramIndex = 1;

      // Filter by context - activities can relate to multiple contexts
      if (inquiryId) {
        query += ` AND inquiry_id = $${paramIndex}`;
        params.push(inquiryId);
        paramIndex++;
      }

      if (proposalId) {
        query += ` AND proposal_id = $${paramIndex}`;
        params.push(proposalId);
        paramIndex++;
      }

      if (projectId) {
        query += ` AND project_id = $${paramIndex}`;
        params.push(projectId);
        paramIndex++;
      }

      // If no context specified, return empty (don't expose all activities)
      if (!inquiryId && !proposalId && !projectId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'At least one of inquiryId, proposalId, or projectId is required' }),
        };
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(parseInt(limit, 10));

      const result = await client.query(query, params);

      // Transform snake_case to camelCase for frontend
      const activities = result.rows.map(row => ({
        id: row.id,
        type: row.type,
        userId: row.user_id,
        userName: row.user_name,
        targetUserId: row.target_user_id,
        targetUserName: row.target_user_name,
        inquiryId: row.inquiry_id,
        proposalId: row.proposal_id,
        projectId: row.project_id,
        details: row.details,
        timestamp: new Date(row.created_at).getTime(),
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(activities),
      };
    }

    // POST - Create a new activity
    if (event.httpMethod === 'POST') {
      // Validate request body using Zod schema (includes refine for context requirement)
      const validation = validateRequest(event.body, SCHEMAS.activity.create, origin);
      if (!validation.success) return validation.response;
      const payload = validation.data;

      const result = await client.query(
        `INSERT INTO activities (
          type, user_id, user_name,
          target_user_id, target_user_name,
          inquiry_id, proposal_id, project_id,
          details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          payload.type,
          payload.userId,
          payload.userName,
          payload.targetUserId || null,
          payload.targetUserName || null,
          payload.inquiryId || null,
          payload.proposalId || null,
          payload.projectId || null,
          JSON.stringify(payload.details || {}),
        ]
      );

      const row = result.rows[0];
      const activity = {
        id: row.id,
        type: row.type,
        userId: row.user_id,
        userName: row.user_name,
        targetUserId: row.target_user_id,
        targetUserName: row.target_user_name,
        inquiryId: row.inquiry_id,
        proposalId: row.proposal_id,
        projectId: row.project_id,
        details: row.details,
        timestamp: new Date(row.created_at).getTime(),
      };

      console.log('Activity created:', activity.type, {
        userId: activity.userId,
        inquiryId: activity.inquiryId,
        proposalId: activity.proposalId,
        projectId: activity.projectId,
      });

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(activity),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Activities API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  } finally {
    await client.end();
  }
});
