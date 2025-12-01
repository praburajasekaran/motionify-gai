# Test Cases: Deliverables & Approval Workflow

Total: 25 test cases

## 1. Deliverable Creation (5 test cases)

### TC-DA-001: Create Deliverables from Proposal
**Priority:** High
**Steps:**
1. Convert inquiry to project after payment
2. Verify deliverables created from proposal.deliverables[]
3. Check all fields preserved (id, name, description, estimatedCompletionWeek, format)
**Expected:**
- ✓ All deliverables created with status 'pending'
- ✓ IDs preserved from proposal
- ✓ order field set correctly (1, 2, 3...)

---

## 2. Beta Upload & Approval (8 test cases)

### TC-DA-006: Upload Beta File
**Priority:** High
**Steps:**
1. Admin uploads beta file for deliverable
2. Verify file stored in Cloudflare R2
3. Check watermark applied
**Expected:**
- ✓ Status: 'in_progress' → 'beta_ready' → 'awaiting_approval'
- ✓ betaFileId populated
- ✓ Email sent to PRIMARY_CONTACT

### TC-DA-007: Client Approves Deliverable
**Priority:** High
**Steps:**
1. Client logs in (PRIMARY_CONTACT)
2. Views deliverable in 'awaiting_approval' status
3. Clicks "Approve" button
4. Confirms in modal
**Expected:**
- ✓ Status: 'awaiting_approval' → 'approved' → 'payment_pending'
- ✓ approvedBy = client user ID
- ✓ DeliverableApproval record created (action='approved')
- ✓ Payment link generated
- ✓ Email sent to client with payment link

### TC-DA-008: Client Rejects Deliverable (Has Revisions)
**Priority:** High
**Steps:**
1. Client clicks "Request Changes"
2. Enters feedback text
3. Submits
**Expected:**
- ✓ Status: 'awaiting_approval' → 'rejected' → 'revision_requested'
- ✓ project.usedRevisions incremented by 1
- ✓ deliverable.revisionsConsumed incremented by 1
- ✓ DeliverableApproval record created (action='rejected', feedback captured)
- ✓ Email sent to admin team

### TC-DA-009: Client Cannot Reject (No Revisions Left)
**Priority:** High
**Steps:**
1. Set project.usedRevisions = project.totalRevisions
2. Client views deliverable
**Expected:**
- ✓ "Request Changes" button disabled
- ✓ "Request Additional Revisions" button shown
- ✓ Cannot submit rejection

---

## 3. Revision Management (4 test cases)

### TC-DA-014: Request Additional Revisions
**Priority:** High
**Steps:**
1. Client has 0 revisions remaining
2. Clicks "Request Additional Revisions"
3. Fills form (reason, quantity)
4. Submits
**Expected:**
- ✓ RevisionRequest record created (status='pending')
- ✓ Email sent to admin team
- ✓ Cannot reject deliverable yet

### TC-DA-015: Admin Approves Additional Revisions
**Priority:** High
**Steps:**
1. Admin views revision request
2. Approves and grants 2 additional revisions
**Expected:**
- ✓ project.totalRevisions += 2
- ✓ RevisionRequest.status = 'approved'
- ✓ Email sent to client
- ✓ Client can now reject deliverable

---

## 4. Payment Integration (3 test cases)

### TC-DA-018: Payment Received - Final Delivery Unlocked
**Priority:** High
**Steps:**
1. Deliverable status = 'payment_pending'
2. Razorpay webhook: payment.captured
3. System verifies signature
**Expected:**
- ✓ balancePaymentReceived = true
- ✓ Status: 'payment_pending' → 'final_delivered'
- ✓ expiresAt = now + 365 days
- ✓ Email sent to client with download links

---

## 5. File Expiry (2 test cases)

### TC-DA-021: Check Download Before Expiry
**Priority:** Medium
**Steps:**
1. Deliverable status = 'final_delivered'
2. expiresAt = tomorrow
3. Client downloads file
**Expected:**
- ✓ Download succeeds
- ✓ Signed URL generated

### TC-DA-022: Check Download After Expiry
**Priority:** High
**Steps:**
1. Deliverable status = 'final_delivered'
2. expiresAt = yesterday
3. Client attempts download
**Expected:**
- ✓ Download returns 403 Forbidden
- ✓ Error message: "Files have expired"
- ✓ Suggestion to contact support

---

## 6. Permissions (3 test cases)

### TC-DA-023: Only PRIMARY_CONTACT Can Approve
**Priority:** High
**Steps:**
1. Login as TEAM_MEMBER (not PRIMARY_CONTACT)
2. View deliverable in 'awaiting_approval'
**Expected:**
- ✓ "Approve" button disabled OR hidden
- ✓ Message: "Only primary contact can approve"

---

**Total Test Cases:** 25  
**High Priority:** 18  
**Medium Priority:** 7

## Test Summary

| Category | Total Tests | High | Medium | Low |
|----------|-------------|------|--------|-----|
| Deliverable Creation | 5 | 5 | 0 | 0 |
| Beta Upload & Approval | 8 | 8 | 0 | 0 |
| Revision Management | 4 | 4 | 0 | 0 |
| Payment Integration | 3 | 3 | 0 | 0 |
| File Expiry | 2 | 1 | 1 | 0 |
| Permissions | 3 | 3 | 0 | 0 |
| **TOTAL** | **25** | **24** | **1** | **0** |

## Automation Strategy

### Priority for Automation
1. **High Priority (24 tests)**: Approval workflow, payment integration, and permissions.
2. **Medium Priority (1 tests)**: File expiry checks.

### Recommended Tools
- **E2E Tests**: Playwright for the full approval flow (Client approves -> Payment unlock).
- **Unit Tests**: Expiry logic and permission checks.
