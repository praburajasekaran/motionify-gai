# API Endpoints: Feedback & Revisions System

This document specifies all REST API endpoints for comments, revisions, and quota management.

## Base URL

```
Production: https://api.motionify.studio
Development: http://localhost:3000
```

## Authentication

- **Client endpoints**: Require JWT token with project membership
- **Admin endpoints**: Require JWT token with `super_admin` role

## Table of Contents

1. [Task Comments](#task-comments) - 4 endpoints
2. [File Comments](#file-comments) - 4 endpoints
3. [Revision Requests](#revision-requests) - 3 endpoints
4. [Additional Revision Requests](#additional-revision-requests) - 4 endpoints
5. [Error Responses](#error-responses)

---

## Task Comments

### 1. Get Task Comments

```
GET /api/tasks/:taskId/comments
```

**Auth:** Required (project member)

**Query Parameters:**
- `limit`: Number (default: 50, max: 100)
- `offset`: Number (default: 0)

**Response (200 OK):**
```json
{
  "comments": [
    {
      "id": "uuid",
      "text": "Comment text with @mentions",
      "authorId": "uuid",
      "authorName": "John Smith",
      "createdAt": "2025-01-15T14:30:00Z",
      "isEdited": false,
      "mentionedUserIds": ["uuid"]
    }
  ],
  "total": 15,
  "hasMore": false
}
```

---

### 2. Create Task Comment

```
POST /api/tasks/:taskId/comments
```

**Auth:** Required (project member)

**Request Body:**
```json
{
  "text": "Comment text with @JohnDoe mention"
}
```

**Validation:**
- `text`: Required, 1-5000 chars

**Response (201 Created):**
```json
{
  "id": "uuid",
  "text": "Comment text with @JohnDoe mention",
  "authorId": "uuid",
  "createdAt": "2025-01-15T14:30:00Z",
  "mentionedUserIds": ["uuid-of-johndoe"]
}
```

---

### 3. Update Task Comment

```
PATCH /api/tasks/:taskId/comments/:commentId
```

**Auth:** Required (comment author, < 1 hour old)

**Request Body:**
```json
{
  "text": "Updated comment text"
}
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "text": "Updated comment text",
  "isEdited": true,
  "editedAt": "2025-01-15T15:00:00Z"
}
```

---

### 4. Delete Task Comment

```
DELETE /api/tasks/:taskId/comments/:commentId
```

**Auth:** Required (comment author or admin)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Comment deleted"
}
```

---

## File Comments

### 5. Get File Comments

```
GET /api/files/:fileId/comments
```

**Auth:** Required (project member)

**Response:** Same structure as task comments

---

### 6. Create File Comment

```
POST /api/files/:fileId/comments
```

**Auth:** Required (project member)

**Request Body:**
```json
{
  "text": "Comment text",
  "timestamp": "00:42"  // Optional for video/audio
}
```

**Validation:**
- `text`: Required, 1-5000 chars
- `timestamp`: Optional, format HH:MM or MM:SS

**Response (201 Created):**
```json
{
  "id": "uuid",
  "text": "Comment text",
  "timestamp": "00:42",
  "timestampSeconds": 42,
  "createdAt": "2025-01-15T14:30:00Z"
}
```

---

### 7. Update File Comment

Same as Task Comment update (PATCH /api/files/:fileId/comments/:commentId)

---

### 8. Delete File Comment

Same as Task Comment delete (DELETE /api/files/:fileId/comments/:commentId)

---

## Revision Requests

### 9. Get Revision Quota

```
GET /api/projects/:projectId/revisions
```

**Auth:** Required (project member)

**Response (200 OK):**
```json
{
  "total": 3,
  "used": 2,
  "remaining": 1,
  "percentage": 66.67,
  "isExhausted": false,
  "isWarning": true
}
```

---

### 10. Request Revision

```
POST /api/deliverables/:deliverableId/request-revision
```

**Auth:** Required (client PRIMARY_CONTACT)

**Request Body:**
```json
{
  "feedback": "Detailed feedback (min 50 chars)",
  "referenceFileIds": ["uuid1", "uuid2"]  // Optional, max 5
}
```

**Validation:**
- `feedback`: Required, 50-5000 chars
- `referenceFileIds`: Optional array, max 5 UUIDs

**Pre-conditions:**
- Project must have remaining revisions (used < total)
- Deliverable status must be 'awaiting_approval'

**Response (201 Created):**
```json
{
  "id": "uuid",
  "revisionNumber": 3,
  "quotaAfter": {
    "total": 3,
    "used": 3,
    "remaining": 0
  },
  "status": "pending"
}
```

---

### 11. Get Revision History

```
GET /api/projects/:projectId/revisions/history
```

**Auth:** Required (project member)

**Response (200 OK):**
```json
{
  "revisions": [
    {
      "id": "uuid",
      "deliverableId": "uuid",
      "deliverableName": "Final Video",
      "revisionNumber": 1,
      "feedback": "...",
      "requestedAt": "2025-01-10T10:00:00Z",
      "status": "completed"
    }
  ]
}
```

---

## Additional Revision Requests

### 12. Request Additional Revisions

```
POST /api/projects/:projectId/revisions/request-additional
```

**Auth:** Required (client PRIMARY_CONTACT)

**Request Body:**
```json
{
  "requestedCount": 2,
  "reason": "Detailed reason (min 100 chars)"
}
```

**Validation:**
- `requestedCount`: Required, 1-5
- `reason`: Required, 100-2000 chars

**Pre-conditions:**
- Project quota must be exhausted (used >= total)

**Response (201 Created):**
```json
{
  "id": "uuid",
  "status": "pending",
  "requestedCount": 2,
  "quotaSnapshot": {
    "total": 3,
    "used": 3,
    "remaining": 0
  }
}
```

---

### 13. Get Pending Additional Revision Requests (Admin)

```
GET /api/admin/revision-requests/additional
```

**Auth:** Required (admin)

**Query Parameters:**
- `status`: String (pending|approved|declined)

**Response (200 OK):**
```json
{
  "requests": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "projectName": "Acme Corp",
      "requestedCount": 2,
      "reason": "...",
      "requestedBy": "John Smith",
      "createdAt": "2025-01-15T10:00:00Z",
      "status": "pending"
    }
  ]
}
```

---

### 14. Approve Additional Revisions (Admin)

```
PATCH /api/admin/revision-requests/:requestId/approve
```

**Auth:** Required (admin)

**Request Body:**
```json
{
  "approvedCount": 2,  // Can differ from requested
  "internalNotes": "Optional admin notes"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "projectQuota": {
    "total": 5,  // Increased from 3
    "used": 3,
    "remaining": 2
  }
}
```

---

### 15. Decline Additional Revisions (Admin)

```
PATCH /api/admin/revision-requests/:requestId/decline
```

**Auth:** Required (admin)

**Request Body:**
```json
{
  "declineReason": "Reason for declining (required)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Request declined and client notified"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "text",
      "message": "Comment text must be between 1 and 5000 characters"
    }
  ]
}
```

### 403 Forbidden
```json
{
  "error": "Permission denied",
  "message": "Only PRIMARY_CONTACT can request revisions"
}
```

### 409 Conflict
```json
{
  "error": "Quota exhausted",
  "message": "No revisions remaining. Request additional revisions first.",
  "quota": { "total": 3, "used": 3, "remaining": 0 }
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "message": "Maximum 10 comments per minute. Try again in 30 seconds."
}
```
