# Project Setup Flow Documentation

This document clarifies that **ProjectSetup is NOT a database table** - it's an application-layer Data Transfer Object (DTO) used temporarily during the inquiry-to-project conversion process.

---

## Key Concept: ProjectSetup is a DTO

**Important**: `ProjectSetup` exists only in application memory during the conversion process. It is never persisted to the database.

| Aspect | Details |
|--------|---------|
| **Type** | Data Transfer Object (DTO) |
| **Storage** | In-memory only (optional: Redis cache during payment window) |
| **Lifetime** | Created when proposal accepted → Destroyed after project created |
| **Purpose** | Aggregate and transform data from multiple sources |
| **Database Table** | ❌ NO - Not a database table |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Customer Submits Inquiry                                  │
├─────────────────────────────────────────────────────────────────────┤
│ Database: inquiries table                                           │
│  - Customer info, project description, budget                       │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Admin Creates Proposal                                    │
├─────────────────────────────────────────────────────────────────────┤
│ Database: proposals table                                           │
│  - Deliverables (JSONB), pricing, timeline, payment terms           │
│  - Generates review_token for customer access                       │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ↓  Customer accepts proposal
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 3: System Creates Project Terms                              │
├─────────────────────────────────────────────────────────────────────┤
│ Database: project_terms table                                       │
│  - Content (JSONB) includes deliverables from proposal              │
│  - Preserves deliverable IDs from proposal                          │
│  - Status: 'pending_acceptance'                                     │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ↓  Customer reviews and accepts terms
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 4: System Creates ProjectSetup (APPLICATION LAYER - NO DB)   │
├─────────────────────────────────────────────────────────────────────┤
│ Memory: ProjectSetup DTO (not in database!)                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ interface ProjectSetup {                                     │  │
│  │   inquiryId: string;                                         │  │
│  │   proposalId: string;                                        │  │
│  │   termsId: string;                                           │  │
│  │   customerInfo: {...},        // From inquiry                │  │
│  │   deliverables: [...],        // From proposal/terms         │  │
│  │   pricing: {...},             // From proposal               │  │
│  │   paymentBreakdown: {...},    // Calculated                  │  │
│  │   termsContent: {...}         // From project_terms          │  │
│  │ }                                                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ Optional: Cache in Redis for 1 hour (payment window)                │
│  redis.set(`project-setup:${inquiryId}`, JSON.stringify(setup))    │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ↓  Customer completes payment
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 5: System Converts to Project (DATABASE)                     │
├─────────────────────────────────────────────────────────────────────┤
│ Database: Multiple tables created                                   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 1. projects table                                            │  │
│  │    - name, created_at, total_revisions, used_revisions       │  │
│  │                                                               │  │
│  │ 2. project_payment_status table                              │  │
│  │    - total_amount, advance_amount, balance_amount            │  │
│  │    - advance_paid: true, balance_paid: false                 │  │
│  │                                                               │  │
│  │ 3. deliverables table (multiple rows)                        │  │
│  │    - Preserves IDs from proposal/terms                       │  │
│  │    - status: 'pending', balance_payment_required: true       │  │
│  │                                                               │  │
│  │ 4. project_team table                                        │  │
│  │    - Add customer as primary contact                         │  │
│  │    - Add assigned project manager                            │  │
│  │                                                               │  │
│  │ 5. activities table                                          │  │
│  │    - Log 'project_created' activity                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ ProjectSetup DTO is discarded (garbage collected)                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Why ProjectSetup is NOT a Database Table

### Design Decision Rationale

1. **Temporary by Nature**
   - Exists only during conversion process (minutes to hours)
   - No need for permanent storage
   - Automatically cleaned up after use

2. **Simplifies Data Model**
   - Avoids cluttering database with temporary tables
   - No cleanup jobs needed
   - No orphaned records to manage

3. **Source Data Already Persisted**
   - Inquiry: Already in `inquiries` table
   - Proposal: Already in `proposals` table
   - Terms: Already in `project_terms` table
   - Setup just aggregates these temporarily

4. **Clear Separation of Concerns**
   - Application-layer: Orchestration and transformation
   - Database-layer: Permanent records only

---

## ProjectSetup DTO Structure

```typescript
/**
 * Application-layer DTO for project conversion
 * NOT persisted to database - exists in memory only
 */
export interface ProjectSetup {
  // Source IDs (references to database records)
  inquiryId: string;
  proposalId: string;
  termsId: string;

  // Aggregated Customer Info (from inquiry)
  customer: {
    email: string;
    fullName: string;
    company: string;
    phone: string;
  };

  // Project Details (from proposal)
  projectName: string;
  projectScope: string;
  estimatedDuration: string;
  includedRevisions: number;

  // Deliverables (from proposal/terms - IDs preserved)
  deliverables: Array<{
    id: string;              // UUID - will become PK in deliverables table
    name: string;
    description: string;
    format?: string;
    estimatedCompletionWeek?: number;
  }>;

  // Payment Information (from proposal)
  pricing: {
    totalPrice: number;      // In smallest unit (paise/cents)
    currency: string;        // 'INR' | 'USD'
  };

  // Payment Breakdown (calculated)
  paymentBreakdown: {
    advancePercentage: number;     // e.g., 50
    advanceAmount: number;          // Calculated
    balanceAmount: number;          // Calculated
    advancePaymentId?: string;      // If already paid
  };

  // Terms Content (from project_terms)
  termsContent: {
    deliverables: any[];   // Copy from terms
    paymentTerms: string;
    revisionPolicy: string;
    nonInclusions: string[];
  };

  // Conversion Metadata
  conversionInitiatedAt: Date;
  conversionInitiatedBy: string;  // User ID
}
```

---

## Implementation Examples

### Creating ProjectSetup (Application Code)

```typescript
// server/services/projectConversion.ts

/**
 * Build ProjectSetup DTO from inquiry, proposal, and terms
 * This exists only in memory - NOT saved to database
 */
export async function buildProjectSetup(inquiryId: string): Promise<ProjectSetup> {
  // 1. Fetch source data from database
  const inquiry = await db.inquiries.findUnique({
    where: { id: inquiryId },
    include: {
      proposal: true,
      projectTerms: true
    }
  });

  if (!inquiry || !inquiry.proposal || !inquiry.projectTerms) {
    throw new Error('Incomplete inquiry data for conversion');
  }

  const proposal = inquiry.proposal;
  const terms = inquiry.projectTerms;

  // 2. Calculate payment breakdown
  const advancePercentage = 50; // 50% advance
  const totalPrice = proposal.totalPrice;
  const advanceAmount = Math.floor(totalPrice * advancePercentage / 100);
  const balanceAmount = totalPrice - advanceAmount;

  // 3. Get advance payment if exists
  const advancePayment = await db.payments.findFirst({
    where: {
      // projectId not set yet, find by inquiry somehow
      type: 'ADVANCE',
      status: 'COMPLETED'
    }
  });

  // 4. Build DTO (in memory)
  const setup: ProjectSetup = {
    inquiryId: inquiry.id,
    proposalId: proposal.id,
    termsId: terms.id,

    customer: {
      email: inquiry.email,
      fullName: inquiry.fullName,
      company: inquiry.company,
      phone: inquiry.phone
    },

    projectName: proposal.companyName || inquiry.company,
    projectScope: proposal.projectScope,
    estimatedDuration: proposal.estimatedDuration,
    includedRevisions: proposal.includedRevisions,

    deliverables: proposal.deliverables, // Already has IDs

    pricing: {
      totalPrice: proposal.totalPrice,
      currency: proposal.currency
    },

    paymentBreakdown: {
      advancePercentage,
      advanceAmount,
      balanceAmount,
      advancePaymentId: advancePayment?.id
    },

    termsContent: {
      deliverables: terms.content.deliverables,
      paymentTerms: terms.content.paymentTerms,
      revisionPolicy: terms.content.revisionPolicy,
      nonInclusions: terms.content.nonInclusions
    },

    conversionInitiatedAt: new Date(),
    conversionInitiatedBy: 'system' // or actual user ID
  };

  // 5. Optionally cache in Redis for payment window
  await redis.set(
    `project-setup:${inquiryId}`,
    JSON.stringify(setup),
    'EX',
    3600 // Expire after 1 hour
  );

  return setup;
}
```

### Converting ProjectSetup to Database Records

```typescript
/**
 * Convert ProjectSetup DTO into actual database records
 * After this, ProjectSetup is discarded
 */
export async function convertSetupToProject(setup: ProjectSetup): Promise<Project> {
  return await db.$transaction(async (tx) => {
    // 1. Create project record
    const project = await tx.projects.create({
      data: {
        name: setup.projectName,
        totalRevisions: setup.includedRevisions,
        usedRevisions: 0
      }
    });

    // 2. Create payment status record
    await tx.projectPaymentStatus.create({
      data: {
        projectId: project.id,
        totalAmount: setup.pricing.totalPrice,
        currency: setup.pricing.currency,
        advancePercentage: setup.paymentBreakdown.advancePercentage,
        advanceAmount: setup.paymentBreakdown.advanceAmount,
        balanceAmount: setup.paymentBreakdown.balanceAmount,
        advancePaid: !!setup.paymentBreakdown.advancePaymentId,
        advancePaidAt: setup.paymentBreakdown.advancePaymentId ? new Date() : null,
        balancePaid: false
      }
    });

    // 3. Create deliverable records (preserving IDs from proposal)
    for (let i = 0; i < setup.deliverables.length; i++) {
      const deliverable = setup.deliverables[i];

      await tx.deliverables.create({
        data: {
          id: deliverable.id,  // ← PRESERVE ID from proposal
          projectId: project.id,
          name: deliverable.name,
          description: deliverable.description,
          format: deliverable.format,
          estimatedCompletionWeek: deliverable.estimatedCompletionWeek,
          status: 'pending',
          displayOrder: i + 1,
          balancePaymentRequired: true
        }
      });
    }

    // 4. Add customer to project team as primary contact
    await tx.projectTeam.create({
      data: {
        userId: setup.customer.userId, // Assume user already exists
        projectId: project.id,
        role: 'client',
        isPrimaryContact: true,
        addedBy: 'system'
      }
    });

    // 5. Log activity
    await tx.activities.create({
      data: {
        projectId: project.id,
        userId: setup.conversionInitiatedBy,
        actionType: 'project_created',
        entityType: 'project',
        entityId: project.id,
        description: `Project "${project.name}" created from inquiry`,
        details: {
          inquiryId: setup.inquiryId,
          proposalId: setup.proposalId,
          termsId: setup.termsId
        }
      }
    });

    // 6. Update inquiry status
    await tx.inquiries.update({
      where: { id: setup.inquiryId },
      data: {
        status: 'converted',
        convertedProjectId: project.id
      }
    });

    return project;
  });

  // ProjectSetup DTO is now out of scope and garbage collected
  // Redis cache will expire after 1 hour if not already deleted
}
```

### Optional: Clear Cache After Conversion

```typescript
export async function clearProjectSetupCache(inquiryId: string): Promise<void> {
  await redis.del(`project-setup:${inquiryId}`);
}
```

---

## API Flow Example

### POST /api/inquiries/:id/convert-to-project

```typescript
// API endpoint that uses ProjectSetup internally
router.post('/api/inquiries/:id/convert-to-project', requireAuth, async (req, res) => {
  const { id: inquiryId } = req.params;

  try {
    // 1. Build ProjectSetup DTO (in memory)
    const setup = await buildProjectSetup(inquiryId);

    // 2. Verify payment received
    if (!setup.paymentBreakdown.advancePaymentId) {
      return res.status(400).json({
        error: 'Advance payment not received'
      });
    }

    // 3. Convert to actual project (database records)
    const project = await convertSetupToProject(setup);

    // 4. Clean up cache
    await clearProjectSetupCache(inquiryId);

    // 5. Send welcome email
    await sendProjectCreatedEmail(project.id);

    // 6. Return project
    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt
      }
    });

    // ProjectSetup DTO is now out of scope and gone from memory

  } catch (error) {
    console.error('Project conversion failed:', error);
    res.status(500).json({ error: 'Conversion failed' });
  }
});
```

---

## State Transitions

```
Inquiry State Machine:

new → proposal_sent → accepted → project_setup → payment_pending → paid → converted
                                      ↑
                                      │
                                  [In Memory]
                                  ProjectSetup DTO
                                  (not in database)
```

**project_setup State**:
- Inquiry status: `project_setup`
- ProjectSetup DTO: Exists in memory (+ optional Redis cache)
- Customer is on payment screen
- Waiting for advance payment
- Timeout: 1 hour (then cache expires)

**After Payment**:
- ProjectSetup converted to Project records
- Inquiry status: `converted`
- DTO discarded
- Redis cache cleared

---

## Comparison: What's in Database vs Memory

| Data | Database | Memory (ProjectSetup) |
|------|----------|----------------------|
| Customer info | ✅ inquiries table | Copied to DTO |
| Proposal details | ✅ proposals table | Copied to DTO |
| Terms content | ✅ project_terms table | Copied to DTO |
| **ProjectSetup itself** | ❌ NOT STORED | ✅ Temporary DTO |
| Final project | ✅ projects table | Created from DTO |
| Payment status | ✅ project_payment_status | Created from DTO |
| Deliverables | ✅ deliverables table | Created from DTO |

---

## FAQ

**Q: Why not store ProjectSetup in the database?**
A: It's temporary orchestration data. All source data already exists in other tables. No need to duplicate.

**Q: What if the server restarts during payment?**
A: Payment webhook includes inquiry ID. System can rebuild ProjectSetup from inquiry + proposal + terms.

**Q: Where does ProjectSetup live during the payment window?**
A: In memory when actively processing, optionally cached in Redis for 1 hour.

**Q: Can I query ProjectSetup from the database?**
A: No. It's not in the database. Query the source tables: inquiries, proposals, project_terms.

**Q: What if I need ProjectSetup data later?**
A: Rebuild it from source tables or implement Redis caching with longer TTL.

**Q: Is this a common pattern?**
A: Yes! DTOs are standard for transforming data between layers. Examples: API responses, form submissions, data migrations.

---

## Migration Note

If you were expecting a `project_setup` table and wondering where it is: **It doesn't exist by design**. This is an application-layer concept only.

If you absolutely need to persist setup state:
1. Add `setup_data JSONB` to `inquiries` table
2. Or implement Redis caching with appropriate TTL
3. Or rebuild on-demand from source tables

---

**Last Updated**: 2025-11-19
**Version**: 1.0
**Status**: Architectural Decision Record
