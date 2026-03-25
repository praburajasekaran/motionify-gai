# Test Cases: Inquiry to Project

Comprehensive test scenarios for the inquiry-to-project workflow. Total: 44 test cases.

## Test Case Format

Each test case includes:
- **ID**: Unique identifier (TC-INQ-###)
- **Feature**: Which component is being tested
- **Scenario**: What we're testing
- **Steps**: How to execute the test
- **Expected Result**: What should happen
- **Priority**: High/Medium/Low

---

## 1. Inquiry Form Submission (5 test cases)

### TC-INQ-001: Valid Form Submission
**Priority:** High
**Feature:** Inquiry Form

**Steps:**
1. Navigate to home page inquiry form
2. Fill Step 1: Company Name="Acme", Contact Name="John", Email="john@acme.com"
3. Click "Next"
4. Fill Step 2: Select "Product Demo / Explainer"
5. Click "Next"
6. Fill Step 3: Description="Test project", Budget="$5k-$10k", Timeline="1-2 months", Length="2-3 min"
7. Click "Next"
8. Fill Step 4 (optional fields) - leave blank
9. Click "Review"
10. Check consent checkbox
11. Click "Submit Inquiry"

**Expected:**
- ✓ Inquiry created with status 'new'
- ✓ Inquiry number generated (INQ-YYYY-NNN)
- ✓ Success page displayed with inquiry number
- ✓ Confirmation email sent to john@acme.com
- ✓ Alert email sent to admin team
- ✓ Redirects to success page

---

### TC-INQ-002: Missing Required Fields
**Priority:** High
**Feature:** Inquiry Form Validation

**Steps:**
1. Navigate to inquiry form
2. Leave "Company Name" blank
3. Fill other required fields
4. Click "Next"

**Expected:**
- ✓ Validation error displayed
- ✓ Error message: "Company name is required"
- ✓ Field highlighted in red
- ✓ Form not submitted
- ✓ User remains on Step 1

---

### TC-INQ-003: Invalid Email Format
**Priority:** High
**Feature:** Inquiry Form Validation

**Steps:**
1. Fill Company Name and Contact Name
2. Enter email as "notanemail"
3. Click "Next"

**Expected:**
- ✓ Validation error: "Please enter a valid email address"
- ✓ Email field highlighted
- ✓ Cannot proceed to next step

---

### TC-INQ-004: Reference Link Validation
**Priority:** Medium
**Feature:** Inquiry Form

**Steps:**
1. Navigate to Step 4
2. Add reference link: "not-a-url"
3. Click "+ Add"

**Expected:**
- ✓ Error: "Please enter a valid URL"
- ✓ Valid URLs accepted (youtube.com, vimeo.com, etc.)
- ✓ Can add multiple valid links
- ✓ Can remove added links

---

### TC-INQ-005: Multi-Step Navigation
**Priority:** High
**Feature:** Inquiry Form Navigation

**Steps:**
1. Fill Step 1 completely
2. Click "Next" → Step 2
3. Select project type
4. Click "Back" → Step 1
5. Verify data persists
6. Click "Next" again

**Expected:**
- ✓ Data persists when navigating back
- ✓ Progress indicator shows current step
- ✓ Can complete form from any step
- ✓ No data loss during navigation

---

## 2. Admin Inquiry Management (4 test cases)

### TC-INQ-006: View Inquiries Dashboard
**Priority:** High
**Feature:** Admin Dashboard

**Steps:**
1. Login as admin
2. Navigate to /portal/admin/inquiries

**Expected:**
- ✓ See all inquiries sorted by newest first
- ✓ Status badges display correctly (colors, labels)
- ✓ Can filter by status dropdown
- ✓ Can search by company/email
- ✓ Summary metrics shown (3 New, 5 Pending, etc.)

---

### TC-INQ-007: Assign Inquiry to Admin
**Priority:** High
**Feature:** Inquiry Assignment

**Steps:**
1. Select unassigned inquiry
2. Click "Assign to me" or select from dropdown
3. Confirm assignment

**Expected:**
- ✓ Inquiry shows assigned admin name
- ✓ Status updates to 'reviewing'
- ✓ Assigned admin receives notification
- ✓ Inquiry appears in admin's assigned filter

---

### TC-INQ-008: Add Internal Note
**Priority:** Medium
**Feature:** Inquiry Notes

**Steps:**
1. Open inquiry detail page
2. Write note: "Called customer, they're flexible on timeline"
3. Click "Save Note"

**Expected:**
- ✓ Note saved with timestamp
- ✓ Author name displayed
- ✓ Note visible to all admins
- ✓ Note NOT visible to customer
- ✓ Activity log updated

---

### TC-INQ-009: Update Inquiry Status
**Priority:** High
**Feature:** Status Management

**Steps:**
1. Select inquiry with status 'new'
2. Change status to 'reviewing'
3. Save changes

**Expected:**
- ✓ Status updates in database
- ✓ `updated_at` timestamp changes
- ✓ Activity log records status change
- ✓ Dashboard reflects new status

---

## 3. Proposal Creation (5 test cases)

### TC-INQ-010: Create Proposal Draft
**Priority:** High
**Feature:** Proposal Builder

**Steps:**
1. From inquiry detail, click "Create Proposal"
2. Add pricing line items (total $8,000)
3. Write project scope
4. Add 4 deliverables with week estimates
5. Create 3 milestones
6. Set revisions: 2
7. Add payment link
8. Click "Save Draft"

**Expected:**
- ✓ Proposal created with status 'draft'
- ✓ Proposal number generated (PROP-YYYY-NNN)
- ✓ Review token (UUID) generated
- ✓ Can edit draft later
- ✓ NOT sent to customer yet

---

### TC-INQ-011: Send Proposal to Customer
**Priority:** High
**Feature:** Proposal Sending

**Steps:**
1. Complete proposal draft
2. Click "Preview" to verify
3. Click "Send to Customer"
4. Confirm action

**Expected:**
- ✓ Proposal status → 'sent'
- ✓ Inquiry status → 'proposal_sent'
- ✓ Email sent to customer with review link
- ✓ Admin receives confirmation
- ✓ Can no longer edit proposal

---

### TC-INQ-012: Proposal Pricing Calculation
**Priority:** High
**Feature:** Pricing Calculator

**Steps:**
1. Add line item: "Script" $1,500 × 1
2. Add line item: "Animation" $4,500 × 1
3. Add line item: "Voiceover" $500 × 2

**Expected:**
- ✓ Subtotal = $6,500
- ✓ Total displays correctly
- ✓ Can edit quantities
- ✓ Can remove line items
- ✓ Total updates in real-time

---

### TC-INQ-013: Add Deliverables
**Priority:** High
**Feature:** Deliverable Builder

**Steps:**
1. Add deliverable: "Script", Week 1
2. Add deliverable: "Storyboard", Week 2
3. Reorder deliverables (drag/drop)
4. Delete one deliverable

**Expected:**
- ✓ Deliverables saved with IDs
- ✓ Can reorder via drag-drop
- ✓ Can delete deliverables
- ✓ Week numbers validated (must be positive)

---

### TC-INQ-014: Create Milestones
**Priority:** Medium
**Feature:** Milestone Builder

**Steps:**
1. Create milestone "Pre-Production"
2. Link to deliverables: Script, Storyboard
3. Set estimated date: "Week 2"
4. Create second milestone

**Expected:**
- ✓ Milestone saved with deliverable IDs
- ✓ Displays correctly in preview
- ✓ Can link multiple deliverables
- ✓ Order preserved

---

## 4. Customer Proposal Review (5 test cases)

### TC-INQ-015: Access Proposal via Token
**Priority:** High
**Feature:** Public Proposal Viewing

**Steps:**
1. Customer receives email
2. Click proposal review link
3. Page loads

**Expected:**
- ✓ Proposal page loads without login
- ✓ View event tracked (first time only)
- ✓ Proposal status → 'viewed'
- ✓ Admin notified of view
- ✓ All proposal details visible

---

### TC-INQ-016: Accept Proposal
**Priority:** High
**Feature:** Proposal Acceptance

**Steps:**
1. Customer reviews proposal
2. Click "Accept & Proceed to Payment"
3. Confirm acceptance

**Expected:**
- ✓ Proposal status → 'accepted'
- ✓ Inquiry status → 'accepted'
- ✓ Redirect to payment page
- ✓ Admin receives notification
- ✓ Acceptance timestamp recorded

---

### TC-INQ-017: Request Changes
**Priority:** High
**Feature:** Proposal Feedback

**Steps:**
1. Click "Request Changes"
2. Fill feedback: "Can we reduce timeline to 4 weeks?"
3. Check "Timeline" checkbox
4. Submit

**Expected:**
- ✓ Feedback saved to database
- ✓ Proposal status → 'revision_requested'
- ✓ Inquiry status → 'negotiating'
- ✓ Admin receives email notification
- ✓ Confirmation shown to customer

---

### TC-INQ-018: Expired Proposal Link
**Priority:** Medium
**Feature:** Proposal Expiration

**Steps:**
1. Set proposal expiration date in past
2. Try to access via review link

**Expected:**
- ✓ Shows "This proposal has expired" message
- ✓ Option to request new link
- ✓ Cannot accept/reject expired proposal
- ✓ Admin can resend with new token

---

### TC-INQ-019: Invalid Proposal Token
**Priority:** High
**Feature:** Security

**Steps:**
1. Navigate to /proposal/review/invalid-token-123

**Expected:**
- ✓ 404 error page displayed
- ✓ No proposal data exposed
- ✓ Error logged but no sensitive info
- ✓ User-friendly error message

---

## 5. Negotiation Loop (4 test cases)

### TC-INQ-020: Admin Responds to Feedback
**Priority:** High
**Feature:** Feedback Response

**Steps:**
1. Admin views feedback
2. Add response: "We can do 5 weeks instead of 4"
3. Save response

**Expected:**
- ✓ Response saved
- ✓ Customer receives email notification
- ✓ Feedback status → 'responded'
- ✓ Response visible to customer

---

### TC-INQ-021: Create Revised Proposal
**Priority:** High
**Feature:** Proposal Versioning

**Steps:**
1. From proposal with feedback, click "Revise"
2. Update timeline to 5 weeks
3. Update pricing if needed
4. Add changes summary
5. Send to customer

**Expected:**
- ✓ New proposal version created (v2)
- ✓ Version number incremented
- ✓ Links to previous version
- ✓ New review token generated
- ✓ Old proposal marked 'superseded'
- ✓ Customer gets new review link

---

### TC-INQ-022: Accept Revised Proposal
**Priority:** High
**Feature:** Multi-Version Workflow

**Steps:**
1. Customer reviews v2
2. Accepts v2

**Expected:**
- ✓ Latest version (v2) marked accepted
- ✓ Previous versions archived
- ✓ Only v2 used for project conversion
- ✓ Version history preserved

---

### TC-INQ-023: Multiple Negotiation Rounds
**Priority:** Medium
**Feature:** Extended Negotiation

**Steps:**
1. Customer requests changes to v1
2. Admin sends v2
3. Customer requests more changes
4. Admin sends v3
5. Customer accepts v3

**Expected:**
- ✓ All versions linked via `previousVersionId`
- ✓ Version history complete (v1→v2→v3)
- ✓ Only v3 active
- ✓ Can view all versions in admin panel

---

## 6. Payment Integration (4 test cases)

### TC-INQ-024: Payment Link Click
**Priority:** High
**Feature:** Payment Redirect

**Steps:**
1. Accept proposal
2. Click "Proceed to Payment"

**Expected:**
- ✓ Redirects to Razorpay payment gateway
- ✓ Correct amount shown ($4,000 deposit)
- ✓ Customer email prefilled
- ✓ Inquiry metadata included

---

### TC-INQ-025: Successful Payment Webhook
**Priority:** High
**Feature:** Webhook Processing

**Steps:**
1. Complete payment in Razorpay
2. Webhook fires to /api/webhooks/payment

**Expected:**
- ✓ Webhook signature validated
- ✓ Payment amount verified
- ✓ Inquiry status → 'paid'
- ✓ Project creation triggered
- ✓ User account created
- ✓ Welcome email sent
- ✓ Admin notified

---

### TC-INQ-026: Failed Payment
**Priority:** High
**Feature:** Payment Error Handling

**Steps:**
1. Attempt payment with declined card
2. Payment fails

**Expected:**
- ✓ Customer returned to proposal page
- ✓ Error message shown
- ✓ Can retry payment
- ✓ Inquiry remains 'payment_pending'
- ✓ No project created

---

### TC-INQ-027: Abandoned Payment
**Priority:** Medium
**Feature:** Payment Reminders

**Steps:**
1. Accept proposal but don't pay
2. Wait 3 days

**Expected:**
- ✓ Reminder email sent on day 3
- ✓ Second reminder on day 7
- ✓ Admin can see abandoned payments list
- ✓ Inquiry shows 'payment_pending'

---

## 7. Account Creation & Portal Access (5 test cases)

### TC-INQ-028: Auto Account Creation
**Priority:** High
**Feature:** Account Provisioning

**Steps:**
1. Payment webhook completes successfully

**Expected:**
- ✓ User account created with email from inquiry
- ✓ Role set to 'client'
- ✓ `is_primary_contact` = true
- ✓ `hasAgreed` = false (must agree on first login)
- ✓ Magic link token generated
- ✓ Welcome email sent

---

### TC-INQ-029: Magic Link Login
**Priority:** High
**Feature:** Authentication

**Steps:**
1. Customer receives welcome email
2. Clicks magic link

**Expected:**
- ✓ User authenticated automatically
- ✓ JWT token created
- ✓ Redirected to onboarding screen
- ✓ Session persists

---

### TC-INQ-030: First Login Agreement
**Priority:** High
**Feature:** Project Terms Acceptance

**Steps:**
1. Click magic link
2. View onboarding screen with project terms
3. Check "I agree" checkbox
4. Click "Access Project"

**Expected:**
- ✓ Onboarding screen displays proposal terms
- ✓ Cannot proceed without checking box
- ✓ `hasAgreed` flag set to true
- ✓ Redirected to project dashboard
- ✓ Won't see onboarding again

---

### TC-INQ-031: Portal Access After Agreement
**Priority:** High
**Feature:** Project Portal

**Steps:**
1. Complete agreement
2. Access project dashboard

**Expected:**
- ✓ Project details visible
- ✓ All deliverables shown
- ✓ Can navigate all project pages
- ✓ Team members listed
- ✓ Activity feed shows history

---

### TC-INQ-032: Expired Magic Link
**Priority:** Medium
**Feature:** Token Expiration

**Steps:**
1. Wait 24+ hours after welcome email
2. Click magic link

**Expected:**
- ✓ Shows "This link has expired" message
- ✓ Option to request new link
- ✓ New link generated on request
- ✓ Old token invalidated

---

## 8. Project Conversion (3 test cases)

### TC-INQ-033: Convert Inquiry to Project
**Priority:** High
**Feature:** Automatic Conversion

**Steps:**
1. Payment confirmed via webhook
2. System auto-converts inquiry

**Expected:**
- ✓ Project created with agreed scope
- ✓ Deliverables copied from proposal
- ✓ Milestones copied from proposal
- ✓ Revision count set correctly
- ✓ Customer added to clientTeam
- ✓ Project manager can be assigned
- ✓ Inquiry status → 'converted'
- ✓ `convertedToProjectId` populated

---

### TC-INQ-034: Project Inherits Proposal Data
**Priority:** High
**Feature:** Data Mapping

**Steps:**
1. After conversion, check project details

**Expected:**
- ✓ Project name = "{{companyName}} - {{projectType}}"
- ✓ Scope matches proposal exactly
- ✓ All deliverables present
- ✓ Revision count correct
- ✓ Timeline reflects milestones
- ✓ No data loss during conversion

---

### TC-INQ-035: Customer Sees Project Immediately
**Priority:** High
**Feature:** Portal Integration

**Steps:**
1. Customer logs in after conversion

**Expected:**
- ✓ Project shows in portal
- ✓ All deliverables visible with status
- ✓ Status shows "In Progress"
- ✓ Can navigate: Dashboard, Files, Team tabs
- ✓ Activity feed has conversion event

---

## 9. Edge Cases (5 test cases)

### TC-INQ-036: Duplicate Email Inquiry
**Priority:** Low
**Feature:** Duplicate Handling

**Steps:**
1. Submit inquiry with john@acme.com
2. Submit another inquiry with same email

**Expected:**
- ✓ Both inquiries created (no duplicate check)
- ✓ Different inquiry numbers
- ✓ Admin sees both in dashboard
- ✓ Same email allowed for multiple inquiries

---

### TC-INQ-037: Proposal Accepted But Never Paid
**Priority:** Medium
**Feature:** Payment Follow-up

**Steps:**
1. Accept proposal
2. Close browser without paying
3. Wait indefinitely

**Expected:**
- ✓ Inquiry remains 'payment_pending'
- ✓ Reminder emails sent (day 3, 7, 14)
- ✓ Admin can manually follow up
- ✓ Admin can see in "Payment Pending" filter

---

### TC-INQ-038: Admin Deletes Draft Proposal
**Priority:** Low
**Feature:** Draft Management

**Steps:**
1. Create proposal draft
2. Don't send it
3. Delete draft

**Expected:**
- ✓ Proposal deleted from database
- ✓ Inquiry reverts to 'reviewing' status
- ✓ No impact on inquiry data

---

### TC-INQ-039: Old Proposal Link After Revision
**Priority:** Medium
**Feature:** Version Awareness

**Steps:**
1. Admin sends v1
2. Admin sends v2 (revised)
3. Customer opens v1 link

**Expected:**
- ✓ Shows message: "A newer version exists"
- ✓ Link to latest version (v2)
- ✓ Cannot accept old version
- ✓ Old version marked 'superseded'

---

### TC-INQ-040: Payment Webhook Fires Twice
**Priority:** High
**Feature:** Idempotency

**Steps:**
1. Payment completes
2. Webhook fires twice (race condition)

**Expected:**
- ✓ Project created only once
- ✓ Account created only once
- ✓ Duplicate detection works
- ✓ Second webhook ignored
- ✓ No errors logged

---

## 10. Security & Permissions (4 test cases)

### TC-INQ-041: Proposal Token Security
**Priority:** High
**Feature:** Access Control

**Steps:**
1. Try to guess proposal token
2. Try common patterns (000000, 123456, etc.)

**Expected:**
- ✓ UUID makes guessing infeasible
- ✓ Invalid tokens return 404
- ✓ No data leakage in errors
- ✓ Rate limiting on failed attempts

---

### TC-INQ-042: Admin-Only Endpoints
**Priority:** High
**Feature:** API Security

**Steps:**
1. Try to access /api/admin/inquiries without auth token
2. Try with invalid token
3. Try with customer role token

**Expected:**
- ✓ 401 Unauthorized without token
- ✓ 401 with invalid token
- ✓ 403 Forbidden with insufficient role
- ✓ No data returned

---

### TC-INQ-043: Cross-Customer Data Access
**Priority:** High
**Feature:** Data Isolation

**Steps:**
1. Customer A has token for Proposal A
2. Try to access Proposal B using different token

**Expected:**
- ✓ Can only access own proposal
- ✓ No cross-customer data exposure
- ✓ 404 for unauthorized access attempts

---

### TC-INQ-044: SQL Injection Prevention
**Priority:** High
**Feature:** Input Sanitization

**Steps:**
1. Try SQL injection in inquiry form fields:
   - Company Name: `'; DROP TABLE inquiries;--`
   - Email: `admin@test.com' OR '1'='1`
2. Submit form

**Expected:**
- ✓ Parameterized queries prevent injection
- ✓ Invalid input sanitized/escaped
- ✓ No database errors
- ✓ Data stored safely

---

## Test Execution Guidelines

### Test Environments
- **Local**: Development with Mailtrap, test database
- **Staging**: Pre-production with real services
- **Production**: Live system (limited testing)

### Test Data
- Use `@test.motionify.studio` emails for testing
- Clear test data between runs
- Reset sequences annually

### Automation
- Unit tests: All validation logic
- Integration tests: API endpoints
- E2E tests: Critical user flows (TC-INQ-001, TC-INQ-015, TC-INQ-025, TC-INQ-028, TC-INQ-033)

### Regression Testing
Run full test suite after:
- Database schema changes
- API endpoint modifications
- Email template updates
- Payment integration changes

### Bug Reporting
Include:
- Test case ID
- Steps to reproduce
- Expected vs actual result
- Screenshots/logs
- Environment details
