# Test Cases: Feedback & Revisions System

Comprehensive test scenarios for comments, revisions, and quota management. Total: 45 test cases.

## Test Case Format

Each test case includes:
- **ID**: Unique identifier (TC-FR-###)
- **Feature**: Which component is being tested
- **Scenario**: What we're testing
- **Steps**: How to execute the test
- **Expected Result**: What should happen
- **Priority**: High/Medium/Low

---

## 1. Task Comments (10 test cases)

### TC-FR-001: Create Task Comment
**Priority:** High
**Feature:** Task Comments

**Steps:**
1. Login as project member
2. Navigate to task detail page
3. Enter comment text in comment box
4. Click "Comment" button

**Expected:**
- ✓ Comment appears in comment list immediately
- ✓ Comment shows author name, timestamp
- ✓ Activity logged: "Comment added on [task]"
- ✓ Email sent to task assignees and followers

---

### TC-FR-002: Create Comment with @Mention
**Priority:** High
**Feature:** Comment Mentions

**Steps:**
1. Type "@" in comment box
2. Select user from autocomplete
3. Complete comment and submit

**Expected:**
- ✓ @mention renders as link
- ✓ Mentioned user appears in mentionedUserIds
- ✓ Email sent to mentioned user
- ✓ In-app notification created for mentioned user

---

### TC-FR-003: Edit Comment Within 1 Hour
**Priority:** Medium
**Feature:** Comment Editing

**Steps:**
1. Create comment
2. Click "Edit" button (< 1 hour after creation)
3. Modify text
4. Save changes

**Expected:**
- ✓ Comment text updated
- ✓ "Edited" badge displayed
- ✓ Edit timestamp recorded
- ✓ No new notifications sent

---

### TC-FR-004: Cannot Edit Comment After 1 Hour
**Priority:** Medium
**Feature:** Comment Editing

**Steps:**
1. View comment created > 1 hour ago
2. Attempt to click "Edit" button

**Expected:**
- ✓ Edit button disabled
- ✓ Tooltip: "Comments can only be edited within 1 hour"

---

### TC-FR-005: Delete Own Comment
**Priority:** Medium
**Feature:** Comment Deletion

**Steps:**
1. Create comment
2. Click "Delete" button
3. Confirm deletion

**Expected:**
- ✓ Comment shows "[deleted]"
- ✓ Original metadata preserved (author, timestamp)
- ✓ is_deleted flag set to true
- ✓ Activity logged

---

### TC-FR-006: Admin Delete Any Comment
**Priority:** High
**Feature:** Comment Moderation

**Steps:**
1. Login as admin
2. View comment by another user
3. Click "Delete" button

**Expected:**
- ✓ Admin can delete any comment
- ✓ Deleted comment shows "[deleted]"
- ✓ Deletion logged with admin ID

---

### TC-FR-007: Comment Rate Limiting
**Priority:** High
**Feature:** Anti-Spam

**Steps:**
1. Post 10 comments in 1 minute
2. Attempt to post 11th comment

**Expected:**
- ✓ Error: "Rate limit exceeded"
- ✓ Message: "Maximum 10 comments per minute. Try again in 30 seconds."
- ✓ Comment not saved

---

### TC-FR-008: Comment Length Validation
**Priority:** Medium
**Feature:** Comment Validation

**Steps:**
1. Attempt to post empty comment
2. Attempt to post 5001-character comment

**Expected:**
- ✓ Empty comment rejected
- ✓ Too-long comment rejected
- ✓ Error message displayed

---

### TC-FR-009: View Comments Pagination
**Priority:** Medium
**Feature:** Comment Display

**Steps:**
1. Navigate to task with 100+ comments
2. Scroll to bottom of comment list

**Expected:**
- ✓ Initial load shows 50 comments
- ✓ "Load More" button appears
- ✓ Clicking loads next 50

---

### TC-FR-010: Markdown Rendering in Comments
**Priority:** Low
**Feature:** Comment Formatting

**Steps:**
1. Post comment with markdown: `**bold** _italic_ [link](url)`
2. View rendered comment

**Expected:**
- ✓ Bold text rendered
- ✓ Italic text rendered
- ✓ Link clickable

---

## 2. File Comments (8 test cases)

### TC-FR-011: Add Comment to File
**Priority:** High
**Feature:** File Comments

**Steps:**
1. Navigate to file detail page
2. Add comment
3. Submit

**Expected:**
- ✓ Comment appears under file
- ✓ File uploader receives email notification

---

### TC-FR-012: Add Timestamped Comment on Video
**Priority:** Medium
**Feature:** File Comments (Media)

**Steps:**
1. View video file
2. Enter timestamp "00:42"
3. Add comment referencing that timestamp

**Expected:**
- ✓ Timestamp displayed: "At 00:42"
- ✓ timestamp_seconds calculated: 42
- ✓ Clicking timestamp seeks video to 00:42

---

### TC-FR-013-018: Similar to Task Comments
(Same tests as TC-FR-003 through TC-FR-008, but for file comments)

---

## 3. Revision Requests (12 test cases)

### TC-FR-019: Request Revision (Quota Available)
**Priority:** High
**Feature:** Revision Requests

**Steps:**
1. Login as PRIMARY_CONTACT
2. Navigate to deliverable awaiting approval
3. Click "Request Revision"
4. Enter feedback (min 50 chars)
5. Submit

**Expected:**
- ✓ project.usedRevisions incremented
- ✓ deliverable.status → 'rejected' → 'revision_requested'
- ✓ RevisionRequest created
- ✓ Email sent to Motionify team
- ✓ Activity logged

---

### TC-FR-020: Feedback Minimum Length Validation
**Priority:** Medium
**Feature:** Revision Validation

**Steps:**
1. Enter feedback < 50 characters
2. Attempt to submit

**Expected:**
- ✓ Error: "Feedback must be at least 50 characters"
- ✓ Form not submitted

---

### TC-FR-021: Non-PRIMARY_CONTACT Cannot Request Revision
**Priority:** High
**Feature:** Permissions

**Steps:**
1. Login as regular client team member
2. Navigate to deliverable awaiting approval
3. Attempt to click "Request Revision"

**Expected:**
- ✓ Button disabled or hidden
- ✓ Tooltip: "Only PRIMARY_CONTACT can request revisions"

---

### TC-FR-022: Request Revision with Reference Files
**Priority:** Medium
**Feature:** Revision Requests

**Steps:**
1. Start revision request
2. Attach 3 reference files
3. Submit

**Expected:**
- ✓ reference_file_ids array populated
- ✓ Reference files linked in email to team
- ✓ Max 5 files enforced

---

### TC-FR-023: Quota Warning at 1 Remaining
**Priority:** High
**Feature:** Quota Management

**Steps:**
1. Project has 3 total, 2 used revisions
2. Request revision

**Expected:**
- ✓ Warning email sent: "1 revision remaining"
- ✓ Warning displayed in portal
- ✓ Tip shown: "Consolidate feedback"

---

### TC-FR-024: Cannot Request Revision When Quota Exhausted
**Priority:** High
**Feature:** Quota Enforcement

**Steps:**
1. Project has 3 total, 3 used revisions
2. Navigate to deliverable awaiting approval
3. Click "Request Revision"

**Expected:**
- ✓ Warning modal: "Revision Quota Exhausted"
- ✓ "Request Additional Revisions" button shown
- ✓ Revision request blocked

---

### TC-FR-025: View Revision History
**Priority:** Medium
**Feature:** Revision Tracking

**Steps:**
1. Navigate to project with 3 completed revisions
2. Click "View Revision History"

**Expected:**
- ✓ All 3 revisions listed
- ✓ Each shows: deliverable, date, feedback snippet, status
- ✓ Sorted by date (newest first)

---

### TC-FR-026: Team Marks Revision Completed
**Priority:** Medium
**Feature:** Revision Workflow

**Steps:**
1. Login as team member
2. View pending revision request
3. Complete work, re-upload beta
4. Mark revision as "Completed"

**Expected:**
- ✓ revision_request.status → 'completed'
- ✓ deliverable.status → 'awaiting_approval'
- ✓ Email sent to client: "Revised Beta Ready"

---

### TC-FR-027-030: Additional edge cases
(Concurrent revision requests, revision on wrong deliverable status, etc.)

---

## 4. Additional Revision Requests (10 test cases)

### TC-FR-031: Request Additional Revisions
**Priority:** High
**Feature:** Additional Revision Requests

**Steps:**
1. Quota exhausted (used >= total)
2. Click "Request Additional Revisions"
3. Select count: 2
4. Enter reason (min 100 chars)
5. Submit

**Expected:**
- ✓ AdditionalRevisionRequest created with status 'pending'
- ✓ Email sent to admin team
- ✓ Client sees "Request pending admin review" message

---

### TC-FR-032: Reason Minimum Length Validation
**Priority:** Medium
**Feature:** Additional Revision Validation

**Steps:**
1. Enter reason < 100 characters
2. Attempt to submit

**Expected:**
- ✓ Error: "Reason must be at least 100 characters"

---

### TC-FR-033: Admin Approves Additional Revisions
**Priority:** High
**Feature:** Admin Approval

**Steps:**
1. Login as admin
2. View pending additional revision request
3. Review client reason
4. Approve 2 revisions
5. Submit

**Expected:**
- ✓ project.totalRevisions increased by 2
- ✓ request.status → 'approved'
- ✓ Email sent to client: "Additional Revisions Approved"
- ✓ Client can now request revisions

---

### TC-FR-034: Admin Approves Partial Amount
**Priority:** Medium
**Feature:** Admin Approval

**Steps:**
1. Client requests 5 additional revisions
2. Admin approves only 2

**Expected:**
- ✓ project.totalRevisions increased by 2 (not 5)
- ✓ Email shows "Approved: 2 additional revisions"

---

### TC-FR-035: Admin Declines Additional Revisions
**Priority:** High
**Feature:** Admin Decline

**Steps:**
1. View pending request
2. Click "Decline"
3. Enter decline reason (required)
4. Submit

**Expected:**
- ✓ request.status → 'declined'
- ✓ Email sent to client with decline reason
- ✓ project.totalRevisions unchanged

---

### TC-FR-036: Cannot Request Additional Before Exhausted
**Priority:** Medium
**Feature:** Quota Enforcement

**Steps:**
1. Project has 3 total, 1 used (2 remaining)
2. Attempt to access "Request Additional Revisions"

**Expected:**
- ✓ Option not available
- ✓ Message: "You have 2 revisions remaining"

---

### TC-FR-037: Admin Views Pending Requests Dashboard
**Priority:** Medium
**Feature:** Admin Dashboard

**Steps:**
1. Login as admin
2. Navigate to "Additional Revision Requests" page
3. Filter by "pending"

**Expected:**
- ✓ All pending requests listed
- ✓ Each shows: project, client, count, reason snippet
- ✓ Quick action buttons: Approve, Decline

---

### TC-FR-038-040: Additional edge cases
(Multiple simultaneous requests, quota snapshot accuracy, etc.)

---

## 5. Integration Tests (5 test cases)

### TC-FR-041: Full Feedback → Revision → Approval Flow
**Priority:** High
**Feature:** End-to-End

**Steps:**
1. Client comments on task: "Change color"
2. Team responds via comment
3. Team uploads beta
4. Client rejects with formal revision request
5. Team re-uploads
6. Client approves

**Expected:**
- ✓ All comments preserved
- ✓ Revision consumed
- ✓ All notifications sent
- ✓ Activity log complete

---

### TC-FR-042: Quota Exhaustion → Additional Request → Revision
**Priority:** High
**Feature:** End-to-End

**Steps:**
1. Use all 3 revisions
2. Request 2 additional
3. Admin approves
4. Request 4th revision

**Expected:**
- ✓ Quota updated: 3 → 5 total
- ✓ 4th revision allowed
- ✓ Used: 4/5

---

### TC-FR-043: Concurrent Comments on Same Task
**Priority:** Medium
**Feature:** Concurrency

**Steps:**
1. Two users comment simultaneously
2. Both submit at same time

**Expected:**
- ✓ Both comments saved
- ✓ No data loss
- ✓ Both appear in comment list

---

### TC-FR-044: Mention Multiple Users in One Comment
**Priority:** Medium
**Feature:** Comment Mentions

**Steps:**
1. Comment with "@JohnDoe @JaneSmith feedback needed"
2. Submit

**Expected:**
- ✓ Both users mentioned in mentionedUserIds
- ✓ Both receive email notifications
- ✓ Both get in-app notifications

---

### TC-FR-045: Delete Task with Comments
**Priority:** Low
**Feature:** Data Integrity

**Steps:**
1. Create task with 5 comments
2. Admin deletes task

**Expected:**
- ✓ Comments cascade deleted (referential integrity)
- ✓ No orphaned comment_mentions
- ✓ Activity log entry created

---

## Test Coverage Summary

| Feature Area | Test Cases | Priority High | Priority Medium | Priority Low |
|--------------|-----------|---------------|-----------------|--------------|
| Task Comments | 10 | 5 | 4 | 1 |
| File Comments | 8 | 4 | 3 | 1 |
| Revision Requests | 12 | 7 | 4 | 1 |
| Additional Revisions | 10 | 6 | 3 | 1 |
| Integration | 5 | 3 | 2 | 0 |
| **TOTAL** | **45** | **25** | **16** | **4** |

---

## Automated Testing Notes

### Unit Tests (Backend)
- Comment validation (length, required fields)
- Mention detection regex
- Quota calculation logic
- Permission checks

### Integration Tests (API)
- All API endpoints (15 total)
- Authentication/authorization
- Database transactions
- Email dispatch

### E2E Tests (Frontend)
- Comment creation flow
- Revision request flow
- Additional revision request flow
- Admin approval flow

### Performance Tests
- Comment list pagination (1000+ comments)
- Concurrent comment creation
- Mention autocomplete speed
- Email queue processing
