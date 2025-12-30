/**
 * DeliverableVideoSection Component
 *
 * Video player section for deliverable review page.
 * Conditionally renders interactive commenting based on permissions.
 *
 * Features:
 * - VideoCommentTimeline when user can request revision (interactive commenting)
 * - VideoPlayer when user is in view-only mode
 * - Video metadata cards (Duration, Format, Resolution)
 */

import React from 'react';
import { FileVideo, Clock, Maximize2 } from 'lucide-react';
import { VideoPlayer } from '../ui/VideoPlayer';
import { VideoCommentTimeline } from './VideoCommentTimeline';
import { Deliverable, TimestampedComment } from '../../types/deliverable.types';

export interface DeliverableVideoSectionProps {
  deliverable: Deliverable;
  canRequestRevision: boolean;
  canComment: boolean;
  comments: TimestampedComment[];
  onAddComment: (timestamp: number, comment: string) => void;
  onRemoveComment: (commentId: string) => void;
  onUpdateComment: (commentId: string, text: string) => void;
}

export const DeliverableVideoSection: React.FC<DeliverableVideoSectionProps> = ({
  deliverable,
  canRequestRevision,
  canComment,
  comments,
  onAddComment,
  onRemoveComment,
  onUpdateComment,
}) => {
  const isFinalDelivered = deliverable.status === 'final_delivered';
  const videoUrl = isFinalDelivered
    ? deliverable.finalFileUrl || deliverable.betaFileUrl
    : deliverable.betaFileUrl;

  return (
    <div className="space-y-6">
      {/* Video Player */}
      {videoUrl && deliverable.type === 'Video' ? (
        canComment ? (
          // Interactive commenting enabled for users with comment permissions
          <VideoCommentTimeline
            videoUrl={videoUrl}
            comments={comments}
            onAddComment={onAddComment}
            onRemoveComment={onRemoveComment}
            onUpdateComment={onUpdateComment}
            className="w-full"
          />
        ) : (
          // View-only mode for users without comment permissions
          <VideoPlayer
            src={videoUrl}
            watermarked={deliverable.watermarked && !isFinalDelivered}
            className="w-full aspect-video"
            comments={deliverable.approvalHistory.flatMap((a) => a.timestampedComments || [])}
          />
        )
      ) : (
        <div className="w-full aspect-video bg-zinc-100 rounded-lg flex items-center justify-center">
          <FileVideo className="h-16 w-16 text-zinc-400" />
        </div>
      )}

      {/* Video Metadata Cards */}
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
    </div>
  );
};
