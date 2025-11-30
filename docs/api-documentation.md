# Motionify PM Portal - API Documentation

## Base URL

- **Development**: `http://localhost:8888/api`
- **Production**: `https://motionify.studio/api`

## Authentication Endpoints

### 1. Request Magic Link

**Endpoint**: `POST /api/auth-request-magic-link`

**Description**: Request a magic link for passwordless authentication. The link will be sent to the user's email.

**Request Body**:
```json
{
  "email": "user@example.com",
  "rememberMe": false
}
```

**Parameters**:
- `email` (string, required): User's email address
- `rememberMe` (boolean, optional): If true, JWT expires in 7 days. If false, expires in 24 hours.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "If an account exists with this email, a magic link has been sent."
}
```

**Error Responses**:
- `400 Bad Request`: Invalid email format
- `500 Internal Server Error`: Server error

**Security Notes**:
- Always returns success even if email doesn't exist (prevents email enumeration)
- Magic link expires in 15 minutes
- One-time use only

**Example**:
```javascript
const response = await fetch('/api/auth-request-magic-link', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'client@example.com',
    rememberMe: true,
  }),
});

const data = await response.json();
console.log(data.message);
```

---

### 2. Verify Magic Link

**Endpoint**: `GET /api/auth-verify-magic-link`

**Description**: Verify magic link token and create authenticated session.

**Query Parameters**:
- `token` (string, required): Magic link token from email
- `rememberMe` (boolean, optional): Session duration preference

**Response** (200 OK):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "client"
  }
}
```

**Response Headers**:
```
Set-Cookie: authToken=...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800
```

**Error Responses**:
- `400 Bad Request`: Missing token parameter
- `401 Unauthorized`: Invalid or expired magic link
- `500 Internal Server Error`: Server error

**Security Notes**:
- Token is single-use (marked as used after verification)
- Creates HTTP-only cookie for browser sessions
- Returns JWT token for API requests

**Example**:
```javascript
// Frontend redirect from email link
// User clicks: https://portal.motionify.studio/auth/verify?token=abc123&rememberMe=true

// In your auth verification page:
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const rememberMe = params.get('rememberMe');

const response = await fetch(`/api/auth-verify-magic-link?token=${token}&rememberMe=${rememberMe}`);
const data = await response.json();

if (data.success) {
  // Store token in localStorage or use HTTP-only cookie
  localStorage.setItem('authToken', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));

  // Redirect to dashboard
  window.location.href = '/dashboard';
}
```

---

## User Roles

The API supports four user roles with different permissions:

| Role | Description | Permissions |
|------|-------------|-------------|
| `super_admin` | Full system access | All operations |
| `project_manager` | Motionify team member | Manage assigned projects, tasks, files |
| `team_member` | Motionify team member | View/update assigned tasks |
| `client` | External client | Read-only project access, messaging, revision requests |

---

## Authentication Flow

### Complete Magic Link Flow

```
1. User enters email on login page
   │
   ├─> POST /api/auth-request-magic-link { email, rememberMe }
   │
2. Backend validates email, generates token
   │
   ├─> Stores magic_links record (expires in 15 min)
   ├─> Sends email with magic link
   │
3. User clicks link in email
   │
   ├─> GET /api/auth-verify-magic-link?token=xxx&rememberMe=true
   │
4. Backend verifies token
   │
   ├─> Marks magic link as used
   ├─> Generates JWT token
   ├─> Creates session record
   ├─> Sets HTTP-only cookie
   │
5. Returns JWT + user info
   │
   └─> User redirected to dashboard
```

---

## JWT Token Structure

### Token Payload

```json
{
  "userId": "uuid-string",
  "email": "user@example.com",
  "role": "client",
  "rememberMe": true,
  "iat": 1704067200,
  "exp": 1704672000,
  "iss": "motionify-pm-portal",
  "aud": "motionify-clients"
}
```

### Token Expiration

- **With Remember Me**: 7 days
- **Without Remember Me**: 24 hours

### Using JWT in Requests

**Option 1: Authorization Header** (recommended for API calls)
```javascript
fetch('/api/protected-endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

**Option 2: HTTP-Only Cookie** (automatic for browser)
```javascript
// Cookie automatically included in requests
fetch('/api/protected-endpoint', {
  credentials: 'include',
});
```

---

## Protected Endpoints

### Authenticating Requests

All protected endpoints require authentication. Use the JWT token received from magic link verification.

**Example Protected Endpoint**:
```javascript
// netlify/functions/protected-example.js
import { authenticate } from './utils/jwt.js';

export async function handler(event) {
  // Authenticate request
  const user = authenticate(event);

  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  // User is authenticated
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Hello, ${user.email}!`,
      role: user.role,
    }),
  };
}
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 405 | Method Not Allowed | Wrong HTTP method |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## Rate Limiting

To prevent abuse, magic link requests are rate-limited:

- **3 requests per hour** per email address
- **10 requests per hour** per IP address

When rate limit is exceeded:
```json
{
  "error": "Too many requests. Please try again later.",
  "retryAfter": 3600
}
```

---

## Security Best Practices

### For Frontend Developers

1. **Never expose JWT secrets** in client-side code
2. **Use HTTPS** in production (enforced by Netlify)
3. **Store tokens securely**:
   - Use HTTP-only cookies (preferred)
   - Or use localStorage (less secure, but acceptable)
4. **Validate token expiration** before making requests
5. **Clear tokens on logout**

### For Backend Developers

1. **Always validate input** before database queries
2. **Use parameterized queries** to prevent SQL injection
3. **Hash sensitive data** before storage
4. **Log authentication attempts** for security monitoring
5. **Clean up expired records** periodically

---

## Testing Authentication

### Manual Testing with cURL

**Request Magic Link**:
```bash
curl -X POST http://localhost:8888/api/auth-request-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@motionify.studio","rememberMe":true}'
```

**Verify Magic Link** (get token from Mailtrap):
```bash
curl "http://localhost:8888/api/auth-verify-magic-link?token=ABC123&rememberMe=true"
```

**Use JWT Token**:
```bash
curl http://localhost:8888/api/protected-endpoint \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Database Schema Reference

### Relevant Tables

**users**
- `id` (uuid): Primary key
- `email` (varchar): Unique user email
- `full_name` (varchar): User's full name
- `role` (enum): User role
- `last_login_at` (timestamp): Last successful login

**magic_links**
- `id` (uuid): Primary key
- `user_id` (uuid): Foreign key to users
- `token` (varchar): Unique magic link token
- `expires_at` (timestamp): Token expiration (15 minutes)
- `used_at` (timestamp): When token was used (null if unused)
- `ip_address` (inet): Client IP address

**sessions**
- `id` (uuid): Primary key
- `user_id` (uuid): Foreign key to users
- `jwt_token_hash` (varchar): Hashed JWT token
- `remember_me` (boolean): Extended session flag
- `expires_at` (timestamp): Session expiration
- `last_active_at` (timestamp): Last activity timestamp
- `ip_address` (inet): Client IP address
- `user_agent` (text): Client user agent

---

## Environment Variables

Required environment variables for authentication:

```bash
# Database
DATABASE_URL=postgresql://...

# Email (Mailtrap for development)
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
EMAIL_FROM=noreply@motionify.local
EMAIL_FROM_NAME=Motionify PM Portal

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# Netlify (automatically set)
URL=http://localhost:8888
```

---

## Project Endpoints

### 3. Create Project

**Endpoint**: `POST /api/projects`

**Description**: Create a new project with deliverables and team assignments.

**Authorization**: Super Admin only

**Request Body**:
```json
{
  "name": "Brand Video Campaign",
  "description": "30-second promotional video for new product launch",
  "clientName": "Acme Corp",
  "startDate": "2025-01-15",
  "endDate": "2025-03-01",
  "totalRevisions": 3,
  "primaryContactId": "uuid-of-client-lead",
  "projectManagerId": "uuid-of-pm",
  "deliverables": [
    {
      "name": "Concept Development",
      "description": "Initial concepts and storyboards"
    },
    {
      "name": "Video Production",
      "description": "Final edited 30-second video"
    }
  ],
  "scope": {
    "inclusions": ["Scriptwriting", "Professional voiceover", "Motion graphics"],
    "exclusions": ["Live action filming", "Music licensing"]
  }
}
```

**Response** (201 Created):
```json
{
  "id": "uuid-string",
  "name": "Brand Video Campaign",
  "status": "in_progress",
  "deliverables": [
    { "id": "uuid-1", "name": "Concept Development", "status": "pending" },
    { "id": "uuid-2", "name": "Video Production", "status": "pending" }
  ],
  "revisions": { "total": 3, "used": 0 },
  "createdAt": "2025-01-15T10:00:00Z"
}
```

---

### 4. List Projects

**Endpoint**: `GET /api/projects`

**Description**: Get all projects accessible to the authenticated user.

**Authorization**: All authenticated users

**Query Parameters**:
- `status` (string, optional): Filter by status (in_progress, completed, archived)
- `role` (string, optional): Filter by user's role in project (pm, member, client)

**Response** (200 OK):
```json
{
  "projects": [
    {
      "id": "uuid-string",
      "name": "Brand Video Campaign",
      "client": "Acme Corp",
      "status": "in_progress",
      "revisions": { "total": 3, "used": 1 },
      "deliverables": { "total": 2, "completed": 0 },
      "team": {
        "motionify": 3,
        "client": 2
      },
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-20T14:30:00Z"
    }
  ]
}
```

---

### 5. Get Project Details

**Endpoint**: `GET /api/projects/:id`

**Description**: Get comprehensive project information.

**Authorization**: Project team members only

**Response** (200 OK):
```json
{
  "id": "uuid-string",
  "name": "Brand Video Campaign",
  "description": "30-second promotional video...",
  "client": "Acme Corp",
  "status": "in_progress",
  "dates": {
    "start": "2025-01-15",
    "end": "2025-03-01"
  },
  "revisions": {
    "total": 3,
    "used": 1,
    "remaining": 2
  },
  "deliverables": [
    {
      "id": "uuid-1",
      "name": "Concept Development",
      "description": "Initial concepts and storyboards",
      "status": "completed",
      "approvedAt": "2025-01-25T10:00:00Z"
    }
  ],
  "team": {
    "motionify": [
      { "id": "uuid", "name": "Jane Smith", "role": "project_manager" }
    ],
    "client": [
      { "id": "uuid", "name": "John Doe", "role": "client", "isPrimaryContact": true }
    ]
  },
  "scope": {
    "inclusions": ["Scriptwriting", "Professional voiceover"],
    "exclusions": ["Live action filming"]
  },
  "termsAccepted": true,
  "termsAcceptedAt": "2025-01-15T11:00:00Z"
}
```

---

## Project Deliverables

### 6. Add Deliverable

**Endpoint**: `POST /api/projects/:id/deliverables`

**Description**: Add a new deliverable to an existing project.

**Authorization**: Super Admin or Project Manager

**Request Body**:
```json
{
  "name": "Social Media Cutdowns",
  "description": "15-second versions for Instagram/TikTok"
}
```

**Response** (201 Created):
```json
{
  "id": "uuid-string",
  "projectId": "uuid-of-project",
  "name": "Social Media Cutdowns",
  "description": "15-second versions for Instagram/TikTok",
  "status": "pending",
  "createdAt": "2025-01-20T10:00:00Z"
}
```

---

### 7. Update/Delete Deliverable

**Endpoint**: `PATCH /api/deliverables/:id`
**Endpoint**: `DELETE /api/deliverables/:id`

**Authorization**: Super Admin or Project Manager

**Note**: Cannot delete deliverable if it has associated tasks or files. Must reassign first.

---

## Project Terms

### 8. Get Project Terms

**Endpoint**: `GET /api/projects/:id/terms`

**Description**: Get project terms for client review.

**Authorization**: Project team members

**Response** (200 OK):
```json
{
  "id": "uuid-string",
  "projectId": "uuid-of-project",
  "version": 1,
  "scope": {
    "inclusions": ["Scriptwriting", "Voiceover"],
    "exclusions": ["Live action filming"]
  },
  "deliverables": [
    { "name": "Concept Development", "description": "..." }
  ],
  "revisions": { "total": 3, "policy": "Additional revisions require approval" },
  "timeline": { "start": "2025-01-15", "end": "2025-03-01" },
  "pricing": "As agreed in contract",
  "acceptedBy": "uuid-of-client",
  "acceptedAt": "2025-01-15T11:00:00Z",
  "status": "accepted"
}
```

---

### 9. Accept Project Terms

**Endpoint**: `POST /api/projects/:id/terms/accept`

**Description**: Client primary contact accepts project terms.

**Authorization**: Client Primary Contact only

**Request Body**:
```json
{
  "accepted": true
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "acceptedAt": "2025-01-15T11:00:00Z"
}
```

---

### 10. Request Terms Revision

**Endpoint**: `POST /api/projects/:id/terms/request-revision`

**Description**: Client requests changes to project terms.

**Authorization**: Client Primary Contact only

**Request Body**:
```json
{
  "comments": "We'd like to add 2 social media cutdowns to the deliverables"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "revisionRequestId": "uuid-string",
  "status": "pending_admin_review"
}
```

---

## Task Endpoints

### 11. Create Task

**Endpoint**: `POST /api/projects/:id/tasks`

**Description**: Create a new task linked to a deliverable.

**Authorization**: Motionify team members only

**Request Body**:
```json
{
  "title": "Create storyboard concepts",
  "description": "Develop 3 initial storyboard concepts",
  "deliverableId": "uuid-of-deliverable",
  "visibleToClient": true,
  "deadline": "2025-01-25",
  "assignees": ["uuid-user-1", "uuid-user-2"]
}
```

**Response** (201 Created):
```json
{
  "id": "uuid-string",
  "title": "Create storyboard concepts",
  "status": "pending",
  "deliverableId": "uuid-of-deliverable",
  "assignees": [
    { "id": "uuid-user-1", "name": "Jane Smith" }
  ],
  "followers": [],
  "createdAt": "2025-01-15T10:00:00Z"
}
```

---

### 12. Update Task Status

**Endpoint**: `PATCH /api/tasks/:id/status`

**Description**: Update task status following valid state transitions.

**Authorization**: Varies by transition (see state machine)

**Request Body**:
```json
{
  "status": "awaiting_approval",
  "deliveryNotes": "Uploaded 3 storyboard concepts to the Files tab. Please review and let us know which direction you prefer."
}
```

**Response** (200 OK):
```json
{
  "id": "uuid-string",
  "status": "awaiting_approval",
  "deliveryNotes": "Uploaded 3 storyboard concepts...",
  "updatedAt": "2025-01-22T14:30:00Z"
}
```

**Valid State Transitions**:
- `pending` → `in_progress` (Any team member)
- `in_progress` → `awaiting_approval` (Motionify team only)
- `awaiting_approval` → `completed` (Client Primary Contact only)
- `awaiting_approval` → `revision_requested` (Client Primary Contact only)
- `revision_requested` → `in_progress` (Motionify team)
- `completed` → `in_progress` (Admin only - reopen)

---

### 13. Assign/Unassign Task

**Endpoint**: `POST /api/tasks/:id/assign`
**Endpoint**: `DELETE /api/tasks/:id/assign/:userId`

**Description**: Assign or unassign team members to a task (supports multiple assignees).

**Authorization**: All team members can assign tasks

**Request Body** (POST):
```json
{
  "userIds": ["uuid-user-1", "uuid-user-2"]
}
```

**Response** (200 OK):
```json
{
  "taskId": "uuid-string",
  "assignees": [
    { "id": "uuid-user-1", "name": "Jane Smith" },
    { "id": "uuid-user-2", "name": "John Doe" }
  ]
}
```

---

### 14. Follow/Unfollow Task

**Endpoint**: `POST /api/tasks/:id/follow`
**Endpoint**: `DELETE /api/tasks/:id/follow`

**Description**: Follow a task to receive notifications without being assigned.

**Authorization**: All project team members

**Response** (200 OK):
```json
{
  "taskId": "uuid-string",
  "following": true,
  "followers": [
    { "id": "uuid-user-1", "name": "Jane Smith" },
    { "id": "uuid-user-2", "name": "Mike Johnson" }
  ],
  "followerCount": 2
}
```

**Note**: Assignees automatically follow their assigned tasks.

---

### 15. Add Task Comment

**Endpoint**: `POST /api/tasks/:id/comments`

**Description**: Add a comment to a task.

**Authorization**: All project team members

**Request Body**:
```json
{
  "content": "I like concept #2 best. Can we explore that direction further? @JaneSmith",
  "mentions": ["uuid-of-jane"]
}
```

**Response** (201 Created):
```json
{
  "id": "uuid-string",
  "taskId": "uuid-of-task",
  "userId": "uuid-of-commenter",
  "userName": "John Doe",
  "content": "I like concept #2 best...",
  "createdAt": "2025-01-22T15:00:00Z",
  "updatedAt": null
}
```

---

## File Endpoints

### 16. Generate Upload URL

**Endpoint**: `POST /api/files/upload-url`

**Description**: Generate presigned URL for direct upload to Cloudflare R2.

**Authorization**: All project team members

**Request Body**:
```json
{
  "projectId": "uuid-of-project",
  "deliverableId": "uuid-of-deliverable",
  "fileName": "storyboard-concept-2.pdf",
  "fileSize": 2048576,
  "contentType": "application/pdf"
}
```

**Response** (200 OK):
```json
{
  "uploadUrl": "https://motionify-files.r2.cloudflarestorage.com/upload?presigned=...",
  "fileId": "uuid-string",
  "expiresIn": 3600
}
```

**Upload Flow**:
1. Call this endpoint to get presigned URL
2. Upload file directly to R2 using the URL (PUT request)
3. Call `POST /api/files` to register the file in database

---

### 17. Register Uploaded File

**Endpoint**: `POST /api/files`

**Description**: Register uploaded file metadata in database after R2 upload.

**Authorization**: All project team members

**Request Body**:
```json
{
  "fileId": "uuid-from-upload-url-response",
  "description": "Storyboard concept #2 - preferred direction"
}
```

**Response** (201 Created):
```json
{
  "id": "uuid-string",
  "name": "storyboard-concept-2.pdf",
  "size": 2048576,
  "type": "application/pdf",
  "deliverableId": "uuid-of-deliverable",
  "uploadedBy": { "id": "uuid", "name": "Jane Smith" },
  "uploadedAt": "2025-01-22T16:00:00Z"
}
```

---

### 18. Get Download URL

**Endpoint**: `GET /api/files/:id/download-url`

**Description**: Generate presigned download URL for R2 file.

**Authorization**: All project team members

**Response** (200 OK):
```json
{
  "downloadUrl": "https://motionify-files.r2.cloudflarestorage.com/download?presigned=...",
  "expiresIn": 3600
}
```

---

### 19. List Project Files

**Endpoint**: `GET /api/projects/:id/files`

**Description**: Get all files for a project, optionally filtered by deliverable.

**Query Parameters**:
- `deliverableId` (uuid, optional): Filter by deliverable

**Response** (200 OK):
```json
{
  "files": [
    {
      "id": "uuid-string",
      "name": "storyboard-concept-2.pdf",
      "size": 2048576,
      "type": "application/pdf",
      "deliverableId": "uuid-of-deliverable",
      "deliverableName": "Concept Development",
      "uploadedBy": { "id": "uuid", "name": "Jane Smith" },
      "uploadedAt": "2025-01-22T16:00:00Z",
      "commentCount": 3
    }
  ]
}
```

---

## Deliverable Approval Endpoints

### 20. Approve Deliverable

**Endpoint**: `POST /api/deliverables/:id/approve`

**Description**: Client primary contact approves a completed deliverable.

**Authorization**: Client Primary Contact only

**Request Body**:
```json
{
  "comments": "Great work! The storyboards look perfect."
}
```

**Response** (200 OK):
```json
{
  "deliverableId": "uuid-string",
  "status": "approved",
  "approvedBy": { "id": "uuid", "name": "John Doe" },
  "approvedAt": "2025-01-25T10:00:00Z",
  "comments": "Great work! The storyboards look perfect."
}
```

---

### 21. Request Deliverable Revision

**Endpoint**: `POST /api/deliverables/:id/request-revision`

**Description**: Client requests revisions on a deliverable (uses revision count).

**Authorization**: Client Primary Contact only

**Request Body**:
```json
{
  "comments": "Please adjust the color scheme in concept #2 to match our brand guidelines.",
  "priority": "high"
}
```

**Response** (200 OK):
```json
{
  "deliverableId": "uuid-string",
  "status": "revision_requested",
  "revisionNumber": 1,
  "projectRevisions": { "total": 3, "used": 2, "remaining": 1 },
  "requestedAt": "2025-01-25T10:00:00Z"
}
```

**Error Response** (400 Bad Request) - No revisions remaining:
```json
{
  "error": "No revisions remaining. Please request additional revisions first.",
  "revisionsUsed": 3,
  "revisionsTotal": 3
}
```

---

### 22. Request Additional Revisions

**Endpoint**: `POST /api/projects/:id/revisions/request-additional`

**Description**: Client requests additional revisions beyond project quota.

**Authorization**: Client Primary Contact only

**Request Body**:
```json
{
  "requestedCount": 2,
  "reason": "Client changed brand direction after initial approval. Need to revisit color scheme and messaging."
}
```

**Response** (200 OK):
```json
{
  "requestId": "uuid-string",
  "status": "pending_approval",
  "requestedCount": 2,
  "submittedAt": "2025-02-01T10:00:00Z"
}
```

---

### 23. Approve/Decline Additional Revision Request (Admin)

**Endpoint**: `PATCH /api/projects/:id/revisions/approve-request`
**Endpoint**: `PATCH /api/projects/:id/revisions/decline-request`

**Description**: Admin approves or declines client's request for additional revisions.

**Authorization**: Super Admin or Project Manager

**Request Body** (Approve):
```json
{
  "requestId": "uuid-of-request",
  "approved": true,
  "comments": "Approved. Brand direction change is reasonable."
}
```

**Request Body** (Decline):
```json
{
  "requestId": "uuid-of-request",
  "approved": false,
  "comments": "This should have been caught in the initial brief. Let's discuss offline."
}
```

**Response** (200 OK):
```json
{
  "requestId": "uuid-string",
  "status": "approved",
  "newTotalRevisions": 5,
  "approvedBy": { "id": "uuid", "name": "Admin Name" },
  "approvedAt": "2025-02-01T11:00:00Z"
}
```

---

## Team Invitation Endpoints

### 24. Create Team Invitation

**Endpoint**: `POST /api/projects/:id/invitations`

**Description**: Invite team members to a project via email.

**Authorization**:
- Admin: Can invite Motionify team
- Client Primary Contact: Can invite client team

**Request Body**:
```json
{
  "email": "newmember@client.com",
  "name": "Sarah Johnson",
  "role": "client"
}
```

**Response** (201 Created):
```json
{
  "invitationId": "uuid-string",
  "email": "newmember@client.com",
  "token": "unique-invitation-token",
  "inviteLink": "https://portal.motionify.studio/invite/accept?token=...",
  "expiresAt": "2025-01-22T10:00:00Z",
  "status": "pending"
}
```

---

### 25. Accept Invitation

**Endpoint**: `POST /api/invitations/:token/accept`

**Description**: Accept a team invitation and join the project.

**Authorization**: None required (uses invitation token)

**Response** (200 OK):
```json
{
  "success": true,
  "projectId": "uuid-of-project",
  "userId": "uuid-of-new-user",
  "message": "You've been added to the Brand Video Campaign project"
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "Invitation expired or invalid"
}
```

---

### 26. List Project Invitations

**Endpoint**: `GET /api/projects/:id/invitations`

**Description**: View pending and accepted invitations for a project.

**Authorization**: Admin or Client Primary Contact

**Response** (200 OK):
```json
{
  "invitations": [
    {
      "id": "uuid-string",
      "email": "newmember@client.com",
      "name": "Sarah Johnson",
      "role": "client",
      "status": "pending",
      "invitedBy": { "id": "uuid", "name": "John Doe" },
      "invitedAt": "2025-01-15T10:00:00Z",
      "expiresAt": "2025-01-22T10:00:00Z"
    }
  ]
}
```

---

## Notification Endpoints

### 27. Get Notifications

**Endpoint**: `GET /api/notifications`

**Description**: Get user's notifications.

**Authorization**: All authenticated users

**Query Parameters**:
- `read` (boolean, optional): Filter by read status
- `limit` (number, optional): Limit results (default: 50)
- `offset` (number, optional): Pagination offset

**Response** (200 OK):
```json
{
  "notifications": [
    {
      "id": "uuid-string",
      "type": "task_assigned",
      "message": "You were assigned to 'Create storyboard concepts'",
      "projectId": "uuid-of-project",
      "taskId": "uuid-of-task",
      "read": false,
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "unreadCount": 5
}
```

---

### 28. Mark Notification as Read

**Endpoint**: `PATCH /api/notifications/:id/read`
**Endpoint**: `POST /api/notifications/mark-all-read`

**Authorization**: Notification owner only

**Response** (200 OK):
```json
{
  "success": true,
  "notificationId": "uuid-string",
  "read": true
}
```

---

## Activity Log Endpoints

### 29. Get Project Activities

**Endpoint**: `GET /api/projects/:id/activities`

**Description**: Get activity feed for a project.

**Authorization**: Project team members

**Query Parameters**:
- `limit` (number, optional): Limit results (default: 50)
- `offset` (number, optional): Pagination offset
- `type` (string, optional): Filter by activity type

**Response** (200 OK):
```json
{
  "activities": [
    {
      "id": "uuid-string",
      "type": "task_status_changed",
      "userId": "uuid-of-user",
      "userName": "Jane Smith",
      "details": {
        "taskId": "uuid",
        "taskTitle": "Create storyboard concepts",
        "oldStatus": "in_progress",
        "newStatus": "awaiting_approval"
      },
      "timestamp": "2025-01-22T14:30:00Z"
    }
  ]
}
```

---

## Error Handling

### Additional Error Codes

| Code | Meaning | Example |
|------|---------|---------|
| 400 | Bad Request | Invalid deliverable ID, revision count exceeded |
| 403 | Forbidden | Non-admin trying to create project, client trying to edit task |
| 404 | Not Found | Project, task, or file not found |
| 409 | Conflict | Duplicate deliverable name, invalid state transition |
| 422 | Unprocessable Entity | Validation errors, cannot delete deliverable with tasks |

---

## Testing Endpoints

### Example Workflow: Complete Project Lifecycle

```bash
# 1. Admin creates project
curl -X POST http://localhost:8888/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Brand Video Campaign",
    "clientName": "Acme Corp",
    "totalRevisions": 3,
    "deliverables": [
      {"name": "Concept Development"}
    ]
  }'

# 2. Client accepts project terms
curl -X POST http://localhost:8888/api/projects/$PROJECT_ID/terms/accept \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -d '{"accepted": true}'

# 3. PM creates task
curl -X POST http://localhost:8888/api/projects/$PROJECT_ID/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Create storyboards",
    "deliverableId": "$DELIVERABLE_ID",
    "assignees": ["$USER_ID"]
  }'

# 4. Team member follows task
curl -X POST http://localhost:8888/api/tasks/$TASK_ID/follow \
  -H "Authorization: Bearer $TEAM_TOKEN"

# 5. Upload file
curl -X POST http://localhost:8888/api/files/upload-url \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "projectId": "$PROJECT_ID",
    "deliverableId": "$DELIVERABLE_ID",
    "fileName": "storyboard.pdf",
    "contentType": "application/pdf"
  }'

# 6. Mark task awaiting approval
curl -X PATCH http://localhost:8888/api/tasks/$TASK_ID/status \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "awaiting_approval",
    "deliveryNotes": "Storyboard uploaded"
  }'

# 7. Client approves deliverable
curl -X POST http://localhost:8888/api/deliverables/$DELIVERABLE_ID/approve \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -d '{"comments": "Looks great!"}'
```

---

**Last Updated**: 2025-11-06
**API Version**: 1.0
**Status**:
- ✅ Authentication Complete
- 📋 Core Endpoints Documented (Pending Implementation)
- 🔄 Workflow Endpoints Documented (Pending Implementation)
