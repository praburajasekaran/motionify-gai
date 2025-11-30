# API Endpoints: Team Management

This document specifies all REST API endpoints for Team Management (US-021, US-022).

## Base URL

```
Production: https://api.motionify.studio
Development: http://localhost:3000
```

## Authentication

- **Public endpoints**: `/invitations/verify`, `/invitations/:token/accept` (no auth required)
- **Authenticated endpoints**: Require JWT token in `Authorization: Bearer <token>` header or HTTP-only cookie
- **Permission checks**: Some endpoints require primary contact or project manager role

## Table of Contents

1. [Team Member Endpoints](#team-member-endpoints)
2. [Invitation Endpoints](#invitation-endpoints)
3. [Public Endpoints (No Auth)](#public-endpoints-no-auth)
4. [Error Responses](#error-responses)

---

## Team Member Endpoints

### 1. List Project Team Members

Get all team members and pending invitations for a project.

```
GET /api/projects/:projectId/team
```

**Authentication:** Required (project access)

**Path Parameters:**
- `projectId` (required): UUID of the project

**Query Parameters:**
- `include_removed` (optional): Include soft-deleted members (default: false, admin only)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "team_abc123",
        "userId": "user_sarah456",
        "role": "client",
        "isPrimaryContact": true,
        "addedAt": "2025-11-01T10:00:00Z",
        "user": {
          "id": "user_sarah456",
          "email": "sarah@acmecorp.com",
          "name": "Sarah Johnson",
          "avatarUrl": "https://..."
        },
        "canBeRemoved": false
      }
    ],
    "pendingInvitations": [
      {
        "id": "inv_abc123",
        "email": "david@acmecorp.com",
        "status": "pending",
        "createdAt": "2025-11-10T10:00:00Z",
        "expiresAt": "2025-11-17T10:00:00Z",
        "inviter": {
          "name": "Sarah Johnson"
        },
        "daysUntilExpiry": 4
      }
    ],
    "totalMembers": 5,
    "totalInvitations": 2
  }
}
```

**SQL Query (via function):**
```sql
SELECT * FROM get_active_team_members(:projectId);
SELECT * FROM get_pending_invitations(:projectId);
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: No access to project
- `404 Not Found`: Project doesn't exist

---

### 2. Remove Team Member

Soft delete a team member from the project (US-022).

```
DELETE /api/projects/:projectId/team/:userId
```

**Authentication:** Required (primary contact or PM only)

**Path Parameters:**
- `projectId` (required): UUID of the project
- `userId` (required): UUID of user to remove

**Permission Checks:**
- Cannot remove self
- Cannot remove primary contact
- Cannot remove last project manager
- Requester must be primary contact or PM

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "removedUser": {
      "id": "user_michael789",
      "name": "Michael Chen",
      "email": "michael@acmecorp.com",
      "removedAt": "2025-11-16T10:00:00Z"
    }
  },
  "message": "Michael Chen has been removed from the project"
}
```

**Side Effects:**
- Team member soft deleted (removed_at timestamp set)
- Access immediately revoked
- Email sent to removed user
- Email sent to primary contact
- Activity logged: "[Name] was removed from the project by [Remover Name]"
- Historical contributions preserved (tasks, comments, files)

**SQL Query:**
```sql
SELECT remove_team_member(
  :userId,
  :projectId,
  :currentUserId
);
```

**Error Responses:**
- `400 Bad Request`: Cannot remove self / primary contact / last PM
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: No permission to remove members
- `404 Not Found`: User or project not found

---

## Invitation Endpoints

### 3. Create Invitation

Send email invitation to join project team (US-021).

```
POST /api/projects/:projectId/invitations
```

**Authentication:** Required (primary contact or PM only)

**Path Parameters:**
- `projectId` (required): UUID of the project

**Request Body:**
```json
{
  "email": "colleague@example.com",
  "personalMessage": "Hi! I'd like to invite you to collaborate on this video project.",
  "role": "client"
}
```

**Validation:**
- `email`: Required, valid email format, not already on team, no pending invitation
- `personalMessage`: Optional, max 500 characters
- `role`: Optional, defaults to 'client', must be 'client' or 'project_manager'

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "invitation": {
      "id": "inv_abc123",
      "email": "colleague@example.com",
      "status": "pending",
      "createdAt": "2025-11-16T10:00:00Z",
      "expiresAt": "2025-11-23T10:00:00Z",
      "token": "[not exposed]"
    }
  },
  "message": "Invitation sent to colleague@example.com"
}
```

**Side Effects:**
- Invitation record created with unique token
- Expiry set to 7 days from now
- Email sent to invitee with acceptance link
- Activity logged: "Invitation sent to [email]"

**SQL Query:**
```sql
INSERT INTO project_invitations (...)
VALUES (...);
-- Trigger auto-sets expires_at and prevents duplicates
```

**Error Responses:**
- `400 Bad Request`: User already on team, duplicate pending invitation, invalid email
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: No permission to invite (not primary contact or PM)
- `404 Not Found`: Project not found

---

### 4. Resend Invitation

Regenerate token and resend invitation email.

```
POST /api/invitations/:invitationId/resend
```

**Authentication:** Required (primary contact or PM only)

**Path Parameters:**
- `invitationId` (required): UUID of the invitation

**Rate Limiting:**
- Max 3 resends per hour per invitation

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "invitation": {
      "id": "inv_abc123",
      "email": "david@acmecorp.com",
      "status": "pending",
      "expiresAt": "2025-11-23T10:00:00Z",
      "resentAt": "2025-11-16T10:00:00Z",
      "resentCount": 1
    }
  },
  "message": "Invitation resent to david@acmecorp.com"
}
```

**Side Effects:**
- New token generated (application layer: crypto.randomBytes)
- Expiry reset to 7 days from now
- Status reset to 'pending' (if was 'expired')
- Email sent to invitee
- resent_count incremented
- resent_at timestamp updated

**SQL Query:**
```sql
-- Application layer generates new token first using crypto.randomBytes(32).toString('hex')
SELECT resend_invitation(:invitationId, :newToken);
-- newToken = crypto.randomBytes(32).toString('hex')  (64 character hex string)
```

**Error Responses:**
- `400 Bad Request`: Already accepted/revoked, rate limit exceeded
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: No permission
- `404 Not Found`: Invitation not found

---

### 5. Revoke Invitation

Cancel a pending invitation before it's accepted.

```
DELETE /api/invitations/:invitationId
```

**Authentication:** Required (primary contact or PM only)

**Path Parameters:**
- `invitationId` (required): UUID of the invitation

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Invitation revoked"
}
```

**Side Effects:**
- Invitation status set to 'revoked'
- revoked_at timestamp set
- revoked_by set to current user
- Acceptance link becomes invalid
- Email sent to invitee (optional)

**SQL Query:**
```sql
UPDATE project_invitations
SET status = 'revoked',
    revoked_at = CURRENT_TIMESTAMP,
    revoked_by = :currentUserId
WHERE id = :invitationId
  AND status = 'pending';
```

**Error Responses:**
- `400 Bad Request`: Already accepted/revoked
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: No permission
- `404 Not Found`: Invitation not found

---

## Public Endpoints (No Auth)

### 6. Verify Invitation

Verify invitation token and get details (public page load).

```
GET /api/invitations/verify?token=a7f3c9d2...
```

**Authentication:** None (public)

**Query Parameters:**
- `token` (required): 64-character hex token from invitation email

**Response (200 OK) - Valid:**
```json
{
  "valid": true,
  "email": "colleague@example.com",
  "projectName": "Brand Video Campaign",
  "inviterName": "Sarah Johnson",
  "personalMessage": "Hi! I'd like to invite you...",
  "expiresAt": "2025-11-23T10:00:00Z"
}
```

**Response (200 OK) - Invalid:**
```json
{
  "valid": false,
  "error": "expired",
  "message": "This invitation has expired"
}
```

**SQL Query:**
```sql
SELECT pi.*, p.name AS project_name, u.name AS inviter_name
FROM project_invitations pi
JOIN projects p ON pi.project_id = p.id
JOIN users u ON pi.invited_by = u.id
WHERE pi.token = :token;
```

**Error Reasons:**
- `expired`: Token exists but expired (>7 days)
- `revoked`: Token was revoked by primary contact
- `already_accepted`: Invitation already used
- `invalid_token`: Token doesn't exist or malformed

**Error Responses:**
- `400 Bad Request`: Missing or malformed token

---

### 7. Accept Invitation

Accept invitation and join project team (public action).

```
POST /api/invitations/:token/accept
```

**Authentication:** Required (user must be logged in)

**Path Parameters:**
- `token` (required): 64-character hex token from invitation email

**Email Matching:**
- User's email must match invitation email
- If mismatch, return 403 with error message

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "teamMember": {
      "id": "team_abc123",
      "userId": "user_michael789",
      "projectId": "proj_xyz123",
      "role": "client"
    },
    "redirectUrl": "/projects/proj_xyz123"
  },
  "message": "Welcome to Brand Video Campaign!"
}
```

**Side Effects:**
- Team member record created
- Invitation status set to 'accepted'
- accepted_at and accepted_by set
- Email sent to primary contact: "[Name] has accepted your invitation"
- Email sent to new member: "Welcome to [Project Name]"
- Activity logged: "[Name] joined the project team"

**SQL Query:**
```sql
SELECT accept_invitation(:token, :userId);
```

**Error Responses:**
- `400 Bad Request`: Invitation expired/revoked/already accepted
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Email mismatch
- `404 Not Found`: Invalid token

---

## Error Responses

### Standard Error Format

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": {
      "field": "Specific field error"
    }
  }
}
```

### Error Codes

| HTTP Status | Error Code | Description |
|-------------|-----------|-------------|
| 400 | `VALIDATION_ERROR` | Request validation failed |
| 400 | `DUPLICATE_INVITATION` | User already has pending invitation |
| 400 | `USER_ALREADY_MEMBER` | User is already on team |
| 400 | `CANNOT_REMOVE_SELF` | Cannot remove yourself |
| 400 | `CANNOT_REMOVE_PRIMARY` | Cannot remove primary contact |
| 400 | `CANNOT_REMOVE_LAST_PM` | Cannot remove last project manager |
| 400 | `INVITATION_EXPIRED` | Invitation token expired |
| 400 | `INVITATION_REVOKED` | Invitation was revoked |
| 400 | `RATE_LIMIT_EXCEEDED` | Too many resend attempts |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 403 | `FORBIDDEN` | No permission for this action |
| 403 | `EMAIL_MISMATCH` | User email doesn't match invitation |
| 404 | `NOT_FOUND` | Resource not found |
| 500 | `INTERNAL_ERROR` | Server error |

---

## Rate Limiting

- **Invitation creation**: 10 per hour per project
- **Invitation resend**: 3 per hour per invitation
- **Headers**:
  - `X-RateLimit-Limit`: Max requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Webhooks (Future Enhancement)

### Team Member Added
```json
{
  "event": "team.member_added",
  "data": {
    "projectId": "proj_xyz123",
    "userId": "user_michael789",
    "role": "client",
    "addedAt": "2025-11-16T10:00:00Z"
  }
}
```

### Team Member Removed
```json
{
  "event": "team.member_removed",
  "data": {
    "projectId": "proj_xyz123",
    "userId": "user_michael789",
    "removedAt": "2025-11-16T10:00:00Z",
    "removedBy": "user_sarah456"
  }
}
```

---

## Testing with cURL

### Create Invitation
```bash
curl -X POST https://api.motionify.studio/api/projects/proj_xyz123/invitations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "colleague@example.com",
    "personalMessage": "Join our project!",
    "role": "client"
  }'
```

### Verify Invitation (Public)
```bash
curl -X GET "https://api.motionify.studio/api/invitations/verify?token=a7f3c9d2..."
```

### Accept Invitation
```bash
curl -X POST https://api.motionify.studio/api/invitations/a7f3c9d2.../accept \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Remove Team Member
```bash
curl -X DELETE https://api.motionify.studio/api/projects/proj_xyz123/team/user_michael789 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Implementation Notes

### Token Generation (Application Layer)
```typescript
import crypto from 'crypto';

function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 64 chars
}
```

### Email Matching Validation
```typescript
async function validateInvitationEmail(token: string, userEmail: string): Promise<boolean> {
  const invitation = await db.query(
    'SELECT email FROM project_invitations WHERE token = $1',
    [token]
  );

  return invitation.email.toLowerCase() === userEmail.toLowerCase();
}
```

### Permission Checks
```typescript
async function canManageTeam(userId: string, projectId: string): Promise<boolean> {
  const member = await db.query(
    `SELECT role, is_primary_contact
     FROM project_team
     WHERE user_id = $1 AND project_id = $2 AND removed_at IS NULL`,
    [userId, projectId]
  );

  return member.is_primary_contact ||
         ['super_admin', 'project_manager'].includes(member.role);
}
```
