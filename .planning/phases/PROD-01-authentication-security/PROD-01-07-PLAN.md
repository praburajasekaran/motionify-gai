---
phase: PROD-01-authentication-security
plan: 07
type: execute
wave: 2
depends_on: ["PROD-01-06"]
files_modified:
  - netlify/functions/proposals.ts
  - netlify/functions/proposal-detail.ts
  - netlify/functions/projects.ts
  - netlify/functions/projects-accept-terms.ts
  - netlify/functions/project-members-remove.ts
  - netlify/functions/deliverables.ts
  - netlify/functions/tasks.ts
  - netlify/functions/payments.ts
  - netlify/functions/inquiries.ts
  - netlify/functions/inquiry-detail.ts
  - netlify/functions/comments.ts
  - netlify/functions/attachments.ts
  - netlify/functions/activities.ts
  - netlify/functions/notifications.ts
  - netlify/functions/auth-verify-magic-link.ts
autonomous: true
gap_closure: true

must_haves:
  truths:
    - "All mutation endpoints have strict rate limits (20/hour)"
    - "All read endpoints have standard rate limits (100/hour)"
    - "Rate limit exceeded returns 429 Too Many Requests"
    - "Rate limits are per-user for authenticated, per-IP for public endpoints"
  artifacts:
    - path: "netlify/functions/proposals.ts"
      provides: "Rate-limited proposals API"
      contains: "withRateLimit"
    - path: "netlify/functions/projects.ts"
      provides: "Rate-limited projects API"
      contains: "withRateLimit"
    - path: "netlify/functions/payments.ts"
      provides: "Rate-limited payments API"
      contains: "withRateLimit"
  key_links:
    - from: "netlify/functions/proposals.ts"
      to: "_shared/rateLimit.ts"
      via: "RATE_LIMITS import"
      pattern: "RATE_LIMITS"
---

<objective>
Apply rate limiting middleware to all endpoints to prevent abuse and DoS attacks.

Purpose: Currently only 6 of 36 endpoints have rate limiting. The system is vulnerable to abuse, credential stuffing, brute force attacks, and DoS. Rate limiting protects the API and database from overload.

Output: All 30 unprotected endpoints have appropriate rate limits applied.
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
@netlify/functions/_shared/rateLimit.ts
@netlify/functions/invitations-create.ts (reference implementation)
@.planning/phases/PROD-01-authentication-security/ENDPOINT_AUDIT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Rate Limiting to Core Business Endpoints</name>
  <files>
    - netlify/functions/proposals.ts
    - netlify/functions/proposal-detail.ts
    - netlify/functions/projects.ts
    - netlify/functions/projects-accept-terms.ts
    - netlify/functions/project-members-remove.ts
    - netlify/functions/deliverables.ts
    - netlify/functions/tasks.ts
    - netlify/functions/payments.ts
  </files>
  <action>
    Add rate limiting to the core business endpoints that were protected in PROD-01-06.

    **Rate limit strategy from RATE_LIMITS in _shared/rateLimit.ts:**
    - `RATE_LIMITS.api` = 100 requests/hour (for reads)
    - `RATE_LIMITS.apiStrict` = 20 requests/hour (for mutations)
    - `RATE_LIMITS.authAction` = 5 requests/hour (for sensitive auth)

    **For each endpoint, update the compose chain to include withRateLimit:**

    **proposals.ts:**
    ```typescript
    export const handler = compose(
        withCORS(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
        withAuth(),
        withRateLimit(RATE_LIMITS.api, 'proposals'),  // <-- Add this
    )(async (event, auth) => {
        // Use apiStrict for mutations if you want different limits per method
        // Or use a single limit for simplicity
    });
    ```

    **proposal-detail.ts:** (GET only)
    - withRateLimit(RATE_LIMITS.api, 'proposal_detail')

    **projects.ts:**
    - withRateLimit(RATE_LIMITS.api, 'projects')

    **projects-accept-terms.ts:** (POST only, mutation)
    - withRateLimit(RATE_LIMITS.apiStrict, 'project_accept_terms')

    **project-members-remove.ts:** (mutation)
    - withRateLimit(RATE_LIMITS.apiStrict, 'project_members_remove')

    **deliverables.ts:**
    - withRateLimit(RATE_LIMITS.api, 'deliverables')

    **tasks.ts:**
    - withRateLimit(RATE_LIMITS.api, 'tasks')

    **payments.ts:**
    - withRateLimit(RATE_LIMITS.apiStrict, 'payments')  // Strict for financial data

    **Import required:**
    ```typescript
    import { RATE_LIMITS } from './_shared/rateLimit';
    import { withRateLimit } from './_shared/middleware';
    ```
  </action>
  <verify>
    1. Verify rate limit imports: `grep -l "withRateLimit" netlify/functions/proposals.ts netlify/functions/projects.ts netlify/functions/payments.ts`
    2. Run build: `npm run build`
    3. Count rate-limited endpoints: `grep -l "withRateLimit" netlify/functions/*.ts | grep -v _shared | wc -l` should be >= 14
  </verify>
  <done>
    - proposals.ts has withRateLimit middleware
    - proposal-detail.ts has withRateLimit middleware
    - projects.ts has withRateLimit middleware
    - projects-accept-terms.ts has withRateLimit middleware (strict)
    - project-members-remove.ts has withRateLimit middleware (strict)
    - deliverables.ts has withRateLimit middleware
    - tasks.ts has withRateLimit middleware
    - payments.ts has withRateLimit middleware (strict)
    - Build passes
  </done>
</task>

<task type="auto">
  <name>Task 2: Add Rate Limiting to Supporting Endpoints</name>
  <files>
    - netlify/functions/inquiries.ts
    - netlify/functions/inquiry-detail.ts
    - netlify/functions/comments.ts
    - netlify/functions/attachments.ts
    - netlify/functions/activities.ts
    - netlify/functions/notifications.ts
    - netlify/functions/auth-verify-magic-link.ts
  </files>
  <action>
    Add rate limiting to remaining endpoints.

    **For inquiries.ts:**
    - Add auth + rate limit if not already present
    - withRateLimit(RATE_LIMITS.api, 'inquiries')
    - Note: inquiries may need to remain partially public for new client inquiries
    - Apply rate limit regardless of auth status

    **For inquiry-detail.ts:**
    - withRateLimit(RATE_LIMITS.api, 'inquiry_detail')

    **For comments.ts:**
    - withRateLimit(RATE_LIMITS.api, 'comments')

    **For attachments.ts:**
    - withRateLimit(RATE_LIMITS.apiStrict, 'attachments')  // Strict for uploads

    **For activities.ts:**
    - withRateLimit(RATE_LIMITS.api, 'activities')

    **For notifications.ts:**
    - withRateLimit(RATE_LIMITS.api, 'notifications')

    **For auth-verify-magic-link.ts:**
    - withRateLimit(RATE_LIMITS.authAction, 'auth_verify')  // Very strict for auth
    - This prevents brute-forcing magic link tokens

    **Pattern for endpoints that need auth + rate limit:**
    ```typescript
    export const handler = compose(
        withCORS(['GET', 'POST', 'PUT', 'DELETE']),
        withAuth(),
        withRateLimit(RATE_LIMITS.api, 'endpoint_name'),
    )(async (event, auth) => { ... });
    ```

    **Pattern for public endpoints (like inquiries POST):**
    ```typescript
    // Rate limit even without auth - uses IP-based limiting
    export const handler = compose(
        withCORS(['GET', 'POST']),
        withRateLimit(RATE_LIMITS.api, 'endpoint_name'),
    )(async (event) => { ... });
    ```
  </action>
  <verify>
    1. Verify: `grep -l "withRateLimit" netlify/functions/inquiries.ts netlify/functions/comments.ts netlify/functions/attachments.ts`
    2. Verify auth endpoint: `grep "withRateLimit" netlify/functions/auth-verify-magic-link.ts`
    3. Run build: `npm run build`
    4. Count: `grep -l "withRateLimit" netlify/functions/*.ts | grep -v _shared | wc -l` should be >= 20
  </verify>
  <done>
    - inquiries.ts has withRateLimit middleware
    - inquiry-detail.ts has withRateLimit middleware
    - comments.ts has withRateLimit middleware
    - attachments.ts has withRateLimit middleware (strict)
    - activities.ts has withRateLimit middleware
    - notifications.ts has withRateLimit middleware
    - auth-verify-magic-link.ts has withRateLimit middleware (auth action)
    - Build passes
  </done>
</task>

<task type="auto">
  <name>Task 3: Add Rate Limiting to Remaining Endpoints</name>
  <files>
    - netlify/functions/users-list.ts
    - netlify/functions/users-create.ts
    - netlify/functions/users-update.ts
    - netlify/functions/users-delete.ts
    - netlify/functions/invitations-list.ts
    - netlify/functions/invitations-accept.ts
    - netlify/functions/invitations-resend.ts
    - netlify/functions/client-project-request.ts
    - netlify/functions/inquiry-request-verification.ts
  </files>
  <action>
    Add rate limiting to user management and remaining endpoints.

    **User management endpoints (Super Admin required):**

    **users-list.ts:**
    - Should already have auth
    - Add: withRateLimit(RATE_LIMITS.api, 'users_list')

    **users-create.ts:**
    - Should already have Super Admin auth
    - Add: withRateLimit(RATE_LIMITS.apiStrict, 'users_create')

    **users-update.ts:**
    - Should already have Super Admin auth
    - Add: withRateLimit(RATE_LIMITS.apiStrict, 'users_update')

    **users-delete.ts:**
    - Should already have Super Admin auth
    - Add: withRateLimit(RATE_LIMITS.apiStrict, 'users_delete')

    **Invitation endpoints:**

    **invitations-list.ts:**
    - Add auth if missing (withSuperAdmin or withAuth)
    - Add: withRateLimit(RATE_LIMITS.api, 'invitations_list')

    **invitations-accept.ts:** (public - token-based)
    - Keep public (user accepts via email link)
    - Add: withRateLimit(RATE_LIMITS.apiStrict, 'invitation_accept')

    **invitations-resend.ts:**
    - Add auth if missing (withSuperAdmin)
    - Add: withRateLimit(RATE_LIMITS.apiStrict, 'invitation_resend')

    **Client endpoints:**

    **client-project-request.ts:**
    - May need to remain public for client submissions
    - Add: withRateLimit(RATE_LIMITS.apiStrict, 'client_project_request')

    **inquiry-request-verification.ts:**
    - Public endpoint for email verification
    - Add: withRateLimit(RATE_LIMITS.authAction, 'inquiry_verification')  // Strict
  </action>
  <verify>
    1. Verify user endpoints: `grep -l "withRateLimit" netlify/functions/users-*.ts`
    2. Verify invitation endpoints: `grep -l "withRateLimit" netlify/functions/invitations-*.ts`
    3. Run build: `npm run build`
    4. Count all rate-limited: `grep -l "withRateLimit" netlify/functions/*.ts | grep -v _shared | wc -l` should be >= 30
  </verify>
  <done>
    - All user management endpoints have rate limiting
    - All invitation endpoints have rate limiting
    - All client endpoints have rate limiting
    - Total rate-limited endpoints >= 30 (up from 6)
    - Build passes
  </done>
</task>

</tasks>

<verification>
After completing all tasks:

1. Build verification:
   - `npm run build` passes without errors

2. Coverage verification:
   - `grep -l "withRateLimit" netlify/functions/*.ts | grep -v _shared | wc -l`
   - Should show 30+ endpoints with rate limiting

3. Rate limit configuration verification:
   - Mutation endpoints use RATE_LIMITS.apiStrict (20/hour)
   - Read endpoints use RATE_LIMITS.api (100/hour)
   - Auth endpoints use RATE_LIMITS.authAction (5/hour)

4. Functional verification (manual):
   - Make 150 rapid requests to /auth-me - should get 429 after ~100
   - Make 25 rapid POSTs to /proposals - should get 429 after ~20
</verification>

<success_criteria>
1. All endpoints have appropriate rate limits
2. Mutation endpoints have strict limits (20/hour)
3. Read endpoints have standard limits (100/hour)
4. Auth endpoints have very strict limits (5/hour)
5. Build passes without errors
6. Rate limit exceeded returns 429 Too Many Requests
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-01-authentication-security/PROD-01-07-SUMMARY.md`
</output>
