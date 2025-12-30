/**
 * RevisionSubmitConfirmation Component
 *
 * Confirmation modal shown before submitting a revision request.
 * Displays revision quota, summary of feedback, and allows cancellation.
 *
 * Features:
 * - Shows remaining revision quota
 * - Warning about revision consumption
 * - Summary of timeline comments, text feedback, and attachments
 * - Cancel button to wait for more team input
 * - Submit button to proceed with revision request
 */

import React from 'react';
import { AlertCircle, MessageSquare, FileText, Paperclip } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button, Badge } from '../ui/design-system';
import { RevisionQuota } from '../../types/deliverable.types';

export interface RevisionSubmitConfirmationProps {
  isOpen: boolean;
  quota: RevisionQuota;
  commentCount: number;
  feedbackLength: number;
  attachmentCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export const RevisionSubmitConfirmation: React.FC<RevisionSubmitConfirmationProps> = ({
  isOpen,
  quota,
  commentCount,
  feedbackLength,
  attachmentCount,
  onCancel,
  onConfirm,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="md"
      showCloseButton={false}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <AlertCircle className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-zinc-900 mb-1">
              Confirm Revision Request
            </h3>
            <p className="text-sm text-zinc-600">
              Please review your submission before proceeding
            </p>
          </div>
        </div>

        {/* Revision Quota Warning */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-amber-900">
              Revision Quota
            </p>
            <Badge variant="warning">
              {quota.remaining} of {quota.total} remaining
            </Badge>
          </div>
          <p className="text-xs text-amber-800">
            Submitting this revision request will consume 1 revision from your quota.
          </p>
        </div>

        {/* Feedback Summary */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-zinc-700">
            What's being submitted:
          </h4>

          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 space-y-3">
            {/* Timeline Comments */}
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-zinc-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-900">
                  Timeline Comments
                </p>
                <p className="text-xs text-zinc-500">
                  {commentCount} {commentCount === 1 ? 'comment' : 'comments'} on video
                </p>
              </div>
              <span className="text-lg font-bold text-zinc-700">
                {commentCount}
              </span>
            </div>

            {/* Text Feedback */}
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-zinc-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-900">
                  Text Feedback
                </p>
                <p className="text-xs text-zinc-500">
                  {feedbackLength} characters of written feedback
                </p>
              </div>
              <span className="text-lg font-bold text-zinc-700">
                {feedbackLength}
              </span>
            </div>

            {/* Attachments */}
            {attachmentCount > 0 && (
              <div className="flex items-center gap-3">
                <Paperclip className="h-5 w-5 text-zinc-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-900">
                    Attachments
                  </p>
                  <p className="text-xs text-zinc-500">
                    Reference {attachmentCount === 1 ? 'file' : 'files'}
                  </p>
                </div>
                <span className="text-lg font-bold text-zinc-700">
                  {attachmentCount}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            size="lg"
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
            onClick={onConfirm}
          >
            Submit Revision Request
          </Button>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-zinc-500 text-center">
          You can cancel now to wait for more team feedback before submitting.
        </p>
      </div>
    </Modal>
  );
};
