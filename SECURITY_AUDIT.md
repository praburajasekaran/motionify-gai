# Security Audit Report — Motionify PM Portal

**Date:** 2026-02-22
**Scope:** Full codebase static analysis
**Classification:** Internal — Confidential

---

## Executive Summary

This audit identified **21 security findings** across the Motionify PM Portal codebase, including 4 Critical, 7 High, 7 Medium, and 3 Low severity issues. The most significant risks involve duplicate JWT implementations with hardcoded fallback secrets, a missing authentication check on a data-access endpoint, XSS via unsanitized HTML rendering, and a timing-attack-vulnerable webhook signature comparison.

| Severity | Count |
|----------|-------|
| Critical | 4     |
| High     | 7     |
| Medium   | 7     |
| Low      | 3     |

---

## Critical Findings

### C1. Duplicate JWT Implementations with Weak Default Secrets

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

### C2. Missing Authentication on `client-project-request` Endpoint

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

### C3. XSS via `dangerouslySetInnerHTML` on User-Controlled Content

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

### C4. Timing-Attack Vulnerable Webhook Signature Verification

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

### H7. Error Responses Leak Internal Details

**File:** `netlify/functions/client-project-request.ts:181-184`, and multiple other endpoints

**Description:**
```typescript
body: JSON.stringify({
    error: 'Internal server error',
    message: error instanceof Error ? error.message : 'Unknown error',
}),
```

Error messages from database drivers, payment providers, and other internal systems are forwarded to clients.

**Impact:** Information disclosure — stack traces, SQL errors, and provider-specific messages help attackers understand the system architecture.

**Remediation:** Log detailed errors server-side. Return generic error messages to clients.

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

1. **Immediate:** Consolidate JWT into single module, remove all fallback secrets (C1)
2. **Immediate:** Add authentication to `client-project-request` endpoint (C2)
3. **Immediate:** Sanitize HTML with DOMPurify before rendering proposals (C3)
4. **Immediate:** Use `crypto.timingSafeEqual` for webhook signature comparison (C4)
5. **This sprint:** Escape all user values in email templates (H1)
6. **This sprint:** Implement CSRF protection (H2)
7. **This sprint:** Change rate limiter to fail-closed for auth endpoints (H3)
8. **This sprint:** Enable session validation by default (H5)
