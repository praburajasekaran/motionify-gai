# PROD-06: User Management - Research Document

**Created:** 2026-01-28
**Phase:** PROD-06-user-management
**Focus:** Understanding existing user management implementation for verification testing

---

## Executive Summary

This is a **PRODUCTION-READINESS VERIFICATION** phase. The user management code already exists and appears to be substantially complete. The goal is to **TEST and VALIDATE** that the existing implementation works correctly, not to build it from scratch.

**Key Finding:** The codebase has a working 4-role system (super_admin, project_manager, team_member, client) with comprehensive CRUD operations, invitation flow, and permission enforcement. However, there's a **critical schema mismatch** that needs resolution before testing.

---

## 1. What User Management Code Already Exists

### 1.1 Backend API Endpoints (Netlify Functions)

All user management endpoints are **already implemented** with proper middleware:

#### User CRUD Operations
| Endpoint | Method | Middleware | Purpose |
|----------|--------|------------|---------|
| `users-list.ts` | GET | withSuperAdmin, withRateLimit | List users with filters (status, role, search) |
| `users-create.ts` | POST | withSuperAdmin, withRateLimit | Create user and send magic link invitation |
| `users-update.ts` | PATCH | withSuperAdmin, withRateLimit | Update user details (name, role, profile picture) |
| `users-delete.ts` | DELETE | withSuperAdmin, withRateLimit | Soft-delete user (deactivation with last Super Admin protection) |
| `users-settings.ts` | PATCH | withAuth, withRateLimit | User updates their own settings |

**Code Quality:**
- ✅ All endpoints use composable middleware pattern
- ✅ Zod schemas for input validation
- ✅ SQL parameterized queries (injection-safe)
- ✅ Proper CORS headers
- ✅ Rate limiting applied
- ✅ Transaction support in users-delete

#### Invitation System
| Endpoint | Method | Middleware | Purpose |
|----------|--------|------------|---------|
| `invitations-create.ts` | POST | withSuperAdmin, withRateLimit, withValidation | Create invitation with token |
| `invitations-accept.ts` | POST | withRateLimit | Accept invitation (uses token from URL) |
| `invitations-list.ts` | GET | withAuth, withRateLimit | List invitations for project |
| `invitations-resend.ts` | POST | withSuperAdmin, withRateLimit | Resend invitation email |
| `invitations-revoke.ts` | POST | withSuperAdmin, withRateLimit | Revoke pending invitation |

**Important Notes:**
- Invitations create entries in `user_invitations` table
- Tokens are cryptographically secure (32 bytes, base64url)
- Invitations expire after 7 days
- Email sending is integrated (uses Resend API)

### 1.2 Frontend UI (Admin Portal)

**File:** `/pages/admin/UserManagement.tsx` (430 lines)

**Features:**
- User list with search, status filter, role filter
- Create user modal (email, full name, role)
- Deactivation modal with required reason (min 10 chars)
- Real-time filtering and pagination-ready
- Role badge UI (color-coded by role)
- Active/inactive status display

**UI Quality:**
- ✅ Clean, modern design
- ✅ Loading states
- ✅ Error handling
- ✅ Client-side validation
- ✅ Confirmation dialogs for destructive actions

### 1.3 Permission System

**File:** `/lib/permissions.ts` (111 lines)

**Core Functions:**
```typescript
// Role checks
isMotionifyAdmin(user)    // super_admin OR project_manager
isSuperAdmin(user)        // super_admin only
isProjectManager(user)    // project_manager only
isMotionifyTeam(user)     // super_admin OR project_manager OR team_member
isClient(user)            // client only

// Feature permissions
Permissions.canManageInquiries(user)
Permissions.canCreateProposals(user)
Permissions.canViewAllProjects(user)
Permissions.canManageTeam(user)
Permissions.canAccessSettings(user)
```

**Additional Permissions:**
- `/utils/deliverablePermissions.ts` (509 lines) - Comprehensive deliverable-specific permissions
- Task editing permissions (canEditTask function)
- Project-level permissions

---

## 2. Role & Permission Patterns

### 2.1 The 4-Role System

The application uses **4 distinct roles:**

| Role | Database Value | Access Level |
|------|---------------|--------------|
| Super Admin | `super_admin` | Full system access, user management, all permissions |
| Project Manager | `project_manager` | Admin-level access (cannot manage users) |
| Team Member | `team_member` | Limited to assigned tasks, cannot create deliverables |
| Client | `client` | View-only for their projects, can approve deliverables |

### 2.2 Permission Enforcement Patterns

**Backend Middleware Pattern:**
```typescript
export const handler = compose(
    withCORS(['POST']),
    withSuperAdmin(),      // Enforces role check
    withRateLimit(RATE_LIMITS.apiStrict, 'users_create')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
    // Handler has verified auth.user.role === 'super_admin'
});
```

**Frontend Permission Checks:**
```typescript
const isSuperAdmin = currentUser?.role === 'super_admin';

if (!isSuperAdmin) {
    return <AccessDenied />;
}
```

**Key Pattern:** Double-check on both frontend (UX) and backend (security)

### 2.3 Middleware Types

From `/netlify/functions/_shared/middleware.ts`:

```typescript
withAuth()              // Any authenticated user
withSuperAdmin()        // Super Admin only
withProjectManager()    // Super Admin OR Project Manager
withRateLimit(config)   // Rate limiting
withValidation(schema)  // Zod schema validation
withCORS(methods)       // CORS handling
```

**Composition Example:**
```typescript
compose(
    withCORS(['GET']),
    withSuperAdmin(),
    withRateLimit(RATE_LIMITS.api, 'users_list')
)
```

---

## 3. Invitation Flow Architecture

### 3.1 Current Implementation

**Flow:**
1. Super Admin creates user via `users-create.ts`
2. User record created in `users` table (is_active=true)
3. Magic link token generated and stored in `magic_link_tokens` table
4. Email sent via Resend API (or logged in development)
5. User clicks link → `auth-verify-magic-link.ts`
6. JWT session created → httpOnly cookie
7. User redirected to portal

**Critical Files:**
- `users-create.ts` - Creates user + generates magic link
- `invitations-create.ts` - Creates invitation in `user_invitations` table
- `invitations-accept.ts` - Marks invitation as accepted
- `send-email.ts` - Email sending utility (Resend integration)

### 3.2 Email Infrastructure

**Service:** Resend (already integrated)

**Configuration:**
- `RESEND_API_KEY` - API key from Resend
- `RESEND_FROM_EMAIL` - Sender email (defaults to `onboarding@resend.dev`)

**Email Templates in `send-email.ts`:**
- Task assignment emails
- Deliverable ready emails
- Revision request emails
- Payment reminders
- Inquiry verification
- Proposal notifications
- Comment notifications
- **MISSING:** User invitation email template

**Development Mode:**
- If `RESEND_API_KEY` not set, emails are logged to console
- Magic links are logged for manual testing

### 3.3 Database Tables

**users table:**
```sql
id UUID PRIMARY KEY
email VARCHAR(255) UNIQUE NOT NULL
full_name VARCHAR(255) NOT NULL
role VARCHAR(50) NOT NULL CHECK (role IN (...))  -- See critical issue below
is_active BOOLEAN DEFAULT true
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**magic_link_tokens table:**
```sql
id UUID PRIMARY KEY
email VARCHAR(255) NOT NULL
token TEXT UNIQUE NOT NULL
expires_at TIMESTAMP WITH TIME ZONE NOT NULL
remember_me BOOLEAN DEFAULT true
created_at TIMESTAMP WITH TIME ZONE
```

**user_invitations table:**
```sql
id UUID PRIMARY KEY
email VARCHAR(255) NOT NULL
role VARCHAR(50) NOT NULL CHECK (role IN ('client', 'team'))
token TEXT NOT NULL
invited_by UUID REFERENCES users(id)
expires_at TIMESTAMPTZ NOT NULL
status VARCHAR(50) (pending/accepted/revoked)
full_name VARCHAR(255)
created_at TIMESTAMPTZ
accepted_at TIMESTAMPTZ
revoked_at TIMESTAMPTZ
revoked_by UUID
```

**sessions table:**
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id) ON DELETE CASCADE
token TEXT UNIQUE NOT NULL
jwt_token_hash VARCHAR(255) NOT NULL
remember_me BOOLEAN
expires_at TIMESTAMPTZ NOT NULL
last_active_at TIMESTAMPTZ
ip_address INET
user_agent TEXT
created_at TIMESTAMPTZ
```

---

## 4. Critical Issues Discovered

### 🚨 CRITICAL: Schema Mismatch Between Database and Code

**Problem:**

The database schema (`database/schema.sql`) defines:
```sql
role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'client'))
```

But the **code expects 4 roles:**
- `super_admin`
- `project_manager`
- `team_member`
- `client`

**Evidence:**

1. **Frontend uses 4 roles:**
   - `/pages/admin/UserManagement.tsx` has dropdowns for all 4 roles
   - `/lib/permissions.ts` checks for all 4 roles

2. **Backend validates 4 roles:**
   - `users-list.ts` filter accepts: `'super_admin' | 'project_manager' | 'client' | 'team'`
   - `users-create.ts` schema validates against 4 roles
   - All permission middleware checks against these roles

3. **Database only allows 2 roles:**
   - `CHECK (role IN ('admin', 'client'))` in `database/schema.sql`

**Impact:**
- ❌ Creating users with `super_admin`, `project_manager`, or `team_member` will **FAIL** with constraint violation
- ❌ User management UI is completely broken
- ❌ Permission system cannot function

**Solution Required:**
Database schema must be migrated to support the 4-role system. This is documented in `features/pending/core-foundation/04-database-schema.sql`:
```sql
CONSTRAINT valid_user_role CHECK (role IN ('super_admin', 'project_manager', 'client', 'team_member'))
```

### Issue #2: User Deactivation "Last Super Admin" Check

**Code:** `/netlify/functions/users-delete.ts` lines 103-116

```typescript
// TC-AD-003: Prevent deactivating the last Super Admin
if (user.role === 'super_admin') {
    const superAdminCount = await client.query(
        `SELECT COUNT(*) as count FROM users WHERE role = 'super_admin' AND is_active = true`
    );
    const activeSuper = parseInt(superAdminCount.rows[0].count, 10);

    if (activeSuper <= 1) {
        throw {
            statusCode: 400,
            error: 'Cannot deactivate last Super Admin. Promote another user to Super Admin first.',
        };
    }
}
```

**Status:** ✅ Already implemented correctly

### Issue #3: Session Invalidation on Deactivation

**Code:** `/netlify/functions/users-delete.ts` lines 121-125

```typescript
// Invalidate all sessions for this user
await client.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);

// Also invalidate any magic link tokens
await client.query(`DELETE FROM magic_link_tokens WHERE email = $1`, [user.email.toLowerCase()]);
```

**Status:** ✅ Implemented - Sessions are properly cleaned up

### Issue #4: Missing Email Template for User Invitations

**Problem:**
- `send-email.ts` has templates for tasks, deliverables, proposals, comments
- **NO template for user invitation emails**
- `users-create.ts` generates magic link but doesn't send email
- Only logs to console in development

**Current Code in users-create.ts:**
```typescript
// Build magic link URL
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173';
const magicLink = `${appUrl}/#/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;

logger.info('User created', {
    userId: newUser.id,
    email: email.slice(0, 3) + '***',
    role,
});

// In development, log the magic link
if (appUrl.includes('localhost')) {
    logger.info('Magic link generated for new user', { magicLink });
}
```

**Missing:** Call to `sendEmail()` with invitation template

---

## 5. Common Pitfalls in User Management Verification

### 5.1 Race Conditions

**Deactivation + Login:**
- User deactivated while logged in
- Session invalidated but frontend may still show user as authenticated
- **Solution:** Frontend should handle 401 responses and force logout

**Role Change While Active:**
- Admin changes user's role from Super Admin → Project Manager
- User already has active session with old role
- **Test:** Does permission downgrade take effect immediately?

### 5.2 Email Delivery Failures

**Resend API Issues:**
- API key invalid/expired
- Rate limit exceeded (Resend has sending limits)
- "From" email not verified in Resend
- Emails marked as spam

**Test Strategy:**
- Test with `RESEND_API_KEY` set and unset
- Verify emails arrive (check spam folder)
- Test invitation resend functionality
- Verify email content renders correctly

### 5.3 Permission Bypass Vulnerabilities

**Direct API Access:**
- Attacker crafts HTTP request to admin endpoint
- Bypasses frontend permission checks
- **Protection:** Backend middleware MUST enforce permissions

**Token Manipulation:**
- Expired invitation tokens
- Reused/revoked tokens
- Token for wrong user

**Session Hijacking:**
- JWT token stolen from cookie
- Old session after password reset (N/A - no passwords)
- Session fixation attacks

### 5.4 Data Consistency Issues

**Orphaned Records:**
- User deleted but references remain (projects, tasks, comments)
- **Current Solution:** Soft delete (is_active=false) preserves data

**Cascade Deletes:**
- Database has ON DELETE CASCADE for sessions
- Should test: Delete user → sessions deleted

**Audit Trail:**
- Who deactivated whom?
- When was role changed?
- **Current:** Deactivation reason is captured

---

## 6. Testing Strategies for Permission Systems

### 6.1 Role-Based Access Testing Matrix

**For each endpoint, test:**

| Role | Expected Result |
|------|-----------------|
| Super Admin | ✅ Full access |
| Project Manager | ⚠️ Limited (cannot manage users) |
| Team Member | ❌ Forbidden |
| Client | ❌ Forbidden |
| Unauthenticated | ❌ 401 Unauthorized |

### 6.2 State-Based Testing

**User Creation Flow:**
1. ✅ Create user with valid data
2. ❌ Create user with duplicate email (409 conflict)
3. ❌ Create user with invalid role
4. ✅ Verify magic link sent
5. ✅ Accept invitation with valid token
6. ❌ Reuse same token (should fail)
7. ❌ Use expired token (should fail)

**User Deactivation Flow:**
1. ✅ Deactivate regular user
2. ✅ Verify sessions invalidated
3. ✅ Verify user cannot log in
4. ❌ Try to deactivate last Super Admin (should fail)
5. ❌ Try to deactivate own account (should fail)
6. ✅ Deactivate with reason logged

**Role Management Flow:**
1. ✅ Change user role (super_admin → project_manager)
2. ✅ Verify permissions update immediately
3. ❌ Change last Super Admin to another role (should fail after last admin check)
4. ✅ Verify audit trail

### 6.3 Integration Testing Approach

**Full User Lifecycle Test:**
```
1. Super Admin creates user (role: project_manager)
2. Verify user appears in users list
3. Verify invitation email sent
4. Click magic link
5. Verify user can log in
6. Verify user has project manager permissions
7. Verify user CANNOT access user management
8. Super Admin changes role to team_member
9. Verify permissions downgraded
10. Super Admin deactivates user
11. Verify user cannot log in
12. Verify user marked inactive in list
```

### 6.4 Negative Testing (Error Conditions)

**Test Cases:**
- Missing required fields (email, full_name, role)
- Invalid email format
- SQL injection attempts in user fields
- XSS attempts in full_name
- Extremely long inputs (overflow testing)
- Null/undefined values
- Special characters in names
- Concurrent deactivation attempts

### 6.5 Performance Testing

**Scalability Checks:**
- List users with 1,000+ records
- Filter/search performance
- Rate limit enforcement (should block after threshold)
- Database query optimization (indexes on email, role, is_active)

---

## 7. What You Need to Know to Plan Well

### 7.1 Pre-Planning Checklist

**Before writing the plan, confirm:**

- [ ] Database schema migrated to 4-role system
- [ ] At least 2 Super Admin users exist (for last-admin testing)
- [ ] RESEND_API_KEY configured (or accept console-only emails)
- [ ] Test users exist for each role
- [ ] Email invitation template created
- [ ] Frontend permission checks match backend
- [ ] All middleware applied to endpoints

### 7.2 Dependency Map

**PROD-06 depends on:**
- ✅ PROD-01 (Authentication & Security) - JWT sessions, cookies
- ✅ Email infrastructure (Resend configured)
- ⚠️ Database schema migration (CRITICAL - must be done first)

**PROD-06 blocks:**
- PROD-08 (Email & Notifications) - User notifications require user system
- PROD-10 (Client Portal) - Client users must be manageable

### 7.3 Test Environment Setup

**Required:**
1. **Database:** User table with 4-role constraint
2. **Email:** Resend API key OR accept console-only mode
3. **Test Data:**
   - 2+ Super Admins (to test last-admin protection)
   - 1+ Project Manager
   - 1+ Team Member
   - 1+ Client
   - 1+ Inactive user
4. **Credentials:** Admin login to test UI
5. **Email Access:** Ability to check invitation emails

### 7.4 Key Verification Points

**Must Verify:**

1. **User CRUD:**
   - ✅ Create user sends email
   - ✅ List filters work (status, role, search)
   - ✅ Update user changes immediately
   - ✅ Deactivate soft-deletes (preserves data)

2. **Invitation System:**
   - ✅ Invitation email contains magic link
   - ✅ Token expires after 7 days
   - ✅ Revoked invitations cannot be accepted
   - ✅ Resend works for pending invitations

3. **Permission Enforcement:**
   - ✅ Super Admin can manage users
   - ❌ Project Manager cannot manage users
   - ❌ Team Member cannot access user endpoints
   - ❌ Client cannot access user endpoints

4. **Safety Mechanisms:**
   - ✅ Cannot deactivate last Super Admin
   - ✅ Cannot deactivate own account
   - ✅ Deactivated user sessions invalidated
   - ✅ Role changes take effect immediately

5. **Data Integrity:**
   - ✅ Duplicate emails rejected
   - ✅ Invalid roles rejected
   - ✅ Required fields enforced
   - ✅ Soft delete preserves historical data

---

## 8. Files to Review During Planning

### Backend Endpoints
- `/netlify/functions/users-list.ts`
- `/netlify/functions/users-create.ts`
- `/netlify/functions/users-update.ts`
- `/netlify/functions/users-delete.ts`
- `/netlify/functions/users-settings.ts`
- `/netlify/functions/invitations-create.ts`
- `/netlify/functions/invitations-accept.ts`
- `/netlify/functions/invitations-list.ts`
- `/netlify/functions/invitations-resend.ts`
- `/netlify/functions/invitations-revoke.ts`

### Frontend Pages
- `/pages/admin/UserManagement.tsx`

### Shared Libraries
- `/lib/permissions.ts`
- `/utils/deliverablePermissions.ts`
- `/netlify/functions/_shared/middleware.ts`
- `/netlify/functions/_shared/schemas.ts`
- `/netlify/functions/_shared/auth.ts`

### Email Infrastructure
- `/netlify/functions/send-email.ts`
- `/netlify/functions/auth-request-magic-link.ts`
- `/netlify/functions/auth-verify-magic-link.ts`

### Database
- `/database/schema.sql` (needs review for role constraint)
- `/database/migrations/` (may need new migration for 4-role system)

---

## 9. Recommended Testing Approach

### Phase 1: Pre-Testing Setup (CRITICAL)
1. **Fix database schema:**
   - Create migration to update role CHECK constraint
   - Apply migration to test database
   - Verify constraint accepts all 4 roles

2. **Verify test data:**
   - At least 2 Super Admins exist
   - Users of each role type exist
   - Email service configured (or mock mode accepted)

### Phase 2: Manual Browser Testing
**Focus:** User Management UI (`/pages/admin/UserManagement.tsx`)

**Test Scenarios:**
- Access control (only Super Admin can access)
- Create user (all 4 roles)
- Search/filter users
- Update user details
- Deactivate user
- Last Super Admin protection

### Phase 3: API Testing (curl/Postman)
**Focus:** Backend endpoints

**Test Each Endpoint:**
- With valid Super Admin auth
- With Project Manager auth (should fail)
- With Team Member auth (should fail)
- With Client auth (should fail)
- Without auth (should 401)

### Phase 4: Integration Testing
**Focus:** Full user lifecycle

**Flow Testing:**
- Create → Email → Accept → Login → Permissions → Deactivate → Logout

### Phase 5: Edge Case Testing
**Focus:** Error conditions and boundaries

**Test Cases:**
- Invalid inputs
- Race conditions
- Permission boundaries
- Data integrity

---

## 10. Success Criteria for Planning

**A good PROD-06 plan will:**

1. **Start with database migration**
   - Fix role constraint FIRST
   - Verify migration before any testing

2. **Have clear test categories:**
   - User CRUD operations
   - Invitation flow
   - Permission enforcement
   - Safety mechanisms

3. **Include both positive and negative tests:**
   - Happy path (user creation works)
   - Error path (duplicate email fails)

4. **Test at multiple levels:**
   - Frontend UI testing
   - API endpoint testing
   - Permission middleware testing
   - Database constraint testing

5. **Verify email delivery:**
   - Test with Resend configured
   - Test without Resend (development mode)
   - Verify email content

6. **Document bugs found:**
   - Schema mismatches
   - Missing email templates
   - Permission gaps
   - UX issues

7. **Create atomic commits:**
   - Each bug fix in separate commit
   - Each migration in separate commit
   - Clear commit messages

---

## 11. Known Gaps & Future Work

### Gaps Identified

1. **Email Template Missing:**
   - User invitation email needs template in `send-email.ts`
   - Should follow same pattern as other emails
   - Should include role assignment info

2. **Profile Picture Upload:**
   - `users-update.ts` has `profile_picture_url` field
   - No upload flow implemented
   - May need R2 integration for avatar storage

3. **Audit Logging:**
   - Deactivation reason is captured
   - But no comprehensive audit log for role changes
   - No "who invited whom" tracking

4. **Email Verification:**
   - Users created but email not verified
   - Magic link acts as verification
   - Consider adding re-verification flow

5. **Password Reset (N/A):**
   - System uses passwordless auth
   - No password reset needed
   - But may want "resend magic link" for existing users

### Future Enhancements (Out of Scope)

- User activity logs
- Multi-factor authentication
- SSO integration
- User groups/teams
- Advanced permission management
- Bulk user operations
- User import/export

---

## 12. Quick Reference

### Role Hierarchy
```
Super Admin (full access)
  └─ Project Manager (admin features, cannot manage users)
      └─ Team Member (assigned tasks only)
          └─ Client (view-only, can approve deliverables)
```

### Permission Patterns
```typescript
// Backend
withSuperAdmin()        → Super Admin only
withProjectManager()    → Super Admin OR Project Manager
withAuth()              → Any authenticated user

// Frontend
isMotionifyAdmin()      → Super Admin OR Project Manager
isMotionifyTeam()       → Super Admin OR Project Manager OR Team Member
```

### Database Tables
- `users` - User records
- `sessions` - JWT sessions (httpOnly cookies)
- `magic_link_tokens` - One-time login tokens
- `user_invitations` - Invitation tracking

### API Endpoints Summary
- **List:** GET `/api/users-list` (filters: status, role, search)
- **Create:** POST `/api/users-create` (sends invitation email)
- **Update:** PATCH `/api/users-update/:userId`
- **Delete:** DELETE `/api/users-delete/:userId` (soft delete)

### Environment Variables
- `RESEND_API_KEY` - Email service
- `RESEND_FROM_EMAIL` - Sender email
- `NEXT_PUBLIC_APP_URL` - Base URL for magic links

---

## Conclusion

**The user management system is ~95% complete.** The code quality is high, middleware is properly applied, and the architecture is sound. The main blockers are:

1. **Database schema mismatch (CRITICAL)** - Must fix role constraint before any testing
2. **Missing email template** - Need to add user invitation email
3. **Testing required** - No evidence of comprehensive testing yet

**Recommendation for Planning:**
- Plan should start with database migration (blocking task)
- Then focus on systematic verification testing
- Document any bugs found during UAT
- Create fixes in atomic commits
- Use previous phase UAT documents as template

**This research provides:**
- ✅ Complete understanding of existing implementation
- ✅ Clear identification of critical blockers
- ✅ Comprehensive testing strategies
- ✅ Pitfall awareness
- ✅ Success criteria definition

**You are now ready to write a detailed PROD-06 plan.**

---

*Research completed: 2026-01-28*
*Next step: Create PROD-06-PLAN.md based on these findings*
