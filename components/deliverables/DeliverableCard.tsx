/**
 * DeliverableCard Component
 *
 * Individual deliverable card showing:
 * - Thumbnail/icon based on type
 * - Title and description
 * - Status badge with color coding
 * - Progress bar
 * - Due date
 * - Action button (Review/Download)
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileVideo,
  FileImage,
  FileText,
  Calendar,
  Download,
  Eye,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { cn, Badge, Progress, Button } from '../ui/design-system';
import { Deliverable, DeliverableStatus } from '../../types/deliverable.types';

export interface DeliverableCardProps {
  deliverable: Deliverable;
  className?: string;
}

// Icon mapping for deliverable types
const TYPE_ICONS = {
  Video: FileVideo,
  Image: FileImage,
  Document: FileText,
};

// Status badge variants and labels
const STATUS_CONFIG: Record<
  DeliverableStatus,
  { variant: string; label: string; color: string }
> = {
  pending: {
    variant: 'secondary',
    label: 'Pending',
    color: 'text-zinc-500',
  },
  in_progress: {
    variant: 'info',
    label: 'In Progress',
    color: 'text-blue-500',
  },
  beta_ready: {
    variant: 'warning',
    label: 'Beta Ready',
    color: 'text-purple-500',
  },
  awaiting_approval: {
    variant: 'warning',
    label: 'Awaiting Your Approval',
    color: 'text-amber-500',
  },
  approved: {
    variant: 'success',
    label: 'Approved',
    color: 'text-emerald-500',
  },
  rejected: {
    variant: 'destructive',
    label: 'Revision Requested',
    color: 'text-red-500',
  },
  payment_pending: {
    variant: 'warning',
    label: 'Payment Pending',
    color: 'text-amber-500',
  },
  final_delivered: {
    variant: 'success',
    label: 'Final Delivered',
    color: 'text-emerald-500',
  },
};

export const DeliverableCard: React.FC<DeliverableCardProps> = ({
  deliverable,
  className,
}) => {
  const navigate = useNavigate();
  const Icon = TYPE_ICONS[deliverable.type];
  const statusConfig = STATUS_CONFIG[deliverable.status];
  const dueDate = new Date(deliverable.dueDate);
  const isOverdue = dueDate < new Date() && deliverable.progress < 100;

  // Determine if card is actionable (can be reviewed or downloaded)
  const isActionable =
    deliverable.status === 'beta_ready' ||
    deliverable.status === 'awaiting_approval' ||
    deliverable.status === 'final_delivered';

  // Navigate to deliverable detail page
  const handleNavigate = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent double navigation if button inside card is clicked
    }
    navigate(`/projects/${deliverable.projectId}/deliverables/${deliverable.id}`);
  };

  const getActionButton = () => {
    if (deliverable.status === 'final_delivered') {
      return (
        <Button
          variant="gradient"
          size="sm"
          className="gap-2"
          onClick={handleNavigate}
        >
          <Download className="h-4 w-4" />
          Download
        </Button>
      );
    }

    if (deliverable.status === 'beta_ready' || deliverable.status === 'awaiting_approval') {
      return (
        <Button
          variant="default"
          size="sm"
          className="gap-2"
          onClick={handleNavigate}
        >
          <Eye className="h-4 w-4" />
          Review Beta
        </Button>
      );
    }

    return null;
  };

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-1 overflow-hidden',
        isActionable && 'cursor-pointer',
        className
      )}
      onClick={() => isActionable && handleNavigate()}
    >
      {/* Thumbnail/Icon Area */}
      <div className="relative aspect-video bg-gradient-to-br from-zinc-100 to-zinc-50 flex items-center justify-center overflow-hidden">
        {deliverable.betaFileUrl && deliverable.type === 'Video' ? (
          <div className="relative w-full h-full bg-zinc-900">
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className="h-16 w-16 text-white/20" />
            </div>
            {deliverable.watermarked && (
              <div className="absolute top-2 right-2">
                <Badge variant="warning" className="text-xs">
                  BETA
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
            <Icon className={cn('h-10 w-10', statusConfig.color)} />
          </div>
        )}

        {/* Progress Overlay for In-Progress */}
        {deliverable.status === 'in_progress' && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
            <div className="flex items-center justify-between text-white text-xs font-medium mb-1">
              <span>Progress</span>
              <span>{deliverable.progress}%</span>
            </div>
            <Progress value={deliverable.progress} className="h-1.5" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title & Status */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm text-zinc-900 line-clamp-2 flex-1">
              {deliverable.title}
            </h3>
            <Badge variant={statusConfig.variant as any} className="shrink-0 text-xs">
              {statusConfig.label}
            </Badge>
          </div>

          {deliverable.description && (
            <p className="text-xs text-zinc-500 line-clamp-2">
              {deliverable.description}
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          {deliverable.duration && (
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {deliverable.duration}
            </div>
          )}
          {deliverable.format && (
            <div className="font-medium uppercase">{deliverable.format}</div>
          )}
          {deliverable.resolution && (
            <div className="font-mono">{deliverable.resolution}</div>
          )}
        </div>

        {/* Due Date */}
        <div
          className={cn(
            'flex items-center gap-2 text-xs font-medium',
            isOverdue ? 'text-red-600' : 'text-zinc-600'
          )}
        >
          <Calendar className="h-3.5 w-3.5" />
          Due {dueDate.toLocaleDateString()}
          {isOverdue && <span className="text-red-600 font-bold">(Overdue)</span>}
        </div>

        {/* Progress Bar (for non-completed) */}
        {deliverable.progress < 100 && deliverable.status !== 'beta_ready' && (
          <div className="pt-2">
            <Progress
              value={deliverable.progress}
              indicatorClassName={
                deliverable.progress > 80
                  ? 'bg-emerald-500'
                  : deliverable.progress > 50
                  ? 'bg-blue-500'
                  : 'bg-amber-500'
              }
            />
          </div>
        )}

        {/* Action Button */}
        {getActionButton()}

        {/* Approval History Count */}
        {deliverable.approvalHistory.length > 0 && (
          <div className="pt-2 border-t border-zinc-100">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {deliverable.approvalHistory.length} review
              {deliverable.approvalHistory.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
