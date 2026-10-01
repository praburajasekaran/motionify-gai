/**
 * Razorpay Webhook Handler
 *
 * Receives and processes asynchronous payment events from Razorpay.
 *
 * Key features:
 * - Uses raw body text for signature verification (critical for signature match)
 * - Idempotent processing via x-razorpay-event-id header
 * - Logs all webhooks to payment_webhook_logs for audit trail
 */

import type { Handler } from '@netlify/functions';
import crypto from 'crypto';
import { query, transaction, type PoolClient } from './_shared/db';
import {
  sendPaymentSuccessEmail,
  sendPaymentFailureNotificationEmail,
} from './send-email';
import { acceptProposalAndCreateProject } from './_shared/proposal-payment-helpers';
import { razorpayWebhookSchema, type RazorpayWebhookPayload } from './_shared/schemas';
import { absoluteProjectAccessUrl, absoluteUrl, appOriginFromEnv, portalPath } from '../../shared/canonical-links';

const PAYMENT_EVENTS = new Set(['payment.captured', 'order.paid', 'payment.failed']);

function buildProjectAccessUrl(projectId: string, email: string): string {
  return absoluteProjectAccessUrl({ projectId, email }, appOriginFromEnv(process.env));
}

/**
 * Verify Razorpay webhook signature using HMAC SHA256
 */
function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const expected = Buffer.from(hmac.digest('hex'), 'hex');
  const actual = Buffer.from(signature, 'hex');
  if (expected.length !== actual.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, actual);
}

type WebhookValidationResult =
  | { ok: true; payload: RazorpayWebhookPayload; auditPayload: Record<string, unknown> }
  | { ok: false; statusCode: 400 | 401; error: 'Invalid signature' | 'Invalid JSON payload' | 'Invalid webhook payload' };

function validateWebhookRequest(
  rawBody: string,
  signature: string,
  webhookSecret: string,
): WebhookValidationResult {
  if (!verifySignature(rawBody, signature, webhookSecret)) {
    return { ok: false, statusCode: 401, error: 'Invalid signature' };
  }

  let candidate: unknown;
  try {
    candidate = JSON.parse(rawBody);
  } catch {
    return { ok: false, statusCode: 400, error: 'Invalid JSON payload' };
  }

  const parsed = razorpayWebhookSchema.safeParse(candidate);
  if (!parsed.success) {
    return { ok: false, statusCode: 400, error: 'Invalid webhook payload' };
  }

  if (PAYMENT_EVENTS.has(parsed.data.event) && !parsed.data.payload.payment?.entity) {
    return { ok: false, statusCode: 400, error: 'Invalid webhook payload' };
  }

  return {
    ok: true,
    payload: parsed.data,
    auditPayload: candidate as Record<string, unknown>,
  };
}

/**
 * Check if webhook event has already been processed (idempotency)
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const result = await query(
    `SELECT id FROM payment_webhook_logs
     WHERE razorpay_event_id = $1 AND status = 'PROCESSED' AND signature_verified = true`,
    [eventId]
  );
  return result.rows.length > 0;
}

/**
 * Log webhook to payment_webhook_logs table
 */
async function logWebhook(
  client: PoolClient,
  params: {
    event: string;
    eventId: string;
    orderId: string;
    paymentId: string | null;
    payload: Record<string, unknown>;
    signature: string;
    signatureVerified: boolean;
    status: 'RECEIVED' | 'PROCESSED' | 'FAILED';
    error?: string;
    ipAddress?: string;
    resolvedPaymentId?: string;
  }
): Promise<void> {
  await client.query(
    `INSERT INTO payment_webhook_logs (
      event, razorpay_event_id, razorpay_order_id, razorpay_payment_id,
      payload, signature, signature_verified, status, error, ip_address,
      payment_id, processed_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (razorpay_event_id) DO UPDATE SET
      event = EXCLUDED.event,
      razorpay_order_id = EXCLUDED.razorpay_order_id,
      razorpay_payment_id = EXCLUDED.razorpay_payment_id,
      payment_id = EXCLUDED.payment_id,
      payload = EXCLUDED.payload,
      signature = EXCLUDED.signature,
      signature_verified = EXCLUDED.signature_verified,
      status = EXCLUDED.status,
      error = EXCLUDED.error,
      processed_at = EXCLUDED.processed_at
    WHERE payment_webhook_logs.status != 'PROCESSED'`,
    [
      params.event,
      params.eventId || null,
      params.orderId,
      params.paymentId,
      JSON.stringify(params.payload),
      params.signature,
      params.signatureVerified,
      params.status,
      params.error || null,
      params.ipAddress || null,
      params.resolvedPaymentId || null,
      params.status === 'PROCESSED' ? new Date() : null,
    ]
  );
}

/**
 * Handle payment.captured event - update payment status to completed
 */
async function handlePaymentCaptured(
  client: PoolClient,
  payload: RazorpayWebhookPayload
): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  const payment = payload.payload.payment?.entity;
  if (!payment) {
    return { success: false, error: 'No payment entity in payload' };
  }

  const { id: razorpayPaymentId, order_id: razorpayOrderId } = payment;

  const paymentRowResult = await client.query(
    `SELECT id, amount, currency, status, razorpay_payment_id, payment_type
     FROM payments
     WHERE razorpay_order_id = $1
     FOR UPDATE`,
    [razorpayOrderId]
  );

  if (paymentRowResult.rows.length === 0) {
    return { success: false, error: `Payment not found for order ${razorpayOrderId}` };
  }

  const storedPayment = paymentRowResult.rows[0];
  if (Number(storedPayment.amount) !== Number(payment.amount) || storedPayment.currency !== payment.currency) {
    return { success: false, error: `Payment payload does not match stored order ${razorpayOrderId}` };
  }

  if (storedPayment.status === 'completed') {
    if (storedPayment.razorpay_payment_id && storedPayment.razorpay_payment_id !== razorpayPaymentId) {
      return { success: false, error: `Order ${razorpayOrderId} was completed by a different provider payment` };
    }
    console.log('[Webhook] Payment already completed, sending email anyway:', storedPayment.id);
  } else {
    const duplicateProviderPayment = await client.query(
      `SELECT id FROM payments
       WHERE razorpay_payment_id = $1 AND id != $2
       LIMIT 1`,
      [razorpayPaymentId, storedPayment.id]
    );
    if (duplicateProviderPayment.rows.length > 0) {
      return { success: false, error: `Provider payment ${razorpayPaymentId} is already bound to another payment` };
    }

    await client.query(
      `UPDATE payments
       SET status = 'completed',
           razorpay_payment_id = $1,
           paid_at = COALESCE(paid_at, NOW())
       WHERE id = $2`,
      [razorpayPaymentId, storedPayment.id]
    );
  }

  const paymentId = storedPayment.id;

  const activation = await acceptProposalAndCreateProject(client, paymentId);
  if (storedPayment.payment_type === 'advance' && !activation.projectId) {
    throw new Error('Project activation failed after advance payment');
  }

  // Send success email (non-blocking)
  try {
    // Fetch client and project info for email
      const paymentInfo = await client.query(
        `SELECT
          p.payment_type, p.amount, p.currency,
          proj.id as project_id,
          proj.project_number,
          u.email as client_email, u.full_name as client_name
      FROM payments p
      LEFT JOIN projects proj ON p.project_id = proj.id
      LEFT JOIN users u ON proj.client_user_id = u.id
      WHERE p.id = $1`,
      [paymentId]
    );

    if (paymentInfo.rows.length > 0 && paymentInfo.rows[0].client_email) {
      const info = paymentInfo.rows[0];
      const projectUrl = info.project_id && info.client_email
        ? buildProjectAccessUrl(info.project_id, info.client_email)
        : absoluteUrl(portalPath('/projects'), appOriginFromEnv(process.env));

      console.log('[Webhook] Sending payment success email for payment:', paymentId);

      // Call email function directly (non-blocking)
      sendPaymentSuccessEmail({
        to: info.client_email,
        clientName: info.client_name || 'Client',
        projectNumber: info.project_number || 'Your Project',
        amount: (Number(info.amount) / 100).toFixed(2),
        currency: info.currency,
        paymentType: info.payment_type,
        projectUrl,
      }).catch((e) => console.error('[Webhook] Success email error:', e));
    } else {
      console.log('[Webhook] No client email found for payment:', paymentId, paymentInfo.rows[0]);
    }
  } catch (emailError) {
    console.error('[Webhook] Error fetching payment info for email:', emailError);
    // Don't fail the webhook - email is non-critical
  }

  return { success: true, paymentId };
}

/**
 * Handle payment.failed event - update payment status to failed (only if not already completed)
 */
async function handlePaymentFailed(
  client: PoolClient,
  payload: RazorpayWebhookPayload
): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  const payment = payload.payload.payment?.entity;
  if (!payment) {
    return { success: false, error: 'No payment entity in payload' };
  }

  const { order_id: razorpayOrderId, error_code, error_description } = payment;

  // Only update to failed if not already completed (UPI retry behavior)
  const result = await client.query(
    `UPDATE payments
     SET status = 'failed'
     WHERE razorpay_order_id = $1
       AND status NOT IN ('completed', 'refunded')
     RETURNING id`,
    [razorpayOrderId]
  );

  if (result.rows.length === 0) {
    // Payment not found or already in final state - OK for idempotency
    const existingPayment = await client.query(
      `SELECT id FROM payments WHERE razorpay_order_id = $1`,
      [razorpayOrderId]
    );
    return {
      success: true,
      paymentId: existingPayment.rows[0]?.id,
    };
  }

  // Send failure notification to admin (non-blocking)
  try {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (!adminEmail) {
      console.warn('[Webhook] ADMIN_NOTIFICATION_EMAIL not configured, skipping failure notification');
    } else {
      sendPaymentFailureNotificationEmail({
        to: adminEmail,
        orderId: razorpayOrderId,
        paymentId: result.rows[0]?.id,
        errorCode: error_code || undefined,
        errorDescription: error_description || undefined,
      }).catch((e) => console.error('[Webhook] Failure email error:', e));
    }
  } catch (emailError) {
    console.error('[Webhook] Error sending failure notification:', emailError);
    // Don't fail the webhook - email is non-critical
  }

  return { success: true, paymentId: result.rows[0].id };
}

/**
 * POST /.netlify/functions/razorpay-webhook
 *
 * Receives Razorpay webhook events for asynchronous payment confirmation.
 */
export interface RazorpayWebhookDependencies {
  query: typeof query;
  transaction: typeof transaction;
  isEventProcessed: typeof isEventProcessed;
  logWebhook: typeof logWebhook;
  handlePaymentCaptured: typeof handlePaymentCaptured;
  handlePaymentFailed: typeof handlePaymentFailed;
}

const defaultWebhookDependencies: RazorpayWebhookDependencies = {
  query,
  transaction,
  isEventProcessed,
  logWebhook,
  handlePaymentCaptured,
  handlePaymentFailed,
};

export function createRazorpayWebhookHandler(
  overrides: Partial<RazorpayWebhookDependencies> = {},
): Handler {
  const dependencies: RazorpayWebhookDependencies = {
    ...defaultWebhookDependencies,
    ...overrides,
  };

  return async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const startTime = Date.now();

  // Get raw body for signature verification (event.body is already raw string)
  const rawBody = event.body || '';
  const signature = event.headers['x-razorpay-signature'] || '';
  const eventId = event.headers['x-razorpay-event-id'] || '';
  const ipAddress =
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.headers['x-real-ip'] ||
    'unknown';

  // Get webhook secret from environment
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Webhook] RAZORPAY_WEBHOOK_SECRET not configured');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook not configured' }),
    };
  }

  // Authenticate the exact raw body before parsing or trusting any payload field.
  const validation = validateWebhookRequest(rawBody, signature, webhookSecret);
  if (validation.ok === false) {
    console.warn('[Webhook] Rejected request', {
      eventId: eventId || null,
      ipAddress,
      statusCode: validation.statusCode,
    });
    return {
      statusCode: validation.statusCode,
      body: JSON.stringify({ error: validation.error }),
    };
  }

  const payload = validation.payload;
  const auditPayload = validation.auditPayload;

  const webhookEvent = payload.event;
  const orderId = payload.payload.payment?.entity?.order_id || '';
  const razorpayPaymentId = payload.payload.payment?.entity?.id || null;

  console.log('[Webhook] Received:', {
    event: webhookEvent,
    eventId,
    orderId,
    razorpayPaymentId,
    signatureVerified: true,
    ipAddress,
  });

  // Check for duplicate event (idempotency)
  if (eventId) {
    try {
      const alreadyProcessed = await dependencies.isEventProcessed(eventId);
      if (alreadyProcessed) {
        console.log('[Webhook] Event already processed:', eventId);
        return {
          statusCode: 200,
          body: JSON.stringify({ status: 'already_processed' }),
        };
      }
    } catch (checkError) {
      console.error('[Webhook] Error checking idempotency:', checkError);
      // Continue processing - better to risk duplicate than miss payment
    }
  }

  // Process webhook in a transaction
  try {
    const result = await dependencies.transaction(async (client) => {
      let processResult: { success: boolean; paymentId?: string; error?: string } = {
        success: true,
      };

      // Handle different event types
      switch (webhookEvent) {
        case 'payment.captured':
        case 'order.paid':
          processResult = await dependencies.handlePaymentCaptured(client, payload);
          break;

        case 'payment.failed':
          processResult = await dependencies.handlePaymentFailed(client, payload);
          break;

        default:
          // Log unhandled events but return success (don't want Razorpay to retry)
          console.log('[Webhook] Unhandled event type:', webhookEvent);
      }

      // Log webhook to audit table
      await dependencies.logWebhook(client, {
        event: webhookEvent,
        eventId,
        orderId,
        paymentId: razorpayPaymentId,
        payload: auditPayload,
        signature,
        signatureVerified: true,
        status: processResult.success ? 'PROCESSED' : 'FAILED',
        error: processResult.error,
        ipAddress,
        resolvedPaymentId: processResult.paymentId,
      });

      return processResult;
    });

    const duration = Date.now() - startTime;
    console.log('[Webhook] Processed:', { event: webhookEvent, eventId, duration: `${duration}ms`, result });

    return {
      statusCode: result.success ? 200 : 503,
      body: JSON.stringify({
        status: 'ok',
        event: webhookEvent,
        processed: result.success,
      }),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Webhook] Processing error:', errorMessage);

    // Try to log the failure
    try {
      await dependencies.query(
        `INSERT INTO payment_webhook_logs (
          event, razorpay_event_id, razorpay_order_id, razorpay_payment_id,
          payload, signature, signature_verified, status, error, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          webhookEvent,
          eventId || null,
          orderId,
          razorpayPaymentId,
          JSON.stringify(auditPayload),
          signature,
          true,
          'FAILED',
          errorMessage,
          ipAddress,
        ]
      );
    } catch (logError) {
      console.error('[Webhook] Failed to log error:', logError);
    }

    return {
      statusCode: 503,
      body: JSON.stringify({
        status: 'error',
        error: 'Webhook processing failed',
      }),
    };
  }
  };
}

export const handler: Handler = createRazorpayWebhookHandler();
