import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { readJSON, writeJSON, STORAGE_FILES } from '@/lib/storage';
import { query } from '@/lib/db';

const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

// Validate credentials
if (!keyId || !keySecret || keyId.includes('xxxxx') || keySecret.includes('xxxxx')) {
  console.warn('⚠️  Razorpay credentials not configured properly. Please update your .env file with valid Razorpay test keys.');
  console.warn('   Get your keys from: https://dashboard.razorpay.com/app/keys');
}

const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

export async function POST(request: NextRequest) {
  try {
    // Check credentials first
    if (!keyId || !keySecret || keyId.includes('xxxxx') || keySecret.includes('xxxxx')) {
      console.error('❌ Razorpay credentials are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file.');
      return NextResponse.json(
        {
          error: 'Razorpay not configured',
          details: 'Please configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file. Get test keys from https://dashboard.razorpay.com/app/keys'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { proposalId, amount, currency } = body;

    if (!proposalId || !amount || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields: proposalId, amount, currency' },
        { status: 400 }
      );
    }

    // Fetch proposal directly from storage (server-side)
    const proposals = await readJSON<any>(STORAGE_FILES.PROPOSALS);
    const proposal = proposals.find((p: any) => p.id === proposalId);

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const options = {
      amount: amount,
      currency: currency === 'USD' ? 'USD' : 'INR',
      receipt: `rcpt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    };

    console.log('Creating Razorpay order with options:', options);
    const order = await razorpay.orders.create(options);

    // Persist payment record to JSON file (Server-side)
    const payments = await readJSON<any>(STORAGE_FILES.PAYMENTS);
    const paymentRecord = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      proposalId,
      inquiryId: proposal.inquiryId,
      amount,
      currency,
      paymentType: 'advance',
      razorpayOrderId: order.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    payments.push(paymentRecord);
    await writeJSON(STORAGE_FILES.PAYMENTS, payments);

    // Also persist to PostgreSQL database
    try {
      console.log('Attempting to save payment to PostgreSQL...', {
        proposalId,
        amount,
        orderId: order.id
      });

      await query(
        `INSERT INTO payments (
          proposal_id,
          payment_type,
          amount,
          currency,
          razorpay_order_id,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          proposalId,
          'advance',
          amount,
          currency,
          order.id,
          'pending',
          new Date()
        ]
      );
      console.log('✅ Payment record successfully saved to database (payments table)');
    } catch (dbError) {
      console.error('❌ Failed to save payment to database:', dbError);
      console.warn('⚠️  Falling back to JSON storage only due to database error');
      // Continue with JSON storage even if DB fails
    }

    console.log('✅ Razorpay order created & persisted:', {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      proposalId,
      paymentRecordId: paymentRecord.id,
    });

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      paymentRecordId: paymentRecord.id,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';

    console.error('❌ Error creating Razorpay order:', errorMessage);
    console.error('Stack trace:', errorStack);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    console.error('Error type:', typeof error);

    // Log environment variable status (without exposing secrets)
    console.error('Environment check:', {
      hasKeyId: !!keyId,
      hasKeySecret: !!keySecret,
      keyIdLength: keyId?.length || 0,
      keySecretLength: keySecret?.length || 0,
      keyIdPrefix: keyId?.substring(0, 8) || 'missing',
    });

    return NextResponse.json(
      { error: 'Failed to create order', details: errorMessage },
      { status: 500 }
    );
  }
}
