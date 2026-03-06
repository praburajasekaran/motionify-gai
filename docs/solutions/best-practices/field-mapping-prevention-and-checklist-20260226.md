---
title: "Field Mapping Prevention Strategy — Preventing Silent Data Loss from Field Name Mismatches"
date: 2026-02-26
category: best-practices
tags:
  - field-mapping
  - data-persistence
  - zod-schema
  - allowedFields
  - api-contract
  - prevention-strategy
  - proposal
  - task
  - project
  - recurring-bug-pattern
severity: critical
problem_pattern: "Field name mismatch (3+ occurrences — #2 most common bug in codebase)"
---

# Field Mapping Prevention Strategy

## Problem Summary

The **field name mismatch** pattern is the 2nd most common bug in this codebase (3+ documented occurrences + current `revisions_description` issue). Fields are silently dropped at multiple stages:

1. **Zod schema** strips unknown fields
2. **fieldMapping** doesn't convert camelCase → snake_case
3. **allowedFields whitelist** doesn't include the field
4. **Field propagation** breaks between DB columns, backend responses, and frontend types

**Result**: Data is silently lost. No errors. No warnings. User sees their changes disappear.

---

## Related Documented Issues

### 1. **API Field Name Mismatch Causes Task Data Loss**
- **File**: `docs/solutions/integration-issues/api-field-name-mismatch-task-data-loss.md`
- **Date**: 2026-01-30
- **Problem**: Task assignee and due date silently dropped on page refresh
- **Root Causes**:
  - Frontend `Task` type used `assigneeId` + `deadline`, but backend returned `assignedTo` + `dueDate`
  - `allowedFields` array listed `'deadline'` but Zod schema output `'dueDate'`
  - No mapping function between camelCase and snake_case
- **Severity**: HIGH — data was silently lost
- **Affected Fields**: `assignedTo`/`assigneeId`, `dueDate`/`deadline`

### 2. **Task Assignee Lost After Inline Edit Save**
- **File**: `docs/solutions/ui-bugs/task-assignee-lost-after-inline-edit-save.md`
- **Date**: 2026-01-30
- **Problem**: Assignee appeared briefly then reverted, even before page refresh
- **Root Cause**: API response merge overwrote local state with incomplete data (no User objects, missing assigneeId)
- **Severity**: MEDIUM — user-visible but temporary
- **Related**: Compounded by the field name mismatch above

### 3. **Client Missing Approve/Reject Buttons After Admin Resends (Proposal)**
- **File**: `docs/solutions/integration-issues/client-missing-actions-after-admin-resend.md`
- **Date**: 2026-02-02
- **Problem**: `version` field silently dropped when proposal was updated
- **Root Causes**:
  - `lib/proposals.ts:updateProposal()` had no mapping for `version` field
  - `netlify/functions/proposal-detail.ts` didn't whitelist `version` in `allowedFields`
  - Dual data store (PostgreSQL vs JSON files) not synced
- **Severity**: CRITICAL — client couldn't approve revised proposal
- **Affected Fields**: `version`, also `revisions_included` (implied)

### 4. **Revision Count Discrepancy — Proposal vs Dashboard**
- **File**: `docs/solutions/logic-errors/revision-quota-mismatch-proposal-vs-dashboard.md`
- **Date**: 2026-02-02
- **Problem**: Proposal said 2 revisions but dashboard showed 3
- **Root Cause**: `revisions_included` not passed to project creation INSERT (silently used database default)
- **Severity**: HIGH — quota mismatch
- **Data Loss**: Proposal term not propagated to project record
- **Related**: Same session as #3 — both proposal-related field drops

### 5. **Payments Crash — Response Format Mismatch**
- **File**: `docs/solutions/runtime-errors/payments-crash-response-format-mismatch-Payments-20260226.md`
- **Date**: 2026-02-26
- **Problem**: Frontend expected `response.payments` but backend returned raw array, plus `createdAt` was actually `created_at`
- **Root Cause**: No field mapping between snake_case (database) and camelCase (API response)
- **Severity**: HIGH — runtime crash, 500 error page
- **Affected Fields**: `created_at`/`createdAt` (plus all other snake_case columns not mapped)

### 6. **Current Issue: Proposal `revisions_description` Silently Dropped**
- **Pattern**: Exact same as #3 and #1
- **Problem**:
  - Zod schema doesn't include the field → stripped as unknown
  - fieldMapping doesn't convert camelCase to snake_case → not sent to API
  - allowedFields doesn't whitelist the DB column → dropped by backend
- **Result**: Admin updates revisions_description, changes disappear on page refresh
- **Files Affected**: `lib/proposals.ts`, `netlify/functions/proposal-detail.ts`

---

## Pattern Analysis

### The Three-Layer Vulnerability

Every field flowing from frontend → backend → database must survive three checkpoints:

```
Frontend (camelCase)   →  Backend (JSON)  →  Database (snake_case)
↓
TypeScript type
(e.g., `revisions_description`)
↓
No mapping?
↓
Zod schema
(e.g., z.object({ revisionsDescription: z.string() }))
↓
Unknown field stripped!
↓
fieldMapping
(e.g., `if (updates.revisionsDescription) snakeCaseUpdates.revisions_description = ...`)
↓
No mapping?
↓
allowedFields whitelist
(e.g., ['description', 'version', 'revisions_description'])
↓
Not whitelisted?
↓
Database UPDATE silently skips the field
```

**At EACH layer, missing the field causes silent loss.**

### Why Silent Loss is Dangerous

1. **No console errors** — Zod silently drops unknown fields (by design)
2. **No API errors** — `allowedFields` silently ignores fields (by design)
3. **UI looks successful** — Toast says "Saved ✓", then changes vanish on refresh
4. **User thinks they lost data** — Creates support tickets, data integrity questions
5. **Hard to trace** — Must follow three separate codebases (frontend type, Zod schema, backend API)

---

## Prevention Strategies

### Strategy 1: Use Runtime Validation (Zod)

**Problem**: Zod's default `.passthrough()` behavior still strips unknown fields in `.object()` mode.

**Solution**: Configure schema to be **more permissive** during parsing, then validate output:

```typescript
// BEFORE (loses fields silently)
const updateProposalSchema = z.object({
  description: z.string().optional(),
  version: z.number().optional(),
  // revisions_description NOT HERE → silently dropped
}).strict(); // or default: strips unknown

// AFTER (explicitly handles edge cases)
const updateProposalSchema = z.object({
  description: z.string().optional(),
  version: z.number().optional(),
  revisionsDescription: z.string().optional(),  // NOW INCLUDED
}).passthrough(); // or: don't exclude unknown fields at parse time
```

### Strategy 2: Always Include Field Mapping

**Rule**: If a field is in the TypeScript type, it MUST be in the field mapping.

```typescript
// BEFORE (breaks for any field not listed)
const snakeCaseUpdates: Record<string, unknown> = {};
if (updates.description !== undefined) snakeCaseUpdates.description = updates.description;
if (updates.version !== undefined) snakeCaseUpdates.version = updates.version;
// Missing revisionsDescription!

// AFTER (explicit, exhaustive)
const fieldMapping = {
  description: 'description',
  version: 'version',
  revisionsDescription: 'revisions_description',  // NOW EXPLICIT
  feedback: 'feedback',
  status: 'status',
};

for (const [camelKey, snakeKey] of Object.entries(fieldMapping)) {
  if (updates[camelKey] !== undefined) {
    snakeCaseUpdates[snakeKey] = updates[camelKey];
  }
}
```

Better: **Generate mapping from type**:

```typescript
// Define type once
export interface ProposalUpdate {
  description?: string;
  version?: number;
  revisionsDescription?: string;
  feedback?: string;
  status?: ProposalStatus;
}

// Generate mapping to catch omissions at compile time
const PROPOSAL_FIELD_MAPPING: Record<keyof ProposalUpdate, string> = {
  description: 'description',
  version: 'version',
  revisionsDescription: 'revisions_description',
  feedback: 'feedback',
  status: 'status',
};

// TS will error if you forget a field in the mapping
```

### Strategy 3: Synchronize allowedFields to Zod Schema

**Rule**: `allowedFields` must match Zod schema **output keys** (camelCase), not database column names.

```typescript
// BEFORE (allowedFields mismatches Zod output)
const updateProposalSchema = z.object({
  description: z.string().optional(),
  version: z.number().optional(),
  revisionsDescription: z.string().optional(),  // ← Zod outputs this
});

const allowedFields = ['description', 'version', 'revisions_description'];  // ← Expects snake_case!
// MISMATCH: Zod gives 'revisionsDescription', allowedFields checks for 'revisions_description'

// AFTER (both use camelCase — Zod output)
const allowedFields = ['description', 'version', 'revisionsDescription'];  // ← Matches Zod
```

### Strategy 4: Generate allowedFields from Schema

**Automate synchronization** to catch drifts:

```typescript
// Extract keys from schema
function getSchemaKeys(schema: z.ZodObject<any>): string[] {
  return Object.keys(schema.shape);
}

// At validation time, use:
const allowedFields = getSchemaKeys(updateProposalSchema);
// ['description', 'version', 'revisionsDescription']

// Then map to snake_case for DB:
const snakeCased = allowedFields.map(key => PROPOSAL_FIELD_MAPPING[key]);
// ['description', 'version', 'revisions_description']
```

### Strategy 5: Whitelist at the Point of Use

**Don't filter allowedFields before mapping.** Validate at the SQL step:

```typescript
// BEFORE (early filtering, easy to skip fields)
const filtered = Object.fromEntries(
  Object.entries(snakeCaseUpdates).filter(([key]) => allowedFields.includes(key))
);

// AFTER (map everything, validate at SQL time)
const updateClauses = Object.entries(PROPOSAL_FIELD_MAPPING)
  .filter(([_, snakeKey]) => snakeCaseUpdates[snakeKey] !== undefined)
  .map(([_, snakeKey]) => `${snakeKey} = $${paramIndex++}`)
  .join(', ');

// If someone adds a field to PROPOSAL_FIELD_MAPPING but not to PROPOSAL_FIELD_MAPPING,
// TypeScript errors immediately (at compile time)
```

---

## New Field Checklist

**When adding a new field to an API endpoint that updates database records**, use this checklist to prevent silent data loss:

### Checklist Items

- [ ] **1. Add field to TypeScript interface/type**
  - Location: `services/proposalApi.ts` or equivalent
  - Example: `revisionsDescription?: string;`

- [ ] **2. Add field to Zod schema**
  - Location: `netlify/functions/_shared/schemas.ts` or equivalent
  - Example: `revisionsDescription: z.string().optional(),`
  - Verify schema uses camelCase (matches TypeScript type)

- [ ] **3. Add field to fieldMapping object**
  - Location: `lib/proposals.ts` or `services/proposalApi.ts`
  - Example: `revisionsDescription: 'revisions_description',`
  - Verify mapping converts camelCase → snake_case

- [ ] **4. Add field to allowedFields whitelist**
  - Location: `netlify/functions/proposal-detail.ts` or equivalent
  - Example: Add `'revisionsDescription'` to `const allowedFields = [...];`
  - **CRITICAL**: Use camelCase (Zod output keys), not snake_case!

- [ ] **5. Verify allowedFields matches Zod schema keys**
  - Run: `Object.keys(updateProposalSchema.shape)` in console
  - Compare to `allowedFields` array — should match
  - If they don't match, the field will be silently dropped

- [ ] **6. Add database column if not already present**
  - Location: `migrations/` or create new migration
  - Example: `ALTER TABLE proposals ADD COLUMN revisions_description TEXT;`
  - Verify column name matches fieldMapping values (snake_case)

- [ ] **7. Add field to database INSERT statement (if creating new records)**
  - Location: Same Netlify function file
  - Verify field is passed to `INSERT INTO ... (revisions_description, ...) VALUES ($n, ...)`

- [ ] **8. Test the field end-to-end**
  - Create/update a record with the new field
  - Reload page
  - Verify field value persists
  - Check database directly: `SELECT revisions_description FROM proposals WHERE id = '...';`
  - Verify in admin panel if applicable

- [ ] **9. Test clearing/nullifying the field**
  - Update the field to empty string or null
  - Verify it clears in the UI and database
  - (Not a truthy check: use `!== undefined` to allow empty values)

- [ ] **10. Add a comment linking to this checklist**
  ```typescript
  // FIELD MAPPING CHECKLIST (see: docs/solutions/best-practices/field-mapping-prevention-and-checklist-20260226.md)
  // Added revisions_description in TypeScript type, Zod schema, fieldMapping, allowedFields, migration
  revisionsDescription: z.string().optional(),
  ```

---

## Testing Approach

### Test 1: Schema Output Validation

```typescript
// In test file or console
const testInput = {
  description: 'Test description',
  version: 1,
  revisionsDescription: 'Test revisions',
};

const parsed = updateProposalSchema.parse(testInput);
console.log(Object.keys(parsed));
// Should print: ['description', 'version', 'revisionsDescription']

// Verify each key is in allowedFields
const schemaKeys = Object.keys(parsed);
const missingFromAllowed = schemaKeys.filter(k => !allowedFields.includes(k));
console.assert(missingFromAllowed.length === 0, `Missing from allowedFields: ${missingFromAllowed}`);
```

### Test 2: Field Mapping Coverage

```typescript
// Verify every field in the schema maps to a database column
const schemaKeys = Object.keys(updateProposalSchema.shape);
const mappedKeys = Object.keys(PROPOSAL_FIELD_MAPPING);

const unmapped = schemaKeys.filter(k => !mappedKeys.includes(k));
console.assert(unmapped.length === 0, `Unmapped fields: ${unmapped}`);
```

### Test 3: Round-Trip Update

```typescript
// 1. Create a test proposal
const proposal = await createProposal({ ..., revisionsDescription: 'Original' });

// 2. Update it
await updateProposal(proposal.id, { revisionsDescription: 'Updated' });

// 3. Fetch and verify
const updated = await fetchProposal(proposal.id);
console.assert(updated.revisionsDescription === 'Updated', 'Field not persisted!');

// 4. Check database directly
const dbRow = await db.query('SELECT revisions_description FROM proposals WHERE id = $1', [proposal.id]);
console.assert(dbRow.rows[0].revisions_description === 'Updated', 'Not in database!');
```

### Test 4: Null/Empty String Handling

```typescript
// Update to empty string
await updateProposal(proposal.id, { revisionsDescription: '' });
const cleared = await fetchProposal(proposal.id);
console.assert(cleared.revisionsDescription === '', 'Empty string not preserved!');

// Update to null
await updateProposal(proposal.id, { revisionsDescription: null });
const nulled = await fetchProposal(proposal.id);
console.assert(nulled.revisionsDescription === null, 'Null not handled!');
```

---

## Code Review Checklist

When reviewing code that adds or modifies fields, check:

1. **Type definition**: Does the TypeScript interface include the field?
2. **Zod schema**: Is the field in the schema with correct type?
3. **Field mapping**: Is there a mapping from camelCase to snake_case?
4. **allowedFields**: Is the field in the whitelist (camelCase)?
5. **Database**: Does the SQL include the field in INSERT/UPDATE?
6. **Test**: Did the author test round-trip persistence?

**Red flags** (reject PR until fixed):
- allowedFields using snake_case but Zod outputting camelCase
- No field mapping for a new camelCase field
- fieldMapping missing from the allowedFields array
- Test doesn't verify database persistence (page refresh test)
- "Couldn't get to it in time" / "Skipped the field for now"

---

## Summary Table: Previous Occurrences

| Occurrence | Affected Field | File | Root Cause | Data Loss |
|---|---|---|---|---|
| 1. Tasks | `assignedTo`/`dueDate` | `netlify/functions/tasks.ts` | allowedFields used `'deadline'` but Zod output `'dueDate'` | HIGH — assignee/deadline disappeared |
| 2. Tasks | `assignee` User object | `pages/ProjectDetail.tsx` | API response merged without preserving User objects | MEDIUM — UI loss (DB was OK) |
| 3. Proposals | `version` | `netlify/functions/proposal-detail.ts` | No mapping + not in allowedFields | CRITICAL — client couldn't approve |
| 4. Proposals | `revisions_included` | `netlify/functions/payments.ts` | Not passed to INSERT (used default) | HIGH — quota mismatch |
| 5. Payments | `created_at` | `netlify/functions/payments.ts` | No camelCase mapping in response | HIGH — runtime crash |
| 6. Proposals | `revisions_description` | `netlify/functions/proposal-detail.ts` | No mapping + not in allowedFields | HIGH — description lost |

---

## Related Documentation

- `docs/solutions/integration-issues/api-field-name-mismatch-task-data-loss.md` — #1 detailed analysis
- `docs/solutions/ui-bugs/task-assignee-lost-after-inline-edit-save.md` — #2 detailed analysis
- `docs/solutions/integration-issues/client-missing-actions-after-admin-resend.md` — #3 detailed analysis
- `docs/solutions/logic-errors/revision-quota-mismatch-proposal-vs-dashboard.md` — #4 detailed analysis
- `docs/solutions/runtime-errors/payments-crash-response-format-mismatch-Payments-20260226.md` — #5 detailed analysis

---

## Actionable Next Steps

1. **Immediate**: Implement `revisions_description` fix (current issue)
2. **Short-term**: Audit all `updateProposal()` calls to align fieldMapping ↔ allowedFields
3. **Medium-term**: Implement typed field mapping generator (Strategy 4) to prevent future drifts
4. **Long-term**: Add E2E tests for every field in every update endpoint (verify DB persistence)

