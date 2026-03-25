# Test Cases: Core Task Management

Comprehensive test scenarios for the Core Task Management feature. Total: 45 test cases.

## Test Case Format

- **ID**: Unique identifier (TC-TASK-###)
- **Feature**: Component being tested
- **Scenario**: What we're testing
- **Steps**: Execution steps
- **Expected Result**: Expected outcome
- **Priority**: High/Medium/Low

---

## 1. Task Creation (7 test cases)

### TC-TASK-001: Create Basic Task
**Priority:** High
**Feature:** Task Creation
**Scenario:** Motionify team member creates a client-visible task

**Steps:**
1. Login as Motionify team member
2. Navigate to project deliverable
3. Click "Create Task"
4. Enter title: "Color grading scene 2"
5. Select deliverable, set visibility to "client_visible"
6. Click "Create"

**Expected Result:**
- Task created with status "pending"
- Task appears in task list
- Creator auto-followed
- Activity logged: "Task created by [user]"

---

### TC-TASK-002: Create Task with Deadline
**Priority:** High
**Feature:** Task Creation
**Scenario:** Create task with future deadline

**Steps:**
1. Create task with deadline 7 days from now
2. Save task

**Expected Result:**
- Task created successfully
- Deadline displayed correctly
- Days until deadline calculated (7 days)
- isOverdue = false

---

### TC-TASK-003: Create Task with Multiple Assignees
**Priority:** High
**Feature:** Task Creation + Assignment
**Scenario:** Create task and assign to 3 team members

**Steps:**
1. Create task
2. Assign to Sarah, Mike, and Alex
3. Save task

**Expected Result:**
- 3 assignments created
- 3 email notifications sent
- All 3 users auto-followed
- assigneeCount = 3

---

### TC-TASK-004: Create Internal-Only Task
**Priority:** Medium
**Feature:** Task Visibility
**Scenario:** Create internal task hidden from client

**Steps:**
1. Create task with visibility "internal_only"
2. Save task
3. Login as client user
4. View task list

**Expected Result:**
- Task created successfully
- Task NOT visible in client portal
- Task visible to Motionify team
- No client notifications sent

---

### TC-TASK-005: Validation - Missing Required Fields
**Priority:** High
**Feature:** Task Validation
**Scenario:** Try to create task without required fields

**Steps:**
1. Click "Create Task"
2. Leave title empty
3. Submit form

**Expected Result:**
- Error: "Title is required"
- Task NOT created
- Form remains open with error message

---

### TC-TASK-006: Validation - Title Too Long
**Priority:** Low
**Feature:** Task Validation
**Scenario:** Enter title exceeding 255 characters

**Steps:**
1. Enter 300-character title
2. Submit

**Expected Result:**
- Error: "Title must be 255 characters or less"
- Task NOT created

---

### TC-TASK-007: Create Task Without Assignees
**Priority:** Medium
**Feature:** Task Creation
**Scenario:** Create unassigned task

**Steps:**
1. Create task
2. Don't assign anyone
3. Save

**Expected Result:**
- Task created successfully
- assigneeCount = 0
- Task appears in "Unassigned Tasks" filter
- Only creator is follower

---

## 2. Task Status Workflow (12 test cases)

### TC-TASK-008: Status Transition - Pending to In Progress
**Priority:** High
**Feature:** Status Workflow
**Scenario:** Start work on pending task

**Steps:**
1. Open pending task
2. Change status to "in_progress"
3. Save

**Expected Result:**
- Status updated successfully
- inProgressSince timestamp set
- Activity logged: "Status changed to In Progress"
- Notification sent to followers

---

### TC-TASK-009: Status Transition - In Progress to Awaiting Approval
**Priority:** High
**Feature:** Status Workflow + Delivery Notes
**Scenario:** Submit client-visible task for approval with delivery notes

**Steps:**
1. Open client-visible task in "in_progress"
2. Change status to "awaiting_approval"
3. Add delivery notes: "Work complete, ready for review"
4. Submit

**Expected Result:**
- Status updated to "awaiting_approval"
- Delivery notes saved
- awaitingApprovalSince timestamp set
- Email sent to Client Primary Contact
- Followers notified

---

### TC-TASK-010: Validation - Awaiting Approval Without Delivery Notes
**Priority:** High
**Feature:** Status Validation
**Scenario:** Try to submit client-visible task without delivery notes

**Steps:**
1. Open client-visible task
2. Change status to "awaiting_approval"
3. Leave delivery notes empty
4. Submit

**Expected Result:**
- Error: "Delivery notes required for client-visible tasks"
- Status NOT changed
- Task remains in current status

---

### TC-TASK-011: Internal Task - Skip Approval
**Priority:** High
**Feature:** Status Workflow
**Scenario:** Internal task completes without client approval

**Steps:**
1. Open internal-only task in "in_progress"
2. Change status directly to "completed"
3. Save

**Expected Result:**
- Status updated to "completed"
- completedAt timestamp set
- No client notification (internal task)
- Team notified

---

### TC-TASK-012: Client Approves Task
**Priority:** High
**Feature:** Client Approval
**Scenario:** Client primary contact approves task

**Steps:**
1. Login as client primary contact
2. Open task in "awaiting_approval"
3. Click "Approve"
4. Confirm

**Expected Result:**
- Status → "approved"
- approvedAt timestamp set
- approvedBy = current user
- Team + followers notified via email

---

### TC-TASK-013: Client Requests Revision
**Priority:** High
**Feature:** Client Revision Request
**Scenario:** Client requests changes

**Steps:**
1. Login as client primary contact
2. Open task in "awaiting_approval"
3. Click "Request Changes"
4. Enter feedback: "Please adjust brightness"
5. Submit

**Expected Result:**
- Status → "revision_requested"
- revisionFeedback saved
- revisionRequestedAt timestamp set
- Team + followers notified

---

### TC-TASK-014: Invalid Status Transition
**Priority:** High
**Feature:** State Machine Validation
**Scenario:** Try invalid status change (pending → completed)

**Steps:**
1. Open pending task
2. Try to change to "completed"

**Expected Result:**
- Error: "Cannot transition from pending to completed"
- Status unchanged
- Available transitions shown

---

### TC-TASK-015: Client Cannot Change to In Progress
**Priority:** High
**Feature:** Permission Validation
**Scenario:** Client user tries to change status to "in_progress"

**Steps:**
1. Login as client user
2. Open task
3. Try to change status to "in_progress"

**Expected Result:**
- Error: "Only Motionify team can set this status"
- Status unchanged

---

### TC-TASK-016: Non-Primary Contact Cannot Approve
**Priority:** High
**Feature:** Permission Validation
**Scenario:** Regular client user tries to approve task

**Steps:**
1. Login as client (not primary contact)
2. Open task in "awaiting_approval"
3. Try to approve

**Expected Result:**
- Error: "Only primary contact can approve"
- Approve button disabled or hidden
- Status unchanged

---

### TC-TASK-017: Admin Reopens Completed Task
**Priority:** Medium
**Feature:** Task Reopening
**Scenario:** Admin reopens completed task

**Steps:**
1. Login as admin
2. Open completed task
3. Change status back to "in_progress"

**Expected Result:**
- Status → "in_progress"
- Activity logged: "Task reopened by [admin]"
- Team notified

---

### TC-TASK-018: Delivery Notes Edit Window
**Priority:** Medium
**Feature:** Delivery Notes
**Scenario:** Edit delivery notes within 1-hour window

**Steps:**
1. Submit task with delivery notes (< 1 hour ago)
2. Click "Edit Notes"
3. Update notes
4. Save

**Expected Result:**
- Notes updated successfully
- deliveryNotesUpdatedAt updated
- Client NOT re-notified (no spam)

---

### TC-TASK-019: Delivery Notes Edit Window Expired
**Priority:** Low
**Feature:** Delivery Notes
**Scenario:** Try to edit notes after 1 hour

**Steps:**
1. Open task with notes submitted > 1 hour ago
2. Try to edit notes

**Expected Result:**
- Edit button disabled
- Error: "Edit window expired (1 hour)"
- Notes are read-only

---

## 3. Task Assignments (8 test cases)

### TC-TASK-020: Assign User to Task
**Priority:** High
**Feature:** Assignment
**Scenario:** Assign team member to task

**Steps:**
1. Open task
2. Click "+ Assign"
3. Select Sarah Johnson
4. Save

**Expected Result:**
- Assignment created
- Sarah auto-followed (canUnfollow = false)
- Email sent to Sarah
- assigneeCount incremented

---

### TC-TASK-021: Multi-Assignee Support
**Priority:** High
**Feature:** Multi-Assignment
**Scenario:** Assign 3 users to same task

**Steps:**
1. Open task
2. Assign Sarah, Mike, Alex
3. Save

**Expected Result:**
- 3 assignments created
- All 3 auto-followed
- 3 email notifications sent
- assigneeCount = 3

---

### TC-TASK-022: Remove Assignee
**Priority:** High
**Feature:** Assignment Removal
**Scenario:** Unassign user from task

**Steps:**
1. Open task with 2 assignees
2. Click [×] next to Sarah
3. Confirm removal

**Expected Result:**
- Assignment deleted
- Sarah remains follower (manual unfollow required)
- assigneeCount decremented
- Activity logged

---

### TC-TASK-023: Self-Assignment
**Priority:** Medium
**Feature:** Self-Assignment
**Scenario:** User assigns themselves

**Steps:**
1. Open unassigned task
2. Click "Assign to Me"

**Expected Result:**
- Assignment created with selfAssigned = true
- User auto-followed
- Email NOT sent (self-assigned)

---

### TC-TASK-024: Assign Client to Client-Visible Task
**Priority:** Medium
**Feature:** Client Assignment
**Scenario:** Assign client user to client-visible task

**Steps:**
1. Open client-visible task
2. Assign client user
3. Save

**Expected Result:**
- Assignment successful
- Client notified
- Client can see task and comment

---

### TC-TASK-025: Prevent Duplicate Assignment
**Priority:** Low
**Feature:** Assignment Validation
**Scenario:** Try to assign same user twice

**Steps:**
1. Assign Sarah to task
2. Try to assign Sarah again

**Expected Result:**
- Error: "User already assigned"
- No duplicate assignment created

---

### TC-TASK-026: Unassign All Users
**Priority:** Medium
**Feature:** Assignment Edge Case
**Scenario:** Remove all assignees from task

**Steps:**
1. Open task with 2 assignees
2. Remove both
3. Save

**Expected Result:**
- Task becomes unassigned
- Task moves to "Unassigned Tasks" filter
- Removed users remain followers
- Activity logged: "All assignees removed"

---

### TC-TASK-027: Assignment Permissions
**Priority:** High
**Feature:** Assignment Permissions
**Scenario:** Verify who can assign tasks

**Steps:**
1. Test as Motionify admin (should work)
2. Test as Motionify team (should work)
3. Test as client (should work for their team)

**Expected Result:**
- Admins can assign anyone
- Team can assign anyone on project
- Clients can assign within their team

---

## 4. Task Followers (6 test cases)

### TC-TASK-028: Follow Task Manually
**Priority:** High
**Feature:** Following
**Scenario:** User manually follows task

**Steps:**
1. Open task
2. Click "Follow" (★)
3. Confirm

**Expected Result:**
- Follower record created with source = "manual"
- canUnfollow = true
- User receives notifications
- followerCount incremented

---

### TC-TASK-029: Unfollow Task
**Priority:** High
**Feature:** Unfollowing
**Scenario:** User unfollows task they're manually following

**Steps:**
1. Open followed task
2. Click "Unfollow"
3. Confirm

**Expected Result:**
- Follower record deleted
- No more notifications
- followerCount decremented

---

### TC-TASK-030: Cannot Unfollow While Assigned
**Priority:** High
**Feature:** Follower Validation
**Scenario:** Assigned user tries to unfollow

**Steps:**
1. Login as assigned user
2. Try to unfollow

**Expected Result:**
- Error: "Cannot unfollow while assigned"
- Unfollow button disabled
- Follower record persists

---

### TC-TASK-031: Auto-Follow on Comment
**Priority:** Medium
**Feature:** Auto-Follow
**Scenario:** User auto-follows when commenting

**Steps:**
1. Open task (not following)
2. Add comment
3. Save

**Expected Result:**
- Follower record created with source = "comment"
- canUnfollow = true
- User now receives notifications

---

### TC-TASK-032: Creator Auto-Follows
**Priority:** Low
**Feature:** Auto-Follow
**Scenario:** Task creator automatically follows

**Steps:**
1. Create task

**Expected Result:**
- Creator auto-followed with source = "creator"
- canUnfollow = true

---

### TC-TASK-033: View Follower List
**Priority:** Low
**Feature:** Follower List
**Scenario:** View all followers for task

**Steps:**
1. Open task with 5 followers
2. Click follower count badge
3. View list

**Expected Result:**
- All 5 followers listed
- Shows name, source, canUnfollow flag
- Distinguish assigned vs manual followers

---

## 5. Task Comments (5 test cases)

### TC-TASK-034: Add Comment
**Priority:** High
**Feature:** Comments
**Scenario:** Post comment on task

**Steps:**
1. Open task
2. Enter comment: "Looks great!"
3. Click "Post Comment"

**Expected Result:**
- Comment saved
- Comment appears in thread
- commentCount incremented
- Followers notified (except commenter)

---

### TC-TASK-035: Mention User in Comment
**Priority:** High
**Feature:** Mentions
**Scenario:** Mention user with @username

**Steps:**
1. Add comment: "Ready for review @sarah"
2. Post

**Expected Result:**
- Comment saved with mention
- Sarah receives special mention notification
- Mention highlighted in UI
- Sarah auto-followed if not already

---

### TC-TASK-036: Edit Comment
**Priority:** Medium
**Feature:** Comment Editing
**Scenario:** Author edits their comment

**Steps:**
1. Post comment
2. Click "Edit"
3. Update text
4. Save

**Expected Result:**
- Comment updated
- edited = true
- editedAt timestamp set
- "Edited" badge shown

---

### TC-TASK-037: Delete Comment
**Priority:** Medium
**Feature:** Comment Deletion
**Scenario:** Soft delete comment

**Steps:**
1. Post comment
2. Click "Delete"
3. Confirm

**Expected Result:**
- Comment soft deleted (deletedAt set)
- Comment hidden from UI
- commentCount decremented

---

### TC-TASK-038: Markdown Support in Comments
**Priority:** Low
**Feature:** Comment Formatting
**Scenario:** Use markdown in comment

**Steps:**
1. Add comment with markdown:
   "**Bold** and *italic* text"
2. Post

**Expected Result:**
- Markdown rendered correctly
- Bold and italic displayed
- Code blocks, lists work

---

## 6. Task Filtering & Search (4 test cases)

### TC-TASK-039: Filter by Status
**Priority:** High
**Feature:** Filtering
**Scenario:** Filter tasks by status

**Steps:**
1. View task list
2. Filter by "in_progress"

**Expected Result:**
- Only in_progress tasks shown
- Task count updated
- Filter persists on refresh

---

### TC-TASK-040: Filter "My Tasks"
**Priority:** High
**Feature:** Filtering
**Scenario:** View only assigned tasks

**Steps:**
1. Click "My Tasks" filter

**Expected Result:**
- Only tasks assigned to current user shown
- Includes multi-assigned tasks
- Count displayed correctly

---

### TC-TASK-041: Filter "Unassigned Tasks"
**Priority:** Medium
**Feature:** Filtering
**Scenario:** View tasks with no assignees

**Steps:**
1. Click "Unassigned" filter

**Expected Result:**
- Only tasks with assigneeCount = 0
- Allows team to pick up work

---

### TC-TASK-042: Full-Text Search
**Priority:** High
**Feature:** Search
**Scenario:** Search tasks by keyword

**Steps:**
1. Enter search: "color grading"
2. Submit

**Expected Result:**
- Tasks with "color grading" in title or description
- Search highlights matches
- Fast response (<500ms)

---

## 7. Integration & Edge Cases (3 test cases)

### TC-TASK-043: Delete Deliverable with Active Tasks
**Priority:** High
**Feature:** Data Integrity
**Scenario:** Try to delete deliverable with tasks

**Steps:**
1. Try to delete deliverable with 5 active tasks

**Expected Result:**
- Error: "Cannot delete deliverable with active tasks"
- Must complete/delete tasks first
- Data integrity maintained

---

### TC-TASK-044: Task Overdue Notification
**Priority:** Medium
**Feature:** Deadline Management
**Scenario:** Task becomes overdue

**Steps:**
1. Create task with deadline yesterday
2. Wait for cron job

**Expected Result:**
- isOverdue = true
- Overdue badge shown (red)
- Email sent to assignees
- daysOverdue calculated correctly

---

### TC-TASK-045: Concurrent Status Updates
**Priority:** Low
**Feature:** Concurrency
**Scenario:** Two users update status simultaneously

**Steps:**
1. User A opens task
2. User B opens same task
3. User A changes status
4. User B tries to change status

**Expected Result:**
- Optimistic locking error for User B
- Message: "Task updated by another user, please refresh"
- Data consistency maintained

---

## Test Execution Summary

| Priority | Count |
|----------|-------|
| High | 29 |
| Medium | 13 |
| Low | 3 |
| **Total** | **45** |

## Testing Environments

- **Unit Tests:** Jest + React Testing Library
- **Integration Tests:** Playwright / Cypress
- **API Tests:** Postman / Supertest
- **Manual Testing:** QA team

## Test Data Requirements

- 3 test projects
- 10 test users (2 admins, 5 team, 3 clients)
- 20 sample tasks (various statuses)
- 50 comments
- 30 assignments

## Automation

Automate high-priority tests (29 tests) for CI/CD pipeline.
