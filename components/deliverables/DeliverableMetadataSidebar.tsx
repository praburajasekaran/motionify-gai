/**
 * DeliverableMetadataSidebar Component
 *
 * Sidebar section for deliverable review page showing metadata and actions.
 *
 * Features:
 * - Deliverable details (type, due date, progress)
 * - Permission-aware action buttons (Approve/Request Revision/Download)
 * - Beta version notices and next steps information
 */

import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Calendar,
  Download,
  AlertCircle,
  FileVideo,
  FileImage,
  FileText,
  Send,
  Loader2,
  Clock,
} from 'lucide-react';
import { Button, Badge, Separator } from '../ui/design-system';
import { Deliverable } from '../../types/deliverable.types';
import { formatTimestamp, formatDateTime } from '../../utils/dateFormatting';
import { Project } from '@/types';
import { useDeliverablePermissions } from '@/hooks/useDeliverablePermissions';

export interface DeliverableMetadataSidebarProps {
  deliverable: Deliverable;
  project: Project;
  onApprove: () => void;
  onRequestRevision: () => void;
  onSendForReview?: () => void;
  isSendingForReview?: boolean;
}

export const DeliverableMetadataSidebar: React.FC<DeliverableMetadataSidebarProps> = ({
  deliverable,
  project,
  onApprove,
  onRequestRevision,
  onSendForReview,
  isSendingForReview,
}) => {
  const permissions = useDeliverablePermissions({
    deliverable,
    project,
  });

  const isFinalDelivered = deliverable.status === 'final_delivered';
  const isBetaReady = deliverable.status === 'beta_ready';
  const canApprove = permissions.canApprove;
  const canReject = permissions.canReject;
  const canAccessFinal = permissions.canAccessFinal;
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

      {/* Action Buttons */}
      <div className="space-y-3">
        {isFinalDelivered ? (
          <>
            {canAccessFinal ? (
              <Button
                variant="gradient"
                size="lg"
                className="w-full gap-2 "
                onClick={() => {
                  // In a real app, this would trigger download
                  window.open(deliverable.finalFileUrl, '_blank');
                }}
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
                    <p>{permissions.getDeniedReason('access_final')}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : canApprove || canReject ? (
          <>
            {canApprove && (
              <Button
                variant="default"
                size="lg"
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white "
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
                className="w-full gap-2 border-2 border-amber-600 text-amber-700 hover:bg-amber-50"
                onClick={onRequestRevision}
              >
                <XCircle className="h-5 w-5" />
                Request Revision
              </Button>
            )}
          </>
        ) : canSendForReview ? (
          <Button
            variant="default"
            size="lg"
            className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white "
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
        ) : isBetaReady && permissions.isClientPM ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Pending Review</p>
                <p>This deliverable is being prepared for your review. You'll be notified when it's ready for approval.</p>
              </div>
            </div>
          </div>
        ) : !permissions.isClientPM ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Team Member View</p>
                <p>You can add timeline comments. Only the Primary Contact can approve or submit revision requests.</p>
              </div>
            </div>
          </div>
        ) : null}

        {deliverable.watermarked && !isFinalDelivered && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <p className="font-semibold mb-1">Beta Version Notice</p>
            <p>
              This is a watermarked preview. Final version will be delivered
              after approval and payment.
            </p>
          </div>
        )}
      </div>

      {/* Next Steps */}
      {canApprove && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <h4 className="font-bold text-sm text-blue-900">Next Steps</h4>
          <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
            <li>Review the deliverable carefully</li>
            <li>
              Click "Approve" if satisfied, or "Request Revision" for changes
            </li>
            <li>After approval, payment link will be sent</li>
            <li>Final files delivered within 24 hours of payment</li>
          </ol>
        </div>
      )}
    </div>
  );
};
