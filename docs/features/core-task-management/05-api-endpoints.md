# API Endpoints: Core Task Management

This document specifies all REST API endpoints for the Core Task Management feature.

## Base URL

```
Production: https://api.motionify.studio
Development: http://localhost:3000
```

## Authentication

All endpoints require authentication via JWT token in `Authorization: Bearer <token>` header.

## Table of Contents

1. [Task CRUD Endpoints](#task-crud-endpoints)
2. [Task Status Endpoints](#task-status-endpoints)
3. [Assignment Endpoints](#assignment-endpoints)
4. [Follower Endpoints](#follower-endpoints)
5. [Comment Endpoints](#comment-endpoints)
6. [Error Responses](#error-responses)

---

## Task CRUD Endpoints

### 1. Create Task

Create a new task within a project deliverable.

```
POST /api/projects/:projectId/tasks
```

**Authentication:** Required (Motionify team only)

**Request Body:**
```json
{
  "title": "Video editing - Scene 2 color grading",
  "description": "Adjust color grading to match brand guidelines",
  "deliverableId": "550e8400-e29b-41d4-a716-446655440000",
  "visibility": "client_visible",
  "deadline": "2025-11-25T23:59:59Z",
  "initialAssignees": ["user-uuid-1", "user-uuid-2"]
}
```

**Validation:**
- `title`: Required, 1-255 characters
- `description`: Optional, max 10,000 characters, markdown supported
- `deliverableId`: Required, must be valid UUID and exist
- `visibility`: Required, "client_visible" or "internal_only"
- `deadline`: Optional, must be valid ISO date
- `initialAssignees`: Optional, array of user UUIDs

**Response (201 Created):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "deliverableId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Video editing - Scene 2 color grading",
  "description": "Adjust color grading to match brand guidelines",
  "status": "pending",
  "visibility": "client_visible",
  "deadline": "2025-11-25T23:59:59Z",
  "createdAt": "2025-11-15T10:00:00Z",
  "createdBy": "user-uuid",
  "assigneeCount": 2,
  "followerCount": 3
}
```

---

### 2. List Tasks

Get all tasks for a project with filtering and sorting.

```
GET /api/projects/:projectId/tasks
```

**Authentication:** Required

**Query Parameters:**
- `deliverableId`: Filter by deliverable UUID
- `status`: Filter by status(es), comma-separated
- `visibility`: Filter by visibility ("client_visible" or "internal_only")
- `assignedToMe`: Boolean, show only tasks assigned to current user
- `followedByMe`: Boolean, show only tasks followed by current user
- `unassigned`: Boolean, show only unassigned tasks
- `overdue`: Boolean, show only overdue tasks
- `search`: Full-text search on title/description
- `sortBy`: Field to sort by ("created_at", "updated_at", "deadline", "status", "title")
- `sortOrder`: "asc" or "desc" (default: "desc")
- `limit`: Number of results (default: 50, max: 100)
- `offset`: Pagination offset (default: 0)

**Example Request:**
```
GET /api/projects/proj-123/tasks?status=in_progress,awaiting_approval&assignedToMe=true&sortBy=deadline&sortOrder=asc
```

**Response (200 OK):**
```json
{
  "tasks": [
    {
      "id": "task-1",
      "title": "Color grading scene 2",
      "status": "in_progress",
      "visibility": "client_visible",
      "deadline": "2025-11-20T23:59:59Z",
      "isOverdue": false,
      "daysUntilDeadline": 5,
      "assigneeCount": 2,
      "followerCount": 4,
      "commentCount": 3,
      "fileCount": 2,
      "createdAt": "2025-11-10T10:00:00Z",
      "updatedAt": "2025-11-15T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 14,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### 3. Get Task Details

Get full task details with all related data.

```
GET /api/tasks/:taskId
```

**Authentication:** Required

**Response (200 OK):**
```json
{
  "id": "task-1",
  "projectId": "proj-1",
  "deliverableId": "deliv-1",
  "title": "Video editing - Scene 2 color grading",
  "description": "Adjust color grading...",
  "deliveryNotes": "Color grading complete...",
  "deliveryNotesUpdatedAt": "2025-11-15T15:30:00Z",
  "deliveryNotesEditable": true,
  "status": "awaiting_approval",
  "visibility": "client_visible",
  "deadline": "2025-11-18T23:59:59Z",
  "isOverdue": true,
  "daysUntilDeadline": -2,
  "createdAt": "2025-11-10T10:00:00Z",
  "updatedAt": "2025-11-15T15:30:00Z",
  "createdBy": "user-1",
  "assignees": [
    {
      "id": "assign-1",
      "userId": "user-2",
      "userName": "Sarah Johnson",
      "userEmail": "sarah@motionify.studio",
      "userRole": "project_manager",
      "assignedAt": "2025-11-10T10:05:00Z",
      "assignedBy": "user-1",
      "selfAssigned": false
    }
  ],
  "followers": [
    {
      "id": "follow-1",
      "userId": "user-2",
      "userName": "Sarah Johnson",
      "source": "assignment",
      "canUnfollow": false,
      "followedAt": "2025-11-10T10:05:00Z"
    }
  ],
  "currentUserPermissions": {
    "canEdit": true,
    "canDelete": true,
    "canChangeStatus": true,
    "canAssign": true,
    "availableStatusTransitions": ["approved", "revision_requested", "in_progress"]
  }
}
```

---

### 4. Update Task

Update task properties (not status, use separate endpoint for status changes).

```
PATCH /api/tasks/:taskId
```

**Authentication:** Required (Motionify team only)

**Request Body:**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "deadline": "2025-11-30T23:59:59Z",
  "visibility": "internal_only"
}
```

**Validation:**
- All fields optional
- `title`: 1-255 characters if provided
- `description`: Max 10,000 characters
- `deadline`: Valid ISO date or null to clear
- `visibility`: "client_visible" or "internal_only"

**Response (200 OK):**
```json
{
  "id": "task-1",
  "title": "Updated title",
  "updatedAt": "2025-11-15T16:00:00Z",
  ...
}
```

---

### 5. Delete Task

Soft delete a task (admin only).

```
DELETE /api/tasks/:taskId
```

**Authentication:** Required (Admin only)

**Response (204 No Content)**

---

## Task Status Endpoints

### 6. Update Task Status

Change task status with validation and delivery notes.

```
PATCH /api/tasks/:taskId/status
```

**Authentication:** Required

**Request Body:**
```json
{
  "status": "awaiting_approval",
  "deliveryNotes": "Color grading complete. Ready for review.",
  "revisionFeedback": "Please adjust brightness in scene 2"
}
```

**Validation:**
- `status`: Required, must follow state machine rules
- `deliveryNotes`: Required when status → "awaiting_approval" for client-visible tasks
- `revisionFeedback`: Optional, used when status → "revision_requested"

**Business Rules:**
- State transitions validated per state machine
- Role permissions enforced (e.g., only clients can approve)
- Primary contact check for approve/reject actions
- Delivery notes required for client-visible tasks going to "awaiting_approval"

**Response (200 OK):**
```json
{
  "id": "task-1",
  "status": "awaiting_approval",
  "deliveryNotes": "Color grading complete...",
  "awaitingApprovalSince": "2025-11-15T16:00:00Z",
  "updatedAt": "2025-11-15T16:00:00Z"
}
```

**Error Responses:**
```json
{
  "error": "InvalidStatusTransition",
  "message": "Cannot transition from in_progress to completed. Must go through awaiting_approval first.",
  "currentStatus": "in_progress",
  "requestedStatus": "completed"
}
```

---

### 7. Update Delivery Notes

Update delivery notes (within 1-hour edit window).

```
PATCH /api/tasks/:taskId/delivery-notes
```

**Authentication:** Required (Motionify team only)

**Request Body:**
```json
{
  "deliveryNotes": "Updated delivery notes with more details..."
}
```

**Validation:**
- Only editable within 1 hour of initial submission
- Max 5,000 characters

**Response (200 OK):**
```json
{
  "id": "task-1",
  "deliveryNotes": "Updated delivery notes...",
  "deliveryNotesUpdatedAt": "2025-11-15T16:15:00Z",
  "deliveryNotesEditable": true
}
```

---

## Assignment Endpoints

### 8. Assign Users to Task

Add one or more users as assignees.

```
POST /api/tasks/:taskId/assign
```

**Authentication:** Required

**Request Body:**
```json
{
  "userIds": ["user-1", "user-2"]
}
```

**Response (200 OK):**
```json
{
  "taskId": "task-1",
  "assignments": [
    {
      "id": "assign-1",
      "userId": "user-1",
      "userName": "Sarah Johnson",
      "assignedAt": "2025-11-15T16:00:00Z",
      "assignedBy": "current-user-id"
    }
  ]
}
```

---

### 9. Unassign User from Task

Remove a user from task assignments.

```
DELETE /api/tasks/:taskId/assign/:userId
```

**Authentication:** Required

**Response (204 No Content)**

---

## Follower Endpoints

### 10. Follow Task

Start following a task for notifications.

```
POST /api/tasks/:taskId/follow
```

**Authentication:** Required

**Response (200 OK):**
```json
{
  "id": "follow-1",
  "taskId": "task-1",
  "userId": "current-user-id",
  "source": "manual",
  "followedAt": "2025-11-15T16:00:00Z"
}
```

---

### 11. Unfollow Task

Stop following a task (only if can_unfollow = true).

```
DELETE /api/tasks/:taskId/follow
```

**Authentication:** Required

**Response (204 No Content)**

**Error Response (if assigned):**
```json
{
  "error": "CannotUnfollow",
  "message": "Cannot unfollow task while assigned. Remove assignment first."
}
```

---

### 12. List Followers

Get all followers for a task.

```
GET /api/tasks/:taskId/followers
```

**Authentication:** Required

**Response (200 OK):**
```json
{
  "followers": [
    {
      "id": "follow-1",
      "userId": "user-1",
      "userName": "Sarah Johnson",
      "userEmail": "sarah@motionify.studio",
      "source": "assignment",
      "canUnfollow": false,
      "followedAt": "2025-11-10T10:05:00Z"
    }
  ]
}
```

---

## Comment Endpoints

### 13. Add Comment

Post a comment on a task.

```
POST /api/tasks/:taskId/comments
```

**Authentication:** Required

**Request Body:**
```json
{
  "content": "Looks great! @sarah ready for final review.",
  "mentions": ["user-uuid-sarah"]
}
```

**Response (201 Created):**
```json
{
  "id": "comment-1",
  "taskId": "task-1",
  "content": "Looks great! @sarah ready for final review.",
  "mentions": ["user-uuid-sarah"],
  "createdAt": "2025-11-15T16:00:00Z",
  "createdBy": "current-user-id",
  "userName": "John Smith",
  "edited": false
}
```

---

### 14. Update Comment

Edit a comment (by creator only).

```
PATCH /api/tasks/:taskId/comments/:commentId
```

**Authentication:** Required (comment creator only)

**Request Body:**
```json
{
  "content": "Updated comment text..."
}
```

**Response (200 OK):**
```json
{
  "id": "comment-1",
  "content": "Updated comment text...",
  "edited": true,
  "editedAt": "2025-11-15T16:30:00Z",
  "updatedAt": "2025-11-15T16:30:00Z"
}
```

---

### 15. Delete Comment

Soft delete a comment.

```
DELETE /api/tasks/:taskId/comments/:commentId
```

**Authentication:** Required (comment creator or admin)

**Response (204 No Content)**

---

## Error Responses

### Standard Error Format

```json
{
  "error": "ErrorCode",
  "message": "Human-readable error message",
  "details": {
    "field": "validation error details"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `Unauthorized` | 401 | Missing or invalid authentication token |
| `Forbidden` | 403 | User lacks permission for this action |
| `NotFound` | 404 | Resource not found |
| `ValidationError` | 400 | Request validation failed |
| `InvalidStatusTransition` | 400 | Status change not allowed |
| `DeliveryNotesRequired` | 400 | Delivery notes required for this status |
| `CannotUnfollow` | 400 | Cannot unfollow while assigned |
| `EditWindowExpired` | 400 | Cannot edit after time limit |
| `InternalServerError` | 500 | Unexpected server error |

### Example Validation Error

```json
{
  "error": "ValidationError",
  "message": "Request validation failed",
  "details": {
    "title": "Title is required and must be 1-255 characters",
    "deliverableId": "Invalid deliverable ID"
  }
}
```

---

## Rate Limiting

- **Rate Limit:** 1000 requests per hour per user
- **Headers:**
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Timestamp when limit resets

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `limit`: Number of items per page (default: 50, max: 100)
- `offset`: Number of items to skip

**Response Format:**
```json
{
  "items": [...],
  "pagination": {
    "total": 142,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

## Webhooks (Future Enhancement)

Planned webhook events:
- `task.created`
- `task.status_changed`
- `task.assigned`
- `task.commented`
- `task.completed`
