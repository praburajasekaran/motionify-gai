import pg from 'pg';
import { sendProposalNotificationEmail } from './send-email';

const { Client } = pg;

interface NetlifyEvent {
  httpMethod: string;
  headers: Record<string, string>;
  body: string | null;
  path: string;
  queryStringParameters: Record<string, string> | null;
}

interface NetlifyResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

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

export const handler = async (
  event: NetlifyEvent
): Promise<NetlifyResponse> => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

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
      const updates = JSON.parse(event.body || '{}');

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

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows[0]),
      };
    }

    // Handle PATCH request for updating proposal status
    if (event.httpMethod === 'PATCH' && proposalId) {
      const { status, feedback } = JSON.parse(event.body || '{}');

      if (!status) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'status is required' }),
        };
      }

      const validStatuses = ['sent', 'accepted', 'rejected', 'changes_requested'];
      if (!validStatuses.includes(status)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `status must be one of: ${validStatuses.join(', ')}` }),
        };
      }

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
      const payload: CreateProposalPayload = JSON.parse(event.body || '{}');

      if (!payload.inquiryId || !payload.description || !payload.deliverables || payload.deliverables.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'inquiryId, description, and deliverables are required' }),
        };
      }

      if (![40, 50, 60].includes(payload.advancePercentage)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'advancePercentage must be 40, 50, or 60' }),
        };
      }

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
};
