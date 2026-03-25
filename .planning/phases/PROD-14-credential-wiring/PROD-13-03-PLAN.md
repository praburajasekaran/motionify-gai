---
phase: PROD-13-credential-wiring
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - services/paymentApi.ts
autonomous: true

must_haves:
  truths:
    - "fetchPaymentsForProject() sends httpOnly cookie with requests"
    - "fetchPaymentsForProposal() sends httpOnly cookie with requests"
    - "markPaymentAsPaid() sends httpOnly cookie with requests"
  artifacts:
    - path: "services/paymentApi.ts"
      provides: "Payment API client with cookie authentication"
      contains: "credentials: 'include'"
  key_links:
    - from: "services/paymentApi.ts"
      to: "/.netlify/functions/payments"
      via: "fetch with credentials"
      pattern: "credentials:\\s*['\"]include['\"]"
---

<objective>
Add `credentials: 'include'` to 3 fetch calls in services/paymentApi.ts that access protected endpoints.

Purpose: The payments endpoints are protected by `withAuth()` middleware and will reject requests without the httpOnly cookie. This blocks deployment.

Output: services/paymentApi.ts with all payment fetch calls properly authenticated.
</objective>

<execution_context>
@/Users/praburajasekaran/.claude/get-shit-done/workflows/execute-plan.md
@/Users/praburajasekaran/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@services/paymentApi.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add credentials to fetchPaymentsForProject()</name>
  <files>services/paymentApi.ts</files>
  <action>
    In the `fetchPaymentsForProject()` function (around line 95), add `credentials: 'include'` to the fetch call:

    Change:
    ```typescript
    const response = await fetch(`/.netlify/functions/payments?projectId=${projectId}`);
    ```

    To:
    ```typescript
    const response = await fetch(`/.netlify/functions/payments?projectId=${projectId}`, {
      credentials: 'include',
    });
    ```
  </action>
  <verify>grep -n "credentials.*include" services/paymentApi.ts | wc -l should show at least 3</verify>
  <done>fetchPaymentsForProject() fetch call includes credentials: 'include'</done>
</task>

<task type="auto">
  <name>Task 2: Add credentials to fetchPaymentsForProposal()</name>
  <files>services/paymentApi.ts</files>
  <action>
    In the `fetchPaymentsForProposal()` function (around line 108), add `credentials: 'include'` to the fetch call:

    Change:
    ```typescript
    const response = await fetch(`/.netlify/functions/payments?proposalId=${proposalId}`);
    ```

    To:
    ```typescript
    const response = await fetch(`/.netlify/functions/payments?proposalId=${proposalId}`, {
      credentials: 'include',
    });
    ```
  </action>
  <verify>grep -n "credentials.*include" services/paymentApi.ts | wc -l should show at least 4</verify>
  <done>fetchPaymentsForProposal() fetch call includes credentials: 'include'</done>
</task>

<task type="auto">
  <name>Task 3: Add credentials to markPaymentAsPaid()</name>
  <files>services/paymentApi.ts</files>
  <action>
    In the `markPaymentAsPaid()` function (around line 121), add `credentials: 'include'` to the fetch call:

    Change:
    ```typescript
    const response = await fetch('/.netlify/functions/payments/manual-complete', {
      method: 'POST',
      body: JSON.stringify({ paymentId }),
      headers: { 'Content-Type': 'application/json' }
    });
    ```

    To:
    ```typescript
    const response = await fetch('/.netlify/functions/payments/manual-complete', {
      method: 'POST',
      body: JSON.stringify({ paymentId }),
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    ```
  </action>
  <verify>grep -n "credentials.*include" services/paymentApi.ts | wc -l should show 5 occurrences (2 existing + 3 new)</verify>
  <done>markPaymentAsPaid() fetch call includes credentials: 'include'</done>
</task>

</tasks>

<verification>
1. Run: `grep -n "credentials.*include" services/paymentApi.ts` - should show 5 occurrences
2. Run: `npm run build` - build should pass
3. Verify all 3 functions have credentials added (fetchPaymentsForProject, fetchPaymentsForProposal, markPaymentAsPaid)
</verification>

<success_criteria>
- All 3 fetch calls in services/paymentApi.ts include `credentials: 'include'`
- Build passes without errors
- No regressions in existing functionality
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-13-credential-wiring/PROD-13-03-SUMMARY.md`
</output>
