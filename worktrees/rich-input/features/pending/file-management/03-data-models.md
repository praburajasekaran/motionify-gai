# Data Models: File Management

This document defines all TypeScript interfaces and types for the File Management feature.

## Table of Contents

1. [Core File Model](#core-file-model)
2. [Upload Models](#upload-models)
3. [Download Models](#download-models)
4. [List Models](#list-models)
5. [Supporting Types](#supporting-types)
6. [Relationships](#relationships)
7. [Validation Rules](#validation-rules)

**Important:** `FileComment` model is defined in `feedback-and-revisions/03-data-models.md` - import from there.

---

## Core File Model

The primary file entity representing uploaded files linked to deliverables.

```typescript
export interface File {
  // Core Identification
  id: string;                           // UUID
  createdAt: Date;
  updatedAt: Date;

  // File Metadata
  fileName: string;                     // Original filename
  fileSize: number;                     // Size in bytes
  mimeType: string;                     // MIME type (e.g., "video/mp4")
  description?: string;                 // Optional file description

  // Storage (Cloudflare R2)
  storageKey: string;                   // R2 object key (path in bucket)
  storageUrl: string;                   // Base R2 URL (without presigned params)

  // Relationships
  projectId: string;                    // UUID of parent project
  deliverableId: string;                // UUID of associated deliverable
  uploadedBy: string;                   // UUID of user who uploaded

  // Deliverable-Specific Fields
  fileType?: FileType;                  // 'beta' | 'final' | 'other'
  isWatermarked: boolean;               // Whether file has watermark

  // Access Control
  expiresAt?: Date;                     // Access expiry (365 days after final delivery)
  isAccessible: boolean;                // Computed: expiresAt > now

  // Optional Tracking
  downloadCount?: number;               // Number of times downloaded
  lastDownloadedAt?: Date;              // Last download timestamp
  lastDownloadedBy?: string;            // UUID of last downloader
  commentCount?: number;                // Number of FileComments (import from feedback-and-revisions)

  // Relationships (populated)
  uploader?: User;                      // Populated uploader details
  deliverable?: Deliverable;            // Populated deliverable details
}
```

### FileType Enum

```typescript
export type FileType =
  | 'beta'        // Beta version (for approval)
  | 'final'       // Final approved version
  | 'other';      // General project files
```

---

## Upload Models

### UploadUrlRequest

Request to generate presigned URL for file upload.

```typescript
export interface UploadUrlRequest {
  projectId: string;                    // UUID of project
  deliverableId: string;                // UUID of deliverable to link file to
  fileName: string;                     // Original filename
  fileSize: number;                     // Size in bytes (max 500MB)
  contentType: string;                  // MIME type
}
```

### UploadUrlResponse

Response containing presigned upload URL.

```typescript
export interface UploadUrlResponse {
  uploadUrl: string;                    // Presigned R2 URL for direct upload
  fileId: string;                       // Pre-generated file UUID
  expiresIn: number;                    // Seconds until URL expires (3600)
  storageKey: string;                   // R2 object key for this file
}
```

### RegisterFileRequest

Request to register uploaded file in database after R2 upload completes.

```typescript
export interface RegisterFileRequest {
  fileId: string;                       // UUID from UploadUrlResponse
  description?: string;                 // Optional file description
}
```

### RegisterFileResponse

Response after successful file registration.

```typescript
export interface RegisterFileResponse {
  file: File;                           // Complete file object
  activity: Activity;                   // Activity log entry
}
```

---

## Download Models

### DownloadUrlResponse

Response containing presigned download URL.

```typescript
export interface DownloadUrlResponse {
  downloadUrl: string;                  // Presigned R2 URL for download
  expiresIn: number;                    // Seconds until URL expires (3600)
  fileName: string;                     // Original filename for download
  fileSize: number;                     // File size in bytes
  mimeType: string;                     // MIME type
}
```

---

## List Models

### FileListRequest

Query parameters for listing files.

```typescript
export interface FileListRequest {
  projectId: string;                    // Required: project to list files for
  deliverableId?: string;               // Optional: filter by deliverable
  search?: string;                      // Optional: search filename
  sortBy?: FileSortOption;              // Optional: sort field
  sortOrder?: 'asc' | 'desc';           // Optional: sort direction
  page?: number;                        // Optional: page number (default 1)
  limit?: number;                       // Optional: items per page (default 50)
}
```

### FileSortOption

```typescript
export type FileSortOption =
  | 'uploadDate'      // Sort by uploaded_at
  | 'fileName'        // Sort by file_name alphabetically
  | 'fileSize'        // Sort by file_size
  | 'downloadCount';  // Sort by download_count
```

### FileListResponse

Response containing list of files grouped by deliverable.

```typescript
export interface FileListResponse {
  files: FileWithDetails[];             // Array of files with populated data
  totalCount: number;                   // Total matching files
  page: number;                         // Current page
  totalPages: number;                   // Total pages
  deliverableGroups?: DeliverableFileGroup[];  // Files grouped by deliverable
}
```

### FileWithDetails

File with populated relationships and metadata.

```typescript
export interface FileWithDetails extends File {
  uploadedBy: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  deliverable: {
    id: string;
    name: string;
    status: string;
  };
  // commentCount inherited from File interface
}
```

### DeliverableFileGroup

Files grouped by deliverable for UI organization.

```typescript
export interface DeliverableFileGroup {
  deliverable: {
    id: string;
    name: string;
    status: string;
    displayOrder: number;
  };
  files: FileWithDetails[];
  fileCount: number;
}
```

---

## Supporting Types

### File Size Constraints

```typescript
export const FILE_CONSTRAINTS = {
  MAX_SIZE_BYTES: 500 * 1024 * 1024,    // 500MB
  MAX_SIZE_MB: 500,
  CONCURRENT_UPLOADS: 5,                // Max simultaneous uploads
  PRESIGNED_URL_EXPIRY: 3600,           // 1 hour in seconds
  FILE_ACCESS_RETENTION_DAYS: 365,      // 365 days after final delivery
} as const;

// Storage Strategy Notes:
// - Using CloudFlare R2 for file storage
// - Can upgrade to paid plan if needed (current: 500MB limit per file, free tier: 5GB total)
// - Files are automatically expired 365 days after final delivery
// - Consider file compression/optimization for large files
// - Admin alert recommended at 80% storage capacity
```

### Supported MIME Types

```typescript
export const SUPPORTED_MIME_TYPES = {
  // Videos
  VIDEO_MP4: 'video/mp4',
  VIDEO_MOV: 'video/quicktime',
  VIDEO_AVI: 'video/x-msvideo',
  VIDEO_MKV: 'video/x-matroska',

  // Images
  IMAGE_JPEG: 'image/jpeg',
  IMAGE_PNG: 'image/png',
  IMAGE_GIF: 'image/gif',
  IMAGE_SVG: 'image/svg+xml',

  // Documents
  DOC_PDF: 'application/pdf',
  DOC_DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  DOC_XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  // Archives
  ARCHIVE_ZIP: 'application/zip',
  ARCHIVE_RAR: 'application/x-rar-compressed',
  ARCHIVE_7Z: 'application/x-7z-compressed',

  // Audio
  AUDIO_MP3: 'audio/mpeg',
  AUDIO_WAV: 'audio/wav',
} as const;
```

### File Type Icons

```typescript
export const FILE_TYPE_ICONS = {
  video: '🎬',
  image: '📷',
  document: '📄',
  design: '🎨',
  archive: '📦',
  audio: '🎵',
  other: '📎',
} as const;

export function getFileTypeIcon(mimeType: string): string {
  if (mimeType.startsWith('video/')) return FILE_TYPE_ICONS.video;
  if (mimeType.startsWith('image/')) return FILE_TYPE_ICONS.image;
  if (mimeType.startsWith('audio/')) return FILE_TYPE_ICONS.audio;
  if (mimeType.includes('pdf') || mimeType.includes('document')) return FILE_TYPE_ICONS.document;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return FILE_TYPE_ICONS.archive;
  return FILE_TYPE_ICONS.other;
}
```

### Upload Status

```typescript
export type UploadStatus =
  | 'queued'          // Waiting to start
  | 'uploading'       // Currently uploading
  | 'processing'      // Registering in database
  | 'complete'        // Successfully uploaded
  | 'failed'          // Upload failed
  | 'cancelled';      // User cancelled upload

export interface UploadProgress {
  fileId: string;
  fileName: string;
  fileSize: number;
  bytesUploaded: number;
  percentage: number;               // 0-100
  status: UploadStatus;
  error?: string;                   // Error message if failed
  estimatedTimeRemaining?: number;  // Seconds
}
```

---

## Relationships

### Entity Relationship Diagram

```
┌──────────────┐
│   Project    │
└──────┬───────┘
       │
       │ 1:N
       │
       ↓
┌──────────────┐
│ Deliverable  │
└──────┬───────┘
       │
       │ 1:N
       │
       ↓
┌──────────────┐        ┌──────────────┐
│     File     │───────→│     User     │
└──────┬───────┘  N:1   └──────────────┘
       │               (uploaded_by)
       │
       │ 1:N (optional)
       │
       ↓
┌──────────────┐
│ FileComment  │ (US-019 - Future)
└──────────────┘
```

### Detailed Relationships

```typescript
// File belongs to one Project
File.projectId → Project.id (CASCADE on delete)

// File belongs to one Deliverable
File.deliverableId → Deliverable.id (RESTRICT on delete)
// RESTRICT ensures deliverables with files cannot be deleted

// File uploaded by one User
File.uploadedBy → User.id (SET NULL on delete)
// Preserve file even if uploader deleted

// File can have many Comments (Future)
File.id ← FileComment.fileId (CASCADE on delete)
```

---

## Validation Rules

### File Upload Validation

| Field | Required | Validation | Error Message |
|-------|----------|------------|---------------|
| `fileName` | Yes | Min 1 char, max 255 chars | "File name is required" |
| `fileSize` | Yes | Max 500MB (524288000 bytes) | "File exceeds 500MB limit" |
| `contentType` | Yes | Valid MIME type string | "Invalid file type" |
| `projectId` | Yes | Valid UUID, project exists | "Invalid project" |
| `deliverableId` | Yes | Valid UUID, deliverable exists | "Invalid deliverable" |
| `description` | No | Max 1000 chars | "Description too long" |

### Validation Schemas (Zod)

```typescript
import { z } from 'zod';

export const UploadUrlRequestSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  deliverableId: z.string().uuid('Invalid deliverable ID'),
  fileName: z.string().min(1).max(255, 'File name must be 255 characters or less'),
  fileSize: z.number()
    .positive('File size must be positive')
    .max(FILE_CONSTRAINTS.MAX_SIZE_BYTES, `File size must not exceed ${FILE_CONSTRAINTS.MAX_SIZE_MB}MB`),
  contentType: z.string().min(1, 'Content type is required'),
});

export const RegisterFileRequestSchema = z.object({
  fileId: z.string().uuid('Invalid file ID'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
});

export const FileListRequestSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  deliverableId: z.string().uuid().optional(),
  search: z.string().max(255).optional(),
  sortBy: z.enum(['uploadDate', 'fileName', 'fileSize', 'downloadCount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});
```

### Frontend Validation

```typescript
export function validateFileBeforeUpload(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > FILE_CONSTRAINTS.MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `File "${file.name}" (${formatFileSize(file.size)}) exceeds the maximum size limit of ${FILE_CONSTRAINTS.MAX_SIZE_MB}MB.`,
    };
  }

  // Check filename length
  if (file.name.length > 255) {
    return {
      valid: false,
      error: 'File name must be 255 characters or less.',
    };
  }

  // Check file has extension
  if (!file.name.includes('.')) {
    return {
      valid: false,
      error: 'File must have a file extension.',
    };
  }

  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// Utility function to check if file is still accessible (not expired)
export function isFileAccessible(file: File): boolean {
  // If no expiry date set, file is accessible
  if (!file.expiresAt) {
    return true;
  }
  
  // Check if current date is before expiry
  return new Date() < new Date(file.expiresAt);
}

// Utility function to calculate expiry date (365 days from final delivery)
export function calculateFileExpiry(finalDeliveryDate: Date): Date {
  const expiry = new Date(finalDeliveryDate);
  expiry.setDate(expiry.getDate() + FILE_CONSTRAINTS.FILE_ACCESS_RETENTION_DAYS);
  return expiry;
}
```

---

## Example Data

### Sample File Instance

```typescript
const sampleFile: FileWithDetails = {
  // Core Identification
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  createdAt: new Date("2025-11-16T14:34:22Z"),
  updatedAt: new Date("2025-11-16T14:34:22Z"),

  // File Metadata
  fileName: "Rough-Cut-v2.mp4",
  fileSize: 149456896,  // ~142.5 MB
  mimeType: "video/mp4",
  description: "Latest rough cut with music and voiceover",

  // Storage
  storageKey: "projects/550e8400-e29b-41d4-a716-446655440000/files/a1b2c3d4-e5f6-7890-abcd-ef1234567890.mp4",
  storageUrl: "https://motionify-files.r2.cloudflarestorage.com/projects/550e8400-e29b-41d4-a716-446655440000/files/a1b2c3d4-e5f6-7890-abcd-ef1234567890.mp4",

  // Relationships
  projectId: "550e8400-e29b-41d4-a716-446655440000",
  deliverableId: "660e8400-e29b-41d4-a716-446655440003",
  uploadedBy: "770e8400-e29b-41d4-a716-446655440002",

  // Deliverable-Specific
  fileType: "beta",
  isWatermarked: true,

  // Access Control
  expiresAt: new Date("2026-11-16T14:34:22Z"),  // 365 days after final delivery
  isAccessible: true,

  // Tracking
  downloadCount: 8,
  lastDownloadedAt: new Date("2025-11-17T09:12:00Z"),
  lastDownloadedBy: "880e8400-e29b-41d4-a716-446655440005",

  // Populated Relationships
  uploader: {
    id: "770e8400-e29b-41d4-a716-446655440002",
    name: "Mike Chen",
    email: "mike@motionify.com",
    avatar: "https://avatar.example.com/mike.jpg",
  },
  deliverable: {
    id: "660e8400-e29b-41d4-a716-446655440003",
    name: "Rough Cut",
    status: "awaiting_approval",
  },
  commentCount: 12,
};
```

### Sample Upload URL Response

```typescript
const sampleUploadUrlResponse: UploadUrlResponse = {
  uploadUrl: "https://motionify-files.r2.cloudflarestorage.com/projects/550e8400.../files/a1b2c3d4...?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...",
  fileId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  expiresIn: 3600,
  storageKey: "projects/550e8400-e29b-41d4-a716-446655440000/files/a1b2c3d4-e5f6-7890-abcd-ef1234567890.mp4",
};
```

### Sample File List Response

```typescript
const sampleFileListResponse: FileListResponse = {
  files: [sampleFile],
  totalCount: 45,
  page: 1,
  totalPages: 1,
  deliverableGroups: [
    {
      deliverable: {
        id: "660e8400-e29b-41d4-a716-446655440001",
        name: "Script & Concept",
        status: "approved",
        displayOrder: 1,
      },
      files: [/* 8 files */],
      fileCount: 8,
    },
    {
      deliverable: {
        id: "660e8400-e29b-41d4-a716-446655440002",
        name: "Storyboard",
        status: "in_progress",
        displayOrder: 2,
      },
      files: [/* 12 files */],
      fileCount: 12,
    },
  ],
};
```
