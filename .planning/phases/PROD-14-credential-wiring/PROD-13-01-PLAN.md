---
phase: PROD-13-credential-wiring
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/proposals.ts
autonomous: true

must_haves:
  truths:
    - "getProposals() sends httpOnly cookie with requests"
    - "getProposalById() sends httpOnly cookie with requests"
    - "getProposalsByInquiryId() sends httpOnly cookie with requests"
  artifacts:
    - path: "lib/proposals.ts"
      provides: "Proposal API client with cookie authentication"
      contains: "credentials: 'include'"
  key_links:
    - from: "lib/proposals.ts"
      to: "/.netlify/functions/proposals"
      via: "fetch with credentials"
      pattern: "credentials:\\s*['\"]include['\"]"
---

<objective>
Add `credentials: 'include'` to 3 fetch calls in lib/proposals.ts that access protected endpoints.

Purpose: These endpoints are protected by `withAuth()` middleware and will reject requests without the httpOnly cookie. This blocks deployment.

Output: lib/proposals.ts with all GET fetch calls properly authenticated.
</objective>

<execution_context>
@/Users/praburajasekaran/.claude/get-shit-done/workflows/execute-plan.md
@/Users/praburajasekaran/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@lib/proposals.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add credentials to getProposals()</name>
  <files>lib/proposals.ts</files>
  <action>
    In the `getProposals()` function (around line 44), add `credentials: 'include'` to the fetch call:

    Change:
    ```typescript
    const response = await fetch(`${API_BASE_URL}/proposals`);
    ```

    To:
    ```typescript
    const response = await fetch(`${API_BASE_URL}/proposals`, {
      credentials: 'include',
    });
    ```
  </action>
  <verify>grep -n "credentials.*include" lib/proposals.ts | grep -c getProposals || echo "Check line 44"</verify>
  <done>getProposals() fetch call includes credentials: 'include'</done>
</task>

<task type="auto">
  <name>Task 2: Add credentials to getProposalById()</name>
  <files>lib/proposals.ts</files>
  <action>
    In the `getProposalById()` function (around line 73), add `credentials: 'include'` to the fetch call:

    Change:
    ```typescript
    const response = await fetch(`${API_BASE_URL}/proposal-detail/${id}`);
    ```

    To:
    ```typescript
    const response = await fetch(`${API_BASE_URL}/proposal-detail/${id}`, {
      credentials: 'include',
    });
    ```
  </action>
  <verify>grep -n "credentials.*include" lib/proposals.ts | wc -l should show at least 2</verify>
  <done>getProposalById() fetch call includes credentials: 'include'</done>
</task>

<task type="auto">
  <name>Task 3: Add credentials to getProposalsByInquiryId()</name>
  <files>lib/proposals.ts</files>
  <action>
    In the `getProposalsByInquiryId()` function (around line 103), add `credentials: 'include'` to the fetch call:

    Change:
    ```typescript
    const response = await fetch(`${API_BASE_URL}/proposals?inquiryId=${inquiryId}`);
    ```

    To:
    ```typescript
    const response = await fetch(`${API_BASE_URL}/proposals?inquiryId=${inquiryId}`, {
      credentials: 'include',
    });
    ```
  </action>
  <verify>grep -n "credentials.*include" lib/proposals.ts | wc -l should show at least 6 (3 new + 3 existing for POST/PUT/PATCH)</verify>
  <done>getProposalsByInquiryId() fetch call includes credentials: 'include'</done>
</task>

</tasks>

<verification>
1. Run: `grep -n "credentials.*include" lib/proposals.ts` - should show 6 occurrences
2. Run: `npm run build` - build should pass
3. Verify all 3 GET functions have credentials added (getProposals, getProposalById, getProposalsByInquiryId)
</verification>

<success_criteria>
- All 3 GET fetch calls in lib/proposals.ts include `credentials: 'include'`
- Build passes without errors
- No regressions in existing functionality
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-13-credential-wiring/PROD-13-01-SUMMARY.md`
</output>
