# Complete Proposal Acceptance Flow

This document describes the end-to-end flow from initial inquiry through proposal acceptance, project creation, terms acceptance, and payment. This clarifies how the inquiry-to-project feature integrates with project-terms-acceptance and payment-workflow.

---

## Overview Flow Diagram

```
Customer          Admin              System              Features Involved
   │                │                   │
   │                │                   │
   ├─ Submit       │                   │                inquiry-to-project
   │  Inquiry      │                   │
   │ ─────────────>│                   │
   │                │                   │
   │                │                   │
   │                ├─ Create          │                inquiry-to-project
   │                │  Proposal        │
   │                ├──────────────────>│
   │                │                   │
   │<───────────────┤                   │
   │  Proposal      │                   │
   │  Email         │                   │
   │                │                   │
   ├─ Accept       │                   │                inquiry-to-project
   │  Proposal      │                   │
   │ ───────────────>                   │
   │                │                   │
   │                │                   │
   │                ├─ Setup           │                inquiry-to-project
   │                │  Project          │
   │                │  (milestones,     │
   │                │   deliverables)   │
   │                │                   │
   │                │                   │
   │                ├─ Set Payment     │                payment-workflow
   │                │  Terms            │
   │                ├──────────────────>│
   │<───────────────┤                   │
   │  Payment       │                   │
   │  Request       │                   │
   │                │                   │
   ├─ Complete     │                   │                payment-workflow
   │  Payment       │                   │
   │ ───────────────────────────────────>
   │                │                   │
   │                │                   ├─ Convert      inquiry-to-project
   │                │                   │  to Project    + core-foundation
   │                │                   │  • Create      + project-terms
   │                │                   │    project     + team-management
   │                │                   │  • Create      + payment-workflow
   │                │                   │    deliverables
   │                │                   │  • Create user
   │                │                   │  • Create terms
   │                │                   │  • Add to team
   │<───────────────┴───────────────────┤
   │  Welcome Email                     │
   │  (Magic Link)                      │
   │                │                   │
```

---

## Detailed Step-by-Step Flow

### Step 1: Customer Submits Inquiry

**Feature:** inquiry-to-project

**Actor:** Customer (anonymous, no account yet)

**Endpoint:** `POST /api/inquiries`

**Request:**
```json
{
  "companyName": "Acme Corp",
  "contactName": "John Doe",
  "email": "john@acmecorp.com",
  "phone": "+1234567890",
  "projectType": "Product Demo / Explainer",
  "budget": "$10,000 - $25,000",
  "timeline": "Standard (1-2 months)",
  "description": "We need a product explainer video..."
}
```

**Database:**
```sql
INSERT INTO inquiries (
  id, company_name, contact_name, email, phone,
  project_type, budget, timeline, description, status
) VALUES (
  gen_random_uuid(), 'Acme Corp', 'John Doe', 'john@acmecorp.com', ...
  'new'  -- Initial status
);
```

**Side Effects:**
- Inquiry record created with status = 'new'
- Notification sent to admin team
- Auto-response email sent to customer

---

### Step 2: Admin Creates & Sends Proposal

**Feature:** inquiry-to-project

**Actor:** Super Admin

**Endpoint:** `POST /api/admin/inquiries/{inquiryId}/proposal`

**Request:**
```json
{
  "totalPrice": 8000000,  // ₹80,000 in paise
  "currency": "INR",
  "deliverables": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",  // ⚠️ ID generated here, preserved through conversion
      "name": "Product Explainer Video",
      "description": "60-second explainer highlighting key features",
      "format": "MP4, 1080p, 4K",
      "estimatedCompletionWeek": 6
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Social Media Cuts",
      "description": "30-second cuts for Instagram and TikTok",
      "format": "MP4, 1080p, vertical",
      "estimatedCompletionWeek": 7
    }
  ],
  "proposalNotes": "Based on our discussion, this package includes..."
}
```

**Database:**
```sql
-- Create proposal
INSERT INTO proposals (
  id, inquiry_id, total_price, currency,
  deliverables,  -- JSONB array with IDs
  proposal_notes, status, created_by
) VALUES (
  gen_random_uuid(), :inquiry_id, 8000000, 'INR',
  :deliverables_json, :notes, 'sent', :admin_id
);

-- Update inquiry status
UPDATE inquiries
SET status = 'proposal_sent'
WHERE id = :inquiry_id;
```

**Side Effects:**
- Proposal email sent to customer with accept/reject links
- Inquiry status changed to 'proposal_sent'

**⚠️ IMPORTANT ID PRESERVATION:**
The deliverable IDs generated here (`550e8400...`) are preserved through the entire flow:
- Stored in `proposals.deliverables` JSONB
- Copied to `project_terms.content.deliverables` JSONB
- Used as primary keys when creating `deliverables` table records

---

### Step 3: Customer Accepts Proposal

**Feature:** inquiry-to-project

**Actor:** Customer (via magic link in email, no login required)

**Endpoint:** `POST /api/proposals/{proposalId}/accept`

**Request:**
```json
{
  "token": "proposal_accept_token_12345",  // From email link
  "acceptedAt": "2025-11-19T10:30:00Z"
}
```

**Database:**
```sql
-- Update proposal
UPDATE proposals
SET status = 'accepted', accepted_at = NOW()
WHERE id = :proposal_id;

-- Update inquiry
UPDATE inquiries
SET status = 'accepted'
WHERE id = :inquiry_id;
```

**Side Effects:**
- Inquiry status changed to 'accepted'
- Notification sent to admin team
- Acceptance confirmation email sent to customer

---

### Step 4: Admin Sets Up Project Structure

**Feature:** inquiry-to-project

**Actor:** Super Admin

**Endpoint:** `POST /api/admin/inquiries/{inquiryId}/start-setup`

This is an internal transition - admin works in the admin panel configuring:
- Project milestones
- Deliverable details (beyond what's in proposal)
- Team assignments (which admins will work on this)
- Timeline adjustments

**Database:**
```sql
-- Update inquiry status
UPDATE inquiries
SET status = 'project_setup'
WHERE id = :inquiry_id;

-- Application layer may create temporary ProjectSetup model
-- (This is NOT in database, just in-memory or session storage)
```

**No database tables created yet** - this is preparation phase

---

### Step 5: Admin Sets Payment Terms & Sends Payment Request

**Feature:** payment-workflow (integrated with inquiry-to-project)

**Actor:** Super Admin

**Endpoint:** `POST /api/admin/inquiries/{inquiryId}/payment-terms`

**Request:**
```json
{
  "totalAmount": 8000000,  // Must match proposal.total_price
  "advancePercentage": 50,
  "currency": "INR",
  "sendPaymentRequest": true
}
```

**Database:**
```sql
-- Update inquiry status
UPDATE inquiries
SET status = 'payment_pending'
WHERE id = :inquiry_id;

-- Create temporary project payment status (before project exists)
INSERT INTO project_payment_status (
  project_id,  -- ⚠️ Temporary UUID, will be updated after conversion
  payment_status, currency,
  total_amount, advance_percentage,
  advance_amount, balance_amount,
  paid_amount, remaining_amount
) VALUES (
  gen_random_uuid(),  -- Temp ID
  'PENDING_ADVANCE', 'INR',
  8000000, 50,
  4000000, 4000000,  -- Calculated
  0, 8000000
);
```

**Side Effects:**
- Razorpay payment link generated
- Payment request email sent to customer with link
- Inquiry status changed to 'payment_pending'

---

### Step 6: Customer Completes Payment

**Feature:** payment-workflow

**Actor:** Customer

**Flow:**
1. Customer clicks payment link in email
2. Redirected to Razorpay hosted checkout
3. Customer completes payment (UPI/Card/Net Banking)
4. Razorpay sends webhook to system

**Endpoint:** `POST /api/webhooks/razorpay` (webhook)

**Webhook Payload:**
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_12345ABCDE",
        "order_id": "order_ABC123",
        "amount": 4000000,  // In paise
        "currency": "INR",
        "status": "captured",
        "method": "upi"
      }
    }
  }
}
```

**Database:**
```sql
-- Create payment record
INSERT INTO payments (
  id, project_id, type, status, amount, currency,
  razorpay_order_id, razorpay_payment_id,
  payment_method, initiated_by, completed_at
) VALUES (
  gen_random_uuid(), :temp_project_id, 'ADVANCE', 'COMPLETED',
  4000000, 'INR', 'order_ABC123', 'pay_12345ABCDE',
  'UPI', :customer_id, NOW()
);

-- Update inquiry status (very brief state)
UPDATE inquiries
SET status = 'paid'
WHERE id = :inquiry_id;

-- Update project payment status
UPDATE project_payment_status
SET payment_status = 'ADVANCE_PAID',
    paid_amount = 4000000,
    remaining_amount = 4000000,
    advance_payment_id = :payment_id,
    advance_paid_at = NOW()
WHERE project_id = :temp_project_id;
```

**⚠️ CRITICAL:** The 'paid' status triggers immediate conversion (next step)

---

### Step 7: System Auto-Converts to Project

**Feature:** inquiry-to-project + core-foundation + project-terms-acceptance + team-management + payment-workflow

**Actor:** System (automatic, triggered by payment webhook)

**Internal Process:** (No external API call)

This is the most complex step - it creates the full project structure.

#### 7.1: Create Project Record

**Database:**
```sql
-- Create main project record
INSERT INTO projects (
  id,  -- ⚠️ NEW UUID (not from inquiry)
  name,  -- From inquiry.company_name or proposal
  description,  -- From proposal
  status,
  total_revisions,  -- Default from system config
  used_revisions,
  created_at
) VALUES (
  gen_random_uuid(),  -- New project ID
  'Acme Corp Product Explainer',
  :proposal_description,
  'active',
  3,  -- Default revision quota
  0,
  NOW()
);
```

#### 7.2: Create Deliverables (Preserving IDs)

**Database:**
```sql
-- Create deliverables from proposal, PRESERVING THE IDs
INSERT INTO deliverables (
  id,  -- ⚠️ PRESERVED from proposal.deliverables[].id
  project_id,
  name,
  description,
  format,
  estimated_completion_week,
  status,
  display_order,
  balance_payment_required
) VALUES
  (
    '550e8400-e29b-41d4-a716-446655440001',  -- FROM PROPOSAL
    :new_project_id,
    'Product Explainer Video',
    '60-second explainer...',
    'MP4, 1080p, 4K',
    6,
    'pending',
    1,
    true
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002',  -- FROM PROPOSAL
    :new_project_id,
    'Social Media Cuts',
    '30-second cuts...',
    'MP4, 1080p, vertical',
    7,
    'pending',
    2,
    true
  );
```

**Why ID Preservation Matters:**
- Customer sees these deliverable IDs in proposal
- Same IDs appear in project terms
- Same IDs used in actual deliverables table
- Maintains referential integrity across the entire flow

#### 7.3: Create/Link Customer User Account

**Database:**
```sql
-- Create customer user (if doesn't exist)
INSERT INTO users (
  id, email, full_name, role,
  email_verified, email_verified_at
) VALUES (
  gen_random_uuid(),
  'john@acmecorp.com',  -- From inquiry
  'John Doe',  -- From inquiry
  'client',
  true,  -- ⚠️ Auto-verified since they completed payment
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET email_verified = true,  -- Verify if wasn't before
    email_verified_at = NOW();
```

#### 7.4: Add Customer to Project Team

**Feature:** team-management

**Database:**
```sql
-- Add customer as primary contact
INSERT INTO project_team (
  id, project_id, user_id, role, is_primary_contact
) VALUES (
  gen_random_uuid(),
  :new_project_id,
  :customer_user_id,
  'client',
  true  -- Primary contact
);
```

#### 7.5: Create Project Terms & Mark as Accepted

**Feature:** project-terms-acceptance

**Database:**
```sql
-- Create project terms document
INSERT INTO project_terms (
  id, project_id, terms_type, content, created_by
) VALUES (
  gen_random_uuid(),
  :new_project_id,
  'initial',
  jsonb_build_object(
    'projectName', 'Acme Corp Product Explainer',
    'totalCost', 8000000,
    'currency', 'INR',
    'advancePercentage', 50,
    'deliverables', :deliverables_from_proposal,  -- ⚠️ Same IDs
    'revisionPolicy', 'Up to 3 revisions included',
    'paymentTerms', 'Advance: 50%, Balance: 50% before final delivery'
  ),
  :admin_id
);

-- Auto-accept terms (customer accepted proposal, which becomes terms)
INSERT INTO project_terms_acceptance (
  id, project_terms_id, project_id, user_id,
  is_primary_contact, ip_address,
  user_agent, accepted_at
) VALUES (
  gen_random_uuid(),
  :terms_id,
  :new_project_id,
  :customer_user_id,
  true,
  :customer_ip,
  :customer_user_agent,
  NOW()
);

-- Update project with accepted terms
UPDATE projects
SET accepted_terms_id = :terms_id
WHERE id = :new_project_id;
```

#### 7.6: Update Payment Status with Real Project ID

**Feature:** payment-workflow

**Database:**
```sql
-- Update project payment status with real project ID
UPDATE project_payment_status
SET project_id = :new_project_id  -- Replace temp ID
WHERE project_id = :temp_project_id;

-- Update payment record with real project ID
UPDATE payments
SET project_id = :new_project_id
WHERE project_id = :temp_project_id;
```

#### 7.7: Finalize Inquiry Conversion

**Database:**
```sql
-- Mark inquiry as converted (terminal state)
UPDATE inquiries
SET status = 'converted',
    converted_project_id = :new_project_id
WHERE id = :inquiry_id;
```

**Side Effects:**
- Welcome email sent to customer with magic link for portal access
- Notification sent to admin team
- Activity log created: "INQUIRY_CONVERTED_TO_PROJECT"

---

## Step 8: Customer Accesses Project Portal

**Feature:** authentication-system

**Actor:** Customer

**Flow:**
1. Customer clicks magic link in welcome email
2. System creates session (no password needed for first login)
3. Customer lands on project dashboard
4. Customer can see:
   - Project details
   - Deliverables (same IDs from proposal)
   - Payment status (advance paid, balance pending)
   - Project terms (already accepted)

---

## Data Relationship Diagram

```
┌─────────────┐
│  inquiries  │
│  status:    │
│  converted  │
└──────┬──────┘
       │
       │ has one
       ↓
┌─────────────┐
│  proposals  │
│  deliverable│─────┐
│  IDs: [     │     │
│   550e8..., │     │
│   550e8...  │     │
│  ]          │     │
└─────────────┘     │
                    │ IDs preserved
                    │
       ┌────────────┴──────────┐
       │                       │
       ↓                       ↓
┌─────────────┐       ┌──────────────┐
│  projects   │       │ deliverables │
│             │◄──────┤ id: 550e8... │
│ id: NEW UUID│       │ id: 550e8... │
└──────┬──────┘       └──────────────┘
       │                       ▲
       │                       │
       │ has one               │ references same IDs
       ↓                       │
┌─────────────┐       ┌──────────────┐
│project_terms│       │              │
│ content: {  │───────┘              │
│   deliverables: [                  │
│     {id: 550e8...},                │
│     {id: 550e8...}                 │
│   ]                                │
│ }                                  │
└─────────────┘                      │
                                     │
┌─────────────────────────────────┐  │
│    project_payment_status       │  │
│    project_id: (updated)        │  │
│    payment_status: ADVANCE_PAID │  │
└─────────────────────────────────┘  │
                                     │
┌─────────────────────────────────┐  │
│    project_team                 │  │
│    user: customer               │  │
│    is_primary_contact: true     │  │
└─────────────────────────────────┘
```

---

## Key Timing Expectations

| Step | Typical Duration | Max Acceptable |
|------|------------------|----------------|
| 1. Customer submits inquiry | Instant | - |
| 2. Admin creates proposal | 1-2 days | 5 days |
| 3. Customer accepts proposal | 1-7 days | 14 days |
| 4. Admin sets up project | 1-2 days | 5 days |
| 5. Payment request sent | Instant | - |
| 6. Customer completes payment | 1-7 days | 30 days |
| 7. System converts to project | **< 5 seconds** | 30 seconds |
| 8. Customer receives welcome email | **< 30 seconds** | 2 minutes |

**⚠️ CRITICAL:** Steps 7-8 must be fast - customer is waiting!

---

## Error Handling

### Payment Succeeds but Conversion Fails

**Scenario:** Webhook received payment but conversion threw error

**Detection:**
```sql
SELECT * FROM inquiries
WHERE status = 'paid'
  AND updated_at < NOW() - INTERVAL '5 minutes';
```

**Recovery:**
- Check logs for conversion error
- Fix underlying issue
- Manually trigger conversion
- Ensure customer isn't double-charged

### Customer Pays but Never Receives Email

**Scenario:** Conversion succeeded but email failed

**Detection:** Check email queue logs

**Recovery:**
- Resend welcome email with magic link
- Customer can use "forgot password" to access

### Deliverable ID Mismatch

**Scenario:** IDs in deliverables table don't match proposal

**Prevention:**
- Always use IDs from `proposals.deliverables` JSONB
- Never generate new IDs during conversion
- Validate IDs before creating deliverables

---

**Last Updated:** 2025-11-19
**Maintained By:** Development Team
**Version:** 1.0
