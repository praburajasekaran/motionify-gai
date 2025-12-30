/**
 * InlineFeedbackForm Component
 *
 * Inline feedback form for requesting revisions (no modal wrapper).
 * Includes text feedback and file attachments.
 * Video commenting is handled separately on the main page.
 *
 * Features:
 * - Text feedback (20 char minimum)
 * - File attachment upload
 * - Submission confirmation with quota warning
 * - Shows summary of all team comments
 */

import React, { useState } from 'react';
import { AlertTriangle, Send } from 'lucide-react';
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

export interface InlineFeedbackFormProps {
  deliverable: Deliverable;
  onSubmit: (approval: DeliverableApproval) => void;
  quota: RevisionQuota;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
  allComments: TimestampedComment[]; // All team comments (from context state)
}

export const InlineFeedbackForm: React.FC<InlineFeedbackFormProps> = ({
  deliverable,
  onSubmit,
  quota,
  currentUserId,
  currentUserName,
  currentUserEmail,
  allComments,
}) => {
  const { state, dispatch } = useDeliverables();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { revisionFeedback } = state;
  const minCharacters = 20;

  // Validation
  const isTextValid = revisionFeedback.text.length >= minCharacters;
  const isFormValid = isTextValid;

  const handleSubmitClick = () => {
    if (!isFormValid) return;
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
      timestampedComments: allComments, // Include all team comments
      issueCategories: revisionFeedback.issueCategories,
      attachments: revisionFeedback.attachments,
    };

    // Simulate API delay
    setTimeout(() => {
      onSubmit(approval);
      setShowConfirmation(false);
    }, 500);
  };

  return (
    <>
      <div className="space-y-6 bg-white border border-zinc-200 rounded-lg p-6">
        {/* Form Header */}
        <div className="border-b border-zinc-200 pb-4">
          <h3 className="text-lg font-bold text-zinc-900">
            Revision Request Feedback
          </h3>
          <p className="text-sm text-zinc-600 mt-1">
            Provide detailed feedback for the changes you need. Timeline comments from all
            team members will be included.
          </p>
        </div>

        {/* General Text Feedback */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-zinc-700">
            Describe the changes needed <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={revisionFeedback.text}
            onChange={(e) =>
              dispatch({ type: 'UPDATE_FEEDBACK_TEXT', text: e.target.value })
            }
            placeholder="Describe the changes needed in detail..."
            className="min-h-[120px]"
          />
          <div className="flex items-center justify-between text-xs">
            <span
              className={
                isTextValid ? 'text-emerald-600' : 'text-zinc-500'
              }
            >
              {isTextValid
                ? '✓ Meets minimum length'
                : `Minimum ${minCharacters} characters`}
            </span>
            <span className="text-zinc-500 font-mono">
              {revisionFeedback.text.length} chars
            </span>
          </div>
        </div>

        {/* File Attachments */}
        <FileUploadZone
          attachments={revisionFeedback.attachments}
          onAddAttachment={(file) =>
            dispatch({ type: 'ADD_ATTACHMENT', file })
          }
          onRemoveAttachment={(fileId) =>
            dispatch({ type: 'REMOVE_ATTACHMENT', fileId })
          }
        />

        {/* Footer with Quota Warning and Submit */}
        <div className="border-t border-zinc-200 pt-4 flex items-center justify-between gap-4">
          {/* Quota Warning */}
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <AlertTriangle
              className={`h-4 w-4 ${
                quota.remaining === 0 ? 'text-red-500' : 'text-amber-500'
              }`}
            />
            <span>
              {quota.remaining === 0
                ? 'No revisions remaining'
                : `${quota.remaining} revision${quota.remaining !== 1 ? 's' : ''} remaining`}
            </span>
          </div>

          {/* Submit Button */}
          <Button
            variant="default"
            onClick={handleSubmitClick}
            disabled={!isFormValid || quota.remaining === 0}
            className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            size="lg"
          >
            <Send className="h-4 w-4" />
            Submit Revision Request
          </Button>
        </div>
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
};
