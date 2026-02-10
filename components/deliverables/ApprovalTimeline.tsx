/**
 * ApprovalTimeline Component
 *
 * Displays the full history of approvals and rejections for a deliverable.
 * Shows rich feedback details including timestamped comments, issue categories,
 * priority levels, and attachments.
 */

import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Palette,
  Volume2,
  Timer,
  Scissors,
  FileText,
  AlertCircle,
  Paperclip,
  MessageSquare,
} from 'lucide-react';
import { cn, Badge } from '../ui/design-system';
import { DeliverableApproval, IssueCategory, Priority } from '../../types/deliverable.types';
import { formatTimestamp as formatContextualTimestamp, formatDateTime } from '../../utils/dateFormatting';

export interface ApprovalTimelineProps {
  approvalHistory: DeliverableApproval[];
  className?: string;
}

// Icon mapping for issue categories
const ISSUE_ICONS: Record<IssueCategory, React.ElementType> = {
  color: Palette,
  audio: Volume2,
  timing: Timer,
  editing: Scissors,
  content: FileText,
  other: AlertCircle,
};

// Label mapping for issue categories
const ISSUE_LABELS: Record<IssueCategory, string> = {
  color: 'Color/Grading',
  audio: 'Audio',
  timing: 'Timing/Pacing',
  editing: 'Editing',
  content: 'Content/Copy',
  other: 'Other',
};

// Priority styling
const PRIORITY_STYLES: Record<Priority, { badge: string; text: string }> = {
  critical: { badge: 'destructive', text: 'Critical' },
  important: { badge: 'warning', text: 'Important' },
  'nice-to-have': { badge: 'secondary', text: 'Nice to Have' },
};

export const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({
  approvalHistory,
  className,
}) => {
  if (approvalHistory.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <p className="text-sm text-muted-foreground">No approval history yet</p>
      </div>
    );
  }

const formatVideoTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {approvalHistory.map((approval, idx) => (
        <div
          key={approval.id}
          className="relative pl-8 pb-6 last:pb-0 border-l-2 border-border last:border-l-0"
        >
          {/* Timeline Dot */}
          <div
            className={cn(
              'absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-card',
              approval.action === 'approved'
                ? 'bg-teal-500'
                : 'bg-red-500'
            )}
          />

          {/* Card */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {/* Header */}
            <div
              className={cn(
                'px-4 py-3 flex items-center justify-between',
                approval.action === 'approved'
                  ? 'bg-emerald-50/50 border-b border-emerald-100'
                  : 'bg-red-50/50 border-b border-red-100'
              )}
            >
              <div className="flex items-center gap-3">
                {approval.action === 'approved' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {approval.action === 'approved' ? 'Approved' : 'Revision Requested'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    by {approval.userName} • {formatContextualTimestamp(approval.timestamp)}
                  </p>
                </div>
              </div>
              {approval.action === 'rejected' && approval.priority && (
                <Badge variant={PRIORITY_STYLES[approval.priority].badge as any}>
                  {PRIORITY_STYLES[approval.priority].text}
                </Badge>
              )}
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {/* General Feedback */}
              {approval.feedback && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Feedback
                  </div>
                  <p className="text-sm text-foreground leading-relaxed bg-muted p-3 rounded-lg border border-border">
                    {approval.feedback}
                  </p>
                </div>
              )}

              {/* Timestamped Comments */}
              {approval.timestampedComments && approval.timestampedComments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                    <Clock className="h-3.5 w-3.5" />
                    Timeline Comments ({approval.timestampedComments.length})
                  </div>
                  <div className="space-y-2">
                    {approval.timestampedComments.map((comment) => {
                      const CategoryIcon = ISSUE_ICONS[comment.category];
                      return (
                        <div
                          key={comment.id}
                          className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg"
                        >
                          <div className="flex items-center gap-2 min-w-[60px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span className="text-xs font-mono font-bold text-amber-900">
                              {formatVideoTimestamp(comment.timestamp)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CategoryIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground">
                                {ISSUE_LABELS[comment.category]}
                              </span>
                            </div>
                            <p className="text-sm text-foreground">{comment.comment}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Issue Categories */}
              {approval.issueCategories && approval.issueCategories.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Issue Categories
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {approval.issueCategories.map((category) => {
                      const Icon = ISSUE_ICONS[category];
                      return (
                        <div
                          key={category}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-xs font-medium text-blue-700"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {ISSUE_LABELS[category]}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {approval.attachments && approval.attachments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                    <Paperclip className="h-3.5 w-3.5" />
                    Attachments ({approval.attachments.length})
                  </div>
                  <div className="space-y-2">
                    {approval.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-2 bg-muted border border-border rounded-lg text-sm"
                      >
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {attachment.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
