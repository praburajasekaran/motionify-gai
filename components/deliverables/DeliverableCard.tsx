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
import { storageService } from '../../services/storage';
import { generateThumbnail } from '../../utils/thumbnail';
import { Upload, Loader2, Play, CreditCard } from 'lucide-react';
import { formatTimestamp, formatDateTime } from '../../utils/dateFormatting';

export interface DeliverableCardProps {
  deliverable: Deliverable;
  className?: string;
}

// Icon mapping for deliverable types
const TYPE_ICONS: Record<string, typeof FileVideo> = {
  Video: FileVideo,
  Image: FileImage,
  Document: FileText,
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB for deliverables (aligned with backend)
const ALLOWED_FILE_TYPES = [
  'video/',
  'image/',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
];

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
  revision_requested: {
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
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [thumbnailUrl, setThumbnailUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const uploadTypeRef = React.useRef<'beta' | 'final'>('beta');

  const Icon = (deliverable.type && TYPE_ICONS[deliverable.type]) || FileVideo;
  const statusConfig = STATUS_CONFIG[deliverable.status];
  const dueDate = new Date(deliverable.dueDate);
  const isOverdue = dueDate < new Date() && deliverable.progress < 100;

  // Determine if card is actionable (can be reviewed or downloaded)
  // All cards are now actionable to show details/empty state
  const isActionable = true;

  // Navigate to deliverable detail page
  const handleNavigate = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent double navigation if button inside card is clicked
    }
    navigate(`/projects/${deliverable.projectId}/deliverables/${deliverable.id}`);
  };

  // Load thumbnail if video
  React.useEffect(() => {
    const loadThumbnail = async () => {
      // Determine key: beta or final
      const key = deliverable.finalFileKey || deliverable.betaFileKey;

      if (deliverable.type === 'Video' && key) {
        // Assume thumbnail convention: key-thumb.jpg
        // e.g. .mp4 -> -thumb.jpg
        const thumbKey = key.replace(/\.[^/.]+$/, '-thumb.jpg');

        try {
          // If final, try public URL first (faster)
          if (deliverable.status === 'final_delivered') {
            setThumbnailUrl(storageService.getPublicUrl(thumbKey));
          } else {
            // For beta/private, get signed URL
            const url = await storageService.getDownloadUrl(thumbKey);
            if (url) setThumbnailUrl(url);
          }
        } catch (e) {
          console.warn('Failed to load thumbnail', e);
        }
      }
    };

    loadThumbnail();
  }, [deliverable.betaFileKey, deliverable.finalFileKey, deliverable.status, deliverable.type]);

  const handleUploadClick = (type: 'beta' | 'final', e: React.MouseEvent) => {
    e.stopPropagation();
    uploadTypeRef.current = type;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validate File Size
    console.log(`[DeliverableCard] File selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB)`);

    if (file.size > MAX_FILE_SIZE) {
      alert(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max size is 100MB. For larger files, contact support.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Validate File Type
    const isValidType = ALLOWED_FILE_TYPES.some(type => {
      if (type.endsWith('/')) {
        return file.type.startsWith(type);
      }
      return file.type === type;
    });

    if (!isValidType) {
      alert('Invalid file type. Allowed: Video, Image, PDF, DOCX, XLSX.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const folder = uploadTypeRef.current === 'beta' ? 'beta' : 'final';
      const key = await storageService.uploadFile(
        file,
        deliverable.projectId,
        folder,
        (progress) => setUploadProgress(progress)
      );

      console.log(`Uploaded ${uploadTypeRef.current} file:`, key);

      // 3. If Video, Generate and Upload Thumbnail
      if (file.type.startsWith('video/')) {
        try {
          console.log('Generating thumbnail...');
          const thumbnailFile = await generateThumbnail(file);
          if (thumbnailFile) {
            const thumbKey = key.replace(/\.[^/.]+$/, '-thumb.jpg');
            await storageService.uploadFile(
              thumbnailFile,
              deliverable.projectId,
              folder,
              undefined, // no progress tracking for thumb
              thumbKey // Force specific key to match video
            );
            console.log('Thumbnail uploaded:', thumbKey);

            // Optimistically set thumbnail URL
            setThumbnailUrl(URL.createObjectURL(thumbnailFile));
          }
        } catch (thumbErr) {
          console.error('Thumbnail generation failed:', thumbErr);
          // Non-fatal error, proceed
        }
      }

      // Save key to database
      const updateData = uploadTypeRef.current === 'beta'
        ? { beta_file_key: key }
        : { final_file_key: key };

      const response = await fetch(`/api/deliverables/${deliverable.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update deliverable record');
      }

      alert(`${uploadTypeRef.current === 'beta' ? 'Beta' : 'Final'} file uploaded and saved successfully!`);

    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Check console for details.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Prefer R2 key if available
      const key = deliverable.status === 'final_delivered'
        ? deliverable.finalFileKey
        : deliverable.betaFileKey;

      if (key) {
        // Use CDN Public URL for final delivered files
        if (deliverable.status === 'final_delivered') {
          const url = storageService.getPublicUrl(key);
          window.open(url, '_blank');
          return;
        }

        // Use Presigned URL for private/beta files
        const url = await storageService.getDownloadUrl(key);
        window.open(url, '_blank');
        return;
      }

      // Fallback to legacy URLs if no key
      const legacyUrl = deliverable.status === 'final_delivered'
        ? deliverable.finalFileUrl
        : deliverable.betaFileUrl;

      if (legacyUrl) {
        window.open(legacyUrl, '_blank');
      } else {
        alert('No file available');
      }
    } catch (err) {
      console.error("Download error", err);
      alert("Failed to get download URL");
    }
  };

  const handlePayment = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const confirmPayment = window.confirm(
      "Simulate payment for remaining 50% balance?\n\nThis will mark the deliverable as paid and release final files."
    );

    if (!confirmPayment) return;

    setIsUploading(true); // Reuse loading state for payment processing

    try {
      // Updates status to final_delivered
      const response = await fetch(`/api/deliverables/${deliverable.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          status: 'final_delivered'
        }),
      });

      if (!response.ok) {
        throw new Error('Payment processing failed');
      }

      alert('Payment successful! Final files are now available for download.');
      // Ideally trigger a refresh, but strict React might require context update or key change
      window.location.reload();

    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };


  const getActionButton = () => {
    if (deliverable.status === 'final_delivered') {
      return (
        <Button
          variant="gradient"
          size="sm"
          className="gap-2"
          onClick={handleDownload}
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

    if (deliverable.status === 'payment_pending') {
      return (
        <Button
          variant="gradient"
          size="sm"
          className="gap-2"
          onClick={handlePayment}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          Pay Balance (50%)
        </Button>
      );
    }

    return null;
  };

  // Admin Actions (Uploads) - Simplified for Demo
  const getAdminActions = () => {
    // Upload Beta when in progress or revision requested
    if (deliverable.status === 'in_progress' || deliverable.status === 'revision_requested') {
      return (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 w-full mt-2"
          onClick={(e) => handleUploadClick('beta', e)}
          disabled={isUploading}
        >
          {isUploading ? (
            <div className="flex items-center gap-2 w-full justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{uploadProgress}%</span>
            </div>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload Beta
            </>
          )}
        </Button>
      );
    }

    // Upload Final when approved or payment pending
    if (deliverable.status === 'approved' || deliverable.status === 'payment_pending') {
      return (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 w-full mt-2"
          onClick={(e) => handleUploadClick('final', e)}
          disabled={isUploading}
        >
          {isUploading ? (
            <div className="flex items-center gap-2 w-full justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{uploadProgress}%</span>
            </div>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload Final
            </>
          )}
        </Button>
      );
    }

    return null;
  };


  return (
    <div
      className={cn(
        'group relative rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-1 overflow-hidden',
        isActionable && 'cursor-pointer',
        className
      )}
      onClick={() => isActionable && handleNavigate()}
    >
      {/* Thumbnail/Icon Area */}
      <div className="relative aspect-video bg-gradient-to-br from-muted to-muted flex items-center justify-center overflow-hidden">
        {deliverable.betaFileUrl && deliverable.type === 'Video' ? (
          <div className="relative w-full h-full bg-zinc-900 group-hover:scale-105 transition-transform duration-500">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={deliverable.title}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon className="h-16 w-16 text-white/20" />
              </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                <Play className="h-6 w-6 text-white" fill="currentColor" />
              </div>
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
          <div className="bg-card p-6 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
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
            <h3 className="font-semibold text-sm text-foreground line-clamp-2 flex-1">
              {deliverable.title}
            </h3>
            <Badge variant={statusConfig.variant as any} className="shrink-0 text-xs">
              {statusConfig.label}
            </Badge>
          </div>

          {deliverable.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {deliverable.description}
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
            isOverdue ? 'text-red-600' : 'text-muted-foreground'
          )}
        >
          <Calendar className="h-3.5 w-3.5" />
          Due {dueDate.toLocaleDateString()}
          {isOverdue && <span className="text-red-600 font-bold">(Overdue)</span>}
        </div>

        {/* Created Date */}
        {deliverable.createdAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span title={formatDateTime(deliverable.createdAt) || undefined}>
              Created {formatTimestamp(deliverable.createdAt)}
            </span>
          </div>
        )}

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
        {getAdminActions()}

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />


        {/* Approval History Count */}
        {deliverable.approvalHistory.length > 0 && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
