import Razorpay from 'razorpay';
import { query as dbQuery } from './_shared/db';
import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
import { validateRequest } from './_shared/validation';
import { sendPaymentReminderEmail } from './send-email';
import { acceptProposalAndCreateProject } from './_shared/proposal-payment-helpers';

async function logActivity(params: {
  type: string;
  userId: string;
  userName: string;
  inquiryId?: string;
  proposalId?: string;
  projectId?: string;
  details?: Record<string, string | number>;
}) {
  try {
    await dbQuery(
      `INSERT INTO activities (type, user_id, user_name, inquiry_id, proposal_id, project_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [params.type, params.userId, params.userName,
       params.inquiryId || null, params.proposalId || null, params.projectId || null,
       JSON.stringify(params.details || {})]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

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

  try {
    if (event.httpMethod === 'GET') {
      const { proposalId, projectId } = event.queryStringParameters || {};

      let sql = 'SELECT * FROM payments ORDER BY created_at DESC';
      const params: any[] = [];

      if (proposalId) {
        sql = 'SELECT * FROM payments WHERE proposal_id = $1 ORDER BY created_at DESC';
        params.push(proposalId);
      } else if (projectId) {
        sql = 'SELECT * FROM payments WHERE project_id = $1 ORDER BY created_at DESC';
        params.push(projectId);
      }

      const result = await dbQuery(sql, params);

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

        const proposalResult = await dbQuery(
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

        // Validate amount
        if (!amount || amount <= 0) {
          console.error('Invalid amount:', { amount, advanceAmount: proposal.advance_amount, balanceAmount: proposal.balance_amount });
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid payment amount', details: `Amount: ${amount}` }),
          };
        }

        console.log('Creating Razorpay order:', orderOptions);

        try {
          const razorpayOrder = await razorpay.orders.create(orderOptions);

          const result = await dbQuery(
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
        } catch (err: any) {
          console.error('Error creating Razorpay order:', err);
          const errorMessage = err?.error?.description || err?.message || 'Unknown Razorpay error';
          const errorCode = err?.error?.code || err?.statusCode || 'UNKNOWN';
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              error: 'Failed to create payment order',
              details: errorMessage,
              code: errorCode,
              orderOptions: { amount: orderOptions.amount, currency: orderOptions.currency }
            }),
          };
        }
      }

      if (action === 'verify') {
        const validation = validateRequest(event.body, SCHEMAS.payment.verify, origin);
        if (!validation.success) return validation.response;
        const { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = validation.data;

        try {
        const result = await dbQuery(
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

        const { projectId: newProjectId } = await acceptProposalAndCreateProject(client, payment.id);

        if (newProjectId) {
          await logActivity(client, {
            type: 'PROJECT_CREATED',
            userId: auth?.user?.userId || '',
            userName: auth?.user?.fullName || 'System',
            projectId: newProjectId,
            proposalId: payment.proposal_id || null,
            details: {},
          });
        }

        // Log payment received activity
        await logActivity({
          type: 'PAYMENT_RECEIVED',
          userId: auth?.user?.userId || '',
          userName: auth?.user?.fullName || 'Unknown',
          projectId: payment.project_id || null,
          proposalId: payment.proposal_id || null,
          details: { amount: payment.amount, currency: payment.currency, paymentType: payment.payment_type },
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result.rows[0]),
        };
        } catch (verifyError: any) {
          console.error('Payment verification error:', verifyError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              error: 'Payment verification failed',
              details: 'Please retry or contact support',
            }),
          };
        }
      }

      if (action === 'manual-complete') {
        const adminRoles = ['super_admin', 'support'];
        if (!auth?.user || !adminRoles.includes(auth.user.role)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Admin access required' }),
          };
        }

        const validation = validateRequest(event.body, SCHEMAS.payment.manualComplete, origin);
        if (!validation.success) return validation.response;
        const { paymentId } = validation.data;

        const result = await dbQuery(
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

        const { projectId: newProjectId } = await acceptProposalAndCreateProject(client, payment.id);

        if (newProjectId) {
          await logActivity(client, {
            type: 'PROJECT_CREATED',
            userId: auth?.user?.userId || '',
            userName: auth?.user?.fullName || 'Admin',
            projectId: newProjectId,
            proposalId: payment.proposal_id || null,
            details: {},
          });
        }

        // Log payment received activity
        await logActivity({
          type: 'PAYMENT_RECEIVED',
          userId: auth?.user?.userId || '',
          userName: auth?.user?.fullName || 'Unknown',
          projectId: payment.project_id || null,
          proposalId: payment.proposal_id || null,
          details: { amount: payment.amount, paymentType: 'manual' },
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result.rows[0]),
        };
      }

      if (action === 'send-reminder') {
        // Verify admin access for sending reminders
        const adminRoles = ['super_admin', 'support'];
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
        const paymentResult = await dbQuery(
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

        // Log activity
        await logActivity({
          type: 'PAYMENT_REMINDER_SENT',
          userId: auth?.user?.userId || '',
          userName: auth?.user?.fullName || 'Unknown',
          projectId: payment.project_id || null,
          proposalId: null,
          details: { clientEmail: payment.client_email },
        });

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
        message: 'An unexpected error occurred',
      }),
    };
  }
});
