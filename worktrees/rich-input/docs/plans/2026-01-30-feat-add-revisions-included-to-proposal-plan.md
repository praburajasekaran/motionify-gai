---
title: Add "Revisions Included" field to Proposal
type: feat
date: 2026-01-30
---

# feat: Add "Revisions Included" field to Proposal

## Overview

The proposal creation/editing screen is missing a critical piece of information: the number of revisions included in the project. Currently, revisions are only tracked at the **project** level (`projects.total_revisions_allowed`, default 2), but the client never sees this number during the proposal stage. The admin should set this value when creating the proposal, the client should see it when reviewing the proposal, and it should flow through to the project when created after payment.

## Problem Statement

- The admin creates a proposal but cannot specify how many revisions are included
- The client accepts a proposal without knowing how many revisions they'll get
- When a project is created from payment, `total_revisions_allowed` is hardcoded to `2` (`create-from-payment/route.ts:86`)
- There's a disconnect: the project may promise different revision counts per client, but there's no way to set it

## Proposed Solution

Add a `revisions_included` field to the **proposals** table and thread it through the full proposal lifecycle:

1. **Database** - Add `revisions_included INTEGER NOT NULL DEFAULT 2` to `proposals` table
2. **Backend API** - Accept and persist `revisionsIncluded` in create/update endpoints
3. **Admin UI (ProposalBuilder)** - Add a number input for revisions included
4. **Admin UI (ProposalDetail)** - Show/edit revisions included in view and edit modes
5. **Client UI (ProposalReview)** - Display revisions included to the client
6. **Project creation** - Use proposal's `revisions_included` instead of hardcoded `2`
7. **Contracts/Types** - Update Zod schemas and TypeScript types

## Technical Approach

### Files to modify

| File | Change |
|------|--------|
| `database/schema.sql` | Add `revisions_included INTEGER NOT NULL DEFAULT 2` to proposals table (line ~90) |
| New migration file | `database/migrations/011_add_revisions_included_to_proposals.sql` |
| `shared/contracts/proposal.contract.ts` | Add `revisionsIncluded` to `ProposalSchema` and `CreateProposalDtoSchema` |
| `landing-page-new/src/lib/proposals.ts` | Add `revisionsIncluded` to `Proposal` interface |
| `netlify/functions/proposals.ts` | Add `revisionsIncluded`/`revisions_included` to `CreateProposalPayload`, field mapping, and INSERT/UPDATE queries |
| `pages/admin/ProposalBuilder.tsx` | Add state + UI for revisions included input |
| `pages/admin/ProposalDetail.tsx` | Add view + edit mode for revisions included |
| `landing-page-new/src/components/proposal/ProposalReview.tsx` | Display revisions included to client |
| `landing-page-new/src/app/api/projects/create-from-payment/route.ts` | Read `revisions_included` from proposal instead of hardcoded `2` |

### Implementation Details

#### 1. Database Migration (`database/migrations/011_add_revisions_included_to_proposals.sql`)

```sql
ALTER TABLE proposals
  ADD COLUMN revisions_included INTEGER NOT NULL DEFAULT 2;
```

#### 2. Zod Schema (`shared/contracts/proposal.contract.ts`)

Add to `ProposalSchema`:
```ts
revisionsIncluded: z.number().int().min(0).max(20),
```

Add to `CreateProposalDtoSchema` picks or extend:
```ts
revisionsIncluded: z.number().int().min(0).max(20),
```

#### 3. Backend - Create Proposal (`netlify/functions/proposals.ts`)

- Add `revisionsIncluded` to `CreateProposalPayload` interface
- Add `revisions_included` to the INSERT query columns/values
- Add `revisionsIncluded: 'revisions_included'` to `fieldMapping` in PUT handler
- Add `'revisions_included'` to `allowedFields` in PUT handler

#### 4. Admin UI - ProposalBuilder (`pages/admin/ProposalBuilder.tsx`)

- Add state: `const [revisionsIncluded, setRevisionsIncluded] = useState<number>(2);`
- Add UI: a simple number input in a new section between Deliverables and Pricing, or within the Pricing section as a "Project Terms" sub-section
- Pass `revisionsIncluded` to `createProposal()` call
- **Placement**: Add as a new card section titled "Project Terms" between Deliverables and Pricing, containing the revisions input. This matches the logical flow: describe work -> define terms -> set price.

```tsx
{/* Project Terms */}
<div className="bg-white rounded-xl p-6 ring-1 ring-gray-200 shadow-sm">
  <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Terms</h2>
  <div>
    <label className="block text-sm font-medium text-gray-900 mb-2">
      Revisions Included
    </label>
    <p className="text-xs text-gray-600 mb-3">
      Number of revision rounds included in this project
    </p>
    <input
      type="number"
      min="0"
      max="20"
      value={revisionsIncluded}
      onChange={(e) => setRevisionsIncluded(parseInt(e.target.value) || 0)}
      className="w-24 px-3 py-2 ..."
    />
  </div>
</div>
```

#### 5. Admin UI - ProposalDetail (`pages/admin/ProposalDetail.tsx`)

- **View mode**: Show `proposal.revisionsIncluded` (or snake_case from API) in a "Project Terms" section
- **Edit mode**: Same input as ProposalBuilder
- Include in `handleSaveChanges` payload

#### 6. Client UI - ProposalReview (`landing-page-new/src/components/proposal/ProposalReview.tsx`)

Display between Deliverables and Pricing sections:

```tsx
{/* Project Terms */}
<div className="mb-8">
  <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Terms</h2>
  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
    <div className="flex items-center gap-3">
      <RotateCcw className="w-5 h-5 text-violet-600" />
      <div>
        <p className="text-sm text-gray-600">Revisions Included</p>
        <p className="text-gray-900 font-semibold">
          {proposal.revisionsIncluded} revision{proposal.revisionsIncluded !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  </div>
</div>
```

#### 7. Project Creation (`create-from-payment/route.ts`)

Replace hardcoded `2` with the proposal's value:

```ts
// Before:
2, // Default 2 revisions

// After:
proposal.revisionsIncluded ?? 2, // Use proposal value, fallback to 2
```

This requires the proposal fetch query in `create-from-payment` to include the `revisions_included` column (it likely already returns `*` or `SELECT` from proposals).

## Acceptance Criteria

- [x] Admin can set number of revisions (0-20) when creating a proposal (defaults to 2)
- [x] Admin can edit revisions included on an existing proposal (in edit mode)
- [x] Client can see the number of revisions included when reviewing a proposal
- [x] When a project is created from payment, it uses the proposal's revision count (not hardcoded 2)
- [x] Existing proposals without the field default to 2 revisions
- [ ] Zod schema validates `revisionsIncluded` as integer between 0 and 20
- [x] Database migration runs cleanly on existing data

## References

- Proposal creation UI: `pages/admin/ProposalBuilder.tsx`
- Proposal detail/edit UI: `pages/admin/ProposalDetail.tsx`
- Client proposal view: `landing-page-new/src/components/proposal/ProposalReview.tsx`
- API: `netlify/functions/proposals.ts`
- Contracts: `shared/contracts/proposal.contract.ts`
- Project creation: `landing-page-new/src/app/api/projects/create-from-payment/route.ts:86`
- DB schema: `database/schema.sql:67-98`
- Existing revision tracking: `database/schema.sql:116-117` (projects table)
- Pending feature spec: `features/pending/inquiry-to-project/04-database-schema.sql:161`
