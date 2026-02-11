# API Endpoints: Authentication System

This document specifies all REST API endpoints for the authentication system.

## Base URL

```
Production: https://portal.motionify.studio/api
Development: http://localhost:3000/api
```

## Authentication

- **Public endpoints**: No authentication required (magic link request/verify, logout)
- **Protected endpoints**: Require valid JWT token in `Authorization: Bearer <token>` header OR `authToken` HTTP-only cookie
- **Admin endpoints**: Require JWT with `admin` or `super_admin` role

## Table of Contents

1. [Public Authentication Endpoints](#public-authentication-endpoints)
2. [Protected User Endpoints](#protected-user-endpoints)
3. [Admin Endpoints](#admin-endpoints)
4. [Error Responses](#error-responses)

---

## Public Authentication Endpoints

### 1. Request Magic Link

Generate and send a magic link email for passwordless login.

```
POST /api/auth/request-magic-link
```

**Authentication:** None (public endpoint)

**Request Body:**
```json
{
  "email": "john.doe@acmecorp.com",
  "rememberMe": true
}
```

**Validation:**
- `email`: Required, valid email format
- `rememberMe`: Optional boolean (default: false)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "If this email exists in our system, a magic link has been sent. Check your inbox."
}
```

**Side Effects:**
- If email exists: Generate 32-byte cryptographically secure token
- Create `magic_link_tokens` record (expires in 15 minutes)
- Send email via Amazon SES with magic link URL
- Log activity: `magic_link_requested` and `magic_link_sent`
- If email doesn't exist: Show success message anyway (security - prevent email enumeration)

**Error Responses:**
- `429 Too Many Requests`: Rate limit exceeded (3 requests/hour per email)
- `500 Internal Server Error`: Email send failure or database error

**Rate Limiting:**
- 3 requests per email per hour
- 10 requests per IP per hour

---

### 2. Verify Magic Link

Verify token from magic link and create authenticated session.

```
GET /api/auth/verify-magic-link?token={token}
```

**Authentication:** None (public endpoint)

**Query Parameters:**
- `token` (required): Base64-url encoded token from email (43 characters)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@acmecorp.com",
      "fullName": "John Doe",
      "role": "client",
      "avatarUrl": "https://r2.motionify.studio/avatars/550e8400.jpg",
      "isFirstLogin": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2025-02-14T14:32:00Z"
  },
  "message": "Login successful"
}
```

**Side Effects:**
- Validate token exists, not expired (<15 min), not used
- Mark token as used (`used_at = NOW()`)
- Generate JWT with payload: `{userId, email, role, fullName, sessionId, exp}`
- Create session record in `sessions` table
- Set HTTP-only cookie: `authToken` (Secure, SameSite=Strict, expires based on rememberMe)
- Update `users.last_login_at = NOW()`
- If first login: Send welcome email, set `users.is_first_login = false`
- Log activity: `magic_link_verified`, `login_success`, `session_created`

**Error Responses:**
- `400 Bad Request`: Token format invalid
- `401 Unauthorized`: Token not found, expired, or already used
- `500 Internal Server Error`: Database error

**Error Details:**
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "This magic link has expired. Please request a new one.",
    "field": "token"
  }
}
```

**Other Error Codes:**
- `TOKEN_NOT_FOUND`: Invalid token
- `TOKEN_ALREADY_USED`: Link already clicked
- `USER_DEACTIVATED`: User account is deactivated

---

### 3. Logout

Invalidate current session and clear authentication cookie.

```
POST /api/auth/logout
```

**Authentication:** Required (any authenticated user)

**Request Body:** Empty

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Side Effects:**
- Mark session as invalidated (`invalidated_at = NOW()`, `expires_at = NOW()`)
- Clear `authToken` HTTP-only cookie
- Log activity: `logout`

**Error Responses:**
- `401 Unauthorized`: Not logged in

---

### 4. Refresh Session

Extend session expiry (called automatically on each API request).

```
POST /api/auth/refresh-session
```

**Authentication:** Required (any authenticated user)

**Request Body:** Empty

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "expiresAt": "2025-02-15T10:00:00Z"
  },
  "message": "Session refreshed"
}
```

**Side Effects:**
- Update `sessions.last_active_at = NOW()`
- Extend `sessions.expires_at` based on rememberMe (30 days or 24 hours from now)
- Log activity: `session_refreshed` (optional, may skip logging to reduce noise)

**Error Responses:**
- `401 Unauthorized`: Invalid or expired session

---

## Protected User Endpoints

### 5. Get Current User Profile

Get authenticated user's profile information.

```
GET /api/auth/me
```

**Authentication:** Required (any authenticated user)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@acmecorp.com",
      "fullName": "John Doe",
      "role": "client",
      "avatarUrl": "https://r2.motionify.studio/avatars/550e8400.jpg",
      "status": "active",
      "createdAt": "2025-01-10T09:00:00Z",
      "lastLoginAt": "2025-01-15T14:30:00Z"
    },
    "session": {
      "expiresAt": "2025-02-14T14:32:00Z",
      "lastActiveAt": "2025-01-15T16:00:00Z",
      "rememberMe": true
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated

---

### 6. Update Own Profile

Update authenticated user's profile (name, avatar).

```
PATCH /api/auth/me
```

**Authentication:** Required (any authenticated user)

**Request Body:**
```json
{
  "fullName": "John Smith",
  "avatarUrl": "https://r2.motionify.studio/avatars/new-photo.jpg"
}
```

**Validation:**
- `fullName`: Optional, 1-255 characters
- `avatarUrl`: Optional, valid HTTPS URL, must be from approved domain (Cloudflare R2)
- Cannot update: `email`, `role`, `status` (admin-only)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "fullName": "John Smith",
      "avatarUrl": "https://r2.motionify.studio/avatars/new-photo.jpg",
      "updatedAt": "2025-01-15T16:30:00Z"
    }
  },
  "message": "Profile updated successfully"
}
```

**Side Effects:**
- Update `users.full_name` and/or `users.avatar_url`
- Update `users.updated_at = NOW()`
- Log activity: `profile_updated` (optional)

**Error Responses:**
- `400 Bad Request`: Validation failed
- `401 Unauthorized`: Not authenticated

---

### 7. Upload Avatar

Upload profile photo to Cloudflare R2.

```
POST /api/auth/me/avatar
```

**Authentication:** Required (any authenticated user)

**Request:** Multipart form data

**Form Fields:**
- `file`: Image file (required, max 5MB, jpg/png only)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "avatarUrl": "https://r2.motionify.studio/avatars/550e8400-1705328400.jpg"
  },
  "message": "Avatar uploaded successfully"
}
```

**Side Effects:**
- Upload image to Cloudflare R2 storage
- Generate unique filename: `{userId}-{timestamp}.{ext}`
- Update `users.avatar_url` to R2 URL
- Delete old avatar from R2 (if exists)
- Update `users.updated_at = NOW()`

**Error Responses:**
- `400 Bad Request`: Invalid file format or size
- `413 Payload Too Large`: File exceeds 5MB
- `500 Internal Server Error`: R2 upload failure

---

## Admin Endpoints

### 8. Get All Users (Admin)

Get paginated list of all users.

```
GET /api/admin/users
```

**Authentication:** Required (admin or super_admin)

**Query Parameters:**
- `status` (optional): Filter by status (pending_activation, active, deactivated)
- `role` (optional): Filter by role
- `search` (optional): Search by name or email
- `page` (optional): Page number (default 1)
- `limit` (optional): Items per page (default 20, max 100)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "fullName": "User Name",
        "role": "client",
        "status": "active",
        "lastLoginAt": "2025-01-15T14:30:00Z",
        "createdAt": "2025-01-10T09:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 47,
      "totalPages": 3
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not admin

---

### 9. Update User (Admin)

Update any user's profile, role, or status.

```
PATCH /api/admin/users/:userId
```

**Authentication:** Required (super_admin only)

**Request Body:**
```json
{
  "fullName": "Updated Name",
  "role": "project_manager",
  "status": "active"
}
```

**Validation:**
- Cannot change own role (prevents lockout)
- Cannot deactivate self (prevents lockout)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "fullName": "Updated Name",
      "role": "project_manager",
      "status": "active",
      "updatedAt": "2025-01-15T17:00:00Z"
    }
  },
  "message": "User updated successfully"
}
```

**Side Effects:**
- Update user fields
- If status changed to 'deactivated': Invalidate all user sessions
- Log activity: `user_updated_by_admin`

**Error Responses:**
- `400 Bad Request`: Validation failed or attempting to change own role
- `403 Forbidden`: Not super_admin
- `404 Not Found`: User not found

---

### 10. Get Activity Logs (Admin)

Get authentication activity logs.

```
GET /api/admin/activity-logs
```

**Authentication:** Required (admin or super_admin)

**Query Parameters:**
- `userId` (optional): Filter by user
- `event` (optional): Filter by event type
- `status` (optional): Filter by success/failure
- `dateFrom` (optional): Filter from date (ISO 8601)
- `dateTo` (optional): Filter to date (ISO 8601)
- `page` (optional): Page number (default 1)
- `limit` (optional): Items per page (default 50, max 200)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "userId": "uuid",
        "userEmail": "user@example.com",
        "event": "login_success",
        "description": "User logged in successfully via magic link",
        "status": "success",
        "ipAddress": "192.168.1.100",
        "createdAt": "2025-01-15T14:32:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 324
    }
  }
}
```

**Error Responses:**
- `403 Forbidden`: Not admin

---

## Error Responses

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "field": "fieldName",
    "details": {}
  }
}
```

### Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Request validation failed |
| 400 | `TOKEN_INVALID` | Magic link token format invalid |
| 401 | `TOKEN_EXPIRED` | Magic link has expired (>15 min) |
| 401 | `TOKEN_ALREADY_USED` | Magic link already clicked |
| 401 | `TOKEN_NOT_FOUND` | Invalid token |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 401 | `JWT_EXPIRED` | JWT token expired |
| 401 | `JWT_INVALID` | JWT signature verification failed |
| 401 | `USER_DEACTIVATED` | User account is deactivated |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `USER_NOT_FOUND` | User doesn't exist |
| 413 | `PAYLOAD_TOO_LARGE` | File upload exceeds size limit |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 503 | `SERVICE_UNAVAILABLE` | Database or email service unavailable |

---

## Security Headers

All API responses include security headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

## CORS Configuration

```javascript
{
  origin: ['https://portal.motionify.studio'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

---

**Last Updated:** November 19, 2025  
**API Version:** 1.0  
**Status:** Ready for Implementation
