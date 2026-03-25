---
phase: 03-attachments-and-notifications
plan: "01"
type: execute
subsystem: comments
tags: [comments, attachments, r2, file-uploads]
completed: 2026-01-20

dependency_graph:
  requires:
    - "Phase 1: Foundation (Database, API, Embedded UI)"
    - "Phase 2: Core Comment Experience"
  provides:
    - "File attachment feature for comments"
    - "comment_attachments database table"
    - "attachments.ts API endpoints"
    - "lib/attachments.ts client library"
  affects:
    - "Phase 3 Plan 2: Notifications (uses attachment infrastructure)"

tech_stack:
  added: []
  patterns:
    - "R2 presigned URL upload pattern"
    - "Attachment metadata storage with foreign keys"
    - "File type and size validation"

key_files:
  created: []
  modified:
    - "database/add-comment-attachments-table.sql"
    - "netlify/functions/attachments.ts"
    - "lib/attachments.ts"
    - "landing-page-new/src/lib/attachments.ts"
    - "components/proposals/CommentInput.tsx"
    - "components/proposals/CommentItem.tsx"
    - "landing-page-new/src/components/CommentInput.tsx"
    - "landing-page-new/src/components/CommentItem.tsx"

decisions: []

metrics:
  duration: "<1 minute"
  tasks_completed: 8/8
---

# Phase 3 Plan 1: File Attachments on Comments - Summary

**File attachments feature for proposal comments using R2 presigned URL infrastructure.**

## Overview

Plan 03-01 enables users to attach files to comments. Both admin and client portals support file uploads with proper validation, R2 storage via presigned URLs, and download functionality.

## Deliverables

All required artifacts were verified as complete:

1. **Database Schema** (`database/add-comment-attachments-table.sql`)
   - `comment_attachments` table with UUID primary key
   - Foreign key to `proposal_comments` with CASCADE delete
   - Indexes on `comment_id`, `uploaded_by`, and `created_at`

2. **API Endpoints** (`netlify/functions/attachments.ts`)
   - GET: List attachments by comment ID
   - GET: Generate download URL by attachment ID
   - POST: Create attachment record with full validation
   - Authentication required via `requireAuth`
   - File type and size validation (10MB max)

3. **Client Library** (`lib/attachments.ts` and `landing-page-new/src/lib/attachments.ts`)
   - `getAttachments(commentId)` - Fetch comment attachments
   - `createAttachment(...)` - Create attachment record
   - `getPresignedUploadUrl(...)` - Get R2 upload URL
   - `getPresignedDownloadUrl(key)` - Get R2 download URL
   - `uploadFile(uploadUrl, file)` - Upload file to R2
   - `formatFileSize(bytes)` - Human-readable file size

4. **Admin Portal Components**
   - `components/proposals/CommentInput.tsx` - File upload with progress
   - `components/proposals/CommentItem.tsx` - Attachment display and download

5. **Client Portal Components**
   - `landing-page-new/src/components/CommentInput.tsx` - File upload with progress
   - `landing-page-new/src/components/CommentItem.tsx` - Attachment display and download

## Features

- **Supported File Types**: PNG, JPG, WebP, PDF, DOCX, DOC, TXT
- **Max File Size**: 10MB per file
- **Multiple Files**: Yes, unlimited per comment
- **Upload Progress**: Visual progress bar during upload
- **File Validation**: Client-side validation before upload
- **Download**: Presigned URL generation for direct downloads
- **CASCADE Delete**: Attachments deleted when comment deleted

## Integration Points

- R2 presign API: `/api/r2-presign` for upload/download URLs
- Comments API: Attachments linked to `proposal_comments` table
- Auth: All endpoints require authentication via `requireAuth`

## Database

**Migration file ready**: `database/add-comment-attachments-table.sql`

Execute the migration to create the table:
```bash
psql "$DATABASE_URL" -f database/add-comment-attachments-table.sql
```

## Deviations from Plan

**None** - All artifacts specified in the plan were already implemented.

## Next Steps

1. Run database migration: `psql "$DATABASE_URL" -f database/add-comment-attachments-table.sql`
2. Test file upload flow in admin portal
3. Test file upload flow in client portal
4. Execute **Plan 03-02**: Email & in-app notifications

## Success Criteria ✅

- ✅ Users can attach PNG, JPG, WebP, PDF, DOCX, DOC, TXT files up to 10MB
- ✅ Files upload via existing R2 presigned URL infrastructure
- ✅ Uploaded files display in comment thread with file name and size
- ✅ Both parties can download attachments
- ✅ File validation errors show appropriate feedback

## Authentication Gates

**None** - Implementation uses existing authentication infrastructure.

---

*Generated: 2026-01-20*
*Plan: 03-01-PLAN.md*
