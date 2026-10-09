/**
 * Revision Requests API
 *
 * Handles creating revision requests with full feedback persistence:
 * - Feedback text
 * - Timestamped comments (video timeline markers)
 * - Issue categories
 * - File attachments (stored in R2)
 */

import { query as dbQuery, transaction } from './_shared/db';
import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
import { validateRequest } from './_shared/validation';
import { sendEmail, summarizeEmailDelivery, type EmailDeliveryResult } from './send-email';
import { absolutePortalProjectUrl, appOriginFromEnv } from '../../shared/canonical-links';
import {
  AuthorizationError,
  createAuthorizationResponse,
  getAuthRole,
  requireClientPrimaryContact,
  requireDeliverableAccess,
} from './_shared/authorization';

export const handler = compose(
  withCORS(['GET', 'POST']),
  withAuth(),
  withRateLimit(RATE_LIMITS.api, 'revision_requests')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  try {
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

      await requireDeliverableAccess(auth?.user, deliverableId, { operation: 'revision-requests.list' });

      // Verify user can access this deliverable
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

      const { client_user_id, project_id } = deliverableResult.rows[0];
      const userRole = getAuthRole(auth?.user);
      const userId = auth?.user?.userId;

      // Fetch revision requests with attachments
      const revisionsResult = await dbQuery(
        `SELECT
           rr.id,
           rr.deliverable_id,
           rr.project_id,
           rr.requested_by,
           rr.feedback_text,
           rr.reviewed_file_id,
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
          const attachmentsResult = await dbQuery(
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

      const { deliverableId, reviewedFileId, reviewedLatestFileId, feedbackText, timestampedComments, issueCategories, attachments } = validation.data;
      const userId = auth?.user?.userId;
      const userRole = getAuthRole(auth?.user);

      // Verify deliverable exists and is awaiting_approval
      const deliverableResult = await dbQuery(
        `SELECT d.id, d.name, d.status, d.project_id, p.client_user_id,
                p.revisions_used, p.total_revisions_allowed, p.project_number,
                p.status AS project_status, p.terms_accepted_at
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
      await requireDeliverableAccess(auth?.user, deliverableId, { operation: 'revision-requests.create' });

      if (userRole !== 'client') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Only the project client can request revisions' }),
        };
      }

      await requireClientPrimaryContact(auth?.user, deliverable.project_id, { operation: 'revision-requests.create' });

      const projectUrl = absolutePortalProjectUrl(deliverable.project_id, { tab: 'deliverables' }, appOriginFromEnv(process.env));
      const userName = auth?.user?.fullName || auth?.user?.email || 'Client';

      const outcome = await transaction(async (txClient) => {
        const projectResult = await txClient.query(
          'SELECT * FROM projects WHERE id = $1 FOR UPDATE', [deliverable.project_id]
        );
        const currentResult = await txClient.query(
          'SELECT status FROM deliverables WHERE id = $1 FOR UPDATE', [deliverableId]
        );
        const project = projectResult.rows[0];
        const current = currentResult.rows[0];
        if (!project || !current) return { conflict: { statusCode: 404, body: { error: 'Deliverable not found' } } };
        await requireClientPrimaryContact(auth?.user, deliverable.project_id, {
          operation: 'revision-requests.create', runner: txClient,
        });
        if (current.status !== 'awaiting_approval') {
          return { conflict: { statusCode: 400, body: {
            error: 'Invalid deliverable status',
            message: `Cannot request revision: deliverable is "${current.status}", expected "awaiting_approval"`,
          } } };
        }
        const betaFiles = await txClient.query(
          'SELECT id FROM deliverable_files WHERE deliverable_id = $1 AND is_final = false ORDER BY uploaded_at DESC, id DESC', [deliverableId]
        );
        const latestFile = betaFiles.rows[0]?.id;
        if ((latestFile && (!reviewedFileId || reviewedLatestFileId !== latestFile)) ||
            (reviewedFileId && !betaFiles.rows.some(file => file.id === reviewedFileId))) {
          return { conflict: { statusCode: 409, body: {
            error: 'The reviewed files have changed. Reload the deliverable before requesting a revision.', code: 'STALE_REVIEW',
          } } };
        }
        if (!project.terms_accepted_at) {
          return { conflict: { statusCode: 403, body: {
            error: 'Terms not accepted', message: 'Project terms must be accepted before requesting revisions',
          } } };
        }
        if (['on_hold', 'archived', 'cancelled'].includes(project.status)) {
          return { conflict: { statusCode: 403, body: {
            error: 'Project is not active', message: `Cannot request revisions while project status is "${project.status}"`,
          } } };
        }
        if (project.revisions_used >= project.total_revisions_allowed) {
          return { conflict: { statusCode: 400, body: {
            error: 'Revision quota exceeded',
            message: `You have used all ${project.total_revisions_allowed} revisions. Contact support to request additional revisions.`,
            code: 'QUOTA_EXCEEDED',
          } } };
        }
        const revisionResult = await txClient.query(
          `INSERT INTO revision_requests
             (deliverable_id, project_id, requested_by, feedback_text, timestamped_comments, issue_categories, reviewed_file_id, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
           RETURNING id, created_at`,
          [
            deliverableId,
            deliverable.project_id,
            userId,
            feedbackText,
            timestampedComments ? JSON.stringify(timestampedComments.map(comment => ({
              ...comment, userId, userName, resolved: false, createdAt: new Date().toISOString(),
            }))) : null,
            issueCategories || null,
            reviewedFileId || null,
          ]
        );

        const revisionRequestId = revisionResult.rows[0].id;

        // 2. Insert attachments
        if (attachments && attachments.length > 0) {
          for (const attachment of attachments) {
            await txClient.query(
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
        await txClient.query(
          `UPDATE deliverables SET status = 'revision_requested', updated_at = NOW() WHERE id = $1`,
          [deliverableId]
        );

        // 4. Increment revisions_used on project
        await txClient.query(
          `UPDATE projects SET revisions_used = revisions_used + 1, updated_at = NOW() WHERE id = $1`,
          [deliverable.project_id]
        );

        // 5. Create notifications for admins/PMs
        const adminsResult = await txClient.query(
          `SELECT id, full_name, email FROM users WHERE role IN ('super_admin', 'support') AND is_active = true`
        );

        for (const admin of adminsResult.rows) {
          if (admin.id !== userId) {
            await txClient.query(
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

        return {
          revisionRequestId,
          revisionCreatedAt: revisionResult.rows[0].created_at,
          adminsRows: adminsResult.rows,
          revisionsUsed: project.revisions_used + 1,
          revisionsAllowed: project.total_revisions_allowed,
        };
      });

      if ('conflict' in outcome) {
        return { statusCode: outcome.conflict.statusCode, headers, body: JSON.stringify(outcome.conflict.body) };
      }
      const { revisionRequestId, revisionCreatedAt, adminsRows, revisionsUsed, revisionsAllowed } = outcome;

      // 6. Send email notification to admins (outside transaction)
      const emailResults: EmailDeliveryResult[] = [];
      try {
        let sentCount = 0;
        for (const admin of adminsRows) {
          if (admin.id !== userId) {
            const emailResult = await sendEmail({
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
                    Revision ${revisionsUsed} of ${revisionsAllowed} used.
                  </p>
                </div>
              `,
            });
            if (emailResult.status === 'sent') sentCount++;
            emailResults.push(emailResult);
          }
        }
        if (sentCount > 0) {
          console.log(`✅ Revision request notification emails sent: ${sentCount}`);
        }
      } catch (emailError) {
        console.error('❌ Failed to send revision request emails:', emailError);
        emailResults.push({ status: 'failed', code: 'EMAIL_SEND_EXCEPTION', retryable: true });
        // Don't fail the request if email fails
      }

      const emailDelivery = summarizeEmailDelivery(emailResults);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          id: revisionRequestId,
          deliverableId,
          status: 'pending',
          createdAt: revisionCreatedAt,
          revisionsUsed,
          revisionsAllowed,
          ...(emailDelivery ? { emailDelivery } : {}),
        }),
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
    console.error('Revision Requests API error:', error);
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
