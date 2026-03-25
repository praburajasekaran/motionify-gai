# Inquiry to Project - State Machine

This document defines the complete state machine for the inquiry-to-project conversion flow, including all possible states, transitions, triggers, and side effects.

---

## State Diagram

```
┌─────────────┐
│   new       │ ← Initial state when inquiry is created
└──────┬──────┘
       │
       │ Admin sends proposal
       ↓
┌─────────────┐
│  proposal   │ ← Proposal sent to customer
│   _sent     │
└──┬────────┬─┘
   │        │
   │        │ Customer rejects
   │        ↓
   │   ┌──────────┐
   │   │ rejected │ (Terminal state)
   │   └──────────┘
   │
   │ Customer accepts proposal
   ↓
┌─────────────┐
│  accepted   │ ← Customer agreed to proposal terms
└──────┬──────┘
       │
       │ Admin creates project structure
       ↓
┌─────────────┐
│  project_   │ ← Admin setting up milestones, deliverables, team
│   setup     │
└──────┬──────┘
       │
       │ Setup complete, admin sets payment terms
       ↓
┌─────────────┐
│  payment_   │ ← Payment request email sent to customer
│  pending    │
└──┬───────┬──┘
   │       │
   │       │ Payment abandoned/expired
   │       ↓
   │   ┌──────────┐
   │   │ archived │ (Terminal state)
   │   └──────────┘
   │
   │ Customer completes payment
   ↓
┌─────────────┐
│    paid     │ ← Payment received via Razorpay webhook
└──────┬──────┘
       │
       │ System automatically converts to project
       ↓
┌─────────────┐
│  converted  │ ← Successfully converted to full project (Terminal state)
└─────────────┘
```

---

## State Definitions

| State | Description | Who Controls | Typical Duration |
|-------|-------------|--------------|------------------|
| **new** | Inquiry just submitted by customer | System | Minutes to hours |
| **proposal_sent** | Proposal sent, awaiting customer decision | Customer | 1-7 days |
| **accepted** | Customer accepted proposal | Admin | Hours to 1 day |
| **project_setup** | Admin configuring project details | Admin | 1-3 days |
| **payment_pending** | Awaiting customer payment | Customer | 1-14 days |
| **paid** | Payment received, queued for conversion | System | Seconds |
| **converted** | Successfully converted to project | System | N/A (terminal) |
| **rejected** | Customer declined proposal | Customer | N/A (terminal) |
| **archived** | Closed without conversion | Admin | N/A (terminal) |

---

## State Transitions

### 1. new → proposal_sent
**Trigger:** Admin sends proposal via API

**API Endpoint:** `POST /api/admin/inquiries/{inquiryId}/proposal`

**Prerequisites:**
- Inquiry must be in 'new' state
- User must be super_admin
- Valid proposal data provided

**Side Effects:**
- Creates `proposals` record
- Sets inquiry.status = 'proposal_sent'
- Sends proposal email to customer
- Creates notification for customer
- Logs activity: "PROPOSAL_SENT"

**Database Changes:**
```sql
-- Insert into proposals table
INSERT INTO proposals (...) VALUES (...);

-- Update inquiry status
UPDATE inquiries
SET status = 'proposal_sent', updated_at = NOW()
WHERE id = :inquiry_id;
```

---

### 2. proposal_sent → accepted
**Trigger:** Customer accepts proposal

**API Endpoint:** `POST /api/proposals/{proposalId}/accept`

**Prerequisites:**
- Inquiry must be in 'proposal_sent' state
- User must be the customer who submitted inquiry
- Proposal must not be expired

**Side Effects:**
- Sets inquiry.status = 'accepted'
- Creates preliminary project terms
- Sends acceptance notification to admin
- Logs activity: "PROPOSAL_ACCEPTED"

**Database Changes:**
```sql
-- Update inquiry status
UPDATE inquiries
SET status = 'accepted', updated_at = NOW()
WHERE id = :inquiry_id;

-- Update proposal
UPDATE proposals
SET status = 'accepted', accepted_at = NOW()
WHERE id = :proposal_id;
```

---

### 3. proposal_sent → rejected
**Trigger:** Customer rejects proposal

**API Endpoint:** `POST /api/proposals/{proposalId}/reject`

**Prerequisites:**
- Inquiry must be in 'proposal_sent' state
- User must be the customer who submitted inquiry

**Side Effects:**
- Sets inquiry.status = 'rejected'
- Sends rejection notification to admin
- Logs activity: "PROPOSAL_REJECTED"

**Database Changes:**
```sql
-- Update inquiry status (terminal state)
UPDATE inquiries
SET status = 'rejected', updated_at = NOW()
WHERE id = :inquiry_id;

-- Update proposal
UPDATE proposals
SET status = 'rejected', rejected_at = NOW(), rejection_reason = :reason
WHERE id = :proposal_id;
```

**Terminal State:** Yes - no further transitions possible

---

### 4. accepted → project_setup
**Trigger:** Admin starts project setup process

**API Endpoint:** `POST /api/admin/inquiries/{inquiryId}/start-setup`

**Prerequisites:**
- Inquiry must be in 'accepted' state
- User must be super_admin

**Side Effects:**
- Sets inquiry.status = 'project_setup'
- Admin can configure project details (milestones, deliverables, team)
- Logs activity: "PROJECT_SETUP_STARTED"

**Database Changes:**
```sql
-- Update inquiry status
UPDATE inquiries
SET status = 'project_setup', updated_at = NOW()
WHERE id = :inquiry_id;
```

---

### 5. project_setup → payment_pending
**Trigger:** Admin completes setup and sends payment request

**API Endpoint:** `POST /api/admin/inquiries/{inquiryId}/request-payment`

**Prerequisites:**
- Inquiry must be in 'project_setup' state
- User must be super_admin
- Payment terms must be configured (total amount, advance percentage, currency)

**Side Effects:**
- Sets inquiry.status = 'payment_pending'
- Creates `project_payment_status` record (temporary until payment received)
- Generates Razorpay payment link
- Sends payment request email to customer
- Logs activity: "PAYMENT_REQUEST_SENT"

**Database Changes:**
```sql
-- Update inquiry status
UPDATE inquiries
SET status = 'payment_pending', updated_at = NOW()
WHERE id = :inquiry_id;

-- Create project payment status (temporary)
INSERT INTO project_payment_status (...)
VALUES (...);
```

---

### 6. payment_pending → paid
**Trigger:** Razorpay webhook confirms payment

**API Endpoint:** `POST /api/webhooks/razorpay` (webhook)

**Prerequisites:**
- Inquiry must be in 'payment_pending' state
- Valid Razorpay webhook signature
- Payment status = 'captured'

**Side Effects:**
- Sets inquiry.status = 'paid'
- Creates `payments` record
- Updates `project_payment_status`
- Prepares for automatic conversion
- Logs activity: "PAYMENT_RECEIVED"

**Database Changes:**
```sql
-- Update inquiry status
UPDATE inquiries
SET status = 'paid', updated_at = NOW()
WHERE id = :inquiry_id;

-- Create payment record
INSERT INTO payments (...)
VALUES (...);

-- Update project payment status
UPDATE project_payment_status
SET payment_status = 'ADVANCE_PAID', paid_amount = :amount
WHERE project_id = :temp_project_id;
```

**⚠️ IMPORTANT:** This state is very short-lived. The system immediately triggers conversion to project.

---

### 7. paid → converted
**Trigger:** Automatic system conversion after payment

**API Endpoint:** Internal process (triggered by webhook)

**Prerequisites:**
- Inquiry must be in 'paid' state
- Payment successfully recorded

**Side Effects:**
- **Creates full `projects` record** (migrates from inquiry/proposal data)
- **Creates `deliverables` records** (from proposal deliverables, preserving IDs)
- **Creates customer user account** (if doesn't exist)
- **Creates `project_team` entry** (customer as primary contact)
- **Creates `project_terms`** and marks as accepted
- **Migrates `project_payment_status`** to permanent project
- Sends welcome email with portal access magic link
- Sets inquiry.status = 'converted'
- Deletes temporary setup data (ProjectSetup model if exists)
- Logs activity: "INQUIRY_CONVERTED_TO_PROJECT"

**Database Changes:**
```sql
-- Create project record
INSERT INTO projects (
  id,  -- NEW UUID (NOT from inquiry)
  -- ... populated from proposal data
) VALUES (...);

-- Create deliverables (preserving IDs from proposal)
INSERT INTO deliverables (
  id,  -- PRESERVED from proposal.deliverables[].id
  project_id,
  name,
  description,
  -- ... other fields from proposal
) SELECT * FROM proposal_deliverables WHERE proposal_id = :proposal_id;

-- Create customer user (if not exists)
INSERT INTO users (email, full_name, role, ...)
VALUES (:customer_email, :customer_name, 'client', ...)
ON CONFLICT (email) DO NOTHING;

-- Add to project team
INSERT INTO project_team (project_id, user_id, role, is_primary_contact)
VALUES (:project_id, :customer_user_id, 'client', true);

-- Create project terms
INSERT INTO project_terms (project_id, content, ...)
VALUES (:project_id, :terms_content, ...);

-- Mark terms as accepted
INSERT INTO project_terms_acceptance (...)
VALUES (...);

-- Update project payment status
UPDATE project_payment_status
SET project_id = :new_project_id
WHERE project_id = :temp_project_id;

-- Update inquiry status (terminal state)
UPDATE inquiries
SET status = 'converted', converted_project_id = :project_id, updated_at = NOW()
WHERE id = :inquiry_id;
```

**Terminal State:** Yes - inquiry lifecycle complete, project lifecycle begins

---

### 8. payment_pending → archived
**Trigger:** Admin manually archives inquiry (payment abandoned)

**API Endpoint:** `POST /api/admin/inquiries/{inquiryId}/archive`

**Prerequisites:**
- Inquiry must be in 'payment_pending' or 'proposal_sent' state
- User must be super_admin

**Side Effects:**
- Sets inquiry.status = 'archived'
- Cancels any pending payment links
- Sends notification to admin
- Logs activity: "INQUIRY_ARCHIVED"

**Database Changes:**
```sql
-- Update inquiry status (terminal state)
UPDATE inquiries
SET status = 'archived', updated_at = NOW()
WHERE id = :inquiry_id;

-- Cancel payment request if exists
UPDATE project_payment_status
SET payment_status = 'CANCELLED'
WHERE inquiry_id = :inquiry_id;
```

**Terminal State:** Yes - no further transitions possible

---

## State Validation Rules

### Cannot Transition Backwards
Once an inquiry moves forward in the flow, it generally cannot go backwards. Exceptions:
- Admin can archive from 'payment_pending' or 'proposal_sent'

### Terminal States
These states cannot transition to any other state:
- `rejected` - Customer declined
- `archived` - Admin closed inquiry
- `converted` - Successfully became a project

### Automatic Transitions
These transitions happen automatically without API calls:
- `paid` → `converted` (system-triggered immediately after payment)

---

## State Persistence

### Inquiry Table
Primary state is stored in `inquiries.status` field with CHECK constraint:

```sql
CONSTRAINT valid_inquiry_status CHECK (
  status IN (
    'new',
    'proposal_sent',
    'accepted',
    'project_setup',
    'payment_pending',
    'paid',
    'converted',
    'rejected',
    'archived'
  )
)
```

### Related Data Lifecycle

| Data | Created When | Deleted When | Persists After Conversion |
|------|-------------|--------------|---------------------------|
| `inquiries` | State: new | Never (audit trail) | ✅ Yes |
| `proposals` | State: proposal_sent | Never (audit trail) | ✅ Yes |
| `project_setup` (app layer) | State: project_setup | State: converted | ❌ No (temporary) |
| `project_payment_status` | State: payment_pending | Never | ✅ Yes (updated with project_id) |
| `projects` | State: converted | Only if deleted by admin | ✅ Yes |
| `deliverables` | State: converted | Only if deleted by admin | ✅ Yes |

---

## Common Issues & Troubleshooting

### Issue: Inquiry stuck in 'payment_pending'
**Cause:** Customer didn't complete payment
**Solution:** Admin can manually archive or resend payment request

### Issue: Inquiry stuck in 'paid'
**Cause:** Conversion process failed
**Solution:** Check logs, retry conversion process manually

### Issue: Customer can't find proposal
**Cause:** Email went to spam or wrong email address
**Solution:** Admin can resend proposal via API

### Issue: Duplicate conversion
**Cause:** Webhook received multiple times
**Solution:** System checks if inquiry.status is already 'converted' before processing

---

## Query Examples

### Get all inquiries awaiting customer action
```sql
SELECT * FROM inquiries
WHERE status IN ('proposal_sent', 'payment_pending')
ORDER BY updated_at ASC;
```

### Get conversion rate by time period
```sql
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) FILTER (WHERE status = 'converted') as converted,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'converted') / COUNT(*), 2) as conversion_rate
FROM inquiries
GROUP BY month
ORDER BY month DESC;
```

### Get stuck inquiries (no update in 30 days)
```sql
SELECT * FROM inquiries
WHERE status NOT IN ('converted', 'rejected', 'archived')
  AND updated_at < NOW() - INTERVAL '30 days'
ORDER BY updated_at ASC;
```

---

**Last Updated:** 2025-11-19
**Maintained By:** Development Team
**Version:** 1.0
