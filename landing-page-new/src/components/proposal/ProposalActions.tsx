'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProposalStatus, formatCurrencyWithConversion } from '@/lib/proposals';
import { updateInquiryStatus } from '@/lib/inquiries';
import type { Proposal } from '@/lib/proposals';
import type { Inquiry } from '@/lib/inquiries';
import { Check, X, MessageSquare, AlertTriangle, Loader2 } from 'lucide-react';

interface ProposalActionsProps {
  proposal: Proposal;
  inquiry: Inquiry;
  onStatusChange: () => void;
}

export default function ProposalActions({ proposal, inquiry, onStatusChange }: ProposalActionsProps) {
  const router = useRouter();
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Check if already responded
  const hasResponded = proposal.status !== 'sent';

  // Handle Accept Proposal
  const handleAccept = () => {
    if (hasResponded) return;

    setIsSubmitting(true);

    try {
      // Update proposal status
      updateProposalStatus(proposal.id, 'accepted');
      
      // Update inquiry status
      updateInquiryStatus(inquiry.id, 'accepted');

      // Log email notification
      const pricing = formatCurrencyWithConversion(proposal.totalPrice, proposal.currency);
      const advance = formatCurrencyWithConversion(proposal.advanceAmount, proposal.currency);

      console.log('📧 EMAIL SENT TO ADMIN:');
      console.log('========================================');
      console.log('Subject: Proposal Accepted -', inquiry.inquiryNumber);
      console.log('Client:', inquiry.contactName);
      console.log('Company:', inquiry.companyName || 'N/A');
      console.log('Email:', inquiry.contactEmail);
      console.log('Proposal Version:', proposal.version || 1);
      console.log('Total Amount:', pricing.primary);
      console.log('Advance Due:', advance.primary);
      console.log('========================================');

      // Redirect to payment page
      router.push(`/payment/${proposal.id}`);
    } catch (error) {
      console.error('Error accepting proposal:', error);
      alert('Failed to accept proposal. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Handle Request Changes
  const handleRequestChanges = () => {
    setValidationError('');
    
    if (feedback.trim().length < 10) {
      setValidationError('Please provide at least 10 characters of feedback.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Update proposal status with feedback
      updateProposalStatus(proposal.id, 'changes_requested', feedback.trim());
      
      // Update inquiry status to negotiating
      updateInquiryStatus(inquiry.id, 'negotiating');

      // Log email notification
      console.log('📧 EMAIL SENT TO ADMIN:');
      console.log('========================================');
      console.log('Subject: Changes Requested -', inquiry.inquiryNumber);
      console.log('Client:', inquiry.contactName);
      console.log('Proposal Version:', proposal.version || 1);
      console.log('Feedback:');
      console.log(feedback.trim());
      console.log('========================================');

      // Close modal and refresh
      setShowChangesModal(false);
      setFeedback('');
      onStatusChange();
      
      // Show success message
      alert('Your feedback has been sent to our team. We will update the proposal and get back to you soon.');
    } catch (error) {
      console.error('Error requesting changes:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reject Proposal
  const handleReject = () => {
    setIsSubmitting(true);

    try {
      // Update proposal status with optional reason
      updateProposalStatus(
        proposal.id, 
        'rejected', 
        rejectReason.trim() || undefined
      );
      
      // Update inquiry status
      updateInquiryStatus(inquiry.id, 'rejected');

      // Log email notification
      console.log('📧 EMAIL SENT TO ADMIN:');
      console.log('========================================');
      console.log('Subject: Proposal Rejected -', inquiry.inquiryNumber);
      console.log('Client:', inquiry.contactName);
      console.log('Proposal Version:', proposal.version || 1);
      console.log('Reason:', rejectReason.trim() || 'Not provided');
      console.log('========================================');

      // Close modal and refresh
      setShowRejectModal(false);
      setRejectReason('');
      onStatusChange();

      // Show confirmation
      alert('Proposal has been declined. Thank you for considering our services.');
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      alert('Failed to decline proposal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If already responded, show message only
  if (hasResponded) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600">
          You have already responded to this proposal.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 text-center mb-6">
          Please review the proposal above and choose an action below.
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Accept Button (Primary) */}
          <button
            onClick={handleAccept}
            disabled={isSubmitting}
            className="sm:col-span-3 flex items-center justify-center gap-2 px-6 py-4 rounded-lg bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 text-white font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Accept Proposal & Proceed to Payment
              </>
            )}
          </button>

          {/* Request Changes Button (Secondary) */}
          <button
            onClick={() => setShowChangesModal(true)}
            disabled={isSubmitting}
            className="sm:col-span-2 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white ring-1 ring-gray-300 text-gray-900 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MessageSquare className="w-5 h-5" />
            Request Changes
          </button>

          {/* Reject Button (Tertiary/Destructive) */}
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-red-50 ring-1 ring-red-200 text-red-700 font-medium hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
            Decline
          </button>
        </div>
      </div>

      {/* Request Changes Modal */}
      {showChangesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Request Changes</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Let us know what you'd like us to adjust in the proposal.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Feedback <span className="text-red-600">*</span>
              </label>
              <textarea
                value={feedback}
                onChange={(e) => {
                  setFeedback(e.target.value);
                  setValidationError('');
                }}
                placeholder="Please describe what changes you'd like to see..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              />
              {validationError && (
                <p className="text-xs text-red-600 mt-1">{validationError}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Minimum 10 characters ({feedback.length}/10)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowChangesModal(false);
                  setFeedback('');
                  setValidationError('');
                }}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestChanges}
                disabled={isSubmitting || feedback.trim().length < 10}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Decline Proposal</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Are you sure you want to decline this proposal? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (Optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Let us know why you're declining (optional)..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Declining...
                  </>
                ) : (
                  'Decline Proposal'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
