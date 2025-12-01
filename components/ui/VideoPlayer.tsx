/**
 * VideoPlayer Component - HTML5 video player with watermark overlay
 *
 * Features:
 * - Custom controls (play/pause, timeline, volume, fullscreen)
 * - Watermark overlay for beta deliverables
 * - Timeline interaction support for timestamped comments
 * - Keyboard shortcuts (Space = play/pause, Esc handled by modal)
 * - Click timeline to seek/add comments
 */

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import ReactDOM from 'react-dom';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Plus, X } from 'lucide-react';
import { cn } from './design-system';
import { TimestampedComment } from '../../types/deliverable.types';

export interface VideoPlayerProps {
  src: string;
  watermarked?: boolean;
  className?: string;
  comments?: TimestampedComment[]; // Timeline comments with tooltips
  onAddComment?: (timestamp: number, comment: string) => void;
  onRemoveComment?: (commentId: string) => void;
  onUpdateComment?: (commentId: string, newText: string) => void;
}

export interface VideoPlayerHandle {
  seekTo: (timestamp: number) => void;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(({
  src,
  watermarked = false,
  className,
  comments = [],
  onAddComment,
  onRemoveComment,
  onUpdateComment,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Inline comment tooltip state
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [showAddCommentForm, setShowAddCommentForm] = useState(false);
  const [newCommentTimestamp, setNewCommentTimestamp] = useState<number>(0);
  const [newCommentText, setNewCommentText] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ top: 16, right: 16 });

  // Drag state for repositionable tooltip
  const [isDraggingTooltip, setIsDraggingTooltip] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasBeenDragged, setHasBeenDragged] = useState(false);

  // Update current time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
    };
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        togglePlayPause();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying]);

  // Auto-show comment form when video pauses (ANY pause action)
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const handlePause = () => {
      // Only recalculate position if user hasn't dragged the tooltip
      if (!hasBeenDragged) {
        const containerRect = container.getBoundingClientRect();
        setTooltipPosition({
          top: containerRect.top + 16,
          right: window.innerWidth - containerRect.right + 16
        });
      }

      // Check if comment exists at current timestamp (within 0.5s)
      const existingComment = comments.find(c =>
        Math.abs(c.timestamp - video.currentTime) < 0.5
      );

      if (existingComment) {
        // Edit existing comment
        setActiveCommentId(existingComment.id);
        setNewCommentText(existingComment.comment);
        setNewCommentTimestamp(existingComment.timestamp);
      } else {
        // New comment
        setActiveCommentId(null);
        setNewCommentText('');
        setNewCommentTimestamp(video.currentTime);
      }

      setShowAddCommentForm(true);
    };

    video.addEventListener('pause', handlePause);
    return () => video.removeEventListener('pause', handlePause);
  }, [comments, hasBeenDragged]);

  // Hide comment form when video plays
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      // Close form when video starts playing
      setShowAddCommentForm(false);
      setActiveCommentId(null);
    };

    video.addEventListener('play', handlePlay);
    return () => video.removeEventListener('play', handlePlay);
  }, []);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !duration || !container) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const clickedTime = percentage * duration;

    // Only recalculate tooltip position if user hasn't dragged it
    if (!hasBeenDragged) {
      const containerRect = container.getBoundingClientRect();
      setTooltipPosition({
        top: containerRect.top + 16,
        right: window.innerWidth - containerRect.right + 16
      });
    }

    // Check if clicked near an existing comment marker (within 5px)
    const clickedComment = comments.find((comment) => {
      const markerPosition = (comment.timestamp / duration) * rect.width;
      return Math.abs(x - markerPosition) < 10; // 10px threshold
    });

    if (clickedComment) {
      // Clicked on existing marker - pause and show edit form
      video.pause();
      setIsPlaying(false);

      video.currentTime = clickedComment.timestamp;
      setCurrentTime(clickedComment.timestamp);

      // Set up edit mode
      setActiveCommentId(clickedComment.id);
      setNewCommentText(clickedComment.comment);
      setNewCommentTimestamp(clickedComment.timestamp);
      setShowAddCommentForm(true);
    } else {
      // Clicked empty space - show add comment form using current video time
      video.currentTime = clickedTime;
      setCurrentTime(clickedTime);
      // Use actual video currentTime for accurate timestamp
      setNewCommentTimestamp(clickedTime);
      setShowAddCommentForm(true);
      setActiveCommentId(null);
      setNewCommentText('');
    }
  };

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;

    if (activeCommentId) {
      // Editing existing comment
      if (onUpdateComment) {
        onUpdateComment(activeCommentId, newCommentText);
      }
    } else {
      // Adding new comment
      if (onAddComment) {
        onAddComment(newCommentTimestamp, newCommentText);
      }
    }

    // Reset and close form
    setNewCommentText('');
    setShowAddCommentForm(false);
    setActiveCommentId(null);
  };

  const handleDeleteComment = (commentId: string) => {
    if (onRemoveComment) {
      onRemoveComment(commentId);
      setActiveCommentId(null);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // Seek to specific timestamp and open comment form
  const handleSeekToComment = (timestamp: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = timestamp;
    video.pause();
    setIsPlaying(false);

    // Manually trigger form open to handle case where video was already paused
    const existingComment = comments.find(c => Math.abs(c.timestamp - timestamp) < 0.5);
    if (existingComment) {
      setActiveCommentId(existingComment.id);
      setNewCommentText(existingComment.comment);
      setNewCommentTimestamp(existingComment.timestamp);
      setShowAddCommentForm(true);
    }
  };

  useImperativeHandle(ref, () => ({
    seekTo: handleSeekToComment
  }));

  // Drag handlers
  const handleTooltipMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only allow dragging from header area
    const target = e.target as HTMLElement;
    if (!target.closest('.drag-handle')) return;

    e.preventDefault();
    e.stopPropagation(); // Prevent click events from bubbling

    setIsDraggingTooltip(true);

    const tooltip = e.currentTarget;
    const rect = tooltip.getBoundingClientRect();

    // Store offset between mouse and tooltip top-left
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Document-level mouse tracking for drag
  useEffect(() => {
    if (!isDraggingTooltip) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate new position
      const newLeft = e.clientX - dragOffset.x;
      const newTop = e.clientY - dragOffset.y;

      // Tooltip is 320px wide (w-80 = 20rem = 320px)
      const tooltipWidth = 320;

      // Apply viewport boundary constraints
      const boundedLeft = Math.max(0, Math.min(window.innerWidth - tooltipWidth, newLeft));
      const boundedTop = Math.max(0, Math.min(window.innerHeight - 200, newTop)); // -200 for min height

      // Convert left to right for existing state structure
      setTooltipPosition({
        top: boundedTop,
        right: window.innerWidth - boundedLeft - tooltipWidth
      });
    };

    const handleMouseUp = () => {
      setIsDraggingTooltip(false);
      setHasBeenDragged(true); // Mark that user has customized position
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingTooltip, dragOffset]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
    >
      {/* Video Container with Rounded Corners */}
      <div className="relative bg-black rounded-lg overflow-hidden group">
        {/* Video Element */}
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full"
          onClick={togglePlayPause}
        />

        {/* Watermark Overlay */}
        {watermarked && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="text-white/20 text-6xl font-bold rotate-[-30deg] select-none">
              BETA - DO NOT DISTRIBUTE
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {/* Timeline with Markers */}
          <div className="mb-3 relative">
            <div
              className="h-2 bg-white/20 rounded-full cursor-pointer relative overflow-visible"
              onClick={handleSeek}
            >
              {/* Progress Bar */}
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progressPercentage}%` }}
              />

              {/* Comment Markers */}
              {comments.map((comment) => {
                const markerPosition = duration > 0 ? (comment.timestamp / duration) * 100 : 0;
                const isActive = comment.id === activeCommentId;
                return (
                  <div
                    key={comment.id}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-125 transition-transform",
                      isActive ? "w-4 h-4 bg-amber-600" : "w-3 h-3 bg-amber-500"
                    )}
                    style={{ left: `${markerPosition}%`, marginLeft: isActive ? '-8px' : '-6px' }}
                    title={`${formatTime(comment.timestamp)}: ${comment.comment.substring(0, 50)}...`}
                  />
                );
              })}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button
              onClick={togglePlayPause}
              className="text-white hover:text-primary transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 fill-current" />
              ) : (
                <Play className="h-6 w-6 fill-current" />
              )}
            </button>

            {/* Time Display */}
            <div className="text-white text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Volume Controls */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={toggleMute}
                className="text-white hover:text-primary transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-primary transition-colors"
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Inline Comment Tooltips - Rendered via Portal to escape modal stacking context */}
      {(activeCommentId || showAddCommentForm) && ReactDOM.createPortal(
        <div
          className="fixed w-80 bg-white rounded-lg shadow-2xl border-2 border-amber-400 z-[100] animate-in slide-in-from-right-2 duration-200 opacity-80 hover:opacity-100 focus-within:opacity-100 transition-opacity"
          style={{
            top: `${tooltipPosition.top}px`,
            right: `${tooltipPosition.right}px`,
            cursor: isDraggingTooltip ? 'grabbing' : 'default'
          }}
          onMouseDown={handleTooltipMouseDown}
        >
          {/* Active Comment Tooltip - Only show if NOT editing */}
          {activeCommentId && !showAddCommentForm && (() => {
            const comment = comments.find((c) => c.id === activeCommentId);
            if (!comment) return null;
            return (
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between drag-handle cursor-grab">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-sm font-mono font-bold text-amber-900">
                      {formatTime(comment.timestamp)}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveCommentId(null)}
                    className="text-zinc-400 hover:text-zinc-600 transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-zinc-700">{comment.comment}</p>
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Delete comment
                </button>
              </div>
            );
          })()}

          {/* Add Comment Form */}
          {showAddCommentForm && (
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between drag-handle cursor-grab">
                <span className="text-sm font-bold text-amber-900">
                  {activeCommentId
                    ? `Edit comment at ${formatTime(newCommentTimestamp)}`
                    : `Add comment at ${formatTime(newCommentTimestamp)}`
                  }
                </span>
                <button
                  onClick={() => setShowAddCommentForm(false)}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Describe the issue at this timestamp..."
                className="w-full min-h-[80px] px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                autoFocus
              />
              <button
                onClick={handleAddComment}
                disabled={!newCommentText.trim()}
                className="w-full px-3 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {activeCommentId ? 'Update Comment' : 'Add Comment'}
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
