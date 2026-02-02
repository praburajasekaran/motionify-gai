/**
 * FileUploadZone Component
 *
 * Drag-and-drop file upload area for reference attachments.
 * Supports images, documents, and videos up to 10MB total (max 5 files).
 */

import React, { useRef, useState } from 'react';
import { Upload, X, FileText, FileImage, FileVideo2, Paperclip } from 'lucide-react';
import { cn, Button } from '../ui/design-system';
import { FeedbackAttachment } from '../../types/deliverable.types';

export interface FileUploadZoneProps {
  attachments: FeedbackAttachment[];
  onAddAttachment: (file: FeedbackAttachment) => void;
  onRemoveAttachment: (fileId: string) => void;
  className?: string;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach((file) => {
      const attachment: FeedbackAttachment = {
        id: `att-${Date.now()}-${Math.random()}`,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        url: URL.createObjectURL(file), // Local preview URL
        thumbnailUrl: file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : undefined,
        file: file,  // Store raw file for upload to R2
      };

      onAddAttachment(attachment);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return FileImage;
    if (fileType.startsWith('video/')) return FileVideo2;
    return FileText;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const totalSize = attachments.reduce((sum, file) => sum + file.fileSize, 0);
  const maxTotalSize = 10 * 1024 * 1024; // 10MB
  const canUploadMore = attachments.length < 5 && totalSize < maxTotalSize;

  return (
    <div className={cn('space-y-3', className)}>
      <label className="text-sm font-semibold text-foreground">
        Reference Attachments (Optional)
      </label>
      <p className="text-xs text-muted-foreground">
        Upload images, documents, or videos to provide context (max 5 files, 10MB total)
      </p>

      {/* Upload Zone */}
      {canUploadMore && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary hover:bg-muted'
          )}
        >
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            Drop files here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Images, PDFs, videos up to {formatFileSize(maxTotalSize - totalSize)} remaining
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,video/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
        </div>
      )}

      {/* Uploaded Files List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((file) => {
            const FileIcon = getFileIcon(file.fileType);
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg group hover:border-border"
              >
                {/* Thumbnail or Icon */}
                {file.thumbnailUrl ? (
                  <img
                    src={file.thumbnailUrl}
                    alt={file.fileName}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                    <FileIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {file.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.fileSize)}
                  </p>
                </div>

                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveAttachment(file.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Remove ${file.fileName}`}
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            );
          })}

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <span>
              {attachments.length} file{attachments.length !== 1 ? 's' : ''} uploaded
            </span>
            <span>{formatFileSize(totalSize)} total</span>
          </div>
        </div>
      )}
    </div>
  );
};
