import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, FileText, Loader2, MessageSquare, X } from 'lucide-react';
import { PublicProposalReview } from '../../components/proposal/PublicProposalReview';
import { getInquiryById, mapInquiryFromApi, updateInquiryStatus, type Inquiry } from '../../lib/inquiries';
import { getPublicProposalById, updatePublicProposalStatus, type Proposal } from '../../lib/proposals';
import { advancePaymentPath } from '../../lib/canonical-links';
import { decodeBase64 } from '../../utils/encoding';

interface SharedProposalData {
  proposal?: Proposal;
  inquiry?: Inquiry;
}

function decodeSharedProposalData(encoded: string): SharedProposalData | null {
  try {
    const decoded = JSON.parse(decodeBase64(encoded));
    return decoded && typeof decoded === 'object' ? decoded : null;
  } catch {
    return null;
  }
}

export function PublicProposalPage() {
  const { proposalId } = useParams<{ proposalId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProposal() {
      if (!proposalId) {
        setLoading(false);
        return;
      }

      const shared = searchParams.get('data');
      if (shared) {
        const decoded = decodeSharedProposalData(shared);
        if (decoded?.proposal && decoded?.inquiry) {
          if (!cancelled) {
            setProposal({
              ...decoded.proposal,
              totalPrice: Number(decoded.proposal.totalPrice),
              advanceAmount: Number(decoded.proposal.advanceAmount),
              balanceAmount: Number(decoded.proposal.balanceAmount),
            });
            setInquiry(mapInquiryFromApi(decoded.inquiry));
            setLoading(false);
          }
          return;
        }
      }

      const token = searchParams.get('token');
      const { proposal: fetchedProposal, error } = await getPublicProposalById(proposalId, token);
      if (!fetchedProposal) {
        if (!cancelled) {
          setAccessError(error || null);
          setLoading(false);
        }
        return;
      }

      const fetchedInquiry = await getInquiryById(fetchedProposal.inquiryId);
      if (!cancelled) {
        setProposal(fetchedProposal);
        setInquiry(fetchedInquiry);
        setLoading(false);
      }
    }

    loadProposal();
    return () => {
      cancelled = true;
    };
  }, [proposalId, searchParams]);

  async function refreshProposal() {
    if (!proposalId) return;
    const updated = await getPublicProposalById(proposalId, searchParams.get('token'));
    if (updated.proposal) setProposal(updated.proposal);
  }

  async function submitStatus(status: 'changes_requested' | 'rejected') {
    if (!proposal || !inquiry) return;
    setSubmitting(true);
    try {
      const token = searchParams.get('token');
      if (!token) throw new Error('This action requires a valid proposal review token.');
      await updatePublicProposalStatus(proposal.id, token, status, { feedback: feedback.trim() || undefined });
      await updateInquiryStatus(inquiry.id, status === 'changes_requested' ? 'negotiating' : 'rejected');
      setShowFeedback(false);
      setFeedback('');
      await refreshProposal();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-white/70">Loading proposal...</p>
        </div>
      </div>
    );
  }

  if (!proposal || !inquiry) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center">
          <FileText className="w-10 h-10 text-amber-700 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-950 mb-2">Proposal Not Found</h1>
          <p className="text-gray-600 mb-6">{accessError || 'This proposal link may be invalid, expired, or no longer available.'}</p>
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-100 text-gray-950 hover:bg-gray-200">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const hasResponded = proposal.status !== 'sent';

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-white/10 bg-black/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/" className="inline-flex items-center">
            <img src="/motionify-light-logo.png" alt="Motionify Studio" className="h-8 w-auto" />
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PublicProposalReview proposal={proposal} inquiry={inquiry} />

        <div className="bg-gray-50 rounded-b-2xl border-t border-gray-200 p-6">
          {hasResponded ? (
            <p className="text-center text-gray-600">You have already responded to this proposal.</p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 text-center">Please review the proposal above and choose an action below.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => navigate(advancePaymentPath(proposal.id, { token: searchParams.get('token') || undefined }))}
                  className="sm:col-span-3 flex items-center justify-center gap-2 px-6 py-4 rounded-lg bg-amber-700 text-white font-medium hover:bg-amber-800 transition-colors"
                >
                  <Check className="w-5 h-5" />
                  Accept & Pay
                </button>
                <button
                  onClick={() => setShowFeedback(true)}
                  disabled={submitting}
                  className="sm:col-span-2 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white ring-1 ring-gray-300 text-gray-950 font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  <MessageSquare className="w-5 h-5" />
                  Request Changes
                </button>
                <button
                  onClick={() => submitStatus('rejected')}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-red-50 ring-1 ring-red-200 text-red-700 font-medium hover:bg-red-100 disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                  Decline
                </button>
              </div>
            </div>
          )}
        </div>

        {showFeedback && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold text-gray-950 mb-2">Request Changes</h2>
              <p className="text-sm text-gray-600 mb-4">Let us know what you would like us to adjust.</p>
              <textarea
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                placeholder="Describe the changes you would like..."
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowFeedback(false)} className="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-950">
                  Cancel
                </button>
                <button
                  onClick={() => submitStatus('changes_requested')}
                  disabled={submitting || feedback.trim().length < 10}
                  className="flex-1 px-4 py-2 rounded-lg bg-amber-700 text-white disabled:opacity-50"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
