# Security Audit Report — Motionify PM Portal

**Date:** 2026-02-22
**Scope:** Full codebase static analysis
**Classification:** Internal — Confidential

---

## Executive Summary

This audit identified **25 security findings** across the Motionify PM Portal codebase, including 5 Critical, 9 High, 8 Medium, and 3 Low severity issues. The most significant risks involve an API key exposed in the client-side bundle, duplicate JWT implementations with hardcoded fallback secrets, a missing authentication check on a data-access endpoint, XSS via unsanitized HTML rendering, and a timing-attack-vulnerable webhook signature comparison.

| Severity | Count |
|----------|-------|
| Critical | 5     |
| High     | 9     |
| Medium   | 8     |
| Low      | 3     |

---

## Critical Findings

### C1. API Key Exposed in Client-Side JavaScript Bundle

**File:** `vite.config.ts:42-44`

**Description:**
The Gemini API key is embedded directly into the client-side JavaScript bundle via Vite's `define` option:

```typescript
define: {
    'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
},
```

This compiles the secret value into the production JavaScript bundle, making it visible to anyone who inspects the page source, network requests, or source maps.

**Impact:** Unauthorized use of the Gemini API at the project's expense. Potential for API abuse, quota exhaustion, and cost escalation.

**Remediation:** Remove the API key from the client bundle. Proxy Gemini API calls through a backend endpoint that injects the key server-side.

---

### C2. Duplicate JWT Implementations with Weak Default Secrets

**Files:**
- `netlify/functions/_shared/auth.ts:19-32`
- `netlify/functions/_shared/jwt.ts:16`

**Description:**
Two separate JWT implementations exist using different secret fallbacks:

```typescript
// auth.ts:28 — custom HMAC implementation
return 'dev-only-secret-do-not-use-in-production-32chars';

// jwt.ts:16 — jsonwebtoken library
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION';
```

Both modules are used by different parts of the codebase. If `JWT_SECRET` is unset (which only throws in production for `auth.ts`, never for `jwt.ts`), tokens are signed with predictable, publicly-visible secrets, enabling complete authentication bypass.

**Impact:** Full account takeover. An attacker can forge JWTs for any user including `super_admin`.

**Remediation:**
1. Consolidate into a single JWT module. Remove the custom HMAC implementation in `auth.ts`.
2. Remove all fallback secrets. Fail immediately if `JWT_SECRET` is unset regardless of environment.

---

### C3. Missing Authentication on `client-project-request` Endpoint

**File:** `netlify/functions/client-project-request.ts:49-85`

**Description:**
The GET handler returns all project requests for any `clientUserId` passed as a query parameter, with no authentication check whatsoever:

```typescript
if (event.httpMethod === 'GET') {
    const { clientUserId } = event.queryStringParameters || {};
    const result = await client.query(
        `SELECT * FROM project_requests WHERE client_user_id = $1 ORDER BY created_at DESC`,
        [clientUserId]
    );
    return { statusCode: 200, headers, body: JSON.stringify(result.rows) };
}
```

**Impact:** Any unauthenticated user can enumerate client IDs and retrieve their project requests, exposing titles, descriptions, deadlines, and internal status.

**Remediation:** Add `requireAuthFromCookie` and verify the authenticated user owns the requested `clientUserId`, or restrict to admin roles.

---

### C4. XSS via `dangerouslySetInnerHTML` on User-Controlled Content

**Files:**
- `pages/admin/ProposalDetail.tsx:619`
- `landing-page-new/src/components/proposal/ProposalReview.tsx:90`

**Description:**
Proposal descriptions (entered via Tiptap rich text editor) are rendered directly as raw HTML without sanitization:

```jsx
<div className="tiptap text-foreground"
     dangerouslySetInnerHTML={{ __html: proposal.description }} />
```

An attacker with access to create/edit proposals can inject `<script>` tags or event handlers that execute in the context of any user viewing the proposal — including admins.

**Impact:** Stored XSS enabling session hijacking, admin account takeover, or data exfiltration.

**Remediation:** Sanitize HTML with DOMPurify before rendering:
```typescript
import DOMPurify from 'dompurify';
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(proposal.description) }}
```

---

### C5. Timing-Attack Vulnerable Webhook Signature Verification

**File:** `netlify/functions/razorpay-webhook.ts:52-57`

**Description:**
The Razorpay webhook signature is compared using strict equality (`===`), which is vulnerable to timing attacks:

```typescript
function verifySignature(rawBody: string, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest('hex');
    return expectedSignature === signature;  // timing-vulnerable
}
```

**Impact:** An attacker can forge webhook calls by exploiting timing differences to reconstruct the valid signature byte-by-byte.

**Remediation:** Use constant-time comparison:
```typescript
const expected = Buffer.from(expectedSignature, 'hex');
const actual = Buffer.from(signature, 'hex');
return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
```

---

## High Findings

### H1. HTML Injection in Email Templates

**File:** `netlify/functions/send-email.ts` (lines 78, 106, 136, 168, 196, 231, 564)

**Description:**
User-controlled values are interpolated directly into HTML email templates without escaping:

```typescript
<p><strong>${data.mentionedByName}</strong> mentioned you in <strong>${data.taskTitle}</strong>:</p>
<div>"${data.commentContent}"</div>
```

Fields like `taskTitle`, `commentContent`, `clientName`, `deliverableName`, `projectName`, and `requestedBy` are all unescaped.

**Impact:** Phishing via crafted task/project names containing malicious HTML, link injection, or misleading content in transactional emails.

**Remediation:** Create a shared `escapeHtml()` utility and apply it to all interpolated values:
```typescript
function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
              .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

---

### H2. Missing CSRF Protection

**Scope:** All state-changing endpoints

**Description:**
No CSRF tokens are generated, embedded, or validated. The application relies solely on `SameSite` cookie attributes, which provide incomplete protection:
- `SameSite=Lax` (used in development) permits top-level GET navigations from cross-origin
- Some browsers have inconsistent SameSite enforcement
- No `X-CSRF-Token` or double-submit cookie pattern

**Impact:** State-changing operations (creating projects, approving deliverables, processing payments) could be triggered via cross-site request forgery.

**Remediation:** Implement double-submit cookie pattern or synchronizer tokens for all POST/PUT/DELETE endpoints.

---

### H3. Rate Limiting Fails Open

**File:** `netlify/functions/_shared/rateLimit.ts:159-167`

**Description:**
When the rate limit database check fails (connection error, timeout, etc.), the request is allowed through:

```typescript
} catch (error) {
    logger.error('Rate limit check failed', error);
    return {
        allowed: true,  // fail-open
        remaining: config.maxRequests,
        resetAt,
    };
}
```

**Impact:** An attacker who can cause database connection failures (e.g., via resource exhaustion) can bypass all rate limits, enabling brute-force attacks on magic links and login.

**Remediation:** Implement fail-closed behavior for security-critical endpoints (magic link, login). Consider an in-memory fallback rate limiter.

---

### H4. Dynamic SQL Column/Field Names via String Interpolation

**Files:**
- `netlify/functions/inquiry-detail.ts:50` (column name)
- `netlify/functions/inquiries.ts:131, 325` (column name)
- `netlify/functions/projects.ts:498` (SET clause)
- `netlify/functions/tasks.ts:789` (SET clause)
- `netlify/functions/deliverables.ts:378` (SET clause)
- `netlify/functions/proposals.ts:284, 371` (SET clause)
- `netlify/functions/users-update.ts:112` (SET clause)

**Description:**
Column names and SET clause field names are constructed via template literals or string joins:

```typescript
// Column name interpolation
const result = await client.query(
    `SELECT * FROM inquiries WHERE ${lookupColumn} = $1`, [id]
);

// SET clause construction
setClauses.push(`${field} = $${paramIndex}`);
await client.query(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`, values);
```

While values are parameterized and field names are currently derived from hardcoded whitelists, this pattern is fragile — any future change that allows user input to influence field/column names creates a SQL injection vector.

**Impact:** Currently mitigated by whitelist logic, but one misconfiguration away from SQL injection.

**Remediation:** Use explicit query branching (separate query strings per case) or a query builder like Knex.js.

---

### H5. Session Validation Disabled by Default

**File:** `netlify/functions/_shared/auth.ts:142-144`

**Description:**
```typescript
export async function authenticateRequest(
    headers: Record<string, string>,
    validateSession = false  // disabled by default
): Promise<AuthResult> {
```

Most endpoints don't pass `validateSession = true`, meaning logged-out sessions remain valid until the JWT expires. If a user's session is deleted from the database, their JWT continues to work.

**Impact:** Token revocation is ineffective. Compromised tokens cannot be invalidated.

**Remediation:** Enable session validation by default, or at minimum for sensitive operations (payments, admin actions, settings changes).

---

### H6. Broken Access Control in Inquiries

**File:** `netlify/functions/inquiries.ts:96-110`

**Description:**
Authentication is only enforced for GET and PUT, not POST (intentional for public form). However, the access control for GET lacks proper validation that non-admin users can only access their own inquiries. The check at line 172 occurs after initial query construction.

**Impact:** Potential for unauthorized data access if client role users manipulate request parameters.

**Remediation:** Enforce row-level access control immediately after authentication, before any query execution.

---

### H7. Error Responses Leak Internal Details Including Stack Traces

**Files:**
- `netlify/functions/payments.ts:335-339` (includes `stack` property)
- `netlify/functions/client-project-request.ts:181-184`
- Multiple other endpoints

**Description:**
Error messages from database drivers, payment providers, and other internal systems are forwarded to clients. One endpoint explicitly includes the full stack trace:

```typescript
// payments.ts:335-339
body: JSON.stringify({
    error: 'Payment verification failed',
    details: verifyError.message || 'Unknown error',
    stack: verifyError.stack,  // FULL STACK TRACE exposed
}),
```

**Impact:** Information disclosure — stack traces, file paths, SQL errors, and provider-specific messages help attackers understand the system architecture and identify attack vectors.

**Remediation:** Remove `stack` from all responses. Log detailed errors server-side. Return generic error messages to clients.

---

### H8. CORS Wildcard (`*`) on Landing Page API Routes

**Files:**
- `landing-page-new/src/app/api/inquiry-request-verification/route.ts`
- `landing-page-new/src/app/api/payments/send-proforma-email/route.ts`
- `landing-page-new/src/app/api/inquiries/[id]/route.ts`
- `landing-page-new/src/app/api/inquiries/route.ts`
- `landing-page-new/src/app/api/proposals/route.ts`
- `landing-page-new/src/app/api/proposals/[id]/route.ts`
- `landing-page-new/src/app/api/payments/proforma/[proposalId]/route.ts`

**Description:**
All Next.js API routes in the landing page use `Access-Control-Allow-Origin: '*'`:

```typescript
const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*' };
```

This allows any website to make cross-origin requests to these endpoints, including payment-related and proposal-related APIs.

**Impact:** Any malicious website can interact with these API endpoints on behalf of a user if combined with other auth weaknesses.

**Remediation:** Replace `*` with the specific allowed origins list. Reuse the CORS configuration from `netlify/functions/_shared/cors.ts`.

---

### H9. Authentication Tokens Stored in localStorage

**Files:**
- `landing-page-new/src/components/CommentThread.tsx:65`
- `landing-page-new/src/lib/attachments.ts:43, 84`

**Description:**
JWT tokens are retrieved from `localStorage` for authenticated API calls:

```typescript
const token = localStorage.getItem('portal_token');
```

`localStorage` is accessible to any JavaScript running on the page. Combined with the XSS vulnerabilities (C4) and unsanitized email templates (H1), this creates a token theft vector.

**Impact:** Any XSS vulnerability allows immediate theft of authentication tokens, enabling full account takeover.

**Remediation:** Use httpOnly cookies for authentication (already implemented in the portal via `_shared/jwt.ts`). Migrate the landing page to use the same cookie-based auth.

---

## Medium Findings

### M1. Magic Link Token Race Condition

**File:** `netlify/functions/auth-verify-magic-link.ts:157-174`

**Description:**
The token's `used_at` field is checked and then updated in separate queries without a database-level lock:

```typescript
if (tokenRecord.used_at !== null) { throw ... }  // check
// ... other validations ...
await client.query(`UPDATE magic_link_tokens SET used_at = NOW() WHERE id = $1`, [tokenRecord.id]);  // set
```

Two concurrent requests with the same token can both pass the `used_at` check before either executes the UPDATE.

**Impact:** Single-use magic links can potentially be used twice.

**Remediation:** Use `UPDATE ... SET used_at = NOW() WHERE id = $1 AND used_at IS NULL RETURNING *` as an atomic check-and-set.

---

### M2. CORS Allows Requests Without Origin Header

**File:** `netlify/functions/_shared/cors.ts:62-65`

**Description:**
```typescript
export function isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) {
        return true;  // allows all requests without Origin header
    }
```

Requests without an `Origin` header (e.g., from curl, Postman, or server-side callers) bypass CORS validation entirely.

**Impact:** CORS becomes ineffective for non-browser clients, though this is partially mitigated by authentication requirements.

**Remediation:** For sensitive endpoints, require a valid Origin header or use additional authentication mechanisms.

---

### M3. Overly Broad Netlify Preview URL Pattern

**File:** `netlify/functions/_shared/cors.ts:75`

**Description:**
```typescript
if (origin.match(/^https:\/\/[a-z0-9-]+--motionify.*\.netlify\.app$/)) {
    return true;
}
```

The regex `motionify.*` matches any Netlify app starting with "motionify", not just the actual project. An attacker could create a Netlify site named `motionify-evil` that would pass this check.

**Impact:** Cross-origin requests from attacker-controlled Netlify deployments would be accepted.

**Remediation:** Use a more specific pattern: `/^https:\/\/[a-z0-9]+--(motionify-pm-portal)\.netlify\.app$/` (replace with actual Netlify site name).

---

### M4. Sensitive Data in Logs

**File:** `netlify/functions/auth-request-magic-link.ts:145, 157`

**Description:**
Magic link URLs (containing authentication tokens) are logged:
```typescript
console.log('[magic-link] ENV:', { ..., magicLink: magicLink.substring(0, 80) + '...' });
if (isLocalDev) { logger.info('Magic link generated for local testing', { magicLink }); }
```

Even truncated, the first 80 characters of the magic link contain the domain and part of the token.

**Impact:** Magic link tokens could be extracted from log aggregation systems.

**Remediation:** Never log authentication tokens. Log only non-sensitive metadata (email, timestamp, token ID).

---

### M5. Hardcoded Admin Fallback Email

**File:** `netlify/functions/auth-verify-magic-link.ts:278`

**Description:**
```typescript
const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@motionify.com';
```

If the environment variable is unset, notifications go to a hardcoded address that may not be controlled in all environments.

**Impact:** Admin notifications could be lost or misdirected.

**Remediation:** Remove fallback. Fail or skip notification if the variable is not configured.

---

### M6. `rejectUnauthorized: false` on Database SSL

**File:** `netlify/functions/client-project-request.ts:23`

**Description:**
```typescript
return new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});
```

SSL certificate validation is disabled, allowing man-in-the-middle attacks on the database connection.

**Impact:** Database credentials and query data could be intercepted if the network is compromised.

**Remediation:** Use proper CA certificates or set `rejectUnauthorized: true` with the Neon CA cert.

---

### M7. Email Header Injection Potential

**File:** `netlify/functions/_shared/validation.ts:14-18`

**Description:**
The Zod email schema doesn't explicitly reject control characters:
```typescript
export const emailSchema = z.string().email('Invalid email format')
    .min(5).max(255).transform(val => val.toLowerCase().trim());
```

While Zod's `.email()` provides basic format validation, it may not catch all CRLF injection attempts that could manipulate email headers.

**Impact:** Email header injection leading to spam relay or phishing.

**Remediation:** Add `.refine(val => !/[\r\n]/.test(val), 'Invalid characters')` to the schema.

---

### M8. Missing Security Headers

**File:** `netlify.toml`

**Description:**
No security headers are configured for production deployment:
- No `Content-Security-Policy` (CSP)
- No `X-Frame-Options`
- No `X-Content-Type-Options`
- No `Strict-Transport-Security` (HSTS)
- No `Referrer-Policy`

**Impact:** Increased exposure to clickjacking, MIME-type sniffing attacks, and downgrade attacks.

**Remediation:** Add security headers in `netlify.toml`:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
```

---

## Low Findings

### L1. `secure: false` in Vite Dev Proxy

**File:** `vite.config.ts`

**Description:** Dev proxy has `secure: false`, disabling SSL verification for proxied requests. While only affecting local development, this could mask issues.

---

### L2. `Access-Control-Allow-Private-Network: true`

**File:** `netlify/functions/_shared/cors.ts:102`

**Description:** This header allows access from private network ranges. While needed for local dev, it should not be sent in production.

---

### L3. Scheduled Functions Lack Auth Validation

**Files:** `netlify/functions/scheduled-file-expiry.ts`, `scheduled-payment-reminder.ts`, `scheduled-token-cleanup.ts`

**Description:** Scheduled functions rely solely on Netlify platform routing for access control, with no validation that they're being invoked by the Netlify scheduler.

---

## Positive Security Practices Observed

- **Parameterized SQL queries** for all user-supplied values
- **Zod schema validation** on API inputs
- **Rate limiting** on authentication and sensitive endpoints
- **HttpOnly, Secure, SameSite cookies** for session management
- **HMAC-SHA256 webhook signature verification** (needs timing-safe comparison)
- **Role-based access control** middleware with super_admin/support/client/team roles
- **Session tracking** in database with expiry
- **Presigned URLs** for file uploads (no direct upload to server)
- **Environment-specific CORS** with production whitelist

---

## Recommended Priority Actions

1. **Immediate:** Remove Gemini API key from client bundle, proxy through backend (C1)
2. **Immediate:** Consolidate JWT into single module, remove all fallback secrets (C2)
3. **Immediate:** Add authentication to `client-project-request` endpoint (C3)
4. **Immediate:** Sanitize HTML with DOMPurify before rendering proposals (C4)
5. **Immediate:** Use `crypto.timingSafeEqual` for webhook signature comparison (C5)
6. **Immediate:** Remove `stack` property from all error responses (H7)
7. **This sprint:** Escape all user values in email templates (H1)
8. **This sprint:** Implement CSRF protection (H2)
9. **This sprint:** Change rate limiter to fail-closed for auth endpoints (H3)
10. **This sprint:** Replace CORS `*` with specific origins in landing page APIs (H8)
11. **This sprint:** Migrate landing page from localStorage tokens to httpOnly cookies (H9)
12. **This sprint:** Enable session validation by default (H5)
13. **This sprint:** Add security headers in netlify.toml (M8)
