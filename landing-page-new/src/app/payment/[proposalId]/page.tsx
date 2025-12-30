'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchProposalById, formatCurrencyWithConversion } from '@/lib/proposals';
import { fetchInquiryById } from '@/lib/inquiries';
import type { Proposal } from '@/lib/proposals';
import type { Inquiry } from '@/lib/inquiries';
import { CheckCircle2, Clock, Mail } from 'lucide-react';
import Link from 'next/link';

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
            const { primary } = formatCurrencyWithConversion(fetchedProposal.advanceAmount, fetchedProposal.currency);
            console.log('Payment page viewed:', {
              proposalId,
              inquiry: fetchedInquiry.inquiryNumber,
              client: fetchedInquiry.contactName,
              amountDue: primary,
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
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80">Loading...</p>
        </div>
      </div>
    );
  }

  if (!proposal || !inquiry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Proposal Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            Unable to load payment information.
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

  const pricing = formatCurrencyWithConversion(proposal.advanceAmount, proposal.currency);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-emerald-100 p-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-2">
          Proposal Accepted!
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Thank you for accepting our proposal
          {inquiry.companyName && (
            <> for <strong>{inquiry.companyName}</strong></>
          )}
        </p>
        
        <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl p-6 mb-8 border border-violet-200">
          <p className="text-sm text-gray-600 text-center mb-2">
            Advance Payment Due
          </p>
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900">{pricing.primary}</div>
            <div className="text-lg text-gray-600 mt-1">(≈ {pricing.secondary})</div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-3">
            * Final amount will be calculated by Razorpay at checkout
          </p>
        </div>
        
        <div className="bg-blue-50 rounded-xl p-6 mb-6 border border-blue-200">
          <div className="flex items-start gap-3">
            <Clock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">
                Payment Integration Coming Soon
              </h3>
              <p className="text-sm text-blue-800">
                Our team will reach out to you via email at{' '}
                <strong>{inquiry.contactEmail}</strong> to complete the payment process 
                and kickstart your project.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">What&apos;s Next?</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">
                1
              </span>
              <p>Check your email for payment instructions and next steps</p>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">
                2
              </span>
              <p>Complete the advance payment to begin production</p>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">
                3
              </span>
              <p>We&apos;ll set up your project dashboard and start creating!</p>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <a
            href={`mailto:hello@motionify.com?subject=Payment%20for%20${inquiry.inquiryNumber}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
          >
            <Mail className="w-5 h-5" />
            Contact Support
          </a>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          Inquiry Number: <code className="font-mono text-violet-600">{inquiry.inquiryNumber}</code>
          {' • '}
          Proposal Version: {proposal.version || 1}
        </p>
      </div>
    </div>
  );
}
