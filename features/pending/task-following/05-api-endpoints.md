# API Endpoints: Task Following System

This document specifies all REST API endpoints for the Task Following System.

## Base URL

```
Production: https://portal.motionify.studio
Development: http://localhost:3000
```

## Authentication

- All endpoints require JWT token in `Authorization: Bearer <token>` header
- User must be a member of the project containing the task

## Table of Contents

1. [Follow Management Endpoints](#follow-management-endpoints)
2. [Error Responses](#error-responses)
3. [Workflow Examples](#workflow-examples)

---

## Follow Management Endpoints

### 1. Follow a Task

User follows a task to receive notifications.

```
POST /api/tasks/:taskId/follow
```

**Authentication:** Required (project member)

**Path Parameters:**
- `taskId` (required): UUID of the task

**Request Body:** None (user ID comes from JWT)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "follower": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "taskId": "660e8400-e29b-41d4-a716-446655440001",
      "userId": "770e8400-e29b-41d4-a716-446655440002",
      "followedVia": "manual",
      "notificationsEnabled": true,
      "createdAt": "2025-11-13T10:30:00Z"
    },
    "followerCount": 6
  },
  "message": "You are now following this task"
}
```

**Side Effects:**
- Creates `task_followers` record
- Logs activity: "[User] started following this task"
- User receives future notifications for task updates

**Error Responses:**
- `400 Bad Request`: Already following this task
- `403 Forbidden`: Not a member of this project
- `404 Not Found`: Task not found

---

### 2. Unfollow a Task

User stops following a task.

```
DELETE /api/tasks/:taskId/follow
```

**Authentication:** Required

**Path Parameters:**
- `taskId` (required): UUID of the task

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "followerCount": 4
  },
  "message": "You have unfollowed this task"
}
```

**Side Effects:**
- Deletes `task_followers` record
- Logs activity: "[User] stopped following this task"
- User stops receiving notifications

**Error Responses:**
- `400 Bad Request`: Not currently following this task
- `404 Not Found`: Task not found

---

### 3. Get Task Followers

Get list of all users following a task.

```
GET /api/tasks/:taskId/followers
```

**Authentication:** Required (project member)

**Path Parameters:**
- `taskId` (required): UUID of the task

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "followers": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "name": "Sarah Johnson",
        "email": "sarah@example.com",
        "role": "project_manager",
        "avatar": "https://example.com/avatars/sarah.jpg",
        "isAssignee": true,
        "followedAt": "2025-11-12T09:00:00Z",
        "followSource": "auto_assigned"
      },
      {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "name": "John Doe",
        "email": "john@client.com",
        "role": "client",
        "avatar": null,
        "isAssignee": false,
        "followedAt": "2025-11-13T10:30:00Z",
        "followSource": "manual"
      }
    ],
    "count": 5
  }
}
```

**Side Effects:**
- None (read-only)

**Error Responses:**
- `403 Forbidden`: Not a member of this project
- `404 Not Found`: Task not found

---

## Error Responses

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "field": "fieldName"
  }
}
```

### Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `ALREADY_FOLLOWING` | User is already following this task |
| 400 | `NOT_FOLLOWING` | User is not currently following this task |
| 401 | `UNAUTHORIZED` | Missing/invalid auth token |
| 403 | `FORBIDDEN_NOT_PROJECT_MEMBER` | User not a member of project |
| 404 | `TASK_NOT_FOUND` | Task doesn't exist |
| 500 | `INTERNAL_ERROR` | Server error |

---

## Workflow Examples

### Example 1: User Follows a Task

```bash
# User views task detail page
GET /api/tasks/660e8400-e29b-41d4-a716-446655440001
→ Returns: { isFollowedByCurrentUser: false, followerCount: 5 }

# User clicks "Follow" button
POST /api/tasks/660e8400-e29b-41d4-a716-446655440001/follow
→ Returns: { followerCount: 6, message: "You are now following this task" }

# Result: User receives notifications for future task updates
```

### Example 2: View Followers List

```bash
# User clicks on follower count
GET /api/tasks/660e8400-e29b-41d4-a716-446655440001/followers
→ Returns: { followers: [...], count: 6 }

# Result: Popover shows list of all followers
```

### Example 3: User Unfollows a Task

```bash
# User clicks "Following" button
# Frontend shows confirmation: "Stop following this task?"

# User confirms
DELETE /api/tasks/660e8400-e29b-41d4-a716-446655440001/follow
→ Returns: { followerCount: 5, message: "You have unfollowed this task" }

# Result: User stops receiving notifications
```

---

## Implementation Notes

### Performance Optimization

- **Caching:** Follower counts cached for 5 minutes
- **Batch queries:** When fetching multiple tasks, batch-load follower counts
- **Indexes:** Composite index on (user_id, task_id) for fast lookups

### Rate Limiting

- **Follow/Unfollow:** 60 requests per minute per user
- **Get Followers:** 120 requests per minute per user

### Real-time Updates (Optional)

WebSocket events for live follower count updates:

```javascript
// Subscribe to task follower updates
socket.on(`task:${taskId}:followers`, (data) => {
  // data: { followerCount: 7 }
  updateFollowerCountUI(data.followerCount);
});
```
