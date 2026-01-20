'use client';

import type { RazorpayPaymentResponse } from './payment.types';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export async function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function createRazorpayOrder(
  proposalId: string,
  amount: number,
  currency: 'INR' | 'USD'
): Promise<{ id: string; amount: number; currency: string }> {
  const response = await fetch('/api/payments/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposalId, amount, currency }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create order');
  }

  return response.json();
}

export async function verifyPayment(
  paymentId: string,
  orderId: string,
  signature: string,
  proposalId: string
): Promise<{ verified: boolean; error?: string; paymentRecord?: any }> {
  const response = await fetch('/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_payment_id: paymentId,
      razorpay_order_id: orderId,
      razorpay_signature: signature,
      proposalId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Payment verification failed');
  }

  const result = await response.json();
  return {
    verified: result.verified,
    error: result.error,
    paymentRecord: result.paymentRecord
  };
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name?: string;
    email?: string;
    contact?: string;
  };
  handler: (response: RazorpayPaymentResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
  theme: {
    color: string;
  };
}

export async function openRazorpayCheckout(
  options: RazorpayCheckoutOptions
): Promise<boolean> {
  const scriptLoaded = await loadRazorpayScript();

  if (!scriptLoaded) {
    throw new Error('Failed to load Razorpay script');
  }

  return new Promise((resolve) => {
    try {
      const razorpay = new window.Razorpay({
        ...options,
        modal: {
          ondismiss: () => {
            console.log('Payment modal dismissed');
            resolve(false);
          },
        },
      });

      razorpay.on('payment.failed', (error: any) => {
        console.error('Payment failed:', error);
        resolve(false);
      });

      razorpay.open();
      resolve(true);
    } catch (error) {
      console.error('Error opening Razorpay checkout:', error);
      resolve(false);
    }
  });
}
