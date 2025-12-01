/**
 * VideoCommentTimeline Component
 *
 * Video player with interactive timeline markers for timestamped comments.
 * Comments appear as inline tooltips on the video timeline - click markers to view/edit.
 */

import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { MessageSquare } from 'lucide-react';
import { VideoPlayer, VideoPlayerHandle } from '../ui/VideoPlayer';
import { TimestampedComment } from '../../types/deliverable.types';

export interface VideoCommentTimelineHandle {
  seekTo: (timestamp: number) => void;
}

export interface VideoCommentTimelineProps {
  videoUrl: string;
  comments: TimestampedComment[];
  onAddComment: (timestamp: number, comment: string) => void;
  onRemoveComment: (commentId: string) => void;
  onUpdateComment?: (commentId: string, newText: string) => void;
  onSeekToComment?: (timestamp: number) => void;
  className?: string;
}

export const VideoCommentTimeline = forwardRef<VideoCommentTimelineHandle, VideoCommentTimelineProps>(({
  videoUrl,
  comments,
  onAddComment,
  onRemoveComment,
  onUpdateComment,
  onSeekToComment,
  className,
}, ref) => {
  const videoPlayerRef = useRef<VideoPlayerHandle>(null);

  useImperativeHandle(ref, () => ({
    seekTo: (timestamp: number) => {
      videoPlayerRef.current?.seekTo(timestamp);
    }
  }));

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={className}>
      <div className="space-y-2 mb-3">
        <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Video with Timeline Comments
        </label>
        <p className="text-xs text-zinc-500">
          Pause video to add comments. Click markers or list items to edit.
        </p>
      </div>

      {/* Video Player with Inline Comment Tooltips */}
      <VideoPlayer
        ref={videoPlayerRef}
        src={videoUrl}
        watermarked={true}
        comments={comments}
        onAddComment={onAddComment}
        onRemoveComment={onRemoveComment}
        onUpdateComment={onUpdateComment}
        className="w-full rounded-lg"
      />
    </div>
  );
});

VideoCommentTimeline.displayName = 'VideoCommentTimeline';
