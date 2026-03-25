# Security Gap Remediation Brainstorm

**Date:** 2026-03-19
**Status:** Ready for planning

## What We're Building

A systematic remediation of all 9 remaining security gaps identified in the February 2026 security audit (`SECURITY_AUDIT.md`). Each gap is fixed individually in priority order with focused commits.

## Why This Approach

The Feb 2026 audit found ~18 issues. Many have been fixed, but 9 remain open — including 2 Critical findings. A systematic, priority-ordered approach ensures the most dangerous issues are addressed first, each fix is independently reviewable and revertable, and no gap is missed.

## Remaining Gaps (Priority Order)

### Critical

1. **C3 — Unauthenticated `client-project-request` endpoint**
   - File: `netlify/functions/client-project-request.ts`
   - Issue: GET returns all project requests for any `clientUserId` query param, POST creates requests — both without any authentication
   - Fix: Add `withAuth()` middleware, scope GET to authenticated user's own requests, require auth for POST

2. **C4 — XSS via regex-based HTML sanitizer**
   - Files: `pages/admin/ProposalDetail.tsx`, `landing-page-new/src/components/proposal/ProposalReview.tsx`
   - Issue: Hand-rolled regex sanitizer is bypassable (encoding tricks, nested tags, SVG payloads)
   - Fix: Replace with DOMPurify library

### High

3. **H4 — Dynamic SQL column name interpolation**
   - Files: `inquiry-detail.ts`, `inquiries.ts`, `projects.ts`, `proposals.ts`, `users-settings.ts`
   - Issue: `${field}` and `${lookupColumn}` interpolated into SQL — not direct user input today, but fragile
   - Fix: Whitelist-validate column names against allowed sets before interpolation

4. **H7 — Stack trace exposed in error response**
   - File: `netlify/functions/payments.ts` (line 320)
   - Issue: `verifyError.stack` sent in API response body
   - Fix: Return generic error message, log stack server-side only

5. **H2 — No CSRF token pattern**
   - File: `netlify/functions/_shared/cors.ts`
   - Issue: Relies solely on Origin/Referer header checks for CSRF protection
   - Fix: Implement double-submit cookie CSRF token pattern for state-changing requests

### Medium

6. **M8 — Missing Content-Security-Policy header**
   - File: `netlify.toml`
   - Issue: No CSP header — if XSS occurs, no defense-in-depth to limit script execution
   - Fix: Add CSP header with strict policy (script-src, style-src, connect-src, etc.)

7. **C2 — Dual JWT implementations**
   - Files: `netlify/functions/_shared/auth.ts`, `netlify/functions/_shared/jwt.ts`
   - Issue: Custom HMAC-SHA256 JWT + `jsonwebtoken` library coexist — maintenance risk
   - Fix: Consolidate onto `jsonwebtoken` library, migrate existing tokens

8. **L3 — Scheduled functions lack invocation-source validation**
   - Issue: Scheduled Netlify functions don't verify they were invoked by the scheduler
   - Fix: Check for Netlify-specific headers or shared secret

9. **R2 presign backward-compatibility escape hatch**
   - File: `netlify/functions/r2-presign.ts`
   - Issue: Unknown key patterns not starting with `uploads/` are allowed through
   - Fix: Remove the fallback, require all keys to match known patterns

## Key Decisions

- **Approach:** Systematic batch fix — one gap per commit, priority order (Critical → High → Medium)
- **Dependencies:** Free to add (DOMPurify, etc.)
- **Scope:** Full stack — backend and frontend changes allowed
- **Base:** All work on the existing `feat/accessibility-contrast-audit` branch or a new security branch

## Open Questions

None — scope and approach are clear.

## References

- `SECURITY_AUDIT.md` — Original Feb 2026 audit with full findings
- `netlify/functions/_shared/` — Core security middleware
- `netlify.toml` — Security headers configuration
