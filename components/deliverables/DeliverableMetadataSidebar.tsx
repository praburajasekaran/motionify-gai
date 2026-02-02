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
} from 'lucide-react';
import { Button, Badge, Separator, Progress } from '../ui/design-system';
import { Deliverable } from '../../types/deliverable.types';
import { Project } from '@/types';
import { useDeliverablePermissions } from '@/hooks/useDeliverablePermissions';

export interface DeliverableMetadataSidebarProps {
  deliverable: Deliverable;
  project: Project;
  onApprove: () => void;
  onRequestRevision: () => void;
}

export const DeliverableMetadataSidebar: React.FC<DeliverableMetadataSidebarProps> = ({
  deliverable,
  project,
  onApprove,
  onRequestRevision,
}) => {
  const permissions = useDeliverablePermissions({
    deliverable,
    project,
  });

  const isFinalDelivered = deliverable.status === 'final_delivered';
  const canApprove = permissions.canApprove;
  const canReject = permissions.canReject;
  const canAccessFinal = permissions.canAccessFinal;

  return (
    <div className="space-y-6">
      {/* Deliverable Details */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-4">
        <h3 className="font-bold text-sm text-zinc-700 uppercase tracking-wider">
          Deliverable Details
        </h3>

        <Separator />

        <div className="space-y-3">
          <div>
            <p className="text-xs text-zinc-500 mb-1">Type</p>
            {deliverable.type ? (
              <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                {deliverable.type === 'Video' && <FileVideo className="h-4 w-4 text-zinc-500" />}
                {deliverable.type === 'Image' && <FileImage className="h-4 w-4 text-zinc-500" />}
                {deliverable.type === 'Document' && <FileText className="h-4 w-4 text-zinc-500" />}
                {deliverable.type}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">No files yet</p>
            )}
          </div>

          <div>
            <p className="text-xs text-zinc-500 mb-1">Due Date</p>
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Calendar className="h-4 w-4" />
              {new Date(deliverable.dueDate).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>

          <div>
            <p className="text-xs text-zinc-500 mb-1">Progress</p>
            <div className="flex items-center gap-2">
              <Progress
                value={deliverable.progress}
                className="flex-1"
                indicatorClassName={
                  deliverable.progress === 0 ? 'bg-zinc-300'
                  : deliverable.progress < 60 ? 'bg-blue-500'
                  : deliverable.progress < 85 ? 'bg-amber-500'
                  : 'bg-emerald-500'
                }
              />
              <span className="text-xs font-semibold text-zinc-700 tabular-nums w-8 text-right">
                {deliverable.progress}%
              </span>
            </div>
          </div>

          {isFinalDelivered && deliverable.expiresAt && (
            <div>
              <p className="text-xs text-zinc-500 mb-1">Download Expiry</p>
              <p className="text-sm font-semibold text-amber-700">
                {new Date(deliverable.expiresAt).toLocaleDateString()}
                <span className="text-xs text-zinc-500 ml-2">
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
                className="w-full gap-2 shadow-lg"
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
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
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
