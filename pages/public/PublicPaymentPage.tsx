import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, CreditCard, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { getInquiryById, type Inquiry } from '../../lib/inquiries';
import { getPublicProposalById, type Proposal } from '../../lib/proposals';
import { formatCurrency } from '../../utils/format';
import { projectAccessPath } from '../../lib/canonical-links';

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: any) => void;
  prefill: { name: string; email: string; contact: string };
  notes: { address: string };
  theme: { color: string };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => any;
  }
}

export function PublicPaymentPage() {
  const { proposalId } = useParams<{ proposalId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activatedProjectId, setActivatedProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (document.querySelector('script[src*="checkout.razorpay.com"]')) return;
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPayment() {
      if (!proposalId) {
        setLoading(false);
        return;
      }

      const fetchedProposal = (await getPublicProposalById(proposalId, searchParams.get('token'))).proposal;
      const fetchedInquiry = fetchedProposal ? await getInquiryById(fetchedProposal.inquiryId) : null;
      if (!cancelled) {
        setProposal(fetchedProposal);
        setInquiry(fetchedInquiry);
        setLoading(false);
      }
    }

    loadPayment();
    return () => {
      cancelled = true;
    };
  }, [proposalId, searchParams]);

  async function handlePayment() {
    if (!proposal || !inquiry) return;
    setProcessing(true);

    try {
      const token = searchParams.get('token');
      if (!token) {
        throw new Error('This payment link is missing a valid proposal review token.');
      }

      const response = await fetch('/.netlify/functions/payment-handoff/create-order', {
        method: 'POST',
        body: JSON.stringify({ proposalId: proposal.id, token }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const orderData = await response.json();

      if (!response.ok) {
        throw new Error(orderData.details || orderData.error || 'Failed to create order');
      }

      const options: RazorpayOptions = {
        key: orderData.razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: orderData.name,
        description: orderData.description,
        order_id: orderData.razorpayOrderId,
        handler: async (razorpayResponse: any) => {
          const verifyResponse = await fetch('/.netlify/functions/payment-handoff/verify', {
            method: 'POST',
            body: JSON.stringify({
              proposalId: proposal.id,
              token,
              paymentId: orderData.id,
              razorpayOrderId: razorpayResponse.razorpay_order_id,
              razorpayPaymentId: razorpayResponse.razorpay_payment_id,
              razorpaySignature: razorpayResponse.razorpay_signature,
            }),
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });

          if (!verifyResponse.ok) {
            throw new Error('Payment verification failed');
          }

          const verifyData = await verifyResponse.json().catch(() => ({}));
          const activation = verifyData.activation || {};
          setActivatedProjectId(activation.projectId || verifyData.project_id || verifyData.projectId || null);
          setProcessing(false);
        },
        prefill: {
          name: inquiry.contactName,
          email: inquiry.contactEmail,
          contact: inquiry.contactPhone || '',
        },
        notes: {
          address: 'Motionify Studio',
        },
        theme: {
          color: '#c2870a',
        },
      };

      const checkout = new window.Razorpay(options);
      checkout.on('payment.failed', (failure: any) => {
        alert(failure.error?.description || 'Payment failed. Please try again.');
        setProcessing(false);
      });
      checkout.open();
    } catch (error) {
      console.error('Payment initiation failed', error);
      alert(error instanceof Error ? error.message : 'Failed to initiate payment. Please try again.');
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!proposal || !inquiry) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-950 mb-2">Payment Not Found</h1>
          <p className="text-gray-600 mb-6">We could not load this proposal payment link.</p>
          <Link to="/" className="inline-flex px-5 py-2.5 rounded-lg bg-gray-100 text-gray-950">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (activatedProjectId) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-950 mb-2">Payment Successful</h1>
          <p className="text-gray-600 mb-6">Your project is ready to open.</p>
          <button
            onClick={() => navigate(projectAccessPath({ projectId: activatedProjectId, email: inquiry.contactEmail }))}
            className="w-full py-3 px-4 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800"
          >
            Open Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-white/10 bg-black/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/" className="inline-flex items-center">
            <img src="/motionify-light-logo.png" alt="Motionify Studio" className="h-8 w-auto" />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Complete Your Advance Payment</h1>
          <p className="text-white/60">
            You're one step away from starting your project with {inquiry.companyName || inquiry.contactName}.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-950">Payment Details</h2>
                <p className="text-sm text-gray-600 mt-1">Proposal for Inquiry {inquiry.inquiryNumber}</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Total Project Value</span>
                  <span className="font-semibold text-gray-950">{formatCurrency(proposal.totalPrice, proposal.currency)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Advance Percentage</span>
                  <span className="font-medium text-gray-950">{proposal.advancePercentage}%</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-lg font-medium text-gray-950">Amount Due Now</span>
                  <span className="text-2xl font-bold text-amber-700">{formatCurrency(proposal.advanceAmount, proposal.currency)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-blue-900 bg-blue-50 p-4 rounded-xl border border-blue-100">
              <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0" />
              <p>Your payment is secure. We use Razorpay checkout to protect your financial information.</p>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-6">
              <h3 className="font-semibold text-gray-950 mb-4">Pay Securely</h3>
              <button
                onClick={handlePayment}
                disabled={processing}
                className="w-full flex items-center justify-center py-3 px-4 rounded-lg text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Pay {formatCurrency(proposal.advanceAmount, proposal.currency)}
                  </>
                )}
              </button>
              <p className="text-xs text-center text-gray-500 mt-3 flex items-center justify-center gap-1">
                <CreditCard className="w-3.5 h-3.5" />
                Razorpay secure checkout
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
