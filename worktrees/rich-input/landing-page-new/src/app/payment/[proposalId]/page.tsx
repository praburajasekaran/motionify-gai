'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchProposalById } from '@/lib/proposals';
import { fetchInquiryById } from '@/lib/inquiries';
import type { Proposal } from '@/lib/proposals';
import type { Inquiry } from '@/lib/inquiries';
import Link from 'next/link';
import PaymentButton from '@/components/payment/PaymentButton';
import PaymentBreakdown from '@/components/payment/PaymentBreakdown';

export default function PaymentPage() {
  const params = useParams();
  const proposalId = params.proposalId as string;
  
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!proposalId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const fetchedProposal = await fetchProposalById(proposalId);
        if (fetchedProposal) {
          const fetchedInquiry = await fetchInquiryById(fetchedProposal.inquiryId);
          setProposal(fetchedProposal);
          setInquiry(fetchedInquiry);

          if (fetchedInquiry) {
            console.log('Payment page viewed:', {
              proposalId,
              inquiry: fetchedInquiry.inquiryNumber,
              client: fetchedInquiry.contactName,
              advanceAmount: fetchedProposal.advanceAmount,
            });
          }
        }
      } catch (error) {
        console.error('Error loading payment data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [proposalId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/80">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!proposal || !inquiry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Data Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            We couldn't load your proposal or inquiry details.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-white hover:text-white/80 transition-colors">
            <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="8" fill="url(#gradient)" />
              <path d="M12 20L20 12L28 20L20 28L12 20Z" fill="white" />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="40" y2="40">
                  <stop stopColor="#D946EF" />
                  <stop offset="0.5" stopColor="#8B5CF6" />
                  <stop offset="1" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
            </svg>
            <span className="text-xl font-bold">Motionify</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Complete Your Payment</h1>
          <p className="text-white/60">
            You're one step away from starting your project with {inquiry.companyName || inquiry.contactName}
          </p>
        </div>

        <PaymentBreakdown proposal={proposal} />

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Pay Advance Amount</h2>
          
          <PaymentButton
            proposalId={proposalId}
            amount={proposal.advanceAmount}
            currency={proposal.currency}
            clientEmail={inquiry.contactEmail}
            clientName={inquiry.contactName}
          />

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">
              <strong>Inquiry:</strong> {inquiry.inquiryNumber}
              {' • '}
              <strong>Proposal Version:</strong> {proposal.version || 1}
            </p>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-white/60 text-sm">
            Questions? Email us at{' '}
            <a
              href="mailto:hello@motionify.com"
              className="text-white hover:text-white/80 underline"
            >
              hello@motionify.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
