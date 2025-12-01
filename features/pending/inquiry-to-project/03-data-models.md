# Data Models: Inquiry to Project

This document defines all TypeScript interfaces and types for the inquiry-to-project workflow.

## Table of Contents

1. [Inquiry Model](#inquiry-model)
2. [Proposal Model](#proposal-model)
3. [Proposal Feedback Model](#proposal-feedback-model)
4. [Inquiry Note Model](#inquiry-note-model)
5. [Supporting Types](#supporting-types)
6. [Relationships](#relationships)
7. [Validation Rules](#validation-rules)

---

## Inquiry Model

The main model representing a customer's initial project inquiry.

```typescript
export interface Inquiry {
  // Core Identification
  id: string;                    // UUID
  inquiryNumber: string;         // Human-readable: "INQ-2025-001"
  status: InquiryStatus;
  createdAt: Date;
  updatedAt: Date;

  // Contact Information
  companyName: string;           // Required, max 255 chars
  companyWebsite?: string;       // Optional company website URL
  contactName: string;           // Required, max 255 chars
  contactEmail: string;          // Required, valid email
  contactPhone?: string;         // Optional phone number
  referralSource?: string;       // "How did you hear about us?" - Optional

  // Project Requirements (from quiz)
  projectType: ProjectType;
  projectDescription: string;    // Required, max 2000 chars
  estimatedBudget?: BudgetRange;
  desiredTimeline?: TimelineOption;
  videoLength?: VideoLengthOption;
  targetAudience?: string;       // Optional, max 500 chars
  specificRequirements?: string; // Optional, max 1000 chars
  referenceLinks?: string[];     // Array of URLs

  // Marketing Attribution (UTM Parameters)
  utmSource?: string;            // utm_source - Traffic source (e.g., "google", "facebook")
  utmMedium?: string;            // utm_medium - Marketing medium (e.g., "cpc", "email")
  utmCampaign?: string;          // utm_campaign - Campaign name
  utmTerm?: string;              // utm_term - Paid keywords
  utmContent?: string;           // utm_content - Ad variation

  // Internal Management
  assignedToAdminId?: string;    // UUID of admin user

  // Proposal Relationship
  proposalId?: string;           // UUID of associated proposal

  // Conversion
  convertedToProjectId?: string; // UUID of created project
  convertedAt?: Date;            // Timestamp of conversion
}
```

### InquiryStatus Type

```typescript
export type InquiryStatus =
  | 'new'              // Just submitted by customer
  | 'reviewing'        // Admin is reviewing
  | 'proposal_sent'    // Proposal has been sent to customer
  | 'negotiating'      // Customer requested changes
  | 'accepted'         // Customer accepted proposal
  | 'project_setup'    // Admin is setting up project (milestones, deliverables, team)
  | 'payment_pending'  // Project setup complete, payment request sent
  | 'paid'             // Payment received
  | 'converted'        // Successfully converted to project (final success state)
  | 'rejected'         // Customer declined proposal
  | 'archived';        // Closed without conversion
```

### ProjectType Type

```typescript
export type ProjectType =
  | 'Brand Story Video'
  | 'Product Demo / Explainer'
  | 'Social Media Content'
  | 'Event Coverage / Highlight Reel'
  | 'Other';
```

### BudgetRange Type

```typescript
export type BudgetRange =
  | 'Less than $5,000'
  | '$5,000 - $10,000'
  | '$10,000 - $25,000'
  | '$25,000+'
  | 'Not sure yet';
```

### TimelineOption Type

```typescript
export type TimelineOption =
  | 'Urgent (1-2 weeks)'
  | 'Standard (1-2 months)'
  | 'Flexible (3+ months)'
  | 'Not sure yet';
```

### VideoLengthOption Type

```typescript
export type VideoLengthOption =
  | '30 seconds'
  | '1 minute'
  | '2-3 minutes'
  | '5+ minutes'
  | 'Not sure yet';
```

---

## Proposal Model

Represents a detailed proposal sent to a customer in response to an inquiry.

```typescript
export interface Proposal {
  // Core Identification
  id: string;                    // UUID
  inquiryId: string;             // UUID of parent inquiry
  proposalNumber: string;        // Human-readable: "PROP-2025-001"
  version: number;               // Increments with each revision (starts at 1)
  status: ProposalStatus;
  createdAt: Date;
  updatedAt: Date;

  // Unique Access (for customer to view without login)
  reviewToken: string;           // UUID for secure access
  reviewUrl: string;             // Full URL: https://motionify.studio/proposal/review/{token}
  expiresAt: Date;               // Expiration timestamp (60 days from creation)
  viewedAt?: Date;               // When customer first viewed

  // Pricing
  totalPrice: number;            // Total in smallest unit (paise for INR, cents for USD)
  currency: CurrencyCode;        // ISO currency code: "INR" or "USD"
  pricingBreakdown: PricingItem[]; // Array of line items

  // Project Scope
  projectScope: string;          // Rich text/markdown description
  deliverables: ProposalDeliverable[]; // What customer will receive
  nonInclusions: string[];       // Array of exclusions

  // Timeline
  estimatedDuration: string;     // e.g., "6-8 weeks"
  milestones: Milestone[];       // Project phases with deliverables

  // Revisions
  includedRevisions: number;     // Default 2
  revisionPolicy: string;        // Text description of revision terms

  // Payment
  paymentLink?: string;          // Razorpay Payment Link URL (rzp.io/i/...)
  paymentTerms: string;          // e.g., "50% deposit, 50% on completion"

  // Team
  primaryContactName?: string;   // Who customer will work with

  // Acceptance
  acceptedAt?: Date;             // When customer accepted
  acceptedBy?: string;           // Customer email who accepted

  // Versioning (for negotiation)
  proposalSeriesId: string;      // UUID shared by all versions of this proposal (for easy querying)
  previousVersionId?: string;    // UUID of previous proposal version (backward link)
  supersededByVersionId?: string; // UUID of newer version (forward link, if superseded)
  changesSinceLastVersion?: string; // Summary of changes

  // Additional
  additionalNotes?: string;      // Optional message to customer
}
```

### ProposalStatus Type

```typescript
export type ProposalStatus =
  | 'draft'              // Admin is building, not sent yet
  | 'sent'               // Sent to customer via email
  | 'viewed'             // Customer opened the review link
  | 'revision_requested' // Customer requested changes
  | 'accepted'           // Customer accepted terms
  | 'rejected'           // Customer declined
  | 'expired'            // Review link expired (if expiration enabled)
  | 'superseded';        // Replaced by newer version
```

### PricingItem Interface

```typescript
export interface PricingItem {
  id: string;                    // UUID
  description: string;           // Line item name (e.g., "Script Development")
  amount: number;                // Price in cents
  quantity?: number;             // Optional quantity, default 1
  notes?: string;                // Optional internal notes
}
```

### ProposalDeliverable Interface

```typescript
export interface ProposalDeliverable {
  id: string;                    // UUID
  name: string;                  // Deliverable name (e.g., "Final Video")
  description: string;           // Detailed description
  estimatedCompletionWeek?: number; // Week number (e.g., 6)
  format?: string;               // Optional format details (e.g., "MP4, 1080p, 4K")
  order?: number;                // Display order (1, 2, 3...) - preserved during conversion
  requiresPayment?: boolean;     // Whether balance payment required for this deliverable (default: true)
}
```

### Milestone Interface

```typescript
export interface Milestone {
  id: string;                    // UUID
  name: string;                  // Milestone name (e.g., "Pre-Production")
  description: string;           // What happens in this phase
  deliverableIds: string[];      // Which deliverables are included
  estimatedDate?: string;        // Week number or date string
  order: number;                 // Display order (1, 2, 3...)
}
```

---

## Proposal Feedback Model

Captures customer feedback when requesting changes to a proposal.

```typescript
export interface ProposalFeedback {
  // Core
  id: string;                    // UUID
  proposalId: string;            // UUID of proposal being commented on
  inquiryId: string;             // UUID of parent inquiry
  customerEmail: string;         // Who submitted the feedback
  createdAt: Date;

  // Feedback Content
  feedback: string;              // Customer's text feedback (required)
  specificChanges?: SpecificChanges; // Categorized change requests

  // Admin Response
  adminResponse?: string;        // Admin's reply to feedback
  respondedAt?: Date;            // When admin responded
  respondedBy?: string;          // UUID of admin who responded

  // Status
  status: FeedbackStatus;
}
```

### FeedbackStatus Type

```typescript
export type FeedbackStatus =
  | 'pending'            // Awaiting admin response
  | 'responded'          // Admin replied via message
  | 'new_proposal_sent'; // Admin sent revised proposal
```

### SpecificChanges Interface

```typescript
export interface SpecificChanges {
  budget?: boolean;      // Customer wants pricing changes
  timeline?: boolean;    // Customer wants timeline changes
  scope?: boolean;       // Customer wants scope changes
  revisions?: boolean;   // Customer wants revision policy changes
  other?: boolean;       // Other unspecified changes
}
```

---

## Inquiry Note Model

Internal notes added by admins to track inquiry progress.

```typescript
export interface InquiryNote {
  id: string;                    // UUID
  inquiryId: string;             // UUID of parent inquiry
  authorId: string;              // UUID of admin who wrote note
  authorName: string;            // Display name of author
  content: string;               // Note text
  createdAt: Date;
  updatedAt: Date;
  isInternal: boolean;           // Always true (not visible to customer)
  isPinned?: boolean;            // Optional: pin important notes to top
}
```

---

## Supporting Types

### Currency Types

```typescript
// Supported currencies for Razorpay integration
export type CurrencyCode = 'INR' | 'USD';

// Currency configuration
export const CURRENCY_CONFIG = {
  INR: {
    symbol: '₹',
    name: 'Indian Rupee',
    smallestUnit: 'paise',
    multiplier: 100, // 100 paise = ₹1
    locale: 'en-IN',
  },
  USD: {
    symbol: '$',
    name: 'US Dollar',
    smallestUnit: 'cents',
    multiplier: 100, // 100 cents = $1
    locale: 'en-US',
  },
} as const;
```

### Currency Utilities

```typescript
// Helper to convert smallest unit to display value
export function formatCurrency(
  smallestUnit: number,
  currency: CurrencyCode = 'INR'
): string {
  const config = CURRENCY_CONFIG[currency];
  const mainUnit = smallestUnit / config.multiplier;

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency,
  }).format(mainUnit);
}

// Examples:
// formatCurrency(800000, 'INR') => "₹8,000.00"
// formatCurrency(800000, 'USD') => "$8,000.00"

// Helper to convert display value to smallest unit for storage
export function toSmallestUnit(
  mainUnit: number,
  currency: CurrencyCode = 'INR'
): number {
  const config = CURRENCY_CONFIG[currency];
  return Math.round(mainUnit * config.multiplier);
}

// Examples:
// toSmallestUnit(8000, 'INR') => 800000 paise
// toSmallestUnit(8000, 'USD') => 800000 cents

// Helper to get currency symbol
export function getCurrencySymbol(currency: CurrencyCode): string {
  return CURRENCY_CONFIG[currency].symbol;
}
```

### Date Utilities

```typescript
// Generate inquiry number
export function generateInquiryNumber(date: Date = new Date()): string {
  const year = date.getFullYear();
  // Sequential number should be fetched from database
  // This is just the format
  return `INQ-${year}-${String(sequentialNumber).padStart(3, '0')}`;
}

// Generate proposal number
export function generateProposalNumber(date: Date = new Date()): string {
  const year = date.getFullYear();
  return `PROP-${year}-${String(sequentialNumber).padStart(3, '0')}`;
}
```

### Validation Schemas

```typescript
// Using Zod for runtime validation (example)
import { z } from 'zod';

export const InquirySchema = z.object({
  companyName: z.string().min(1).max(255),
  companyWebsite: z.string().url().optional(),
  contactName: z.string().min(1).max(255),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  referralSource: z.string().max(255).optional(),
  projectType: z.enum([
    'Brand Story Video',
    'Product Demo / Explainer',
    'Social Media Content',
    'Event Coverage / Highlight Reel',
    'Other',
  ]),
  projectDescription: z.string().min(10).max(2000),
  estimatedBudget: z.enum([
    'Less than $5,000',
    '$5,000 - $10,000',
    '$10,000 - $25,000',
    '$25,000+',
    'Not sure yet',
  ]).optional(),
  desiredTimeline: z.enum([
    'Urgent (1-2 weeks)',
    'Standard (1-2 months)',
    'Flexible (3+ months)',
    'Not sure yet',
  ]).optional(),
  videoLength: z.enum([
    '30 seconds',
    '1 minute',
    '2-3 minutes',
    '5+ minutes',
    'Not sure yet',
  ]).optional(),
  targetAudience: z.string().max(500).optional(),
  specificRequirements: z.string().max(1000).optional(),
  referenceLinks: z.array(z.string().url()).optional(),
  // UTM Parameters
  utmSource: z.string().max(255).optional(),
  utmMedium: z.string().max(255).optional(),
  utmCampaign: z.string().max(255).optional(),
  utmTerm: z.string().max(255).optional(),
  utmContent: z.string().max(255).optional(),
});

export const ProposalSchema = z.object({
  inquiryId: z.string().uuid(),
  totalPrice: z.number().positive(),
  currency: z.enum(['INR', 'USD']).default('INR'),
  pricingBreakdown: z.array(z.object({
    description: z.string().min(1),
    amount: z.number().positive(),
    quantity: z.number().positive().default(1),
  })),
  projectScope: z.string().min(50),
  deliverables: z.array(z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    estimatedCompletionWeek: z.number().positive().optional(),
  })),
  nonInclusions: z.array(z.string()),
  estimatedDuration: z.string().min(1),
  includedRevisions: z.number().int().positive().default(2),
  revisionPolicy: z.string().min(1),
  paymentLink: z.string().url().optional(),
  paymentTerms: z.string().min(1),
});
```

---

## Relationships

### Entity Relationship Diagram

```
┌──────────┐
│ Inquiry  │
└────┬─────┘
     │
     │ 1:1
     │
     ↓
┌──────────┐       ┌───────────────────┐
│ Proposal │ ←──── │ ProposalFeedback  │
└────┬─────┘  1:N  └───────────────────┘
     │
     │ 1:N (versions)
     │
     ↓
┌──────────┐
│ Proposal │ (previous version)
└──────────┘

┌──────────┐       ┌──────────────┐
│ Inquiry  │ ←──── │ InquiryNote  │
└────┬─────┘  1:N  └──────────────┘
     │
     │ 1:1 (after conversion)
     │
     ↓
┌──────────┐
│ Project  │ (existing model)
└──────────┘
```

### Key Relationships

1. **Inquiry → Proposal**: One-to-One (current active proposal)
   - An inquiry can have one active proposal at a time
   - Older proposal versions are linked via `previousVersionId`

2. **Inquiry → InquiryNote**: One-to-Many
   - Multiple admins can add notes to an inquiry

3. **Proposal → ProposalFeedback**: One-to-Many
   - Multiple feedback rounds per proposal version

4. **Inquiry → Project**: One-to-One
   - After successful payment, inquiry is converted to project
   - `convertedToProjectId` links to existing Project model

5. **Proposal Versioning**: Linked List
   - Each new proposal version points to previous via `previousVersionId`
   - Latest version is the active one

---

## Validation Rules

### Inquiry Validation

| Field | Required | Min | Max | Format |
|-------|----------|-----|-----|--------|
| companyName | Yes | 1 | 255 | Any string |
| companyWebsite | No | - | - | Valid URL |
| contactName | Yes | 1 | 255 | Any string |
| contactEmail | Yes | - | - | Valid email |
| contactPhone | No | - | 50 | Phone format |
| referralSource | No | - | 255 | Any string |
| projectType | Yes | - | - | Enum value |
| projectDescription | Yes | 10 | 2000 | Any string |
| estimatedBudget | No | - | - | Enum value |
| desiredTimeline | No | - | - | Enum value |
| videoLength | No | - | - | Enum value |
| targetAudience | No | - | 500 | Any string |
| specificRequirements | No | - | 1000 | Any string |
| referenceLinks | No | - | 10 items | Array of valid URLs |
| utmSource | No | - | 255 | String (auto-captured) |
| utmMedium | No | - | 255 | String (auto-captured) |
| utmCampaign | No | - | 255 | String (auto-captured) |
| utmTerm | No | - | 255 | String (auto-captured) |
| utmContent | No | - | 255 | String (auto-captured) |

### Proposal Validation

| Field | Required | Min | Max | Format |
|-------|----------|-----|-----|--------|
| inquiryId | Yes | - | - | Valid UUID |
| totalPrice | Yes | > 0 | - | Number (cents) |
| pricingBreakdown | Yes | 1 item | 50 items | Array of PricingItem |
| projectScope | Yes | 50 | 5000 | String (markdown) |
| deliverables | Yes | 1 item | 20 items | Array of ProposalDeliverable |
| nonInclusions | No | - | 20 items | Array of strings |
| estimatedDuration | Yes | 1 | 100 | String |
| includedRevisions | Yes | 0 | 10 | Integer |
| revisionPolicy | Yes | 10 | 500 | String |
| paymentLink | No | - | - | Valid URL |
| paymentTerms | Yes | 10 | 500 | String |

### Business Rules

1. **Inquiry Status Transitions**
   ```
   new → reviewing → proposal_sent → negotiating → accepted → payment_pending → paid → converted

   Alternative exits:
   - Any state → rejected
   - Any state → archived
   ```

2. **Proposal Status Transitions**
   ```
   draft → sent → viewed → revision_requested → sent (new version)
                    ↓
                accepted → (payment) → (conversion)
   ```

3. **Pricing Validation**
   - `totalPrice` must equal sum of all `pricingBreakdown` items
   - Each `PricingItem.amount` must be positive
   - Currency must be valid ISO code (default USD)

4. **Deliverable Validation**
   - Each deliverable must have unique `id`
   - `estimatedCompletionWeek` must be positive if provided
   - At least one deliverable required per proposal

5. **Milestone Validation**
   - All `deliverableIds` must reference valid deliverables in the proposal
   - `order` must be unique and sequential
   - Estimated dates should be chronological

6. **Version Control**
   - When creating new proposal version:
     - Increment `version` number
     - Set `previousVersionId` to previous proposal ID
     - Mark old proposal as `superseded`
     - Generate new `reviewToken`

7. **Review Token Security**
   - Must be UUID v4
   - Must be unique across all proposals
   - Should expire after configurable period (optional)
   - Cannot be reused after proposal is accepted/rejected

---

## Example Data

### Sample Inquiry

```typescript
const sampleInquiry: Inquiry = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  inquiryNumber: "INQ-2025-042",
  status: "new",
  createdAt: new Date("2025-01-11T14:30:00Z"),
  updatedAt: new Date("2025-01-11T14:30:00Z"),

  companyName: "Acme Corporation",
  companyWebsite: "https://acme.com",
  contactName: "John Smith",
  contactEmail: "john@acme.com",
  contactPhone: "+1 (555) 123-4567",
  referralSource: "Google Search",

  projectType: "Product Demo / Explainer",
  projectDescription: "We need an explainer video showing how our SaaS platform helps teams collaborate remotely.",
  estimatedBudget: "$5,000 - $10,000",
  desiredTimeline: "Standard (1-2 months)",
  videoLength: "2-3 minutes",
  targetAudience: "B2B SaaS customers, team leads",
  specificRequirements: "Modern animation, upbeat music, professional voiceover",
  referenceLinks: ["https://youtube.com/watch?v=example1"],

  utmSource: "google",
  utmMedium: "cpc",
  utmCampaign: "winter-2025-saas",
  utmTerm: "explainer-video-company",
  utmContent: "text-ad-variant-a",

  assignedToAdminId: undefined,
  proposalId: undefined,
  convertedToProjectId: undefined,
  convertedAt: undefined,
};
```

### Sample Proposal

```typescript
const sampleProposal: Proposal = {
  id: "660e8400-e29b-41d4-a716-446655440001",
  inquiryId: "550e8400-e29b-41d4-a716-446655440000",
  proposalNumber: "PROP-2025-042",
  version: 1,
  status: "sent",
  createdAt: new Date("2025-01-11T16:00:00Z"),
  updatedAt: new Date("2025-01-11T16:00:00Z"),

  reviewToken: "770e8400-e29b-41d4-a716-446655440002",
  reviewUrl: "https://motionify.studio/proposal/review/770e8400-e29b-41d4-a716-446655440002",
  expiresAt: new Date("2025-03-12T16:00:00Z"), // 60 days from creation
  viewedAt: undefined,

  totalPrice: 800000, // ₹8,000.00 (800000 paise)
  currency: "INR",
  pricingBreakdown: [
    {
      id: "price-1",
      description: "Concept & Script Development",
      amount: 150000, // $1,500
      quantity: 1,
    },
    {
      id: "price-2",
      description: "Storyboarding",
      amount: 100000, // $1,000
      quantity: 1,
    },
    {
      id: "price-3",
      description: "Animation & Motion Graphics",
      amount: 450000, // $4,500
      quantity: 1,
    },
    {
      id: "price-4",
      description: "Professional Voiceover",
      amount: 50000, // $500
      quantity: 1,
    },
    {
      id: "price-5",
      description: "Sound Design & Music",
      amount: 50000, // $500
      quantity: 1,
    },
  ],

  projectScope: "We will create a 2-3 minute product explainer video showcasing your SaaS collaboration platform...",

  deliverables: [
    {
      id: "deliv-1",
      name: "Script & Concept",
      description: "Approved script and creative concept document",
      estimatedCompletionWeek: 1,
    },
    {
      id: "deliv-2",
      name: "Storyboard",
      description: "Visual outline of the entire video sequence",
      estimatedCompletionWeek: 2,
    },
    {
      id: "deliv-3",
      name: "First Draft Animation",
      description: "Initial version with voiceover and music for your review",
      estimatedCompletionWeek: 4,
    },
    {
      id: "deliv-4",
      name: "Final Video",
      description: "Completed video in multiple formats (1080p, 4K, social media sizes)",
      estimatedCompletionWeek: 6,
    },
  ],

  nonInclusions: [
    "Live action filming or on-location shooting",
    "3D animation or complex visual effects",
    "Multiple language versions",
    "Paid stock footage (client to provide or approve additional costs)",
  ],

  estimatedDuration: "6-8 weeks",

  milestones: [
    {
      id: "mile-1",
      name: "Pre-Production",
      description: "Script development and storyboarding",
      deliverableIds: ["deliv-1", "deliv-2"],
      estimatedDate: "Week 2",
      order: 1,
    },
    {
      id: "mile-2",
      name: "Animation Phase",
      description: "Creating animated video with voiceover and music",
      deliverableIds: ["deliv-3"],
      estimatedDate: "Week 4",
      order: 2,
    },
    {
      id: "mile-3",
      name: "Final Delivery",
      description: "Revisions and final video in all formats",
      deliverableIds: ["deliv-4"],
      estimatedDate: "Week 6",
      order: 3,
    },
  ],

  includedRevisions: 2,
  revisionPolicy: "Two rounds of revisions are included. Additional revisions can be requested at $500 per round.",

  paymentLink: "https://rzp.io/i/example-link",
  paymentTerms: "50% deposit (₹4,000) to begin work, 50% balance (₹4,000) upon final delivery",

  primaryContactName: "Sarah Johnson",

  acceptedAt: undefined,
  acceptedBy: undefined,
  previousVersionId: undefined,
  changesSinceLastVersion: undefined,
  additionalNotes: undefined,
};
```

---

## Integration with Existing Models

### Conversion to Project

When an inquiry is successfully converted to a project, the following mapping occurs:

```typescript
function convertInquiryToProject(
  inquiry: Inquiry,
  proposal: Proposal,
  customer: User
): Project {
  return {
    id: generateUUID(),
    name: `${inquiry.companyName} - ${inquiry.projectType}`,

    client: {
      name: inquiry.companyName,
      logoUrl: undefined, // To be added later
    },

    scope: {
      deliverables: proposal.deliverables.map(d => ({
        id: d.id,
        name: d.name,
        description: d.description,
        status: 'pending',
      })),
      nonInclusions: proposal.nonInclusions,
    },

    milestones: proposal.milestones, // Copy milestones from proposal

    totalRevisions: proposal.includedRevisions,
    usedRevisions: 0,

    tasks: [], // Created later by project manager

    clientTeam: [
      {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        role: 'PRIMARY_CONTACT',
        hasAgreed: true, // Terms already accepted with proposal
      },
    ],

    motionifyTeam: [], // Assigned by admin

    status: 'IN_PROGRESS',

    files: [],
    activities: [
      {
        id: generateUUID(),
        type: 'PROJECT_CREATED',
        userId: 'system',
        timestamp: Date.now(),
        description: `Project created from inquiry ${inquiry.inquiryNumber}`,
      },
    ],
  };
}
```

This ensures seamless transition from inquiry to active project with all proposal details preserved.

---

## Project Setup Model

Represents the project structure and payment terms configured by super admin before payment.

**Lifecycle & Relationship with ProjectPaymentStatus:**
- **Purpose:** Temporary staging model used during the project setup phase (inquiry status: 'project_setup')
- **Created:** When admin sets up project structure after proposal acceptance
- **Used:** To trigger payment request and store initial project configuration
- **Deleted:** After advance payment is received and ProjectPaymentStatus is created
- **Payment Data Flow:** Payment-related fields (totalAmount, advancePercentage, currency) are copied to ProjectPaymentStatus upon payment
- **Non-Payment Data:** Milestones and deliverables are copied to the actual Project model

**Single Source of Truth:**
- During setup phase: ProjectSetup holds payment terms
- After payment received: ProjectPaymentStatus (in payment-workflow) becomes the single source of truth for ALL payment data
- Project model holds milestones and deliverables

```typescript
export interface ProjectSetup {
  // Core Identification
  id: string;                          // UUID
  inquiryId: string;                   // UUID - Reference to parent inquiry
  proposalId: string;                  // UUID - Reference to accepted proposal

  // Payment Terms
  totalAmount: number;                 // Total project cost
  advancePercentage: number;           // Advance payment percentage (40, 50, 60, etc.)
  currency: CurrencyCode;              // 'INR' | 'USD'

  // Project Structure
  milestones: Milestone[];             // Project milestones with deliverables
  deliverables: Deliverable[];         // Project deliverables

  // Admin Tracking
  setupBy: string;                     // UUID - Super admin who set up the project
  setupAt: number;                     // Timestamp when setup was completed

  // Payment Request
  paymentRequestSent: boolean;         // Whether payment request email was sent
  paymentRequestSentAt: number | null; // Timestamp when payment request was sent
  paymentLink: string | null;          // Razorpay payment link

  // Metadata
  notes?: string;                      // Optional admin notes
  createdAt: number;
  updatedAt: number;
}
```

### Example ProjectSetup

```typescript
const sampleProjectSetup: ProjectSetup = {
  id: "aa0e8400-e29b-41d4-a716-446655440000",
  inquiryId: "550e8400-e29b-41d4-a716-446655440000",
  proposalId: "660e8400-e29b-41d4-a716-446655440001",

  totalAmount: 80000.00,
  advancePercentage: 50,               // 50% advance
  currency: "INR",

  milestones: [
    {
      id: "milestone-1",
      name: "Pre-Production",
      deliverables: ["script", "storyboard"],
      estimatedWeeks: 2,
    },
    {
      id: "milestone-2",
      name: "Production",
      deliverables: ["raw-footage"],
      estimatedWeeks: 3,
    },
  ],

  deliverables: [
    {
      id: "deliverable-1",
      name: "Final Video (4K)",
      description: "4K resolution final video",
      status: "pending",
    },
  ],

  setupBy: "990e8400-e29b-41d4-a716-446655440004",
  setupAt: Date.now(),

  paymentRequestSent: true,
  paymentRequestSentAt: Date.now(),
  paymentLink: "https://rzp.io/i/ABC123XYZ",

  notes: "Project scope confirmed with client during call",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
```
