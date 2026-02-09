import pg from 'pg';
import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
import { validateRequest } from './_shared/validation';
import { validateStatusTransition } from './_shared/projectStatusTransitions';

const { Client, types } = pg;

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of JS Date objects.
// This prevents timezone-shift bugs where e.g. 2026-02-09 in UTC becomes 2026-02-08
// when serialized in timezones ahead of UTC (like IST).
types.setTypeParser(1082, (val: string) => val); // 1082 = DATE OID

async function logActivity(dbClient: pg.Client, params: {
  type: string;
  userId: string;
  userName: string;
  projectId?: string;
  inquiryId?: string;
  details?: Record<string, string | number>;
}) {
  try {
    await dbClient.query(
      `INSERT INTO activities (type, user_id, user_name, project_id, inquiry_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [params.type, params.userId, params.userName,
       params.projectId || null, params.inquiryId || null,
       JSON.stringify(params.details || {})]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
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
  withCORS(['GET', 'POST', 'PATCH', 'DELETE']),
  withAuth(),
  withRateLimit(RATE_LIMITS.api, 'projects')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  const client = getDbClient();

  try {
    await client.connect();

    if (event.httpMethod === 'GET') {
      // Check if requesting a single project by ID from path: /api/projects/{id}
      const pathParts = event.path.split('/');
      const lastSegment = pathParts[pathParts.length - 1];
      const isIdRequest = lastSegment && lastSegment !== 'projects' && !lastSegment.includes('?');

      if (isIdRequest) {
        // Fetch single project by ID
        const projectId = lastSegment;
        const userRole = auth?.user?.role;
        const userId = auth?.user?.userId;

        // Fetch project from main projects table
        const result = await client.query(
          `SELECT p.*, u.full_name as client_name, u.email as client_email
           FROM projects p
           LEFT JOIN users u ON p.client_user_id = u.id
           WHERE p.id = $1`,
          [projectId]
        );

        if (result.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Project not found' }),
          };
        }

        const project = result.rows[0];

        // Fetch team members for this project
        const teamResult = await client.query(
          `SELECT pt.id as membership_id, pt.role as team_role, pt.is_primary_contact, pt.added_at,
                  u.id as user_id, u.full_name, u.email, u.profile_picture_url
           FROM project_team pt
           JOIN users u ON pt.user_id = u.id
           WHERE pt.project_id = $1 AND pt.removed_at IS NULL
           ORDER BY pt.is_primary_contact DESC, pt.added_at ASC`,
          [projectId]
        );

        project.team = teamResult.rows.map((row: any) => ({
          id: row.user_id,
          name: row.full_name || 'Unknown',
          email: row.email || '',
          avatar: row.profile_picture_url || '',
          role: row.team_role,
          isPrimaryContact: row.is_primary_contact,
        }));

        // Permission check
        if (userRole !== 'super_admin' && userRole !== 'support') {
          if (userRole === 'client' && project.client_user_id !== userId) {
            return {
              statusCode: 403,
              headers,
              body: JSON.stringify({
                error: 'Access denied',
                message: 'You do not have permission to view this project'
              }),
            };
          }

          if (userRole === 'team_member') {
            const taskResult = await client.query(
              `SELECT 1 FROM tasks
               WHERE project_id = $1
               AND (assignee_id = $2 OR $2 = ANY(assignee_ids))
               LIMIT 1`,
              [projectId, userId]
            );

            if (taskResult.rows.length === 0) {
              return {
                statusCode: 403,
                headers,
                body: JSON.stringify({
                  error: 'Access denied',
                  message: 'You are not assigned to tasks on this project'
                }),
              };
            }
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(project),
        };
      }

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

      if (userRole === 'support') {
        // Support: See all projects (support users have platform-wide access)
        query = `
          SELECT p.*, u.full_name as client_name, u.email as client_email
          FROM projects p
          LEFT JOIN users u ON p.client_user_id = u.id
          ORDER BY p.created_at DESC
        `;
      } else if (userRole === 'client' || userRole === 'client_primary' || userRole === 'client_team') {
        // Client: Only see their own projects
        query = `
          SELECT p.*, u.full_name as client_name, u.email as client_email
          FROM projects p
          LEFT JOIN users u ON p.client_user_id = u.id
          WHERE p.client_user_id = $1
          ORDER BY p.created_at DESC
        `;
        params.push(effectiveUserId);
      } else if (userRole === 'super_admin' || userRole === 'admin') {
        // Super Admin: See all projects
        query = `
          SELECT p.*, u.full_name as client_name, u.email as client_email
          FROM projects p
          LEFT JOIN users u ON p.client_user_id = u.id
          ORDER BY p.created_at DESC
        `;
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
      // Validate request body using Zod schema
      const validation = validateRequest(event.body, SCHEMAS.project.fromProposal, origin);
      if (!validation.success) return validation.response;
      const { inquiryId, proposalId } = validation.data;

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
          project_number, inquiry_id, proposal_id, client_user_id, status, total_revisions_allowed
        ) VALUES ($1, $2, $3, $4, 'active', $5)
        RETURNING *`,
        [projectNumber, inquiryId, proposalId, assignedClientUserId, proposal.revisions_included ?? 2]
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
        `UPDATE inquiries SET status = 'converted', converted_to_project_id = $2, converted_at = NOW() WHERE id = $1`,
        [inquiryId, project.id]
      );

      // Auto-populate project team: add client as primary contact
      if (assignedClientUserId) {
        await client.query(
          `INSERT INTO project_team (user_id, project_id, role, is_primary_contact, added_by)
           VALUES ($1, $2, 'client', true, $3)
           ON CONFLICT (user_id, project_id) DO NOTHING`,
          [assignedClientUserId, project.id, auth?.user?.userId || null]
        );
      }

      // Log activity
      await logActivity(client, {
        type: 'PROJECT_CREATED',
        userId: auth?.user?.userId || '',
        userName: auth?.user?.fullName || 'Unknown',
        projectId: project.id,
        inquiryId: inquiryId,
        details: { projectNumber },
      });

      // Auto-populate project team: add creator (the authenticated user)
      if (auth?.user?.userId && auth.user.userId !== assignedClientUserId) {
        await client.query(
          `INSERT INTO project_team (user_id, project_id, role, is_primary_contact, added_by)
           VALUES ($1, $2, $3, false, $1)
           ON CONFLICT (user_id, project_id) DO NOTHING`,
          [auth.user.userId, project.id, auth.user.role || 'super_admin']
        );
      }

      // Auto-add all active support users to the project team
      const supportUsersResult = await client.query(
        `SELECT id FROM users WHERE role = 'support' AND is_active = true`
      );
      for (const supportUser of supportUsersResult.rows) {
        await client.query(
          `INSERT INTO project_team (user_id, project_id, role, is_primary_contact, added_by)
           VALUES ($1, $2, 'support', false, $3)
           ON CONFLICT (user_id, project_id) DO NOTHING`,
          [supportUser.id, project.id, auth?.user?.userId || null]
        );
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(project),
      };
    }

    if (event.httpMethod === 'PATCH') {
      const userRole = auth?.user?.role;
      if (userRole !== 'super_admin' && userRole !== 'support') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Only administrators and support users can update project settings' }),
        };
      }

      const pathParts = event.path.split('/');
      const projectId = pathParts[pathParts.length - 1];

      if (!projectId || projectId === 'projects') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Project ID is required' }),
        };
      }

      const validation = validateRequest(event.body, SCHEMAS.project.update, origin);
      if (!validation.success) return validation.response;

      const updates = validation.data;

      // Verify project exists
      const existing = await client.query('SELECT * FROM projects WHERE id = $1', [projectId]);
      if (existing.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Project not found' }),
        };
      }

      const currentProject = existing.rows[0];

      // Validate status transition if status is changing
      if (updates.status && updates.status !== currentProject.status) {
        const transition = validateStatusTransition(currentProject.status, updates.status);
        if (!transition.valid) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: transition.error }),
          };
        }
      }

      // Build dynamic SET clause
      const allowedFields = ['name', 'description', 'website', 'status', 'start_date', 'due_date'] as const;
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      for (const field of allowedFields) {
        if (field in updates) {
          const value = (updates as any)[field];
          setClauses.push(`${field} = $${paramIndex}`);
          values.push(field === 'name' && typeof value === 'string' ? value.trim() : value);
          paramIndex++;
        }
      }

      if (setClauses.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No valid fields to update' }),
        };
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(projectId);

      const result = await client.query(
        `UPDATE projects SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      // Log activity
      const details: Record<string, string | number> = {};
      if (updates.name) {
        details.oldName = currentProject.name || '';
        details.newName = updates.name.trim();
      }
      if (updates.status && updates.status !== currentProject.status) {
        details.oldStatus = currentProject.status;
        details.newStatus = updates.status;
      }

      const activityType = updates.status === 'archived'
        ? 'PROJECT_ARCHIVED'
        : updates.status && updates.status !== currentProject.status
          ? 'PROJECT_STATUS_CHANGED'
          : 'PROJECT_UPDATED';

      await logActivity(client, {
        type: activityType,
        userId: auth.user!.userId,
        userName: auth.user!.fullName,
        projectId,
        details,
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows[0]),
      };
    }

    if (event.httpMethod === 'DELETE') {
      // Only super_admin can delete projects
      if (auth?.user?.role !== 'super_admin') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Only super administrators can delete projects' }),
        };
      }

      const pathParts = event.path.split('/');
      const projectId = pathParts[pathParts.length - 1];

      if (!projectId || projectId === 'projects') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Project ID is required' }),
        };
      }

      const existing = await client.query('SELECT id, status, name, project_number FROM projects WHERE id = $1', [projectId]);
      if (existing.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Project not found' }),
        };
      }

      if (existing.rows[0].status !== 'archived') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Project must be archived before deletion' }),
        };
      }

      // Log before deletion
      await logActivity(client, {
        type: 'PROJECT_DELETED',
        userId: auth.user!.userId,
        userName: auth.user!.fullName,
        details: {
          projectNumber: existing.rows[0].project_number,
          projectName: existing.rows[0].name || '',
        },
      });

      // Delete child records then project (deliverables cascade via FK)
      await client.query('DELETE FROM revision_requests WHERE project_id = $1', [projectId]);
      await client.query('DELETE FROM payments WHERE project_id = $1', [projectId]);
      await client.query('DELETE FROM project_team WHERE project_id = $1', [projectId]);
      await client.query('DELETE FROM project_files WHERE project_id = $1', [projectId]);
      await client.query('DELETE FROM activities WHERE project_id = $1', [projectId]);
      await client.query('DELETE FROM projects WHERE id = $1', [projectId]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ deleted: true }),
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
