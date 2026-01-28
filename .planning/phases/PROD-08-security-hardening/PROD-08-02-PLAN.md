---
phase: PROD-08-security-hardening
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/inquiries.ts
autonomous: true

must_haves:
  truths:
    - "getInquiries() sends cookies with request"
    - "getInquiriesByClientUserId() sends cookies with request"
    - "updateInquiry() sends cookies with request"
    - "All inquiry fetch calls are authenticated"
  artifacts:
    - path: "lib/inquiries.ts"
      provides: "Frontend inquiry API client with credentials"
      contains: "credentials: 'include'"
  key_links:
    - from: "lib/inquiries.ts"
      to: "/.netlify/functions/inquiries"
      via: "fetch with credentials"
      pattern: "credentials: 'include'"
---

<objective>
Add credentials: 'include' to all fetch calls in lib/inquiries.ts to ensure cookies are sent with API requests.

Purpose: Close low-severity security gap where 3 fetch calls (getInquiries, getInquiriesByClientUserId, updateInquiry) are missing credentials. Without credentials, the browser won't send the httpOnly auth cookie, causing 401 errors on protected endpoints.

Output: All inquiry API calls include credentials for proper cookie-based authentication.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/PROD-08-security-hardening/PROD-08-RESEARCH.md
@lib/inquiries.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add credentials to getInquiries fetch</name>
  <files>lib/inquiries.ts</files>
  <action>
Update the fetch call in getInquiries() (around line 58) to include credentials.

BEFORE:
```typescript
const response = await fetch(`${API_BASE_URL}/inquiries`);
```

AFTER:
```typescript
const response = await fetch(`${API_BASE_URL}/inquiries`, {
  credentials: 'include',
});
```

This ensures the httpOnly auth cookie is sent with the request to the now-protected inquiries endpoint.
  </action>
  <verify>
Grep for "credentials: 'include'" in getInquiries function.
Run `npm run build` to verify no syntax errors.
  </verify>
  <done>
getInquiries() includes credentials: 'include' in fetch options.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add credentials to getInquiriesByClientUserId fetch</name>
  <files>lib/inquiries.ts</files>
  <action>
Update the fetch call in getInquiriesByClientUserId() (around line 304) to include credentials.

BEFORE:
```typescript
const response = await fetch(`${API_BASE_URL}/inquiries?clientUserId=${encodeURIComponent(clientUserId)}`);
```

AFTER:
```typescript
const response = await fetch(`${API_BASE_URL}/inquiries?clientUserId=${encodeURIComponent(clientUserId)}`, {
  credentials: 'include',
});
```

This is critical for client portal where users fetch their own inquiries.
  </action>
  <verify>
Grep for "credentials: 'include'" in getInquiriesByClientUserId function.
Run `npm run build` to verify no syntax errors.
  </verify>
  <done>
getInquiriesByClientUserId() includes credentials: 'include' in fetch options.
  </done>
</task>

<task type="auto">
  <name>Task 3: Add credentials to updateInquiry fetch</name>
  <files>lib/inquiries.ts</files>
  <action>
Update the fetch call in updateInquiry() (around line 200) to include credentials.

BEFORE:
```typescript
const response = await fetch(`${API_BASE_URL}/inquiry-detail/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(snakeCaseUpdates),
});
```

AFTER:
```typescript
const response = await fetch(`${API_BASE_URL}/inquiry-detail/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(snakeCaseUpdates),
  credentials: 'include',
});
```

This ensures inquiry status updates (which require authentication) work correctly.
  </action>
  <verify>
Grep for "credentials: 'include'" in updateInquiry function.
Run `npm run build` to verify no syntax errors.
  </verify>
  <done>
updateInquiry() includes credentials: 'include' in fetch options.
  </done>
</task>

</tasks>

<verification>
1. Build passes: `npm run build` succeeds for Vite admin portal
2. Credential count: At least 4 occurrences of credentials: 'include' in lib/inquiries.ts (createInquiry already has it + 3 new ones)
3. No missing calls: All fetch() calls in lib/inquiries.ts now have credentials
</verification>

<success_criteria>
- getInquiries() has credentials: 'include'
- getInquiriesByClientUserId() has credentials: 'include'
- updateInquiry() has credentials: 'include'
- createInquiry() already has credentials: 'include' (no change needed)
- getInquiryById() uses inquiry-detail endpoint (separate function, already protected)
- npm run build succeeds
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-08-security-hardening/PROD-08-02-SUMMARY.md`
</output>
