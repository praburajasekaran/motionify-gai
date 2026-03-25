# Inquiry to Proposal Flow - Implementation Plan

## Goal Description

Implement the complete end-to-end flow from client project inquiry submission to automatic project creation:

1. Client submits project inquiry via quiz form on landing page → Creates inquiry
2. Super admin views inquiry in portal → Creates scope, deliverables, pricing proposal
3. Admin sends proposal via portal → Email triggered to client
4. Client reviews proposal (public page via email link) → Accepts or requests changes
5. Client makes payment via Razorpay → Account auto-created, project created
6. Client receives welcome email with magic link to portal access

> [!NOTE]
> Using the existing **Next.js `landing-page-new`** infrastructure which already has:
> - Quiz component (to be extended for inquiries)
> - Portal with auth (magic link)
> - API routes structure
> - Project/User types

---

## User Review Required

> [!IMPORTANT]
> **Razorpay Keys Required**: Please provide test credentials:
> - `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`

> [!IMPORTANT]
> **Database Decision**: Currently using mock data. For production:
> - Option A: Add PostgreSQL (Neon) + Prisma
> - Option B: Use Supabase
> - Option C: Continue with localStorage/mock for MVP demo

---

## Proposed Changes

### Phase 1: Extend Quiz for Project Inquiries

#### [MODIFY] [Quiz.tsx](file:///Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/landing-page-new/src/components/Quiz/Quiz.tsx)

Extend the existing Quiz with additional inquiry fields (or create parallel InquiryQuiz):
- Add contact info step: Company name, email, name, phone
- Modify questions to match the documented inquiry flow
- On submit: Create inquiry via API, show success with inquiry number

#### [NEW] [inquiry/route.ts](file:///Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/landing-page-new/src/app/api/inquiry/route.ts)

API endpoint for inquiry submission:
```typescript
POST /api/inquiry
- Validate contact info + project details
- Generate inquiry number (INQ-YYYY-NNN)
- Store inquiry (mock or database)
- Send confirmation email
- Return success with inquiry number
```

---

### Phase 2: Admin Inquiry Dashboard

#### [NEW] [inquiries/page.tsx](file:///Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/landing-page-new/src/app/portal/inquiries/page.tsx)

Admin inquiry list:
- List all inquiries with status badges
- Filter by status (new, proposal_sent, accepted, etc.)
- Click to view details

#### [NEW] [inquiries/[id]/page.tsx](file:///Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/landing-page-new/src/app/portal/inquiries/[id]/page.tsx)

Inquiry detail view:
- Display all inquiry info
- "Create Proposal" button

#### [NEW] [inquiries/[id]/proposal/page.tsx](file:///Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/landing-page-new/src/app/portal/inquiries/[id]/proposal/page.tsx)

Proposal creation form:
- Add deliverables (name, description, format, timeline)
- Set total price and currency (INR/USD)
- Set payment terms (advance %)
- Preview proposal
- "Send Proposal" → Triggers email to client

---

### Phase 3: Public Proposal Review

#### [NEW] [proposal/[token]/page.tsx](file:///Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/landing-page-new/src/app/proposal/[token]/page.tsx)

Public proposal view (no login required, token-based):
- Display proposal details, scope, pricing
- "Accept & Proceed to Payment" button
- "Request Changes" button → Modal with feedback form

#### [NEW] [api/proposal/[token]/route.ts](file:///Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/landing-page-new/src/app/api/proposal/[token]/route.ts)

```typescript
GET /api/proposal/:token - Fetch proposal by review token
POST /api/proposal/:token/accept - Accept proposal
POST /api/proposal/:token/feedback - Submit change request
```

---

### Phase 4: Razorpay Payment

#### [NEW] [api/payment/create-order/route.ts](file:///Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/landing-page-new/src/app/api/payment/create-order/route.ts)

Create Razorpay order for advance payment

#### [NEW] [api/webhooks/razorpay/route.ts](file:///Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/landing-page-new/src/app/api/webhooks/razorpay/route.ts)

Handle Razorpay webhook:
- Verify signature
- On payment.captured:
  - Create user account
  - Create project with deliverables from proposal
  - Add client to project team
  - Send welcome email with magic link

#### [NEW] [payment/success/page.tsx](file:///Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/landing-page-new/src/app/payment/success/page.tsx)

Payment confirmation page with next steps

---

### Phase 5: Types and Data

#### [MODIFY] [types.ts](file:///Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/landing-page-new/src/lib/portal/types.ts)

Add Inquiry and Proposal types:

```typescript
export interface Inquiry {
  id: string;
  inquiryNumber: string;
  status: InquiryStatus;
  companyName: string;
  contactName: string;
  contactEmail: string;
  projectType: string;
  projectDescription: string;
  estimatedBudget?: string;
  createdAt: string;
}

export interface Proposal {
  id: string;
  inquiryId: string;
  totalPrice: number;
  currency: 'INR' | 'USD';
  deliverables: ProposalDeliverable[];
  status: ProposalStatus;
  reviewToken: string;
  expiresAt: string;
}
```

#### [MODIFY] [data.ts](file:///Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/landing-page-new/src/lib/portal/data.ts)

Add mock inquiries and proposals for development

---

## Verification Plan

### Manual Testing

1. **Inquiry Flow**: Submit quiz → Verify success page with inquiry number
2. **Admin View**: Log in as admin → See inquiry in list → Open details
3. **Proposal Creation**: Create proposal with deliverables → Send to client
4. **Proposal Review**: Open proposal link → Verify details → Accept
5. **Payment**: Complete Razorpay test payment (card: 4111 1111 1111 1111)
6. **Account Creation**: Verify user created → Login with magic link → See project

---

## File Structure Summary

```
landing-page-new/src/
├── app/
│   ├── api/
│   │   ├── inquiry/route.ts             [NEW]
│   │   ├── proposal/[token]/route.ts    [NEW]
│   │   ├── payment/create-order/route.ts [NEW]
│   │   └── webhooks/razorpay/route.ts   [NEW]
│   ├── portal/
│   │   └── inquiries/                   [NEW]
│   │       ├── page.tsx
│   │       └── [id]/
│   │           ├── page.tsx
│   │           └── proposal/page.tsx
│   ├── proposal/
│   │   └── [token]/page.tsx             [NEW]
│   └── payment/
│       └── success/page.tsx             [NEW]
├── components/
│   └── Quiz/Quiz.tsx                    [MODIFY]
└── lib/portal/
    ├── types.ts                         [MODIFY]
    └── data.ts                          [MODIFY]
```

---

## Implementation Order

1. **Start with mock data** - Add inquiry/proposal types and mock data
2. **Build inquiry submission** - Extend Quiz, add API route
3. **Build admin views** - Inquiry list, detail, proposal creation
4. **Build public proposal page** - Token-based view, accept/reject
5. **Add Razorpay** - Payment flow with test mode
6. **Connect project creation** - Auto-create on payment success
