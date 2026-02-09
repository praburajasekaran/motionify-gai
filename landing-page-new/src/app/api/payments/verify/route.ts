import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { readJSON, writeJSON, STORAGE_FILES } from '@/lib/storage';
import { query } from '@/lib/db';
import type { PaymentVerificationRequest } from '@/lib/payment.types';

// Admin email for payment failure notifications
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@motionify.com';

/**
 * Log a payment attempt to the database
 */
async function logPaymentAttempt(data: {
  paymentId?: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  status: 'success' | 'failure';
  errorCode?: string;
  errorDescription?: string;
}) {
  try {
    // Log to payment_webhook_logs table (already exists from PROD-07-01)
    await query(
      `INSERT INTO payment_webhook_logs (
        event_id, event_type, razorpay_order_id, razorpay_payment_id,
        payload, processed_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        `verify_${Date.now()}`,
        data.status === 'success' ? 'payment.verified' : 'payment.verify_failed',
        data.razorpayOrderId,
        data.razorpayPaymentId || null,
        JSON.stringify({
          paymentId: data.paymentId,
          errorCode: data.errorCode,
          errorDescription: data.errorDescription,
          timestamp: new Date().toISOString(),
        }),
      ]
    );
    console.log(`Payment attempt logged: ${data.status}`);
  } catch (logError) {
    console.error('Failed to log payment attempt:', logError);
    // Continue - don't fail the main flow
  }
}

/**
 * Send notification to admin about payment failure
 */
async function notifyAdminPaymentFailure(data: {
  orderId: string;
  paymentId?: string;
  errorCode?: string;
  errorDescription?: string;
  proposalId?: string;
}) {
  try {
    // Get admin users for in-app notification
    const adminResult = await query(
      `SELECT id, email FROM users WHERE role IN ('super_admin', 'support') AND is_active = true`
    );

    // Create in-app notification for each admin
    for (const admin of adminResult.rows) {
      await query(
        `INSERT INTO notifications (
          user_id, type, title, message, action_url, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          admin.id,
          'payment_failed',
          'Payment Verification Failed',
          `Payment failed for order ${data.orderId}. ${data.errorDescription || 'Signature verification failed'}`,
          data.proposalId ? `/#/admin/proposals/${data.proposalId}` : '/#/admin/payments',
        ]
      );
    }

    // Log email notification details (actual email sending requires Resend integration)
    console.log(`[ADMIN NOTIFICATION] Payment Failure Alert`, {
      to: ADMIN_EMAIL,
      orderId: data.orderId,
      paymentId: data.paymentId,
      errorCode: data.errorCode,
      errorDescription: data.errorDescription,
      proposalId: data.proposalId,
      timestamp: new Date().toISOString(),
    });

    console.log(`Admin notification sent for payment failure: ${data.orderId}`);
  } catch (notifyError) {
    console.error('Failed to notify admin about payment failure:', notifyError);
    // Continue - don't fail the main flow
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentVerificationRequest = await request.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, proposalId, errorCode, errorDescription } = body as PaymentVerificationRequest & { errorCode?: string; errorDescription?: string };

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      // Log failed attempt due to missing fields
      await logPaymentAttempt({
        razorpayOrderId: razorpay_order_id || 'unknown',
        status: 'failure',
        errorCode: 'MISSING_FIELDS',
        errorDescription: 'Missing required payment fields',
      });

      return NextResponse.json(
        { error: 'Missing required fields', verified: false },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest('hex');

    const isSignatureValid = generated_signature === razorpay_signature;

    console.log('Payment verification attempt:', {
      proposalId,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      verified: isSignatureValid,
    });

    // Log the payment attempt regardless of outcome
    await logPaymentAttempt({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      status: isSignatureValid ? 'success' : 'failure',
      errorCode: isSignatureValid ? undefined : (errorCode || 'SIGNATURE_MISMATCH'),
      errorDescription: isSignatureValid ? undefined : (errorDescription || 'Signature verification failed'),
    });

    if (isSignatureValid) {
      const payments = await readJSON<any>(STORAGE_FILES.PAYMENTS);
      const index = payments.findIndex((p: any) => p.razorpayOrderId === razorpay_order_id);

      if (index !== -1) {
        payments[index] = {
          ...payments[index],
          status: 'completed',
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          completedAt: new Date().toISOString(),
        };

        await writeJSON(STORAGE_FILES.PAYMENTS, payments);

        // Also update in PostgreSQL database
        try {
          console.log('Attempting to update payment status in PostgreSQL...', {
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id
          });

          await query(
            `UPDATE payments
             SET status = $1,
                 razorpay_payment_id = $2,
                 razorpay_signature = $3,
                 paid_at = $4
             WHERE razorpay_order_id = $5`,
            ['completed', razorpay_payment_id, razorpay_signature, new Date(), razorpay_order_id]
          );
          console.log('Payment status updated to "completed" in database');
        } catch (dbError) {
          console.error('Failed to update payment in database:', dbError);
          console.warn('Falling back to JSON storage only for payment completion');
          // Continue even if DB update fails
        }

        console.log('Payment marked as completed in JSON storage:', {
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
        });

        return NextResponse.json({
          verified: true,
          paymentRecord: payments[index],
        });
      } else {
        console.warn('Payment record not found for orderId:', razorpay_order_id);

        // Notify admin about this unusual situation
        await notifyAdminPaymentFailure({
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          errorCode: 'RECORD_NOT_FOUND',
          errorDescription: 'Payment signature valid but no payment record found',
          proposalId,
        });
      }
    } else {
      // Signature verification failed - notify admin
      await notifyAdminPaymentFailure({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        errorCode: errorCode || 'SIGNATURE_MISMATCH',
        errorDescription: errorDescription || 'Razorpay signature verification failed',
        proposalId,
      });
    }

    return NextResponse.json(
      {
        verified: false,
        error: 'Signature verification failed or payment record not found',
      },
      { status: 400 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error verifying payment:', errorMessage);

    return NextResponse.json(
      { error: 'Failed to verify payment', details: errorMessage, verified: false },
      { status: 500 }
    );
  }
}
