import { randomUUID } from 'crypto';
import { query as dbQuery, transaction } from './_shared/db';
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
  requireClientPrimaryContact,
  requireDeliverableAccess,
  requireProjectAccess,
} from './_shared/authorization';
import { isAdminLike } from './_shared/roles';
import { requireDeliverableUpload } from './_shared/deliverable-upload';

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

const THUMBNAIL_SQL = `(SELECT df.thumbnail_key FROM deliverable_files df WHERE df.deliverable_id = d.id
  AND df.thumbnail_key IS NOT NULL AND df.is_final = (d.status = 'final_delivered')
  ORDER BY df.uploaded_at DESC, df.id DESC LIMIT 1) AS thumbnail_key`;

const APPROVAL_HISTORY_SQL = `
  COALESCE((SELECT jsonb_agg(history.entry ORDER BY history.occurred_at)
    FROM (
      SELECT rr.created_at AS occurred_at, jsonb_build_object(
        'id', rr.id, 'deliverableId', rr.deliverable_id, 'action', 'rejected',
        'timestamp', rr.created_at, 'userId', rr.requested_by,
        'userName', COALESCE(u.full_name, 'Client'), 'userEmail', COALESCE(u.email, ''),
        'reviewedFileId', rr.reviewed_file_id,
        'reviewedFileName', (SELECT file_name FROM deliverable_files WHERE id = rr.reviewed_file_id),
        'feedback', rr.feedback_text, 'timestampedComments', COALESCE(rr.timestamped_comments, '[]'::jsonb),
        'issueCategories', COALESCE(to_jsonb(rr.issue_categories), '[]'::jsonb),
        'attachments', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'id', a.id, 'fileName', a.file_name, 'fileSize', a.file_size,
          'fileType', a.file_type, 'r2Key', a.r2_key
        ) ORDER BY a.created_at) FROM revision_request_attachments a WHERE a.revision_request_id = rr.id), '[]'::jsonb)
      ) AS entry
      FROM revision_requests rr LEFT JOIN users u ON u.id = rr.requested_by
      WHERE rr.deliverable_id = d.id
      UNION ALL
      SELECT d.approved_at, jsonb_build_object(
        'id', d.id::text || '-approval', 'deliverableId', d.id, 'action', 'approved',
        'timestamp', d.approved_at, 'userId', d.approved_by,
        'userName', COALESCE(u.full_name, 'Client'), 'userEmail', COALESCE(u.email, '')
      ) FROM users u WHERE u.id = d.approved_by AND d.approved_at IS NOT NULL
    ) history), '[]'::jsonb) AS approval_history`;

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
            ${DOMINANT_FILE_CATEGORY_SQL}, ${APPROVAL_HISTORY_SQL}, ${THUMBNAIL_SQL}
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
            ${DOMINANT_FILE_CATEGORY_SQL}, ${APPROVAL_HISTORY_SQL}, ${THUMBNAIL_SQL}
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
        `SELECT d.status, d.name, d.project_id, p.status AS project_status, p.terms_accepted_at
         FROM deliverables d
         JOIN projects p ON d.project_id = p.id
         WHERE d.id = $1`,
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
      const staffBetaUpdate = requesterRole === 'team_member' && updates.status === 'beta_ready'
        && Object.keys(updates).every(field => field === 'status');
      if (staffBetaUpdate) {
        await requireDeliverableUpload(auth?.user, id, false);
        const uploaded = await dbQuery('SELECT id FROM deliverable_files WHERE deliverable_id = $1 AND uploaded_by = $2 AND is_final = false LIMIT 1', [id, auth?.user?.userId]);
        if (!uploaded.rows.length) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Upload a beta file before updating review status' }) };
      } else if (!isAdminLike(requesterRole)) {
        const allowedClientApproval =
          requesterRole === 'client' &&
          updates.status === 'approved' &&
          Object.keys(updates).every(field => ['status', 'approved_by'].includes(field)) &&
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
        await requireClientPrimaryContact(auth?.user, deliverableProjectId, { operation: 'deliverables.approve' });
        if (oldDeliverableStatus !== 'awaiting_approval') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Invalid deliverable status',
              message: `Cannot approve deliverable with status "${oldDeliverableStatus}"`,
            }),
          };
        }
        if (!currentDeliverable.rows[0].terms_accepted_at) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({
              error: 'Terms not accepted',
              message: 'Project terms must be accepted before approving deliverables',
            }),
          };
        }
        if (['on_hold', 'archived', 'cancelled'].includes(currentDeliverable.rows[0].project_status)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({
              error: 'Project is not active',
              message: `Cannot approve deliverables while project status is "${currentDeliverable.rows[0].project_status}"`,
            }),
          };
        }
      }

      if (updates.status === 'approved') updates.approved_by = auth!.user!.userId;
      else delete updates.approved_by;

      if (updates.assigned_to) {
        const assignee = await dbQuery(`SELECT u.id FROM users u JOIN project_team pt ON pt.user_id = u.id
          WHERE pt.project_id = $1 AND u.id = $2 AND pt.removed_at IS NULL
          AND pt.role = 'team_member' AND u.role = 'team_member' AND u.is_active = true`, [deliverableProjectId, updates.assigned_to]);
        if (!assignee.rows.length) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Assignee must be an active staff member of this project' }) };
      }

      const allowedFields = [
        'status',
        'beta_file_url', 'beta_file_key',
        'final_file_url', 'final_file_key',
        'approved_by', 'assigned_to'
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
          AND status = $${paramIndex + 1}
        RETURNING *
      `;

      updateValues.push(id);
      updateValues.push(oldDeliverableStatus);

      const result = staffBetaUpdate ? await transaction(async tx => {
        await tx.query('SELECT id FROM projects WHERE id = $1 FOR SHARE', [deliverableProjectId]);
        await tx.query('SELECT id FROM deliverables WHERE id = $1 FOR UPDATE', [id]);
        await requireDeliverableUpload(auth?.user, id, false, tx);
        return tx.query(sql, updateValues);
      }) : await dbQuery(sql, updateValues);

      if (result.rows.length === 0) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: 'Deliverable changed', message: 'This deliverable changed during your review. Reload before trying again.' }),
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

      let emailDeliveryStatus: 'sent' | 'failed' | undefined;

      if (updates.status === 'awaiting_approval') {
        emailDeliveryStatus = 'failed';
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
            const emailResult = await sendDeliverableReadyEmail({
              to: email,
              clientName: full_name,
              projectNumber: project_number,
              deliverableName: updatedDeliverable.name,
              deliverableUrl: absolutePortalProjectUrl(updatedDeliverable.project_id, { tab: 'deliverables' }, appOriginFromEnv(process.env)),
              deliveryNotes: updatedDeliverable.description
            });
            emailDeliveryStatus = emailResult.status;
            if (emailResult.status === 'sent') {
              console.log('✅ Deliverable ready email sent to:', email);
            }
          }
        } catch (emailError) {
          console.error('❌ Failed to send deliverable ready email:', emailError);
        }
      }

      if (updates.status === 'final_delivered') {
        emailDeliveryStatus = 'failed';
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
            const emailResult = await sendFinalDeliverablesEmail({
              to: email,
              clientName: full_name,
              projectNumber: project_number,
              deliverableName: updatedDeliverable.name,
              downloadUrl: absolutePortalProjectUrl(updatedDeliverable.project_id, { tab: 'deliverables' }, appOriginFromEnv(process.env)),
              expiryDays: 365
            });
            emailDeliveryStatus = emailResult.status;
            if (emailResult.status === 'sent') {
              console.log('✅ Final deliverables email sent to:', email);
            }
          }
        } catch (emailError) {
          console.error('❌ Failed to send final deliverables email:', emailError);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ...updatedDeliverable,
          ...(emailDeliveryStatus && { emailDelivery: { status: emailDeliveryStatus } }),
        }),
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
