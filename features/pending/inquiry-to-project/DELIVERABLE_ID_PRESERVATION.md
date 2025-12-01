# Deliverable ID Preservation Flow

This document explains how deliverable IDs are generated and preserved throughout the inquiry-to-project conversion flow. Maintaining consistent IDs is critical for data integrity and user experience.

---

## Why ID Preservation Matters

1. **User Experience:** Customer sees deliverables in proposal, same IDs in terms, same IDs in project
2. **Referential Integrity:** Comments, approvals, files reference deliverable IDs
3. **Audit Trail:** Can trace deliverable from proposal through project lifecycle
4. **Terms Acceptance:** Customer accepts specific deliverables with specific IDs

---

## ID Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 1: Proposal Creation (Admin)                             │
├─────────────────────────────────────────────────────────────────┤
│ Admin creates proposal with deliverables                        │
│ System generates UUIDs for each deliverable                     │
│                                                                  │
│ deliverable_1_id = gen_random_uuid()  ← ID GENERATED HERE       │
│ deliverable_2_id = gen_random_uuid()  ← ID GENERATED HERE       │
│                                                                  │
│ Stored in: proposals.deliverables (JSONB array)                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ Customer accepts proposal
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 2: Project Terms Creation (Automatic)                    │
├─────────────────────────────────────────────────────────────────┤
│ System copies deliverables from proposal to terms              │
│ IDs are PRESERVED (not regenerated)                            │
│                                                                  │
│ deliverable_1_id (same as above)  ← ID PRESERVED                │
│ deliverable_2_id (same as above)  ← ID PRESERVED                │
│                                                                  │
│ Stored in: project_terms.content.deliverables (JSONB)          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ Customer completes payment
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 3: Project Conversion (Automatic)                        │
├─────────────────────────────────────────────────────────────────┤
│ System creates actual deliverables table records               │
│ IDs are PRESERVED from proposal/terms (not regenerated)        │
│                                                                  │
│ INSERT INTO deliverables (id, ...)                             │
│ VALUES (deliverable_1_id, ...)  ← ID PRESERVED AS PK           │
│                                                                  │
│ Stored in: deliverables table (relational)                     │
└─────────────────────────────────────────────────────────────────┘

RESULT: Same deliverable ID from proposal → terms → project
```

---

## Detailed Flow

### Stage 1: Proposal Creation

**When:** Admin sends proposal to customer

**Who Generates IDs:** Backend API (during proposal creation)

**Code:**
```typescript
async function createProposal(inquiryId: string, data: ProposalInput) {
  // Generate UUID for each deliverable
  const deliverablesWithIds = data.deliverables.map(d => ({
    id: randomUUID(),  // ← GENERATE ID HERE
    name: d.name,
    description: d.description,
    format: d.format,
    estimatedCompletionWeek: d.estimatedCompletionWeek
  }));

  // Store in JSONB
  await db.proposals.create({
    data: {
      inquiryId,
      totalPrice: data.totalPrice,
      currency: data.currency,
      deliverables: deliverablesWithIds,  // ← IDs stored in JSONB
      status: 'sent'
    }
  });

  return deliverablesWithIds;
}
```

**Database:**
```sql
INSERT INTO proposals (
  id, inquiry_id, deliverables
) VALUES (
  gen_random_uuid(),
  :inquiry_id,
  '[
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",  ← GENERATED
      "name": "Product Explainer Video",
      "description": "60-second explainer",
      "format": "MP4, 1080p",
      "estimatedCompletionWeek": 6
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",  ← GENERATED
      "name": "Social Media Cuts",
      "description": "30-second cuts",
      "format": "MP4, vertical",
      "estimatedCompletionWeek": 7
    }
  ]'::jsonb
);
```

**Result:** Deliverable IDs exist in `proposals.deliverables` JSONB

---

### Stage 2: Project Terms Creation

**When:** Customer accepts proposal

**Who Uses IDs:** System copies from proposal (IDs not regenerated)

**Code:**
```typescript
async function createProjectTermsFromProposal(proposalId: string) {
  // Get proposal with deliverables
  const proposal = await db.proposals.findUnique({
    where: { id: proposalId }
  });

  // Extract deliverables from proposal JSONB
  const deliverables = proposal.deliverables;  // ← USE EXISTING IDs

  // Create project terms with same deliverable IDs
  await db.projectTerms.create({
    data: {
      projectId: tempProjectId,  // Temporary until conversion
      termsType: 'initial',
      content: {
        projectName: proposal.companyName,
        totalCost: proposal.totalPrice,
        currency: proposal.currency,
        deliverables: deliverables,  // ← PRESERVE IDs
        // ... other terms content
      }
    }
  });

  return deliverables;
}
```

**Database:**
```sql
INSERT INTO project_terms (
  id, project_id, terms_type, content
) VALUES (
  gen_random_uuid(),
  :temp_project_id,
  'initial',
  jsonb_build_object(
    'deliverables', (
      SELECT deliverables FROM proposals WHERE id = :proposal_id
    )  -- ← COPY JSONB directly, IDs preserved
  )
);
```

**Verification:**
```sql
-- Verify IDs match between proposal and terms
SELECT
  p.deliverables as proposal_deliverables,
  pt.content->'deliverables' as terms_deliverables
FROM proposals p
JOIN project_terms pt ON pt.project_id = :project_id
WHERE p.id = :proposal_id;

-- Should show identical ID arrays
```

**Result:** Same deliverable IDs now in `project_terms.content.deliverables`

---

### Stage 3: Project Conversion (Creating Deliverables Table Records)

**When:** Customer completes payment, system converts inquiry to project

**Who Uses IDs:** System uses IDs from terms/proposal as primary keys

**Code:**
```typescript
async function convertInquiryToProject(inquiryId: string) {
  // Get proposal and terms
  const proposal = await db.proposals.findFirst({
    where: { inquiryId }
  });

  const terms = await db.projectTerms.findFirst({
    where: { /* linked to this inquiry */ }
  });

  // Create new project
  const project = await db.projects.create({
    data: {
      name: proposal.companyName,
      // ... other project fields
    }
  });

  // Create deliverables using IDs from proposal/terms
  const deliverablesFromTerms = terms.content.deliverables;

  for (const deliverable of deliverablesFromTerms) {
    await db.deliverables.create({
      data: {
        id: deliverable.id,  // ← USE EXISTING ID (don't generate new)
        projectId: project.id,
        name: deliverable.name,
        description: deliverable.description,
        format: deliverable.format,
        estimatedCompletionWeek: deliverable.estimatedCompletionWeek,
        status: 'pending',
        displayOrder: deliverablesFromTerms.indexOf(deliverable) + 1,
        balancePaymentRequired: true
      }
    });
  }

  return project;
}
```

**Database:**
```sql
-- Create deliverables with PRESERVED IDs from proposal/terms
INSERT INTO deliverables (
  id,  -- ← PRIMARY KEY
  project_id,
  name,
  description,
  format,
  estimated_completion_week,
  status,
  display_order,
  balance_payment_required
)
SELECT
  (elem->>'id')::UUID,  -- ← EXTRACT ID from JSONB, use as PK
  :new_project_id,
  elem->>'name',
  elem->>'description',
  elem->>'format',
  (elem->>'estimatedCompletionWeek')::INT,
  'pending',
  ROW_NUMBER() OVER (),
  true
FROM project_terms pt,
     jsonb_array_elements(pt.content->'deliverables') AS elem
WHERE pt.project_id = :project_id;
```

**Verification:**
```sql
-- Verify deliverable IDs match proposal
SELECT
  p.deliverables->>0->>'id' as proposal_deliverable_1_id,
  d.id as deliverables_table_id
FROM proposals p
JOIN inquiries i ON i.id = p.inquiry_id
JOIN projects pr ON pr.id = i.converted_project_id
JOIN deliverables d ON d.project_id = pr.id
WHERE p.id = :proposal_id
LIMIT 1;

-- Should show matching IDs
```

**Result:** Deliverable IDs from proposal are now primary keys in `deliverables` table

---

## ID Consistency Verification Query

```sql
-- Query to verify ID consistency across all stages
WITH proposal_ids AS (
  SELECT
    p.id as proposal_id,
    jsonb_array_elements(p.deliverables)->>'id' as deliverable_id,
    jsonb_array_elements(p.deliverables)->>'name' as deliverable_name
  FROM proposals p
  WHERE p.id = :proposal_id
),
terms_ids AS (
  SELECT
    pt.id as terms_id,
    jsonb_array_elements(pt.content->'deliverables')->>'id' as deliverable_id,
    jsonb_array_elements(pt.content->'deliverables')->>'name' as deliverable_name
  FROM project_terms pt
  WHERE pt.project_id = :project_id
),
actual_ids AS (
  SELECT
    d.id as deliverable_id,
    d.name as deliverable_name
  FROM deliverables d
  WHERE d.project_id = :project_id
)
SELECT
  pi.deliverable_id as id_in_proposal,
  ti.deliverable_id as id_in_terms,
  ai.deliverable_id as id_in_deliverables,
  CASE
    WHEN pi.deliverable_id = ti.deliverable_id
     AND ti.deliverable_id = ai.deliverable_id
    THEN '✅ IDs MATCH'
    ELSE '❌ IDS MISMATCH'
  END as status
FROM proposal_ids pi
FULL OUTER JOIN terms_ids ti ON pi.deliverable_id = ti.deliverable_id
FULL OUTER JOIN actual_ids ai ON ti.deliverable_id = ai.deliverable_id;
```

Expected output:
```
 id_in_proposal  |  id_in_terms   | id_in_deliverables |    status
-----------------+----------------+--------------------+---------------
 550e8400-...-01 | 550e8400-...-01| 550e8400-...-01   | ✅ IDs MATCH
 550e8400-...-02 | 550e8400-...-02| 550e8400-...-02   | ✅ IDs MATCH
```

---

## Why NOT Generate New IDs?

### ❌ Bad Approach: Regenerate IDs at Each Stage

```typescript
// ❌ WRONG - generates new IDs during conversion
async function convertInquiryToProject(inquiryId: string) {
  const proposal = await getProposal(inquiryId);

  for (const deliverable of proposal.deliverables) {
    await db.deliverables.create({
      data: {
        id: randomUUID(),  // ❌ NEW ID! Breaks consistency
        name: deliverable.name,
        // ...
      }
    });
  }
}
```

**Problems:**
1. Customer accepted terms referencing specific deliverable IDs
2. IDs in terms document don't match actual deliverables
3. Cannot trace deliverable back to proposal
4. Breaks audit trail

### ✅ Good Approach: Preserve IDs

```typescript
// ✅ CORRECT - preserves IDs from proposal
async function convertInquiryToProject(inquiryId: string) {
  const proposal = await getProposal(inquiryId);

  for (const deliverable of proposal.deliverables) {
    await db.deliverables.create({
      data: {
        id: deliverable.id,  // ✅ PRESERVE ID from proposal
        name: deliverable.name,
        // ...
      }
    });
  }
}
```

---

## Common Pitfalls

### Pitfall 1: Using ORM's Default ID Generation

```typescript
// ❌ WRONG - Prisma will generate new UUID
await prisma.deliverables.create({
  data: {
    // id not specified - Prisma generates new UUID
    projectId,
    name: deliverable.name
  }
});

// ✅ CORRECT - explicitly provide ID
await prisma.deliverables.create({
  data: {
    id: deliverable.id,  // ← Explicitly provide
    projectId,
    name: deliverable.name
  }
});
```

### Pitfall 2: Modifying IDs During JSON Parsing

```typescript
// ❌ WRONG - creates new object, loses ID
const deliverables = proposal.deliverables.map(d => ({
  name: d.name,
  description: d.description,
  // id is lost!
}));

// ✅ CORRECT - preserves all fields including ID
const deliverables = proposal.deliverables.map(d => ({ ...d }));
// or better: just use the array directly
const deliverables = proposal.deliverables;
```

### Pitfall 3: Not Validating UUID Format

```typescript
// ❌ WRONG - assumes valid UUID
await db.deliverables.create({
  data: {
    id: deliverable.id,  // What if it's not a valid UUID?
    // ...
  }
});

// ✅ CORRECT - validate UUID format
import { validate as isValidUUID } from 'uuid';

if (!isValidUUID(deliverable.id)) {
  throw new Error(`Invalid deliverable ID: ${deliverable.id}`);
}

await db.deliverables.create({
  data: {
    id: deliverable.id,
    // ...
  }
});
```

---

## Testing ID Preservation

```typescript
describe('Deliverable ID Preservation', () => {
  it('should preserve deliverable IDs from proposal to terms', async () => {
    // Create proposal with deliverables
    const proposal = await createProposal({
      deliverables: [
        { name: 'Video 1', description: '...' },
        { name: 'Video 2', description: '...' }
      ]
    });

    const proposalDeliverableIds = proposal.deliverables.map(d => d.id);

    // Customer accepts, terms created
    const terms = await createProjectTermsFromProposal(proposal.id);

    const termsDeliverableIds = terms.content.deliverables.map(d => d.id);

    // IDs should match
    expect(termsDeliverableIds).toEqual(proposalDeliverableIds);
  });

  it('should preserve deliverable IDs from terms to deliverables table', async () => {
    // Setup: proposal → terms → payment
    const { proposal, terms } = await setupProposalAndTerms();

    const termsDeliverableIds = terms.content.deliverables.map(d => d.id);

    // Convert to project
    const project = await convertInquiryToProject(proposal.inquiryId);

    const actualDeliverables = await db.deliverables.findMany({
      where: { projectId: project.id }
    });

    const actualIds = actualDeliverables.map(d => d.id);

    // IDs should match
    expect(actualIds.sort()).toEqual(termsDeliverableIds.sort());
  });

  it('should maintain ID consistency end-to-end', async () => {
    // Create inquiry → proposal → accept → terms → pay → convert
    const inquiry = await createInquiry({...});
    const proposal = await createProposal(inquiry.id, {
      deliverables: [
        { name: 'Video 1', ... },
        { name: 'Video 2', ... }
      ]
    });

    const originalIds = proposal.deliverables.map(d => d.id);

    // Accept proposal
    await acceptProposal(proposal.id);

    // Complete payment (triggers conversion)
    await completePayment(inquiry.id);

    // Get final deliverables
    const finalDeliverables = await db.deliverables.findMany({
      where: { project: { inquiries: { id: inquiry.id } } }
    });

    const finalIds = finalDeliverables.map(d => d.id);

    // IDs should be identical
    expect(finalIds.sort()).toEqual(originalIds.sort());
  });
});
```

---

## Audit Trail Query

```sql
-- Track deliverable from proposal through project lifecycle
SELECT
  'Proposal' as stage,
  p.id as proposal_id,
  jsonb_array_elements(p.deliverables)->>'id' as deliverable_id,
  jsonb_array_elements(p.deliverables)->>'name' as name,
  p.created_at as created_at
FROM proposals p
WHERE p.id = :proposal_id

UNION ALL

SELECT
  'Terms' as stage,
  pt.id as terms_id,
  jsonb_array_elements(pt.content->'deliverables')->>'id' as deliverable_id,
  jsonb_array_elements(pt.content->'deliverables')->>'name' as name,
  pt.created_at as created_at
FROM project_terms pt
JOIN proposals p ON pt.project_id = :project_id
WHERE p.id = :proposal_id

UNION ALL

SELECT
  'Deliverables Table' as stage,
  d.id as deliverable_id,
  d.id as deliverable_id,
  d.name,
  d.created_at
FROM deliverables d
WHERE d.project_id = :project_id

ORDER BY created_at;
```

---

**Last Updated:** 2025-11-19
**Maintained By:** Development Team
**Version:** 1.0
