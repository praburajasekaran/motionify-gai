# Authentication System

> **Version:** 1.0
> **Status:** MVP Development Phase (Core Foundation)
> **Last Updated:** November 17, 2025

## Overview

The Authentication System provides secure, passwordless access to the Motionify PM Portal using magic link technology. Users receive a one-time login link via email, eliminating password management while maintaining security through JWT tokens and HTTP-only cookies. The system supports session persistence across browser tabs, automatic token refresh for active users, and role-based access control for the platform's four user types.

## Customer Journey Summary

```
Email Entry → Magic Link Sent → Click Link → Auto-Login → Dashboard Access → Session Persists (30 days)
```

## Key Benefits

- **Zero Password Friction** - Users never create or remember passwords, reducing support tickets and improving security
- **Enterprise-Grade Security** - Magic links expire in 15 minutes, single-use tokens, HTTP-only cookies, and JWT-based sessions prevent unauthorized access
- **Seamless Experience** - Sessions persist for 30 days with automatic refresh, allowing users to stay logged in across devices and browser sessions

## Documentation Structure

This feature is documented across multiple files for modularity and ease of review:

### 1. [User Journey](./01-user-journey.md)
Complete workflow including:
- Magic link request and verification flows
- Session management and token refresh
- User profile management workflows
- State transition diagrams for auth states
- Error handling and edge cases

### 2. [Wireframes](./02-wireframes.md)
ASCII wireframes for all screens:
- **Login Screen** - Email input and magic link request
- **Email Verification Message** - Success state after request
- **Auth Verification** - Loading state while verifying link
- **User Profile** - Profile management interface
- **Session Expired** - Re-authentication prompt

### 3. [Data Models](./03-data-models.md)
TypeScript interfaces for:
- `User` - Core user profile with role and authentication status
- `MagicLinkToken` - Temporary authentication tokens
- `Session` - Active user sessions with JWT tokens
- `AuthContext` - Frontend authentication state
- API request/response types

### 4. [Database Schema](./04-database-schema.sql)
SQL table definitions for:
- `users` - User authentication and profile data
- `magic_link_tokens` - Temporary magic link tokens
- `sessions` - Active user sessions

### 5. [API Endpoints](./05-api-endpoints.md)
REST API specifications:
- 2 public authentication endpoints (request, verify)
- 4 protected user endpoints (logout, refresh, profile update, avatar upload)
- Rate limiting and security specifications

### 6. [Email Templates](./06-email-templates.md)
Notification specifications:
- 3 authentication email templates (magic link, welcome, session expiry warning)
- Email delivery and spam prevention guidelines

### 7. [Test Cases](./07-test-cases.md)
Comprehensive test scenarios covering:
- Magic link authentication flow (12 cases)
- Session management (8 cases)
- User profile management (6 cases)
- Security and rate limiting (6 cases)

## Technical Requirements

### Frontend
- ✅ `/src/lib/portal/components/LoginScreen.tsx` - Email input and magic link request UI
- 🔄 `/src/lib/portal/AppRoot.tsx` - Session management (needs JWT upgrade from localStorage)
- 📋 `/src/pages/AuthVerify.tsx` - Magic link verification page (to be created)
- 📋 `/src/contexts/AuthContext.tsx` - Authentication state management (to be created)
- 📋 `/src/components/ProtectedRoute.tsx` - Route protection wrapper (to be created)
- 📋 User profile management page (US-003)

### Backend
- `POST /api/auth/request-magic-link` - Generate and send magic link
- `GET /api/auth/verify-magic-link` - Verify token and create session
- `POST /api/auth/logout` - Invalidate session
- `POST /api/auth/refresh-token` - Refresh active session
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update user profile
- `POST /api/users/me/avatar` - Upload profile photo

### Infrastructure
- Amazon SES for email delivery (hello@motionify.studio)
- Mailtrap for development email testing
- JWT secret key management (environment variable)
- HTTP-only cookie configuration (Secure, SameSite=Strict)
- Rate limiting: 3 requests/hour per email, 10 requests/hour per IP

## Implementation Phases

1. **Phase 1 (Week 1-2):** Magic Link Authentication
   - Backend: Magic link generation, email sending, token verification
   - Frontend: Login screen, auth verification page, basic session storage
   - Database: users, magic_link_tokens, sessions tables
   - Email: Magic link template with Mailtrap integration

2. **Phase 2 (Week 2):** Session Management
   - JWT token generation and validation
   - HTTP-only cookie implementation
   - Automatic token refresh for active users
   - Logout and session cleanup
   - Protected route middleware

3. **Phase 3 (Week 3):** User Profile Management (Post-MVP)
   - Profile view and edit interface
   - Avatar upload to Cloudflare R2
   - Activity history display
   - Notification preferences

**Estimated Timeline:** 2-3 weeks (MVP core), +1 week (profile features)

## Success Metrics

- **Login Success Rate** - >95% of magic link requests result in successful login
- **Email Delivery** - >99% of magic links delivered within 30 seconds
- **Session Duration** - Average session length >7 days (indicates successful persistence)
- **Security Incidents** - Zero unauthorized access attempts succeed

## Related Documentation

- [User Stories](/docs/user-stories.md) - US-001 (Magic Link), US-002 (Session), US-003 (Profile)
- [API Documentation](/docs/api-documentation.md) - Complete authentication flow
- [Implementation Plan](/docs/IMPLEMENTATION_PLAN.md) - Phase 1 foundation details
- [User Roles](/docs/user-stories.md#user-roles) - Role permissions matrix

## Questions or Feedback?

For questions about this feature specification, contact the product team.
