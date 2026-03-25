/**
 * DeliverableReviewActions Component
 *
 * Renders inside the file accordion, below the video player.
 * Provides a linear review flow: watch → decide → comment → submit.
 *
 * Default state: Approve / Request Revision buttons + commenting hint.
 * Revision mode: Notes form + file attachments + quota + submit button.
 *
 * The video commenting itself is gated in DeliverableVideoSection via isRevisionMode prop.
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Download,
  AlertCircle,
  AlertTriangle,
  MessageSquare,
  Send,
  X,
  Clock,
} from 'lucide-react';
import { Button, Textarea } from '../ui/design-system';
import { FileUploadZone } from './FileUploadZone';
import { RevisionSubmitConfirmation } from './RevisionSubmitConfirmation';
import { useDeliverables } from './DeliverableContext';
import {
  Deliverable,
  DeliverableApproval,
  RevisionQuota,
  TimestampedComment,
} from '../../types/deliverable.types';

export interface DeliverableReviewActionsProps {
  deliverable: Deliverable;
  isRevisionMode: boolean;

  // Permissions
  canApprove: boolean;
  canReject: boolean;
  canAccessFinal: boolean;
  canSendForReview: boolean;
  isClientPM: boolean;
  getDeniedReason: (action: string) => string;

  // Action handlers
  onApprove: () => void;
  onRequestRevision: () => void;
  onCancelRevision: () => void;
  onSendForReview?: () => void;
  isSendingForReview?: boolean;

  // Revision form
  onSubmit: (approval: DeliverableApproval) => void;
  quota: RevisionQuota;
  allComments: TimestampedComment[];
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
}

export const DeliverableReviewActions: React.FC<DeliverableReviewActionsProps> = ({
  deliverable,
  isRevisionMode,
  canApprove,
  canReject,
  canAccessFinal,
  canSendForReview,
  isClientPM,
  getDeniedReason,
  onApprove,
  onRequestRevision,
  onCancelRevision,
  onSendForReview,
  isSendingForReview,
  onSubmit,
  quota,
  allComments,
  currentUserId,
  currentUserName,
  currentUserEmail,
}) => {
  const { state, dispatch } = useDeliverables();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { revisionFeedback } = state;
  const minCharacters = 20;
  const isFinalDelivered = deliverable.status === 'final_delivered';
  const isBetaReady = deliverable.status === 'beta_ready';

  // Notes validation: empty is valid, if user types require 20+ chars
  const isNotesValid = revisionFeedback.text.length === 0 || revisionFeedback.text.length >= minCharacters;

  const handleSubmitClick = () => {
    if (!isNotesValid) return;
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = () => {
    const approval: DeliverableApproval = {
      id: `appr-${Date.now()}`,
      deliverableId: deliverable.id,
      action: 'rejected',
      timestamp: new Date(),
      userId: currentUserId,
      userName: currentUserName,
      userEmail: currentUserEmail,
      feedback: revisionFeedback.text,
      timestampedComments: allComments,
      issueCategories: revisionFeedback.issueCategories,
      attachments: revisionFeedback.attachments,
    };

    setTimeout(() => {
      onSubmit(approval);
      setShowConfirmation(false);
    }, 500);
  };

  // --- FINAL DELIVERED: Download button ---
  if (isFinalDelivered) {
    return (
      <div className="space-y-3">
        {canAccessFinal ? (
          <Button
            variant="gradient"
            size="lg"
            className="w-full gap-2"
            onClick={() => window.open(deliverable.finalFileUrl, '_blank')}
          >
            <Download className="h-5 w-5" />
            Download Final Files
          </Button>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Access Restricted</p>
                <p>{getDeniedReason('access_final')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- CLIENT PM: Approve / Request Revision ---
  if (canApprove || canReject) {
    return (
      <>
        <div className="space-y-4">
          {!isRevisionMode ? (
            <>
              {/* Action Buttons */}
              <div className="flex gap-3">
                {canApprove && (
                  <Button
                    variant="default"
                    size="lg"
                    className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={onApprove}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Approve Deliverable
                  </Button>
                )}
                {canReject && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 gap-2 border-2 border-amber-600 text-amber-700 hover:bg-amber-50"
                    onClick={onRequestRevision}
                  >
                    <XCircle className="h-5 w-5" />
                    Request Revision
                  </Button>
                )}
              </div>

              {/* Commenting Hint */}
              {canReject && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  You can add timestamped comments when requesting a revision
                </p>
              )}
            </>
          ) : (
            <>
              {/* Revision Mode Header */}
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800">Requesting Revision</span>
                </div>
                <button
                  onClick={onCancelRevision}
                  className="text-xs text-amber-700 hover:text-amber-900 flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </div>

              {/* Notes (optional) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Notes <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </label>
                <Textarea
                  value={revisionFeedback.text}
                  onChange={(e) => dispatch({ type: 'UPDATE_FEEDBACK_TEXT', text: e.target.value })}
                  placeholder="Add any additional context or notes..."
                  className="min-h-[80px]"
                />
                {revisionFeedback.text.length > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className={isNotesValid ? 'text-emerald-600' : 'text-muted-foreground'}>
                      {isNotesValid ? '' : `Minimum ${minCharacters} characters`}
                    </span>
                    <span className="text-muted-foreground font-mono">
                      {revisionFeedback.text.length} chars
                    </span>
                  </div>
                )}
              </div>

              {/* File Attachments */}
              <FileUploadZone
                attachments={revisionFeedback.attachments}
                onAddAttachment={(file) => dispatch({ type: 'ADD_ATTACHMENT', file })}
                onRemoveAttachment={(fileId) => dispatch({ type: 'REMOVE_ATTACHMENT', fileId })}
              />

              {/* Quota Warning + Submit */}
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle
                    className={`h-4 w-4 shrink-0 ${
                      quota.remaining === 0 ? 'text-red-500' : 'text-amber-500'
                    }`}
                  />
                  <span>
                    {quota.remaining === 0
                      ? 'No revisions remaining'
                      : `${quota.remaining} revision${quota.remaining !== 1 ? 's' : ''} remaining`}
                  </span>
                </div>

                <Button
                  variant="default"
                  onClick={handleSubmitClick}
                  disabled={!isNotesValid || quota.remaining === 0}
                  className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                  size="lg"
                >
                  <Send className="h-4 w-4" />
                  Submit Revision Request
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Confirmation Dialog */}
        <RevisionSubmitConfirmation
          isOpen={showConfirmation}
          quota={quota}
          commentCount={allComments.length}
          feedbackLength={revisionFeedback.text.length}
          attachmentCount={revisionFeedback.attachments.length}
          onCancel={() => setShowConfirmation(false)}
          onConfirm={handleConfirmSubmit}
        />
      </>
    );
  }

  // --- BETA READY: Pending review for client PM ---
  if (isBetaReady && isClientPM) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Pending Review</p>
            <p>This deliverable is being prepared for your review. You'll be notified when it's ready for approval.</p>
          </div>
        </div>
      </div>
    );
  }

  // --- TEAM MEMBER: Info box ---
  if (!isClientPM) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Team Member View</p>
            <p>You can add timeline comments. Only the Primary Contact can approve or submit revision requests.</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
