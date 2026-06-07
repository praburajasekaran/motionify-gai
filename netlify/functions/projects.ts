import pg from 'pg';
import { query as dbQuery, transaction } from './_shared/db';
import { logActivity } from './_shared/logActivity';
import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
import { validateRequest } from './_shared/validation';
import { validateStatusTransition } from './_shared/projectStatusTransitions';
import {
  AuthorizationError,
  assertAdminLike,
  createAuthorizationResponse,
  getAuthRole,
  requireProjectAccess,
  requireProposalAccess,
} from './_shared/authorization';
import { isAdminLike } from './_shared/roles';

const { types } = pg;

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of JS Date objects.
// This prevents timezone-shift bugs where e.g. 2026-02-09 in UTC becomes 2026-02-08
// when serialized in timezones ahead of UTC (like IST).
types.setTypeParser(1082, (val: string) => val); // 1082 = DATE OID

type QueryRunner = {
  query(queryText: string, values?: any[]): Promise<{ rows: any[] }>;
};

const generateProjectNumber = async (runner: QueryRunner = { query: dbQuery }): Promise<string> => {
  const year = new Date().getFullYear();

  const result = await runner.query(
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

  try {
    if (event.httpMethod === 'GET') {
      // Check if requesting a single project by ID from path: /api/projects/{id}
      const pathParts = event.path.split('/');
      const lastSegment = pathParts[pathParts.length - 1];
      const isIdRequest = lastSegment && lastSegment !== 'projects' && !lastSegment.includes('?');

      if (isIdRequest) {
        // Fetch single project by ID
        const projectId = lastSegment;
        await requireProjectAccess(auth?.user, projectId, { operation: 'projects.get' });

        const userRole = getAuthRole(auth?.user);

        // Fetch project from main projects table
        const result = await dbQuery(
          `SELECT p.*, u.full_name as client_name, u.email as client_email, u.phone as client_phone
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
        const teamResult = await dbQuery(
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

        return {
          statusCode: 200,
          headers: { ...headers, 'Cache-Control': 'private, max-age=30' },
          body: JSON.stringify(project),
        };
      }

      // First check if this is a schema check request
      if (event.queryStringParameters?.checkSchema === 'true') {
        const schemaResult = await dbQuery(`
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
      const requesterId = auth!.user!.userId;
      const requesterRole = getAuthRole(auth?.user);
      const requesterIsAdmin = isAdminLike(requesterRole);

      // Legacy support for clientUserId param (treat as client role check)
      // Ideally, we should move to a single 'userId' param that identifies the requester
      const effectiveUserId = userId || clientUserId;

      if (effectiveUserId && !requesterIsAdmin && effectiveUserId !== requesterId) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Cannot access another user’s projects' }),
        };
      }

      let sql = '';
      const params: any[] = [];

      if (requesterIsAdmin && !effectiveUserId) {
        sql = `
          SELECT p.*, u.full_name as client_name, u.email as client_email, u.phone as client_phone,
                 (SELECT COUNT(*) FROM deliverables d WHERE d.project_id = p.id)::int as deliverables_count
          FROM projects p
          LEFT JOIN users u ON p.client_user_id = u.id
          ORDER BY p.created_at DESC
        `;
      } else if (requesterIsAdmin && effectiveUserId) {
        sql = `
          SELECT p.*, u.full_name as client_name, u.email as client_email, u.phone as client_phone,
                 (SELECT COUNT(*) FROM deliverables d WHERE d.project_id = p.id)::int as deliverables_count
          FROM projects p
          LEFT JOIN users u ON p.client_user_id = u.id
          LEFT JOIN project_team pt ON pt.project_id = p.id AND pt.user_id = $1 AND pt.removed_at IS NULL
          WHERE p.client_user_id = $1 OR pt.user_id = $1
          ORDER BY p.created_at DESC
        `;
        params.push(effectiveUserId);
      } else {
        sql = `
          SELECT DISTINCT p.*, u.full_name as client_name, u.email as client_email, u.phone as client_phone,
                 (SELECT COUNT(*) FROM deliverables d WHERE d.project_id = p.id)::int as deliverables_count
          FROM projects p
          LEFT JOIN users u ON p.client_user_id = u.id
          LEFT JOIN project_team pt ON pt.project_id = p.id AND pt.user_id = $1 AND pt.removed_at IS NULL
          WHERE p.client_user_id = $1 OR pt.user_id = $1
          ORDER BY p.created_at DESC
        `;
        params.push(requesterId);
      }

      const result = await dbQuery(sql, params);

      return {
        statusCode: 200,
        headers: { ...headers, 'Cache-Control': 'private, max-age=30' },
        body: JSON.stringify(result.rows),
      };
    }

    if (event.httpMethod === 'POST') {
      assertAdminLike(auth?.user, 'projects.createFromProposal');

      const body = JSON.parse(event.body || '{}');
      const isProposalCreate = Boolean(body.proposalId || body.inquiryId);

      if (!isProposalCreate) {
        const validation = validateRequest(event.body, SCHEMAS.project.direct, origin);
        if (!validation.success) return validation.response;
        const payload = validation.data;

        const { project, projectNumber } = await transaction(async (client) => {
          const clientUserResult = await client.query(
            `SELECT id FROM users WHERE id = $1 AND role = 'client' AND is_active = true`,
            [payload.clientUserId]
          );

          if (clientUserResult.rows.length === 0) {
            const error = new Error('Selected client was not found or is inactive');
            (error as Error & { statusCode?: number }).statusCode = 400;
            throw error;
          }

          const projectNumber = await generateProjectNumber(client);
          const result = await client.query(
            `INSERT INTO projects (
              project_number, name, client_user_id, description, website, start_date, due_date, status, total_revisions_allowed
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)
            RETURNING *`,
            [
              projectNumber,
              payload.name.trim(),
              payload.clientUserId,
              payload.description?.trim() || null,
              payload.website?.trim() || null,
              payload.startDate || null,
              payload.dueDate || null,
              payload.totalRevisions ?? 2,
            ]
          );

          const project = result.rows[0];
          for (const deliverableName of payload.deliverables) {
            await client.query(
              `INSERT INTO deliverables (project_id, name, description, status)
               VALUES ($1, $2, '', 'pending')`,
              [project.id, deliverableName]
            );
          }

          await client.query(
            `INSERT INTO project_team (user_id, project_id, role, is_primary_contact, added_by)
             VALUES ($1, $2, 'client', true, $3)
             ON CONFLICT (user_id, project_id) DO UPDATE
             SET removed_at = NULL,
                 removed_by = NULL,
                 role = 'client',
                 is_primary_contact = true`,
            [payload.clientUserId, project.id, auth?.user?.userId || null]
          );

          if (auth?.user?.userId && auth.user.userId !== payload.clientUserId) {
            await client.query(
              `INSERT INTO project_team (user_id, project_id, role, is_primary_contact, added_by)
               VALUES ($1, $2, $3, false, $1)
               ON CONFLICT (user_id, project_id) DO UPDATE
               SET removed_at = NULL,
                   removed_by = NULL,
                   role = EXCLUDED.role,
                   is_primary_contact = false`,
              [auth.user.userId, project.id, auth.user.role || 'super_admin']
            );
          }

          await client.query(
            `INSERT INTO project_team (user_id, project_id, role, is_primary_contact, added_by)
             SELECT id, $1, 'support', false, $2
             FROM users
             WHERE role = 'support' AND is_active = true
             ON CONFLICT (user_id, project_id) DO UPDATE
             SET removed_at = NULL,
                 removed_by = NULL,
                 role = 'support',
                 is_primary_contact = false`,
            [project.id, auth?.user?.userId || null]
          );

          return { project, projectNumber };
        });

        await logActivity({
          type: 'PROJECT_CREATED',
          userId: auth?.user?.userId || '',
          userName: auth?.user?.fullName || 'Unknown',
          projectId: project.id,
          details: { projectNumber },
        });

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(project),
        };
      }

      const validation = validateRequest(event.body, SCHEMAS.project.fromProposal, origin);
      if (!validation.success) return validation.response;
      const { inquiryId, proposalId } = validation.data;

      const proposalResult = await dbQuery(
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
      await requireProposalAccess(auth?.user, proposalId, { operation: 'projects.createFromProposal' });

      if (proposal.inquiry_id !== inquiryId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Inquiry does not belong to proposal' }),
        };
      }

      if (proposal.status !== 'accepted') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Proposal must be accepted before creating project' }),
        };
      }

      const paymentResult = await dbQuery(
        `SELECT id FROM payments
         WHERE proposal_id = $1 AND payment_type = 'advance' AND status = 'completed'
         LIMIT 1`,
        [proposalId]
      );
      if (paymentResult.rows.length === 0) {
        return {
          statusCode: 402,
          headers,
          body: JSON.stringify({ error: 'Completed advance payment is required before creating a project' }),
        };
      }

      const inquiryResult = await dbQuery(
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

      const { project, created, projectNumber } = await transaction(async (client) => {
        await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`proposal-project:${proposalId}`]);

        const existingProject = await client.query(
          `SELECT * FROM projects WHERE proposal_id = $1 LIMIT 1`,
          [proposalId]
        );

        if (existingProject.rows.length > 0) {
          const project = existingProject.rows[0];
          await client.query(
            `UPDATE payments
             SET project_id = $1
             WHERE proposal_id = $2 AND payment_type = 'advance' AND status = 'completed' AND project_id IS NULL`,
            [project.id, proposalId]
          );
          return { project, created: false, projectNumber: project.project_number };
        }

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

        const deliverables = typeof proposal.deliverables === 'string'
          ? JSON.parse(proposal.deliverables)
          : (proposal.deliverables ?? []);
        for (const deliverable of deliverables) {
          await client.query(
            `INSERT INTO deliverables (
              id, project_id, name, description, estimated_completion_week, status
            ) VALUES ($1, $2, $3, $4, $5, 'pending')
            ON CONFLICT (id) DO NOTHING`,
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

        await client.query(
          `UPDATE payments
           SET project_id = $1
           WHERE proposal_id = $2 AND payment_type = 'advance' AND status = 'completed'`,
          [project.id, proposalId]
        );

        if (assignedClientUserId) {
          await client.query(
            `INSERT INTO project_team (user_id, project_id, role, is_primary_contact, added_by)
             VALUES ($1, $2, 'client', true, $3)
             ON CONFLICT (user_id, project_id) DO NOTHING`,
            [assignedClientUserId, project.id, auth?.user?.userId || null]
          );
        }

        if (auth?.user?.userId && auth.user.userId !== assignedClientUserId) {
          await client.query(
            `INSERT INTO project_team (user_id, project_id, role, is_primary_contact, added_by)
             VALUES ($1, $2, $3, false, $1)
             ON CONFLICT (user_id, project_id) DO NOTHING`,
            [auth.user.userId, project.id, auth.user.role || 'super_admin']
          );
        }

        await client.query(
          `INSERT INTO project_team (user_id, project_id, role, is_primary_contact, added_by)
           SELECT id, $1, 'support', false, $2
           FROM users
           WHERE role = 'support' AND is_active = true
           ON CONFLICT (user_id, project_id) DO NOTHING`,
          [project.id, auth?.user?.userId || null]
        );

        return { project, created: true, projectNumber };
      });

      if (created) {
        await logActivity({
          type: 'PROJECT_CREATED',
          userId: auth?.user?.userId || '',
          userName: auth?.user?.fullName || 'Unknown',
          projectId: project.id,
          inquiryId: inquiryId,
          details: { projectNumber },
        });
      }

      return {
        statusCode: created ? 201 : 200,
        headers,
        body: JSON.stringify(project),
      };
    }

    if (event.httpMethod === 'PATCH') {
      assertAdminLike(auth?.user, 'projects.update');

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
      const existing = await dbQuery('SELECT * FROM projects WHERE id = $1', [projectId]);
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

      const result = await dbQuery(
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

      await logActivity({
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

      const existing = await dbQuery('SELECT id, status, name, project_number FROM projects WHERE id = $1', [projectId]);
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
      await logActivity({
        type: 'PROJECT_DELETED',
        userId: auth.user!.userId,
        userName: auth.user!.fullName,
        details: {
          projectNumber: existing.rows[0].project_number,
          projectName: existing.rows[0].name || '',
        },
      });

      // Delete child records then project (deliverables cascade via FK)
      await dbQuery('DELETE FROM revision_requests WHERE project_id = $1', [projectId]);
      await dbQuery('DELETE FROM payments WHERE project_id = $1', [projectId]);
      await dbQuery('DELETE FROM project_team WHERE project_id = $1', [projectId]);
      await dbQuery('DELETE FROM project_files WHERE project_id = $1', [projectId]);
      await dbQuery('DELETE FROM activities WHERE project_id = $1', [projectId]);
      await dbQuery('DELETE FROM projects WHERE id = $1', [projectId]);

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
    if (error instanceof AuthorizationError) {
      return createAuthorizationResponse(error, origin);
    }
    if (error instanceof Error && 'statusCode' in error) {
      return {
        statusCode: (error as Error & { statusCode: number }).statusCode,
        headers,
        body: JSON.stringify({ error: error.message }),
      };
    }
    console.error('Projects API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
});
