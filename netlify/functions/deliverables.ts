import pg from 'pg';
import { randomUUID } from 'crypto';
import { sendDeliverableReadyEmail, sendFinalDeliverablesEmail } from './send-email';
import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
import { validateRequest } from './_shared/validation';
import { deleteMultipleFromR2 } from './_shared/r2';

const { Client } = pg;

// Correlated subquery to determine dominant file category by priority (video > image > document > script)
const DOMINANT_FILE_CATEGORY_SQL = `
  (SELECT file_category FROM deliverable_files
   WHERE deliverable_id = d.id
   ORDER BY CASE file_category
     WHEN 'video' THEN 1
     WHEN 'image' THEN 2
     WHEN 'document' THEN 3
     WHEN 'script' THEN 4
     ELSE 5 END
   LIMIT 1) as dominant_file_category`;

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
  withCORS(['GET', 'POST', 'PATCH', 'DELETE']),
  withAuth(),
  withRateLimit(RATE_LIMITS.api, 'deliverables')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  const client = getDbClient();

  try {
    await client.connect();

    if (event.httpMethod === 'GET') {
      const { projectId, id } = event.queryStringParameters || {};

      if (id) {
        // Fetch deliverable with project info for permission check
        const result = await client.query(
          `SELECT d.*, p.client_user_id,
            ${DOMINANT_FILE_CATEGORY_SQL}
           FROM deliverables d
           JOIN projects p ON d.project_id = p.id
           WHERE d.id = $1`,
          [id]
        );

        if (result.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Deliverable not found' }),
          };
        }

        const deliverable = result.rows[0];
        const { client_user_id } = deliverable;

        // Permission check
        const userRole = auth?.user?.role;
        const userId = auth?.user?.userId;

        // Admin and PM can view all
        if (userRole !== 'super_admin' && userRole !== 'project_manager') {
          // Client can only view their own project's deliverables
          if (userRole === 'client' && client_user_id !== userId) {
            return {
              statusCode: 403,
              headers,
              body: JSON.stringify({
                error: 'Access denied',
                message: 'You do not have permission to view this deliverable'
              }),
            };
          }

          // Team member: check task assignment on project
          if (userRole === 'team_member') {
            const taskResult = await client.query(
              `SELECT 1 FROM tasks
               WHERE project_id = $1
               AND (assignee_id = $2 OR $2 = ANY(assignee_ids))
               LIMIT 1`,
              [deliverable.project_id, userId]
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

        // Dynamic expiry check (more accurate than relying on files_expired column)
        if (deliverable.status === 'final_delivered' && deliverable.final_delivered_at) {
          const deliveryDate = new Date(deliverable.final_delivered_at);
          const expiryDate = new Date(deliveryDate.getTime() + 365 * 24 * 60 * 60 * 1000);
          const isExpired = new Date() > expiryDate;

          if (isExpired && userRole !== 'super_admin') {
            return {
              statusCode: 403,
              headers,
              body: JSON.stringify({
                error: 'Files have expired',
                message: 'Download links for this deliverable have expired after 365 days. Contact support to restore access.',
                code: 'FILES_EXPIRED'
              }),
            };
          }

          // Add computed expiry info to response
          deliverable.expires_at = expiryDate.toISOString();
          deliverable.files_expired = isExpired;
        }

        // Remove internal fields before sending
        delete deliverable.client_user_id;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(deliverable),
        };
      }

      if (projectId) {
        // First validate user can access this project
        const projectResult = await client.query(
          `SELECT client_user_id FROM projects WHERE id = $1`,
          [projectId]
        );

        if (projectResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Project not found' }),
          };
        }

        const { client_user_id } = projectResult.rows[0];
        const userRole = auth?.user?.role;
        const userId = auth?.user?.userId;

        // Permission check
        if (userRole !== 'super_admin' && userRole !== 'project_manager') {
          if (userRole === 'client' && client_user_id !== userId) {
            return {
              statusCode: 403,
              headers,
              body: JSON.stringify({
                error: 'Access denied',
                message: 'You do not have permission to view deliverables for this project'
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

        // Fetch deliverables
        const result = await client.query(
          `SELECT d.*,
            ${DOMINANT_FILE_CATEGORY_SQL}
           FROM deliverables d WHERE d.project_id = $1 ORDER BY d.estimated_completion_week`,
          [projectId]
        );

        // Add computed expiry to each deliverable
        const deliverables = result.rows.map(d => {
          if (d.status === 'final_delivered' && d.final_delivered_at) {
            const deliveryDate = new Date(d.final_delivered_at);
            const expiryDate = new Date(deliveryDate.getTime() + 365 * 24 * 60 * 60 * 1000);
            d.expires_at = expiryDate.toISOString();
            d.files_expired = new Date() > expiryDate;
          }
          return d;
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(deliverables),
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'projectId or id parameter is required' }),
      };
    }

    if (event.httpMethod === 'POST') {
      // Permission check: Only super_admin and project_manager can create deliverables
      const userRole = auth?.user?.role;
      if (userRole !== 'super_admin' && userRole !== 'project_manager') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            error: 'Access denied',
            message: 'Only Motionify Support and Admins can create deliverables'
          }),
        };
      }

      const validation = validateRequest(event.body, SCHEMAS.deliverable.create, origin);
      if (!validation.success) return validation.response;
      const { project_id, name, description, estimated_completion_week } = validation.data;

      // Verify project exists
      const projectResult = await client.query(
        `SELECT id FROM projects WHERE id = $1`,
        [project_id]
      );

      if (projectResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Project not found' }),
        };
      }

      // Create deliverable with generated UUID
      const deliverableId = randomUUID();
      const result = await client.query(
        `INSERT INTO deliverables (id, project_id, name, description, status, estimated_completion_week, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [deliverableId, project_id, name, description || '', 'pending', estimated_completion_week || 1]
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(result.rows[0]),
      };
    }

    if (event.httpMethod === 'PATCH') {
      const pathParts = event.path.split('/');
      const id = pathParts[pathParts.length - 1];

      if (!id || id === 'deliverables') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Deliverable ID is required' }),
        };
      }

      const validation = validateRequest(event.body, SCHEMAS.deliverable.update, origin);
      if (!validation.success) return validation.response;
      const updates = validation.data;

      const allowedFields = [
        'status',
        'beta_file_url', 'beta_file_key',
        'final_file_url', 'final_file_key',
        'approved_by'
      ];

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      Object.keys(updates).forEach((key) => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramIndex}`);
          updateValues.push(updates[key]);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No valid fields to update' }),
        };
      }

      updateFields.push(`updated_at = NOW()`);

      if (updates.status === 'approved') {
        updateFields.push(`approved_at = NOW()`);
      }

      // Track when final delivery occurs for expiry calculation
      if (updates.status === 'final_delivered') {
        updateFields.push(`final_delivered_at = NOW()`);
      }

      const query = `
        UPDATE deliverables 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      updateValues.push(id);

      const result = await client.query(query, updateValues);

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Deliverable not found' }),
        };
      }

      const updatedDeliverable = result.rows[0];

      if (updates.status === 'awaiting_approval') {
        try {
          const projectQuery = `
             SELECT p.project_number, u.email, u.full_name
             FROM projects p
             JOIN users u ON p.client_user_id = u.id
             WHERE p.id = $1
           `;
          const projectResult = await client.query(projectQuery, [updatedDeliverable.project_id]);

          if (projectResult.rows.length > 0) {
            const { project_number, email, full_name } = projectResult.rows[0];
            // Check preferences (using email_project_update)
            const userIdResult = await client.query('SELECT id FROM users WHERE email = $1', [email]);
            let emailEnabled = true;
            if (userIdResult.rows.length > 0) {
              const prefResult = await client.query(
                `SELECT email_project_update FROM user_preferences WHERE user_id = $1`,
                [userIdResult.rows[0].id]
              );
              emailEnabled = prefResult.rows.length === 0 || prefResult.rows[0].email_project_update;
            }

            if (emailEnabled) {
              await sendDeliverableReadyEmail({
                to: email,
                clientName: full_name,
                projectNumber: project_number,
                deliverableName: updatedDeliverable.name,
                deliverableUrl: `${process.env.URL}/projects/${project_number}?tab=deliverables`,
                deliveryNotes: updatedDeliverable.description
              });
              console.log('✅ Deliverable ready email sent to:', email);
            } else {
              console.log('Skipped deliverable ready email to:', email, '(disabled in preferences)');
            }
          }
        } catch (emailError) {
          console.error('❌ Failed to send deliverable ready email:', emailError);
        }
      }

      if (updates.status === 'final_delivered') {
        try {
          const projectQuery = `
             SELECT p.project_number, u.email, u.full_name
             FROM projects p
             JOIN users u ON p.client_user_id = u.id
             WHERE p.id = $1
           `;
          const projectResult = await client.query(projectQuery, [updatedDeliverable.project_id]);

          if (projectResult.rows.length > 0) {
            const { project_number, email, full_name } = projectResult.rows[0];
            // Check preferences (using email_project_update)
            const userIdResult = await client.query('SELECT id FROM users WHERE email = $1', [email]);
            // If user not found (unlikely), default to send
            let emailEnabled = true;
            if (userIdResult.rows.length > 0) {
              const prefResult = await client.query(
                `SELECT email_project_update FROM user_preferences WHERE user_id = $1`,
                [userIdResult.rows[0].id]
              );
              emailEnabled = prefResult.rows.length === 0 || prefResult.rows[0].email_project_update;
            }

            if (emailEnabled) {
              await sendFinalDeliverablesEmail({
                to: email,
                clientName: full_name,
                projectNumber: project_number,
                deliverableName: updatedDeliverable.name,
                downloadUrl: `${process.env.URL}/projects/${project_number}?tab=deliverables`,
                expiryDays: 365
              });
              console.log('✅ Final deliverables email sent to:', email);
            } else {
              console.log('Skipped final deliverables email to:', email, '(disabled in preferences)');
            }
          }
        } catch (emailError) {
          console.error('❌ Failed to send final deliverables email:', emailError);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedDeliverable),
      };
    }

    if (event.httpMethod === 'DELETE') {
      // Extract ID from path: /api/deliverables/{id}
      const pathParts = event.path.split('/');
      const id = pathParts[pathParts.length - 1];

      if (!id || id === 'deliverables') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Deliverable ID is required' }),
        };
      }

      // Permission check: Only super_admin and project_manager can delete deliverables
      const userRole = auth?.user?.role;
      if (userRole !== 'super_admin' && userRole !== 'project_manager') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            error: 'Access denied',
            message: 'Only administrators and project managers can delete deliverables',
          }),
        };
      }

      // Verify deliverable exists
      const deliverableResult = await client.query(
        'SELECT * FROM deliverables WHERE id = $1',
        [id]
      );

      if (deliverableResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Deliverable not found' }),
        };
      }

      const deliverable = deliverableResult.rows[0];

      // Collect all file keys for R2 cleanup
      const fileKeysToDelete: string[] = [];

      // Add beta and final file keys from deliverable
      if (deliverable.beta_file_key) fileKeysToDelete.push(deliverable.beta_file_key);
      if (deliverable.final_file_key) fileKeysToDelete.push(deliverable.final_file_key);

      // Fetch all associated files from deliverable_files table
      const filesResult = await client.query(
        'SELECT file_key FROM deliverable_files WHERE deliverable_id = $1',
        [id]
      );

      for (const file of filesResult.rows) {
        if (file.file_key) fileKeysToDelete.push(file.file_key);
      }

      // Delete files from R2 storage
      if (fileKeysToDelete.length > 0) {
        try {
          await deleteMultipleFromR2(fileKeysToDelete);
          console.log(`[Deliverables] Deleted ${fileKeysToDelete.length} files from R2 for deliverable ${id}`);
        } catch (r2Error) {
          console.error('[Deliverables] R2 cleanup error:', r2Error);
          // Continue with database deletion even if R2 cleanup fails
        }
      }

      // Delete deliverable (CASCADE handles deliverable_files and revision_requests)
      await client.query('DELETE FROM deliverables WHERE id = $1', [id]);

      console.log(`[Deliverables] Deleted deliverable ${id} by user ${auth?.user?.email}`);

      return {
        statusCode: 204,
        headers,
        body: '',
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };

  } catch (error) {
    console.error('Deliverables API error:', error);
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
