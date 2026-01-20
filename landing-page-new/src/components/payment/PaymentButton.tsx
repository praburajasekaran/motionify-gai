'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, AlertCircle } from 'lucide-react';
import { createRazorpayOrder, openRazorpayCheckout, verifyPayment } from '@/lib/razorpay-client';
import { createProjectFromPayment } from '@/services/paymentService';

interface PaymentButtonProps {
  proposalId: string;
  amount: number;
  currency: 'INR' | 'USD';
  clientEmail: string;
  clientName: string;
}

export default function PaymentButton({
  proposalId,
  amount,
  currency,
  clientEmail,
  clientName,
}: PaymentButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePaymentClick = async () => {
    setLoading(true);
    setError(null);

    try {
      const order = await createRazorpayOrder(proposalId, amount, currency);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: order.amount,
        currency: order.currency,
        name: 'Motionify',
        description: `Advance Payment - ${proposalId}`,
        order_id: order.id,
        prefill: {
          name: clientName,
          email: clientEmail,
        },
        handler: handlePaymentSuccess,
        theme: {
          color: '#7C3AED',
        },
      };

      const checkoutOpened = await openRazorpayCheckout(options);

      if (!checkoutOpened) {
        setError('Failed to open payment checkout. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Payment initiation failed';
      setError(errorMsg);
      setLoading(false);
      console.error('Payment error:', err);
    }
  };

  const handlePaymentSuccess = async (response: any) => {
    try {
      // Step 1: Verify payment
      const { verified, paymentRecord } = await verifyPayment(
        response.razorpay_payment_id,
        response.razorpay_order_id,
        response.razorpay_signature,
        proposalId
      );

      if (!verified) {
        throw new Error('Payment verification failed');
      }

      console.log('✅ Payment verified successfully');

      // Step 2: Create project from payment
      const projectResponse = await fetch('/api/projects/create-from-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId,
          paymentId: paymentRecord.id,
        }),
      });

      if (!projectResponse.ok) {
        const error = await projectResponse.json();
        throw new Error(error.details || 'Failed to create project');
      }

      const { project, inquiry } = await projectResponse.json();
      console.log('✅ Project created:', project.projectNumber);

      // Step 3: Create/update client user
      const userResponse = await fetch('/api/users/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: clientEmail,
          name: clientName,
          projectId: project.id,
        }),
      });

      if (!userResponse.ok) {
        const error = await userResponse.json();
        throw new Error(error.details || 'Failed to create user');
      }

      const { user } = await userResponse.json();
      console.log('✅ User created/updated:', user.email);

      // Step 4: Send invoice email (non-blocking)
      try {
        await fetch('/api/payments/send-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientEmail,
            clientName,
            paymentId: paymentRecord.id,
            paymentAmount: paymentRecord.amount,
            paymentCurrency: paymentRecord.currency,
            projectId: project.id,
            projectNumber: project.projectNumber,
          }),
        });
        console.log('📧 Invoice email sent successfully');
      } catch (emailErr) {
        console.warn('⚠️ Failed to send invoice email (user can resend from success page):', emailErr);
      }

      console.log('🎉 Payment flow completed successfully:', {
        paymentId: response.razorpay_payment_id,
        orderId: response.razorpay_order_id,
        projectId: project.id,
        projectNumber: project.projectNumber,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });

      // Redirect to success page with project ID
      router.push(`/payment/success?projectId=${project.id}&projectNumber=${project.projectNumber}&paymentId=${paymentRecord.id}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Payment processing failed';
      console.error('❌ Payment flow error:', err);
      router.push(`/payment/failure?error=${encodeURIComponent(errorMsg)}`);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Payment Error</h3>
            <p className="text-sm text-red-800 mt-1">{error}</p>
          </div>
        </div>
      )}

      <button
        onClick={handlePaymentClick}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            Pay Now
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        * Final amount will be calculated by Razorpay at checkout
      </p>
    </div>
  );
}
