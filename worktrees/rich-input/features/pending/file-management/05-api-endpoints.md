# API Endpoints: File Management

This document specifies all REST API endpoints for File Management (US-015, US-016, US-017).

## Base URL

```
Production: https://api.motionify.studio
Development: http://localhost:3000
```

## Authentication

All file management endpoints require authentication:
- **JWT token** in `Authorization: Bearer <token>` header
- User must be member of the project team

## Table of Contents

1. [Upload Endpoints](#upload-endpoints)
2. [Download Endpoints](#download-endpoints)
3. [List & Organization Endpoints](#list--organization-endpoints)
4. [File Management Endpoints](#file-management-endpoints)
5. [Error Responses](#error-responses)

---

## Upload Endpoints

### 1. Generate Upload URL

**Endpoint**: `POST /api/files/upload-url`

**Description**: Generate presigned URL for direct upload to Cloudflare R2

**Authorization**: All project team members

**Request Body**:
```json
{
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "deliverableId": "660e8400-e29b-41d4-a716-446655440001",
  "fileName": "Rough-Cut-v2.mp4",
  "fileSize": 149456896,
  "contentType": "video/mp4"
}
```

**Validation**:
- `fileSize` must be ≤ 500MB (524,288,000 bytes)
- `fileName` must be 1-255 characters
- User must have access to `projectId`
- `deliverableId` must belong to `projectId`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://motionify-files.r2.cloudflarestorage.com/projects/.../files/...?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
    "fileId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "expiresIn": 3600,
    "storageKey": "projects/550e8400.../files/a1b2c3d4....mp4"
  }
}
```

**Usage Flow**:
1. Frontend calls this endpoint to get presigned URL
2. Frontend uploads file directly to R2 using PUT request to `uploadUrl`
3. Frontend calls `POST /api/files` to register file in database

**Error Responses**:
- `400`: File size exceeds 500MB limit
- `403`: User not authorized for project
- `404`: Project or deliverable not found

---

### 2. Register Uploaded File

**Endpoint**: `POST /api/files`

**Description**: Register uploaded file metadata in database after R2 upload completes

**Authorization**: All project team members

**Request Body**:
```json
{
  "fileId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "description": "Latest rough cut with music and voiceover"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "file": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "fileName": "Rough-Cut-v2.mp4",
      "fileSize": 149456896,
      "mimeType": "video/mp4",
      "description": "Latest rough cut with music and voiceover",
      "projectId": "550e8400-e29b-41d4-a716-446655440000",
      "deliverableId": "660e8400-e29b-41d4-a716-446655440001",
      "uploadedBy": {
        "id": "user-001",
        "name": "Mike Chen",
        "email": "mike@motionify.com"
      },
      "createdAt": "2025-11-16T14:34:22Z",
      "downloadCount": 0
    }
  }
}
```

**Side Effects**:
- Creates file record in database
- Logs activity: `FILE_UPLOADED`
- Sends email notification to project team
- Increments project file count

**Error Responses**:
- `400`: Invalid file ID or file not uploaded to R2
- `404`: File ID not found (expired presigned URL)

---

## Download Endpoints

### 3. Generate Download URL

**Endpoint**: `GET /api/files/:id/download-url`

**Description**: Generate presigned download URL for R2 file

**Authorization**: Project team members only

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://motionify-files.r2.cloudflarestorage.com/projects/.../files/...?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
    "expiresIn": 3600,
    "fileName": "Rough-Cut-v2.mp4",
    "fileSize": 149456896,
    "mimeType": "video/mp4"
  }
}
```

**Side Effects**:
- Increments `download_count`
- Updates `last_downloaded_at` and `last_downloaded_by`
- Logs activity: `FILE_DOWNLOADED` (optional)
- Optional: Creates record in `file_downloads` table

**Security Checks**:
- User must be project team member
- File must not be expired (`expires_at > now`)
- File must not be deleted (`is_deleted = false`)

**Error Responses**:
- `403`: User not authorized or file expired
- `404`: File not found

---

## List & Organization Endpoints

### 4. List Project Files

**Endpoint**: `GET /api/projects/:id/files`

**Description**: Get all files for a project, optionally filtered by deliverable

**Authorization**: Project team members

**Query Parameters**:
- `deliverableId` (UUID, optional): Filter by deliverable
- `search` (string, optional): Search filename
- `sortBy` (string, optional): `uploadDate` | `fileName` | `fileSize` | `downloadCount`
- `sortOrder` (string, optional): `asc` | `desc`
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 50, max: 100)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "file-001",
        "fileName": "Rough-Cut-v2.mp4",
        "fileSize": 149456896,
        "mimeType": "video/mp4",
        "description": "Latest rough cut with music and VO",
        "deliverableId": "deliv-001",
        "deliverableName": "Rough Cut",
        "uploadedBy": {
          "id": "user-001",
          "name": "Mike Chen",
          "avatar": "https://..."
        },
        "uploadedAt": "2025-11-16T14:34:22Z",
        "downloadCount": 8,
        "commentCount": 12,
        "expiresAt": "2026-11-16T14:34:22Z",
        "isAccessible": true
      }
    ],
    "totalCount": 45,
    "page": 1,
    "totalPages": 1,
    "deliverableGroups": [
      {
        "deliverable": {
          "id": "deliv-001",
          "name": "Script & Concept",
          "status": "approved",
          "displayOrder": 1
        },
        "files": [...],
        "fileCount": 8
      }
    ]
  }
}
```

**Performance**:
- Results paginated (max 100 per page)
- Indexed queries on common filters
- Lazy-load file previews separately

---

## File Management Endpoints

### 5. Update File Metadata

**Endpoint**: `PATCH /api/files/:id`

**Description**: Update file metadata (move to different deliverable, update description)

**Authorization**: Motionify team members only (not clients)

**Request Body**:
```json
{
  "deliverableId": "new-deliverable-uuid",
  "description": "Updated description",
  "fileType": "final"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "file": { /* updated file object */ }
  }
}
```

**Side Effects**:
- Updates file record
- Logs activity: `FILE_MOVED` (if deliverable changed)
- Sends notification if moved to different deliverable

**Error Responses**:
- `403`: Clients cannot move files
- `404`: File or deliverable not found

---

### 6. Delete File (Soft Delete)

**Endpoint**: `DELETE /api/files/:id`

**Description**: Soft-delete file (marks as deleted, preserves for data retention)

**Authorization**: Motionify admins or file uploader

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

**Side Effects**:
- Sets `is_deleted = true`
- Logs activity: `FILE_DELETED`
- File remains in R2 but inaccessible via API
- Sends notification to project team

**Data Retention**:
- File metadata retained for 90 days
- R2 file retained for 30 days
- Can be restored by admin within retention period

---

### 7. Get File Details

**Endpoint**: `GET /api/files/:id`

**Description**: Get detailed file information including comments

**Authorization**: Project team members

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "file": {
      "id": "file-001",
      "fileName": "Rough-Cut-v2.mp4",
      "fileSize": 149456896,
      "mimeType": "video/mp4",
      "description": "Latest rough cut",
      "deliverable": {
        "id": "deliv-001",
        "name": "Rough Cut",
        "status": "awaiting_approval"
      },
      "uploadedBy": {
        "id": "user-001",
        "name": "Mike Chen",
        "email": "mike@motionify.com",
        "avatar": "https://..."
      },
      "uploadedAt": "2025-11-16T14:34:22Z",
      "downloadCount": 8,
      "lastDownloadedAt": "2025-11-17T09:12:00Z",
      "expiresAt": "2026-11-16T14:34:22Z",
      "isAccessible": true,
      "comments": [
        {
          "id": "comment-001",
          "userId": "user-002",
          "userName": "Sarah Lee",
          "text": "Love the new music!",
          "createdAt": "2025-11-16T15:15:00Z"
        }
      ]
    }
  }
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File exceeds maximum size of 500MB",
    "details": {
      "maxSize": 524288000,
      "providedSize": 2147483648
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `FILE_TOO_LARGE` | 400 | File exceeds 500MB limit |
| `INVALID_FILE_TYPE` | 400 | Unsupported file type |
| `INVALID_PROJECT` | 404 | Project not found |
| `INVALID_DELIVERABLE` | 404 | Deliverable not found |
| `UNAUTHORIZED` | 403 | User not authorized for project |
| `FILE_NOT_FOUND` | 404 | File not found |
| `FILE_EXPIRED` | 403 | File access has expired |
| `UPLOAD_FAILED` | 500 | R2 upload failed |
| `PRESIGNED_URL_EXPIRED` | 400 | Presigned URL expired (>1 hour old) |
| `DELIVERABLE_NOT_FOUND` | 404 | Specified deliverable doesn't exist |
| `R2_UNAVAILABLE` | 503 | Cloudflare R2 service unavailable |

---

## Rate Limiting

- **Upload URL generation**: 10 requests per minute per user
- **File registration**: 20 requests per minute per user
- **Download URL generation**: 30 requests per minute per user
- **List files**: 60 requests per minute per user

Exceeding rate limits returns `429 Too Many Requests`.

---

## Example Workflows

### Complete Upload Flow

```bash
# 1. Request presigned upload URL
curl -X POST https://api.motionify.studio/api/files/upload-url \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "project-001",
    "deliverableId": "deliv-001",
    "fileName": "rough-cut.mp4",
    "fileSize": 149456896,
    "contentType": "video/mp4"
  }'

# Response: { "uploadUrl": "https://...", "fileId": "file-001", ... }

# 2. Upload file directly to R2
curl -X PUT "https://motionify-files.r2.cloudflarestorage.com/..." \
  -H "Content-Type: video/mp4" \
  --data-binary @rough-cut.mp4

# 3. Register file in database
curl -X POST https://api.motionify.studio/api/files \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "file-001",
    "description": "Latest rough cut with music"
  }'
```

### Download Flow

```bash
# 1. Get presigned download URL
curl -X GET https://api.motionify.studio/api/files/file-001/download-url \
  -H "Authorization: Bearer $TOKEN"

# Response: { "downloadUrl": "https://...", "fileName": "rough-cut.mp4", ... }

# 2. Download file (browser or wget)
wget -O rough-cut.mp4 "https://motionify-files.r2.cloudflarestorage.com/..."
```

### List Files by Deliverable

```bash
curl -X GET "https://api.motionify.studio/api/projects/project-001/files?deliverableId=deliv-001&sortBy=uploadDate&sortOrder=desc" \
  -H "Authorization: Bearer $TOKEN"
```

### Move File to Different Deliverable

```bash
curl -X PATCH https://api.motionify.studio/api/files/file-001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deliverableId": "deliv-002"
  }'
```

---

## Webhook Events (Future)

Potential webhook events for file management:

- `file.uploaded` - File successfully uploaded and registered
- `file.downloaded` - File downloaded by user
- `file.deleted` - File soft-deleted
- `file.expired` - File access expired
- `file.comment.added` - Comment added to file (US-019)

---

## Performance Considerations

### Presigned URLs

- **Expiry**: 1 hour (3600 seconds)
- **Caching**: Not cached (generate fresh for each request)
- **Security**: Includes AWS signature, cannot be reused

### File Listing

- **Pagination**: Default 50 items, max 100
- **Caching**: Cache deliverable groups for 5 minutes
- **Indexes**: Optimized for `project_id`, `deliverable_id`, `created_at`

### Download Tracking

- **Async**: Download count incremented asynchronously
- **Batch**: Download logs batched every 60 seconds
- **Optional**: Full audit trail can be disabled for performance

---

## Security

### Access Control

- User must be project team member (`project_team` table)
- User's `removed_at` must be NULL (not removed from project)
- File `expires_at` must be NULL or > current time
- File `is_deleted` must be false

### Presigned URLs

- Generated using AWS Signature Version 4
- Includes expiry timestamp
- Scoped to specific object key
- Cannot be used for other files

### File Upload

- Frontend validates file size (500MB max)
- Backend validates file size in presigned URL request
- R2 enforces object size limit
- CORS configured for specific origin only

---

## Integration with Other Features

### Deliverable Approval Workflow

- Files linked to deliverables via `deliverable_id`
- Beta files referenced in `deliverables.beta_file_id`
- Final files referenced in `deliverables.final_file_id`
- File expiry auto-set when deliverable finalized

### Activity Feed

- File uploads appear in project activity feed
- File downloads optionally tracked
- File movements logged

### Notifications

- Email sent when file uploaded
- Email sent when file expires soon (30 days before)
- In-app notification for file comments (US-019)
