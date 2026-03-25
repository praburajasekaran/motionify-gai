/**
 * DeliverableMetadataSidebar Component
 *
 * Metadata-only sidebar for deliverable review page.
 * Action buttons (Approve/Request Revision) have moved to the accordion
 * via DeliverableReviewActions for a linear review flow.
 *
 * Features:
 * - Deliverable details (type, due date, timestamps)
 * - Revision quota display
 * - "Send for Client Review" (admin-only action)
 * - Beta version notice
 * - Next steps information
 */

import React from 'react';
import {
  Calendar,
  AlertCircle,
  FileVideo,
  FileImage,
  FileText,
  Send,
  Loader2,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Button, Separator } from '../ui/design-system';
import { Deliverable } from '../../types/deliverable.types';
import { formatTimestamp, formatDateTime } from '../../utils/dateFormatting';
import { Project } from '@/types';
import { useDeliverablePermissions } from '@/hooks/useDeliverablePermissions';

export interface DeliverableMetadataSidebarProps {
  deliverable: Deliverable;
  project: Project;
  onSendForReview?: () => void;
  isSendingForReview?: boolean;
}

export const DeliverableMetadataSidebar: React.FC<DeliverableMetadataSidebarProps> = ({
  deliverable,
  project,
  onSendForReview,
  isSendingForReview,
}) => {
  const permissions = useDeliverablePermissions({
    deliverable,
    project,
  });

  const isFinalDelivered = deliverable.status === 'final_delivered';
  const canSendForReview = permissions.canSendForReview;

  return (
    <div className="space-y-6">
      {/* Deliverable Details */}
      <div className="bg-muted border border-border rounded-lg p-4 space-y-4">
        <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
          Deliverable Details
        </h3>

        <Separator />

        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Type</p>
            {deliverable.type ? (
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                {deliverable.type === 'Video' && <FileVideo className="h-4 w-4 text-muted-foreground" />}
                {deliverable.type === 'Image' && <FileImage className="h-4 w-4 text-muted-foreground" />}
                {deliverable.type === 'Document' && <FileText className="h-4 w-4 text-muted-foreground" />}
                {deliverable.type}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No files yet</p>
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Due Date</p>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Calendar className="h-4 w-4" />
              {new Date(deliverable.dueDate).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>

          {isFinalDelivered && deliverable.expiresAt && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Download Expiry</p>
              <p className="text-sm font-semibold text-amber-700">
                {new Date(deliverable.expiresAt).toLocaleDateString()}
                <span className="text-xs text-muted-foreground ml-2">
                  (
                  {Math.ceil(
                    (new Date(deliverable.expiresAt).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24)
                  )}{' '}
                  days remaining)
                </span>
              </p>
            </div>
          )}

          <Separator />

          {/* Revision Quota */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Revisions</p>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              {project.maxRevisions - project.revisionCount} of {project.maxRevisions} remaining
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          {deliverable.createdAt && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created</p>
              <p className="text-sm font-semibold text-foreground" title={formatDateTime(deliverable.createdAt) || undefined}>
                {formatTimestamp(deliverable.createdAt)}
              </p>
            </div>
          )}
          {deliverable.updatedAt && deliverable.updatedAt !== deliverable.createdAt && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Updated</p>
              <p className="text-sm font-semibold text-foreground" title={formatDateTime(deliverable.updatedAt) || undefined}>
                {formatTimestamp(deliverable.updatedAt)}
              </p>
            </div>
          )}
          {deliverable.approvalHistory.length > 0 && deliverable.approvalHistory[deliverable.approvalHistory.length - 1].action === 'approved' && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Approved</p>
              <p className="text-sm font-semibold text-emerald-700" title={formatDateTime(deliverable.approvalHistory[deliverable.approvalHistory.length - 1].timestamp) || undefined}>
                {formatTimestamp(deliverable.approvalHistory[deliverable.approvalHistory.length - 1].timestamp)}
              </p>
            </div>
          )}
          {isFinalDelivered && deliverable.finalDeliveredAt && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Delivered</p>
              <p className="text-sm font-semibold text-emerald-700" title={formatDateTime(deliverable.finalDeliveredAt) || undefined}>
                {formatTimestamp(deliverable.finalDeliveredAt)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Admin-only: Send for Client Review */}
      {canSendForReview && (
        <Button
          variant="default"
          size="lg"
          className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={onSendForReview}
          disabled={isSendingForReview}
        >
          {isSendingForReview ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          {isSendingForReview ? 'Sending...' : 'Send for Client Review'}
        </Button>
      )}

      {/* Beta Version Notice */}
      {deliverable.watermarked && !isFinalDelivered && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          <p className="font-semibold mb-1">Beta Version Notice</p>
          <p>
            This is a watermarked preview. Final version will be delivered
            after approval and payment.
          </p>
        </div>
      )}

      {/* Next Steps */}
      {permissions.canApprove && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <h4 className="font-bold text-sm text-blue-900">Next Steps</h4>
          <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
            <li>Watch the deliverable video</li>
            <li>Approve or request changes below the video</li>
            <li>After approval, payment link will be sent</li>
            <li>Final files delivered within 24 hours of payment</li>
          </ol>
        </div>
      )}
    </div>
  );
};
