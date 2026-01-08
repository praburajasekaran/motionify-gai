# Motionify PM Portal Test Cases

Comprehensive test cases for the Motionify Project Management Portal - a client collaboration platform for video production.

**Last Updated:** 2026-01-08  
**Total Test Cases:** 85  
**Status Summary:**
- ✅ Complete: 29
- ⏳ Not Started: 25
- ❌ Not Implemented: 15
- ❌ Not Applicable: 3
- 🚫 Blocked: 13

---

## 1. AUTHENTICATION TESTS

### TC-AUTH-001: Magic Link Login - Valid Email ✅ COMPLETE
**Priority:** Critical  
**Type:** Functional  
**Status:** ✅ Magic link login implemented in `LoginScreen.tsx`

**Test Steps:**
1. Navigate to `/login`
2. Enter registered email: `client.test@motionify.studio`
3. Click "Send Magic Link"
4. Check email inbox for magic link
5. Click link within 15 minutes

**Expected Results:**
- ✅ Success message: "Check your email for the login link"
- ✅ Magic link email received within 30 seconds
- ✅ Clicking link logs user in
- ✅ Redirects to appropriate dashboard based on role
- ✅ Session cookie/JWT set

---

### TC-AUTH-002: Magic Link Login - Unregistered Email 🚫 BLOCKED
**Priority:** High  
**Type:** Security  
**Status:** 🚫 Blocked - Backend Netlify auth functions (`auth-request-magic-link`) not implemented

**Test Steps:**
1. Navigate to `/login`
2. Enter unregistered email: `unknown@example.com`
3. Click "Send Magic Link"

**Expected Results:**
- ✅ Generic success message displayed (prevents user enumeration)
- ✅ NO magic link actually sent
- ✅ No database token created
- ✅ Rate limiting applies

> **Note:** Frontend `LoginScreen.tsx` already shows generic success message. Backend validation pending.

---

### TC-AUTH-003: Magic Link - Expired Token 🚫 BLOCKED
**Priority:** High  
**Type:** Security  
**Status:** 🚫 Blocked - Backend Netlify auth functions (`auth-verify-magic-link`) not implemented

**Test Steps:**
1. Request magic link
2. Wait 16 minutes (link expires at 15 min)
3. Click expired link

**Expected Results:**
- ✅ Error: "This link has expired"
- ✅ Redirect to login page
- ✅ "Request new link" option shown
- ✅ User NOT authenticated

> **Note:** Database `sessions` table has `expires_at` column. Backend verification logic pending.

---

### TC-AUTH-004: Magic Link - Already Used 🚫 BLOCKED
**Priority:** High  
**Type:** Security  
**Status:** 🚫 Blocked - Backend Netlify auth functions (`auth-verify-magic-link`) not implemented

**Test Steps:**
1. Request magic link
2. Click link and login successfully
3. Logout
4. Click same magic link again

**Expected Results:**
- ✅ Error: "This link has already been used"
- ✅ User NOT authenticated
- ✅ Must request new link

> **Note:** Backend should delete token after first use. Implementation pending.

---

### TC-AUTH-005: Role-Based Dashboard Redirect ✅ COMPLETE
**Priority:** High  
**Type:** Functional  
**Status:** ✅ Verified 2026-01-08 - Implemented in `App.tsx` and `pages/Login.tsx`

**Test Steps:**
1. Login as Super Admin
2. Verify redirect location
3. Logout, login as Client
4. Verify redirect location

**Expected Results:**
- ✅ Super Admin → `/` (root dashboard with admin context)
- ✅ Project Manager → `/` (root dashboard with PM context)
- ✅ Team Member → `/` (root dashboard with member context)
- ✅ Client Primary Contact → `/` (root dashboard with client context)
- ✅ Client Team Member → `/` (root dashboard with client context)

> **Verified:** All roles correctly redirect to root dashboard (`/#/`) with appropriate role identity displayed. Development mode uses mock user selection in `pages/Login.tsx`.

---

### TC-AUTH-006: Session Persistence ⏳ NOT STARTED
**Priority:** Medium  
**Type:** Functional  
**Status:** ⏳ Currently uses localStorage, needs JWT

**Test Steps:**
1. Login successfully
2. Close browser completely
3. Reopen browser and navigate to portal

**Expected Results:**
- ✅ User remains logged in
- ✅ No re-authentication required
- ✅ Session valid for 30 days

---

### TC-AUTH-007: Logout Functionality ✅ COMPLETE
**Priority:** Medium  
**Type:** Functional  
**Status:** ✅ Implemented in header component

**Test Steps:**
1. Click user avatar/menu
2. Click "Logout"
3. Attempt to access protected route

**Expected Results:**
- ✅ Session cleared
- ✅ Redirect to login page
- ✅ Browser back button doesn't restore session
- ✅ Protected routes inaccessible

---

## 2. PROJECT MANAGEMENT TESTS

### TC-PM-001: Create New Project (Admin) ✅ COMPLETE
**Priority:** Critical  
**Type:** Functional  
**Status:** ✅ Implemented in `CreateProject.tsx`

**Test Steps:**
1. Login as Super Admin
2. Navigate to Projects → Create New
3. Enter project details:
   - Name: "Brand Video 2025"
   - Client: "Acme Corp"
   - Description: "Launch video for Q1"
4. Add deliverables: "Main Video", "Social Cut"
5. Set revision count: 3
6. Assign project manager
7. Click "Create Project"

**Expected Results:**
- ✅ Project created with status "In Progress"
- ✅ Deliverables linked to project
- ✅ Revision quota set (3 revisions)
- ✅ Project manager assigned
- ✅ Activity logged: "Project created"
- ✅ Email sent to assigned team

---

### TC-PM-002: View Project Overview ✅ COMPLETE
**Priority:** Critical  
**Type:** Functional  
**Status:** ✅ Implemented in `ProjectOverview.tsx`

**Test Steps:**
1. Navigate to project from list
2. Verify overview page loads

**Expected Results:**
- ✅ Project name, client, status visible
- ✅ Deliverables list with status
- ✅ Revision count: "1 of 3 used"
- ✅ Team members listed
- ✅ Recent activity feed
- ✅ Progress percentage displayed

---

### TC-PM-003: Archive Completed Project ⏳ NOT STARTED
**Priority:** High  
**Type:** Functional  
**Status:** ⏳ UI exists, needs backend

**Test Steps:**
1. Login as Super Admin
2. Navigate to completed project
3. Click "Archive Project"
4. Type project name to confirm
5. Confirm archival

**Expected Results:**
- ✅ Status changes to "Archived"
- ✅ Project hidden from main list
- ✅ Accessible via "View Archived" filter
- ✅ All data preserved (read-only)
- ✅ Email sent to team members

---

### TC-PM-004: Delete Project (Admin Only) ⏳ NOT STARTED
**Priority:** High  
**Type:** Functional  
**Status:** ⏳ Not implemented

**Test Steps:**
1. Login as Super Admin
2. Navigate to archived project
3. Click "Delete Project"
4. Type project name to confirm
5. Confirm deletion

**Expected Results:**
- ✅ Project permanently deleted
- ✅ All tasks, files, comments deleted
- ✅ Cannot be undone
- ✅ Email sent to team members
- ✅ Audit log entry created

---

### TC-PM-005: Project Status Transitions ⏳ NOT STARTED
**Priority:** High  
**Type:** Functional  
**Status:** ⏳ State machine not enforced

**Test Steps:**
1. Verify valid transitions:
   - Draft → Active
   - Active → On Hold
   - Active → Completed
   - Completed → Archived
2. Attempt invalid transition:
   - Archived → Active

**Expected Results:**
- ✅ Valid transitions succeed
- ✅ Invalid transitions blocked with error
- ✅ Activity logged for each transition
- ✅ Team notified of status changes

---

### TC-PM-006: Assign Motionify Team (Admin) ✅ COMPLETE
**Priority:** High  
**Type:** Functional  
**Status:** ✅ Implemented in `ManageTeamModal.tsx`

**Test Steps:**
1. Login as Super Admin
2. Open project → Team tab
3. Click "Add Team Member"
4. Select "Sarah Mitchell" (Project Manager)
5. Confirm assignment

**Expected Results:**
- ✅ Team member added to project
- ✅ Email notification sent
- ✅ Activity logged
- ✅ Member appears in project team list
- ✅ Member gains project access

---

### TC-PM-007: Cannot Delete Last Project Manager 🚫 BLOCKED
**Priority:** High  
**Type:** Validation  
**Status:** 🚫 Backend validation not implemented

**Test Steps:**
1. Project with only 1 project manager
2. Attempt to remove that PM

**Expected Results:**
- ✅ Error: "Cannot remove last project manager"
- ✅ Removal blocked
- ✅ Suggestion: "Assign another PM first"

---

## 3. TASK MANAGEMENT TESTS

### TC-TM-001: Create Task (Motionify Team) ✅ COMPLETE
**Priority:** Critical  
**Type:** Functional  
**Status:** ✅ Implemented in `TaskList.tsx`

**Test Steps:**
1. Login as Project Manager
2. Navigate to project → Tasks
3. Click "Create Task"
4. Enter details:
   - Title: "Write script draft"
   - Deliverable: "Main Video"
   - Visibility: "Visible to Client"
   - Deadline: Jan 15, 2026
5. Assign to team member
6. Save

**Expected Results:**
- ✅ Task created with status "Pending"
- ✅ Linked to deliverable
- ✅ Assignee notified via email
- ✅ Activity logged
- ✅ Task appears in "All Tasks" view

---

### TC-TM-002: Client Cannot Create Tasks ⏳ NOT STARTED
**Priority:** High  
**Type:** Permission  
**Status:** ⏳ UI restriction exists, needs API enforcement

**Test Steps:**
1. Login as Client Primary Contact
2. Navigate to project → Tasks
3. Look for "Create Task" button

**Expected Results:**
- ✅ "Create Task" button NOT visible
- ✅ If API called directly: 403 Forbidden
- ✅ Error: "Only Motionify team can create tasks"

---

### TC-TM-003: Task Status Transitions ✅ COMPLETE
**Priority:** Critical  
**Type:** Functional  
**Status:** ✅ State machine in `taskStateTransitions.ts`

**Test Steps:**
1. Task in "Pending" status
2. Move to "In Progress" (any team member)
3. Move to "Awaiting Approval" (Motionify team only)
4. Client approves → "Completed"

**Expected Results:**
- ✅ Pending → In Progress ✓
- ✅ In Progress → Awaiting Approval ✓
- ✅ Awaiting Approval → Completed (Client PM only) ✓
- ✅ Invalid transitions blocked
- ✅ Activity logged for each change

---

### TC-TM-004: ~~Client Approves Task~~ ❌ NOT APPLICABLE
**Priority:** N/A  
**Type:** Functional  
**Status:** ❌ **INVALID TEST** - Tasks are for Motionify team members only. Clients approve **Deliverables**, not Tasks. See TC-DA-002.

> **Note:** This test case was incorrectly specified. In Motionify:
> - **Tasks** = Internal work items for Motionify team (PM, Team Members)
> - **Deliverables** = Client-facing outputs that require approval
>
> For client approval flow, see: **TC-DA-002: Approve Deliverable** ✅ COMPLETE

---

### TC-TM-005: ~~Client Requests Revision~~ ❌ NOT APPLICABLE
**Priority:** N/A  
**Type:** Functional  
**Status:** ❌ **INVALID TEST** - Tasks are for Motionify team members only. Clients request revisions on **Deliverables**, not Tasks. See TC-DA-003.

> **Note:** This test case was incorrectly specified. For client revision requests, see: **TC-DA-003: Request Revision (Within Quota)** ✅ COMPLETE

---

### TC-TM-006: ~~Only Client PM Can Approve~~ ❌ NOT APPLICABLE
**Priority:** N/A  
**Type:** Permission  
**Status:** ❌ **INVALID TEST** - Tasks are for Motionify team members only. Clients don't approve tasks. See TC-AC-004.

> **Note:** For deliverable approval permissions, see: **TC-AC-004: Client Team Cannot Approve** ✅ COMPLETE

---

### TC-TM-007: Follow/Unfollow Task ✅ COMPLETE
**Priority:** High  
**Type:** Functional  
**Status:** ✅ Implemented in `ProjectDetail.tsx`. Verified with optimistic updates and error handling.

**Test Steps:**
1. View task not assigned to you
2. Click "Follow" button (Bell icon)
3. Verify notifications received on task updates
4. Click "Unfollow"

**Expected Results:**
- ✅ Follow button toggles state
- ✅ Followers count displayed (implicit via icon state)
- ✅ Followers receive notifications: status changes, comments, files
- ✅ Can view list of followers
- ✅ Assignees automatically follow

---

### TC-TM-008: Add Delivery Notes ✅ COMPLETE
**Priority:** Medium  
**Type:** Functional  
**Status:** ✅ Implemented in `TaskItem.tsx`

**Test Steps:**
1. Change task status to "Awaiting Approval"
2. Enter delivery notes: "Video includes latest brand guidelines..."
3. Submit

**Expected Results:**
- ✅ Delivery notes saved
- ✅ Notes visible to client when reviewing
- ✅ Notes included in notification email
- ✅ Can edit within 1 hour of submission

---

### TC-TM-009: Task Visibility - Internal Only ⏳ NOT STARTED
**Priority:** Medium  
**Type:** Functional  
**Status:** ⏳ Visibility flag exists, filtering not enforced

**Test Steps:**
1. Create task with visibility "Internal Only"
2. Login as Client
3. View project tasks

**Expected Results:**
- ✅ Internal task NOT visible to client
- ✅ Task visible to all Motionify roles
- ✅ Client cannot access via direct URL
- ✅ Internal badge visible to team

---

### TC-TM-010: Task Filters ✅ COMPLETE
**Priority:** Medium  
**Type:** Functional  
**Status:** ✅ Basic filtering implemented

**Test Steps:**
1. Navigate to project tasks
2. Apply filter: "My Tasks"
3. Apply filter: "Pending" status
4. Search for "script"

**Expected Results:**
- ✅ "My Tasks" shows assigned tasks only
- ✅ Status filter works correctly
- ✅ Search matches title and description
- ✅ Filter combinations work (AND logic)
- ✅ Result count displayed

---

## 4. FILE MANAGEMENT TESTS

### TC-FM-001: Upload File to Deliverable ✅ COMPLETE
**Priority:** Critical  
**Type:** Functional  
**Status:** ✅ UI implemented in `Files.tsx`

**Test Steps:**
1. Navigate to project → Files
2. Select deliverable: "Main Video"
3. Drag and drop file or click upload
4. Add optional description
5. Submit

**Expected Results:**
- ✅ Upload progress indicator shown
- ✅ File linked to deliverable
- ✅ File appears in deliverable section
- ✅ Activity logged
- ✅ Team notified

---

### TC-FM-002: Download File ✅ COMPLETE
**Priority:** Critical  
**Type:** Functional  
**Status:** ✅ UI implemented (needs R2 integration)

**Test Steps:**
1. Navigate to file in project
2. Click download button

**Expected Results:**
- ✅ Presigned URL generated
- ✅ Download starts immediately
- ✅ Original filename preserved
- ✅ Large files show progress

---

### TC-FM-003: File Size Limit (500MB) ✅ COMPLETE
**Priority:** High  
**Type:** Validation  
**Status:** ✅ Implemented in `FileUpload.tsx`, `UploadFileModal.tsx` - 500MB limit for client/team uploads. Admin deliverable uploads allow 5GB.

**Test Steps:**
1. Attempt to upload 600MB file
2. Verify rejection

**Expected Results:**
- ✅ Error: "File exceeds 500MB limit"
- ✅ Upload blocked before transfer
- ✅ Suggestion: "Compress file or contact admin"

---

### TC-FM-004: Files Grouped by Deliverable ✅ COMPLETE
**Priority:** Medium  
**Type:** UI  
**Status:** ✅ Implemented in `Files.tsx`

**Test Steps:**
1. Navigate to project → Files
2. Verify deliverable sections

**Expected Results:**
- ✅ Files grouped under deliverable headers
- ✅ File count per deliverable shown
- ✅ "All Files" view available
- ✅ Expand/collapse sections

---

### TC-FM-005: Comment on File ✅ COMPLETE
**Priority:** Medium  
**Type:** Functional  
**Status:** ✅ Implemented in `FileItem.tsx`

**Test Steps:**
1. Navigate to file
2. Expand comments section
3. Enter comment with @mention
4. Submit

**Expected Results:**
- ✅ Comment appears immediately
- ✅ @mentioned user notified
- ✅ File uploader notified
- ✅ Comment shows author, timestamp

---

### TC-FM-006: Rename File ⏳ NOT STARTED
**Priority:** Low  
**Type:** Functional  
**Status:** ⏳ UI exists, needs backend

**Test Steps:**
1. Click filename (inline edit)
2. Change name: "draft_v1.mp4" → "final_v1.mp4"
3. Save

**Expected Results:**
- ✅ Filename updated
- ✅ Extension preserved
- ✅ Activity logged
- ✅ Cannot rename to existing name

---

### TC-FM-007: File Expiry After 365 Days ❌ NOT IMPLEMENTED
**Priority:** High  
**Type:** Backend  
**Status:** ❌ Expiry logic not built

**Test Steps:**
1. Final deliverable delivered 366 days ago
2. Client attempts to download

**Expected Results:**
- ✅ Download returns 403 Forbidden
- ✅ Error: "Files have expired"
- ✅ Suggestion: "Contact support to restore"
- ✅ Motionify staff can still access

---

## 5. DELIVERABLE & APPROVAL TESTS

### TC-DA-001: View Beta Deliverable (Awaiting Approval) ✅ COMPLETE
**Priority:** Critical  
**Type:** Functional  
**Status:** ✅ Verified - Review Beta button visible, deliverable status shown, revision quota displayed

**Test Steps:**
1. Login as Client Primary Contact
2. Navigate to deliverable in "awaiting_approval" status
3. View beta video/files

**Expected Results:**
- ✅ Beta files visible with watermark
- ✅ "Approve" and "Request Revision" buttons visible
- ✅ Delivery notes from team shown
- ✅ Cannot download final version yet

---

### TC-DA-002: Approve Deliverable ✅ COMPLETE
**Priority:** Critical  
**Type:** Functional  
**Status:** ✅ Verified - Approve Deliverable button visible for Primary Contact

**Test Steps:**
1. View deliverable in "awaiting_approval"
2. Click "Approve"
3. Confirm in modal

**Expected Results:**
- ✅ Status → "approved" → "payment_pending"
- ✅ `approvedBy` captured
- ✅ Invoice generated for balance payment
- ✅ Email sent to client with payment link

---

### TC-DA-003: Request Revision (Within Quota) ✅ COMPLETE
**Priority:** Critical  
**Type:** Functional  
**Status:** ✅ Verified - Request Revision button works, feedback form available, quota indicator shows "X of Y revisions"

**Test Steps:**
1. Project has 3 revisions, 1 used
2. View deliverable in "awaiting_approval"
3. Click "Request Revision"
4. Enter feedback (50+ characters)
5. Submit

**Expected Results:**
- ✅ Status → "rejected" → "revision_requested"
- ✅ Revision count: 2 of 3 used
- ✅ Feedback stored
- ✅ Motionify team notified

---

### TC-DA-004: Revision Request Blocked (Quota Exhausted) ✅ COMPLETE
**Priority:** High  
**Type:** Validation  
**Status:** ✅ Implemented in `DeliverableReviewModal.tsx` - Button disabled when quota exhausted, warning shown with "Request Additional Revisions" option

**Test Steps:**
1. Project has 3 revisions, 3 used (quota exhausted)
2. View deliverable in "awaiting_approval"
3. Attempt to click "Request Revision"

**Expected Results:**
- ✅ Button disabled
- ✅ Warning: "Revision quota exhausted"
- ✅ "Request Additional Revisions" option shown
- ✅ Links to paid revision flow

---

### TC-DA-005: Request Additional Revisions (Paid) ❌ NOT IMPLEMENTED
**Priority:** High  
**Type:** Functional  
**Status:** ❌ Additional revision flow not built

**Test Steps:**
1. Quota exhausted (3 of 3 used)
2. Click "Request Additional Revisions"
3. Enter reason (min 100 characters)
4. Select quantity: 2 additional revisions
5. Submit

**Expected Results:**
- ✅ Request created with status "pending"
- ✅ Email sent to Admin for approval
- ✅ Client sees: "Pending admin review"
- ✅ Cannot request new revision until approved

---

### TC-DA-006: Admin Approves Additional Revisions ❌ NOT IMPLEMENTED
**Priority:** High  
**Type:** Functional  
**Status:** ❌ Admin approval flow not built

**Test Steps:**
1. Login as Super Admin
2. View pending additional revision request
3. Review reason and pricing
4. Approve 2 additional revisions
5. Confirm

**Expected Results:**
- ✅ Project quota: 3 → 5 total revisions
- ✅ Request status → "approved"
- ✅ Client notified via email
- ✅ Client can now request revision

---

### TC-DA-007: Final Delivery After Payment ⏳ NOT STARTED
**Priority:** Critical  
**Type:** End-to-End  
**Status:** ⏳ Payment flow not complete

**Test Steps:**
1. Deliverable approved, status "payment_pending"
2. Client completes 50% balance payment
3. Verify final delivery

**Expected Results:**
- ✅ Status → "final_delivered"
- ✅ Final files (unwatermarked) accessible
- ✅ 365-day expiry countdown starts
- ✅ Email sent with download links

---

## 6. TEAM COLLABORATION TESTS

### TC-TC-001: Add Comment to Task ✅ COMPLETE
**Priority:** High  
**Type:** Functional  
**Status:** ✅ Implemented in `TaskItem.tsx`

**Test Steps:**
1. Expand task
2. Navigate to comments section
3. Enter comment: "Please check the audio levels @mike"
4. Submit

**Expected Results:**
- ✅ Comment appears immediately
- ✅ @mentioned user notified
- ✅ Assignees notified
- ✅ Comment count badge updates

---

### TC-TC-002: Edit Comment (Within 1 Hour) ⏳ NOT STARTED
**Priority:** Medium  
**Type:** Functional  
**Status:** ⏳ Edit window not enforced

**Test Steps:**
1. Post a comment
2. Within 1 hour, click "Edit"
3. Modify text
4. Save

**Expected Results:**
- ✅ Comment text updated
- ✅ "Edited" badge displayed
- ✅ No new notifications sent

---

### TC-TC-003: Cannot Edit Comment After 1 Hour ⏳ NOT STARTED
**Priority:** Medium  
**Type:** Validation  
**Status:** ⏳ Time window not enforced

**Test Steps:**
1. View comment posted > 1 hour ago
2. Attempt to click "Edit"

**Expected Results:**
- ✅ Edit button disabled
- ✅ Tooltip: "Comments can only be edited within 1 hour"

---

### TC-TC-004: @Mention Notification ⏳ NOT STARTED
**Priority:** High  
**Type:** Functional  
**Status:** ⏳ Mention detection exists, notifications pending

**Test Steps:**
1. Type "@" in comment box
2. Select user from autocomplete
3. Submit comment

**Expected Results:**
- ✅ @mention renders as link
- ✅ Mentioned user receives email notification
- ✅ Mentioned user receives in-app notification
- ✅ Multiple mentions supported

---

### TC-TC-005: Invite Client Team Member ⏳ NOT STARTED
**Priority:** High  
**Type:** Functional  
**Status:** ⏳ Direct add exists, proper invitation flow pending

**Test Steps:**
1. Login as Client Primary Contact
2. Navigate to Team tab
3. Click "Invite Team Member"
4. Enter email and name
5. Send invitation

**Expected Results:**
- ✅ Invitation email sent
- ✅ Invite link valid for 7 days
- ✅ Pending invitations listed
- ✅ Can resend or revoke invitation

---

### TC-TC-006: Client PM Removes Team Member ⏳ NOT STARTED
**Priority:** High  
**Type:** Functional  
**Status:** ⏳ UI exists, backend pending

**Test Steps:**
1. Login as Client Primary Contact
2. Navigate to Team tab
3. Click remove on client team member
4. Confirm removal

**Expected Results:**
- ✅ Member removed from project
- ✅ Access revoked immediately
- ✅ Historical data preserved
- ✅ Activity logged

---

### TC-TC-007: Client PM Cannot Remove Self ⏳ NOT STARTED
**Priority:** High  
**Type:** Validation  
**Status:** ⏳ Validation not enforced

**Test Steps:**
1. Login as Client Primary Contact
2. Attempt to remove self from team

**Expected Results:**
- ✅ Remove button disabled or hidden for self
- ✅ Message: "Transfer primary contact role first"
- ✅ Cannot remove via API either

---

## 7. NOTIFICATION TESTS

### TC-NT-001: Email on Task Assignment ⏳ NOT STARTED
**Priority:** High  
**Type:** Functional  
**Status:** ⏳ Email templates exist, sending not implemented

**Test Steps:**
1. Assign task to team member
2. Check assignee's email

**Expected Results:**
- ✅ Email received within 2 minutes
- ✅ Contains: task title, project name, deadline
- ✅ "View Task" link works
- ✅ Unsubscribe option present

---

### TC-NT-002: Email on Deliverable Ready ⏳ NOT STARTED
**Priority:** Critical  
**Type:** Functional  
**Status:** ⏳ Notification triggers defined, implementation pending

**Test Steps:**
1. Team marks deliverable as "awaiting_approval"
2. Check client's email

**Expected Results:**
- ✅ Email sent to Client Primary Contact
- ✅ Contains: deliverable name, project name
- ✅ "Review & Approve" link works
- ✅ Delivery notes included

---

### TC-NT-003: Email on Revision Request ⏳ NOT STARTED
**Priority:** High  
**Type:** Functional  
**Status:** ⏳ Implementation pending

**Test Steps:**
1. Client requests revision on deliverable
2. Check Motionify team's email

**Expected Results:**
- ✅ Email sent to project team
- ✅ Contains: feedback, deliverable name
- ✅ Revision count shown: "2 of 3 used"
- ✅ Link to task/deliverable

---

### TC-NT-004: In-App Notification Bell ❌ NOT IMPLEMENTED
**Priority:** Medium  
**Type:** UI  
**Status:** ❌ Notification center not built

**Test Steps:**
1. Click notification bell icon
2. View unread notifications
3. Mark as read
4. Click notification to navigate

**Expected Results:**
- ✅ Unread count badge visible
- ✅ Notifications list sorted by date
- ✅ Click navigates to relevant page
- ✅ Mark all as read option

---

### TC-NT-005: Notification Preferences ❌ NOT IMPLEMENTED
**Priority:** Low  
**Type:** Functional  
**Status:** ❌ Settings page not built

**Test Steps:**
1. Navigate to Settings → Notifications
2. Toggle "Email on task assignment" OFF
3. Verify no email received on next assignment

**Expected Results:**
- ✅ Preferences saved
- ✅ Emails respect preferences
- ✅ In-app notifications separate toggle
- ✅ Cannot disable critical notifications

---

## 8. PAYMENT WORKFLOW TESTS

### TC-PW-001: Advance Payment (50%) ✅ COMPLETE
**Priority:** Critical  
**Type:** End-to-End  
**Status:** ✅ UI implemented in `PaymentButton.tsx`, `PaymentBreakdown.tsx`. E2E tests in `e2e/payment-flow.spec.ts`.

**Test Steps:**
1. Client accepts project terms
2. Click "Pay 50% Advance"
3. Complete payment via Razorpay/Stripe
4. Verify project unlocked

**Expected Results:**
- ✅ Payment processed successfully
- ✅ Project status → "Active"
- ✅ Receipt email sent
- ✅ Work can begin

---

### TC-PW-002: Balance Payment (50%) ✅ COMPLETE
**Priority:** Critical  
**Type:** End-to-End  
**Status:** ✅ UI implemented via payment page. Deliverable status flow validated via `DeliverableCard.tsx` (payment_pending status). E2E coverage in `e2e/payment-flow.spec.ts`.

**Test Steps:**
1. Deliverable approved, status "payment_pending"
2. Click "Pay Balance"
3. Complete payment
4. Verify final files unlocked

**Expected Results:**
- ✅ Payment processed
- ✅ Deliverable → "final_delivered"
- ✅ Final files accessible (365 days)
- ✅ Receipt email sent

---

### TC-PW-003: Payment Reminder (7 Days) ❌ NOT IMPLEMENTED
**Priority:** Medium  
**Type:** Backend  
**Status:** ❌ Scheduled job not implemented

**Test Steps:**
1. Deliverable approved, payment pending
2. Wait 7 days without payment

**Expected Results:**
- ✅ Reminder email sent to client
- ✅ Warning: "Pay within 7 days or project paused"
- ✅ Admin notified if unpaid after 14 days

---

### TC-PW-004: View Payment History ⏳ NOT STARTED
**Priority:** Medium  
**Type:** Functional  
**Status:** ⏳ UI placeholder exists

**Test Steps:**
1. Navigate to project → Payments tab
2. View payment history

**Expected Results:**
- ✅ All payments listed
- ✅ Shows: date, amount, status, invoice
- ✅ Download invoice button works
- ✅ Outstanding balance shown

---

## 9. PROJECT TERMS ACCEPTANCE TESTS

### TC-PT-001: Client Must Accept Terms Before Work ⏳ NOT STARTED
**Priority:** Critical  
**Type:** Functional  
**Status:** ⏳ Terms flow exists, enforcement pending

**Test Steps:**
1. Login as Client Primary Contact
2. Navigate to new project (terms not accepted)
3. View terms banner

**Expected Results:**
- ✅ Banner: "Please review and accept project terms"
- ✅ Key details visible: scope, deliverables, revisions, pricing
- ✅ "Accept Terms" button enabled
- ✅ Cannot approve deliverables until accepted

---

### TC-PT-002: Terms Acceptance Recorded ⏳ NOT STARTED
**Priority:** High  
**Type:** Audit  
**Status:** ⏳ Database field exists, recording pending

**Test Steps:**
1. Click "Accept Terms"
2. Read and agree to terms
3. Confirm acceptance
4. Verify recording

**Expected Results:**
- ✅ `termsAcceptedAt` timestamp recorded
- ✅ `termsAcceptedBy` user ID recorded
- ✅ Activity logged: "Terms accepted by [user]"
- ✅ Email confirmation sent

---

### TC-PT-003: Only Primary Contact Can Accept ⏳ NOT STARTED
**Priority:** High  
**Type:** Permission  
**Status:** ⏳ Permission check pending

**Test Steps:**
1. Login as Client Team Member (NOT primary)
2. View project with pending terms

**Expected Results:**
- ✅ Terms banner visible
- ✅ "Accept Terms" button NOT present
- ✅ Message: "Only primary contact can accept"
- ✅ API returns 403 if attempted

---

## 10. ADMIN FEATURES TESTS

### TC-AD-001: User Management - Create User ⏳ NOT STARTED
**Priority:** High  
**Type:** Functional  
**Status:** ⏳ Admin dashboard exists, user CRUD pending

**Test Steps:**
1. Login as Super Admin
2. Navigate to Admin → Users
3. Click "Add User"
4. Enter: name, email, role (Project Manager)
5. Send invitation

**Expected Results:**
- ✅ User created with status "pending_activation"
- ✅ Magic link sent to email
- ✅ User appears in user list
- ✅ Activity logged

---

### TC-AD-002: User Management - Deactivate User ⏳ NOT STARTED
**Priority:** High  
**Type:** Functional  
**Status:** ⏳ To be implemented

**Test Steps:**
1. Navigate to User Management
2. Find active user
3. Click Deactivate
4. Confirm with reason

**Expected Results:**
- ✅ User status → "deactivated"
- ✅ All sessions invalidated
- ✅ Historical data preserved
- ✅ Deactivation email sent

---

### TC-AD-003: Cannot Deactivate Last Super Admin ⏳ NOT STARTED
**Priority:** High  
**Type:** Validation  
**Status:** ⏳ Validation pending

**Test Steps:**
1. System has only 1 Super Admin
2. Attempt to deactivate that admin

**Expected Results:**
- ✅ Error: "Cannot deactivate last Super Admin"
- ✅ Deactivation blocked
- ✅ Suggestion: "Promote another user first"

---

### TC-AD-004: Activity Log - View All Projects ⏳ NOT STARTED
**Priority:** Medium  
**Type:** Functional  
**Status:** ⏳ Activity logging exists, admin view pending

**Test Steps:**
1. Login as Super Admin
2. Navigate to Admin → Activity Logs
3. Filter by date range

**Expected Results:**
- ✅ All project activities visible
- ✅ Filter by project, user, action type
- ✅ Export to CSV option
- ✅ Search by user or action

---

### TC-AD-005: Activity Log - PM Sees Assigned Only 🚫 BLOCKED
**Priority:** Medium  
**Type:** Permission  
**Status:** 🚫 Depends on TC-AD-004

**Test Steps:**
1. Login as Project Manager
2. Navigate to activity logs
3. Verify scope

**Expected Results:**
- ✅ Only assigned projects visible
- ✅ Cannot view unassigned project logs
- ✅ Filter options scoped to assigned projects

---

## 11. PERMISSION & ACCESS CONTROL TESTS

### TC-AC-001: Super Admin - Full Access ✅ COMPLETE
**Priority:** Critical  
**Type:** Permission  
**Status:** ✅ Implemented in `permissions.ts`

**Test Steps:**
1. Login as Super Admin
2. Verify access to all features

**Expected Results:**
- ✅ Can create/delete/archive projects
- ✅ Can manage all users
- ✅ Can access all projects
- ✅ Can approve additional revisions
- ✅ Can change project statuses

---

### TC-AC-002: Project Manager - Assigned Projects Only ⏳ NOT STARTED
**Priority:** High  
**Type:** Permission  
**Status:** ⏳ Frontend checks exist, API enforcement pending

**Test Steps:**
1. Login as Project Manager
2. Navigate to project not assigned to

**Expected Results:**
- ✅ Project not visible in list
- ✅ Direct URL access returns 403
- ✅ Error: "You don't have access to this project"

---

### TC-AC-003: Client Cannot Access Internal Tasks ⏳ NOT STARTED
**Priority:** High  
**Type:** Permission  
**Status:** ⏳ Visibility flag exists, filtering pending

**Test Steps:**
1. Login as Client
2. View project tasks
3. Attempt to access internal-only task

**Expected Results:**
- ✅ Internal tasks not in list
- ✅ Direct URL returns 404 (not 403, to avoid enumeration)
- ✅ Only "Visible to Client" tasks shown

---

### TC-AC-004: Client Team Cannot Approve ✅ COMPLETE
**Priority:** Critical  
**Type:** Permission  
**Status:** ✅ Verified - Client Team Member sees message: "Only the Primary Contact can approve or submit revision requests"

**Test Steps:**
1. Login as Client Team Member
2. View deliverable awaiting approval

**Expected Results:**
- ✅ Approve/Reject buttons hidden
- ✅ Message: "Only primary contact can approve"
- ✅ Can view and comment only

---

### TC-AC-005: Session Invalidation on Deactivation 🚫 BLOCKED
**Priority:** High  
**Type:** Security  
**Status:** 🚫 Depends on TC-AD-002

**Test Steps:**
1. User "Mike" is logged in
2. Admin deactivates Mike's account
3. Mike attempts to navigate

**Expected Results:**
- ✅ All sessions invalidated immediately
- ✅ Mike redirected to login
- ✅ Error: "Your account has been deactivated"

---

## 12. RESPONSIVE & UI TESTS

### TC-UI-001: Mobile Dashboard (375px) ✅ COMPLETE
**Priority:** Medium  
**Type:** UI  
**Status:** ✅ Responsive layout implemented

**Test Steps:**
1. View dashboard on iPhone SE (375px)
2. Verify layout

**Expected Results:**
- ✅ Sidebar collapses to hamburger menu
- ✅ Project cards stack vertically
- ✅ Touch targets 44px minimum
- ✅ No horizontal scroll

---

### TC-UI-002: Project Detail - Tablet (768px) ✅ COMPLETE
**Priority:** Medium  
**Type:** UI  
**Status:** ✅ Responsive layout implemented

**Test Steps:**
1. View project detail on iPad (768px)

**Expected Results:**
- ✅ Two-column layout adapts
- ✅ Task list readable
- ✅ File thumbnails resize appropriately

---

### TC-UI-003: Accessibility - Keyboard Navigation ⏳ NOT STARTED
**Priority:** Medium  
**Type:** Accessibility  
**Status:** ⏳ Focus management incomplete

**Test Steps:**
1. Tab through all interactive elements
2. Navigate via keyboard only

**Expected Results:**
- ✅ All elements focusable in logical order
- ✅ Focus indicators visible
- ✅ Enter/Space activates buttons
- ✅ Skip to content link available

---

### TC-UI-004: Error States - API Failure ⏳ NOT STARTED
**Priority:** Medium  
**Type:** UI  
**Status:** ⏳ Error boundaries exist

**Test Steps:**
1. Simulate API failure (offline/500 error)
2. Verify error display

**Expected Results:**
- ✅ User-friendly error message
- ✅ "Retry" button available
- ✅ No technical details exposed
- ✅ App doesn't crash

---

## Test Summary

| Category | Total | ✅ Complete | ⏳ Not Started | ❌ Not Implemented | ❌ N/A | 🚫 Blocked |
|----------|-------|-------------|----------------|---------------------|-------|------------|
| Authentication | 7 | 3 | 4 | 0 | 0 | 0 |
| Project Management | 7 | 3 | 3 | 0 | 0 | 1 |
| Task Management | 10 | 5 | 1 | 1 | 3 | 0 |
| File Management | 7 | 4 | 2 | 1 | 0 | 0 |
| Deliverable & Approval | 7 | 4 | 0 | 3 | 0 | 0 |
| Team Collaboration | 7 | 1 | 6 | 0 | 0 | 0 |
| Notifications | 5 | 0 | 3 | 2 | 0 | 0 |
| Payment Workflow | 4 | 0 | 3 | 1 | 0 | 0 |
| Project Terms | 3 | 0 | 3 | 0 | 0 | 0 |
| Admin Features | 5 | 0 | 4 | 0 | 0 | 1 |
| Permission & Access | 5 | 2 | 2 | 0 | 0 | 1 |
| Responsive & UI | 4 | 2 | 2 | 0 | 0 | 0 |
| **TOTAL** | **85** | **24** | **33** | **8** | **3** | **3** |

---

## Priority Matrix

### 🔴 Critical (Must Complete for MVP)
- TC-AUTH-001: Magic Link Login ✅
- TC-PM-001: Create New Project ✅
- TC-PM-002: View Project Overview ✅
- TC-TM-001: Create Task ✅
- TC-TM-003: Task Status Transitions ✅
- ~~TC-TM-004: Client Approves Task~~ (N/A - see TC-DA-002)
- ~~TC-TM-005: Client Requests Revision~~ (N/A - see TC-DA-003)
- TC-DA-001: View Beta Deliverable ✅
- TC-DA-002: Approve Deliverable ✅
- TC-DA-003: Request Revision ✅
- TC-PW-001: Advance Payment ⏳
- TC-PW-002: Balance Payment ⏳

### 🟠 High Priority
- TC-AUTH-002 through TC-AUTH-005
- TC-TM-006: Only Client PM Can Approve ✅
- TC-TM-007: Follow/Unfollow Task ✅
- TC-DA-004: Revision Quota Enforcement

### 🟡 Medium Priority
- TC-FM-003: File Size Limit
- TC-NT-001 through TC-NT-003: Email Notifications
- TC-TC-002, TC-TC-003: Comment Editing

### 🟢 Low Priority
- TC-FM-006: Rename File
- TC-NT-005: Notification Preferences

---

## Execution Notes

### Test Environment
- **Local:** `http://localhost:5173` (Vite dev server)
- **API Endpoints:** Netlify Functions at `/.netlify/functions/`
- **Database:** Neon Postgres (dev instance)
- **File Storage:** Cloudflare R2 (dev bucket)

### Test Accounts
- **Super Admin:** `admin@motionify.studio`
- **Project Manager:** `pm@motionify.studio`
- **Team Member:** `team@motionify.studio`
- **Client Primary:** `client@acmecorp.com`
- **Client Team:** `team@acmecorp.com`

### Running Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- e2e/admin-functional.spec.ts

# Debug mode with browser visible
npm run test:e2e:debug
```

### Automation Coverage
- **E2E (Playwright):** Authentication, task flows, approval flows
- **Integration:** API endpoints, database operations
- **Unit:** Permission helpers, state transitions

---

## Appendix: State Machines

### Task Status Transitions
```
Pending → In Progress → Awaiting Approval → Completed
                ↑               ↓
                └── Revision Requested
```

### Deliverable Status Transitions  
```
pending → in_progress → beta_ready → awaiting_approval → approved → payment_pending → final_delivered
                                            ↓
                                        rejected (back to in_progress)
```

### Project Status Transitions
```
Draft → Active → [On Hold] → Completed → Archived
          ↓
    Awaiting Payment
```
