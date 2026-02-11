# User Journey: Project Deliverables & Approval Workflow

## Complete Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DELIVERABLE APPROVAL WORKFLOW                         │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1: Project Created (from Inquiry Conversion)
    ↓
System auto-creates deliverables from proposal.deliverables[]
Status: 'pending'
    ↓

STEP 2: Team Starts Work
    ↓
Admin updates deliverable status: 'pending' → 'in_progress'
    ↓

STEP 3: Beta Delivery Upload
    ↓
Admin uploads beta file (with watermark, limited resolution)
System automatically:
  - Applies watermark
  - Stores in Cloudflare R2
  - Updates status: 'in_progress' → 'beta_ready' → 'awaiting_approval'
  - Sends email to PRIMARY_CONTACT
    ↓

STEP 4: Client Reviews Beta
    ↓
Client logs into portal
Views deliverable in "Awaiting Approval" state
Downloads beta file (watermarked)
    ↓
┌─────────────────────┬─────────────────────┐
│    CLIENT APPROVES  │   CLIENT REJECTS    │
└──────────┬──────────┴──────────┬──────────┘
           ↓                     ↓
    
    APPROVAL PATH              REJECTION PATH
           ↓                        ↓
Status: 'approved'          Status: 'rejected'
           ↓                        ↓
Generate payment link       Consume 1 revision
(50% balance)               (project.usedRevisions++)
           ↓                        ↓
Email: "Payment Required"   Email: "Revision Requested"
           ↓                        ↓
Status: 'payment_pending'   Status: 'revision_requested'
           ↓                        ↓
Client pays via Razorpay    Team makes changes
           ↓                        ↓
Webhook: payment.captured   Re-upload beta
           ↓                        ↓
Status: 'payment_pending'   Back to STEP 3
       → 'final_delivered'        (loop until approved)
           ↓
Admin uploads final file
(no watermark, full resolution)
           ↓
Email: "Final Delivery Ready"
           ↓
Client downloads final file
           ↓
365-day countdown starts
           ↓
After 365 days:
Status: 'expired'
Files archived, downloads disabled
```

## State Transition Diagram

```
┌─────────┐
│ pending │  ← Initial state (from proposal)
└────┬────┘
     │ admin starts work
     ↓
┌──────────────┐
│ in_progress  │
└──────┬───────┘
       │ admin uploads beta
       ↓
┌────────────┐
│ beta_ready │
└─────┬──────┘
      │ system auto-transitions
      ↓
┌────────────────────┐
│ awaiting_approval  │  ← Client must act
└─────────┬──────────┘
          │
     ┌────┴────┐
     ↓         ↓
┌──────────┐  ┌──────────┐
│ approved │  │ rejected │
└────┬─────┘  └────┬─────┘
     │             │
     ↓             ↓
┌──────────────┐  ┌────────────────────┐
│payment_pending│  │revision_requested │
└──────┬───────┘  └────────┬───────────┘
       │                   │
       ↓                   │
┌──────────────────┐       │
│ final_delivered  │       │
└──────┬───────────┘       │
       │                   │
       ↓                   │
  (365 days)               │
       │                   │
       ↓                   │
  ┌─────────┐              │
  │ expired │              │
  └─────────┘              │
                           │
                           └──→ (back to in_progress)
```

## Automation Triggers

### Email Notifications (Automatic)

| Trigger Event | Recipients | Email Template |
|--------------|------------|----------------|
| Beta uploaded | PRIMARY_CONTACT | `deliverable-beta-ready` |
| Client approves | Admin team | `deliverable-approved` |
| Client rejects | Admin team | `deliverable-rejected` |
| Payment received | Admin team | `balance-payment-received` |
| Final delivered | PRIMARY_CONTACT | `deliverable-final-ready` |
| Revision request (additional) | Admin team | `additional-revision-requested` |

### Status Updates (Automatic)

| Trigger Event | Status Change |
|--------------|---------------|
| Beta file uploaded | `in_progress` → `beta_ready` → `awaiting_approval` |
| Client clicks "Approve" | `awaiting_approval` → `approved` → `payment_pending` |
| Client clicks "Reject" | `awaiting_approval` → `rejected` → `revision_requested` |
| Payment webhook received | `payment_pending` → `final_delivered` |
| 365 days elapsed | `final_delivered` → `expired` |

### System Actions (Automatic)

| Trigger Event | System Action |
|--------------|---------------|
| Client rejects | Increment `project.usedRevisions` |
| Client rejects | Increment `deliverable.revisionsConsumed` |
| Client approves | Generate Razorpay payment link |
| Payment received (balance) | Deliverable status → final_delivered |
| Deliverable status → final_delivered | Calculate file.expires_at = final_delivered_at + 365 days for all linked files |
| File.expires_at date reached | File status → expired, download URLs return 403 |
| Deliverable status → expired (optional) | All linked files → expired (if not already) |

## Timeline Estimates

### Typical Flow
```
Day 0:   Project starts, deliverables created (status: pending)
Day 7:   Team uploads first beta (status: awaiting_approval)
Day 9:   Client approves (status: approved → payment_pending)
Day 10:  Client pays balance (status: final_delivered)
         ↓
Total: 10 days from start to final delivery
```

### With Revisions
```
Day 0:   Project starts
Day 7:   Beta uploaded (awaiting_approval)
Day 9:   Client rejects with feedback (revision_requested)
Day 14:  Team re-uploads beta (awaiting_approval again)
Day 16:  Client approves
Day 17:  Client pays
         ↓
Total: 17 days (1 revision round)
```

## Edge Cases & Error Handling

### Edge Case: Revision Quota Exhausted
- **Scenario:** Client rejects but project.usedRevisions >= project.totalRevisions
- **Behavior:** Show "Request Additional Revisions" form instead of reject button
- **Resolution:** Client submits request → Admin approves → Quota increased → Client can reject

### Edge Case: Payment Link Expired
- **Scenario:** Client waits >30 days to pay after approval
- **Behavior:** Razorpay link expires
- **Resolution:** Admin generates new payment link manually

### Edge Case: File Expiry
- **Scenario:** Client tries to download after 365 days
- **Behavior:** Download link returns 403 Forbidden
- **Resolution:** Client contacts support → Admin can extend or re-upload

### Edge Case: Multiple Rejections
- **Scenario:** Client rejects same deliverable 3+ times
- **Behavior:** Each rejection consumes 1 revision (tracked in deliverable.revisionsConsumed)
- **Resolution:** Normal workflow, quota enforcement applies
