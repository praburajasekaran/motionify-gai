/**
 * FeedbackSummaryPanel Component
 *
 * Right sidebar showing real-time summary of all feedback before submission.
 * Displays: timestamped comments, issue categories, priority, attachments, character count.
 */

import React from 'react';
import {
  MessageSquare,
  Clock,
  AlertCircle,
  AlertTriangle,
  Paperclip,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../ui/design-system';
import {
  TimestampedComment,
  IssueCategory,
  Priority,
  FeedbackAttachment,
} from '../../types/deliverable.types';

export interface FeedbackSummaryPanelProps {
  feedbackText: string;
  timestampedComments: TimestampedComment[];
  issueCategories: IssueCategory[];
  priority: Priority;
  attachments: FeedbackAttachment[];
  minCharacters?: number;
  onSeekToComment?: (timestamp: number) => void;
  className?: string;
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  critical: { label: 'Critical', color: 'text-red-700' },
  important: { label: 'Important', color: 'text-amber-700' },
  'nice-to-have': { label: 'Nice to Have', color: 'text-blue-700' },
};

export const FeedbackSummaryPanel: React.FC<FeedbackSummaryPanelProps> = ({
  feedbackText,
  timestampedComments,
  issueCategories,
  priority,
  attachments,
  minCharacters = 20,
  onSeekToComment,
  className,
}) => {
  const characterCount = feedbackText.length;
  const meetsMinimum = characterCount >= minCharacters;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Feedback Summary
        </h3>

        <div className="space-y-4 text-sm">
          {/* Text Feedback */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                <MessageSquare className="h-3.5 w-3.5" />
                General Feedback
              </div>
              <span
                className={cn(
                  'text-xs font-mono',
                  meetsMinimum ? 'text-emerald-600' : 'text-red-600'
                )}
              >
                {characterCount}/{minCharacters}
              </span>
            </div>
            {feedbackText ? (
              <p className="text-xs text-zinc-700 bg-white p-2 rounded border border-blue-100 line-clamp-3">
                {feedbackText}
              </p>
            ) : (
              <p className="text-xs text-zinc-400 italic">No feedback provided yet</p>
            )}
          </div>

          {/* Timestamped Comments */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
              <Clock className="h-3.5 w-3.5" />
              Timeline Comments
              <span className="ml-auto text-blue-600 font-bold">
                {timestampedComments.length}
              </span>
            </div>
            {timestampedComments.length > 0 ? (
              <div className="space-y-1">
                {timestampedComments.map((comment) => (
                  <button
                    key={comment.id}
                    onClick={() => onSeekToComment?.(comment.timestamp)}
                    className="w-full text-left text-xs bg-white p-2 rounded border border-blue-100 flex items-start gap-2 hover:bg-blue-50 hover:border-blue-200 transition-colors group"
                  >
                    <span className="font-mono font-bold text-amber-700 shrink-0 group-hover:text-amber-800">
                      {formatTime(comment.timestamp)}
                    </span>
                    <span className="text-zinc-600 line-clamp-2 group-hover:text-zinc-900">{comment.comment}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">
                No timeline comments added
              </p>
            )}
          </div>

          {/* Issue Categories */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
              <AlertCircle className="h-3.5 w-3.5" />
              Categories
              <span className="ml-auto text-blue-600 font-bold">
                {issueCategories.length}
              </span>
            </div>
            {issueCategories.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {issueCategories.map((category) => (
                  <span
                    key={category}
                    className="text-xs px-2 py-1 bg-white border border-blue-100 rounded-full text-zinc-700"
                  >
                    {category}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">No categories selected</p>
            )}
          </div>

          {/* Priority */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              Priority
            </div>
            <span
              className={cn(
                'inline-block text-xs px-3 py-1.5 bg-white border border-blue-100 rounded-full font-semibold',
                PRIORITY_CONFIG[priority].color
              )}
            >
              {PRIORITY_CONFIG[priority].label}
            </span>
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
              <Paperclip className="h-3.5 w-3.5" />
              Attachments
              <span className="ml-auto text-blue-600 font-bold">
                {attachments.length}
              </span>
            </div>
            {attachments.length > 0 ? (
              <div className="space-y-1">
                {attachments.map((file) => (
                  <div
                    key={file.id}
                    className="text-xs bg-white p-2 rounded border border-blue-100 truncate"
                  >
                    {file.fileName}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">No files attached</p>
            )}
          </div>
        </div>
      </div>

      {/* Validation Checklist */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
        <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-3">
          Checklist
        </h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center',
                meetsMinimum ? 'bg-emerald-500' : 'bg-zinc-300'
              )}
            >
              {meetsMinimum && <CheckCircle2 className="h-3 w-3 text-white" />}
            </div>
            <span className={meetsMinimum ? 'text-zinc-900' : 'text-zinc-500'}>
              Min {minCharacters} characters feedback
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center',
                issueCategories.length > 0 ? 'bg-emerald-500' : 'bg-zinc-300'
              )}
            >
              {issueCategories.length > 0 && (
                <CheckCircle2 className="h-3 w-3 text-white" />
              )}
            </div>
            <span
              className={
                issueCategories.length > 0 ? 'text-zinc-900' : 'text-zinc-500'
              }
            >
              At least 1 category selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full flex items-center justify-center bg-emerald-500">
              <CheckCircle2 className="h-3 w-3 text-white" />
            </div>
            <span className="text-zinc-900">Priority level set</span>
          </div>
        </div>
      </div>
    </div>
  );
};
