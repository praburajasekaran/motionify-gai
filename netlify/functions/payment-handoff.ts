import Razorpay from 'razorpay';
import { query as dbQuery, transaction } from './_shared/db';
import { compose, withCORS, withRateLimit, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { acceptProposalAndCreateProject } from './_shared/proposal-payment-helpers';
import { proposalAccessAllowsPublicMutation, validateProposalReviewToken } from './_shared/proposal-review-access';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

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

export const handler = compose(
  withCORS(['POST', 'OPTIONS']),
  withRateLimit(RATE_LIMITS.apiStrict, 'payment_handoff')
)(async (event: NetlifyEvent) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);
  const action = getAction(event);
  const body = JSON.parse(event.body || '{}');

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (action === 'create-order') {
    const { proposalId, token } = body;
    if (!proposalId || !token) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'proposalId and token are required' }) };
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

    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency: proposal.currency,
      receipt: `advance_${proposalId.substring(0, 8)}_${Date.now()}`,
      notes: { proposalId, paymentType: 'advance' },
    });

    const result = await dbQuery(
      `INSERT INTO payments (
        proposal_id, payment_type, amount, currency, status, razorpay_order_id
      ) VALUES ($1, 'advance', $2, $3, 'pending', $4)
      RETURNING *`,
      [proposalId, amount, proposal.currency, razorpayOrder.id]
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        ...result.rows[0],
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        amount,
        currency: proposal.currency,
        name: 'Motionify Studio',
        description: 'Advance Payment',
      }),
    };
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

    const { payment, activation } = await transaction(async (client) => {
      const result = await client.query(
        `UPDATE payments
         SET razorpay_order_id = $1,
             razorpay_payment_id = $2,
             razorpay_signature = $3,
             status = 'completed',
             paid_at = NOW()
         WHERE id = $4 AND proposal_id = $5 AND payment_type = 'advance'
         RETURNING *`,
        [razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId, proposalId]
      );

      if (result.rows.length === 0) {
        const error = new Error('Payment not found');
        (error as any).statusCode = 404;
        throw error;
      }

      const payment = result.rows[0];
      const activation = await acceptProposalAndCreateProject(client, payment.id);
      if (!activation.projectId) {
        throw new Error('Project activation failed after advance payment');
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
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
});
