# API Endpoints: Project Terms & Acceptance

This document specifies all REST API endpoints for the Project Terms & Acceptance feature.

## Base URL

```
Production: https://portal.motionify.studio
Development: http://localhost:3000
```

## Authentication

- **Client endpoints**: Require JWT token in `Authorization: Bearer <token>` header
- **Admin endpoints**: Require JWT token + `super_admin` role
- All endpoints validate `is_primary_contact` flag for client actions

## Table of Contents

1. [Client Endpoints](#client-endpoints)
2. [Admin Endpoints](#admin-endpoints)
3. [Error Responses](#error-responses)
4. [Workflow Examples](#workflow-examples)

---

## Client Endpoints

### 1. Get Project Terms

Fetch current project terms for review.

```
GET /api/projects/:projectId/terms
```

**Authentication:** Required (any project team member can view)

**Path Parameters:**
- `projectId` (required): UUID of the project

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "terms": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "projectId": "660e8400-e29b-41d4-a716-446655440001",
      "version": 1,
      "status": "pending_review",
      "content": {
        "projectName": "Brand Video Campaign Q1 2025",
        "clientName": "Acme Corp",
        "startDate": "2025-01-15",
        "endDate": "2025-03-30",
        "scope": {
          "inclusions": ["..."],
          "exclusions": ["..."]
        },
        "deliverables": [...],
        "revisionPolicy": {...},
        "timeline": {...},
        "pricing": {...}
      },
      "createdAt": "2025-01-15T09:00:00Z",
      "updatedAt": "2025-01-15T09:00:00Z",
      "acceptedAt": null,
      "changesSummary": null
    },
    "acceptance": null,
    "hasPendingRevisionRequests": false,
    "isAccepted": false
  }
}
```

**Side Effects:**
- None (read-only)

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User not a member of project team
- `404 Not Found`: Project or terms not found

---

### 2. Accept Project Terms

Client primary contact accepts project terms.

```
POST /api/projects/:projectId/terms/accept
```

**Authentication:** Required (client primary contact only)

**Path Parameters:**
- `projectId` (required): UUID of the project

**Request Body:**
```json
{
  "termsVersion": 1,
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}
```

**Validation:**
- `termsVersion`: Required, must match current terms version
- `ipAddress`: Required, valid IPv4 or IPv6
- `userAgent`: Required, min 10 chars

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "acceptance": {
      "id": "bb0e8400-e29b-41d4-a716-446655440006",
      "projectTermsId": "550e8400-e29b-41d4-a716-446655440000",
      "projectId": "660e8400-e29b-41d4-a716-446655440001",
      "termsVersion": 1,
      "acceptedBy": "cc0e8400-e29b-41d4-a716-446655440007",
      "acceptedAt": "2025-01-15T10:35:00Z",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0..."
    },
    "projectUnlocked": true
  },
  "message": "Terms accepted successfully. You now have full access to the project."
}
```

**Side Effects:**
- Creates `project_terms_acceptance` record
- Updates `project_terms.status` → `accepted`
- Updates `project_terms.accepted_at` → current timestamp
- Logs activity: "Project terms accepted by [client name]"
- Sends email to Motionify admin and PM

**Error Responses:**
- `400 Bad Request`: Validation failed or terms already accepted
- `403 Forbidden`: User is not primary contact
- `404 Not Found`: Project or terms not found
- `409 Conflict`: Terms version mismatch (terms were updated while client was reviewing)

---

### 3. Request Changes to Terms

Client primary contact requests modifications to project terms.

```
POST /api/projects/:projectId/terms/request-revision
```

**Authentication:** Required (client primary contact only)

**Path Parameters:**
- `projectId` (required): UUID of the project

**Request Body:**
```json
{
  "termsVersion": 1,
  "requestedChanges": "I'd like to extend the timeline for Deliverable 2 by two weeks due to upcoming holidays.",
  "additionalContext": "Our team will be out of office December 24 - January 2."
}
```

**Validation:**
- `termsVersion`: Required, must match current terms version
- `requestedChanges`: Required, min 10 chars, max 1000 chars
- `additionalContext`: Optional, max 500 chars

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "revision": {
      "id": "dd0e8400-e29b-41d4-a716-446655440008",
      "projectTermsId": "550e8400-e29b-41d4-a716-446655440000",
      "projectId": "660e8400-e29b-41d4-a716-446655440001",
      "requestedBy": "cc0e8400-e29b-41d4-a716-446655440007",
      "requestedChanges": "I'd like to extend the timeline...",
      "additionalContext": "Our team will be out of office...",
      "termsVersion": 1,
      "status": "pending",
      "resolved": false,
      "createdAt": "2025-01-15T14:15:00Z"
    }
  },
  "message": "Change request submitted. We'll review and respond within 24 hours."
}
```

**Side Effects:**
- Creates `project_terms_revisions` record
- Updates `project_terms.status` → `revision_requested`
- Logs activity: "Client requested term changes"
- Sends email to Motionify admin with request details

**Error Responses:**
- `400 Bad Request`: Validation failed (e.g., requested changes too short)
- `403 Forbidden`: User is not primary contact
- `404 Not Found`: Project or terms not found

---

## Admin Endpoints

### 4. Update Project Terms

Admin updates project terms, incrementing version and requiring client re-acceptance.

```
PATCH /api/projects/:projectId/terms
```

**Authentication:** Required (`super_admin` role only)

**Path Parameters:**
- `projectId` (required): UUID of the project

**Request Body:**
```json
{
  "content": {
    "projectName": "Brand Video Campaign Q1 2025",
    "clientName": "Acme Corp",
    "startDate": "2025-01-15",
    "endDate": "2025-04-05",
    "scope": {
      "inclusions": ["..."],
      "exclusions": ["..."]
    },
    "deliverables": [...],
    "revisionPolicy": {...},
    "timeline": {
      "duration": "12 weeks",
      "checkIns": "Tuesdays at 2:00 PM EST",
      "finalDeadline": "2025-04-05"
    },
    "pricing": {...}
  },
  "changesSummary": "Extended timeline for Deliverable 2 by 2 weeks. Final deadline now April 5, 2025."
}
```

**Validation:**
- `content`: Required, must match `TermsContent` schema (see data models)
- `changesSummary`: Optional, max 500 chars

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "terms": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "projectId": "660e8400-e29b-41d4-a716-446655440001",
      "version": 2,
      "status": "pending_review",
      "content": {...},
      "createdAt": "2025-01-15T09:00:00Z",
      "updatedAt": "2025-01-16T10:05:00Z",
      "acceptedAt": null,
      "changesSummary": "Extended timeline for Deliverable 2..."
    },
    "newVersion": 2,
    "clientNotified": true
  },
  "message": "Terms updated successfully. Client has been notified and must re-accept."
}
```

**Side Effects:**
- Increments `project_terms.version` (e.g., 1 → 2)
- Updates `project_terms.content` with new data
- Resets `project_terms.status` → `pending_review`
- Clears `project_terms.accepted_at` → `null`
- Updates `project_terms.changes_summary`
- Logs activity: "Terms updated to version 2 by [admin name]"
- Sends email to client primary contact: "Terms Updated - Re-acceptance Required"

**Error Responses:**
- `400 Bad Request`: Validation failed (invalid content structure)
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User does not have `super_admin` role
- `404 Not Found`: Project or terms not found

---

### 5. Get Revision Requests (Admin)

Get all change requests for a project.

```
GET /api/projects/:projectId/terms/revisions
```

**Authentication:** Required (`super_admin` or `project_manager` role)

**Path Parameters:**
- `projectId` (required): UUID of the project

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `under_review`, `addressed`, `declined`)
- `resolved` (optional): Filter by resolved status (`true`, `false`)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "revisions": [
      {
        "id": "dd0e8400-e29b-41d4-a716-446655440008",
        "projectTermsId": "550e8400-e29b-41d4-a716-446655440000",
        "projectId": "660e8400-e29b-41d4-a716-446655440001",
        "requestedBy": "cc0e8400-e29b-41d4-a716-446655440007",
        "requestedChanges": "I'd like to extend the timeline...",
        "additionalContext": "Our team will be out of office...",
        "termsVersion": 1,
        "status": "pending",
        "respondedBy": null,
        "respondedAt": null,
        "adminResponse": null,
        "resolved": false,
        "createdAt": "2025-01-15T14:15:00Z",
        "updatedAt": "2025-01-15T14:15:00Z"
      }
    ],
    "count": 1
  }
}
```

**Side Effects:**
- None (read-only)

---

### 6. Mark Revision Request as Resolved

Admin marks a change request as resolved (after updating terms or sending a response).

```
PATCH /api/projects/:projectId/terms/revisions/:revisionId
```

**Authentication:** Required (`super_admin` role only)

**Path Parameters:**
- `projectId` (required): UUID of the project
- `revisionId` (required): UUID of the revision request

**Request Body:**
```json
{
  "status": "addressed",
  "adminResponse": "We've updated the timeline as requested. Please review the new terms (version 2).",
  "resolved": true
}
```

**Validation:**
- `status`: Optional, must be valid `RevisionRequestStatus`
- `adminResponse`: Optional, max 1000 chars
- `resolved`: Optional, boolean

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "revision": {
      "id": "dd0e8400-e29b-41d4-a716-446655440008",
      "status": "addressed",
      "respondedBy": "770e8400-e29b-41d4-a716-446655440002",
      "respondedAt": "2025-01-16T10:05:00Z",
      "adminResponse": "We've updated the timeline as requested...",
      "resolved": true,
      "updatedAt": "2025-01-16T10:05:00Z"
    }
  },
  "message": "Revision request updated successfully."
}
```

**Side Effects:**
- Updates revision request status and response
- Logs activity: "Revision request marked as addressed"
- If `adminResponse` provided, sends email to client with response

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
| 400 | `TERMS_ALREADY_ACCEPTED` | Cannot accept already-accepted terms |
| 400 | `TERMS_VERSION_MISMATCH` | Terms version doesn't match (terms were updated) |
| 401 | `UNAUTHORIZED` | Missing/invalid auth token |
| 403 | `FORBIDDEN_NOT_PRIMARY_CONTACT` | User is not the client primary contact |
| 403 | `FORBIDDEN_INSUFFICIENT_PERMISSIONS` | User lacks required role |
| 404 | `PROJECT_NOT_FOUND` | Project doesn't exist |
| 404 | `TERMS_NOT_FOUND` | Project terms don't exist |
| 409 | `VERSION_CONFLICT` | Concurrent update conflict |
| 500 | `INTERNAL_ERROR` | Server error |

---

## Workflow Examples

### Example 1: Happy Path - Client Accepts Terms

```bash
# Step 1: Client views terms
GET /api/projects/660e8400-e29b-41d4-a716-446655440001/terms
→ Returns: { version: 1, status: "pending_review", ... }

# Step 2: Client accepts terms
POST /api/projects/660e8400-e29b-41d4-a716-446655440001/terms/accept
{
  "termsVersion": 1,
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
→ Returns: { projectUnlocked: true, ... }

# Result: Client has full project access
```

### Example 2: Client Requests Changes → Admin Updates → Client Accepts

```bash
# Step 1: Client requests changes
POST /api/projects/660e8400-e29b-41d4-a716-446655440001/terms/request-revision
{
  "termsVersion": 1,
  "requestedChanges": "Extend timeline by 2 weeks",
  "additionalContext": "Holiday schedule conflict"
}
→ Returns: { revision: { status: "pending", ... } }

# Step 2: Admin reviews and updates terms
PATCH /api/projects/660e8400-e29b-41d4-a716-446655440001/terms
{
  "content": { ... updated timeline ... },
  "changesSummary": "Extended timeline as requested"
}
→ Returns: { newVersion: 2, clientNotified: true }

# Step 3: Admin marks revision as resolved
PATCH /api/projects/660e8400-e29b-41d4-a716-446655440001/terms/revisions/dd0e8400-...
{
  "status": "addressed",
  "resolved": true
}

# Step 4: Client reviews updated terms
GET /api/projects/660e8400-e29b-41d4-a716-446655440001/terms
→ Returns: { version: 2, status: "pending_review", changesSummary: "Extended timeline...", ... }

# Step 5: Client accepts updated terms
POST /api/projects/660e8400-e29b-41d4-a716-446655440001/terms/accept
{
  "termsVersion": 2,
  ...
}
→ Returns: { projectUnlocked: true }
```

### Example 3: Version Conflict Handling

```bash
# Client has terms modal open (version 1)
# Meanwhile, admin updates terms to version 2
# Client tries to accept stale version

POST /api/projects/660e8400-e29b-41d4-a716-446655440001/terms/accept
{
  "termsVersion": 1,  # Stale version
  ...
}

# Response: 409 Conflict
{
  "success": false,
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Terms have been updated. Please review the latest version.",
    "currentVersion": 2
  }
}

# Frontend should reload terms and show version 2
```

---

## Rate Limiting

- **Client endpoints**: 100 requests per 15 minutes per user
- **Admin endpoints**: 500 requests per 15 minutes per user
- Exceeded limits return `429 Too Many Requests`

## Caching

- `GET /api/projects/:id/terms`: Cache for 5 minutes (invalidated on updates)
- Other endpoints: No caching (always fetch fresh data)

## Webhooks (Future Enhancement)

Not implemented in v1, but planned:
- `terms.accepted` - Webhook fired when client accepts terms
- `terms.revision_requested` - Webhook fired when client requests changes
- `terms.updated` - Webhook fired when admin updates terms
