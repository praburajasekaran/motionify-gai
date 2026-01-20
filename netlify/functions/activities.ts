import pg from 'pg';

const { Client } = pg;

interface NetlifyEvent {
  httpMethod: string;
  headers: Record<string, string>;
  body: string | null;
  path: string;
  queryStringParameters: Record<string, string> | null;
}

interface NetlifyResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

interface CreateActivityPayload {
  type: string;
  userId: string;
  userName: string;
  targetUserId?: string;
  targetUserName?: string;
  inquiryId?: string;
  proposalId?: string;
  projectId?: string;
  details: Record<string, string | number>;
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

export const handler = async (
  event: NetlifyEvent
): Promise<NetlifyResponse> => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

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
      const payload: CreateActivityPayload = JSON.parse(event.body || '{}');

      if (!payload.type || !payload.userId || !payload.userName) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'type, userId, and userName are required' }),
        };
      }

      // At least one context must be provided
      if (!payload.inquiryId && !payload.proposalId && !payload.projectId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'At least one of inquiryId, proposalId, or projectId is required' }),
        };
      }

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
};
