import { randomUUID } from 'crypto';
import { query as dbQuery } from './_shared/db';
import { logActivity } from './_shared/logActivity';
import { sendDeliverableReadyEmail, sendFinalDeliverablesEmail } from './send-email';
import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
import { validateRequest } from './_shared/validation';
import { deleteMultipleFromR2 } from './_shared/r2';
import { absolutePortalProjectUrl, appOriginFromEnv } from '../../shared/canonical-links';
import {
  AuthorizationError,
  assertAdminLike,
  createAuthorizationResponse,
  getAuthRole,
  requireDeliverableAccess,
  requireProjectAccess,
} from './_shared/authorization';
import { isAdminLike } from './_shared/roles';

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

export const handler = compose(
  withCORS(['GET', 'POST', 'PATCH', 'DELETE']),
  withAuth(),
  withRateLimit(RATE_LIMITS.api, 'deliverables')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  try {
    if (event.httpMethod === 'GET') {
      const { projectId, id } = event.queryStringParameters || {};

      if (id) {
        await requireDeliverableAccess(auth?.user, id, { operation: 'deliverables.get' });

        const result = await dbQuery(
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
        const userRole = getAuthRole(auth?.user);

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

          deliverable.expires_at = expiryDate.toISOString();
          deliverable.files_expired = isExpired;
        }

        delete deliverable.client_user_id;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(deliverable),
        };
      }

      if (projectId) {
        await requireProjectAccess(auth?.user, projectId, { operation: 'deliverables.listByProject' });

        const projectResult = await dbQuery(
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

        const result = await dbQuery(
          `SELECT d.*,
            ${DOMINANT_FILE_CATEGORY_SQL}
           FROM deliverables d WHERE d.project_id = $1 ORDER BY d.estimated_completion_week`,
          [projectId]
        );

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
      assertAdminLike(auth?.user, 'deliverables.create');

      const validation = validateRequest(event.body, SCHEMAS.deliverable.create, origin);
      if (!validation.success) return validation.response;
      const { project_id, name, description, estimated_completion_week } = validation.data;
      await requireProjectAccess(auth?.user, project_id!, { operation: 'deliverables.create' });

      const projectResult = await dbQuery(
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

      const deliverableId = randomUUID();
      const result = await dbQuery(
        `INSERT INTO deliverables (id, project_id, name, description, status, estimated_completion_week, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [deliverableId, project_id, name, description || '', 'pending', estimated_completion_week || 1]
      );

      await logActivity({
        type: 'DELIVERABLE_CREATED',
        userId: auth?.user?.userId || '',
        userName: auth?.user?.fullName || 'Unknown',
        projectId: project_id,
        details: { deliverableId, deliverableName: name },
      });

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

      const currentDeliverable = await dbQuery(
        'SELECT status, name, project_id FROM deliverables WHERE id = $1',
        [id]
      );
      const oldDeliverableStatus = currentDeliverable.rows[0]?.status;
      const deliverableName = currentDeliverable.rows[0]?.name;
      const deliverableProjectId = currentDeliverable.rows[0]?.project_id;
      if (!oldDeliverableStatus) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Deliverable not found' }),
        };
      }

      await requireDeliverableAccess(auth?.user, id, { operation: 'deliverables.update' });
      const requesterRole = getAuthRole(auth?.user);
      if (!isAdminLike(requesterRole)) {
        const allowedClientApproval =
          requesterRole === 'client' &&
          updates.status === 'approved' &&
          !updates.beta_file_key &&
          !updates.beta_file_url &&
          !updates.final_file_key &&
          !updates.final_file_url;
        if (!allowedClientApproval) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Access denied' }),
          };
        }
        updates.approved_by = auth!.user!.userId;
      }

      const allowedFields = [
        'status',
        'beta_file_url', 'beta_file_key',
        'final_file_url', 'final_file_key',
        'approved_by'
      ];

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      for (const field of allowedFields) {
        if (field in updates) {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(updates[field]);
          paramIndex++;
        }
      }

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

      if (updates.status === 'final_delivered') {
        updateFields.push(`final_delivered_at = NOW()`);
      }

      const sql = `
        UPDATE deliverables
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      updateValues.push(id);

      const result = await dbQuery(sql, updateValues);

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Deliverable not found' }),
        };
      }

      const updatedDeliverable = result.rows[0];

      if (updates.status && oldDeliverableStatus !== updates.status) {
        let activityType = 'DELIVERABLE_STATUS_CHANGED';
        if (updates.status === 'awaiting_approval' || updates.status === 'final_delivered') {
          activityType = 'DELIVERABLE_UPLOADED';
        } else if (updates.status === 'approved') {
          activityType = 'DELIVERABLE_APPROVED';
        }
        await logActivity({
          type: activityType,
          userId: auth?.user?.userId || '',
          userName: auth?.user?.fullName || 'Unknown',
          projectId: deliverableProjectId,
          details: {
            deliverableId: id,
            deliverableName: deliverableName || '',
            oldStatus: oldDeliverableStatus || '',
            newStatus: updates.status,
            ...(updates.status === 'final_delivered' ? { stage: 'final' } : {}),
          },
        });
      }

      if (updates.status === 'awaiting_approval') {
        try {
          const projectResult = await dbQuery(
            `SELECT p.project_number, u.email, u.full_name
             FROM projects p
             JOIN users u ON p.client_user_id = u.id
             WHERE p.id = $1`,
            [updatedDeliverable.project_id]
          );

          if (projectResult.rows.length > 0) {
            const { project_number, email, full_name } = projectResult.rows[0];
            await sendDeliverableReadyEmail({
              to: email,
              clientName: full_name,
              projectNumber: project_number,
              deliverableName: updatedDeliverable.name,
              deliverableUrl: absolutePortalProjectUrl(updatedDeliverable.project_id, { tab: 'deliverables' }, appOriginFromEnv(process.env)),
              deliveryNotes: updatedDeliverable.description
            });
            console.log('✅ Deliverable ready email sent to:', email);
          }
        } catch (emailError) {
          console.error('❌ Failed to send deliverable ready email:', emailError);
        }
      }

      if (updates.status === 'final_delivered') {
        try {
          const projectResult = await dbQuery(
            `SELECT p.project_number, u.email, u.full_name
             FROM projects p
             JOIN users u ON p.client_user_id = u.id
             WHERE p.id = $1`,
            [updatedDeliverable.project_id]
          );

          if (projectResult.rows.length > 0) {
            const { project_number, email, full_name } = projectResult.rows[0];
            await sendFinalDeliverablesEmail({
              to: email,
              clientName: full_name,
              projectNumber: project_number,
              deliverableName: updatedDeliverable.name,
              downloadUrl: absolutePortalProjectUrl(updatedDeliverable.project_id, { tab: 'deliverables' }, appOriginFromEnv(process.env)),
              expiryDays: 365
            });
            console.log('✅ Final deliverables email sent to:', email);
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
      const pathParts = event.path.split('/');
      const id = pathParts[pathParts.length - 1];

      if (!id || id === 'deliverables') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Deliverable ID is required' }),
        };
      }

      assertAdminLike(auth?.user, 'deliverables.delete');

      const deliverableResult = await dbQuery(
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
      const fileKeysToDelete: string[] = [];
      if (deliverable.beta_file_key) fileKeysToDelete.push(deliverable.beta_file_key);
      if (deliverable.final_file_key) fileKeysToDelete.push(deliverable.final_file_key);

      const filesResult = await dbQuery(
        'SELECT file_key FROM deliverable_files WHERE deliverable_id = $1',
        [id]
      );
      for (const file of filesResult.rows) {
        if (file.file_key) fileKeysToDelete.push(file.file_key);
      }

      if (fileKeysToDelete.length > 0) {
        try {
          await deleteMultipleFromR2(fileKeysToDelete);
          console.log(`[Deliverables] Deleted ${fileKeysToDelete.length} files from R2 for deliverable ${id}`);
        } catch (r2Error) {
          console.error('[Deliverables] R2 cleanup error:', r2Error);
        }
      }

      await logActivity({
        type: 'DELIVERABLE_DELETED',
        userId: auth?.user?.userId || '',
        userName: auth?.user?.fullName || 'Unknown',
        projectId: deliverable.project_id,
        details: { deliverableId: id, deliverableName: deliverable.name },
      });

      await dbQuery('DELETE FROM deliverables WHERE id = $1', [id]);

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
    if (error instanceof AuthorizationError) {
      return createAuthorizationResponse(error, origin);
    }
    console.error('Deliverables API error:', error);
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
