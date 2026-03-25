---
phase: PROD-08-security-hardening
plan: 01
subsystem: auth
tags: [security, inquiries, auth, role-based-access]

requires:
  - phase: PROD-01
    provides: Cookie-based authentication and requireAuthFromCookie function
provides:
  - Protected inquiries GET/PUT endpoints with role-based access
  - Public POST for contact form preserved
affects: [PROD-08-02]

tech-stack:
  added: []
  patterns:
    - Conditional auth based on HTTP method
    - Role-based access control (admin vs client)
    - Ownership validation for client data access

key-files:
  modified:
    - netlify/functions/inquiries.ts

key-decisions:
  - "Conditional auth instead of withAuth middleware to preserve public POST"
  - "Role check: super_admin and project_manager can list all inquiries"
  - "Client ownership check: clients can only fetch their own inquiries"

patterns-established:
  - "Mixed-auth endpoint pattern: check auth inside handler based on HTTP method"

duration: 2min
completed: 2026-01-28
---

# Phase PROD-08 Plan 01: Inquiries Endpoint Protection Summary

**Add conditional authentication to inquiries endpoint: protect GET/PUT while keeping POST public for contact form**

## Performance

- **Duration:** 2 min
- **Completed:** 2026-01-28
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Added `requireAuthFromCookie` import for manual auth checks
- Implemented conditional authentication: GET/PUT require auth, POST remains public
- Added role-based access control:
  - Admins (super_admin, project_manager) can list all inquiries
  - Clients can only fetch their own inquiries (clientUserId must match userId)
  - Individual inquiry lookup validates ownership
- Public contact form submission preserved (no auth required for POST)

## Task Commits

Combined with PROD-08-02 in single commit:

1. **Task 1-2: Conditional auth with role-based access** - `1a942ba` (feat)

## Files Modified

- `netlify/functions/inquiries.ts` - Added 56 lines: auth check, role validation, ownership check

## Decisions Made

1. **Conditional auth over middleware** - Using withAuth() in compose() chain would protect ALL methods including POST, breaking the public contact form. Instead, use requireAuthFromCookie() inside handler.

2. **Role hierarchy for access** - super_admin and project_manager treated equally for inquiry access (both are admin roles).

3. **Ownership validation** - Clients cannot access other users' inquiries even if they know the clientUserId parameter.

## Deviations from Plan

None - plan executed as designed after revision (cf30690).

## Issues Encountered

None.

## Security Improvements

| Before | After |
|--------|-------|
| GET /inquiries returned all inquiries without auth | GET requires auth, admins see all, clients see own |
| PUT /inquiries allowed unauthenticated updates | PUT requires authentication |
| No ownership validation | Clients restricted to their own inquiries |
| POST required no auth | POST still public (intentional - contact form) |

## Next Phase Readiness

- Inquiries endpoint now properly protected
- Ready for PROD-08-02: Frontend credential wiring (completed in same commit)

---
*Phase: PROD-08-security-hardening*
*Completed: 2026-01-28*
