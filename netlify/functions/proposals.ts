import pg from 'pg';
import { sendProposalNotificationEmail, sendProposalStatusChangeEmail } from './send-email';
import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
import { validateRequest } from './_shared/validation';

const { Client } = pg;

interface ProposalDeliverable {
  id: string;
  name: string;
  description: string;
  estimatedCompletionWeek: number;
}

interface CreateProposalPayload {
  inquiryId: string;
  description: string;
  deliverables: ProposalDeliverable[];
  currency: 'INR' | 'USD';
  totalPrice: number;
  advancePercentage: number;
  advanceAmount: number;
  balanceAmount: number;
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

/**
 * Send status change notifications (email + in-app) when proposal status changes
 * Notifies clients on admin actions, notifies admins on client responses
 */
async function notifyStatusChange(
  client: pg.Client,
  proposalId: string,
  newStatus: 'sent' | 'accepted' | 'rejected' | 'changes_requested',
  changedByUserId: string,
  feedback?: string
) {
  try {
    // Fetch proposal with inquiry details and client info
    const proposalResult = await client.query(
      `SELECT
        p.id,
        p.inquiry_id,
        p.client_user_id,
        i.inquiry_number,
        i.contact_name as client_name,
        i.contact_email as client_email,
        u.full_name as changed_by_name,
        u.role as changed_by_role
      FROM proposals p
      JOIN inquiries i ON p.inquiry_id = i.id
      LEFT JOIN users u ON u.id = $2
      WHERE p.id = $1`,
      [proposalId, changedByUserId]
    );

    if (proposalResult.rows.length === 0) {
      console.warn(`⚠️ Proposal ${proposalId} not found for notification`);
      return;
    }

    const proposal = proposalResult.rows[0];
    const proposalTitle = `Proposal ${proposal.inquiry_number}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const proposalUrl = `${appUrl}/proposal/${proposalId}`;

    const isAdminChange = proposal.changed_by_role !== 'client';

    // Determine who to notify
    if (isAdminChange) {
      // Admin changed status → notify client
      try {
        await sendProposalStatusChangeEmail({
          to: proposal.client_email,
          recipientName: proposal.client_name,
          proposalId,
          proposalTitle,
          newStatus,
          isClientRecipient: true,
          changedBy: proposal.changed_by_name,
          feedback,
        });
        console.log(`✅ Status change email sent to client: ${proposal.client_email}`);
      } catch (emailError) {
        console.error('❌ Failed to send status change email to client:', emailError);
      }

      // Create in-app notification for client
      if (proposal.client_user_id) {
        try {
          await client.query(
            `INSERT INTO notifications (user_id, project_id, type, title, message, action_url, actor_id, actor_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              proposal.client_user_id,
              proposalId,
              'proposal_status_changed',
              'Proposal Status Updated',
              `Your proposal status is now: ${newStatus.replace(/_/g, ' ')}`,
              proposalUrl,
              changedByUserId,
              proposal.changed_by_name || 'Admin',
            ]
          );
          console.log(`✅ In-app notification created for client: ${proposal.client_user_id}`);
        } catch (notificationError) {
          console.error('❌ Failed to create in-app notification for client:', notificationError);
        }
      }
    } else {
      // Client changed status → notify all admins (super_admin and project_manager)
      const adminsResult = await client.query(
        `SELECT id, email, full_name
         FROM users
         WHERE role IN ('super_admin', 'project_manager')`
      );

      for (const admin of adminsResult.rows) {
        // Send email to each admin
        try {
          await sendProposalStatusChangeEmail({
            to: admin.email,
            recipientName: admin.full_name,
            proposalId,
            proposalTitle,
            newStatus,
            isClientRecipient: false,
            changedBy: proposal.client_name,
            feedback,
          });
          console.log(`✅ Status change email sent to admin: ${admin.email}`);
        } catch (emailError) {
          console.error(`❌ Failed to send status change email to admin ${admin.email}:`, emailError);
        }

        // Create in-app notification for each admin
        try {
          await client.query(
            `INSERT INTO notifications (user_id, project_id, type, title, message, action_url, actor_id, actor_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              admin.id,
              proposalId,
              'proposal_status_changed',
              '[Client Response] Proposal Status Updated',
              `${proposal.client_name} responded with: ${newStatus.replace(/_/g, ' ')}`,
              proposalUrl,
              changedByUserId,
              proposal.client_name,
            ]
          );
          console.log(`✅ In-app notification created for admin: ${admin.id}`);
        } catch (notificationError) {
          console.error(`❌ Failed to create in-app notification for admin ${admin.id}:`, notificationError);
        }
      }
    }
  } catch (error) {
    // Log error but don't throw - notifications should not fail the request
    console.error('❌ Error in notifyStatusChange:', error);
  }
}

export const handler = compose(
  withCORS(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  withAuth(),
  withRateLimit(RATE_LIMITS.api, 'proposals')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  const client = getDbClient();

  // Helper to extract proposal ID from path
  const pathParts = event.path.split('/');
  const lastPart = pathParts[pathParts.length - 1];
  const isIdPath = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lastPart);
  const proposalId = isIdPath ? lastPart : null;

  try {
    await client.connect();

    // Handle PUT request for updating a proposal
    if (event.httpMethod === 'PUT' && proposalId) {
      const validation = validateRequest(event.body, SCHEMAS.proposal.update, origin);
      if (!validation.success) return validation.response;
      const updates = validation.data;

      const allowedFields = [
        'description', 'deliverables', 'currency', 'total_price',
        'advance_percentage', 'advance_amount', 'balance_amount',
        'status', 'feedback', 'version', 'edit_history'
      ];

      // Map camelCase to snake_case
      const fieldMapping: Record<string, string> = {
        totalPrice: 'total_price',
        advancePercentage: 'advance_percentage',
        advanceAmount: 'advance_amount',
        balanceAmount: 'balance_amount',
        editHistory: 'edit_history',
        acceptedAt: 'accepted_at',
        rejectedAt: 'rejected_at',
      };

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      Object.keys(updates).forEach((key) => {
        const dbField = fieldMapping[key] || key;
        if (allowedFields.includes(dbField)) {
          let value = updates[key];
          if (dbField === 'deliverables' || dbField === 'edit_history') {
            value = JSON.stringify(value);
          }
          updateFields.push(`${dbField} = $${paramIndex}`);
          updateValues.push(value);
          paramIndex++;
        }
        // Handle status timestamps
        if (key === 'status') {
          if (updates[key] === 'accepted') {
            updateFields.push(`accepted_at = NOW()`);
          } else if (updates[key] === 'rejected') {
            updateFields.push(`rejected_at = NOW()`);
          }
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

      const query = `
        UPDATE proposals 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      updateValues.push(proposalId);

      const result = await client.query(query, updateValues);

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Proposal not found' }),
        };
      }

      // Update inquiry status if proposal is accepted
      if (updates.status === 'accepted') {
        await client.query(
          `UPDATE inquiries SET status = 'accepted' WHERE proposal_id = $1`,
          [proposalId]
        );
      }

      // Send notifications if status changed
      if (updates.status && auth?.user?.userId) {
        await notifyStatusChange(
          client,
          proposalId,
          updates.status as 'sent' | 'accepted' | 'rejected' | 'changes_requested',
          auth.user.userId,
          updates.feedback as string | undefined
        );
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows[0]),
      };
    }

    // Handle PATCH request for updating proposal status
    if (event.httpMethod === 'PATCH' && proposalId) {
      const validation = validateRequest(event.body, SCHEMAS.proposal.update, origin);
      if (!validation.success) return validation.response;
      const { status, feedback } = validation.data;

      const updateFields = ['status = $1', 'updated_at = NOW()'];
      const params: any[] = [status];
      let paramIndex = 2;

      if (status === 'accepted') {
        updateFields.push(`accepted_at = NOW()`);
      } else if (status === 'rejected') {
        updateFields.push(`rejected_at = NOW()`);
      }

      if (feedback) {
        updateFields.push(`feedback = $${paramIndex}`);
        params.push(feedback);
        paramIndex++;
      }

      params.push(proposalId);

      const query = `
        UPDATE proposals 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Proposal not found' }),
        };
      }

      if (status === 'accepted') {
        await client.query(
          `UPDATE inquiries SET status = 'accepted' WHERE proposal_id = $1`,
          [proposalId]
        );
      }

      // Send notifications on status change
      if (status && auth?.user?.userId) {
        await notifyStatusChange(
          client,
          proposalId,
          status as 'sent' | 'accepted' | 'rejected' | 'changes_requested',
          auth.user.userId,
          feedback as string | undefined
        );
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows[0]),
      };
    }

    if (event.httpMethod === 'GET') {
      const pathParts = event.path.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lastPart);

      if (isId) {
        const result = await client.query('SELECT * FROM proposals WHERE id = $1', [lastPart]);

        if (result.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Proposal not found' }),
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result.rows[0]),
        };
      }

      const { inquiryId } = event.queryStringParameters || {};

      let query = 'SELECT * FROM proposals ORDER BY created_at DESC';
      const params: any[] = [];

      if (inquiryId) {
        query = 'SELECT * FROM proposals WHERE inquiry_id = $1 ORDER BY created_at DESC';
        params.push(inquiryId);
      }

      const result = await client.query(query, params);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows),
      };
    }

    if (event.httpMethod === 'POST') {
      const validation = validateRequest(event.body, SCHEMAS.proposal.create, origin);
      if (!validation.success) return validation.response;
      const payload = validation.data;

      const inquiryResult = await client.query(
        'SELECT id, inquiry_number, contact_email, contact_name FROM inquiries WHERE id = $1',
        [payload.inquiryId]
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

      let clientUserId: string | null = null;

      const existingUserResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [contact_email]
      );

      if (existingUserResult.rows.length > 0) {
        clientUserId = existingUserResult.rows[0].id;
      } else {
        const newUserResult = await client.query(
          `INSERT INTO users (email, full_name, role) 
           VALUES ($1, $2, 'client') 
           RETURNING id`,
          [contact_email, contact_name]
        );
        clientUserId = newUserResult.rows[0].id;
      }

      const result = await client.query(
        `INSERT INTO proposals (
          inquiry_id, description, deliverables, currency, total_price,
          advance_percentage, advance_amount, balance_amount, client_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          payload.inquiryId,
          payload.description,
          JSON.stringify(payload.deliverables),
          payload.currency,
          payload.totalPrice,
          payload.advancePercentage,
          payload.advanceAmount,
          payload.balanceAmount,
          clientUserId,
        ]
      );

      await client.query(
        `UPDATE inquiries SET proposal_id = $1, status = 'proposal_sent' WHERE id = $2`,
        [result.rows[0].id, payload.inquiryId]
      );

      // Send proposal notification email to client
      const proposalId = result.rows[0].id;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const proposalUrl = `${appUrl}/proposal/${proposalId}`;

      // Format price for email (convert from smallest unit if needed)
      const formattedPrice = (payload.totalPrice / 100).toLocaleString('en-IN');

      try {
        await sendProposalNotificationEmail({
          to: contact_email,
          clientName: contact_name,
          inquiryNumber: inquiry.inquiry_number,
          proposalUrl: proposalUrl,
          totalPrice: formattedPrice,
          currency: payload.currency === 'INR' ? '₹' : '$',
          deliverableCount: payload.deliverables.length,
        });
        console.log(`✅ Proposal notification email sent to ${contact_email}`);
      } catch (emailError) {
        console.error('❌ Failed to send proposal notification email:', emailError);
        // Don't fail the request if email fails
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(result.rows[0]),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };

  } catch (error) {
    console.error('Proposals API error:', error);
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
