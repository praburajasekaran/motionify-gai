---
title: "Missing Zod Schema Fields and PUT Handler Whitelist for Proposal Revisions"
date: 2026-02-26
category: logic-errors
tags:
  - data-loss
  - schema-validation
  - api-handler
  - silent-failure
  - field-mapping
  - zod
severity: high
module: proposals
symptoms:
  - "Frontend proposal updates with revisionsDescription field are silently dropped"
  - "Zod schema strips revisionsIncluded and revisionsDescription during validation"
  - "PUT handler missing revisions_description in allowedFields and fieldMapping"
  - "proposal-detail.ts endpoint accepts the field but proposals.ts endpoint drops it"
root_cause: |
  Three-layer validation gap: revisionsIncluded and revisionsDescription were not in the
  Zod schemas (causing Zod to strip them), not in the fieldMapping (preventing camelCase
  to snake_case conversion), and not in allowedFields (preventing DB update). The separate
  proposal-detail.ts endpoint had the field, making the inconsistency harder to spot.
---

# Missing Proposal Revisions Fields — Silent Data Loss on Update

## Problem

When updating a proposal via the `PUT /proposals/{id}` endpoint, the `revisionsDescription` field was silently dropped. The data appeared to save (200 response) but the `revisions_description` column was never updated in the database.

This is the **4th instance** of the field-mapping mismatch pattern in this codebase.

## Root Cause

Three cascading validation layers each independently blocked the field:

```
Frontend sends: { revisionsDescription: "Max 5 revisions" }
       ↓
  Zod Schema → STRIPPED (field not in schema, unknown fields removed)
       ↓
  fieldMapping → NOT CONVERTED (no revisionsDescription → revisions_description entry)
       ↓
  allowedFields → BLOCKED (revisions_description not whitelisted)
       ↓
  Database → NEVER UPDATED (silent 200 response, no error)
```

**Why it was hard to detect:** The `proposal-detail.ts` endpoint (a separate file) already had `revisions_description` in its allowedFields, so updates via that endpoint worked correctly. Only the main `proposals.ts` PUT handler was broken.

## Investigation

Found during a systematic audit of 6 recurring bug patterns from 11 previously documented issues. The "field name mismatch" pattern is the #2 most common bug in this codebase (now 4 instances).

Of 10 potential issues identified during the audit, 9 were ruled out after deep investigation:
- Deliverable file fields — frontend already sends snake_case
- Auth on GET endpoints — admin endpoints, public views use separate endpoints
- CreateProject.tsx — UI prototype needing design work
- NotificationContext — ephemeral by design, DB notifications are server-side

## Solution

Three changes across two files:

### 1. Zod Schemas (`netlify/functions/_shared/schemas.ts`)

Added to both `createProposalSchema` and `updateProposalSchema`:

```typescript
revisionsIncluded: z.number().int().min(0).max(100).optional(),
revisionsDescription: z.string().max(2000).optional(),
```

### 2. allowedFields (`netlify/functions/proposals.ts`)

```typescript
const allowedFields = [
  'description', 'deliverables', 'currency', 'total_price',
  'advance_percentage', 'advance_amount', 'balance_amount',
  'status', 'feedback', 'version', 'edit_history', 'revisions_included',
  'revisions_description'  // Added
];
```

### 3. fieldMapping (`netlify/functions/proposals.ts`)

```typescript
const fieldMapping: Record<string, string> = {
  totalPrice: 'total_price',
  advancePercentage: 'advance_percentage',
  advanceAmount: 'advance_amount',
  balanceAmount: 'balance_amount',
  editHistory: 'edit_history',
  revisionsIncluded: 'revisions_included',
  revisionsDescription: 'revisions_description',  // Added
  acceptedAt: 'accepted_at',
  rejectedAt: 'rejected_at',
};
```

## Files Modified

- `netlify/functions/_shared/schemas.ts` — Zod schema validation rules
- `netlify/functions/proposals.ts` — Handler field mapping and allowlist

## Verification

1. Send PUT to `/proposals/{id}` with `{ revisionsDescription: "test" }` — field should persist
2. Query `SELECT revisions_description FROM proposals WHERE id = '{id}'` — should show updated value
3. Compare `proposals.ts` and `proposal-detail.ts` allowedFields — should now be consistent

## Prevention

See: [Field Mapping Prevention Checklist](../best-practices/field-mapping-prevention-and-checklist-20260226.md)

**New Field Checklist** (abbreviated):
1. Add to Zod schema (both create and update)
2. Add to fieldMapping (camelCase → snake_case)
3. Add to allowedFields (snake_case)
4. Verify DB column exists
5. Check ALL endpoints that handle the same entity (not just one)

## Related Issues

- [API Field Name Mismatch — Task Data Loss](../integration-issues/api-field-name-mismatch-task-data-loss.md) — same pattern with `assignedTo`/`dueDate`
- [Client Missing Actions After Resend](../integration-issues/client-missing-actions-after-admin-resend.md) — `version` field dropped, same root cause
- [Revision Quota Mismatch](../logic-errors/revision-quota-mismatch-proposal-vs-dashboard.md) — `revisions_included` omitted from INSERT
- [Payments Crash — Response Format Mismatch](../runtime-errors/payments-crash-response-format-mismatch-Payments-20260226.md) — snake_case mapping gap
