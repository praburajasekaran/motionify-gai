/**
 * DeliverableVideoSection Component
 *
 * Media section for deliverable review page.
 * Supports video, image, and document types with appropriate viewers.
 *
 * Features:
 * - VideoCommentTimeline when user can request revision (interactive commenting)
 * - VideoPlayer when user is in view-only mode for videos
 * - Image preview for image files
 * - Video metadata cards (Duration, Format, Resolution) for videos
 */

import React from 'react';
import { FileVideo, FileImage, Clock, Maximize2 } from 'lucide-react';
import { VideoPlayer } from '../ui/VideoPlayer';
import { VideoCommentTimeline } from './VideoCommentTimeline';
import { Deliverable, TimestampedComment } from '../../types/deliverable.types';

import { storageService } from '../../services/storage';

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

export interface DeliverableVideoSectionProps {
  deliverable: Deliverable;
  canRequestRevision: boolean;
  canComment: boolean;
  canUploadBeta: boolean;
  comments: TimestampedComment[];
  onAddComment: (timestamp: number, comment: string) => void;
  onRemoveComment: (commentId: string) => void;
  onUpdateComment: (commentId: string, text: string) => void;
  onUpload?: (file: File) => void;
}

export const DeliverableVideoSection: React.FC<DeliverableVideoSectionProps> = ({
  deliverable,
  canRequestRevision,
  canComment,
  canUploadBeta,
  comments,
  onAddComment,
  onRemoveComment,
  onUpdateComment,
  onUpload,
}) => {
  const [generatedUrl, setGeneratedUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const loadUrl = async () => {
      // Determine if we need to generate a URL
      const isFinal = deliverable.status === 'final_delivered';
      const key = isFinal
        ? deliverable.finalFileKey || deliverable.betaFileKey
        : deliverable.betaFileKey;

      if (!key) return;

      try {
        if (isFinal) {
          // Final files are typically public or handled differently, but try public first or presign
          // If we have a direct URL, use it (handled below), otherwise key
          const url = storageService.getPublicUrl(key);
          setGeneratedUrl(url);
        } else {
          // Beta files need presigned URL
          const url = await storageService.getDownloadUrl(key);
          setGeneratedUrl(url);
        }
      } catch (e) {
        console.error("Failed to load file URL", e);
      }
    };
    loadUrl();
  }, [deliverable.betaFileKey, deliverable.finalFileKey, deliverable.status]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      onUpload(file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isFinalDelivered = deliverable.status === 'final_delivered';
  const fileUrl = generatedUrl || (isFinalDelivered
    ? deliverable.finalFileUrl || deliverable.betaFileUrl
    : deliverable.betaFileUrl);

  // Detect actual media type from file key (not the static deliverable.type)
  const fileKey = isFinalDelivered
    ? deliverable.finalFileKey || deliverable.betaFileKey
    : deliverable.betaFileKey;
  const detectedMediaType = detectMediaTypeFromKey(fileKey);

  return (
    <div className="space-y-6">
      {/* Media Preview: Video, Image, or Empty State */}
      {fileUrl && detectedMediaType === 'video' ? (
        canComment ? (
          // Interactive commenting enabled for users with comment permissions
          <VideoCommentTimeline
            videoUrl={fileUrl}
            comments={comments}
            onAddComment={onAddComment}
            onRemoveComment={onRemoveComment}
            onUpdateComment={onUpdateComment}
            className="w-full"
          />
        ) : (
          // View-only mode for users without comment permissions
          <VideoPlayer
            src={fileUrl}
            watermarked={deliverable.watermarked && !isFinalDelivered}
            className="w-full aspect-video"
            comments={deliverable.approvalHistory.flatMap((a) => a.timestampedComments || [])}
          />
        )
      ) : fileUrl && detectedMediaType === 'image' ? (
        // Image preview
        <div className="relative w-full rounded-lg overflow-hidden bg-muted border border-border">
          <img
            src={fileUrl}
            alt={deliverable.title}
            className="w-full h-auto max-h-[70vh] object-contain"
          />
          {deliverable.watermarked && !isFinalDelivered && (
            <div className="absolute top-2 right-2 bg-amber-500/80 text-white text-xs font-medium px-2 py-1 rounded">
              BETA - Watermarked
            </div>
          )}
        </div>
      ) : (
        <div className="w-full aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border">
          {detectedMediaType === 'image' ? (
            <FileImage className="h-16 w-16 text-muted-foreground" />
          ) : (
            <FileVideo className="h-16 w-16 text-muted-foreground" />
          )}

          {canUploadBeta && onUpload ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">No file uploaded yet</p>
              <button
                onClick={handleUploadClick}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors flex items-center gap-2 mx-auto"
              >
                Upload your first file
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept="video/*,image/*,application/pdf"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No content available</p>
          )}
        </div>
      )}

      {/* Video Metadata Cards */}
      <div className="grid grid-cols-3 gap-4">
        {deliverable.duration && (
          <div className="bg-muted border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Duration
              </span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {deliverable.duration}
            </p>
          </div>
        )}
        {deliverable.format && (
          <div className="bg-muted border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <FileVideo className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Format
              </span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {deliverable.format}
            </p>
          </div>
        )}
        {deliverable.resolution && (
          <div className="bg-muted border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Maximize2 className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Resolution
              </span>
            </div>
            <p className="text-lg font-bold text-foreground font-mono">
              {deliverable.resolution}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
