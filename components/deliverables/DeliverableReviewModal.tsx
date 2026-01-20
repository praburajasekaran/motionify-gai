/**
 * DeliverableReviewModal Component
 *
 * Full-screen modal for reviewing beta deliverables.
 * Features:
 * - Video player with watermark overlay
 * - Deliverable metadata sidebar
 * - Approve/Reject action buttons (permission-aware)
 * - Approval timeline showing history
 *
 * PERMISSION ENFORCEMENT:
 * - Approve/Reject buttons only shown to users with permission
 * - Download button only shown when user can access final files
 * - Tooltips explain why actions are disabled
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
  AlertCircle,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { VideoPlayer } from '../ui/VideoPlayer';
import { Button, Badge, Separator } from '../ui/design-system';
import { ApprovalTimeline } from './ApprovalTimeline';
import { Deliverable } from '../../types/deliverable.types';
import { AdditionalRevisionRequest } from '../../types/deliverable.types';
import { Project } from '@/types';
import { useDeliverablePermissions } from '@/hooks/useDeliverablePermissions';
import { storageService } from '../../services/storage';
import { AdditionalRevisionRequestModal } from './AdditionalRevisionRequestModal';

export interface DeliverableReviewModalProps {
  deliverable: Deliverable | null;
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onRequestRevision: () => void;
  onConvertToTask?: (commentId: string, taskTitle: string, assigneeId: string) => void;
  quota?: { total: number; used: number; remaining: number }; // Revision quota for enforcement
  // Additional revisions (TC-DA-005)
  onRequestAdditionalRevisions?: (data: { reason: string; requestedCount: number }) => void;
  hasPendingAdditionalRequest?: boolean;
  currentUserId?: string;
  currentUserName?: string;
}

export const DeliverableReviewModal: React.FC<DeliverableReviewModalProps> = ({
  deliverable,
  project,
  isOpen,
  onClose,
  onApprove,
  onRequestRevision,
  onConvertToTask,
  quota,
  onRequestAdditionalRevisions,
  hasPendingAdditionalRequest = false,
  currentUserId,
  currentUserName = 'Client',
}) => {
  const permissions = useDeliverablePermissions({
    deliverable: deliverable || undefined,
    project,
  });

  if (!deliverable) return null;

  const isFinalDelivered = deliverable.status === 'final_delivered';
  const canApprove = permissions.canApprove;
  const canReject = permissions.canReject;
  const canAccessFinal = permissions.canAccessFinal;

  const [resolvedUrl, setResolvedUrl] = React.useState<string | undefined>(undefined);
  const [showAdditionalRevisionsModal, setShowAdditionalRevisionsModal] = React.useState(false);

  React.useEffect(() => {
    const resolveUrl = async () => {
      if (!deliverable) return;

      let url = '';
      const key = isFinalDelivered ? deliverable.finalFileKey : deliverable.betaFileKey;
      const legacyUrl = isFinalDelivered ? deliverable.finalFileUrl : deliverable.betaFileUrl;

      // Fallback for beta if final not ready (though logic above suggests final)
      // Reviewing code logic in render: src={isFinalDelivered ? final || beta : beta}

      if (key) {
        url = await storageService.getDownloadUrl(key);
      } else if (legacyUrl) {
        url = legacyUrl;
      } else if (isFinalDelivered && deliverable.betaFileKey) {
        // Fallback to beta if final key missing but logic says use final||beta
        url = await storageService.getDownloadUrl(deliverable.betaFileKey);
      } else if (isFinalDelivered && deliverable.betaFileUrl) {
        url = deliverable.betaFileUrl;
      }

      setResolvedUrl(url);
    };
    resolveUrl();
  }, [deliverable, isFinalDelivered]);

  return (
    <>
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
              {(resolvedUrl || deliverable.betaFileUrl) && deliverable.type === 'Video' ? (
                <VideoPlayer
                  src={resolvedUrl || (isFinalDelivered ? deliverable.finalFileUrl || deliverable.betaFileUrl : deliverable.betaFileUrl) || ''}
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
                  <>
                    {canAccessFinal ? (
                      <Button
                        variant="gradient"
                        size="lg"
                        className="w-full gap-2 shadow-lg"
                        onClick={() => {
                          if (resolvedUrl) {
                            window.open(resolvedUrl, '_blank');
                          } else {
                            window.open(deliverable.finalFileUrl, '_blank');
                          }
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
                      <>
                        {/* Quota Exhausted Warning */}
                        {quota && quota.remaining === 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-semibold mb-1">Revision Quota Exhausted</p>
                                <p>All {quota.total} included revisions have been used. Request additional revisions to continue.</p>
                              </div>
                            </div>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="lg"
                          className={`w-full gap-2 border-2 ${quota && quota.remaining === 0
                            ? 'border-zinc-300 text-zinc-400 cursor-not-allowed opacity-60'
                            : 'border-amber-600 text-amber-700 hover:bg-amber-50'
                            }`}
                          onClick={onRequestRevision}
                          disabled={quota && quota.remaining === 0}
                          title={quota && quota.remaining === 0 ? 'Revision quota exhausted' : undefined}
                        >
                          <XCircle className="h-5 w-5" />
                          Request Revision
                          {quota && quota.remaining > 0 && (
                            <span className="ml-1 text-xs opacity-75">({quota.remaining} left)</span>
                          )}
                        </Button>
                        {/* Request Additional Revisions Option */}
                        {quota && quota.remaining === 0 && (
                          <Button
                            variant="outline"
                            size="lg"
                            className="w-full gap-2 border-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                            onClick={() => {
                              // For now, show an alert. In production, this would open a form or redirect
                              alert('Additional revision requests will be available soon. Please contact your account manager at support@motionify.studio');
                            }}
                          >
                            <Plus className="h-5 w-5" />
                            Request Additional Revisions
                          </Button>
                        )}
                      </>
                    )}
                  </>
                ) : !permissions.isClientPM ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold mb-1">View Only</p>
                        <p>Only the Primary Contact can approve or request revisions.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Client PM logic when actions disabled (e.g. Terms not accepted) */
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold mb-1">Action Required</p>
                        <p>{permissions.getDeniedReason('approve') || permissions.getDeniedReason('reject')}</p>
                      </div>
                    </div>
                  </div>
                )}

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

      {/* Additional Revisions Request Modal (TC-DA-005) */}
      <AdditionalRevisionRequestModal
        isOpen={showAdditionalRevisionsModal}
        onClose={() => setShowAdditionalRevisionsModal(false)}
        onSubmit={(data) => {
          if (onRequestAdditionalRevisions) {
            onRequestAdditionalRevisions(data);
          }
          setShowAdditionalRevisionsModal(false);
        }}
        projectId={project.id}
        projectName={project.title}
        quota={quota ? { total: quota.total, used: quota.used } : { total: 3, used: 3 }}
        currentUserName={currentUserName}
        hasPendingRequest={hasPendingAdditionalRequest}
      />
    </>
  );
};
