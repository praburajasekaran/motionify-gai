import Razorpay from 'razorpay';
import { query as dbQuery, transaction } from './_shared/db';
import { compose, withCORS, withRateLimit, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { acceptProposalAndCreateProject } from './_shared/proposal-payment-helpers';
import { proposalAccessAllowsPublicMutation, validateProposalReviewToken } from './_shared/proposal-review-access';
import { verifyRazorpayCheckoutSignature } from './_shared/payment-verification';

function getRazorpayClient() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
  });
}

function getAction(event: NetlifyEvent): string {
  return event.path.split('/').filter(Boolean).pop() || '';
}

function forbidden(accessStatus: string, headers: Record<string, string>) {
  return {
    statusCode: 403,
    headers,
    body: JSON.stringify({
      error: 'Advance payment link unavailable',
      accessStatus,
      message: 'This payment link is invalid, expired, or no longer available. Please request a fresh proposal link.',
    }),
  };
}

function createPaymentError(statusCode: number, message: string) {
  const error = new Error(message);
  (error as any).statusCode = statusCode;
  return error;
}

function buildPaymentOrderPayload(payment: any, options: {
  amount: number;
  currency: string;
  description: string;
}) {
  return {
    ...payment,
    razorpayOrderId: payment.razorpay_order_id,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    amount: options.amount,
    currency: options.currency,
    name: 'Motionify Studio',
    description: options.description,
  };
}

export const handler = compose(
  withCORS(['POST', 'OPTIONS']),
  withRateLimit(RATE_LIMITS.apiStrict, 'payment_handoff')
)(async (event: NetlifyEvent) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);
  const action = getAction(event);
  let body: any;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (action === 'create-order') {
    const { proposalId, token } = body;
    if (!proposalId || !token) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'proposalId and token are required' }) };
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Payment provider is not configured' }) };
    }

    const access = await validateProposalReviewToken(proposalId, token);
    if (!proposalAccessAllowsPublicMutation(access)) {
      return forbidden(access.status, headers);
    }

    const proposalResult = await dbQuery('SELECT * FROM proposals WHERE id = $1', [proposalId]);
    if (proposalResult.rows.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Proposal not found' }) };
    }

    const proposal = proposalResult.rows[0];
    const amount = proposal.advance_amount;
    if (!amount || amount <= 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid advance payment amount' }) };
    }

    try {
      const order = await transaction(async (client) => {
        await client.query(
          `SELECT pg_advisory_xact_lock(hashtext($1))`,
          [`payment-order:${proposalId}:advance`]
        );

        const completedPayment = await client.query(
          `SELECT id FROM payments
           WHERE proposal_id = $1
             AND payment_type = 'advance'
             AND status = 'completed'
           ORDER BY paid_at DESC NULLS LAST, created_at DESC
           LIMIT 1`,
          [proposalId]
        );
        if (completedPayment.rows.length > 0) {
          throw createPaymentError(409, 'Payment has already been completed for this proposal');
        }

        const reusablePayment = await client.query(
          `SELECT * FROM payments
           WHERE proposal_id = $1
             AND payment_type = 'advance'
             AND amount = $2
             AND currency = $3
             AND status IN ('pending', 'processing')
             AND razorpay_order_id IS NOT NULL
           ORDER BY created_at DESC
           LIMIT 1`,
          [proposalId, amount, proposal.currency]
        );
        if (reusablePayment.rows.length > 0) {
          return { payment: reusablePayment.rows[0], statusCode: 200 };
        }

        const razorpayOrder = await getRazorpayClient().orders.create({
          amount,
          currency: proposal.currency,
          receipt: `advance_${proposalId.substring(0, 8)}_${Date.now()}`,
          notes: { proposalId, paymentType: 'advance' },
        });

        const result = await client.query(
          `INSERT INTO payments (
            proposal_id, payment_type, amount, currency, status, razorpay_order_id
          ) VALUES ($1, 'advance', $2, $3, 'pending', $4)
          RETURNING *`,
          [proposalId, amount, proposal.currency, razorpayOrder.id]
        );

        return { payment: result.rows[0], statusCode: 201 };
      });

      return {
        statusCode: order.statusCode,
        headers,
        body: JSON.stringify(buildPaymentOrderPayload(order.payment, {
          amount,
          currency: proposal.currency,
          description: 'Advance Payment',
        })),
      };
    } catch (error: any) {
      if (error?.statusCode) {
        return {
          statusCode: error.statusCode,
          headers,
          body: JSON.stringify({ error: error.message }),
        };
      }
      console.error('Payment handoff order creation failed:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create payment order' }),
      };
    }
  }

  if (action === 'verify') {
    const { proposalId, token, paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;
    if (!proposalId || !token || !paymentId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing payment verification fields' }) };
    }

    const access = await validateProposalReviewToken(proposalId, token);
    if (!proposalAccessAllowsPublicMutation(access)) {
      return forbidden(access.status, headers);
    }

    try {
      const { payment, activation } = await transaction(async (client) => {
        const paymentResult = await client.query(
          `SELECT * FROM payments
           WHERE id = $1 AND proposal_id = $2 AND payment_type = 'advance'
           FOR UPDATE`,
          [paymentId, proposalId]
        );

        if (paymentResult.rows.length === 0) {
          throw createPaymentError(404, 'Payment not found');
        }

        const currentPayment = paymentResult.rows[0];
        if (currentPayment.razorpay_order_id !== razorpayOrderId) {
          throw createPaymentError(400, 'Payment order does not match the server-created order');
        }

        if (currentPayment.status === 'completed') {
          if (currentPayment.razorpay_payment_id !== razorpayPaymentId) {
            throw createPaymentError(409, 'Payment has already been completed with a different provider payment');
          }
          if (!verifyRazorpayCheckoutSignature({
            orderId: currentPayment.razorpay_order_id,
            paymentId: razorpayPaymentId,
            signature: razorpaySignature,
          })) {
            throw createPaymentError(400, 'Invalid Razorpay signature');
          }
          const activation = await acceptProposalAndCreateProject(client, currentPayment.id);
          if (!activation.projectId) {
            throw createPaymentError(500, 'Project activation failed after advance payment');
          }
          return { payment: currentPayment, activation };
        }

        if (!['pending', 'processing'].includes(currentPayment.status)) {
          throw createPaymentError(409, `Cannot verify a ${currentPayment.status} payment`);
        }

        const duplicateProviderPayment = await client.query(
          `SELECT id FROM payments
           WHERE razorpay_payment_id = $1 AND id != $2
           LIMIT 1`,
          [razorpayPaymentId, paymentId]
        );
        if (duplicateProviderPayment.rows.length > 0) {
          throw createPaymentError(409, 'Provider payment is already bound to another payment');
        }

        if (!verifyRazorpayCheckoutSignature({
          orderId: currentPayment.razorpay_order_id,
          paymentId: razorpayPaymentId,
          signature: razorpaySignature,
        })) {
          throw createPaymentError(400, 'Invalid Razorpay signature');
        }

        const result = await client.query(
          `UPDATE payments
           SET razorpay_payment_id = $1,
               razorpay_signature = $2,
               status = 'completed',
               paid_at = NOW()
           WHERE id = $3
           RETURNING *`,
          [razorpayPaymentId, razorpaySignature, paymentId]
        );

        const payment = result.rows[0];
        const activation = await acceptProposalAndCreateProject(client, payment.id);
        if (!activation.projectId) {
          throw createPaymentError(500, 'Project activation failed after advance payment');
        }

        return { payment, activation };
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ...payment,
          project_id: activation.projectId || payment.project_id,
          activation,
        }),
      };
    } catch (error: any) {
      if (error?.statusCode) {
        return {
          statusCode: error.statusCode,
          headers,
          body: JSON.stringify({ error: error.message }),
        };
      }
      throw error;
    }
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
});
