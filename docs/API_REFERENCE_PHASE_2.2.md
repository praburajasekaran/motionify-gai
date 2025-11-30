# Phase 2.2 API Reference - Project Management

Complete API documentation for the Project Management backend system.

## Base URL
- Development: `http://localhost:8888/.netlify/functions/`
- Production: `https://your-site.netlify.app/.netlify/functions/`

## Authentication
All endpoints require JWT authentication via Bearer token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Projects API

### Create Project
```http
POST /projects-create
Content-Type: application/json

{
  "name": "Brand Video Campaign",
  "description": "Product explainer video for Q1 launch",
  "status": "planning",
  "start_date": "2025-01-15",
  "end_date": "2025-03-15",
  "total_revisions": 3,
  "deliverables": [
    {
      "name": "Script & Storyboard",
      "description": "Initial creative concept and script",
      "status": "pending"
    },
    {
      "name": "Final Video 4K",
      "description": "Rendered final video in 4K resolution",
      "status": "pending"
    }
  ],
  "team_members": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "role": "client",
      "is_primary_contact": true
    },
    {
      "user_id": "660e8400-e29b-41d4-a716-446655440001",
      "role": "project_manager",
      "is_primary_contact": false
    }
  ]
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "Brand Video Campaign",
      "description": "Product explainer video for Q1 launch",
      "status": "planning",
      "start_date": "2025-01-15",
      "end_date": "2025-03-15",
      "total_revisions": 3,
      "used_revisions": 0,
      "created_at": "2025-11-20T10:30:00Z",
      "updated_at": "2025-11-20T10:30:00Z",
      "deliverables": [...],
      "team_members": [...]
    }
  },
  "message": "Project created successfully"
}
```

**Permissions:** `super_admin`, `project_manager`

---

### List Projects
```http
GET /projects-list?status=active&userId=550e8400-e29b-41d4-a716-446655440000
```

**Query Parameters:**
- `status` (optional): Filter by project status (planning, active, on_hold, completed, archived)
- `userId` (optional): Filter by assigned user (admin only)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "name": "Brand Video Campaign",
        "description": "Product explainer video",
        "status": "active",
        "start_date": "2025-01-15",
        "end_date": "2025-03-15",
        "total_revisions": 3,
        "used_revisions": 1,
        "created_at": "2025-11-20T10:30:00Z",
        "updated_at": "2025-11-20T10:30:00Z",
        "deliverable_count": 2,
        "team_member_count": 5,
        "progress_percentage": 45,
        "team_preview": [...]
      }
    ],
    "total": 12
  }
}
```

**Permissions:** All authenticated users (filtered by access)

---

### Get Project Details
```http
GET /projects-get/:id
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "Brand Video Campaign",
      "deliverables": [...],
      "team_members": [...],
      "activities": [...],
      "task_stats": {
        "total_tasks": 20,
        "completed_tasks": 9,
        "in_progress_tasks": 5,
        "todo_tasks": 6,
        "progress_percentage": 45
      },
      "revision_info": {
        "total_revisions": 3,
        "used_revisions": 1,
        "remaining_revisions": 2
      }
    }
  }
}
```

**Permissions:** Project team members + admins

---

### Update Project
```http
PATCH /projects-update/:id
Content-Type: application/json

{
  "name": "Updated Project Name",
  "status": "active",
  "end_date": "2025-04-15"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "project": {...}
  },
  "message": "Project updated successfully"
}
```

**Permissions:** Project managers + `super_admin`

---

### Archive Project
```http
DELETE /projects-delete/:id
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "Brand Video Campaign",
      "status": "archived",
      "updated_at": "2025-11-20T15:30:00Z"
    }
  },
  "message": "Project archived successfully"
}
```

**Permissions:** `super_admin` only

---

## Deliverables API

### Create Deliverable
```http
POST /deliverables-create
Path: /api/projects/:projectId/deliverables
Content-Type: application/json

{
  "name": "Voice Over Recording",
  "description": "Professional voice over recording",
  "status": "pending"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "deliverable": {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "project_id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "Voice Over Recording",
      "description": "Professional voice over recording",
      "status": "pending",
      "created_at": "2025-11-20T11:00:00Z",
      "updated_at": "2025-11-20T11:00:00Z"
    }
  },
  "message": "Deliverable created successfully"
}
```

**Permissions:** Project team members + admins

---

### List Deliverables
```http
GET /deliverables-list
Path: /api/projects/:projectId/deliverables
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "deliverables": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "project_id": "770e8400-e29b-41d4-a716-446655440002",
        "name": "Voice Over Recording",
        "description": "Professional voice over recording",
        "status": "in_progress",
        "task_count": 5,
        "completed_task_count": 2,
        "completion_percentage": 40,
        "created_at": "2025-11-20T11:00:00Z",
        "updated_at": "2025-11-20T11:00:00Z"
      }
    ],
    "total": 3
  }
}
```

**Permissions:** Project team members + admins

---

### Update Deliverable
```http
PATCH /deliverables-update/:id
Content-Type: application/json

{
  "name": "Updated Deliverable Name",
  "status": "completed"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "deliverable": {...}
  },
  "message": "Deliverable updated successfully"
}
```

**Permissions:** Project team members + admins

---

### Delete Deliverable
```http
DELETE /deliverables-delete/:id
```

**Response 200:**
```json
{
  "success": true,
  "message": "Deliverable deleted successfully"
}
```

**Error 400 (if tasks linked):**
```json
{
  "error": "Cannot delete deliverable with linked tasks",
  "details": {
    "task_count": 5,
    "message": "Please unlink or delete all tasks before deleting this deliverable"
  }
}
```

**Permissions:** Project managers + admins

---

## Project Team API

### Add Team Member
```http
POST /project-team-add
Path: /api/projects/:projectId/team
Content-Type: application/json

{
  "user_id": "990e8400-e29b-41d4-a716-446655440004",
  "role": "client",
  "is_primary_contact": false
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "team_member": {
      "id": "aa0e8400-e29b-41d4-a716-446655440005",
      "project_id": "770e8400-e29b-41d4-a716-446655440002",
      "user_id": "990e8400-e29b-41d4-a716-446655440004",
      "role": "client",
      "is_primary_contact": false,
      "created_at": "2025-11-20T12:00:00Z",
      "user": {
        "id": "990e8400-e29b-41d4-a716-446655440004",
        "email": "john@example.com",
        "full_name": "John Doe",
        "role": "client",
        "avatar_url": null
      }
    }
  },
  "message": "John Doe added to project successfully"
}
```

**Permissions:** Project managers, primary contacts, admins

---

### Remove Team Member
```http
DELETE /project-team-remove/:userId
Path: /api/projects/:projectId/team/:userId
```

**Response 200:**
```json
{
  "success": true,
  "message": "John Doe removed from project successfully"
}
```

**Validation Errors:**
- Cannot remove yourself: 400
- Cannot remove primary contact: 400
- Cannot remove last project manager: 400

**Permissions:** Project managers, primary contacts, admins

---

### Update Team Member
```http
PATCH /project-team-update/:userId
Path: /api/projects/:projectId/team/:userId
Content-Type: application/json

{
  "role": "project_manager",
  "is_primary_contact": false
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "team_member": {
      "id": "aa0e8400-e29b-41d4-a716-446655440005",
      "project_id": "770e8400-e29b-41d4-a716-446655440002",
      "user_id": "990e8400-e29b-41d4-a716-446655440004",
      "role": "project_manager",
      "is_primary_contact": false,
      "created_at": "2025-11-20T12:00:00Z",
      "user": {
        "full_name": "John Doe",
        "email": "john@example.com"
      }
    }
  },
  "message": "Team member updated successfully"
}
```

**Permissions:** Project managers, primary contacts, admins

---

## Revisions API

### Add Revision Quota (Admin)
```http
POST /revisions-add
Path: /api/projects/:id/revisions/add
Content-Type: application/json

{
  "additional_revisions": 2,
  "reason": "Client upgrade to premium package"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "Brand Video Campaign",
      "total_revisions": 5,
      "used_revisions": 1,
      "remaining_revisions": 4,
      "added_revisions": 2
    }
  },
  "message": "Added 2 revisions to project"
}
```

**Permissions:** `super_admin`, `project_manager`

---

### Request Additional Revisions (Client)
```http
POST /revisions-request-additional
Path: /api/projects/:id/revisions/request
Content-Type: application/json

{
  "reason": "Client requested changes to voiceover and background music after final review meeting",
  "requested_count": 2
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "request": {
      "id": "bb0e8400-e29b-41d4-a716-446655440006",
      "project_id": "770e8400-e29b-41d4-a716-446655440002",
      "requester_id": "990e8400-e29b-41d4-a716-446655440004",
      "reason": "Client requested changes to voiceover...",
      "status": "pending",
      "created_at": "2025-11-20T13:00:00Z",
      "requested_count": 2,
      "current_status": {
        "total_revisions": 3,
        "used_revisions": 3,
        "remaining_revisions": 0
      }
    }
  },
  "message": "Additional revision request submitted successfully. An admin will review your request."
}
```

**Validation:**
- Reason minimum 10 characters
- Prevents duplicate pending requests

**Permissions:** Project team members

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 405 | Method Not Allowed - Wrong HTTP method |
| 500 | Internal Server Error - Server error |

## Standard Error Format
```json
{
  "error": "Error message",
  "details": {
    "field": "Specific error details"
  }
}
```

## Valid Status Values

### Project Status
- `planning` - Initial planning phase
- `active` - Active development
- `on_hold` - Temporarily paused
- `completed` - Project completed
- `archived` - Soft deleted

### Deliverable Status
- `pending` - Not started
- `in_progress` - Currently working
- `completed` - Finished
- `on_hold` - Temporarily paused

### Team Member Roles
- `client` - Client team member
- `project_manager` - Project manager with admin rights
- `team` - General team member

---

**Last Updated:** 2025-11-20
**API Version:** 1.0
**Status:** Production Ready
