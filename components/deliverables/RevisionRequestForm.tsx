/**
 * RevisionRequestForm Component
 *
 * Comprehensive feedback form for requesting revisions.
 * Includes all feedback methods: text, timestamped comments, categories, priority, attachments.
 * Features real-time validation and feedback summary sidebar.
 */

import React, { useState } from 'react';
import { AlertTriangle, Send } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button, Textarea } from '../ui/design-system';
import { VideoCommentTimeline, VideoCommentTimelineHandle } from './VideoCommentTimeline';
import { PrioritySelector } from './PrioritySelector';
import { FileUploadZone } from './FileUploadZone';
import { useDeliverables } from './DeliverableContext';
import { Deliverable, DeliverableApproval } from '../../types/deliverable.types';

export interface RevisionRequestFormProps {
  deliverable: Deliverable | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (approval: DeliverableApproval) => void;
  quota: { remaining: number };
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
}

export const RevisionRequestForm: React.FC<RevisionRequestFormProps> = ({
  deliverable,
  isOpen,
  onClose,
  onSubmit,
  quota,
  currentUserId,
  currentUserName,
  currentUserEmail,
}) => {
  const { state, dispatch } = useDeliverables();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const timelineRef = React.useRef<VideoCommentTimelineHandle>(null);

  if (!deliverable) return null;

  const { revisionFeedback } = state;
  const minCharacters = 20;

  // Validation
  const isTextValid = revisionFeedback.text.length >= minCharacters;
  // Categories are now optional/inferred, so we don't validate them
  const isFormValid = isTextValid;

  const handleSubmit = () => {
    if (!isFormValid) return;

    const approval: DeliverableApproval = {
      id: `appr-${Date.now()}`,
      deliverableId: deliverable.id,
      action: 'rejected',
      timestamp: new Date(),
      userId: currentUserId,
      userName: currentUserName,
      userEmail: currentUserEmail,
      feedback: revisionFeedback.text,
      timestampedComments: revisionFeedback.timestampedComments,
      issueCategories: revisionFeedback.issueCategories, // Will be empty or inferred
      priority: revisionFeedback.priority,
      attachments: revisionFeedback.attachments,
    };

    // Simulate API delay
    setTimeout(() => {
      onSubmit(approval);
      setShowConfirmation(false);
    }, 500);
  };

  const handleClose = () => {
    dispatch({ type: 'RESET_REVISION_FORM' });
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size="custom"
        showCloseButton={true}
        className="max-w-3xl max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-zinc-200">
          <h2 className="text-xl font-bold text-zinc-900">
            Request Revision: {deliverable.title}
          </h2>
          <p className="text-sm text-zinc-600 mt-1">
            Provide feedback for the team. Issue categories will be automatically detected.
          </p>
        </div>

        <div className="p-6 max-h-[calc(90vh-180px)] overflow-y-auto space-y-6">
          {/* Video Timeline Comments */}
          {deliverable.betaFileUrl && deliverable.type === 'Video' && (
            <VideoCommentTimeline
              ref={timelineRef}
              videoUrl={deliverable.betaFileUrl}
              comments={revisionFeedback.timestampedComments}
              onAddComment={(timestamp, comment) =>
                dispatch({
                  type: 'ADD_TIMESTAMP_COMMENT',
                  timestamp,
                  comment,
                })
              }
              onRemoveComment={(commentId) =>
                dispatch({ type: 'REMOVE_TIMESTAMP_COMMENT', commentId })
              }
              onUpdateComment={(commentId, newText) =>
                dispatch({
                  type: 'UPDATE_TIMESTAMP_COMMENT',
                  commentId,
                  newText,
                })
              }
              onSeekToComment={(timestamp) => {
                // Optional: Analytics or other side effects when seeking
                console.log('Seeking to comment at:', timestamp);
              }}
            />
          )}

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
              placeholder="Describe the changes needed..."
              className="min-h-[120px]"
            />
            <div className="flex items-center justify-between text-xs">
              <span
                className={
                  isTextValid ? 'text-emerald-600' : 'text-zinc-500'
                }
              >
                {isTextValid ? '✓ Meets minimum length' : `Minimum ${minCharacters} characters`}
              </span>
              <span className="text-zinc-500 font-mono">
                {revisionFeedback.text.length} chars
              </span>
            </div>
          </div>

          {/* Priority Level - Horizontal Layout */}
          <PrioritySelector
            selectedPriority={revisionFeedback.priority}
            onSelectPriority={(priority) =>
              dispatch({ type: 'SET_PRIORITY', priority })
            }
            layout="horizontal"
          />

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
        </div>

        {/* Footer with Quota Warning and Submit */}
        <div className="border-t border-zinc-200 px-6 py-4 bg-zinc-50 flex items-center justify-between gap-4">
          {/* Simplified Quota Warning */}
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <AlertTriangle
              className={`h-4 w-4 ${quota.remaining === 0 ? 'text-red-500' : 'text-amber-500'}`}
            />
            <span>
              {quota.remaining === 0
                ? 'No revisions remaining'
                : `${quota.remaining} revision${quota.remaining !== 1 ? 's' : ''} remaining`}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => setShowConfirmation(true)}
              disabled={!isFormValid || quota.remaining === 0}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Send className="h-4 w-4" />
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <Modal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          size="sm"
          showCloseButton={false}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">
                Confirm Revision Request
              </h3>
            </div>

            <p className="text-sm text-zinc-600">
              You're about to submit a revision request for "{deliverable.title}".
              This will consume <strong>1 revision</strong> from your project quota.
            </p>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                className="flex-1"
              >
                Go Back
              </Button>
              <Button
                variant="default"
                onClick={handleSubmit}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              >
                Confirm & Submit
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
