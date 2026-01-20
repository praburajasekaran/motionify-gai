import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { readJSON, writeJSON, STORAGE_FILES } from '@/lib/storage';
import { query } from '@/lib/db';
import type { PaymentVerificationRequest } from '@/lib/payment.types';

export async function POST(request: NextRequest) {
  try {
    const body: PaymentVerificationRequest = await request.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, proposalId } = body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
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
          console.log('✅ Payment status updated to "completed" in database');
        } catch (dbError) {
          console.error('❌ Failed to update payment in database:', dbError);
          console.warn('⚠️  Falling back to JSON storage only for payment completion');
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
      }
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
