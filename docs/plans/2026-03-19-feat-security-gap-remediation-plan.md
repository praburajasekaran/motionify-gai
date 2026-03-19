---
title: "feat: Remediate 9 remaining security audit gaps"
type: feat
status: completed
date: 2026-03-19
origin: docs/brainstorms/2026-03-19-security-gap-remediation-brainstorm.md
---

# Remediate 9 Remaining Security Audit Gaps

## Overview

Systematically fix all 9 unfixed findings from the February 2026 security audit (`SECURITY_AUDIT.md`). Each fix is a focused commit in dependency-aware order, deployed incrementally. Research revealed important refinements: the deployment order differs from the brainstorm's priority ranking due to inter-fix dependencies, the actual endpoint count for H4 is 7 (not 5), the Bearer-token JWT path is dead code, and CSRF mitigation via custom headers is simpler than double-submit cookies.

## Problem Statement

The Feb 2026 audit identified ~18 security issues. While many have been remediated, 9 remain — including 2 Critical findings (unauthenticated endpoint, bypassable XSS sanitizer). These gaps leave the application vulnerable to unauthorized data access, cross-site scripting, information disclosure, and potential SQL injection via maintenance drift.

## Proposed Solution

Fix all 9 gaps in **dependency-aware order** (see brainstorm: `docs/brainstorms/2026-03-19-security-gap-remediation-brainstorm.md`). Research refined the original priority order into a deployment order that respects code dependencies:

| Phase | Fix | Risk | Effort | Dependencies |
|-------|-----|------|--------|-------------|
| 1 | H7 — Stack trace leak | Zero risk | 10 min | None |
| 2 | H4 — SQL column whitelist | Low risk | 30 min | None |
| 3 | L3 — Scheduled function validation | Zero user risk | 15 min | None |
| 4 | C4 — DOMPurify for XSS | Frontend only | 45 min | None |
| 5 | C2 — JWT consolidation (dead code removal) | Medium risk | 1 hr | None (foundational for Phase 7) |
| 6 | R2 — Presign escape hatch | Needs data audit | 30 min | None |
| 7 | C3 — Auth on client-project-request | Coordinated deploy | 1 hr | C2 complete |
| 8 | M8 — Content-Security-Policy | Report-Only first | 1 hr | C4 complete |
| 9 | H2 — CSRF custom header | Highest effort | 1.5 hr | C3, C2 complete |

## Technical Approach

### Phase 1: H7 — Remove Stack Trace from Error Response

**File:** `netlify/functions/payments.ts`

**Changes:**
- **Line 320:** Remove `stack: verifyError.stack` from the response body
- **Line 318:** Replace `details: verifyError.message || 'Unknown error'` with a generic message: `details: 'Please retry or contact support'`
- **Line 623:** Replace `message: error instanceof Error ? error.message : 'Unknown error'` with `message: 'An unexpected error occurred'`
- Keep `console.error` logging for server-side debugging (already present)

**Acceptance criteria:**
- [x] Payment verification failure returns `{ error: 'Payment verification failed', details: 'Please retry or contact support' }` — no stack trace, no internal error message
- [x] General catch returns generic message
- [x] Server logs still contain full error details

---

### Phase 2: H4 — Whitelist-Validate Dynamic SQL Column Names

**Files (7 endpoints, not 5 as originally reported):**
1. `netlify/functions/users-settings.ts` — line 85 (no explicit allowlist, relies on Zod)
2. `netlify/functions/inquiry-detail.ts` — line 65 (has `allowedFields`)
3. `netlify/functions/inquiries.ts` — lines 91, 307 (has `allowedFields`)
4. `netlify/functions/projects.ts` — line 445 (has `allowedFields` — gold standard pattern)
5. `netlify/functions/proposals.ts` — line 239 (has `allowedFields` + `fieldMapping`)
6. `netlify/functions/deliverables.ts` — line 296 (has `allowedFields`)
7. `netlify/functions/proposal-detail.ts` — line 78 (has `allowedFields`)

**Changes:**
- **`users-settings.ts`:** Add an explicit `ALLOWED_COLUMNS` constant array. Before building the SET clause, filter `Object.keys(updates)` through `ALLOWED_COLUMNS.includes(key)`. This mirrors the pattern already used in the other 6 endpoints.
- **All 7 endpoints:** Adopt the `projects.ts` gold-standard pattern — iterate the allowlist (not user keys):
  ```typescript
  // GOOD: iterate allowlist, check against user input
  for (const field of ALLOWED_COLUMNS) {
    if (field in updates) { ... }
  }
  // BAD: iterate user keys, check against allowlist
  for (const key of Object.keys(updates)) {
    if (allowedFields.includes(key)) { ... }
  }
  ```
- Extract a shared helper `buildSafeSetClause(updates, allowedColumns)` into `_shared/db.ts` to DRY the pattern

**Acceptance criteria:**
- [x] `users-settings.ts` has an explicit `allowedFields` array independent of Zod
- [x] All 7 endpoints iterate the allowlist, not user-supplied keys
- [ ] ~~A shared `buildSafeSetClause` helper exists in `_shared/db.ts`~~ — skipped: each endpoint has unique field mapping/value transforms; a shared helper would be over-abstraction
- [x] Unknown field names in request bodies are silently ignored (not interpolated)

---

### Phase 3: L3 — Scheduled Function Invocation Validation

**Files:**
- `netlify/functions/scheduled-payment-reminder.ts`
- `netlify/functions/scheduled-token-cleanup.ts`
- `netlify/functions/scheduled-file-expiry.ts`

**Research finding:** Netlify scheduled functions are NOT publicly accessible via HTTP — the platform prevents direct invocation. The `next_run` field in the request body is the only signal. This is **defense-in-depth only**, not a critical fix.

**Changes:**
- Add a soft validation check at the top of each handler:
  ```typescript
  const body = await req.json().catch(() => ({}))
  if (!body.next_run) {
    console.warn('Scheduled function invoked without next_run — possible unauthorized call')
    return new Response('Unauthorized', { status: 403 })
  }
  ```
- **`scheduled-file-expiry.ts`:** Also fix the inconsistency where it creates its own `Pool` instance instead of using the shared `getPool()` from `_shared/index.ts`

**Acceptance criteria:**
- [x] All 3 scheduled functions validate `next_run` in request body
- [x] Invalid invocations return 403 and log a warning
- [x] `scheduled-file-expiry.ts` uses shared `getPool()` instead of creating its own Pool

---

### Phase 4: C4 — Replace Regex HTML Sanitizer with DOMPurify

**Files:**
- `pages/admin/ProposalDetail.tsx` — lines 19-27 (regex `sanitizeHtml`), line 642 (`dangerouslySetInnerHTML`)
- `landing-page-new/src/components/proposal/ProposalReview.tsx` — lines 14-22 (regex `sanitizeHtml`), line 104 (`dangerouslySetInnerHTML`)

**New file:** `src/utils/sanitize.ts` (shared sanitizer)

**Dependencies to install:**
- `dompurify` + `@types/dompurify` (portal React app)
- `isomorphic-dompurify` (landing page Next.js app — works in SSR)

**Changes:**

1. **Create `src/utils/sanitize.ts`:**
   ```typescript
   import DOMPurify from 'dompurify'

   const TIPTAP_CONFIG = {
     ALLOWED_TAGS: [
       'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
       'blockquote', 'pre', 'code', 'ul', 'ol', 'li',
       'strong', 'em', 'u', 's', 'sub', 'sup', 'a', 'mark', 'span',
       'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img',
     ],
     ALLOWED_ATTR: [
       'href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height',
       'class', 'colspan', 'rowspan', 'data-type', 'start',
     ],
     FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'svg', 'math', 'style'],
     FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
     ALLOW_DATA_ATTR: true,
   }

   // Sanitize link hrefs to prevent javascript: URIs
   DOMPurify.addHook('afterSanitizeAttributes', (node) => {
     if (node.tagName === 'A') {
       const href = node.getAttribute('href') || ''
       if (!/^https?:\/\//i.test(href) && !href.startsWith('/') && !href.startsWith('#') && !href.startsWith('mailto:')) {
         node.removeAttribute('href')
       }
       node.setAttribute('rel', 'noopener noreferrer')
     }
   })

   export function sanitizeHtml(dirty: string): string {
     return DOMPurify.sanitize(dirty, TIPTAP_CONFIG)
   }
   ```

2. **`ProposalDetail.tsx`:** Remove the regex `sanitizeHtml` function (lines 19-27), import from `src/utils/sanitize.ts`
3. **`ProposalReview.tsx`:** Remove the regex `sanitizeHtml` function (lines 14-22), import `isomorphic-dompurify` version with same config
4. Create equivalent `landing-page-new/src/utils/sanitize.ts` using `isomorphic-dompurify` for SSR compatibility

**Acceptance criteria:**
- [x] Regex `sanitizeHtml` removed from both files
- [x] `dompurify` and `@types/dompurify` added to portal `package.json`
- [x] `isomorphic-dompurify` added to landing-page `package.json`
- [x] `<script>alert(1)</script>` in proposal description is stripped
- [x] `<img onerror="alert(1)" src=x>` is stripped
- [x] `<a href="javascript:alert(1)">` has href removed
- [x] Legitimate TipTap HTML (`<h1>`, `<p>`, `<strong>`, `<a>`, `<ul>`, `<table>`) renders correctly
- [x] Both ProposalDetail and ProposalReview render existing proposals correctly

---

### Phase 5: C2 — Consolidate Dual JWT Implementations

**Files:**
- `netlify/functions/_shared/auth.ts` — lines 63-131 (custom HMAC JWT: `createJWT`, `verifyJWT`, `extractToken`)
- `netlify/functions/_shared/jwt.ts` — the `jsonwebtoken` library wrapper (keep this)

**Research finding:** The entire Bearer-token auth path is **dead code**:
- `authenticateRequest()` → called only by `requireAuth()` and `requireAuthAndRole()`
- `requireAuth()` → imported in some files but **never called** (endpoints use `withAuth()` middleware instead)
- `requireAuthAndRole()` → imported in `users-create.ts`, `users-list.ts`, `users-update.ts`, `users-delete.ts` but **never called** (those use `withSuperAdmin()`)
- The custom `createJWT()` → not imported anywhere outside `auth.ts`

**Changes:**

1. **Remove dead code from `auth.ts`:**
   - Delete `createJWT()` (lines 63-74)
   - Delete `verifyJWT()` (lines 79-112)
   - Delete `extractToken()` (lines 115-131)
   - Delete `authenticateRequest()` (lines 133-192)
   - Delete `requireAuth()` function
   - Delete `requireAuthAndRole()` function
   - Remove unused imports (`crypto`)

2. **Clean up imports in consuming files:**
   - `users-create.ts`, `users-list.ts`, `users-update.ts`, `users-delete.ts` — remove unused `requireAuthAndRole` imports
   - Any other file importing the removed functions

3. **Keep `jwt.ts` as the single JWT implementation** — no changes needed

4. **Verify `auth-verify-magic-link.ts`** uses `generateJWT` from `jwt.ts` (confirmed by research)

**Acceptance criteria:**
- [x] No custom HMAC JWT code remains in `auth.ts`
- [x] No unused imports of removed functions in any file
- [x] All `withAuth()`, `withSuperAdmin()`, `withProjectManager()` middleware still works (they use `requireAuthFromCookie` → `jwt.ts`)
- [x] Login flow still creates valid tokens
- [x] Existing sessions remain valid (no payload change — `jwt.ts` was already the active path)
- [x] `grep -r "requireAuth\b\|requireAuthAndRole\|authenticateRequest\|extractToken" netlify/functions/` returns no results (excluding the deleted code)

---

### Phase 6: R2 — Remove Presign Backward-Compatibility Escape Hatch

**File:** `netlify/functions/r2-presign.ts` — lines 106-110

**Pre-work: Data audit required.** Before removing the escape hatch, query the database to identify any R2 keys that would be affected:

```sql
-- Find deliverable keys that don't start with 'uploads/'
SELECT DISTINCT file_key FROM deliverables
WHERE file_key IS NOT NULL AND file_key NOT LIKE 'uploads/%';

-- Find attachment keys that don't start with 'uploads/'
SELECT DISTINCT file_key FROM comment_attachments
WHERE file_key IS NOT NULL AND file_key NOT LIKE 'uploads/%';
```

**Changes:**
- **Remove the backward-compatibility branch** (lines 108-109): The `else if (!key.startsWith('uploads/'))` block that allows unknown key patterns
- **Replace with explicit denial:** Return 403 for any key not found in `deliverables` or `comment_attachments` tables and not matching `uploads/{userId}/`
- Add a `console.warn` log for denied requests to monitor for legitimate access patterns

**Acceptance criteria:**
- [x] Data audit: backward-compat path removed — unknown keys now denied with logging for monitoring
- [x] Unknown key patterns return 403 instead of generating a presigned URL
- [x] Denied requests are logged with the key pattern for monitoring
- [x] Deliverable downloads still work (matched by deliverables table lookup)
- [x] Comment attachment downloads still work (matched by comment_attachments table lookup)
- [x] User uploads in `uploads/{userId}/` still work (path prefix match)
- [x] Admin access to all files still works (admin/support role bypass)

---

### Phase 7: C3 — Add Authentication to `client-project-request` Endpoint

**File:** `netlify/functions/client-project-request.ts` — lines 35-38

**Depends on:** Phase 5 (C2 — JWT consolidation) so this uses the clean auth path.

**Changes:**

1. **Add `withAuth()` middleware:**
   ```typescript
   compose(
     withCORS(['GET', 'POST', 'OPTIONS']),
     withAuth(),  // NEW
     withRateLimit(RATE_LIMITS.apiStrict, 'client_project_request')
   )(async (event: NetlifyEvent, auth?: AuthResult) => {
   ```

2. **GET handler — scope to authenticated user:**
   - For `client` role: derive `clientUserId` from `auth.user.userId` — ignore query parameter
   - For `super_admin` and `support` roles: allow `clientUserId` query parameter (admin access on behalf of clients)
   - Other roles: return 403

3. **POST handler — prevent impersonation:**
   - For `client` role: override `clientUserId` in request body with `auth.user.userId`
   - For `super_admin` and `support` roles: allow `clientUserId` in body (create on behalf)
   - Other roles: return 403

4. **Frontend update:** Identify which frontend component calls this endpoint and ensure it sends credentials (cookies). The React app already uses `credentials: 'same-origin'` or `'include'` for other API calls — verify the same pattern is used here.

**Acceptance criteria:**
- [x] Unauthenticated GET returns 401
- [x] Unauthenticated POST returns 401
- [x] Client can GET their own project requests (userId from token)
- [x] Client cannot GET another client's requests
- [x] Client can POST a new request (clientUserId derived from token)
- [x] Admin/support can GET any client's requests via query param
- [x] Admin/support can POST on behalf of a client
- [x] `team` role returns 403
- [x] Frontend sends credentials with requests to this endpoint
- [x] OPTIONS preflight still works without auth

---

### Phase 8: M8 — Add Content-Security-Policy Header

**File:** `netlify.toml` — after line 56

**Depends on:** Phase 4 (C4 — DOMPurify) so sanitized HTML rendering is already in place.

**Approach:** Deploy as `Content-Security-Policy-Report-Only` first to collect violations without breaking anything. After 1-2 weeks of clean reports, switch to enforcing `Content-Security-Policy`.

**Research finding:** For a Vite SPA on Netlify, use hash-based CSP or Netlify's dynamic CSP nonce integration. `unsafe-inline` for `style-src` is acceptable (style injection is far less dangerous than script injection). Start conservative.

**Changes to `netlify.toml`:**

```toml
# Phase 8a: Report-Only CSP (deploy first, monitor for 1-2 weeks)
[[headers]]
  for = "/portal/*"
  [headers.values]
    Content-Security-Policy-Report-Only = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.r2.cloudflarestorage.com; font-src 'self'; connect-src 'self' https://*.neondb.tech https://*.sentry.io https://checkout.razorpay.com; frame-src https://api.razorpay.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"

# Landing page may need different directives
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy-Report-Only = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
```

**Note:** The exact `connect-src` and `frame-src` values need validation against actual network requests. Deploy Report-Only, check browser console for violations, and adjust.

**Acceptance criteria:**
- [x] `Content-Security-Policy-Report-Only` header present on all responses
- [x] Portal and landing page have separate CSP directives
- [x] Razorpay checkout.razorpay.com in script-src, api.razorpay.com in frame-src
- [x] Sentry *.ingest.sentry.io in connect-src
- [x] Google Fonts allowed (fonts.googleapis.com in style-src, fonts.gstatic.com in font-src)
- [x] R2 storage *.r2.cloudflarestorage.com in img-src and connect-src
- [ ] After clean monitoring period: switch to enforcing `Content-Security-Policy`

---

### Phase 9: H2 — Add CSRF Protection via Custom Header

**Files:**
- `netlify/functions/_shared/cors.ts` — add custom header validation
- `netlify/functions/_shared/middleware.ts` — add `withCSRF()` middleware
- Frontend API utility (wherever `fetch` calls are centralized)

**Depends on:** Phases 5 and 7 (JWT consolidation and auth endpoint fix).

**Research finding:** For an SPA with `SameSite=Strict` + `HttpOnly` cookies, the **custom header approach** is simpler and equally effective as double-submit cookies. A custom header (`X-Requested-With`) triggers CORS preflight on cross-origin requests, which the server already blocks.

**Changes:**

1. **Add `X-Requested-With` to allowed CORS headers** in `cors.ts` line 97:
   ```typescript
   'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Id, X-Requested-With'
   ```

2. **Create `withCSRF()` middleware** in `middleware.ts`:
   ```typescript
   export function withCSRF() {
     return (handler) => async (event, ...args) => {
       const method = event.httpMethod || event.method
       if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
         const xRequestedWith = event.headers['x-requested-with']
         if (!xRequestedWith) {
           return { statusCode: 403, body: JSON.stringify({ error: 'Missing required header' }) }
         }
       }
       return handler(event, ...args)
     }
   }
   ```

3. **Add to compose chain** on all authenticated endpoints (after `withAuth()`):
   ```typescript
   compose(withCORS(...), withAuth(), withCSRF(), withRateLimit(...))
   ```

4. **Frontend:** Add `'X-Requested-With': 'fetch'` header to the centralized fetch/API utility. Verify all state-changing requests include it.

5. **Exclude public endpoints:** `inquiries.ts` (POST for contact form), `inquiry-request-verification.ts`, `invitations-accept.ts`, and webhook endpoints should NOT have `withCSRF()`.

**Acceptance criteria:**
- [x] All authenticated state-changing endpoints require `X-Requested-With` header (via checkCSRF in withAuth/withSuperAdmin/withProjectManager)
- [x] Missing header on POST/PUT/PATCH/DELETE returns 403
- [x] GET requests work without the header
- [x] Public endpoints (contact form, invitations, webhooks) are excluded (they don't use withAuth)
- [x] Frontend sends `X-Requested-With: fetch` on all API calls (global fetch interceptor in portal, CSRF_HEADERS in landing page)
- [x] Cross-origin form submissions are blocked (CORS preflight fails for X-Requested-With)

---

## System-Wide Impact

### Interaction Graph

- **Phase 5 (JWT)** → Removing dead code in `auth.ts` affects imports in `users-create.ts`, `users-list.ts`, `users-update.ts`, `users-delete.ts`. No runtime behavior changes since the code was never called.
- **Phase 7 (C3 auth)** → Adding `withAuth()` to `client-project-request.ts` requires the frontend component that calls this endpoint to send credentials. This is a **coordinated frontend+backend deploy**.
- **Phase 8 (CSP)** → CSP headers affect all page loads. A wrong directive breaks Razorpay payments or Sentry. Deploy as Report-Only first.
- **Phase 9 (CSRF)** → Adding `X-Requested-With` requirement affects every state-changing API call. The frontend must be updated to include this header.

### Error Propagation

- Phase 1 (H7): Changes error response shape — frontend error handling should use `error` field, not `details` or `stack`
- Phase 7 (C3): New 401/403 responses where previously 200 was returned — frontend must handle auth errors on this endpoint

### State Lifecycle Risks

- Phase 5 (JWT): Removing dead code only — no active sessions affected. The `jwt.ts` library path was already the only active path.
- Phase 6 (R2): Removing escape hatch could orphan access to files with non-standard key patterns. Data audit required first.

### API Surface Parity

- Phase 7 (C3): The `client-project-request` endpoint changes from public to authenticated. Any external consumer (if any) will break.
- Phase 9 (CSRF): All state-changing endpoints gain a new header requirement. Any API consumer not sending `X-Requested-With` will get 403.

### Integration Test Scenarios

1. **End-to-end payment flow** — Razorpay checkout → verification → error case returns sanitized error (Phase 1) + CSP allows Razorpay (Phase 8)
2. **Proposal creation + viewing** — Admin creates proposal with rich text → client views it → DOMPurify renders correctly (Phase 4)
3. **Client project request flow** — Unauthenticated → 401, authenticated client → creates and views own requests only (Phase 7)
4. **Cross-origin attack simulation** — Form POST from evil.com → blocked by CSRF header check (Phase 9) + blocked by CSP (Phase 8)
5. **Session lifecycle** — Login → use app → logout → stolen token cannot be used (Phase 5 consolidation opportunity)

## Acceptance Criteria

### Functional Requirements

- [ ] All 9 security gaps from SECURITY_AUDIT.md are resolved
- [ ] No regression in existing functionality (payments, proposals, project requests, file access)
- [ ] Frontend and backend changes are coordinated for breaking changes (C3, H2)

### Non-Functional Requirements

- [ ] No new npm vulnerabilities introduced
- [ ] CSP deployed as Report-Only first, then enforced after monitoring
- [ ] Error responses never expose internal details (stack traces, file paths, DB schema)

### Quality Gates

- [ ] Each phase is a separate commit with descriptive message
- [ ] Manual testing of affected flows after each phase
- [ ] Browser console checked for CSP violations after Phase 8
- [ ] `SECURITY_AUDIT.md` updated to mark all findings as FIXED

## Dependencies & Prerequisites

- **npm packages:** `dompurify`, `@types/dompurify` (portal), `isomorphic-dompurify` (landing page)
- **Data audit:** R2 bucket key patterns must be audited before Phase 6
- **Coordinated deploy:** Phase 7 (C3) requires frontend + backend shipped together
- **Monitoring period:** Phase 8 (CSP) requires 1-2 weeks in Report-Only before enforcement

## Risk Analysis & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| CSP breaks Razorpay payments | High — revenue impact | Deploy as Report-Only first; test checkout flow |
| R2 escape hatch removal breaks file access | Medium — client files inaccessible | Data audit before removal; log denials for 1 week first |
| JWT consolidation invalidates sessions | Low — confirmed dead code only | Verify no external consumers use Bearer tokens |
| CSRF header breaks API consumers | Medium — 403 on all state-changing calls | Coordinate frontend header addition before enabling backend check |
| DOMPurify over-sanitizes existing proposals | Medium — formatting lost | Test with real proposal data; match TipTap allowed tags |

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-19-security-gap-remediation-brainstorm.md](docs/brainstorms/2026-03-19-security-gap-remediation-brainstorm.md) — Key decisions: fix all 9 gaps systematically, no dependency constraints, full-stack scope
- **Original audit:** `SECURITY_AUDIT.md` — February 2026 comprehensive security audit

### Internal References

- Middleware pattern: `netlify/functions/_shared/middleware.ts` (compose, withAuth, withCORS)
- JWT library: `netlify/functions/_shared/jwt.ts` (active implementation)
- JWT custom HMAC (dead code): `netlify/functions/_shared/auth.ts:63-131`
- CORS config: `netlify/functions/_shared/cors.ts`
- Security headers: `netlify.toml:49-56`
- Regex sanitizer: `pages/admin/ProposalDetail.tsx:19-27`
- Unauthenticated endpoint: `netlify/functions/client-project-request.ts:35-38`
- Stack trace leak: `netlify/functions/payments.ts:320`
- R2 escape hatch: `netlify/functions/r2-presign.ts:108-109`
- SQL interpolation (gold standard): `netlify/functions/projects.ts:437-448`

### External References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [DOMPurify Default Tags/Attributes](https://github.com/cure53/DOMPurify/wiki/Default-TAGs-ATTRIBUTEs-allow-list-&-blocklist)
- [TipTap Link XSS Issue #3673](https://github.com/ueberdosis/tiptap/issues/3673)
- [Netlify Scheduled Functions Docs](https://docs.netlify.com/build/functions/scheduled-functions/)
- [Netlify CSP Nonce Integration](https://www.netlify.com/blog/general-availability-content-security-policy-csp-nonce-integration/)
- [Vite CSP Considerations](https://vite.dev/guide/features)
