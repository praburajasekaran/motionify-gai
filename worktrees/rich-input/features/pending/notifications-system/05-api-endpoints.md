# API Endpoints: Notifications System

This document specifies all REST API endpoints for the Notifications System feature.

## Base URL

```
Production: https://portal.motionify.studio
Development: http://localhost:3000
```

## Authentication

- **All endpoints**: Require JWT token in `Authorization: Bearer <token>` header
- **Permission model**: Users can only access their own notifications and preferences
- **Rate limiting**: 100 requests per 15 minutes per user

## Table of Contents

1. [Notification Endpoints](#notification-endpoints)
2. [Preference Endpoints](#preference-endpoints)
3. [Error Responses](#error-responses)
4. [Workflow Examples](#workflow-examples)
5. [Real-Time Integration](#real-time-integration)

---

## Notification Endpoints

### 1. List Notifications

Fetch notifications for the authenticated user with pagination and filtering.

```
GET /api/notifications
```

**Authentication:** Required (any authenticated user)

**Query Parameters:**
- `limit` (optional): Number of notifications to return (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `read` (optional): Filter by read status (`true` | `false` | omit for all)
- `projectId` (optional): Filter by project UUID
- `type` (optional): Filter by notification type
- `category` (optional): Filter by notification category

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "userId": "660e8400-e29b-41d4-a716-446655440001",
        "projectId": "770e8400-e29b-41d4-a716-446655440002",
        "type": "task_assigned",
        "category": "task_updates",
        "read": false,
        "createdAt": "2025-01-15T10:30:00Z",
        "readAt": null,
        "title": "Task Assigned",
        "message": "You were assigned to 'Create storyboard concepts' by Mike Johnson",
        "icon": "🎯",
        "actionUrl": "/projects/770e8400-e29b-41d4-a716-446655440002/tasks/880e8400-e29b-41d4-a716-446655440003",
        "actionLabel": "View Task",
        "metadata": {
          "taskId": "880e8400-e29b-41d4-a716-446655440003",
          "taskTitle": "Create storyboard concepts",
          "projectName": "Brand Video Campaign"
        },
        "actorId": "990e8400-e29b-41d4-a716-446655440004",
        "actorName": "Mike Johnson"
      }
    ],
    "unreadCount": 4,
    "totalCount": 47,
    "hasMore": false
  },
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

**Side Effects:**
- None (read-only)

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `429 Too Many Requests`: Rate limit exceeded

**Examples:**
```bash
# Get 10 most recent unread notifications
GET /api/notifications?limit=10&read=false

# Get notifications for specific project
GET /api/notifications?projectId=770e8400-e29b-41d4-a716-446655440002

# Get task-related notifications
GET /api/notifications?category=task_updates

# Pagination - get next 50
GET /api/notifications?limit=50&offset=50
```

---

### 2. Mark Notification as Read

Mark a single notification as read.

```
PATCH /api/notifications/:id/read
```

**Authentication:** Required (notification owner only)

**Path Parameters:**
- `id` (required): UUID of the notification

**Request Body:**
```json
{
  "read": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notification": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "read": true,
      "readAt": "2025-01-15T10:35:00Z"
    },
    "unreadCount": 3
  },
  "message": "Notification marked as read"
}
```

**Side Effects:**
- Updates `notifications.read` → `true`
- Sets `notifications.read_at` → current timestamp
- Decrements unread count in cache
- Broadcasts real-time update via WebSocket (if connected)

**Error Responses:**
- `400 Bad Request`: Invalid notification ID format
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: Notification belongs to another user
- `404 Not Found`: Notification not found
- `409 Conflict`: Notification already marked as read

---

### 3. Mark All Notifications as Read

Bulk update all unread notifications to read status.

```
POST /api/notifications/mark-all-read
```

**Authentication:** Required (any authenticated user)

**Request Body:**
```json
{
  "projectId": "770e8400-e29b-41d4-a716-446655440002"
}
```

**Note:** `projectId` is optional. If omitted, marks ALL unread notifications as read. If provided, only marks notifications for that project.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "markedCount": 12,
    "unreadCount": 0
  },
  "message": "All notifications marked as read"
}
```

**Side Effects:**
- Updates multiple `notifications` records: `read` → `true`, `read_at` → current timestamp
- Resets unread count to 0 (or decrements by markedCount)
- Logs activity: "Marked all notifications as read"
- Broadcasts real-time update via WebSocket

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `404 Not Found`: Project not found (if projectId provided)

---

### 4. Delete Notification

Soft-delete a notification (removed from user's view).

```
DELETE /api/notifications/:id
```

**Authentication:** Required (notification owner only)

**Path Parameters:**
- `id` (required): UUID of the notification

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notificationId": "550e8400-e29b-41d4-a716-446655440000",
    "deleted": true,
    "unreadCount": 3
  },
  "message": "Notification deleted"
}
```

**Side Effects:**
- Sets `notifications.deleted_at` → current timestamp (soft delete)
- If notification was unread, decrements unread count
- Notification hidden from all queries (WHERE deleted_at IS NULL)
- Broadcasts real-time update via WebSocket

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: Notification belongs to another user
- `404 Not Found`: Notification not found or already deleted

---

## Preference Endpoints

### 5. Get Notification Preferences

Fetch user's notification delivery preferences.

```
GET /api/users/me/notification-preferences
```

**Authentication:** Required (any authenticated user)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "preferences": {
      "id": "dd0e8400-e29b-41d4-a716-446655440008",
      "userId": "660e8400-e29b-41d4-a716-446655440001",
      "createdAt": "2025-01-10T09:00:00Z",
      "updatedAt": "2025-01-15T11:00:00Z",
      "preferences": [
        {
          "category": "task_updates",
          "inAppEnabled": true,
          "emailEnabled": true
        },
        {
          "category": "comments_mentions",
          "inAppEnabled": true,
          "emailEnabled": true
        },
        {
          "category": "file_updates",
          "inAppEnabled": true,
          "emailEnabled": false
        },
        {
          "category": "approvals_revisions",
          "inAppEnabled": true,
          "emailEnabled": true
        },
        {
          "category": "team_changes",
          "inAppEnabled": true,
          "emailEnabled": true
        },
        {
          "category": "project_updates",
          "inAppEnabled": true,
          "emailEnabled": false
        }
      ],
      "emailBatchingFrequency": "every_5_min",
      "pausedUntil": null
    }
  }
}
```

**Side Effects:**
- None (read-only)
- If user has no preferences record, creates one with default settings

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token

---

### 6. Update Notification Preferences

Update user's notification delivery preferences.

```
PATCH /api/users/me/notification-preferences
```

**Authentication:** Required (any authenticated user)

**Request Body:**
```json
{
  "preferences": [
    {
      "category": "task_updates",
      "inAppEnabled": true,
      "emailEnabled": true
    },
    {
      "category": "comments_mentions",
      "inAppEnabled": true,
      "emailEnabled": true
    },
    {
      "category": "file_updates",
      "inAppEnabled": true,
      "emailEnabled": false
    },
    {
      "category": "approvals_revisions",
      "inAppEnabled": true,
      "emailEnabled": true
    },
    {
      "category": "team_changes",
      "inAppEnabled": true,
      "emailEnabled": false
    },
    {
      "category": "project_updates",
      "inAppEnabled": false,
      "emailEnabled": false
    }
  ],
  "emailBatchingFrequency": "hourly",
  "pausedUntil": null
}
```

**Validation:**
- `preferences`: Required, array of 1-6 category preferences
- `emailBatchingFrequency`: Optional, must be valid enum value
- `pausedUntil`: Optional, future timestamp or null
- At least one delivery method (in-app or email) must be enabled per critical category

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "preferences": {
      "id": "dd0e8400-e29b-41d4-a716-446655440008",
      "userId": "660e8400-e29b-41d4-a716-446655440001",
      "preferences": [...],
      "emailBatchingFrequency": "hourly",
      "pausedUntil": null,
      "updatedAt": "2025-01-15T12:00:00Z"
    }
  },
  "message": "Notification preferences updated"
}
```

**Side Effects:**
- Updates `user_notification_preferences` record
- Sets `updated_at` → current timestamp
- Preferences apply immediately to new notifications
- Existing queued emails not affected

**Error Responses:**
- `400 Bad Request`: Validation failed (invalid category, frequency, or both delivery methods disabled)
- `401 Unauthorized`: Missing or invalid JWT token

---

## Error Responses

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "field": "fieldName",
    "details": {}
  }
}
```

### Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Request validation failed |
| 400 | `INVALID_NOTIFICATION_ID` | Notification ID format invalid |
| 400 | `ALREADY_READ` | Notification already marked as read |
| 400 | `INVALID_PREFERENCES` | Preference validation failed |
| 401 | `UNAUTHORIZED` | Missing/invalid auth token |
| 403 | `FORBIDDEN` | Cannot access other users' notifications |
| 404 | `NOTIFICATION_NOT_FOUND` | Notification doesn't exist |
| 404 | `PROJECT_NOT_FOUND` | Project doesn't exist |
| 409 | `CONFLICT` | Concurrent update conflict |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

---

## Workflow Examples

### Example 1: User Opens Portal and Views Notifications

```bash
# Step 1: User logs in and app checks for unread notifications
GET /api/notifications?limit=10&read=false
→ Returns: 4 unread notifications, unreadCount: 4

# Step 2: User clicks notification bell, dropdown shows notifications
# (Same response from step 1 cached in frontend)

# Step 3: User clicks a notification
PATCH /api/notifications/550e8400-e29b-41d4-a716-446655440000/read
{
  "read": true
}
→ Returns: { "unreadCount": 3 }

# Step 4: User navigates to task via actionUrl
# (Frontend handles navigation based on actionUrl)

# Result: Notification marked as read, badge count updated
```

### Example 2: User Marks All as Read

```bash
# User clicks "Mark all as read" button
POST /api/notifications/mark-all-read
→ Returns: { "markedCount": 12, "unreadCount": 0 }

# Result: All 12 unread notifications marked as read, badge shows 0
```

### Example 3: User Updates Notification Preferences

```bash
# Step 1: User navigates to settings, loads current preferences
GET /api/users/me/notification-preferences
→ Returns: Current preferences

# Step 2: User disables email for file_updates category
PATCH /api/users/me/notification-preferences
{
  "preferences": [
    {"category": "task_updates", "inAppEnabled": true, "emailEnabled": true},
    {"category": "file_updates", "inAppEnabled": true, "emailEnabled": false},
    ...
  ]
}
→ Returns: { "message": "Notification preferences updated" }

# Result: Future file_uploaded notifications will not trigger emails
```

### Example 4: Pagination Through Notification History

```bash
# Page 1: Get first 50 notifications
GET /api/notifications?limit=50&offset=0
→ Returns: 50 notifications, hasMore: true, totalCount: 147

# Page 2: Get next 50
GET /api/notifications?limit=50&offset=50
→ Returns: 50 notifications, hasMore: true

# Page 3: Get next 50
GET /api/notifications?limit=50&offset=100
→ Returns: 47 notifications, hasMore: false
```

---

## Real-Time Integration

### WebSocket / Server-Sent Events (Optional Enhancement)

While not required for MVP, real-time notification delivery can be implemented using WebSocket or SSE:

```javascript
// Client-side WebSocket connection
const ws = new WebSocket('wss://portal.motionify.studio/ws');

ws.onopen = () => {
  // Send authentication token
  ws.send(JSON.stringify({
    type: 'auth',
    token: authToken
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'notification') {
    // New notification received
    updateNotificationBadge(data.unreadCount);
    showToast(data.notification.message);
  }
  
  if (data.type === 'notification_read') {
    // Another device marked notification as read
    updateNotificationBadge(data.unreadCount);
  }
};
```

**WebSocket Events:**
- `notification` - New notification created
- `notification_read` - Notification marked as read
- `notification_deleted` - Notification deleted
- `unread_count_update` - Unread count changed

**Fallback Strategy:**
- If WebSocket unavailable: Poll `GET /api/notifications?limit=10&read=false` every 30 seconds
- On reconnection: Sync missed notifications

---

## Rate Limiting

- **Standard endpoints**: 100 requests per 15 minutes per user
- **Bulk operations** (mark all read): 10 requests per 15 minutes per user
- Exceeded limits return `429 Too Many Requests` with `Retry-After` header

## Caching

- `GET /api/notifications`: Cache for 10 seconds (short-lived)
- `GET /api/users/me/notification-preferences`: Cache for 5 minutes
- Cache invalidated on:
  - New notification created
  - Notification marked as read
  - Preferences updated

---

## Security Notes

1. **User Isolation**: Users can only access their own notifications (enforced by WHERE user_id = $1)
2. **No Cross-User Access**: Attempting to access another user's notification returns 403 Forbidden
3. **Soft Deletes**: Deleted notifications remain in database for audit trail but hidden from queries
4. **Rate Limiting**: Prevents abuse of notification creation/polling
5. **Input Validation**: All inputs validated with Zod schemas before database operations

---

**Last Updated**: November 17, 2025
**API Version**: 1.0
**Status**: Ready for Implementation
