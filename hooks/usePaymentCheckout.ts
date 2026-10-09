import { useState } from 'react';
import { z } from 'zod';
import type { RazorpayOptions, RazorpayResponse } from '../types/razorpay';

type PaymentAccess =
  | { proposalId: string; token: string; paymentType?: never }
  | { proposalId: string; token?: never; paymentType?: 'advance' | 'balance' };
type PaymentProof = { paymentId: string; response: RazorpayResponse };
type CheckoutState =
  | { status: 'idle'; error?: string }
  | { status: 'opening'; phase: 'loading' | 'order' | 'checkout' }
  | { status: 'verifying' }
  | { status: 'unconfirmed'; proof: PaymentProof; error: string }
  | { status: 'complete'; projectId: string; clientEmail?: string };

const orderSchema = z.object({
  id: z.string().min(1), razorpayKeyId: z.string().min(1), razorpayOrderId: z.string().min(1),
  amount: z.number().int().positive(), currency: z.string().min(1), name: z.string(), description: z.string(),
});
const confirmationSchema = z.object({
  activation: z.object({ projectId: z.string().min(1), clientEmail: z.string().optional() }),
});

async function paymentRequest(endpoint: string, body: object) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`/.netlify/functions/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
      credentials: 'include', body: JSON.stringify(body), signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      const error = typeof data?.error === 'string' ? data.error : data?.error?.message;
      throw new Error(error || 'Payment service is temporarily unavailable. Please try again.');
    }
    return data;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Payment service took too long to respond. Please try again.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function loadCheckout() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    const script = existing || document.createElement('script');
    const timeout = window.setTimeout(() => { script.remove(); reject(new Error('Checkout could not load. Please try again.')); }, 15_000);
    const finish = (error?: Error) => {
      window.clearTimeout(timeout);
      if (error) { script.remove(); reject(error); } else resolve();
    };
    script.addEventListener('load', () => finish(window.Razorpay ? undefined : new Error('Checkout could not load. Please try again.')), { once: true });
    script.addEventListener('error', () => finish(new Error('Checkout could not load. Check your connection and try again.')), { once: true });
    if (!existing) { script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.async = true; document.body.appendChild(script); }
  });
}

export function usePaymentCheckout(access: PaymentAccess, prefill: RazorpayOptions['prefill']) {
  const [state, setState] = useState<CheckoutState>({ status: 'idle' });
  const endpoint = access.token ? 'payment-handoff' : 'payments';

  async function confirm(proof: PaymentProof) {
    setState({ status: 'verifying' });
    try {
      const data = await paymentRequest(`${endpoint}/verify`, {
        ...(access.token ? access : {}), paymentId: proof.paymentId,
        razorpayOrderId: proof.response.razorpay_order_id,
        razorpayPaymentId: proof.response.razorpay_payment_id,
        razorpaySignature: proof.response.razorpay_signature,
      });
      const result = confirmationSchema.safeParse(data);
      if (!result.success) throw new Error('Your project is still being prepared. Retry confirmation shortly.');
      setState({ status: 'complete', projectId: result.data.activation.projectId, clientEmail: result.data.activation.clientEmail });
    } catch {
      setState({ status: 'unconfirmed', proof, error: 'We could not confirm your payment yet. Retry confirmation without paying again.' });
    }
  }

  async function start() {
    if (state.status === 'opening' || state.status === 'verifying' || state.status === 'complete') return;
    if (state.status === 'unconfirmed') { await confirm(state.proof); return; }
    setState({ status: 'opening', phase: 'loading' });
    try {
      await loadCheckout();
      setState({ status: 'opening', phase: 'order' });
      const data = await paymentRequest(`${endpoint}/create-order`, access.token ? access : {
        proposalId: access.proposalId, paymentType: access.paymentType || 'advance',
      });
      const order = orderSchema.safeParse(data);
      if (!order.success) throw new Error('Payment service is temporarily unavailable. Please try again.');
      const checkout = new window.Razorpay({
        key: order.data.razorpayKeyId, amount: order.data.amount, currency: order.data.currency,
        name: order.data.name, description: order.data.description, order_id: order.data.razorpayOrderId,
        prefill, notes: { address: 'Motionify Studio' }, theme: { color: '#92600a' },
        handler: response => { void confirm({ paymentId: order.data.id, response }); },
        modal: { ondismiss: () => setState(current => current.status === 'opening' ? { status: 'idle' } : current) },
      });
      checkout.on('payment.failed', () => setState(current => current.status === 'opening'
        ? { status: 'idle', error: 'Payment failed. Please try again.' } : current));
      setState({ status: 'opening', phase: 'checkout' });
      checkout.open();
    } catch (error) {
      setState({ status: 'idle', error: error instanceof Error ? error.message : 'We could not open checkout. Please try again.' });
    }
  }

  const progress = state.status === 'verifying' ? 'Confirming payment…' : state.status === 'opening'
    ? { loading: 'Loading secure checkout…', order: 'Preparing payment…', checkout: 'Complete payment in Razorpay' }[state.phase]
    : null;
  return { state, start, progress, processing: state.status === 'opening' || state.status === 'verifying',
    error: state.status === 'idle' || state.status === 'unconfirmed' ? state.error : undefined };
}
