---
phase: PROD-01-authentication-security
plan: 06
type: execute
wave: 1
depends_on: []
files_modified:
  - netlify/functions/proposals.ts
  - netlify/functions/proposal-detail.ts
  - netlify/functions/projects.ts
  - netlify/functions/projects-accept-terms.ts
  - netlify/functions/project-members-remove.ts
  - netlify/functions/deliverables.ts
  - netlify/functions/tasks.ts
  - netlify/functions/payments.ts
autonomous: true
gap_closure: true

must_haves:
  truths:
    - "Unauthenticated requests to business endpoints return 401"
    - "Proposals endpoint requires authentication for all methods"
    - "Projects endpoint requires authentication for all methods"
    - "Payments endpoint requires authentication with PM role for mutations"
  artifacts:
    - path: "netlify/functions/proposals.ts"
      provides: "Authenticated proposals API"
      contains: "withAuth"
    - path: "netlify/functions/projects.ts"
      provides: "Authenticated projects API"
      contains: "withAuth"
    - path: "netlify/functions/payments.ts"
      provides: "Authenticated payments API"
      contains: "withAuth"
    - path: "netlify/functions/deliverables.ts"
      provides: "Authenticated deliverables API"
      contains: "withAuth"
    - path: "netlify/functions/tasks.ts"
      provides: "Authenticated tasks API"
      contains: "withAuth"
  key_links:
    - from: "netlify/functions/proposals.ts"
      to: "_shared/middleware.ts"
      via: "compose middleware import"
      pattern: "import.*compose.*withAuth"
---

<objective>
Apply authentication middleware to high-priority business endpoints.

Purpose: Currently only 6 of 36 endpoints have authentication. Core business logic (proposals, projects, payments, tasks, deliverables) is fully exposed to unauthenticated requests. This is a critical security vulnerability.

Output: 8 critical business endpoints protected with withAuth middleware.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

@netlify/functions/_shared/middleware.ts
@netlify/functions/_shared/auth.ts
@netlify/functions/invitations-create.ts (reference implementation)
@.planning/phases/PROD-01-authentication-security/ENDPOINT_AUDIT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Protect Proposals and Projects Endpoints</name>
  <files>
    - netlify/functions/proposals.ts
    - netlify/functions/proposal-detail.ts
    - netlify/functions/projects.ts
    - netlify/functions/projects-accept-terms.ts
    - netlify/functions/project-members-remove.ts
  </files>
  <action>
    Apply authentication middleware to proposals and projects endpoints using the compose pattern.

    **Reference implementation from invitations-create.ts:**
    ```typescript
    import { compose, withCORS, withAuth, withSuperAdmin, withRateLimit, AuthResult } from './_shared/middleware';

    export const handler = compose(
        withCORS(['POST']),
        withSuperAdmin(),  // or withAuth() for any authenticated user
        withRateLimit(RATE_LIMITS.apiStrict, 'action_name'),
    )(async (event: NetlifyEvent, auth?: AuthResult) => {
        // Handler code - auth.user is available if authenticated
    });
    ```

    **For proposals.ts:**
    1. Add imports at the top:
       ```typescript
       import { compose, withCORS, withAuth, withProjectManager, AuthResult, NetlifyEvent } from './_shared/middleware';
       import { RATE_LIMITS } from './_shared/rateLimit';
       ```

    2. Wrap the handler with compose:
       - withCORS(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
       - withAuth() for all methods (any authenticated user can read)
       - The existing handler logic receives auth object as second parameter

    3. Update the handler signature:
       ```typescript
       export const handler = compose(
           withCORS(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
           withAuth(),
       )(async (event: NetlifyEvent, auth?: AuthResult) => {
           // Existing handler code...
           // Can use auth?.user?.userId for audit logging
       });
       ```

    **For proposal-detail.ts:**
    - withCORS(['GET'])
    - withAuth() - read-only, any authenticated user

    **For projects.ts:**
    - withCORS(['GET', 'POST', 'PUT', 'PATCH'])
    - withAuth() - any authenticated user

    **For projects-accept-terms.ts:**
    - withCORS(['POST'])
    - withAuth() - client accepts their own terms

    **For project-members-remove.ts:**
    - withCORS(['POST', 'DELETE'])
    - withProjectManager() - only PM or Super Admin can remove members

    NOTE: Do NOT add rate limiting in this plan - that's handled in PROD-01-07.
    NOTE: Do NOT add validation in this plan - that's handled in PROD-01-08.
  </action>
  <verify>
    1. Verify middleware imports: `grep -l "withAuth\|compose" netlify/functions/proposals.ts netlify/functions/projects.ts`
    2. Verify each file compiles: `npx tsc --noEmit netlify/functions/proposals.ts` (or use full build)
    3. Run: `npm run build` to verify no syntax errors
  </verify>
  <done>
    - proposals.ts has withAuth middleware
    - proposal-detail.ts has withAuth middleware
    - projects.ts has withAuth middleware
    - projects-accept-terms.ts has withAuth middleware
    - project-members-remove.ts has withProjectManager middleware
    - All files compile without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Protect Core Business Endpoints (Deliverables, Tasks, Payments)</name>
  <files>
    - netlify/functions/deliverables.ts
    - netlify/functions/tasks.ts
    - netlify/functions/payments.ts
  </files>
  <action>
    Apply authentication middleware to remaining core business endpoints.

    **For deliverables.ts:**
    1. Add imports:
       ```typescript
       import { compose, withCORS, withAuth, AuthResult, NetlifyEvent } from './_shared/middleware';
       ```

    2. Wrap handler:
       - withCORS(['GET', 'POST', 'PUT', 'PATCH'])
       - withAuth() - any authenticated user (both PM and client can view/update)

    **For tasks.ts:**
    1. Add imports:
       ```typescript
       import { compose, withCORS, withAuth, AuthResult, NetlifyEvent } from './_shared/middleware';
       ```

    2. Wrap handler:
       - withCORS(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
       - withAuth() - any authenticated user can manage tasks

    **For payments.ts:**
    1. Add imports:
       ```typescript
       import { compose, withCORS, withAuth, AuthResult, NetlifyEvent } from './_shared/middleware';
       ```

    2. Wrap handler:
       - withCORS(['GET', 'POST', 'PUT', 'PATCH'])
       - withAuth() - authenticated users can view payments

    For each file:
    - Keep all existing CORS handling code but remove manual CORS logic if using withCORS
    - Update handler function signature to accept (event: NetlifyEvent, auth?: AuthResult)
    - Optionally use auth?.user?.userId for audit logging

    IMPORTANT: These endpoints use direct database connections. Do NOT change the database connection code in this plan - just add the auth middleware wrapper.
  </action>
  <verify>
    1. Verify middleware: `grep -l "withAuth" netlify/functions/deliverables.ts netlify/functions/tasks.ts netlify/functions/payments.ts`
    2. Run build: `npm run build` - should pass
    3. Count protected endpoints: `grep -l "withAuth\|withSuperAdmin\|withProjectManager" netlify/functions/*.ts | wc -l` should be >= 14
  </verify>
  <done>
    - deliverables.ts has withAuth middleware
    - tasks.ts has withAuth middleware
    - payments.ts has withAuth middleware
    - Total protected endpoints increased from 6 to 14
    - Build passes without errors
  </done>
</task>

</tasks>

<verification>
After completing all tasks:

1. Build verification:
   - `npm run build` passes without errors

2. Code verification:
   - `grep -l "withAuth" netlify/functions/proposals.ts` shows the file
   - `grep -l "withAuth" netlify/functions/projects.ts` shows the file
   - `grep -l "withAuth" netlify/functions/deliverables.ts` shows the file
   - `grep -l "withAuth" netlify/functions/tasks.ts` shows the file
   - `grep -l "withAuth" netlify/functions/payments.ts` shows the file

3. Coverage verification:
   - `grep -l "withAuth\|withSuperAdmin\|withProjectManager" netlify/functions/*.ts | grep -v _shared | wc -l`
   - Should show 14+ endpoints protected (up from 6)

4. Functional verification (manual):
   - GET /proposals without auth cookie returns 401
   - GET /projects without auth cookie returns 401
   - GET /payments without auth cookie returns 401
</verification>

<success_criteria>
1. All 8 business endpoints have authentication middleware
2. Unauthenticated requests return 401 Unauthorized
3. Build passes without errors
4. Existing functionality preserved for authenticated users
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-01-authentication-security/PROD-01-06-SUMMARY.md`
</output>
