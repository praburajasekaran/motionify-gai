# API Endpoints: Admin Features

This document specifies all REST API endpoints for admin features including user management, activity logs, and project status control.

## Base URL

```
Production: https://api.motionify.studio
Development: http://localhost:3000
```

## Authentication

All admin endpoints require JWT token authentication:
```
Authorization: Bearer <jwt_token>
```

**Permission Levels:**
- **Super Admin only**: User management, project status changes
- **Super Admin + Project Manager**: Activity log viewing (scoped to projects)

## Table of Contents

1. [User Management Endpoints](#user-management-endpoints)
2. [Activity Log Endpoints](#activity-log-endpoints)
3. [Project Status Endpoints](#project-status-endpoints)
4. [Error Responses](#error-responses)

---

## User Management Endpoints

### 1. Create New User

Create a new Motionify team member and send welcome email.

```
POST /api/admin/users
```

**Authentication:** Required (super_admin only)

**Request Body:**
```json
{
  "fullName": "Sarah Mitchell",
  "email": "sarah@motionify.studio",
  "role": "project_manager"
}
```

**Validation:**
- `fullName`: Required, 2-100 characters, letters/spaces/hyphens only
- `email`: Required, valid email format, unique, lowercase
- `role`: Required, one of: `super_admin`, `project_manager`, `team_member`

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "sarah@motionify.studio",
      "fullName": "Sarah Mitchell",
      "role": "project_manager",
      "status": "pending_activation",
      "isActive": true,
      "createdAt": "2025-01-17T10:00:00Z",
      "updatedAt": "2025-01-17T10:00:00Z",
      "lastLoginAt": null,
      "deactivatedAt": null
    },
    "invitationSent": true,
    "magicLinkExpiresIn": "15 minutes"
  },
  "message": "User created successfully. Invitation email sent to sarah@motionify.studio"
}
```

**Side Effects:**
- User record created with status `pending_activation`
- Magic link token generated (15-minute expiry)
- Welcome email sent via Amazon SES
- Activity logged: `user_created`

**Error Responses:**
- `400 Bad Request`: Validation failed
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Email already exists",
      "field": "email"
    }
  }
  ```
- `403 Forbidden`: Not a super admin
- `500 Internal Server Error`: Email send failure or database error

---

### 2. Get All Users

Retrieve all users with optional filtering, searching, and pagination.

```
GET /api/admin/users
```

**Authentication:** Required (super_admin only)

**Query Parameters:**
- `search` (optional): Search by name or email (case-insensitive)
- `role` (optional): Filter by role (`super_admin`, `project_manager`, `team_member`, `client`)
- `status` (optional): Filter by status (`pending_activation`, `active`, `deactivated`)
- `isActive` (optional): Filter by active status (`true`, `false`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `sortBy` (optional): Sort field (default: `createdAt`)
- `sortOrder` (optional): Sort direction (`asc`, `desc`, default: `desc`)

**Example Request:**
```
GET /api/admin/users?search=sarah&role=project_manager&status=active&page=1&limit=20
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "sarah@motionify.studio",
        "fullName": "Sarah Mitchell",
        "role": "project_manager",
        "status": "active",
        "isActive": true,
        "createdAt": "2025-01-15T10:00:00Z",
        "updatedAt": "2025-01-17T14:30:00Z",
        "lastLoginAt": "2025-01-17T14:30:00Z",
        "deactivatedAt": null,
        "avatarUrl": "https://r2.motionify.studio/avatars/550e8400.jpg",
        "projectCount": 3
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "email": "mike@motionify.studio",
        "fullName": "Mike Johnson",
        "role": "team_member",
        "status": "active",
        "isActive": true,
        "createdAt": "2025-01-10T09:00:00Z",
        "updatedAt": "2025-01-16T11:00:00Z",
        "lastLoginAt": "2025-01-16T11:00:00Z",
        "deactivatedAt": null,
        "projectCount": 2
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "totalPages": 1
    }
  }
}
```

**Side Effects:** None (read-only)

---

### 3. Update User

Update user details (name, role). Email cannot be changed.

```
PATCH /api/admin/users/:userId
```

**Authentication:** Required (super_admin only)

**Request Body:**
```json
{
  "fullName": "Sarah M. Mitchell",
  "role": "super_admin"
}
```

**Validation:**
- `fullName`: Optional, 2-100 characters, letters/spaces/hyphens only
- `role`: Optional, one of: `super_admin`, `project_manager`, `team_member`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "sarah@motionify.studio",
      "fullName": "Sarah M. Mitchell",
      "role": "super_admin",
      "status": "active",
      "isActive": true,
      "updatedAt": "2025-01-17T15:00:00Z"
    },
    "changes": {
      "fullName": {
        "old": "Sarah Mitchell",
        "new": "Sarah M. Mitchell"
      },
      "role": {
        "old": "project_manager",
        "new": "super_admin"
      }
    }
  },
  "message": "User updated successfully"
}
```

**Side Effects:**
- User record updated
- Activity logged: `user_role_changed` (if role changed)
- Email sent to user if role changed

**Error Responses:**
- `400 Bad Request`: Validation failed or attempting to change email
- `403 Forbidden`: Not a super admin or attempting to change own role to non-admin
- `404 Not Found`: User not found

---

### 4. Deactivate User (Soft Delete)

Deactivate a user account. All historical data is preserved.

```
DELETE /api/admin/users/:userId
```

**Authentication:** Required (super_admin only)

**Request Body:**
```json
{
  "reason": "Employee left the company"
}
```

**Validation:**
- `reason`: Optional, 10-500 characters
- Cannot deactivate self
- Cannot deactivate last super admin

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "email": "tom@motionify.studio",
      "fullName": "Tom Wilson",
      "role": "project_manager",
      "status": "deactivated",
      "isActive": false,
      "deactivatedAt": "2025-02-01T10:00:00Z",
      "deactivatedBy": "770e8400-e29b-41d4-a716-446655440002",
      "deactivationReason": "Employee left the company"
    },
    "dataRetention": {
      "tasksPreserved": 47,
      "commentsPreserved": 89,
      "filesPreserved": 23,
      "activitiesPreserved": 234
    }
  },
  "message": "User deactivated successfully. All historical data has been preserved."
}
```

**Side Effects:**
- `is_active` set to false
- `status` set to `deactivated`
- `deactivated_at` timestamp set
- All user sessions invalidated immediately
- Activity logged: `user_deactivated`
- Email sent to deactivated user
- Historical data preserved: tasks, comments, files, activity logs

**Error Responses:**
- `400 Bad Request`: Cannot deactivate self or last super admin
- `404 Not Found`: User not found
- `409 Conflict`: User already deactivated

---

### 5. Reactivate User

Reactivate a previously deactivated user.

```
POST /api/admin/users/:userId/reactivate
```

**Authentication:** Required (super_admin only)

**Request Body:** (empty)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "email": "tom@motionify.studio",
      "fullName": "Tom Wilson",
      "role": "project_manager",
      "status": "active",
      "isActive": true,
      "deactivatedAt": null,
      "deactivatedBy": null,
      "deactivationReason": null,
      "updatedAt": "2025-02-10T09:00:00Z"
    }
  },
  "message": "User reactivated successfully"
}
```

**Side Effects:**
- `is_active` set to true
- `status` set to `active`
- Deactivation fields cleared
- Email sent to reactivated user with new magic link

---

### 6. Resend User Invitation

Resend invitation email to user with pending activation.

```
POST /api/admin/users/:userId/resend-invitation
```

**Authentication:** Required (super_admin only)

**Request Body:** (empty)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "emailSent": true,
    "magicLinkExpiresIn": "15 minutes"
  },
  "message": "Invitation email sent to sarah@motionify.studio"
}
```

**Side Effects:**
- New magic link token generated
- Invitation email sent

**Error Responses:**
- `400 Bad Request`: User is not in `pending_activation` status

---

## Activity Log Endpoints

### 7. Get Project Activities

Retrieve activity logs for a specific project with filtering.

```
GET /api/projects/:projectId/activities
```

**Authentication:** Required (super_admin or project_manager for assigned projects)

**Query Parameters:**
- `userId` (optional): Filter by specific user
- `actionType` (optional): Filter by action type (e.g., `task_created`, `file_uploaded`)
- `entityType` (optional): Filter by entity type (e.g., `task`, `file`)
- `dateFrom` (optional): Start date (ISO 8601)
- `dateTo` (optional): End date (ISO 8601)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)

**Example Request:**
```
GET /api/projects/990e8400-e29b-41d4-a716-446655440004/activities?
  dateFrom=2025-01-01T00:00:00Z&
  dateTo=2025-01-31T23:59:59Z&
  actionType=task_status_changed&
  page=1&
  limit=50
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "projectId": "990e8400-e29b-41d4-a716-446655440004",
        "projectName": "Brand Video Campaign",
        "userId": "550e8400-e29b-41d4-a716-446655440000",
        "user": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "fullName": "Sarah Mitchell",
          "role": "project_manager",
          "isActive": true,
          "avatarUrl": "https://r2.motionify.studio/avatars/550e8400.jpg"
        },
        "actionType": "task_status_changed",
        "entityType": "task",
        "entityId": "aa0e8400-e29b-41d4-a716-446655440005",
        "description": "Task status changed: Review storyboards (In Progress → Awaiting Approval)",
        "details": {
          "entityName": "Review storyboards",
          "oldStatus": "in_progress",
          "newStatus": "awaiting_approval",
          "deliveryNotes": "Uploaded 3 storyboard concepts for review"
        },
        "timestamp": "2025-01-17T14:30:00Z",
        "relativeTime": "2 hours ago"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 2347,
      "totalPages": 47
    },
    "summary": {
      "totalActivities": 2347,
      "dateRange": {
        "from": "2025-01-01T00:00:00Z",
        "to": "2025-01-31T23:59:59Z"
      }
    }
  }
}
```

**Side Effects:** None (read-only)

**Performance Notes:**
- Response time: < 500ms for 50 records
- Indexed queries on project_id, user_id, timestamp

---

### 8. Get All Activities (Super Admin)

Retrieve activity logs across all projects.

```
GET /api/admin/activities
```

**Authentication:** Required (super_admin only)

**Query Parameters:** Same as endpoint #7, plus:
- `projectId` (optional): Filter by specific project

**Response:** Same format as endpoint #7

---

### 9. Export Activity Logs

Generate CSV export of activity logs.

```
POST /api/projects/:projectId/activities/export
```

**Authentication:** Required (super_admin or project_manager for assigned projects)

**Request Body:**
```json
{
  "format": "csv",
  "dateFrom": "2025-01-01T00:00:00Z",
  "dateTo": "2025-01-31T23:59:59Z",
  "userId": null,
  "actionType": null,
  "columns": [
    "timestamp",
    "user_name",
    "action_type",
    "description",
    "details"
  ]
}
```

**Validation:**
- `format`: Required, one of: `csv`, `json`
- `dateFrom`: Optional, ISO 8601 datetime
- `dateTo`: Optional, ISO 8601 datetime
- `columns`: Optional, array of column names

**Response (200 OK) - Small Export (< 50K records):**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://r2.motionify.studio/exports/activity-log-brand-video-2025-01.csv?expires=1705507200",
    "filename": "activity-log-brand-video-campaign-2025-01-17.csv",
    "recordCount": 2347,
    "fileSize": 487293,
    "expiresAt": "2025-01-18T10:00:00Z"
  },
  "message": "Export ready for download"
}
```

**Response (202 Accepted) - Large Export (> 50K records):**
```json
{
  "success": true,
  "data": {
    "exportJobId": "export-550e8400-e29b-41d4-a716",
    "status": "processing",
    "estimatedRecords": 73241,
    "estimatedTime": "5-10 minutes"
  },
  "message": "Export is being generated. You'll receive an email when it's ready."
}
```

**Side Effects:**
- CSV file generated and uploaded to R2
- Presigned download URL created (valid 24 hours)
- For large exports: Background job queued, email sent when complete
- Activity logged: `activity_export_requested`

**CSV Format:**
```csv
Timestamp,User ID,User Name,Action Type,Entity Type,Entity ID,Description,Details
2025-01-17T14:30:00Z,550e8400...,Sarah Mitchell,task_status_changed,task,aa0e8400...,Task status changed: Review storyboards,"{""oldStatus"":""in_progress"",""newStatus"":""awaiting_approval""}"
```

**Performance:**
- < 10,000 records: 2-5 seconds
- 10,000-50,000 records: 5-10 seconds
- > 50,000 records: Async processing (5-10 minutes)

---

## Project Status Endpoints

### 10. Update Project Status

Change project status with validation.

```
PATCH /api/projects/:projectId/status
```

**Authentication:** Required (super_admin only)

**Request Body:**
```json
{
  "status": "completed",
  "override": true,
  "reason": "Client requested early completion"
}
```

**Validation:**
- `status`: Required, one of: `in_progress`, `completed`, `on_hold`, `archived`
- `override`: Optional, boolean (allows status change despite warnings)
- `reason`: Optional, 10-500 characters (required if override is true)
- Status transition must be valid (see status state machine)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "name": "Brand Video Campaign",
      "status": "completed",
      "statusChangedAt": "2025-02-15T16:00:00Z",
      "statusChangedBy": "770e8400-e29b-41d4-a716-446655440002",
      "completedAt": "2025-02-15T16:00:00Z",
      "archivedAt": null
    },
    "notifications": {
      "emailsSent": 5,
      "recipients": [
        "sarah@motionify.studio",
        "mike@motionify.studio",
        "john.doe@client.com"
      ]
    }
  },
  "message": "Project status updated to Completed"
}
```

**Response (400 Bad Request) - Validation Warning:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_WARNING",
    "message": "Cannot mark project as completed. 2 deliverables not yet approved.",
    "details": {
      "incompleteDeliverables": [
        {
          "id": "deliverable-1",
          "name": "Video Production",
          "status": "awaiting_approval"
        },
        {
          "id": "deliverable-2",
          "name": "Social Media Cutdowns",
          "status": "in_progress"
        }
      ],
      "canOverride": true,
      "overrideInstructions": "Set override: true and provide a reason to proceed anyway"
    }
  }
}
```

**Side Effects:**
- Project status updated
- `status_changed_at` timestamp updated
- `completed_at` or `archived_at` set (depending on new status)
- Activity logged: `project_status_changed`
- Email notifications sent to all team members
- Project moves to appropriate filtered view

**Error Responses:**
- `400 Bad Request`: Invalid status transition
  ```json
  {
    "success": false,
    "error": {
      "code": "INVALID_TRANSITION",
      "message": "Cannot change status from 'archived' to 'on_hold'",
      "details": {
        "currentStatus": "archived",
        "requestedStatus": "on_hold",
        "allowedTransitions": []
      }
    }
  }
  ```
- `403 Forbidden`: Not a super admin
- `404 Not Found`: Project not found

**Status Transition Rules:**
```
in_progress → [completed, on_hold]
on_hold → [in_progress, completed]
completed → [archived, in_progress]
archived → [] (no transitions allowed)
```

---

### 11. Get Project Status History

Retrieve history of all status changes for a project.

```
GET /api/projects/:projectId/status-history
```

**Authentication:** Required (super_admin or project_manager for assigned projects)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "history-1",
        "oldStatus": "in_progress",
        "newStatus": "completed",
        "changedAt": "2025-02-15T16:00:00Z",
        "changedBy": {
          "id": "770e8400-e29b-41d4-a716-446655440002",
          "fullName": "Jane Smith",
          "role": "super_admin"
        },
        "override": true,
        "reason": "Client requested early completion",
        "notificationsSent": 5
      },
      {
        "id": "history-2",
        "oldStatus": null,
        "newStatus": "in_progress",
        "changedAt": "2025-01-15T10:00:00Z",
        "changedBy": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "fullName": "Sarah Mitchell",
          "role": "project_manager"
        },
        "override": false,
        "reason": null,
        "notificationsSent": 0
      }
    ],
    "currentStatus": "completed",
    "totalChanges": 2
  }
}
```

---

## Error Responses

All endpoints follow consistent error response format:

### Validation Error (400)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "field": "email",
    "details": {
      "received": "sarah@motionify",
      "expected": "Valid email address"
    }
  }
}
```

### Authentication Error (401)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid authentication token",
    "details": {
      "hint": "Include 'Authorization: Bearer <token>' header"
    }
  }
}
```

### Permission Error (403)
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Only Super Admins can manage users",
    "details": {
      "requiredRole": "super_admin",
      "yourRole": "project_manager"
    }
  }
}
```

### Not Found Error (404)
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found",
    "details": {
      "userId": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

### Conflict Error (409)
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "User is already deactivated",
    "details": {
      "deactivatedAt": "2025-02-01T10:00:00Z",
      "action": "Use /reactivate endpoint to reactivate user"
    }
  }
}
```

### Server Error (500)
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "details": {
      "requestId": "req-550e8400-e29b-41d4-a716",
      "timestamp": "2025-01-17T15:00:00Z"
    }
  }
}
```

---

## Rate Limiting

All endpoints are rate-limited to prevent abuse:

- **General endpoints**: 100 requests per minute per IP
- **Export endpoints**: 10 requests per hour per user
- **Authentication endpoints**: 20 requests per minute per IP

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705507200
```

**Rate Limit Exceeded (429):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "limit": 100,
      "resetAt": "2025-01-17T15:01:00Z",
      "retryAfter": 45
    }
  }
}
```

---

## Caching

Response caching headers:

- **User lists**: `Cache-Control: private, max-age=30`
- **Activity logs**: `Cache-Control: private, max-age=60`
- **Individual users**: `Cache-Control: private, max-age=300`

---

## Webhook Events (Future Enhancement)

Planned webhook events for external integrations:

- `user.created`
- `user.deactivated`
- `user.reactivated`
- `project.status_changed`
- `project.completed`
- `project.archived`
