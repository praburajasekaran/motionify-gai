---
phase: PROD-13-credential-wiring
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/inquiries.ts
autonomous: true

must_haves:
  truths:
    - "getInquiryById() sends httpOnly cookie with requests"
  artifacts:
    - path: "lib/inquiries.ts"
      provides: "Inquiry API client with cookie authentication"
      contains: "credentials: 'include'"
  key_links:
    - from: "lib/inquiries.ts"
      to: "/.netlify/functions/inquiry-detail"
      via: "fetch with credentials"
      pattern: "credentials:\\s*['\"]include['\"]"
---

<objective>
Add `credentials: 'include'` to 1 fetch call in lib/inquiries.ts that accesses a protected endpoint.

Purpose: The inquiry-detail endpoint is protected by `withAuth()` middleware and will reject requests without the httpOnly cookie. This blocks deployment.

Output: lib/inquiries.ts with getInquiryById() properly authenticated.
</objective>

<execution_context>
@/Users/praburajasekaran/.claude/get-shit-done/workflows/execute-plan.md
@/Users/praburajasekaran/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@lib/inquiries.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add credentials to getInquiryById()</name>
  <files>lib/inquiries.ts</files>
  <action>
    In the `getInquiryById()` function (around line 91), add `credentials: 'include'` to the fetch call:

    Change:
    ```typescript
    const response = await fetch(`${API_BASE_URL}/inquiry-detail/${id}`);
    ```

    To:
    ```typescript
    const response = await fetch(`${API_BASE_URL}/inquiry-detail/${id}`, {
      credentials: 'include',
    });
    ```

    Note: Other functions in this file (getInquiries, createInquiry, updateInquiry, getInquiriesByClientUserId) already have credentials: 'include'.
  </action>
  <verify>grep -n "credentials.*include" lib/inquiries.ts | wc -l should show 5 occurrences (4 existing + 1 new)</verify>
  <done>getInquiryById() fetch call includes credentials: 'include'</done>
</task>

</tasks>

<verification>
1. Run: `grep -n "credentials.*include" lib/inquiries.ts` - should show 5 occurrences
2. Run: `npm run build` - build should pass
3. Verify getInquiryById function has credentials added
</verification>

<success_criteria>
- getInquiryById() fetch call includes `credentials: 'include'`
- Build passes without errors
- No regressions in existing functionality
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-13-credential-wiring/PROD-13-02-SUMMARY.md`
</output>
