import { randomUUID } from 'crypto';
import { query as dbQuery } from './_shared/db';
import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { z } from 'zod';
import {
  AuthorizationError,
  createAuthorizationResponse,
  requireDeliverableAccess,
} from './_shared/authorization';
import { isAdminLike } from './_shared/roles';

// Validation schema for creating a deliverable file
const createFileSchema = z.object({
  deliverable_id: z.string().uuid(),
  file_key: z.string().min(1),
  file_name: z.string().min(1).max(255),
  file_size: z.number().optional(),
  mime_type: z.string().max(100).optional(),
  file_category: z.enum(['video', 'script', 'document', 'image', 'audio', 'asset']).default('asset'),
  is_final: z.boolean().default(false),
  label: z.string().max(255).optional(),
});

export const handler = compose(
  withCORS(['GET', 'POST', 'DELETE']),
  withAuth(),
  withRateLimit(RATE_LIMITS.api, 'deliverable-files')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  try {
    const userRole = auth?.user?.role;
    const userId = auth?.user?.userId;

    if (event.httpMethod === 'GET') {
      const { deliverableId } = event.queryStringParameters || {};

      if (!deliverableId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'deliverableId parameter is required' }),
        };
      }

      await requireDeliverableAccess(auth?.user, deliverableId, { operation: 'deliverable-files.list' });

      // First validate user can access this deliverable
      const deliverableResult = await dbQuery(
        `SELECT d.id, d.project_id, p.client_user_id
         FROM deliverables d
         JOIN projects p ON d.project_id = p.id
         WHERE d.id = $1`,
        [deliverableId]
      );

      if (deliverableResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Deliverable not found' }),
        };
      }

      const { project_id, client_user_id } = deliverableResult.rows[0];

      // Fetch files for this deliverable
      const filesResult = await dbQuery(
        `SELECT id, deliverable_id, file_key, file_name, file_size, mime_type,
                file_category, is_final, label, sort_order, uploaded_at, uploaded_by
         FROM deliverable_files
         WHERE deliverable_id = $1
         ORDER BY sort_order, uploaded_at`,
        [deliverableId]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(filesResult.rows),
      };
    }

    if (event.httpMethod === 'POST') {
      // Only admins and PMs can add files
      if (!isAdminLike(userRole)) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Only admins can add files to deliverables' }),
        };
      }

      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid JSON body' }),
        };
      }

      const validation = createFileSchema.safeParse(body);
      if (!validation.success) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Validation failed',
            details: validation.error.errors,
          }),
        };
      }

      const data = validation.data;

      // Verify deliverable exists
      const deliverableResult = await dbQuery(
        `SELECT id, project_id FROM deliverables WHERE id = $1`,
        [data.deliverable_id]
      );

      if (deliverableResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Deliverable not found' }),
        };
      }
      await requireDeliverableAccess(auth?.user, data.deliverable_id, { operation: 'deliverable-files.create' });
      if (!data.file_key.startsWith(`projects/${deliverableResult.rows[0].project_id}/`)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'File key does not match the authorized deliverable project' }),
        };
      }

      // Get current max sort_order
      const sortResult = await dbQuery(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order
         FROM deliverable_files WHERE deliverable_id = $1`,
        [data.deliverable_id]
      );
      const nextOrder = sortResult.rows[0].next_order;

      // Insert the file
      const fileId = randomUUID();
      const result = await dbQuery(
        `INSERT INTO deliverable_files
         (id, deliverable_id, file_key, file_name, file_size, mime_type, file_category, is_final, label, sort_order, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          fileId,
          data.deliverable_id,
          data.file_key,
          data.file_name,
          data.file_size || null,
          data.mime_type || null,
          data.file_category,
          data.is_final,
          data.label || null,
          nextOrder,
          userId,
        ]
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(result.rows[0]),
      };
    }

    if (event.httpMethod === 'DELETE') {
      // Only admins and PMs can delete files
      if (!isAdminLike(userRole)) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Only admins can delete files from deliverables' }),
        };
      }

      const pathParts = event.path.split('/');
      const fileId = pathParts[pathParts.length - 1];

      if (!fileId || fileId === 'deliverable-files') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'File ID is required' }),
        };
      }

      const fileResult = await dbQuery(
        `SELECT id, deliverable_id FROM deliverable_files WHERE id = $1`,
        [fileId]
      );

      if (fileResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'File not found' }),
        };
      }
      await requireDeliverableAccess(auth?.user, fileResult.rows[0].deliverable_id, {
        operation: 'deliverable-files.delete',
      });

      const result = await dbQuery(
        `DELETE FROM deliverable_files WHERE id = $1 RETURNING id`,
        [fileId]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, deleted: fileId }),
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
    console.error('Deliverable files API error:', error);
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
