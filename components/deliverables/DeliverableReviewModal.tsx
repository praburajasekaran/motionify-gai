/**
 * DeliverableReviewModal Component
 *
 * Full-screen modal for reviewing beta deliverables.
 * Features:
 * - Video player with watermark overlay
 * - Deliverable metadata sidebar
 * - Approve/Reject action buttons
 * - Approval timeline showing history
 */

import React from 'react';
import {
  CheckCircle2,
  XCircle,
  FileVideo,
  Calendar,
  Download,
  Clock,
  Maximize2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { VideoPlayer } from '../ui/VideoPlayer';
import { Button, Badge, Separator } from '../ui/design-system';
import { ApprovalTimeline } from './ApprovalTimeline';
import { Deliverable } from '../../types/deliverable.types';

export interface DeliverableReviewModalProps {
  deliverable: Deliverable | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onRequestRevision: () => void;
  onConvertToTask?: (commentId: string, taskTitle: string, assigneeId: string) => void;
}

export const DeliverableReviewModal: React.FC<DeliverableReviewModalProps> = ({
  deliverable,
  isOpen,
  onClose,
  onApprove,
  onRequestRevision,
  onConvertToTask,
}) => {
  if (!deliverable) return null;

  const isFinalDelivered = deliverable.status === 'final_delivered';
  const canApprove =
    deliverable.status === 'beta_ready' || deliverable.status === 'awaiting_approval';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      showCloseButton={true}
      className="max-w-[95vw] max-h-[95vh] flex flex-col"
    >
      {/* Modal Header */}
      <div className="px-6 py-4 border-b border-zinc-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">
              {deliverable.title}
            </h2>
            <p className="text-sm text-zinc-600">{deliverable.description}</p>
          </div>
          <Badge
            variant={
              deliverable.status === 'final_delivered'
                ? 'success'
                : deliverable.watermarked
                  ? 'warning'
                  : 'info'
            }
            className="shrink-0"
          >
            {deliverable.watermarked ? 'BETA VERSION' : 'FINAL VERSION'}
          </Badge>
        </div>
      </div>

      {/* Modal Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Left Column - Video Player (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            {deliverable.betaFileUrl && deliverable.type === 'Video' ? (
              <VideoPlayer
                src={isFinalDelivered ? deliverable.finalFileUrl || deliverable.betaFileUrl : deliverable.betaFileUrl}
                watermarked={deliverable.watermarked && !isFinalDelivered}
                className="w-full aspect-video"
                comments={deliverable.approvalHistory.flatMap((a) => a.timestampedComments || [])}
                onConvertToTask={onConvertToTask}
              />
            ) : (
              <div className="w-full aspect-video bg-zinc-100 rounded-lg flex items-center justify-center">
                <FileVideo className="h-16 w-16 text-zinc-400" />
              </div>
            )}

            {/* Video Metadata */}
            <div className="grid grid-cols-3 gap-4">
              {deliverable.duration && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-zinc-500 mb-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">
                      Duration
                    </span>
                  </div>
                  <p className="text-lg font-bold text-zinc-900">
                    {deliverable.duration}
                  </p>
                </div>
              )}
              {deliverable.format && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-zinc-500 mb-2">
                    <FileVideo className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">
                      Format
                    </span>
                  </div>
                  <p className="text-lg font-bold text-zinc-900">
                    {deliverable.format}
                  </p>
                </div>
              )}
              {deliverable.resolution && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-zinc-500 mb-2">
                    <Maximize2 className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">
                      Resolution
                    </span>
                  </div>
                  <p className="text-lg font-bold text-zinc-900 font-mono">
                    {deliverable.resolution}
                  </p>
                </div>
              )}
            </div>

            {/* Approval Timeline */}
            {deliverable.approvalHistory.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-zinc-900">
                  Review History
                </h3>
                <ApprovalTimeline approvalHistory={deliverable.approvalHistory} />
              </div>
            )}
          </div>

          {/* Right Column - Sidebar Info & Actions (1/3 width on desktop) */}
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
                  <p className="text-sm font-semibold text-zinc-900">
                    {deliverable.type}
                  </p>
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
                  <p className="text-sm font-semibold text-zinc-900">
                    {deliverable.progress}% Complete
                  </p>
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
              ) : canApprove ? (
                <>
                  <Button
                    variant="default"
                    size="lg"
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                    onClick={onApprove}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Approve Deliverable
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full gap-2 border-2 border-amber-600 text-amber-700 hover:bg-amber-50"
                    onClick={onRequestRevision}
                  >
                    <XCircle className="h-5 w-5" />
                    Request Revision
                  </Button>
                </>
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
        </div>
      </div>
    </Modal>
  );
};
