/**
 * Razorpay Webhook Handler
 *
 * Receives and processes asynchronous payment events from Razorpay.
 * This is the source of truth for payment confirmation - the client-side
 * callback is optimistic UI.
 *
 * Key features:
 * - Uses raw body text for signature verification (critical for signature match)
 * - Idempotent processing via x-razorpay-event-id header
 * - Logs all webhooks to payment_webhook_logs for audit trail
 * - Returns 200 quickly to acknowledge receipt (Razorpay expects <5 seconds)
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { query, transaction } from '@/lib/db';
import type { PoolClient } from 'pg';

/**
 * Razorpay webhook payload structure
 */
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

/**
 * Verify Razorpay webhook signature using HMAC SHA256
 */
function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const expectedSignature = hmac.digest('hex');
  return expectedSignature === signature;
}

/**
 * Check if webhook event has already been processed (idempotency)
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const result = await query(
    `SELECT id FROM payment_webhook_logs WHERE razorpay_event_id = $1`,
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
    payload: RazorpayWebhookPayload;
    signature: string;
    signatureVerified: boolean;
    status: 'RECEIVED' | 'PROCESSED' | 'FAILED';
    error?: string;
    ipAddress?: string;
    resolvedPaymentId?: string;
  }
): Promise<string> {
  const result = await client.query(
    `INSERT INTO payment_webhook_logs (
      event, razorpay_event_id, razorpay_order_id, razorpay_payment_id,
      payload, signature, signature_verified, status, error, ip_address,
      payment_id, processed_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id`,
    [
      params.event,
      params.eventId,
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
  return result.rows[0].id;
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

  const { id: razorpayPaymentId, order_id: razorpayOrderId, method } = payment;

  // Update payment status to completed
  const result = await client.query(
    `UPDATE payments
     SET status = 'completed',
         razorpay_payment_id = $1,
         payment_method = $2,
         completed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE razorpay_order_id = $3
       AND status != 'completed'
     RETURNING id`,
    [razorpayPaymentId, method?.toUpperCase() || null, razorpayOrderId]
  );

  if (result.rows.length === 0) {
    // Either payment not found or already completed - both are OK
    const existingPayment = await client.query(
      `SELECT id, status FROM payments WHERE razorpay_order_id = $1`,
      [razorpayOrderId]
    );

    if (existingPayment.rows.length === 0) {
      return { success: false, error: `Payment not found for order ${razorpayOrderId}` };
    }

    // Payment already completed - idempotent success
    return { success: true, paymentId: existingPayment.rows[0].id };
  }

  return { success: true, paymentId: result.rows[0].id };
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
  const failureReason = error_description || error_code || 'Payment failed';

  // Only update to failed if not already completed (UPI retry behavior)
  const result = await client.query(
    `UPDATE payments
     SET status = 'failed',
         failure_reason = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE razorpay_order_id = $2
       AND status NOT IN ('completed', 'refunded')
     RETURNING id`,
    [failureReason, razorpayOrderId]
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

  return { success: true, paymentId: result.rows[0].id };
}

/**
 * POST /api/webhooks/razorpay
 *
 * Receives Razorpay webhook events for asynchronous payment confirmation.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Get raw body for signature verification (CRITICAL: must use text(), not json())
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') || '';
  const eventId = request.headers.get('x-razorpay-event-id') || '';
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  // Get webhook secret from environment
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Webhook] RAZORPAY_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  // Verify signature using raw body
  const signatureVerified = verifySignature(rawBody, signature, webhookSecret);

  // Parse payload after signature verification
  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error('[Webhook] Failed to parse payload');
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const event = payload.event;
  const orderId = payload.payload.payment?.entity?.order_id || '';
  const razorpayPaymentId = payload.payload.payment?.entity?.id || null;

  console.log('[Webhook] Received:', {
    event,
    eventId,
    orderId,
    razorpayPaymentId,
    signatureVerified,
    ipAddress,
  });

  // Reject if signature verification failed
  if (!signatureVerified) {
    console.error('[Webhook] Signature verification failed');

    // Still log the failed attempt for audit
    try {
      await query(
        `INSERT INTO payment_webhook_logs (
          event, razorpay_event_id, razorpay_order_id, razorpay_payment_id,
          payload, signature, signature_verified, status, error, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          event,
          eventId || null,
          orderId,
          razorpayPaymentId,
          JSON.stringify(payload),
          signature,
          false,
          'FAILED',
          'Signature verification failed',
          ipAddress,
        ]
      );
    } catch (logError) {
      console.error('[Webhook] Failed to log invalid signature attempt:', logError);
    }

    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Check for duplicate event (idempotency)
  if (eventId) {
    try {
      const alreadyProcessed = await isEventProcessed(eventId);
      if (alreadyProcessed) {
        console.log('[Webhook] Event already processed:', eventId);
        return NextResponse.json({ status: 'already_processed' });
      }
    } catch (checkError) {
      console.error('[Webhook] Error checking idempotency:', checkError);
      // Continue processing - better to risk duplicate than miss payment
    }
  }

  // Process webhook in a transaction
  try {
    const result = await transaction(async (client) => {
      let processResult: { success: boolean; paymentId?: string; error?: string } = {
        success: true,
      };

      // Handle different event types
      switch (event) {
        case 'payment.captured':
        case 'order.paid':
          processResult = await handlePaymentCaptured(client, payload);
          break;

        case 'payment.failed':
          processResult = await handlePaymentFailed(client, payload);
          break;

        default:
          // Log unhandled events but return success (don't want Razorpay to retry)
          console.log('[Webhook] Unhandled event type:', event);
      }

      // Log webhook to audit table
      await logWebhook(client, {
        event,
        eventId,
        orderId,
        paymentId: razorpayPaymentId,
        payload,
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
    console.log('[Webhook] Processed:', { event, eventId, duration: `${duration}ms`, result });

    // Always return 200 to acknowledge receipt
    return NextResponse.json({
      status: 'ok',
      event,
      processed: result.success,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Webhook] Processing error:', errorMessage);

    // Try to log the failure
    try {
      await query(
        `INSERT INTO payment_webhook_logs (
          event, razorpay_event_id, razorpay_order_id, razorpay_payment_id,
          payload, signature, signature_verified, status, error, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          event,
          eventId || null,
          orderId,
          razorpayPaymentId,
          JSON.stringify(payload),
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

    // Still return 200 to prevent Razorpay from retrying indefinitely
    // The error is logged and can be reviewed in admin dashboard
    return NextResponse.json({
      status: 'error',
      error: errorMessage,
    });
  }
}
