# Data Models: Authentication System

This document defines all TypeScript interfaces and types for the authentication system.

## Table of Contents

1. [Main Models](#main-models)
2. [Supporting Models](#supporting-models)
3. [Enum Types](#enum-types)
4. [Relationships](#relationships)
5. [Validation Rules](#validation-rules)
6. [Example Data](#example-data)

---

## Main Models

### User Interface

The primary user model for authentication and authorization.

```typescript
export interface User {
  // Core Identification
  id: string;                          // UUID
  email: string;                       // Unique email address
  fullName: string;                    // User's full name
  role: UserRole;                      // 'client' | 'project_manager' | 'admin' | 'super_admin'
  
  // Profile
  avatarUrl: string | null;            // Profile photo URL (Cloudflare R2)
  
  // Account Status
  status: UserStatus;                  // 'pending_activation' | 'active' | 'deactivated'
  isFirstLogin: boolean;               // Whether this is user's first login
  
  // Timestamps
  createdAt: Date;                     // When user was created
  updatedAt: Date;                     // Last profile update
  lastLoginAt: Date | null;            // Last successful login
  deactivatedAt: Date | null;          // When user was deactivated (if applicable)
  
  // Metadata
  metadata: Record<string, any>;       // Additional custom data
}
```

### MagicLinkToken Interface

Tokens for passwordless authentication via email magic links.

```typescript
export interface MagicLinkToken {
  // Core Identification
  id: string;                          // UUID
  userId: string;                      // UUID - User this token is for
  token: string;                       // Cryptographically secure token (32 bytes, base64-url)
  
  // Expiry \u0026 Usage
  expiresAt: Date;                     // Expiry timestamp (15 minutes from creation)
  usedAt: Date | null;                 // When token was used (null if unused)
  rememberMe: boolean;                 // Whether to create long-lived session (30 days vs 24 hours)
  
  // Security
  ipAddress: string | null;            // IP address where token was requested
  userAgent: string | null;            // Browser user agent
  
  // Timestamps
  createdAt: Date;                     // When token was generated
}
```

### Session Interface

Active user sessions with JWT tokens.

```typescript
export interface Session {
  // Core Identification
  id: string;                          // UUID
  userId: string;                      // UUID - User this session belongs to
  jwtToken: string;                    // JWT token value (hashed in database)
  
  // Session Configuration
  expiresAt: Date;                     // Session expiry (30 days or 24 hours)
  lastActiveAt: Date;                  // Last API request timestamp
  rememberMe: boolean;                 // Whether this is a long-lived session
  
  // Device Information
  ipAddress: string;                   // IP address of login
  userAgent: string;                   // Browser/device user agent
  deviceFingerprint: string | null;    // Optional device fingerprint
  
  // Timestamps
  createdAt: Date;                     // When session was created (login time)
  invalidatedAt: Date | null;          // When session was invalidated (logout)
}
```

### ActivityLog Interface

Audit trail for authentication events.

```typescript
export interface ActivityLog {
  // Core Identification
  id: string;                          // UUID
  userId: string | null;               // UUID - User involved (null for failed attempts)
  
  // Event Details
  event: AuthEvent;                    // Type of event
  description: string;                 // Human-readable description
  status: 'success' | 'failure';       // Whether event succeeded
  
  // Context
  ipAddress: string;                   // Source IP address
  userAgent: string;                   // Browser/device info
  metadata: Record<string, any>;       // Additional context (e.g., error codes)
  
  // Timestamp
  createdAt: Date;                     // When event occurred
}
```

---

## Supporting Models

### JWTPayload Interface

Payload structure for JWT tokens.

```typescript
export interface JWTPayload {
  // User Information
  userId: string;                      // UUID
  email: string;                       // User's email
  role: UserRole;                      // User's role
  fullName: string;                    // User's full name
  
  // Token Metadata
  sessionId: string;                   // UUID - Associated session
  iat: number;                         // Issued at (Unix timestamp)
  exp: number;                         // Expiration (Unix timestamp)
  
  // Optional
  rememberMe?: boolean;                // Whether this is a long-lived token
}
```

### RateLimitEntry Interface

Rate limiting tracking for login attempts.

```typescript
export interface RateLimitEntry {
  identifier: string;                  // Email address or IP address
  type: 'email' | 'ip';               // Type of rate limit
  attempts: number;                    // Number of attempts
  windowStart: Date;                   // Start of current rate limit window
  expiresAt: Date;                     // When rate limit resets
}
```

---

## Enum Types

### UserRole

```typescript
export type UserRole =
  | 'client'              // Customer who owns projects
  | 'project_manager'     // Motionify project manager
  | 'admin'               // Admin with limited permissions
  | 'super_admin';        // Full admin access
```

### UserStatus

```typescript
export type UserStatus =
  | 'pending_activation'  // User created but hasn't logged in yet
  | 'active'              // User is active and can log in
  | 'deactivated';        // User account disabled by admin
```

### AuthEvent

```typescript
export type AuthEvent =
  // Magic Link Events
  | 'magic_link_requested'          // User requested magic link
  | 'magic_link_sent'               // Email sent successfully
  | 'magic_link_send_failed'        // Email send failed
  | 'magic_link_clicked'            // User clicked link
  | 'magic_link_verified'           // Token validated successfully
  | 'magic_link_expired'            // User clicked expired link
  | 'magic_link_already_used'       // User clicked already-used link
  | 'magic_link_invalid'            // Invalid token in URL
  
  // Session Events
  | 'login_success'                 // User logged in successfully
  | 'login_failure'                 // Login attempt failed
  | 'logout'                        // User logged out
  | 'session_created'               // New session created
  | 'session_refreshed'             // Session extended
  | 'session_expired'               // Session expired naturally
  | 'session_invalidated'           // Session force-invalidated
  
  // Rate Limit Events
  | 'rate_limit_email'              // Email rate limit hit
  | 'rate_limit_ip'                 // IP rate limit hit
  
  // Security Events
  | 'jwt_invalid'                   // Invalid JWT detected
  | 'jwt_expired'                   // Expired JWT
  | 'jwt_tampered'                  // JWT signature verification failed
  | 'suspicious_activity';          // Other suspicious behavior
```

---

## Relationships

### Entity Relationship Diagram

```
┌──────────────┐
│    users     │
└──────┬───────┘
       │
       │ 1:N
       │
       ├────────────────────┬──────────────────┬────────────────────┐
       ↓                    ↓                  ↓                    ↓
┌──────────────┐    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ magic_link_  │    │   sessions   │   │  activity_   │   │ rate_limit_  │
│   tokens     │    │              │   │    logs      │   │   entries    │
└──────────────┘    └──────────────┘   └──────────────┘   └──────────────┘

Relationships:
- User.id → MagicLinkToken.userId (1:N)
- User.id → Session.userId (1:N)
- User.id → ActivityLog.userId (1:N, nullable)
- RateLimitEntry.identifier = User.email or IP address
```

### Foreign Key Relationships

```typescript
// Magic Link Token belongs to User
MagicLinkToken.userId → User.id

// Session belongs to User
Session.userId → User.id

// Activity Log belongs to User (nullable for failed attempts)
ActivityLog.userId → User.id (nullable)
```

---

## Validation Rules

### User Validation

| Field | Required | Min | Max | Format |
|-------|----------|-----|-----|--------|
| email | Yes | - | - | Valid email format |
| fullName | Yes | 1 | 255 | Any string |
| role | Yes | - | - | Valid UserRole enum |
| status | Yes | - | - | Valid UserStatus enum |
| avatarUrl | No | - | - | Valid URL (HTTPS) |

### MagicLinkToken Validation

| Field | Required | Min | Max | Format |
|-------|----------|-----|-----|--------|
| userId | Yes | - | - | Valid UUID |
| token | Yes | 43 | 43 | Base64-url encoded (32 bytes) |
| expiresAt | Yes | - | - | Future timestamp |
| rememberMe | Yes | - | - | Boolean |

### Session Validation

| Field | Required | Min | Max | Format |
|-------|----------|-----|-----|--------|
| userId | Yes | - | - | Valid UUID |
| jwtToken | Yes | - | - | Valid JWT format |
| expiresAt | Yes | - | - | Future timestamp |
| ipAddress | Yes | - | - | Valid IP (v4 or v6) |

### Validation Schemas (Zod)

```typescript
import { z } from 'zod';

export const UserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(255),
  role: z.enum(['client', 'project_manager', 'admin', 'super_admin']),
  status: z.enum(['pending_activation', 'active', 'deactivated']),
  avatarUrl: z.string().url().startsWith('https://').nullable().optional(),
});

export const MagicLinkRequestSchema = z.object({
  email: z.string().email(),
  rememberMe: z.boolean().optional().default(false),
});

export const MagicLinkVerifySchema = z.object({
  token: z.string().length(43), // Base64-url encoded 32 bytes
});

export const SessionCreateSchema = z.object({
  userId: z.string().uuid(),
  rememberMe: z.boolean(),
  ipAddress: z.string().ip(),
  userAgent: z.string().min(1),
});
```

---

## Constants

```typescript
export const AUTH_CONFIG = {
  // Magic Link Settings
  MAGIC_LINK_EXPIRY_MINUTES: 15,
  MAGIC_LINK_TOKEN_BYTES: 32,
  
  // Session Settings
  SESSION_DURATION_SHORT: 24 * 60 * 60, // 24 hours in seconds
  SESSION_DURATION_LONG: 30 * 24 * 60 * 60, // 30 days in seconds
  
  // Rate Limiting
  RATE_LIMIT_EMAIL_MAX: 3,              // Max magic links per email per hour
  RATE_LIMIT_EMAIL_WINDOW: 60 * 60,     // 1 hour in seconds
  RATE_LIMIT_IP_MAX: 10,                // Max requests per IP per hour
  RATE_LIMIT_IP_WINDOW: 60 * 60,        // 1 hour in seconds
  
  // JWT Settings
  JWT_ALGORITHM: 'HS256' as const,
  JWT_ISSUER: 'motionify-portal',
  
  // Security
  BCRYPT_ROUNDS: 10,                    // For hashing JWT tokens in DB
  MAX_AVATAR_SIZE: 5 * 1024 * 1024,     // 5MB
} as const;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  'client': 'Client',
  'project_manager': 'Project Manager',
  'admin': 'Admin',
  'super_admin': 'Super Admin',
} as const;

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  'pending_activation': 'Pending Activation',
  'active': 'Active',
  'deactivated': 'Deactivated',
} as const;
```

---

## Example Data

### Sample User

```typescript
const sampleUser: User = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "john.doe@acmecorp.com",
  fullName: "John Doe",
  role: "client",
  avatarUrl: "https://r2.motionify.studio/avatars/550e8400.jpg",
  status: "active",
  isFirstLogin: false,
  createdAt: new Date("2025-01-10T09:00:00Z"),
  updatedAt: new Date("2025-01-15T14:30:00Z"),
  lastLoginAt: new Date("2025-01-15T14:30:00Z"),
  deactivatedAt: null,
  metadata: {},
};
```

### Sample MagicLinkToken

```typescript
const sampleToken: MagicLinkToken = {
  id: "660e8400-e29b-41d4-a716-446655440001",
  userId: "550e8400-e29b-41d4-a716-446655440000",
  token: "AbC123XyZ789_secure-random-base64url-token",
  expiresAt: new Date("2025-01-15T14:45:00Z"), // 15 min from creation
  usedAt: new Date("2025-01-15T14:32:00Z"),
  rememberMe: true,
  ipAddress: "192.168.1.100",
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
  createdAt: new Date("2025-01-15T14:30:00Z"),
};
```

### Sample Session

```typescript
const sampleSession: Session = {
  id: "770e8400-e29b-41d4-a716-446655440002",
  userId: "550e8400-e29b-41d4-a716-446655440000",
  jwtToken: "hashed_jwt_token_value_here", // Hashed in DB
  expiresAt: new Date("2025-02-14T14:32:00Z"), // 30 days from login
  lastActiveAt: new Date("2025-01-16T10:15:00Z"),
  rememberMe: true,
  ipAddress: "192.168.1.100",
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
  deviceFingerprint: "fp_abc123def456",
  createdAt: new Date("2025-01-15T14:32:00Z"),
  invalidatedAt: null,
};
```

### Sample ActivityLog

```typescript
const sampleActivity: ActivityLog = {
  id: "880e8400-e29b-41d4-a716-446655440003",
  userId: "550e8400-e29b-41d4-a716-446655440000",
  event: "login_success",
  description: "User logged in successfully via magic link",
  status: "success",
  ipAddress: "192.168.1.100",
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
  metadata: {
    sessionId: "770e8400-e29b-41d4-a716-446655440002",
    rememberMe: true,
  },
  createdAt: new Date("2025-01-15T14:32:00Z"),
};
```

### Sample JWTPayload

```typescript
const sampleJWTPayload: JWTPayload = {
  userId: "550e8400-e29b-41d4-a716-446655440000",
  email: "john.doe@acmecorp.com",
  role: "client",
  fullName: "John Doe",
  sessionId: "770e8400-e29b-41d4-a716-446655440002",
  iat: 1705327920, // Unix timestamp (Jan 15, 2025 14:32:00)
  exp: 1707919920, // Unix timestamp (Feb 14, 2025 14:32:00) - 30 days later
  rememberMe: true,
};
```

---

**Last Updated:** November 19, 2025  
**Data Model Version:** 1.0  
**Status:** Ready for Implementation
