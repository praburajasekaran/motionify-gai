# File Management

> **Version:** 1.0
> **Status:** MVP Development Phase
> **Last Updated:** November 15, 2025

## Overview

The File Management system enables secure upload, download, and organization of project assets using Cloudflare R2 storage. All files are linked to specific deliverables, creating a structured repository of project materials accessible to authorized team members.

## Customer Journey Summary

```
Upload → Link to Deliverable → Store in R2 → Download When Needed → Auto-Expire After 365 Days
```

## Key Benefits

- **Organized Asset Management** - All files linked to specific deliverables, no orphaned assets
- **Secure Direct Upload** - Presigned URLs enable client-side uploads directly to R2, bypassing backend bottlenecks
- **Access Control** - Role-based permissions ensure only authorized team members can access files
- **Automatic Cleanup** - Files automatically expire 365 days after final delivery, reducing storage costs

## Documentation Structure

This feature is documented across multiple files for modularity and ease of review:

### 1. [User Journey](./01-user-journey.md)
Complete workflow including:
- Step-by-step customer journey
- State transition diagrams
- Workflow decision points
- Automation triggers

### 2. [Wireframes](./02-wireframes.md)
ASCII wireframes for all screens:
- **Files Tab** - Deliverable-based file organization
- **Upload Modal** - Drag-drop interface with deliverable selection
- **File Viewer** - Preview and download interface

### 3. [Data Models](./03-data-models.md)
TypeScript interfaces for:
- `File` - Core file metadata
- `UploadUrlRequest` - Presigned URL generation
- `FileListResponse` - Deliverable-grouped file lists

### 4. [Database Schema](./04-database-schema.sql)
SQL table definitions for:
- `files` - File metadata and R2 references
- `file_comments` - File discussion threads (future)

### 5. [API Endpoints](./05-api-endpoints.md)
REST API specifications:
- 4 file management endpoints
- Presigned URL generation for uploads/downloads
- Deliverable-filtered file listing

### 6. [Email Templates](./06-email-templates.md)
Notification specifications:
- 1 team notification template (file uploaded)

### 7. [Test Cases](./07-test-cases.md)
Comprehensive test scenarios covering:
- Upload flows (single/multiple, large files)
- Download permissions and expiry
- Deliverable organization and search

## Technical Requirements

### Frontend
- Upload modal with drag-drop (US-015)
- File list with deliverable tabs (US-017)
- Download buttons with progress indicators (US-016)
- File search and sort controls (US-017)
- ✅ **Existing:** `/src/lib/portal/components/FileItem.tsx`

### Backend
- `POST /api/files/upload-url` - Generate presigned R2 upload URL
- `POST /api/files` - Register uploaded file metadata
- `GET /api/files/:id/download-url` - Generate presigned R2 download URL
- `GET /api/projects/:id/files` - List files with deliverable filtering
- `PATCH /api/files/:id` - Update file metadata (move between deliverables)

### Infrastructure
- Cloudflare R2 bucket: `motionify-files`
- Presigned URL generation (1 hour expiry)
- CORS configuration for direct uploads
- File size limit: 500MB per file
- Retention: 365 days after final delivery

## Implementation Phases

1. **Phase 1 (MVP - Weeks 3-4):** Basic upload/download with R2 integration
   - Upload files to deliverables
   - Download files via presigned URLs
   - List files grouped by deliverable

2. **Phase 2 (Post-MVP - Week 8):** Enhanced Organization
   - Drag-drop file reassignment (US-017)
   - Advanced search and filtering
   - File type icons and previews

3. **Phase 3 (Future):** Advanced Features
   - File comments (US-019)
   - File renaming (US-018)
   - Version history
   - Bulk operations

**Estimated Timeline:** 2-3 weeks (MVP), +1-2 weeks (enhancements)

## Success Metrics

- **Upload Success Rate** - >99% of uploads complete successfully
- **Download Performance** - <2s to generate presigned URL
- **Storage Efficiency** - 90% of files linked to deliverables (no orphans)
- **User Adoption** - Average 10+ files per project

## Related Documentation

- [User Stories](/docs/user-stories.md) - US-015, US-016, US-017, US-018, US-019
- [API Documentation](/docs/api-documentation.md) - File Management endpoints
- [Cloudflare R2 Setup](/docs/setup-cloudflare-r2.md) - Infrastructure configuration
- [Deliverable Approval Feature](/features/deliverable-approval/README.md) - Related workflow

## Questions or Feedback?

For questions about this feature specification, contact the product team.
