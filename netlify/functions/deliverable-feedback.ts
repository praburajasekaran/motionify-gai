import { z } from 'zod';
import { query, transaction } from './_shared/db';
import { compose, withAuth, withCORS, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { AuthorizationError, createAuthorizationResponse, requireDeliverableAccess } from './_shared/authorization';
import { getDeliverableFileAccess } from './_shared/deliverable-file-access';

const identity = z.object({ deliverableId: z.string().uuid(), fileId: z.string().uuid() });
const createFeedback = identity.extend({ body: z.string().trim().min(1).max(2000) }).and(z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('comment'), timestamp: z.number().finite().min(0).max(86400) }),
  z.object({ kind: z.literal('reply'), parentId: z.string().uuid() }),
]));

export const handler = compose(withCORS(['GET', 'POST']), withAuth(), withRateLimit(RATE_LIMITS.api, 'deliverable-feedback'))(
  async (event: NetlifyEvent, auth?: AuthResult) => {
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);
    const response = (statusCode: number, value: unknown) => ({ statusCode, headers, body: JSON.stringify(value) });
    try {
      if (!['GET', 'POST'].includes(event.httpMethod)) return response(405, { error: 'Method not allowed' });
      let input: unknown = event.queryStringParameters;
      if (event.httpMethod === 'POST') {
        try { input = JSON.parse(event.body || '{}'); }
        catch { return response(400, { error: 'Invalid JSON body' }); }
      }
      const parsed = (event.httpMethod === 'POST' ? createFeedback : identity).safeParse(input);
      if (!parsed.success) return response(400, { error: 'Invalid feedback', details: parsed.error.errors });
      const { deliverableId, fileId } = parsed.data;
      const deliverable = await requireDeliverableAccess(auth?.user, deliverableId, { operation: 'deliverable-feedback' });
      const file = (await query('SELECT * FROM deliverable_files WHERE id = $1 AND deliverable_id = $2', [fileId, deliverableId])).rows[0];
      if (!file) return response(404, { error: 'File not found' });
      const access = await getDeliverableFileAccess(auth?.user, deliverable);
      if (!(file.is_final ? access.final : access.beta)) return response(403, { error: 'File feedback is not available yet' });
      if (event.httpMethod === 'GET') {
        const result = await query(`SELECT f.id, f.deliverable_id, f.file_id, f.parent_id, f.author_id,
          f.body, f.video_timestamp, f.created_at, u.full_name AS author_name
          FROM deliverable_feedback f JOIN users u ON u.id = f.author_id
          WHERE f.deliverable_id = $1 AND f.file_id = $2 ORDER BY f.created_at, f.id`, [deliverableId, fileId]);
        return response(200, result.rows);
      }
      const data = createFeedback.parse(input);
      return await transaction(async tx => {
        const project = (await tx.query('SELECT status FROM projects WHERE id = $1 FOR SHARE', [deliverable.project_id])).rows[0];
        await tx.query('SELECT id FROM deliverables WHERE id = $1 FOR SHARE', [deliverableId]);
        const current = await requireDeliverableAccess(auth?.user, deliverableId, { operation: 'deliverable-feedback.create', runner: tx });
        const currentAccess = await getDeliverableFileAccess(auth?.user, current, (sql, params) => tx.query(sql, params));
        if (!(file.is_final ? currentAccess.final : currentAccess.beta)) return response(403, { error: 'File feedback is not available yet' });
        if (!project || ['on_hold', 'archived', 'cancelled'].includes(project.status)) return response(403, { error: 'Project is not active' });
        if (data.kind === 'reply') {
          const parent = (await tx.query('SELECT id FROM deliverable_feedback WHERE id = $1 AND file_id = $2 AND deliverable_id = $3 AND parent_id IS NULL',
            [data.parentId, fileId, deliverableId])).rows[0];
          if (!parent) return response(400, { error: 'Reply must belong to a comment on this file' });
        }
        const result = await tx.query(`INSERT INTO deliverable_feedback (deliverable_id, file_id, parent_id, author_id, body, video_timestamp)
          VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [deliverableId, fileId, data.kind === 'reply' ? data.parentId : null, auth!.user!.userId, data.body, data.kind === 'comment' ? data.timestamp : null]);
        return response(201, result.rows[0]);
      });
    } catch (error) {
      if (error instanceof AuthorizationError) return createAuthorizationResponse(error, origin);
      console.error('Deliverable feedback failed', error);
      return response(500, { error: 'Unable to save or load feedback. Try again.' });
    }
  }
);
