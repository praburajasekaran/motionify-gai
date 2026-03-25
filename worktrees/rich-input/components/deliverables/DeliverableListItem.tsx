/**
 * DeliverableListItem Component
 *
 * Compact row version of DeliverableCard for list view.
 * Shows: icon | title | status badge | due date | progress | actions
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Calendar,
  Download,
  Eye,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { cn, Badge, Button } from '../ui/design-system';
import { Deliverable, DeliverableStatus } from '../../types/deliverable.types';
import { storageService } from '../../services/storage';
import { useDeliverables } from './DeliverableContext';

export interface DeliverableListItemProps {
  deliverable: Deliverable;
  className?: string;
}

// Status badge variants and labels
const STATUS_CONFIG: Record<
  DeliverableStatus,
  { variant: string; label: string }
> = {
  pending: { variant: 'secondary', label: 'Pending' },
  in_progress: { variant: 'info', label: 'In Progress' },
  beta_ready: { variant: 'warning', label: 'Beta Ready' },
  awaiting_approval: { variant: 'warning', label: 'Awaiting Approval' },
  approved: { variant: 'success', label: 'Approved' },
  revision_requested: { variant: 'destructive', label: 'Revision Requested' },
  payment_pending: { variant: 'warning', label: 'Payment Pending' },
  final_delivered: { variant: 'success', label: 'Final Delivered' },
};

export const DeliverableListItem: React.FC<DeliverableListItemProps> = ({
  deliverable,
  className,
}) => {
  const navigate = useNavigate();
  const { currentUser, deleteDeliverable } = useDeliverables();

  const rawStatusConfig = STATUS_CONFIG[deliverable.status];
  // Clients see "In Progress" instead of "Beta Ready" — it's an internal team concept
  const statusConfig = (currentUser?.role === 'client' && deliverable.status === 'beta_ready')
    ? STATUS_CONFIG['in_progress']
    : rawStatusConfig;
  const dueDate = new Date(deliverable.dueDate);
  const isOverdue = dueDate < new Date() && deliverable.progress < 100;

  // Permission check: only super_admin and project_manager can delete
  const canDelete = currentUser?.role === 'super_admin' || currentUser?.role === 'project_manager';

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${deliverable.title}"? This will permanently remove all files.`)) {
      try {
        await deleteDeliverable(deliverable.id);
      } catch (err) {
        console.error('Delete error:', err);
        alert(err instanceof Error ? err.message : 'Failed to delete deliverable');
      }
    }
  };

  // Count uploaded files (beta and/or final)
  const fileCount = [deliverable.betaFileKey, deliverable.finalFileKey].filter(Boolean).length;

  const handleClick = () => {
    navigate(`/projects/${deliverable.projectId}/deliverables/${deliverable.id}`);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const key = deliverable.status === 'final_delivered'
        ? deliverable.finalFileKey
        : deliverable.betaFileKey;

      if (key) {
        if (deliverable.status === 'final_delivered') {
          const url = storageService.getPublicUrl(key);
          window.open(url, '_blank');
        } else {
          const url = await storageService.getDownloadUrl(key);
          window.open(url, '_blank');
        }
      }
    } catch (err) {
      console.error('Download error', err);
    }
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-4 p-4 bg-card border border-border rounded-lg',
        'hover:border-border hover:shadow-sm transition-all cursor-pointer',
        className
      )}
      onClick={handleClick}
    >
      {/* File Count Indicator */}
      <div className="shrink-0 w-12 h-12 rounded-lg bg-muted flex flex-col items-center justify-center">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground mt-0.5">
          {fileCount > 0 ? fileCount : '—'}
        </span>
      </div>

      {/* Title & Description */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm text-foreground truncate">
          {deliverable.title}
        </h3>
        {deliverable.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {deliverable.description}
          </p>
        )}
      </div>

      {/* Status Badge */}
      <div className="shrink-0">
        <Badge variant={statusConfig.variant as any} className="text-xs">
          {statusConfig.label}
        </Badge>
      </div>

      {/* Due Date */}
      <div className={cn(
        'shrink-0 flex items-center gap-1.5 text-xs',
        isOverdue ? 'text-red-600' : 'text-muted-foreground'
      )}>
        <Calendar className="h-3.5 w-3.5" />
        <span>{dueDate.toLocaleDateString()}</span>
        {isOverdue && <span className="font-semibold">(Overdue)</span>}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-2">
        {deliverable.status === 'final_delivered' && deliverable.finalFileKey && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
        {(deliverable.status === 'beta_ready' || deliverable.status === 'awaiting_approval') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </div>
  );
};
