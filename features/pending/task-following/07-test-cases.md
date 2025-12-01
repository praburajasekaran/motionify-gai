# Test Cases: Task Following System

Comprehensive test scenarios for the Task Following System. **Total: 18 test cases**.

## Test Case Format

Each test case includes:
- **ID**: Unique identifier (TC-TF-XXX)
- **Feature**: Which component is being tested
- **Scenario**: What we're testing
- **Priority**: High/Medium/Low
- **Steps**: How to execute the test
- **Expected Result**: What should happen

---

## 1. Follow/Unfollow Workflow (5 test cases)

### TC-TF-001: User Follows a Task
**Priority:** High
**Feature:** Follow Button

**Steps:**
1. Log in as project team member
2. Navigate to task detail page
3. Verify "Follow" button is visible
4. Click "Follow" button

**Expected:**
- ✓ Button changes to "Following" (optimistic UI)
- ✓ Follower count increments (e.g., 3 → 4)
- ✓ API call to POST /api/tasks/:id/follow succeeds
- ✓ Database: New record in task_followers table
- ✓ Activity logged: "[User] started following this task"
- ✓ Success message: "You are now following this task"

---

### TC-TF-002: User Unfollows a Task
**Priority:** High
**Feature:** Unfollow Action

**Steps:**
1. Follow a task (complete TC-TF-001)
2. Click "Following" button
3. Confirm in unfollow dialog

**Expected:**
- ✓ Confirmation dialog: "Stop following this task?"
- ✓ On confirm, button changes to "Follow"
- ✓ Follower count decrements (4 → 3)
- ✓ API call to DELETE /api/tasks/:id/follow succeeds
- ✓ Database: task_followers record deleted
- ✓ Activity logged: "[User] stopped following this task"
- ✓ Success message: "You have unfollowed this task"

---

### TC-TF-003: User Auto-Follows When Assigned
**Priority:** High
**Feature:** Auto-Follow on Assignment

**Steps:**
1. As admin, create a task
2. Assign task to User A
3. Log in as User A
4. Navigate to task detail page

**Expected:**
- ✓ "Following" button already shows (not "Follow")
- ✓ Database: task_followers record exists with followed_via = 'auto_assigned'
- ✓ User A automatically receives notifications
- ✓ Follower count includes User A

---

### TC-TF-004: View Followers List
**Priority:** Medium
**Feature:** Followers Popover

**Steps:**
1. Navigate to task with multiple followers
2. Click on follower count (e.g., "5 followers")

**Expected:**
- ✓ Popover displays with list of followers
- ✓ Shows user names, avatars, roles
- ✓ Assignees marked with "(Assignee)" label
- ✓ Current user marked with "(You)" label
- ✓ Followers sorted by followed date (newest first)
- ✓ Click outside popover closes it

---

### TC-TF-005: Follow Task Already Being Followed
**Priority:** Medium
**Feature:** Duplicate Follow Prevention

**Steps:**
1. Follow a task
2. Using API tool (Postman), send duplicate POST /api/tasks/:id/follow

**Expected:**
- ✓ API returns 400 Bad Request
- ✓ Error message: "Already following this task"
- ✓ Database: No duplicate record created (UNIQUE constraint)
- ✓ Follower count unchanged

---

## 2. Notification Delivery (5 test cases)

### TC-TF-006: Follower Receives Status Change Notification
**Priority:** High
**Feature:** Email Notifications

**Steps:**
1. User A follows Task-123
2. User B (assignee) changes task status: Pending → In Progress
3. Wait 1 minute for email delivery

**Expected:**
- ✓ User A receives email: "Status changed to 'In Progress'"
- ✓ Email subject: "[TASK-123] Status changed to 'In Progress' - {title}"
- ✓ Email contains: Task title, old/new status, who changed it
- ✓ Email contains link to task detail page
- ✓ User B (who made change) does NOT receive email
- ✓ In-app notification created for User A

---

### TC-TF-007: Follower Receives Comment Notification
**Priority:** High
**Feature:** Comment Notifications

**Steps:**
1. User A follows Task-123
2. User B adds comment: "Great work on this!"
3. Wait 1 minute

**Expected:**
- ✓ User A receives email: "New comment by User B"
- ✓ Email contains comment text
- ✓ Email contains link to task with comment anchor
- ✓ User B (commenter) does NOT receive own comment notification
- ✓ In-app notification created

---

### TC-TF-008: Follower Receives File Upload Notification
**Priority:** Medium
**Feature:** File Upload Notifications

**Steps:**
1. User A follows Task-123
2. User B uploads file: "mockup-v2.pdf"
3. Wait 1 minute

**Expected:**
- ✓ User A receives email: "New file uploaded"
- ✓ Email contains: File name, size, uploader, timestamp
- ✓ Email links to task page (files section)
- ✓ User B (uploader) does NOT receive notification

---

### TC-TF-009: Unfollowed User Stops Receiving Notifications
**Priority:** High
**Feature:** Notification Opt-Out

**Steps:**
1. User A follows Task-123
2. User A receives a notification (verify working)
3. User A unfollows Task-123
4. User B makes another change to task

**Expected:**
- ✓ User A does NOT receive email for second change
- ✓ No in-app notification created for User A
- ✓ Other followers still receive notifications normally

---

### TC-TF-010: Multiple Followers All Receive Notifications
**Priority:** High
**Feature:** Batch Notifications

**Steps:**
1. Task-123 has 5 followers
2. Admin changes task status
3. Wait 2 minutes

**Expected:**
- ✓ All 5 followers receive email notifications
- ✓ Emails sent in batch (< 2 min total)
- ✓ Each email personalized with recipient name
- ✓ Admin (who made change) does NOT receive notification

---

## 3. Permission Checks (5 test cases)

### TC-TF-011: Non-Project Member Cannot Follow Task
**Priority:** High
**Feature:** Permission Validation

**Steps:**
1. User A is NOT a member of Project X
2. User A somehow gets URL to Task-123 in Project X
3. User A tries to follow task via API

**Expected:**
- ✓ API returns 403 Forbidden
- ✓ Error: "Must be project member to follow tasks"
- ✓ No follow record created
- ✓ Frontend hides follow button for non-members

---

### TC-TF-012: User Removed from Project Loses Follows
**Priority:** High
**Feature:** Cascade on Project Removal

**Steps:**
1. User A is member of Project X, following 3 tasks
2. Admin removes User A from Project X
3. Check task_followers table

**Expected:**
- ✓ All 3 follow records deleted (CASCADE)
- ✓ User A cannot access tasks anymore
- ✓ Follower counts decremented on all 3 tasks
- ✓ User A no longer receives notifications

---

### TC-TF-013: Deleted Task Removes All Followers
**Priority:** Medium
**Feature:** Cascade on Task Deletion

**Steps:**
1. Task-123 has 5 followers
2. Admin deletes Task-123
3. Check task_followers table

**Expected:**
- ✓ All 5 follower records deleted (CASCADE)
- ✓ No orphaned records in task_followers
- ✓ Users' "Followed Tasks" filter no longer shows Task-123

---

### TC-TF-014: View Followers Requires Project Membership
**Priority:** Medium
**Feature:** Follower List Permissions

**Steps:**
1. User A is NOT a member of Project X
2. User A tries GET /api/tasks/:id/followers for Task-123 in Project X

**Expected:**
- ✓ API returns 403 Forbidden
- ✓ Error: "Must be project member"
- ✓ No follower data returned

---

### TC-TF-015: Task in Private Project Cannot Be Followed by Non-Members
**Priority:** Low
**Feature:** Project Privacy

**Steps:**
1. Create private Project X
2. User A is not a member
3. User A tries to follow task in Project X

**Expected:**
- ✓ API returns 403 Forbidden
- ✓ Frontend doesn't show task to User A
- ✓ No follow record created

---

## 4. Edge Cases (3 test cases)

### TC-TF-016: Concurrent Follow Attempts
**Priority:** Low
**Feature:** Race Condition Handling

**Steps:**
1. User A clicks "Follow" button
2. Before API responds, User A clicks "Follow" again

**Expected:**
- ✓ First request: Creates record, returns 200 OK
- ✓ Second request: Returns 400 "Already following"
- ✓ Only one record in database (UNIQUE constraint)
- ✓ UI shows "Following" state correctly

---

### TC-TF-017: Follow Task Then Immediately Unfollow
**Priority:** Medium
**Feature:** Rapid Toggle

**Steps:**
1. User clicks "Follow"
2. Immediately clicks "Following" to unfollow
3. Clicks "Follow" again

**Expected:**
- ✓ All API calls succeed
- ✓ Final state: Following
- ✓ Database reflects current state
- ✓ Follower count accurate

---

### TC-TF-018: "Followed Tasks" Filter Shows Correct Tasks
**Priority:** High
**Feature:** Task Board Filter

**Steps:**
1. User A follows Task-123, Task-456
2. User A assigned to Task-789 (auto-follows)
3. Navigate to task board
4. Select "My Followed Tasks" filter

**Expected:**
- ✓ Shows exactly 3 tasks (123, 456, 789)
- ✓ All tasks have "★ Following" indicator
- ✓ Follower counts visible
- ✓ Can click star to unfollow (removes from filtered view)

---

## Test Execution Guidelines

### Test Environments

- **Local**: Development with test database and Mailtrap
- **Staging**: Pre-production with SES sandbox
- **Production**: Limited smoke testing only

### Test Data

- Use `@test.motionify.studio` emails
- Create test projects with "TEST-" prefix
- Clear test data after runs

### Automation Strategy

**Unit Tests** (100% coverage target):
- `isFollowing()` utility function
- Follower count calculation
- Permission checks

**Integration Tests** (All API endpoints):
- POST /api/tasks/:id/follow
- DELETE /api/tasks/:id/follow
- GET /api/tasks/:id/followers

**E2E Tests** (Critical flows):
- TC-TF-001, TC-TF-002, TC-TF-003 (follow/unfollow)
- TC-TF-006, TC-TF-009 (notifications)
- TC-TF-011 (permissions)

### Regression Testing

Run full suite after:
- Database schema changes
- Notification system updates
- Permission logic changes

---

## Test Coverage Summary

| Feature Area | Test Cases | Priority High | Priority Medium | Priority Low |
|--------------|------------|---------------|-----------------|--------------|
| Follow/Unfollow | 5 | 3 | 2 | 0 |
| Notifications | 5 | 4 | 1 | 0 |
| Permissions | 5 | 3 | 1 | 1 |
| Edge Cases | 3 | 1 | 1 | 1 |
| **TOTAL** | **18** | **11** | **5** | **2** |
