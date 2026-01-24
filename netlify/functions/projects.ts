import pg from 'pg';
import { compose, withCORS, withAuth, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';

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

const generateProjectNumber = async (client: pg.Client): Promise<string> => {
  const year = new Date().getFullYear();

  const result = await client.query(
    `SELECT project_number FROM projects 
     WHERE project_number LIKE $1 
     ORDER BY project_number DESC LIMIT 1`,
    [`PROJ-${year}-%`]
  );

  let maxNumber = 0;
  if (result.rows.length > 0) {
    const match = result.rows[0].project_number.match(/PROJ-\d{4}-(\d+)/);
    if (match) {
      maxNumber = parseInt(match[1], 10);
    }
  }

  const nextNumber = maxNumber + 1;
  return `PROJ-${year}-${String(nextNumber).padStart(3, '0')}`;
};

export const handler = compose(
  withCORS(['GET', 'POST']),
  withAuth()
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  const client = getDbClient();

  try {
    await client.connect();

    if (event.httpMethod === 'GET') {
      // First check if this is a schema check request
      if (event.queryStringParameters?.checkSchema === 'true') {
        const schemaResult = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = 'projects'
          ORDER BY ordinal_position
        `);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Projects table schema',
            columns: schemaResult.rows
          }),
        };
      }

      const { userId, clientUserId } = event.queryStringParameters || {};

      // Legacy support for clientUserId param (treat as client role check)
      // Ideally, we should move to a single 'userId' param that identifies the requester
      const effectiveUserId = userId || clientUserId;

      if (!effectiveUserId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'User ID is required' }),
        };
      }

      // Fetch user role
      const userResult = await client.query(
        'SELECT role FROM users WHERE id = $1',
        [effectiveUserId]
      );

      if (userResult.rows.length === 0) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'User not found' }),
        };
      }

      const userRole = userResult.rows[0].role;
      let query = '';
      const params: any[] = [];

      if (userRole === 'project_manager') {
        // Project Manager: Only see projects linked to inquiries assigned to them
        query = `
          SELECT p.* 
          FROM vertical_slice_projects p
          JOIN inquiries i ON p.inquiry_id = i.id
          WHERE i.assigned_to_admin_id = $1
          ORDER BY p.created_at DESC
        `;
        params.push(effectiveUserId);
      } else if (userRole === 'client' || userRole === 'client_primary' || userRole === 'client_team') {
        // Client: Only see their own projects
        // Note: checking multiple client role variations to be safe, though DB check is 'client'
        query = 'SELECT * FROM vertical_slice_projects WHERE client_user_id = $1 ORDER BY created_at DESC';
        params.push(effectiveUserId);
      } else if (userRole === 'super_admin' || userRole === 'admin') {
        // Super Admin: See all projects
        query = 'SELECT * FROM vertical_slice_projects ORDER BY created_at DESC';
      } else {
        // Unknown or unauthorized role
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Unauthorized role' }),
        };
      }

      const result = await client.query(query, params);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows),
      };
    }

    if (event.httpMethod === 'POST') {
      const { inquiryId, proposalId } = JSON.parse(event.body || '{}');

      if (!inquiryId || !proposalId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'inquiryId and proposalId are required' }),
        };
      }

      const proposalResult = await client.query(
        'SELECT * FROM proposals WHERE id = $1',
        [proposalId]
      );

      if (proposalResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Proposal not found' }),
        };
      }

      const proposal = proposalResult.rows[0];

      if (proposal.status !== 'accepted') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Proposal must be accepted before creating project' }),
        };
      }

      const inquiryResult = await client.query(
        'SELECT contact_email, contact_name FROM inquiries WHERE id = $1',
        [inquiryId]
      );

      if (inquiryResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Inquiry not found' }),
        };
      }

      const inquiry = inquiryResult.rows[0];
      const { contact_email, contact_name } = inquiry;

      let assignedClientUserId: string | null = null;

      const existingUserResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [contact_email]
      );

      if (existingUserResult.rows.length > 0) {
        assignedClientUserId = existingUserResult.rows[0].id;
      } else {
        const newUserResult = await client.query(
          `INSERT INTO users (email, full_name, role) 
           VALUES ($1, $2, 'client') 
           RETURNING id`,
          [contact_email, contact_name]
        );
        assignedClientUserId = newUserResult.rows[0].id;
      }

      const projectNumber = await generateProjectNumber(client);

      const result = await client.query(
        `INSERT INTO projects (
          project_number, inquiry_id, proposal_id, client_user_id, status
        ) VALUES ($1, $2, $3, $4, 'active')
        RETURNING *`,
        [projectNumber, inquiryId, proposalId, assignedClientUserId]
      );

      const project = result.rows[0];

      const deliverables = JSON.parse(proposal.deliverables);
      for (const deliverable of deliverables) {
        await client.query(
          `INSERT INTO deliverables (
            id, project_id, name, description, estimated_completion_week, status
          ) VALUES ($1, $2, $3, $4, $5, 'pending')`,
          [
            deliverable.id,
            project.id,
            deliverable.name,
            deliverable.description,
            deliverable.estimatedCompletionWeek
          ]
        );
      }

      await client.query(
        `UPDATE inquiries SET status = 'converted' WHERE id = $1`,
        [inquiryId]
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(project),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };

  } catch (error) {
    console.error('Projects API error:', error);
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
