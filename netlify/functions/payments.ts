import pg from 'pg';
import Razorpay from 'razorpay';
import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
import { validateRequest } from './_shared/validation';
import { sendPaymentReminderEmail } from './send-email';

const { Client } = pg;

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

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export const handler = compose(
  withCORS(['GET', 'POST']),
  withAuth(),
  withRateLimit(RATE_LIMITS.apiStrict, 'payments')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  const client = getDbClient();

  try {
    await client.connect();

    if (event.httpMethod === 'GET') {
      const { proposalId, projectId } = event.queryStringParameters || {};

      let query = 'SELECT * FROM payments ORDER BY created_at DESC';
      const params: any[] = [];

      if (proposalId) {
        query = 'SELECT * FROM payments WHERE proposal_id = $1 ORDER BY created_at DESC';
        params.push(proposalId);
      } else if (projectId) {
        query = 'SELECT * FROM payments WHERE project_id = $1 ORDER BY created_at DESC';
        params.push(projectId);
      }

      const result = await client.query(query, params);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows),
      };
    }

    if (event.httpMethod === 'POST') {
      const pathParts = event.path.split('/');
      const action = pathParts[pathParts.length - 1];

      if (action === 'create-order') {
        const validation = validateRequest(event.body, SCHEMAS.payment.createOrder, origin);
        if (!validation.success) return validation.response;
        const { proposalId, paymentType } = validation.data;

        const proposalResult = await client.query(
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
        const amount = paymentType === 'advance' ? proposal.advance_amount : proposal.balance_amount;

        // Create Razorpay order
        const orderOptions = {
          amount: amount, // amount in the smallest currency unit
          currency: proposal.currency,
          receipt: `receipt_${proposalId.substring(0, 8)}_${Date.now()}`,
        };

        try {
          const razorpayOrder = await razorpay.orders.create(orderOptions);

          const result = await client.query(
            `INSERT INTO payments (
                proposal_id, payment_type, amount, currency, status, razorpay_order_id
              ) VALUES ($1, $2, $3, $4, 'pending', $5)
              RETURNING *`,
            [proposalId, paymentType, amount, proposal.currency, razorpayOrder.id]
          );

          return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
              ...result.rows[0],
              razorpayOrderId: razorpayOrder.id,
              razorpayKeyId: process.env.RAZORPAY_KEY_ID,
              amount: amount,
              currency: proposal.currency,
              name: "Motionify",
              description: "Project Payment",
            }),
          };
        } catch (err) {
          console.error('Error creating Razorpay order:', err);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to create payment order' }),
          };
        }
      }

      if (action === 'verify') {
        const validation = validateRequest(event.body, SCHEMAS.payment.verify, origin);
        if (!validation.success) return validation.response;
        const { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = validation.data;

        const result = await client.query(
          `UPDATE payments 
           SET razorpay_order_id = $1, 
               razorpay_payment_id = $2, 
               razorpay_signature = $3,
               status = 'completed',
               paid_at = NOW()
           WHERE id = $4
           RETURNING *`,
          [razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId]
        );

        if (result.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Payment not found' }),
          };
        }

        const payment = result.rows[0];

        if (payment.payment_type === 'advance') {
          // Get proposal details for project creation
          const proposalResult = await client.query(
            'SELECT * FROM proposals WHERE id = $1',
            [payment.proposal_id]
          );

          if (proposalResult.rows.length > 0) {
            const proposal = proposalResult.rows[0];

            // Get inquiry details
            const inquiryResult = await client.query(
              'SELECT * FROM inquiries WHERE proposal_id = $1',
              [payment.proposal_id]
            );

            if (inquiryResult.rows.length > 0) {
              const inquiry = inquiryResult.rows[0];

              // Generate project number
              const year = new Date().getFullYear();
              const projectNumResult = await client.query(
                `SELECT project_number FROM projects 
                 WHERE project_number LIKE $1 
                 ORDER BY project_number DESC LIMIT 1`,
                [`PROJ-${year}-%`]
              );

              let maxNumber = 0;
              if (projectNumResult.rows.length > 0) {
                const match = projectNumResult.rows[0].project_number.match(/PROJ-\d{4}-(\d+)/);
                if (match) {
                  maxNumber = parseInt(match[1], 10);
                }
              }
              const projectNumber = `PROJ-${year}-${String(maxNumber + 1).padStart(3, '0')}`;

              // Get or create client user
              let clientUserId = proposal.client_user_id;
              if (!clientUserId) {
                const userResult = await client.query(
                  'SELECT id FROM users WHERE email = $1',
                  [inquiry.contact_email]
                );
                if (userResult.rows.length > 0) {
                  clientUserId = userResult.rows[0].id;
                } else {
                  const newUserResult = await client.query(
                    `INSERT INTO users (email, full_name, role) 
                     VALUES ($1, $2, 'client') 
                     RETURNING id`,
                    [inquiry.contact_email, inquiry.contact_name]
                  );
                  clientUserId = newUserResult.rows[0].id;
                }
              }

              // Create project
              const projectResult = await client.query(
                `INSERT INTO projects (
                  project_number, inquiry_id, proposal_id, client_user_id, status
                ) VALUES ($1, $2, $3, $4, 'active')
                RETURNING *`,
                [projectNumber, inquiry.id, proposal.id, clientUserId]
              );

              const project = projectResult.rows[0];

              // Create deliverables from proposal
              const deliverables = typeof proposal.deliverables === 'string'
                ? JSON.parse(proposal.deliverables)
                : proposal.deliverables;

              for (const deliverable of deliverables) {
                await client.query(
                  `INSERT INTO deliverables (
                    id, project_id, name, description, estimated_completion_week, status
                  ) VALUES ($1, $2, $3, $4, $5, 'pending')`,
                  [
                    deliverable.id,
                    project.id,
                    deliverable.name,
                    deliverable.description,
                    deliverable.estimatedCompletionWeek
                  ]
                );
              }

              // Update inquiry status to converted
              await client.query(
                `UPDATE inquiries SET status = 'converted' WHERE id = $1`,
                [inquiry.id]
              );

              // Link payment to project
              await client.query(
                `UPDATE payments SET project_id = $1 WHERE id = $2`,
                [project.id, payment.id]
              );

              console.log(`✅ Project ${projectNumber} created from payment verification`);
            }
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result.rows[0]),
        };
      }

      if (action === 'manual-complete') {
        const validation = validateRequest(event.body, SCHEMAS.payment.manualComplete, origin);
        if (!validation.success) return validation.response;
        const { paymentId } = validation.data;

        const result = await client.query(
          `UPDATE payments 
           SET status = 'completed',
               paid_at = NOW(),
               notes = 'Marked as paid manually by admin'
           WHERE id = $1
           RETURNING *`,
          [paymentId]
        );

        if (result.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Payment not found' }),
          };
        }

        const payment = result.rows[0];

        if (payment.payment_type === 'advance') {
          // Get proposal details for project creation
          const proposalResult = await client.query(
            'SELECT * FROM proposals WHERE id = $1',
            [payment.proposal_id]
          );

          if (proposalResult.rows.length > 0) {
            const proposal = proposalResult.rows[0];

            // Get inquiry details
            const inquiryResult = await client.query(
              'SELECT * FROM inquiries WHERE proposal_id = $1',
              [payment.proposal_id]
            );

            if (inquiryResult.rows.length > 0) {
              const inquiry = inquiryResult.rows[0];

              // Generate project number
              const year = new Date().getFullYear();
              const projectNumResult = await client.query(
                `SELECT project_number FROM projects 
                 WHERE project_number LIKE $1 
                 ORDER BY project_number DESC LIMIT 1`,
                [`PROJ-${year}-%`]
              );

              let maxNumber = 0;
              if (projectNumResult.rows.length > 0) {
                const match = projectNumResult.rows[0].project_number.match(/PROJ-\d{4}-(\d+)/);
                if (match) {
                  maxNumber = parseInt(match[1], 10);
                }
              }
              const projectNumber = `PROJ-${year}-${String(maxNumber + 1).padStart(3, '0')}`;

              // Get or create client user
              let clientUserId = proposal.client_user_id;
              if (!clientUserId) {
                const userResult = await client.query(
                  'SELECT id FROM users WHERE email = $1',
                  [inquiry.contact_email]
                );
                if (userResult.rows.length > 0) {
                  clientUserId = userResult.rows[0].id;
                } else {
                  const newUserResult = await client.query(
                    `INSERT INTO users (email, full_name, role) 
                     VALUES ($1, $2, 'client') 
                     RETURNING id`,
                    [inquiry.contact_email, inquiry.contact_name]
                  );
                  clientUserId = newUserResult.rows[0].id;
                }
              }

              // Create project
              const projectResult = await client.query(
                `INSERT INTO projects (
                  project_number, inquiry_id, proposal_id, client_user_id, status
                ) VALUES ($1, $2, $3, $4, 'active')
                RETURNING *`,
                [projectNumber, inquiry.id, proposal.id, clientUserId]
              );

              const project = projectResult.rows[0];

              // Create deliverables from proposal
              const deliverables = typeof proposal.deliverables === 'string'
                ? JSON.parse(proposal.deliverables)
                : proposal.deliverables;

              for (const deliverable of deliverables) {
                await client.query(
                  `INSERT INTO deliverables (
                    id, project_id, name, description, estimated_completion_week, status
                  ) VALUES ($1, $2, $3, $4, $5, 'pending')`,
                  [
                    deliverable.id,
                    project.id,
                    deliverable.name,
                    deliverable.description,
                    deliverable.estimatedCompletionWeek
                  ]
                );
              }

              // Update inquiry status to converted
              await client.query(
                `UPDATE inquiries SET status = 'converted' WHERE id = $1`,
                [inquiry.id]
              );

              // Link payment to project
              await client.query(
                `UPDATE payments SET project_id = $1 WHERE id = $2`,
                [project.id, payment.id]
              );

              console.log(`✅ Project ${projectNumber} created from manual payment completion`);
            }
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result.rows[0]),
        };
      }

      if (action === 'send-reminder') {
        // Verify admin access for sending reminders
        const adminRoles = ['super_admin', 'project_manager'];
        if (!auth?.user || !adminRoles.includes(auth.user.role)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Admin access required to send payment reminders' }),
          };
        }

        // Extract paymentId from request body
        const body = JSON.parse(event.body || '{}');
        const { paymentId } = body;

        if (!paymentId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'paymentId is required' }),
          };
        }

        // Fetch payment with project and client information
        const paymentResult = await client.query(
          `SELECT
            p.id, p.amount, p.currency, p.payment_type, p.status, p.created_at,
            proj.id as project_id, proj.project_number,
            u.id as client_id, u.full_name as client_name, u.email as client_email
          FROM payments p
          LEFT JOIN projects proj ON p.project_id = proj.id
          LEFT JOIN users u ON proj.client_user_id = u.id
          WHERE p.id = $1`,
          [paymentId]
        );

        if (paymentResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Payment not found' }),
          };
        }

        const payment = paymentResult.rows[0];

        // Only send reminders for pending payments
        if (payment.status !== 'pending') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: `Cannot send reminder for ${payment.status} payment` }),
          };
        }

        if (!payment.client_email) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'No client email associated with this payment' }),
          };
        }

        // Calculate days overdue
        const createdDate = new Date(payment.created_at);
        const now = new Date();
        const daysOverdue = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

        // Format amount for display (convert from paise/cents to rupees/dollars)
        const displayAmount = (Number(payment.amount) / 100).toFixed(2);

        // Build payment URL
        const baseUrl = process.env.URL || 'http://localhost:3000';
        const paymentUrl = payment.project_id
          ? `${baseUrl}/portal/projects/${payment.project_id}`
          : `${baseUrl}/portal`;

        // Send the reminder email
        const emailResult = await sendPaymentReminderEmail({
          to: payment.client_email,
          clientName: payment.client_name || 'Client',
          projectNumber: payment.project_number || 'N/A',
          amount: displayAmount,
          currency: payment.currency,
          paymentUrl,
          daysOverdue,
        });

        if (!emailResult) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to send reminder email' }),
          };
        }

        console.log(`[Payments API] Reminder sent to ${payment.client_email} for payment ${paymentId}`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Reminder sent to ${payment.client_email}`,
            paymentId,
            clientEmail: payment.client_email,
          }),
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid action. Use /create-order, /verify, /manual-complete, or /send-reminder' }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };

  } catch (error) {
    console.error('Payments API error:', error);
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
