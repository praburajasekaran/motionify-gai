/**
 * DeliverableListItem Component
 *
 * Compact row version of DeliverableCard for list view.
 * Shows: icon | title | status badge | due date | progress | actions
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
  ChevronRight,
} from 'lucide-react';
import { cn, Badge, Progress, Button } from '../ui/design-system';
import { Deliverable, DeliverableStatus } from '../../types/deliverable.types';
import { storageService } from '../../services/storage';

export interface DeliverableListItemProps {
  deliverable: Deliverable;
  className?: string;
}

/**
 * Detect the actual media type from a file key (storage path)
 * Returns 'video', 'image', or 'document' based on file extension
 */
function detectMediaTypeFromKey(key: string | undefined): 'video' | 'image' | 'document' {
  if (!key) return 'video'; // Default fallback

  const extension = key.split('.').pop()?.toLowerCase();

  const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv', 'm4v'];
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'heic'];

  if (videoExtensions.includes(extension || '')) return 'video';
  if (imageExtensions.includes(extension || '')) return 'image';
  return 'document';
}

// Icon mapping for detected media types
const TYPE_ICONS = {
  video: FileVideo,
  image: FileImage,
  document: FileText,
};

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
  rejected: { variant: 'destructive', label: 'Revision Requested' },
  payment_pending: { variant: 'warning', label: 'Payment Pending' },
  final_delivered: { variant: 'success', label: 'Final Delivered' },
};

export const DeliverableListItem: React.FC<DeliverableListItemProps> = ({
  deliverable,
  className,
}) => {
  const navigate = useNavigate();
  const [thumbnailUrl, setThumbnailUrl] = React.useState<string | null>(null);

  // Detect actual media type from file key (not the static deliverable.type)
  const fileKey = deliverable.finalFileKey || deliverable.betaFileKey;
  const detectedMediaType = detectMediaTypeFromKey(fileKey);
  const Icon = TYPE_ICONS[detectedMediaType];

  const statusConfig = STATUS_CONFIG[deliverable.status];
  const dueDate = new Date(deliverable.dueDate);
  const isOverdue = dueDate < new Date() && deliverable.progress < 100;
  const isFinal = deliverable.status === 'final_delivered';

  // Load thumbnail for videos and images
  React.useEffect(() => {
    const loadThumbnail = async () => {
      if (!fileKey) return;

      try {
        if (detectedMediaType === 'video') {
          // For videos: load the generated thumbnail (-thumb.jpg)
          const thumbKey = fileKey.replace(/\.[^/.]+$/, '-thumb.jpg');
          if (isFinal) {
            setThumbnailUrl(storageService.getPublicUrl(thumbKey));
          } else {
            const url = await storageService.getDownloadUrl(thumbKey);
            if (url) setThumbnailUrl(url);
          }
        } else if (detectedMediaType === 'image') {
          // For images: load the actual image
          if (isFinal) {
            setThumbnailUrl(storageService.getPublicUrl(fileKey));
          } else {
            const url = await storageService.getDownloadUrl(fileKey);
            if (url) setThumbnailUrl(url);
          }
        }
      } catch (e) {
        console.warn('Failed to load thumbnail', e);
      }
    };

    loadThumbnail();
  }, [fileKey, detectedMediaType, isFinal]);

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
        'group flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-lg',
        'hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer',
        className
      )}
      onClick={handleClick}
    >
      {/* Thumbnail or Icon */}
      <div className="shrink-0 w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={deliverable.title}
            className="w-full h-full object-cover"
            onError={() => setThumbnailUrl(null)}
          />
        ) : (
          <Icon className="h-5 w-5 text-zinc-500" />
        )}
      </div>

      {/* Title & Description */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm text-zinc-900 truncate">
          {deliverable.title}
        </h3>
        {deliverable.description && (
          <p className="text-xs text-zinc-500 truncate mt-0.5">
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
        isOverdue ? 'text-red-600' : 'text-zinc-500'
      )}>
        <Calendar className="h-3.5 w-3.5" />
        <span>{dueDate.toLocaleDateString()}</span>
        {isOverdue && <span className="font-semibold">(Overdue)</span>}
      </div>

      {/* Progress */}
      {deliverable.progress < 100 && deliverable.status !== 'final_delivered' && (
        <div className="shrink-0 w-24">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
            <span>{deliverable.progress}%</span>
          </div>
          <Progress value={deliverable.progress} className="h-1.5" />
        </div>
      )}

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
        <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
      </div>
    </div>
  );
};
