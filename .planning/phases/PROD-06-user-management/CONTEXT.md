# Phase 6: User Management - Discussion Context

**Phase Goal:** Verify user CRUD, role management, invitations, and permissions

**Status:** Discussion Phase

---

## Phase Domain Boundary

This phase covers the complete user lifecycle and access control:

1. **User Creation & Invitations** (USER-01)
   - Admin invites new users via email
   - Invitation email delivery
   - User accepts invitation → account created
   - Profile setup completion

2. **Role Management** (USER-02)
   - Role assignment/changes by admin
   - Immediate permission enforcement
   - Role-based UI visibility

3. **User Deactivation** (USER-03)
   - Safe user deactivation flow
   - Last Super Admin protection
   - Session invalidation
   - Activity logging

4. **Permission System** (USER-04)
   - Role-based access control enforcement
   - Project-level permissions
   - Deliverable state-based permissions

---

## Current Implementation Status

### Backend APIs (Implemented)
| Endpoint | Status | Notes |
|----------|--------|-------|
| `users-create.ts` | ✅ | Creates user + sends magic link invitation |
| `users-list.ts` | ✅ | Lists users with filters (status, role, search) |
| `users-update.ts` | ✅ | Updates user details |
| `users-delete.ts` | ✅ | Soft delete with last Super Admin protection |
| `users-settings.ts` | ✅ | User settings management |
| `invitations-create.ts` | ✅ | Creates invitation with token |
| `invitations-list.ts` | ✅ | Lists pending invitations |
| `invitations-accept.ts` | ✅ | Accepts invitation, creates user |
| `invitations-revoke.ts` | ✅ | Revokes pending invitation |
| `invitations-resend.ts` | ✅ | Resends invitation email |

### Frontend Components (Implemented)
| Component | Status | Notes |
|-----------|--------|-------|
| `UserManagement.tsx` | ✅ | Super Admin only, CRUD operations |
| `lib/permissions.ts` | ✅ | Role check utilities |
| `deliverablePermissions.ts` | ✅ | Deliverable-specific permissions |

### Security Middleware Applied
- `withSuperAdmin()` on all user management endpoints
- `withRateLimit(RATE_LIMITS.apiStrict)` on all endpoints
- `withValidation()` with Zod schemas

---

## Identified Gray Areas

### GA-01: Dual User Creation Paths
**Issue:** Two overlapping APIs exist for user creation:
- `users-create.ts` - Creates user directly + sends magic link
- `invitations-create.ts` - Creates invitation record, user created on accept

**Questions:**
- Which path should be primary?
- Should `users-create` be deprecated in favor of invitation flow?
- What happens if email fails after user record created?

### GA-02: Role Transition Rules
**Issue:** Role changes have implicit business rules not enforced:
- Can a Project Manager be demoted to Client?
- Can a Client be promoted to Super Admin?
- What happens to assigned projects/tasks on role change?

**Current:** No validation on role transitions, any role can be set.

### GA-03: Invitation Expiration Handling
**Issue:** Invitations expire after 7 days, but:
- What UI shows for expired invitations?
- Can admin easily resend expired invitations?
- Are expired invitations cleaned up automatically?

### GA-04: Deactivated User Data Visibility
**Issue:** When user is deactivated:
- Are their comments/tasks still visible?
- Can deactivated users be re-activated?
- What happens to projects where they are the assigned PM?

### GA-05: Missing `credentials: 'include'` Check
**Potential Bug:** Based on patterns from Phase 4-5 debugging:
- User management API calls may be missing `credentials: 'include'`
- Could cause auth failures in cookie-based sessions

### GA-06: Project Member Management Integration
**Issue:** Project-level permissions vs global user permissions:
- `project-members-remove.ts` handles project-specific removal
- How does this interact with global user deactivation?
- Primary Contact protection enforced at both levels?

---

## Test Scenarios (From Roadmap)

### USER-01: User Creation & Invitations
1. Admin invites new user → invitation email sent
2. User clicks invitation link → account created
3. User completes profile → ready to use system
4. Duplicate email → rejection with clear error

### USER-02: Role Management
1. Admin changes user role → immediate effect
2. Role change → UI permissions update
3. User logs in → sees role-appropriate content

### USER-03: User Deactivation
1. Deactivate user → sessions invalidated immediately
2. Attempt to deactivate last Super Admin → error shown
3. Deactivated user tries login → rejected
4. Re-activate user → access restored

### USER-04: Permission System
1. Client accesses admin endpoint → 403 error
2. PM accesses project not assigned → appropriate handling
3. Deliverable permissions → enforce state rules

---

## Files to Test

### Backend
- `netlify/functions/users-*.ts` (all 5 files)
- `netlify/functions/invitations-*.ts` (all 5 files)
- `netlify/functions/project-members-remove.ts`

### Frontend
- `pages/admin/UserManagement.tsx`
- `lib/permissions.ts`
- `utils/deliverablePermissions.ts`

---

## Discussion Status

**Gray Areas Discussed:** GA-01, GA-02, GA-04, GA-05

---

## Decisions Made

### GA-05: Missing `credentials: 'include'` ✅ CONFIRMED BUG
**Decision:** Fix immediately - add `credentials: 'include'` to all 3 fetch calls in UserManagement.tsx
- Line 64: `loadUsers()`
- Line 83: `handleCreateUser()`
- Line 127: `handleDeactivateUser()`

### GA-01: Dual User Creation Paths
**Decision:** Keep both flows with clear separation
- **`users-create.ts`**: For internal team (PM, Team, Super Admin) - immediate creation
- **`invitations-create.ts`**: For clients - tracked invitation flow with resend/revoke

### GA-02: Role Transition Rules
**Decision:** Allow all transitions with warnings
- Any role can be changed to any other role
- Show confirmation warning for significant changes (internal↔external)
- No blocking - Super Admin discretion

### GA-04: Deactivated User Data
**Decision:** Add re-activation + PM protection
- **Re-activation:** Add capability for Super Admin to re-activate users
- **PM Protection:** Block deactivation if user is sole PM on any active project
- **Data:** Keep comments/tasks visible (historical record with user name)

---

## Implementation Plan Summary

Based on decisions, Phase 6 work includes:

1. **Bug Fix (High Priority)**
   - Add `credentials: 'include'` to UserManagement.tsx

2. **Re-activation Feature**
   - Add `users-reactivate.ts` endpoint
   - Add "Reactivate" button in UserManagement UI

3. **PM Protection**
   - Modify `users-delete.ts` to check if user is sole PM on any project
   - Show clear error message with affected projects

4. **Role Change Warnings**
   - Add confirmation dialog for internal↔external role changes
   - No backend blocking, just UI warning

5. **UAT Testing**
   - Test all USER-01 through USER-04 scenarios
   - Verify permission enforcement

---

*Created: 2026-01-28*
*Discussion Completed: 2026-01-28*
