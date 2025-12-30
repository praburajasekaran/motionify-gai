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
import { Avatar } from '../ui/Avatar';

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

      {/* Comments Sidebar List */}
      {comments.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Timeline Comments ({comments.length})
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {comments.map((comment) => (
              <button
                key={comment.id}
                onClick={() => videoPlayerRef.current?.seekTo(comment.timestamp)}
                className="w-full text-left p-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-start gap-2 mb-2">
                  <Avatar
                    name={comment.userName}
                    avatarUrl={comment.userAvatar}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-zinc-900">
                        {comment.userName}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span className="text-xs font-mono text-amber-900">
                          {formatTime(comment.timestamp)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-700 line-clamp-2">{comment.comment}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

VideoCommentTimeline.displayName = 'VideoCommentTimeline';
