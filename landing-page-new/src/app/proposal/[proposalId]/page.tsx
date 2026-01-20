'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, use } from 'react';
import { fetchProposalById, fetchProposals, formatDate, ensureProposalExists } from '@/lib/proposals';
import { fetchInquiryById, ensureInquiryExists, mapInquiryFromApi } from '@/lib/inquiries';
import type { Proposal } from '@/lib/proposals';
import type { Inquiry } from '@/lib/inquiries';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import ProposalReview from '@/components/proposal/ProposalReview';
import ProposalActions from '@/components/proposal/ProposalActions';
import { CommentThread } from '@/components/CommentThread';
import { useAuth } from '@/context/AuthContext';


export default function ProposalPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const proposalId = params.proposalId as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dataParam = searchParams.get('data');

    const loadFromUrlData = async (encodedData: string) => {
      try {
        const decodedData = JSON.parse(atob(encodedData));
        if (decodedData.proposal && decodedData.inquiry) {
          // Normalize numeric fields that might be strings in the encoded data
          const proposalData = {
            ...decodedData.proposal,
            totalPrice: Number(decodedData.proposal.totalPrice),
            advanceAmount: Number(decodedData.proposal.advanceAmount),
            balanceAmount: Number(decodedData.proposal.balanceAmount),
          };

          let inquiryData = mapInquiryFromApi(decodedData.inquiry);

          console.log('Decoded inquiry data:', decodedData.inquiry);
          console.log('Mapped inquiry data (before persist):', inquiryData);

          // Persist to backend and WAIT so subsequent actions work
          try {
            await Promise.all([
              ensureInquiryExists(inquiryData),
              ensureProposalExists(proposalData)
            ]);
            console.log('Shared data successfully persisted to backend');

            // After persisting, fetch the inquiry from backend to get the proper ID
            // Use inquiryNumber to look up if id is empty
            if (!inquiryData.id && inquiryData.inquiryNumber) {
              console.log('Fetching inquiry by number:', inquiryData.inquiryNumber);
              const fetchedInquiry = await fetchInquiryById(inquiryData.inquiryNumber);
              if (fetchedInquiry && fetchedInquiry.id) {
                inquiryData = fetchedInquiry;
                console.log('Fetched inquiry with proper ID:', fetchedInquiry.id);
              }
            } else if (inquiryData.id) {
              // Verify the ID by fetching from backend
              const fetchedInquiry = await fetchInquiryById(inquiryData.id);
              if (fetchedInquiry && fetchedInquiry.id) {
                inquiryData = fetchedInquiry;
                console.log('Verified inquiry from backend:', fetchedInquiry.id);
              }
            }
          } catch (err) {
            console.error('Error persisting shared data:', err);
          }

          setProposal(proposalData);
          setInquiry(inquiryData);
          setLoading(false);
          console.log('Proposal loaded from URL data, inquiry ID:', inquiryData.id);
          return true;
        }
      } catch (error) {
        console.error('Error decoding proposal data from URL:', error);
      }
      return false;
    };

    const loadFromId = async () => {
      if (!proposalId) {
        setLoading(false);
        return;
      }

      try {
        console.log('Loading proposal by ID:', proposalId);
        const fetchedProposal = await fetchProposalById(proposalId);

        if (!fetchedProposal) {
          console.log('Proposal not found:', proposalId);
          setLoading(false);
          return;
        }

        console.log('Fetched proposal:', fetchedProposal);
        console.log('Proposal inquiryId:', fetchedProposal.inquiryId);

        const fetchedInquiry = await fetchInquiryById(fetchedProposal.inquiryId);
        console.log('Fetched inquiry:', fetchedInquiry);

        setProposal(fetchedProposal);
        setInquiry(fetchedInquiry);
        setLoading(false);

        console.log('Proposal viewed:', {
          id: proposalId,
          version: fetchedProposal.version || 1,
          status: fetchedProposal.status,
          inquiry: fetchedInquiry?.inquiryNumber || 'N/A',
          inquiryId: fetchedInquiry?.id || 'MISSING',
        });
      } catch (error) {
        console.error('Error loading proposal:', error);
        setLoading(false);
      }
    };

    const initialize = async () => {
      if (dataParam) {
        const success = await loadFromUrlData(dataParam);
        if (success) return;
      }
      await loadFromId();
    };

    initialize();
  }, [proposalId, searchParams]);

  if (loading || authLoading) {
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

  if (!inquiry || !inquiry.id) {
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
            <img src="/motionify-light-logo.png" alt="Motionify Studio" className="h-8 w-auto" />
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

        {proposal && (
          <CommentThread
            proposalId={proposal.id}
            currentUserId={user?.id}
            currentUserName={user?.fullName}
            isAuthenticated={isAuthenticated}
          />
        )}

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
