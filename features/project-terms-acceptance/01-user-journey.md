# User Journey: Project Terms & Acceptance

## Complete Customer Journey

### Happy Path: Client Accepts Terms

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 CLIENT TERMS ACCEPTANCE WORKFLOW                         │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1: Terms Accepted with Proposal
    ↓
[Customer reviews proposal (includes project terms)]
[Customer accepts proposal]
[Terms are accepted as part of proposal acceptance]
[System records: proposal.accepted_at, terms considered accepted]
    ↓

STEP 2: Payment & Project Creation
    ↓
[Admin creates project structure and triggers payment request]
[Client pays advance payment via Razorpay]
[Payment webhook received → Account created → Project record created automatically]
[System creates project_terms record with status: 'accepted']
[System sets project_terms.accepted_at to proposal.accepted_at timestamp]
[System sets user.hasAgreed = true]
    ↓

STEP 3: Client Receives Access
    ↓
[Client receives welcome email with magic link]
[Client clicks magic link]
[System authenticates user]
[System redirects to project dashboard immediately]
[No terms acceptance modal - terms already accepted with proposal]
[Full project access enabled: tasks, files, comments]
```

### Alternative Path: Client Requests Changes (During Proposal Review)

```
STEP 4B: Client Requests Changes During Proposal Review
    ↓
[Client reviews proposal and sees terms]
[Client clicks "Request Changes" on proposal]
[Change request form appears]
[Client enters: Requested changes (required), Reason (optional)]
[Client clicks "Submit Request"]
    ↓

STEP 5B: Change Request Submitted
    ↓
[System updates proposal status → "revision_requested"]
[System updates inquiry status → "negotiating"]
[Email sent to Motionify admin: "Client Requested Proposal/Term Changes"]
[Client sees: "Your request has been sent. We'll review and respond within 24 hours."]
    ↓

STEP 6B: Admin Reviews Request
    ↓
[Admin receives email with client comments]
[Admin decides: Update proposal/terms OR Respond with message]
    ↓
         ┌────────────────────────────┬────────────────────────────┐
         ↓                            ↓                            ↓
   OPTION A:                    OPTION B:                    OPTION C:
   Update Proposal/Terms        Decline Changes              No Action
   ↓                            ↓                            ↓
   [Admin edits proposal]       [Admin sends message]        [Request stays pending]
   [Increments version]         [Status unchanged]           [Follow-up after 24h]
   [Status → sent]              [Client notified]
   [Client notified]
   ↓
   Client must re-review proposal
   (returns to proposal review)
```

## State Transition Diagrams

### Terms Status Flow

```
                    ┌─────────────────┐
                    │ Proposal Review │  ← Customer reviewing proposal with terms
                    └────────┬────────┘
                             │
                ┌────────────┼────────────┐
                ↓                         ↓
         [Accept Proposal]        [Request Changes]
         (with Terms)             (on Proposal)
                ↓                         ↓
         ┌──────────┐          ┌──────────────────────┐
         │ accepted │          │ revision_requested   │
         │ (terms   │          │ (proposal status)    │
         │ accepted)│          └──────────┬───────────┘
         └────┬─────┘                     │
              │                  ┌─────────┼─────────┐
              │                  ↓                   ↓
              │          [Admin Updates]      [Admin Declines]
              │          Proposal/Terms              │
              │                  ↓                   ↓
              │          ┌─────────────────┐     [Status unchanged]
              │          │ Proposal sent   │     [Email to client]
              │          │ (version 2)     │
              │          └─────────────────┘
              │                  ↓
              │          [Client re-reviews]
              │
              ↓
    [Payment & Project Creation]
              ↓
    ┌─────────────────┐
    │ Terms Accepted  │  ← Final state (from proposal acceptance)
    │ (in project)    │
    └─────────────────┘

Terminal States:
- accepted (terms accepted with proposal, stored in project_terms)

Note: Terms acceptance happens during proposal acceptance, not after project creation.
```

### Project Access Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    PROJECT ACCESS CONTROL                     │
└──────────────────────────────────────────────────────────────┘

Client logs in
    ↓
┌─────────────────────────┐
│ Is primary contact?     │
└─────────┬───────────────┘
          │
          ├─→ NO  → Check if primary contact accepted terms
          │           ↓
          │         ┌─────────────────┐
          │         │ Terms accepted? │
          │         └────────┬────────┘
          │                  │
          │                  ├─→ YES → Grant full access
          │                  │
          │                  └─→ NO  → Show "Awaiting terms acceptance" message
          │
          └─→ YES → Check terms acceptance
                      ↓
                ┌─────────────────┐
                │ Terms accepted? │
                └────────┬────────┘
                         │
                         ├─→ YES → Grant full access
                         │
                         └─→ NO  → Show blocking terms modal
```

## Decision Points

### Client: Accept Proposal (with Terms) or Request Changes?

```
Proposal Review Screen (includes terms)

Option A: Accept Proposal                    Option B: Request Changes
(with Terms)                                 (on Proposal)
    ↓                                          ↓
  Terms accepted with proposal            Requires negotiation
  Payment request will be sent            Admin review needed
  Project created after payment           Must wait for revised proposal
  Immediate access after payment          ↓
  ↓                                          ↓
[Proposal & terms accepted]              [Change request created]
[Email to Motionify team]                [Email to admin]
[Payment request triggered]              [Must wait for response]
```

### Admin: Update Terms or Decline?

```
Client Requests Changes

Option A: Update Terms                    Option B: Decline Changes
    ↓                                          ↓
  Client has valid concerns              Terms stay as-is
  Update scope/deliverables/etc          Send explanation message
  Increment version number               Status: revision_requested
  ↓                                          ↓
[Client must re-review new version]     [Client can accept original terms]
[Status → pending_review (v2)]          [Or submit new change request]
```

## Automation Triggers

### Email Notifications (Automatic)

| Trigger Event | Recipients | Email Type | Timing |
|--------------|------------|------------|--------|
| Proposal accepted (with terms) | Motionify admin, PM | `proposal-accepted` | Immediate |
| Client requests proposal/term changes | Motionify admin | `proposal-change-requested` | Immediate |
| Admin updates proposal/terms | Client primary contact | `proposal-updated` | Immediate |
| Admin responds to change request | Client primary contact | `proposal-change-response` | Immediate |

### Status Updates (Automatic)

| Trigger Event | Status Change |
|--------------|---------------|
| Proposal accepted | Terms considered accepted (stored with proposal) |
| Project created | project_terms.status → `accepted` (from proposal acceptance) |
| Client requests changes (on proposal) | proposal.status → `revision_requested` |
| Admin updates proposal/terms | proposal.status → `sent` (version++) |

### System Actions (Automatic)

| Trigger Event | System Action |
|--------------|---------------|
| Proposal accepted | Terms accepted (stored with proposal acceptance) |
| Project created | Create project_terms record with status 'accepted' (from proposal) |
| Client logs in (primary contact) | No terms modal (already accepted with proposal) |
| Terms updated by admin (on proposal) | Increment proposal version; client must re-review |
| Change request submitted (on proposal) | Update proposal status; notify admin |

## Timeline Estimates

### Happy Path: Immediate Acceptance

```
Day 0, 9:00 AM:   Admin creates proposal (includes terms)
Day 0, 9:01 AM:   Client receives proposal review email
Day 0, 10:30 AM:  Client reviews proposal and terms
Day 0, 10:35 AM:  Client accepts proposal (with terms) (5 min review)
Day 0, 10:35 AM:  Terms accepted as part of proposal acceptance
Day 0, 10:36 AM:  Motionify team receives acceptance notification
Day 0, 11:00 AM:  Admin creates project structure, triggers payment request
Day 1, 2:00 PM:   Client pays advance payment
Day 1, 2:01 PM:   Project created automatically, client receives access
                  ↓
Total: ~1.5 hours from proposal to acceptance, then payment triggers project creation
```

### Alternative Path: Change Request

```
Day 0, 9:00 AM:   Admin creates proposal (includes terms)
Day 0, 9:01 AM:   Client receives proposal review email
Day 0, 2:00 PM:   Client reviews proposal and terms
Day 0, 2:15 PM:   Client requests changes (concern about timeline)
Day 0, 2:15 PM:   Admin receives change request email
Day 1, 10:00 AM:  Admin reviews request, updates proposal/terms
Day 1, 10:05 AM:  Client receives "Proposal Updated" email
Day 1, 11:00 AM:  Client reviews updated proposal (version 2)
Day 1, 11:05 AM:  Client accepts updated proposal (with terms)
Day 1, 11:05 AM:  Terms accepted, payment request triggered
                  ↓
Total: ~26 hours from proposal to acceptance (1-2 business days)
```

### Worst Case: Multiple Revisions

```
Day 0:   Project created, terms sent
Day 1:   Client requests changes (pricing)
Day 2:   Admin updates pricing, client not satisfied
Day 2:   Client requests additional changes (deliverables)
Day 3:   Admin updates deliverables, version 3
Day 4:   Client accepts final terms
         ↓
Total: 4 days (unusual, but possible)
```

## Edge Cases & Error Handling

### Edge Case: Client Team Member Tries to Access Before Payment

**Description:** Non-primary-contact client tries to log in before project created

**Expected Behavior:**
- Show message: "Project not yet created. Waiting for advance payment."
- Provide contact info for primary contact
- No access to project tasks, files, or details

**Resolution:** Primary contact must pay advance payment first (which creates project)

---

### Edge Case: Proposal Updated While Client is Reviewing

**Description:** Admin updates proposal/terms while client is reviewing

**Expected Behavior:**
- On client submit, API checks if proposal version matches
- If version changed: Show error "Proposal has been updated. Please review the latest version."
- Reload proposal page with new version
- Client must review new version before accepting

**Resolution:** Optimistic locking prevents accepting stale proposal/terms

---

### Edge Case: Client Loses Session During Review

**Description:** Client's JWT expires while reviewing 500-word terms document

**Expected Behavior:**
- Modal stays open (content cached client-side)
- On "Accept" click, API returns 401 Unauthorized
- Client prompted to log in again (magic link)
- After re-auth, terms modal shows again

**Resolution:** Client can re-authenticate and continue

---

### Edge Case: Multiple Change Requests

**Description:** Client submits change request, admin doesn't respond, client submits another

**Expected Behavior:**
- Both requests stored in project_terms_revisions table
- Admin sees all change requests in chronological order
- Admin can address multiple concerns in single term update
- Version increments only once when admin updates

**Resolution:** All requests tracked, admin addresses in bulk

---

### Error Case: Non-Primary Contact Tries to Accept Proposal

**Description:** Client team member tries to accept proposal

**Expected Behavior:**
- Proposal acceptance is tied to inquiry email (primary contact)
- Only the email address from the inquiry can accept the proposal
- Returns 403 Forbidden: "Only the primary contact can accept this proposal"
- Frontend shouldn't allow this (proposal link tied to inquiry email)

**Resolution:** Permission denied, primary contact must accept proposal

---

### Error Case: Accept Proposal for Already-Accepted Proposal

**Description:** Client clicks "Accept" again after already accepting

**Expected Behavior:**
- API checks if proposal already accepted
- Returns 400 Bad Request: "Proposal already accepted"
- Frontend should not show accept button if already accepted

**Resolution:** Idempotent operation, no duplicate acceptances

---

### Error Case: Request Changes Without Comment

**Description:** Client submits change request with empty comment field

**Expected Behavior:**
- Frontend validation prevents submission
- If bypassed, API returns 400 Bad Request: "Change request comment is required"
- Client must enter reason for changes

**Resolution:** Validation on frontend and backend

---

## Permission Guards

### Frontend Route Guards

```typescript
// Check before rendering project routes
// Terms are accepted with proposal, so no blocking modal needed
// Project only exists after payment, so if project exists, terms are accepted
if (user.role === 'client' && !projectExists) {
  showMessage("Project not yet created. Waiting for advance payment.");
  return;
}
```

### Backend API Guards

```typescript
// GET /api/projects/:id/terms
// Anyone on project team can view (terms are from proposal)

// POST /api/proposals/:id/accept
// Accepts proposal and terms together
// Only the inquiry email can accept (primary contact)

// POST /api/proposals/:id/request-changes
// Requests changes to proposal/terms
// Only the inquiry email can request changes

// PATCH /api/proposals/:id
// Only admins can update proposal/terms
```

## Metrics & Analytics

### Key Metrics to Track

1. **Acceptance Rate**: % of clients who accept proposal without requesting changes
2. **Time to Acceptance**: Hours from proposal sent to proposal accepted
3. **Change Request Rate**: % of proposals with at least one change request
4. **Revision Count**: Average number of proposal versions per inquiry
5. **Payment Conversion Rate**: % of accepted proposals that result in payment

### Success Criteria

- **> 85% acceptance rate** without changes
- **< 24 hours** average time to proposal acceptance
- **< 15% change request rate**
- **< 1.2 average** proposal versions per inquiry
- **> 90% payment conversion rate** (accepted proposals → payments)

---

## Workflow Summary

| Step | Actor | Action | Duration |
|------|-------|--------|----------|
| 1 | Admin | Create proposal (includes terms) | 10-20 min |
| 2 | System | Send proposal to client | Immediate |
| 3 | Client | Receive email, click link | 0-24 hours |
| 4 | Client | Review proposal and terms | 10-30 min |
| 5a | Client | Accept proposal (with terms) | Immediate |
| 5b | Client | Request changes | 2-5 min |
| 6b | Admin | Review request | 1-24 hours |
| 7b | Admin | Update proposal/terms or respond | 10-30 min |
| 8b | Client | Re-review updated proposal | 5-10 min |
| 9 | Admin | Create project structure, trigger payment | 5-10 min |
| 10 | Client | Pay advance payment | 0-7 days |
| 11 | System | Create project automatically | Immediate |
| 12 | System | Grant project access | Immediate |

**Total Timeline:**
- **Happy path:** 1-3 hours (proposal) + payment timing
- **With changes:** 1-2 days (proposal) + payment timing
- **Multiple revisions:** 2-5 days (proposal) + payment timing
