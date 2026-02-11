---
title: "Revision count discrepancy — proposal says 2 revisions but dashboard shows 3"
date: 2026-02-02
category: logic-errors
module: projects
tags:
  - revision-quota
  - project-creation
  - deliverable-context
  - hardcoded-defaults
  - data-propagation
symptoms:
  - Project dashboard shows 3 revisions allowed when proposal specified 2
  - Revision quota does not match what client agreed to in proposal
  - Changing total_revisions_allowed in database has no visible effect
files_modified:
  - netlify/functions/payments.ts
  - netlify/functions/projects.ts
  - components/deliverables/DeliverableContext.tsx
severity: high
---

## Problem

The proposal's "Project Terms" section shows "2 revisions included" but the project dashboard's `RevisionQuotaIndicator` displays "3 Revisions Remaining — 0 of 3 included revisions used". The revision count the client agreed to in the proposal is not carried over to the project.

## Root Causes

### 1. Project creation omits total_revisions_allowed

Both project creation paths (`netlify/functions/payments.ts` and `netlify/functions/projects.ts`) INSERT INTO projects without `total_revisions_allowed`:

```sql
-- Before (broken)
INSERT INTO projects (
  project_number, inquiry_id, proposal_id, client_user_id, status
) VALUES ($1, $2, $3, $4, 'active')
```

The proposal's `revisions_included` value was never passed to the project, so the column used whatever database default was set (3).

### 2. DeliverableContext uses hardcoded default, ignores project data

`components/deliverables/DeliverableContext.tsx` defined:

```typescript
const DEFAULT_REVISION_QUOTA: RevisionQuota = {
  total: 3,   // Hardcoded!
  used: 0,
  remaining: 3,
};
```

The comment said "Will be overwritten by project data from API" but no code ever did this. The `DeliverableProvider` received `currentProject` as a prop (with correct `maxRevisions` from the API) but never dispatched it to the reducer state.

## Solution

### Fix 1: Pass revisions_included to project creation

Updated all 3 INSERT statements (2 in `payments.ts`, 1 in `projects.ts`):

```sql
INSERT INTO projects (
  project_number, inquiry_id, proposal_id, client_user_id, status, total_revisions_allowed
) VALUES ($1, $2, $3, $4, 'active', $5)
```

With parameter: `proposal.revisions_included ?? 2`

### Fix 2: Sync quota from project data in DeliverableContext

Added `SET_QUOTA` action to the reducer:

```typescript
type DeliverableAction =
  | { type: 'SET_DELIVERABLES'; deliverables: Deliverable[] }
  | { type: 'SET_QUOTA'; quota: RevisionQuota }
  // ...

case 'SET_QUOTA':
  return { ...state, quota: action.quota };
```

Added useEffect to sync from the project prop:

```typescript
useEffect(() => {
  if (currentProject) {
    const total = currentProject.maxRevisions ?? 2;
    const used = currentProject.revisionCount ?? 0;
    dispatch({
      type: 'SET_QUOTA',
      quota: { total, used, remaining: total - used },
    });
  }
}, [currentProject?.maxRevisions, currentProject?.revisionCount]);
```

### Fix existing projects

For projects already created with the wrong value, run:

```sql
UPDATE projects
SET total_revisions_allowed = (
  SELECT revisions_included FROM proposals WHERE id = projects.proposal_id
)
WHERE total_revisions_allowed != (
  SELECT revisions_included FROM proposals WHERE id = projects.proposal_id
);
```

## Prevention

1. **When creating a record from another record**, explicitly list all fields that should carry over. Don't rely on database defaults matching the source record's values.

2. **Hardcoded defaults that say "will be overwritten" are a code smell.** If a value should come from an API, initialize it as `null` or a loading state — not a plausible-looking number that masks the bug. A default of `{ total: 3 }` looks correct enough that nobody notices it's wrong.

3. **Data propagation chain to verify**: proposal `revisions_included` -> project `total_revisions_allowed` -> API response -> `Project.maxRevisions` -> `DeliverableContext.quota.total` -> `RevisionQuotaIndicator`. Any break in this chain produces a silent mismatch.

## Related

- `docs/solutions/logic-errors/task-visibility-hardcoded-false-for-clients.md` — Same pattern: hardcoded default masking missing data propagation
- `docs/solutions/integration-issues/client-missing-actions-after-admin-resend.md` — Fixed in the same session, related proposal workflow issues
