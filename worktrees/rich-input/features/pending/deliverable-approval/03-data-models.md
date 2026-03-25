# Data Models: Project Deliverables & Approval Workflow

This document defines all TypeScript interfaces and types for the deliverable approval workflow.

## Table of Contents

1. [Deliverable Model](#deliverable-model)
2. [DeliverableApproval Model](#deliverableapproval-model)
3. [Supporting Types](#supporting-types)
4. [Relationships](#relationships)
5. [Validation Rules](#validation-rules)
6. [Integration with ProposalDeliverable](#integration-with-proposaldeliverable)

**Note:** 
- `DeliverableFile` is just the `File` model from File-Management with `deliverableId` field
- `RevisionRequest` is defined in Feedback-and-Revisions feature (imported)

---

## Deliverable Model

The main model representing a project deliverable with approval tracking.

**NOTE:** This model extends the data from `ProposalDeliverable` (from inquiry-to-project feature) and adds approval workflow tracking.

```typescript
export interface Deliverable {
  // Core Identification
  id: string;                    // UUID (preserved from ProposalDeliverable)
  projectId: string;             // UUID of parent project
  createdAt: Date;
  updatedAt: Date;

  // From Proposal (preserved during project conversion)
  name: string;                  // e.g., "Script & Concept", "Final Video"
  description: string;           // Detailed description of deliverable
  estimatedCompletionWeek?: number; // Week number (e.g., 1, 2, 6)
  format?: string;               // e.g., "MP4, 1080p, 4K" or "PDF document"

  // Workflow Status
  status: DeliverableStatus;     // Current status in approval workflow
  order: number;                 // Display order (1, 2, 3...)

  // Beta Delivery
  betaFileId?: string;           // UUID of beta file (with watermark)
  betaUploadedAt?: Date;         // When beta was uploaded
  betaUploadedBy?: string;       // UUID of admin who uploaded

  // Approval Tracking
  awaitingApprovalSince?: Date;  // When status changed to awaiting_approval
  approvedAt?: Date;             // When client approved
  approvedBy?: string;           // UUID of user who approved (PRIMARY_CONTACT)
  rejectedAt?: Date;             // When client rejected
  rejectedBy?: string;           // UUID of user who rejected
  rejectionFeedback?: string;    // Client's feedback on rejection

  // Final Delivery
  finalFileId?: string;          // UUID of final file (no watermark)
  finalUploadedAt?: Date;        // When final was uploaded
  finalUploadedBy?: string;      // UUID of admin who uploaded
  finalDeliveredAt?: Date;       // When final was made available to client
  expiresAt?: Date;              // 365 days after final delivery (auto-calculated)

  // Payment Integration
  balancePaymentRequired: boolean; // True if payment needed before final delivery
  balancePaymentReceived: boolean; // True after payment received
  balancePaymentReceivedAt?: Date;

  // Revision Tracking (linked to project-level quota)
  revisionsConsumed: number;     // How many revisions this deliverable consumed
  revisionRequestIds: string[];  // Array of RevisionRequest UUIDs
}
```

### DeliverableStatus Type

```typescript
export type DeliverableStatus =
  | 'pending'              // Not started yet
  | 'in_progress'          // Team is working on it
  | 'beta_ready'           // Beta file uploaded, ready for client review
  | 'awaiting_approval'    // Client notified, awaiting approve/reject decision
  | 'approved'             // Client approved, awaiting payment
  | 'payment_pending'      // Approved, waiting for balance payment (use this, not AWAITING_FINAL_PAYMENT)
  | 'final_delivered'      // Final file delivered to client (complete, unlock downloads)
  | 'rejected'             // Client rejected, needs revisions
  | 'revision_requested'   // Same as rejected, back to in_progress
  | 'expired';             // 365 days passed, files archived
```

---

## DeliverableApproval Model

Tracks the full history of approvals and rejections for a deliverable (audit trail).

```typescript
export interface DeliverableApproval {
  // Core
  id: string;                    // UUID
  deliverableId: string;         // UUID of deliverable
  projectId: string;             // UUID of project (for easier queries)
  createdAt: Date;

  // Action
  action: 'approved' | 'rejected';
  actionBy: string;              // UUID of user who approved/rejected
  actionByName: string;          // Display name
  actionByEmail: string;         // Email

  // Rejection Details (only if action = 'rejected')
  feedback?: string;             // Client's feedback/comments
  revisionsRemaining?: number;   // Project revision quota at time of rejection

  // Context
  betaFileId?: string;           // Which beta file was reviewed
  betaFileUrl?: string;          // URL to beta file (for history)
}
```

---

## Supporting Types

### Conversion from ProposalDeliverable

Function to convert proposal deliverables to project deliverables during project creation.

```typescript
import { ProposalDeliverable } from '../inquiry-to-project/03-data-models';

export function convertProposalDeliverablesToProjectDeliverables(
  proposalDeliverables: ProposalDeliverable[],
  projectId: string,
  balancePaymentRequired: boolean = true
): Deliverable[] {
  return proposalDeliverables.map((pd, index) => ({
    // Preserve ID and data from proposal
    id: pd.id,
    projectId: projectId,
    createdAt: new Date(),
    updatedAt: new Date(),

    // Preserve proposal deliverable data
    name: pd.name,
    description: pd.description,
    estimatedCompletionWeek: pd.estimatedCompletionWeek,
    format: pd.format,

    // Initialize workflow fields
    status: 'pending',
    order: pd.order ?? (index + 1), // Preserve original order if available

    // Beta fields (empty initially)
    betaFileId: undefined,
    betaUploadedAt: undefined,
    betaUploadedBy: undefined,

    // Approval fields (empty initially)
    awaitingApprovalSince: undefined,
    approvedAt: undefined,
    approvedBy: undefined,
    rejectedAt: undefined,
    rejectedBy: undefined,
    rejectionFeedback: undefined,

    // Final delivery fields (empty initially)
    finalFileId: undefined,
    finalUploadedAt: undefined,
    finalUploadedBy: undefined,
    finalDeliveredAt: undefined,
    expiresAt: undefined,

    // Payment (use per-deliverable flag if available, otherwise default)
    balancePaymentRequired: pd.requiresPayment ?? balancePaymentRequired,
    balancePaymentReceived: false,
    balancePaymentReceivedAt: undefined,

    // Revision tracking
    revisionsConsumed: 0,
    revisionRequestIds: [],
  }));
}
```

This ensures seamless transition from proposal to project with full deliverable tracking.
