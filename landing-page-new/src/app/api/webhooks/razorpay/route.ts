/**
 * Razorpay Webhook Handler (Next.js API Route)
 *
 * Receives asynchronous payment events from Razorpay.
 * This is the server-authoritative source of truth for payment confirmation.
 *
 * This route exists because @netlify/plugin-nextjs intercepts /api/* requests,
 * preventing the Netlify function at /.netlify/functions/razorpay-webhook from
 * being reached. This route handles the webhook directly in Next.js.
 *
 * Key features:
 * - Uses raw body text for signature verification
 * - Idempotent processing via x-razorpay-event-id header
 * - Logs all webhooks to payment_webhook_logs for audit trail
 * - Returns 200 quickly to acknowledge receipt (Razorpay expects <5 seconds)
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { query, transaction } from '@/lib/db';
import type { PoolClient } from 'pg';

interface RazorpayWebhookPayload {
  entity: 'event';
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        method?: string;
        captured?: boolean;
        error_code?: string | null;
        error_description?: string | null;
      };
    };
  };
  created_at: number;
}

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const expected = Buffer.from(hmac.digest('hex'), 'hex');
  const actual = Buffer.from(signature, 'hex');
  if (expected.length !== actual.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, actual);
}

async function acceptProposalAndCreateProject(
  client: PoolClient,
  paymentId: string
): Promise<{ projectId: string | null }> {
  const paymentResult = await client.query(
    `SELECT id, proposal_id, payment_type FROM payments WHERE id = $1`,
    [paymentId]
  );

  if (paymentResult.rows.length === 0) {
    console.error('[Webhook] Payment not found:', paymentId);
    return { projectId: null };
  }

  const payment = paymentResult.rows[0];

  if (payment.payment_type !== 'advance') {
    return { projectId: null };
  }

  const proposalId = payment.proposal_id;

  const proposalResult = await client.query(
    `SELECT * FROM proposals WHERE id = $1`,
    [proposalId]
  );

  if (proposalResult.rows.length === 0) {
    console.error('[Webhook] Proposal not found:', proposalId);
    return { projectId: null };
  }

  const proposal = proposalResult.rows[0];

  // Mark proposal accepted (idempotent)
  await client.query(
    `UPDATE proposals
     SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status != 'accepted'`,
    [proposalId]
  );

  // Check for existing project (prevent duplicates from verify + webhook race)
  const existingProject = await client.query(
    `SELECT id FROM projects WHERE proposal_id = $1`,
    [proposalId]
  );

  if (existingProject.rows.length > 0) {
    const projectId = existingProject.rows[0].id;
    await client.query(
      `UPDATE payments SET project_id = $1 WHERE id = $2 AND project_id IS NULL`,
      [projectId, paymentId]
    );
    console.log('[Webhook] Project already exists:', projectId);
    return { projectId };
  }

  // Fetch inquiry
  const inquiryResult = await client.query(
    `SELECT * FROM inquiries WHERE proposal_id = $1`,
    [proposalId]
  );

  if (inquiryResult.rows.length === 0) {
    console.error('[Webhook] Inquiry not found for proposal:', proposalId);
    return { projectId: null };
  }

  const inquiry = inquiryResult.rows[0];

  // Get or create client user
  let clientUserId = proposal.client_user_id;
  if (!clientUserId) {
    const userResult = await client.query(
      `SELECT id FROM users WHERE email = $1`,
      [inquiry.contact_email]
    );
    if (userResult.rows.length > 0) {
      clientUserId = userResult.rows[0].id;
    } else {
      const newUserResult = await client.query(
        `INSERT INTO users (email, full_name, role) VALUES ($1, $2, 'client') RETURNING id`,
        [inquiry.contact_email, inquiry.contact_name]
      );
      clientUserId = newUserResult.rows[0].id;
    }
  }

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

  // Create project
  const projectResult = await client.query(
    `INSERT INTO projects (
      project_number, inquiry_id, proposal_id, client_user_id, status, total_revisions_allowed
    ) VALUES ($1, $2, $3, $4, 'active', $5)
    RETURNING *`,
    [projectNumber, inquiry.id, proposal.id, clientUserId, proposal.revisions_included ?? 2]
  );

  const project = projectResult.rows[0];

  // Create deliverables
  const deliverables = typeof proposal.deliverables === 'string'
    ? JSON.parse(proposal.deliverables)
    : (proposal.deliverables ?? []);

  for (const deliverable of deliverables) {
    await client.query(
      `INSERT INTO deliverables (
        id, project_id, name, description, estimated_completion_week, status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      ON CONFLICT (id) DO NOTHING`,
      [
        deliverable.id,
        project.id,
        deliverable.name,
        deliverable.description,
        deliverable.estimatedCompletionWeek,
      ]
    );
  }

  // Mark inquiry converted
  await client.query(
    `UPDATE inquiries SET status = 'converted' WHERE id = $1`,
    [inquiry.id]
  );

  // Link payment to project
  await client.query(
    `UPDATE payments SET project_id = $1 WHERE id = $2`,
    [project.id, paymentId]
  );

  console.log(`[Webhook] Project ${projectNumber} created for proposal ${proposalId}`);
  return { projectId: project.id };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') || '';
  const eventId = request.headers.get('x-razorpay-event-id') || '';
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Webhook] RAZORPAY_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const signatureVerified = verifySignature(rawBody, signature, webhookSecret);

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const webhookEvent = payload.event;
  const orderId = payload.payload.payment?.entity?.order_id || '';
  const razorpayPaymentId = payload.payload.payment?.entity?.id || null;

  console.log('[Webhook] Received:', {
    event: webhookEvent, eventId, orderId, razorpayPaymentId, signatureVerified, ipAddress,
  });

  // Reject invalid signatures
  if (!signatureVerified) {
    console.error('[Webhook] Signature verification failed');
    try {
      await query(
        `INSERT INTO payment_webhook_logs (
          event, razorpay_event_id, razorpay_order_id, razorpay_payment_id,
          payload, signature, signature_verified, status, error, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [webhookEvent, eventId || null, orderId, razorpayPaymentId,
         JSON.stringify(payload), signature, false, 'FAILED',
         'Signature verification failed', ipAddress]
      );
    } catch (logError) {
      console.error('[Webhook] Failed to log invalid signature:', logError);
    }
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Idempotency check
  if (eventId) {
    try {
      const existing = await query(
        `SELECT id FROM payment_webhook_logs WHERE razorpay_event_id = $1`,
        [eventId]
      );
      if (existing.rows.length > 0) {
        console.log('[Webhook] Event already processed:', eventId);
        return NextResponse.json({ status: 'already_processed' });
      }
    } catch (checkError) {
      console.error('[Webhook] Idempotency check error:', checkError);
    }
  }

  // Process webhook in a transaction
  try {
    const result = await transaction(async (client) => {
      let processResult: { success: boolean; paymentId?: string; error?: string } = {
        success: true,
      };

      switch (webhookEvent) {
        case 'payment.captured':
        case 'order.paid': {
          const payment = payload.payload.payment?.entity;
          if (!payment) {
            processResult = { success: false, error: 'No payment entity in payload' };
            break;
          }

          const { id: rpPaymentId, order_id: rpOrderId, method } = payment;

          // Update payment status
          const updateResult = await client.query(
            `UPDATE payments
             SET status = 'completed',
                 razorpay_payment_id = $1,
                 payment_method = $2,
                 completed_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE razorpay_order_id = $3
               AND status != 'completed'
             RETURNING id`,
            [rpPaymentId, method?.toUpperCase() || null, rpOrderId]
          );

          let paymentDbId: string;
          if (updateResult.rows.length === 0) {
            const existingPayment = await client.query(
              `SELECT id, status FROM payments WHERE razorpay_order_id = $1`,
              [rpOrderId]
            );
            if (existingPayment.rows.length === 0) {
              processResult = { success: false, error: `Payment not found for order ${rpOrderId}` };
              break;
            }
            paymentDbId = existingPayment.rows[0].id;
          } else {
            paymentDbId = updateResult.rows[0].id;
          }

          // Accept proposal and create project (idempotent)
          try {
            await acceptProposalAndCreateProject(client, paymentDbId);
          } catch (projectError) {
            console.error('[Webhook] Failed to create project:', projectError);
          }

          processResult = { success: true, paymentId: paymentDbId };
          break;
        }

        case 'payment.failed': {
          const failedPayment = payload.payload.payment?.entity;
          if (!failedPayment) {
            processResult = { success: false, error: 'No payment entity in payload' };
            break;
          }

          const failureReason = failedPayment.error_description || failedPayment.error_code || 'Payment failed';

          const failResult = await client.query(
            `UPDATE payments
             SET status = 'failed',
                 failure_reason = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE razorpay_order_id = $2
               AND status NOT IN ('completed', 'refunded')
             RETURNING id`,
            [failureReason, failedPayment.order_id]
          );

          processResult = { success: true, paymentId: failResult.rows[0]?.id };
          break;
        }

        default:
          console.log('[Webhook] Unhandled event type:', webhookEvent);
      }

      // Log webhook to audit table
      await client.query(
        `INSERT INTO payment_webhook_logs (
          event, razorpay_event_id, razorpay_order_id, razorpay_payment_id,
          payload, signature, signature_verified, status, error, ip_address,
          payment_id, processed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          webhookEvent, eventId, orderId, razorpayPaymentId,
          JSON.stringify(payload), signature, true,
          processResult.success ? 'PROCESSED' : 'FAILED',
          processResult.error || null, ipAddress,
          processResult.paymentId || null,
          processResult.success ? new Date() : null,
        ]
      );

      return processResult;
    });

    const duration = Date.now() - startTime;
    console.log('[Webhook] Processed:', { event: webhookEvent, eventId, duration: `${duration}ms`, result });

    return NextResponse.json({ status: 'ok', event: webhookEvent, processed: result.success });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Webhook] Processing error:', errorMessage);

    try {
      await query(
        `INSERT INTO payment_webhook_logs (
          event, razorpay_event_id, razorpay_order_id, razorpay_payment_id,
          payload, signature, signature_verified, status, error, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [webhookEvent, eventId || null, orderId, razorpayPaymentId,
         JSON.stringify(payload), signature, true, 'FAILED', errorMessage, ipAddress]
      );
    } catch (logError) {
      console.error('[Webhook] Failed to log error:', logError);
    }

    // Return 200 to prevent Razorpay from retrying indefinitely
    return NextResponse.json({ status: 'error', error: errorMessage });
  }
}
