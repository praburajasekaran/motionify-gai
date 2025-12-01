# User Journey: Inquiry to Project

## Complete Customer Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    INQUIRY TO PROJECT WORKFLOW                           │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1: Customer Discovery
    ↓
Customer visits Motionify landing page
Interested in video production services
    ↓

STEP 2: Inquiry Submission
    ↓
Customer fills out 5-step quiz/form:
  - Contact information
  - Project type selection
  - Project details (budget, timeline, length)
  - Additional requirements
  - Review and submit
    ↓
System creates Inquiry (status: 'new')
System sends confirmation email to customer
System sends alert email to Motionify admin
    ↓

STEP 3: Admin Review
    ↓
Admin receives notification
Admin logs into portal
Admin views inquiry on dashboard
Admin assigns inquiry to themselves
Admin changes status to 'reviewing'
Admin adds internal notes
    ↓

STEP 4: Proposal Creation
    ↓
Admin clicks "Create Proposal"
Admin fills out proposal form:
  - Pricing breakdown (line items)
  - Project scope (detailed description)
  - Deliverables (with estimated weeks)
  - Milestones (grouping deliverables)
  - Revision policy (count + terms)
  - Payment terms (advance payment percentage: 40%, 50%, 60%, etc.)
    ↓
Admin clicks "Send to Customer"
System generates unique review token
System creates proposal (status: 'sent')
System updates inquiry (status: 'proposal_sent')
System sends email to customer with review link
    ↓

STEP 5: Customer Review
    ↓
Customer receives email
Customer clicks proposal review link
System loads proposal page (no login required)
System tracks "viewed" event
System updates proposal status to 'viewed'
    ↓
Customer reads proposal details
    ↓

STEP 6: Customer Decision
    ↓
┌────────────────────┐                  ┌────────────────────┐
│ Accept Proposal    │                  │ Request Changes    │
│ (with Terms)       │                  │                    │
└────────────────────┘                  └────────────────────┘
         ↓                                       ↓
         │                              Customer fills feedback form
         │                              System saves feedback
         │                              System updates proposal: 'revision_requested'
         │                              System updates inquiry: 'negotiating'
         │                              System emails admin
         │                                       ↓
         │                              Admin receives notification
         │                              Admin reviews feedback
         │                              Admin responds or creates new proposal version
         │                              System sends revised proposal to customer
         │                              [Loop back to Step 5]
         │
         ↓
System updates proposal: 'accepted'
System updates inquiry: 'accepted'
System records terms acceptance:
  - Terms accepted as part of proposal acceptance
  - hasAgreed: true (stored when account is created)
System sends acceptance confirmation to customer
System notifies admin
    ↓

STEP 7: Admin Creates Project Structure
    ↓
Super admin reviews accepted proposal
Super admin creates project structure:
  - Defines milestones
  - Defines deliverables
  - Sets project scope
  - Captures project details from prior discussions
    ↓

STEP 8: Admin Sets Payment Terms
    ↓
Super admin sets total project cost
Super admin sets advance payment percentage (40%, 50%, 60%, etc.)
System calculates:
  - advance_amount = total_amount * advance_percentage / 100
  - balance_amount = total_amount - advance_amount
    ↓

STEP 9: Admin Triggers Payment Request
    ↓
Super admin clicks "Request Advance Payment"
System generates Razorpay payment link
System sends automated payment request email to customer
Email includes: project details, total cost, advance amount, payment link
    ↓

STEP 10: Customer Receives Payment Request
    ↓
Customer receives email: "Payment Request: Your [ProjectName] is Ready to Start"
Customer clicks payment link in email
Customer redirected to Razorpay payment gateway
    ↓

STEP 11: Customer Completes Advance Payment
    ↓
Customer completes advance payment at Razorpay
Payment webhook received by system
    ↓
System processes payment webhook:
  - Verifies payment signature
  - Updates payment status to COMPLETED
  - Creates customer user account immediately:
    * Email: customer's email from inquiry
    * Role: 'client'
    * is_primary_contact: true
    * hasAgreed: true (terms already accepted with proposal)
  - Creates project record automatically:
    * Copies deliverables from proposal
    * Copies milestones from proposal
    * Sets revision count from proposal
    * Adds customer to clientTeam
    * Assigns project manager
    * Sets status: 'IN_PROGRESS'
    * Creates project_terms record with status: 'accepted' (from proposal acceptance)
    * Sets project_terms.accepted_at to proposal.accepted_at timestamp
  - Generates magic link token
  - Sends welcome email with portal access
    ↓
System updates inquiry:
  - status: 'converted'
  - convertedToProjectId: [new project ID]
  - convertedAt: [timestamp]
    ↓

STEP 12: Customer Receives Access
    ↓
Customer receives welcome email with magic link
Customer clicks magic link
System authenticates customer
System redirects to project dashboard immediately
(No terms acceptance required - already accepted with proposal)
    ↓

STEP 13: Portal Access Granted
    ↓
Customer has immediate access to project dashboard
Customer sees:
  - Project overview
  - Deliverables list with status
  - Milestone timeline
  - Team members
  - Activity feed
  - Files section
    ↓
Customer can now:
  - Track project progress
  - Comment on tasks
  - Approve deliverables
  - Request revisions
  - Invite team members
  - Download files
    ↓

PROJECT ACTIVE ✓
```

## State Transition Diagrams

### Inquiry Status Flow

```
┌─────────┐
│   NEW   │  ← Initial state when customer submits form
└────┬────┘
     │
     ↓
┌─────────────┐
│  REVIEWING  │  ← Admin assigns and reviews inquiry
└─────┬───────┘
      │
      ↓
┌──────────────────┐
│ PROPOSAL_SENT    │  ← Admin creates and sends proposal
└────┬─────────────┘
     │
     ↓
┌──────────────┐
│ NEGOTIATING  │  ← Customer requests changes
└──────┬───────┘
       │    ↑
       │    │  ← Admin sends revised proposal
       │    │
       │    └──── (Loop: multiple negotiation rounds)
       │
       ↓
┌──────────┐
│ ACCEPTED │  ← Customer accepts proposal
└────┬─────┘
     │
     ↓
┌──────────────────┐
│ PROJECT_SETUP    │  ← Admin creates project structure & payment terms
└────┬─────────────┘
     │
     ↓
┌──────────────────┐
│ PAYMENT_PENDING  │  ← Payment request sent, waiting for advance payment
└────┬─────────────┘
     │
     ↓
┌──────┐
│ PAID │  ← Advance payment webhook received, project created
└──┬───┘
   │
   ↓
┌────────────┐
│ CONVERTED  │  ← Inquiry converted to project (final state)
└────────────┘

Alternative paths:
┌──────────┐
│ REJECTED │  ← Customer declines proposal
└──────────┘

┌──────────┐
│ ARCHIVED │  ← Admin closes inquiry without conversion
└──────────┘
```

### Proposal Status Flow

```
┌───────┐
│ DRAFT │  ← Admin is building proposal
└───┬───┘
    │
    ↓
┌──────┐
│ SENT │  ← Sent to customer via email
└──┬───┘
   │
   ↓
┌────────┐
│ VIEWED │  ← Customer opened review link
└───┬────┘
    │
    ├──────────────────────┐
    │                      │
    ↓                      ↓
┌────────────────────┐  ┌──────────┐
│ REVISION_REQUESTED │  │ ACCEPTED │
└──────┬─────────────┘  └────┬─────┘
       │                     │
       ↓                     │
   Admin creates            │
   new version              │
       │                     │
       ↓                     │
   [Back to DRAFT]          │
                            │
                            ↓
                    Payment completed
                            ↓
                    Project created

Alternative paths:
┌──────────┐
│ REJECTED │  ← Customer declines
└──────────┘

┌─────────┐
│ EXPIRED │  ← Proposal link expired (if expiration enabled)
└─────────┘
```

### User Account Flow

```
┌──────────────┐
│ No Account   │  ← Customer starts as non-user
└──────┬───────┘
       │
       ↓
Customer submits inquiry
       │
       ↓
Customer reviews proposal (no login required)
       │
       ↓
Customer accepts proposal
       │
       ↓
Customer completes payment
       │
       ↓
┌────────────────────┐
│ Account Created    │  ← System auto-creates account
└────────┬───────────┘
         │
         │  Properties:
         │  - email: from inquiry
         │  - role: 'client'
         │  - is_primary_contact: true
         │  - hasAgreed: true (terms accepted with proposal)
         │
         ↓
┌──────────────────┐
│ Magic Link Sent  │  ← Welcome email with login link
└────────┬─────────┘
         │
         ↓
Customer clicks link
         │
         ↓
┌─────────────────┐
│ Authenticated   │  ← JWT session created
└────────┬────────┘
         │
         ↓
┌──────────────────┐
│ Portal Access    │  ← Full project access granted immediately
└────────┬─────────┘
         │
         ↓
Customer can:
- View project details
- Track deliverables
- Comment on tasks
- Approve work
- Request revisions
- Invite team members
```

## Decision Points

### Admin: After Reviewing Inquiry
```
Should we pursue this lead?

YES                              NO
 │                                │
 ↓                                ↓
Create Proposal              Set status: ARCHIVED
                             Add note explaining why
```

### Customer: After Reviewing Proposal
```
Does this proposal meet your needs?

YES                    CHANGES NEEDED                 NO
 │                          │                          │
 ↓                          ↓                          ↓
Accept Proposal      Request Changes              Reject Proposal
 │                          │                          │
 ↓                          ↓                          │
Payment              Admin Revises                    │
                           │                          │
                           ↓                          │
                    New Proposal Sent                 │
                           │                          │
                           └──[Loop back]             │
                                                      ↓
                                              Inquiry: REJECTED
```

### System: After Payment Webhook
```
Is this a valid payment?

YES                              NO
 │                                │
 ↓                                ↓
Update inquiry: PAID         Log error
Create user account          Alert admin
Convert to project           Do not create account
Send welcome email           Customer can retry payment
```

## Automation Triggers

### Email Notifications (Automatic)

| Trigger Event | Recipients | Email Type |
|--------------|------------|------------|
| Inquiry submitted | Customer | Confirmation with inquiry number |
| Inquiry submitted | Admin | New inquiry alert |
| Proposal sent | Customer | Review link with proposal details |
| Proposal viewed | Admin | Notification that customer opened it |
| Changes requested | Admin | Customer feedback notification |
| Revised proposal sent | Customer | Updated proposal link |
| Proposal accepted | Admin | Acceptance notification |
| Proposal accepted | Customer | Next steps (admin will set up project) |
| Payment request sent | Customer | Payment request email with Razorpay link |
| Advance payment received | Customer | Payment confirmation |
| Advance payment received | Admin | Payment alert with inquiry details |
| Account created | Customer | Welcome email with magic link |
| Project created | Customer | Project started notification |
| Proposal accepted (with terms) | Admin | Proposal and terms accepted notification |

### Status Updates (Automatic)

| Trigger Event | Status Change |
|--------------|---------------|
| Inquiry submitted | Inquiry → 'new' |
| Admin assigns | Inquiry → 'reviewing' |
| Proposal sent | Inquiry → 'proposal_sent', Proposal → 'sent' |
| Customer views proposal | Proposal → 'viewed' |
| Customer requests changes | Inquiry → 'negotiating', Proposal → 'revision_requested' |
| Customer accepts proposal | Inquiry → 'accepted', Proposal → 'accepted', Terms accepted |
| Admin creates project structure | Inquiry → 'project_setup' |
| Payment request sent | Inquiry → 'payment_pending' |
| Advance payment received | Inquiry → 'paid', Project created automatically, Account created |
| Project created | Inquiry → 'converted' |

### System Actions (Automatic)

| Trigger Event | System Action |
|--------------|---------------|
| Inquiry submitted | Generate inquiry number (INQ-YYYY-NNN) |
| Proposal created | Generate proposal number (PROP-YYYY-NNN) |
| Proposal created | Generate unique review token (UUID) |
| Proposal sent | Create review URL with token |
| Admin triggers payment request | Generate Razorpay payment link |
| Payment webhook received | Verify payment signature |
| Payment verified | Create user account |
| User created | Generate magic link token |
| Payment verified | Convert inquiry to project |
| Project created | Copy deliverables from proposal |
| Project created | Copy milestones from proposal |
| Project created | Set revision count from proposal |
| Project created | Add customer to clientTeam |
| Proposal accepted | Terms accepted (stored with proposal acceptance) |
| Project created | Create project_terms record (status: accepted, from proposal) |
| User account created | Set hasAgreed = true (terms already accepted with proposal) |

## Timeline Estimates

### Typical Flow (No Negotiation)
```
Day 0:   Customer submits inquiry
Day 1:   Admin reviews and creates proposal
Day 2:   Customer reviews proposal
Day 2:   Customer accepts proposal (with terms)
Day 2:   Admin creates project structure and sets payment terms
Day 2:   Admin triggers payment request
Day 3:   Customer receives payment request email and pays advance
Day 3:   Payment webhook → Account created → Project created automatically
Day 3:   Customer receives welcome email with portal access
Day 3:   Customer logs in → Immediate access (terms already accepted)
         ↓
Total: 3 days from inquiry to project start
```

### With Negotiation (2 rounds)
```
Day 0:   Customer submits inquiry
Day 1:   Admin creates proposal v1
Day 2:   Customer requests changes
Day 3:   Admin creates proposal v2
Day 4:   Customer requests more changes
Day 5:   Admin creates proposal v3
Day 6:   Customer accepts proposal (with terms)
Day 6:   Admin creates project structure and triggers payment request
Day 7:   Customer receives payment request and pays advance
Day 7:   Payment webhook → Account created → Project created automatically
Day 7:   Customer receives welcome email and logs in → Immediate access
         ↓
Total: 7 days from inquiry to project start
```

### Abandoned Payment
```
Day 0:   Customer submits inquiry
Day 1:   Admin creates proposal
Day 2:   Customer accepts proposal
Day 2:   Admin creates project structure and triggers payment request
Day 2:   Customer receives payment request but doesn't pay
Day 5:   System sends payment reminder email
Day 10:  System sends second reminder
Day 15:  Admin manually follows up
```

## Edge Cases & Error Handling

### Customer Never Pays After Payment Request
- Inquiry status remains 'payment_pending'
- Automated reminder emails sent (Day 3, Day 7, Day 14)
- Admin can manually follow up or archive inquiry
- Payment link expires after 30 days (admin can regenerate)

### Payment Webhook Fails
- System logs error
- Admin receives alert
- System polls Razorpay payment status API every 2 minutes
- If confirmed externally, manually update payment status
- Admin can manually trigger account creation if needed

### Customer Loses Magic Link Email
- Customer can request new magic link
- System generates new token
- Previous token invalidated

### Proposal Link Expired (If Enabled)
- Customer sees "This proposal has expired" message
- Option to request updated proposal
- Admin receives notification to send new version

### Duplicate Account Email
- System checks if email already exists
- If exists, add to project team instead of creating new account
- Send "Added to project" email instead of welcome email

### Customer Requests Term Changes After Proposal Acceptance
- Customer can request changes during proposal review (before acceptance)
- If customer accepts proposal, terms are considered accepted
- After payment and project creation, terms cannot be changed via proposal
- Any term changes after project creation require admin intervention

### Customer Wants to Cancel After Payment
- Manual admin process (not automated)
- Admin can refund and archive inquiry
- Project deleted or marked inactive
