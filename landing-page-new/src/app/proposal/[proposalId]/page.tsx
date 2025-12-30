'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchProposalById, fetchProposals, formatDate } from '@/lib/proposals';
import { fetchInquiryById } from '@/lib/inquiries';
import type { Proposal } from '@/lib/proposals';
import type { Inquiry } from '@/lib/inquiries';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import ProposalReview from '@/components/proposal/ProposalReview';
import ProposalActions from '@/components/proposal/ProposalActions';

export default function ProposalPage() {
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

    const loadProposal = async () => {
      try {
        const fetchedProposal = await fetchProposalById(proposalId);
        
        if (!fetchedProposal) {
          const allProposals = await fetchProposals();
          console.log('Proposal not found:', proposalId);
          console.log('Available proposals:', allProposals.map((p) => p.id));
          setLoading(false);
          return;
        }

        const fetchedInquiry = await fetchInquiryById(fetchedProposal.inquiryId);
        
        setProposal(fetchedProposal);
        setInquiry(fetchedInquiry);
        setLoading(false);

        console.log('Proposal viewed:', {
          id: proposalId,
          version: fetchedProposal.version || 1,
          status: fetchedProposal.status,
          inquiry: fetchedInquiry?.inquiryNumber || 'N/A',
        });
      } catch (error) {
        console.error('Error loading proposal:', error);
        setLoading(false);
      }
    };

    loadProposal();
  }, [proposalId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80">Loading proposal...</p>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Proposal Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            This proposal link may be invalid or the proposal has been removed.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Inquiry Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            Unable to load inquiry information for this proposal.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const handleStatusChange = async () => {
    const updatedProposal = await fetchProposalById(proposalId);
    if (updatedProposal) {
      setProposal(updatedProposal);
    }
  };

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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {proposal.version > 1 && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-300 text-sm font-bold">
                  ✨
                </span>
              </div>
              <div className="flex-1">
                <p className="text-blue-200 font-medium">
                  This proposal has been updated based on your feedback
                </p>
                <p className="text-blue-300/70 text-sm mt-1">
                  Version {proposal.version} • Last updated: {formatDate(proposal.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <ProposalReview proposal={proposal} inquiry={inquiry} />

          <div className="border-t border-gray-200 bg-gray-50 p-6">
            <ProposalActions 
              proposal={proposal} 
              inquiry={inquiry} 
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-white/40 text-sm">
            Questions? Email us at{' '}
            <a
              href="mailto:hello@motionify.com"
              className="text-white/60 hover:text-white underline"
            >
              hello@motionify.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
