/**
 * Revision Requests API
 *
 * Handles creating revision requests with full feedback persistence:
 * - Feedback text
 * - Timestamped comments (video timeline markers)
 * - Issue categories
 * - File attachments (stored in R2)
 */

import pg from 'pg';
import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
import { validateRequest } from './_shared/validation';
import { sendEmail } from './send-email';

const { Client } = pg;

const getDbClient = () => {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }

  return new Client({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? true : { rejectUnauthorized: false },
  });
};

export const handler = compose(
  withCORS(['GET', 'POST']),
  withAuth(),
  withRateLimit(RATE_LIMITS.api, 'revision_requests')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  const client = getDbClient();

  try {
    await client.connect();

    // GET: Fetch revision history for a deliverable
    if (event.httpMethod === 'GET') {
      const { deliverableId } = event.queryStringParameters || {};

      if (!deliverableId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'deliverableId parameter is required' }),
        };
      }

      // Verify user can access this deliverable
      const deliverableResult = await client.query(
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

      const { client_user_id, project_id } = deliverableResult.rows[0];
      const userRole = auth?.user?.role;
      const userId = auth?.user?.userId;

      // Permission check: admin/PM can view all, client only their own
      if (userRole !== 'super_admin' && userRole !== 'support') {
        if (userRole === 'client' && client_user_id !== userId) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Access denied' }),
          };
        }
      }

      // Fetch revision requests with attachments
      const revisionsResult = await client.query(
        `SELECT
           rr.id,
           rr.deliverable_id,
           rr.project_id,
           rr.requested_by,
           rr.feedback_text,
           rr.timestamped_comments,
           rr.issue_categories,
           rr.status,
           rr.resolved_at,
           rr.resolved_by,
           rr.resolution_notes,
           rr.created_at,
           u.full_name as requested_by_name,
           u.email as requested_by_email
         FROM revision_requests rr
         LEFT JOIN users u ON rr.requested_by = u.id
         WHERE rr.deliverable_id = $1
         ORDER BY rr.created_at DESC`,
        [deliverableId]
      );

      // Fetch attachments for each revision request
      const revisions = await Promise.all(
        revisionsResult.rows.map(async (revision) => {
          const attachmentsResult = await client.query(
            `SELECT id, file_name, file_size, file_type, r2_key, created_at
             FROM revision_request_attachments
             WHERE revision_request_id = $1
             ORDER BY created_at`,
            [revision.id]
          );

          return {
            ...revision,
            attachments: attachmentsResult.rows.map(a => ({
              id: a.id,
              fileName: a.file_name,
              fileSize: a.file_size,
              fileType: a.file_type,
              r2Key: a.r2_key,
              createdAt: a.created_at,
            })),
          };
        })
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(revisions),
      };
    }

    // POST: Create a new revision request
    if (event.httpMethod === 'POST') {
      const validation = validateRequest(event.body, SCHEMAS.revisionRequest.create, origin);
      if (!validation.success) return validation.response;

      const { deliverableId, feedbackText, timestampedComments, issueCategories, attachments } = validation.data;
      const userId = auth?.user?.userId;
      const userRole = auth?.user?.role;

      // Verify deliverable exists and is awaiting_approval
      const deliverableResult = await client.query(
        `SELECT d.id, d.name, d.status, d.project_id, p.client_user_id,
                p.revisions_used, p.total_revisions_allowed, p.project_number
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

      const deliverable = deliverableResult.rows[0];

      // Validate status
      if (deliverable.status !== 'awaiting_approval') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid deliverable status',
            message: `Cannot request revision: deliverable is "${deliverable.status}", expected "awaiting_approval"`,
          }),
        };
      }

      // Permission check: only client who owns the project can request revisions
      if (userRole === 'client' && deliverable.client_user_id !== userId) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            error: 'Access denied',
            message: 'You do not have permission to request revisions for this deliverable',
          }),
        };
      }

      // Check revision quota
      if (deliverable.revisions_used >= deliverable.total_revisions_allowed) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Revision quota exceeded',
            message: `You have used all ${deliverable.total_revisions_allowed} revisions. Contact support to request additional revisions.`,
            code: 'QUOTA_EXCEEDED',
          }),
        };
      }

      // Begin transaction
      await client.query('BEGIN');

      try {
        // 1. Create revision request
        const revisionResult = await client.query(
          `INSERT INTO revision_requests
             (deliverable_id, project_id, requested_by, feedback_text, timestamped_comments, issue_categories, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending')
           RETURNING id, created_at`,
          [
            deliverableId,
            deliverable.project_id,
            userId,
            feedbackText,
            timestampedComments ? JSON.stringify(timestampedComments) : null,
            issueCategories || null,
          ]
        );

        const revisionRequestId = revisionResult.rows[0].id;

        // 2. Insert attachments
        if (attachments && attachments.length > 0) {
          for (const attachment of attachments) {
            await client.query(
              `INSERT INTO revision_request_attachments
                 (revision_request_id, file_name, file_size, file_type, r2_key, uploaded_by)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                revisionRequestId,
                attachment.fileName,
                attachment.fileSize,
                attachment.fileType,
                attachment.r2Key,
                userId,
              ]
            );
          }
        }

        // 3. Update deliverable status
        await client.query(
          `UPDATE deliverables SET status = 'revision_requested', updated_at = NOW() WHERE id = $1`,
          [deliverableId]
        );

        // 4. Increment revisions_used on project
        await client.query(
          `UPDATE projects SET revisions_used = revisions_used + 1, updated_at = NOW() WHERE id = $1`,
          [deliverable.project_id]
        );

        // 5. Create notifications for admins/PMs
        const adminsResult = await client.query(
          `SELECT id, full_name, email FROM users WHERE role IN ('super_admin', 'support') AND is_active = true`
        );

        const projectUrl = `${process.env.URL || 'http://localhost:5173'}/projects/${deliverable.project_number}?tab=deliverables`;
        const userName = auth?.user?.fullName || auth?.user?.email || 'Client';

        for (const admin of adminsResult.rows) {
          if (admin.id !== userId) {
            await client.query(
              `INSERT INTO notifications (user_id, project_id, type, title, message, action_url, actor_id, actor_name)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                admin.id,
                deliverable.project_id,
                'revision_requested',
                'Revision Requested',
                `${userName} has requested revisions for "${deliverable.name}"`,
                projectUrl,
                userId,
                userName,
              ]
            );
          }
        }

        // Commit transaction
        await client.query('COMMIT');

        // 6. Send email notification to admins (outside transaction)
        try {
          for (const admin of adminsResult.rows) {
            if (admin.id !== userId) {
              await sendEmail({
                to: admin.email,
                subject: `Revision Requested: ${deliverable.name}`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
                    <h2 style="color: #7c3aed;">Revision Request</h2>
                    <p><strong>${userName}</strong> has requested revisions for deliverable <strong>${deliverable.name}</strong> in project <strong>${deliverable.project_number}</strong>.</p>

                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                      <h3 style="margin-top: 0; color: #111827;">Feedback:</h3>
                      <p style="white-space: pre-wrap;">${feedbackText}</p>
                      ${issueCategories && issueCategories.length > 0 ? `
                        <p style="margin-top: 16px;"><strong>Issue Categories:</strong> ${issueCategories.join(', ')}</p>
                      ` : ''}
                      ${timestampedComments && timestampedComments.length > 0 ? `
                        <p style="margin-top: 16px;"><strong>Timeline Comments:</strong> ${timestampedComments.length} comment(s)</p>
                      ` : ''}
                      ${attachments && attachments.length > 0 ? `
                        <p style="margin-top: 16px;"><strong>Attachments:</strong> ${attachments.length} file(s)</p>
                      ` : ''}
                    </div>

                    <div style="margin: 30px 0; text-align: center;">
                      <a href="${projectUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Deliverable</a>
                    </div>

                    <p style="color: #6b7280; font-size: 14px;">
                      Revision ${deliverable.revisions_used + 1} of ${deliverable.total_revisions_allowed} used.
                    </p>
                  </div>
                `,
              });
            }
          }
          console.log('✅ Revision request notification emails sent');
        } catch (emailError) {
          console.error('❌ Failed to send revision request emails:', emailError);
          // Don't fail the request if email fails
        }

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            id: revisionRequestId,
            deliverableId,
            status: 'pending',
            createdAt: revisionResult.rows[0].created_at,
            revisionsUsed: deliverable.revisions_used + 1,
            revisionsAllowed: deliverable.total_revisions_allowed,
          }),
        };

      } catch (txError) {
        await client.query('ROLLBACK');
        throw txError;
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };

  } catch (error) {
    console.error('Revision Requests API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
      }),
    };
  } finally {
    await client.end();
  }
});
