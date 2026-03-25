# Data Models: Project Terms & Acceptance

This document defines all TypeScript interfaces and types for the feature.

## Table of Contents

1. [ProjectTerms Model](#projectterms-model)
2. [ProjectTermsAcceptance Model](#projecttermsacceptance-model)
3. [ProjectTermsRevision Model](#projecttermsrevision-model)
4. [Supporting Types](#supporting-types)
5. [Relationships](#relationships)
6. [Validation Rules](#validation-rules)
7. [Example Data](#example-data)

---

## ProjectTerms Model

The primary model storing project terms content, versioning, and status.

```typescript
export interface ProjectTerms {
  // Core Identification
  id: string;                          // UUID
  projectId: string;                   // UUID - foreign key to projects table
  version: number;                     // Version number (starts at 1, increments on updates)
  status: TermsStatus;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt: Date | null;             // Timestamp when client accepted (null if not accepted)

  // Terms Content (JSON structure for flexibility)
  content: TermsContent;

  // Metadata
  createdBy: string;                   // UUID - admin who created/updated terms
  lastModifiedBy: string;              // UUID - admin who last modified
  changesSummary: string | null;       // Summary of what changed in this version
}

export interface TermsContent {
  // Project Overview
  projectName: string;
  clientName: string;
  startDate: string;                   // ISO 8601 date string
  endDate: string;                     // ISO 8601 date string

  // Project Scope
  scope: {
    inclusions: string[];              // Array of included items
    exclusions: string[];              // Array of excluded items
  };

  // Deliverables
  deliverables: Deliverable[];

  // Revision Policy
  revisionPolicy: {
    totalRevisions: number;            // Total revisions included
    description: string;               // Policy description
  };

  // Timeline
  timeline: {
    duration: string;                  // E.g., "11 weeks"
    checkIns: string;                  // E.g., "Tuesdays at 2:00 PM EST"
    finalDeadline: string;             // ISO 8601 date string
  };

  // Pricing
  pricing: {
    total: number;                     // Project total in cents (e.g., 1500000 = $15,000)
    currency: string;                  // E.g., "USD"
    paymentSchedule: PaymentScheduleItem[];
  };
}

export interface Deliverable {
  id: string;                          // UUID
  name: string;
  description: string;
  format: string;                      // E.g., "MP4, 1080p, 30fps"
  dueDate: string;                     // ISO 8601 date string
}

export interface PaymentScheduleItem {
  description: string;                 // E.g., "50% deposit"
  amount: number;                      // Amount in cents
  dueCondition: string;                // E.g., "Due upon acceptance of terms"
}
```

---

## ProjectTermsAcceptance Model

Records each time a client primary contact accepts project terms.

```typescript
export interface ProjectTermsAcceptance {
  // Core Identification
  id: string;                          // UUID
  projectTermsId: string;              // UUID - foreign key to project_terms
  projectId: string;                   // UUID - foreign key to projects (denormalized for performance)
  termsVersion: number;                // Which version was accepted
  createdAt: Date;

  // Acceptance Details
  acceptedBy: string;                  // UUID - user who accepted (must be primary contact)
  acceptedAt: Date;                    // Timestamp of acceptance
  ipAddress: string;                   // IP address for audit trail
  userAgent: string;                   // Browser user agent for audit trail

  // Metadata
  notes: string | null;                // Optional notes (for internal use)
}
```

---

## ProjectTermsRevision Model

Tracks change requests from clients when they request modifications to terms.

```typescript
export interface ProjectTermsRevision {
  // Core Identification
  id: string;                          // UUID
  projectTermsId: string;              // UUID - foreign key to project_terms
  projectId: string;                   // UUID - foreign key to projects
  createdAt: Date;
  updatedAt: Date;

  // Request Details
  requestedBy: string;                 // UUID - user who requested changes (must be primary contact)
  requestedChanges: string;            // Required description of what needs to change
  additionalContext: string | null;    // Optional additional information
  termsVersion: number;                // Which version they're requesting changes to

  // Response
  status: RevisionRequestStatus;
  respondedBy: string | null;          // UUID - admin who responded
  respondedAt: Date | null;
  adminResponse: string | null;        // Admin's response message
  resolved: boolean;                   // True if request has been addressed
}
```

---

## Supporting Types

### TermsStatus Type

```typescript
export type TermsStatus =
  | 'pending_review'        // Client needs to review and accept
  | 'revision_requested'    // Client requested changes, awaiting admin action
  | 'accepted';             // Client has accepted terms
```

### RevisionRequestStatus Type

```typescript
export type RevisionRequestStatus =
  | 'pending'              // Awaiting admin review
  | 'under_review'         // Admin is reviewing
  | 'addressed'            // Admin updated terms based on request
  | 'declined';            // Admin declined to make requested changes
```

### TermsVersion Type Utility

```typescript
// Helper type for version management
export interface TermsVersionInfo {
  version: number;
  createdAt: Date;
  createdBy: string;
  changesSummary: string | null;
  acceptedAt: Date | null;
  acceptedBy: string | null;
}
```

### API Response Types

```typescript
// GET /api/projects/:id/terms response
export interface GetTermsResponse {
  success: true;
  data: {
    terms: ProjectTerms;
    acceptance: ProjectTermsAcceptance | null;
    hasPendingRevisionRequests: boolean;
    isAccepted: boolean;
  };
}

// POST /api/projects/:id/terms/accept response
export interface AcceptTermsResponse {
  success: true;
  data: {
    acceptance: ProjectTermsAcceptance;
    projectUnlocked: true;
  };
  message: string;
}

// POST /api/projects/:id/terms/request-revision response
export interface RequestRevisionResponse {
  success: true;
  data: {
    revision: ProjectTermsRevision;
  };
  message: string;
}

// PATCH /api/projects/:id/terms response
export interface UpdateTermsResponse {
  success: true;
  data: {
    terms: ProjectTerms;
    newVersion: number;
    clientNotified: boolean;
  };
  message: string;
}
```

### Constants

```typescript
export const TERMS_CONFIG = {
  MAX_CONTENT_LENGTH: 50000,              // Max chars for terms content
  MAX_REQUEST_CHANGES_LENGTH: 1000,       // Max chars for change request
  MAX_ADDITIONAL_CONTEXT_LENGTH: 500,     // Max chars for additional context
  ADMIN_RESPONSE_TIMEOUT_HOURS: 24,       // Expected admin response time
  ACCEPTANCE_TOKEN_EXPIRY_MINUTES: 15,    // How long acceptance is valid after shown
} as const;

export const TERMS_STATUS_LABELS: Record<TermsStatus, string> = {
  'pending_review': 'Pending Review',
  'revision_requested': 'Revision Requested',
  'accepted': 'Accepted',
} as const;

export const REVISION_STATUS_LABELS: Record<RevisionRequestStatus, string> = {
  'pending': 'Pending',
  'under_review': 'Under Review',
  'addressed': 'Addressed',
  'declined': 'Declined',
} as const;
```

---

## Relationships

### Entity Relationship Diagram

```
┌─────────────────┐
│    projects     │
└────────┬────────┘
         │
         │ 1:1
         │
         ↓
┌─────────────────┐
│ project_terms   │ ←──────────┐
└────────┬────────┘            │
         │                     │
         │ 1:N                 │ N:1
         ├──────────┐          │
         ↓          ↓          │
┌──────────────┐  ┌────────────────────────┐
│ project_     │  │ project_terms_         │
│ terms_       │  │ acceptance             │
│ acceptance   │  └────────────────────────┘
└──────────────┘

┌─────────────────┐
│ project_terms   │
└────────┬────────┘
         │
         │ 1:N
         │
         ↓
┌─────────────────┐
│ project_terms_  │
│ revision        │
└─────────────────┘
```

### Relationship Rules

1. **Projects → ProjectTerms**: One-to-One (each project has exactly one current terms record)
2. **ProjectTerms → ProjectTermsAcceptance**: One-to-Many (each version can have multiple acceptance records if terms are updated)
3. **ProjectTerms → ProjectTermsRevision**: One-to-Many (clients can submit multiple change requests)
4. **Users → ProjectTermsAcceptance**: One-to-Many (one client can accept terms for multiple projects)
5. **Users → ProjectTermsRevision**: One-to-Many (one client can request changes on multiple projects)

---

## Validation Rules

### ProjectTerms Validation

| Field | Required | Min | Max | Format |
|-------|----------|-----|-----|--------|
| projectId | Yes | - | - | Valid UUID |
| version | Yes | 1 | 999 | Positive integer |
| status | Yes | - | - | Valid TermsStatus enum |
| content.projectName | Yes | 1 | 255 | Any string |
| content.deliverables | Yes | 1 | 50 | Array of Deliverable objects |
| content.pricing.total | Yes | 0 | 99999999 | Integer (cents) |

### ProjectTermsAcceptance Validation

| Field | Required | Min | Max | Format |
|-------|----------|-----|-----|--------|
| projectTermsId | Yes | - | - | Valid UUID |
| acceptedBy | Yes | - | - | Valid UUID (must be primary contact) |
| ipAddress | Yes | 7 | 45 | Valid IPv4 or IPv6 |
| userAgent | Yes | 10 | 500 | Any string |
| termsVersion | Yes | 1 | 999 | Positive integer |

### ProjectTermsRevision Validation

| Field | Required | Min | Max | Format |
|-------|----------|-----|-----|--------|
| requestedBy | Yes | - | - | Valid UUID (must be primary contact) |
| requestedChanges | Yes | 10 | 1000 | Any string |
| additionalContext | No | 0 | 500 | Any string |
| termsVersion | Yes | 1 | 999 | Positive integer |

### Validation Schema (Zod)

```typescript
import { z } from 'zod';

export const DeliverableSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000),
  format: z.string().max(100),
  dueDate: z.string().datetime(),
});

export const PaymentScheduleItemSchema = z.object({
  description: z.string().min(1).max(255),
  amount: z.number().int().min(0),
  dueCondition: z.string().max(255),
});

export const TermsContentSchema = z.object({
  projectName: z.string().min(1).max(255),
  clientName: z.string().min(1).max(255),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  scope: z.object({
    inclusions: z.array(z.string()).min(1),
    exclusions: z.array(z.string()).optional(),
  }),
  deliverables: z.array(DeliverableSchema).min(1).max(50),
  revisionPolicy: z.object({
    totalRevisions: z.number().int().min(0).max(99),
    description: z.string().max(500),
  }),
  timeline: z.object({
    duration: z.string().max(100),
    checkIns: z.string().max(255),
    finalDeadline: z.string().datetime(),
  }),
  pricing: z.object({
    total: z.number().int().min(0).max(99999999),
    currency: z.string().length(3), // ISO 4217 currency code
    paymentSchedule: z.array(PaymentScheduleItemSchema).min(1),
  }),
});

export const ProjectTermsSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  version: z.number().int().min(1).max(999),
  status: z.enum(['pending_review', 'revision_requested', 'accepted']),
  content: TermsContentSchema,
  createdBy: z.string().uuid(),
  lastModifiedBy: z.string().uuid(),
  changesSummary: z.string().max(500).nullable(),
});

export const ProjectTermsAcceptanceSchema = z.object({
  id: z.string().uuid(),
  projectTermsId: z.string().uuid(),
  projectId: z.string().uuid(),
  termsVersion: z.number().int().min(1),
  acceptedBy: z.string().uuid(),
  ipAddress: z.string().ip(),
  userAgent: z.string().min(10).max(500),
  notes: z.string().max(1000).nullable().optional(),
});

export const ProjectTermsRevisionSchema = z.object({
  id: z.string().uuid(),
  projectTermsId: z.string().uuid(),
  projectId: z.string().uuid(),
  requestedBy: z.string().uuid(),
  requestedChanges: z.string().min(10).max(1000),
  additionalContext: z.string().max(500).nullable().optional(),
  termsVersion: z.number().int().min(1),
  status: z.enum(['pending', 'under_review', 'addressed', 'declined']),
  adminResponse: z.string().max(1000).nullable().optional(),
});
```

---

## Example Data

### Sample ProjectTerms Instance

```typescript
const sampleTerms: ProjectTerms = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  projectId: "660e8400-e29b-41d4-a716-446655440001",
  version: 1,
  status: "pending_review",
  createdAt: new Date("2025-01-15T09:00:00Z"),
  updatedAt: new Date("2025-01-15T09:00:00Z"),
  acceptedAt: null,
  createdBy: "770e8400-e29b-41d4-a716-446655440002",
  lastModifiedBy: "770e8400-e29b-41d4-a716-446655440002",
  changesSummary: null,
  content: {
    projectName: "Brand Video Campaign Q1 2025",
    clientName: "Acme Corp",
    startDate: "2025-01-15",
    endDate: "2025-03-30",
    scope: {
      inclusions: [
        "3 promotional videos (30 seconds each)",
        "Professional voiceover recording",
        "Background music licensing",
        "Motion graphics and animations",
        "Color grading and final polish"
      ],
      exclusions: [
        "On-location filming (stock footage only)",
        "Multiple voiceover takes (1 revision included)",
        "Custom music composition"
      ]
    },
    deliverables: [
      {
        id: "880e8400-e29b-41d4-a716-446655440003",
        name: "Promotional Video #1 - Product Showcase",
        description: "30-second promotional video highlighting key products",
        format: "MP4, 1080p, 30fps",
        dueDate: "2025-02-15"
      },
      {
        id: "990e8400-e29b-41d4-a716-446655440004",
        name: "Promotional Video #2 - Customer Testimonials",
        description: "30-second video featuring customer success stories",
        format: "MP4, 1080p, 30fps",
        dueDate: "2025-03-01"
      },
      {
        id: "aa0e8400-e29b-41d4-a716-446655440005",
        name: "Promotional Video #3 - Behind the Scenes",
        description: "30-second behind-the-scenes look at production process",
        format: "MP4, 1080p, 30fps",
        dueDate: "2025-03-15"
      }
    ],
    revisionPolicy: {
      totalRevisions: 3,
      description: "Each deliverable may be revised up to the total revision count. Revisions are shared across all deliverables. Additional revisions can be requested and require approval."
    },
    timeline: {
      duration: "11 weeks",
      checkIns: "Tuesdays at 2:00 PM EST",
      finalDeadline: "2025-03-30"
    },
    pricing: {
      total: 1500000, // $15,000 in cents
      currency: "USD",
      paymentSchedule: [
        {
          description: "50% deposit",
          amount: 750000, // $7,500
          dueCondition: "Due upon acceptance of terms"
        },
        {
          description: "50% final payment",
          amount: 750000, // $7,500
          dueCondition: "Due upon project completion"
        }
      ]
    }
  }
};
```

### Sample ProjectTermsAcceptance Instance

```typescript
const sampleAcceptance: ProjectTermsAcceptance = {
  id: "bb0e8400-e29b-41d4-a716-446655440006",
  projectTermsId: "550e8400-e29b-41d4-a716-446655440000",
  projectId: "660e8400-e29b-41d4-a716-446655440001",
  termsVersion: 1,
  acceptedBy: "cc0e8400-e29b-41d4-a716-446655440007",
  acceptedAt: new Date("2025-01-15T10:35:00Z"),
  createdAt: new Date("2025-01-15T10:35:00Z"),
  ipAddress: "192.168.1.100",
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  notes: null
};
```

### Sample ProjectTermsRevision Instance

```typescript
const sampleRevision: ProjectTermsRevision = {
  id: "dd0e8400-e29b-41d4-a716-446655440008",
  projectTermsId: "550e8400-e29b-41d4-a716-446655440000",
  projectId: "660e8400-e29b-41d4-a716-446655440001",
  requestedBy: "cc0e8400-e29b-41d4-a716-446655440007",
  requestedChanges: "I'd like to extend the timeline for Deliverable 2 by two weeks due to upcoming holidays.",
  additionalContext: "Our team will be out of office December 24 - January 2.",
  termsVersion: 1,
  status: "pending",
  respondedBy: null,
  respondedAt: null,
  adminResponse: null,
  resolved: false,
  createdAt: new Date("2025-01-15T14:15:00Z"),
  updatedAt: new Date("2025-01-15T14:15:00Z")
};
```

---

## Type Guards & Utilities

```typescript
// Type guard to check if terms are accepted
export function isTermsAccepted(terms: ProjectTerms): boolean {
  return terms.status === 'accepted' && terms.acceptedAt !== null;
}

// Type guard to check if revision request is pending
export function isRevisionPending(revision: ProjectTermsRevision): boolean {
  return revision.status === 'pending' || revision.status === 'under_review';
}

// Utility to format pricing
export function formatPrice(amountInCents: number, currency: string): string {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

// Utility to calculate payment schedule total
export function calculatePaymentTotal(schedule: PaymentScheduleItem[]): number {
  return schedule.reduce((total, item) => total + item.amount, 0);
}

// Utility to get next version number
export function getNextVersion(currentVersion: number): number {
  return currentVersion + 1;
}

// Utility to check if terms version matches
export function isTermsVersionCurrent(
  terms: ProjectTerms,
  acceptedVersion: number
): boolean {
  return terms.version === acceptedVersion;
}
```
