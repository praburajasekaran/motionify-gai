# Test Cases: Notifications System

This document contains comprehensive test scenarios for the Notifications System feature.

## Test Execution Guidelines

- **Priority**: High (High), Medium (Medium), Low (Low)
- **Test Environment**: Use staging database with test data
- **Test Users**: Create dedicated test accounts (motionify_test_pm@example.com, test_client@example.com)
- **Email Testing**: Use Mailtrap.io for email delivery testing
- **Automation**: Priority High and Medium tests should be automated

---

## Table of Contents

1. [In-App Notification Creation & Delivery](#in-app-notification-creation--delivery)
2. [Email Notification Delivery](#email-notification-delivery)
3. [Notification Preferences](#notification-preferences)
4. [Real-Time Updates](#real-time-updates)
5. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## In-App Notification Creation & Delivery

### TC-NOT-001: Task Assignment Notification

**Priority:** High  
**Feature:** Task assignment notifications  
**User Story:** US-030

**Preconditions:**
- User Jane (ID: user-jane-001) is logged in
- Project "Brand Video Campaign" exists
- User Mike (ID: user-mike-002) has PM role

**Test Steps:**
1. As Mike, navigate to project tasks
2. Create new task "Create storyboard concepts"
3. Assign task to Jane
4. Click "Save"

**Expected Results:**
- ✅ Notification created in `notifications` table
- ✅ `type` = "task_assigned", `category` = "task_updates"
- ✅ `message` = "You were assigned to 'Create storyboard concepts' by Mike Johnson"
- ✅ `read` = FALSE, `actor_id` = user-mike-002
- ✅ `metadata` contains: taskId, taskTitle, projectName
- ✅ `action_url` = "/projects/{project_id}/tasks/{task_id}"
- ✅ Badge count increments (e.g., 3 → 4)
- ✅ If Jane has portal open: Notification appears in real-time

**Actual Results:** [To be filled during testing]

---

### TC-NOT-002: Comment Mention Notification

**Priority:** High  
**Feature:** @mention notifications  
**User Story:** US-030

**Preconditions:**
- User Jane is logged in and viewing notifications
- Task "Create storyboard" exists
- User Sarah is commenting on the task

**Test Steps:**
1. As Sarah, navigate to task detail page
2. Add comment: "Can you review this @JaneDoe?"
3. Click "Post Comment"

**Expected Results:**
- ✅ Notification created with `type` = "comment_mention"
- ✅ `message` contains Sarah's name and truncated comment
- ✅ `action_url` links to comment (with #comment-{id} anchor)
- ✅ Jane's unread count increments immediately
- ✅ If Jane has notifications dropdown open: New notification appears at top

---

### TC-NOT-003: File Upload Notification

**Priority:** Medium  
**Feature:** File upload notifications  
**User Story:** US-030

**Preconditions:**
- Project team has 3 members: Jane, Mike, Sarah
- All have `file_updates` in-app notifications enabled

**Test Steps:**
1. As Mike, navigate to project files tab
2. Upload file "final-edit-v3.mp4" to deliverable "Video Production"
3. Wait for upload to complete

**Expected Results:**
- ✅ 3 notifications created (one per team member, excluding Mike)
- ✅ `type` = "file_uploaded", `category` = "file_updates"
- ✅ `metadata` contains: fileId, fileName, deliverableId
- ✅ `actor_name` = "Mike Johnson"
- ✅ All team members (except Mike) see notification

---

### TC-NOT-004: View Notifications in Dropdown

**Priority:** High  
**Feature:** Notification dropdown display  
**User Story:** US-030

**Preconditions:**
- Jane has 4 unread notifications
- Jane is logged into portal

**Test Steps:**
1. Observe notification bell in top navigation
2. Click notification bell icon
3. Review dropdown content

**Expected Results:**
- ✅ Badge shows "4"
- ✅ Dropdown opens showing max 10 notifications
- ✅ Unread notifications have blue left border
- ✅ Read notifications have gray appearance
- ✅ Notifications grouped: "UNREAD (4)" and "EARLIER TODAY (2)"
- ✅ Each notification shows: icon, message, time ago, project name
- ✅ "View All Notifications" link appears at bottom

---

### TC-NOT-005: Mark Notification as Read

**Priority:** High  
**Feature:** Mark notification as read  
**User Story:** US-030

**Preconditions:**
- Jane has notification "You were assigned to 'Create storyboard'" (unread)
- Notification dropdown is open

**Test Steps:**
1. Click the notification item in dropdown
2. Observe UI changes
3. Check database

**Expected Results:**
- ✅ API call: `PATCH /api/notifications/{id}/read`
- ✅ Notification marked as read in database: `read` = TRUE, `read_at` = timestamp
- ✅ Badge count decrements: 4 → 3
- ✅ Notification moves to "read" section in dropdown
- ✅ User redirected to task detail page
- ✅ Dropdown closes after navigation

---

### TC-NOT-006: Mark All Notifications as Read

**Priority:** Medium  
**Feature:** Bulk mark as read  
**User Story:** US-030

**Preconditions:**
- Jane has 12 unread notifications

**Test Steps:**
1. Open notification dropdown
2. Click "Mark all as read" link
3. Wait for confirmation

**Expected Results:**
- ✅ API call: `POST /api/notifications/mark-all-read`
- ✅ All 12 notifications updated: `read` = TRUE
- ✅ Badge count updates to 0
- ✅ Toast message: "All notifications marked as read"
- ✅ Dropdown refreshes showing all notifications as read
- ✅ No duplicate API calls

---

## Email Notification Delivery

### TC-NOT-007: Task Assignment Email (Individual)

**Priority:** High  
**Feature:** Email notifications for task assignments  
**User Story:** US-031

**Preconditions:**
- Jane has email notifications enabled for `task_updates`
- Email batching frequency: "every_5_min"
- No other pending notifications for Jane

**Test Steps:**
1. As Mike, assign task "Create storyboard" to Jane
2. Wait 2 minutes for batching window
3. Check Mailtrap inbox

**Expected Results:**
- ✅ Email received at Jane's email address
- ✅ From: "Motionify Portal <hello@motionify.studio>"
- ✅ Subject: "[Motionify] You were assigned to a task - Brand Video Campaign"
- ✅ Email contains: task title, assigned by Mike, due date, description
- ✅ "View Task in Portal" button links to correct task
- ✅ Plain text version also sent (multipart/alternative)
- ✅ Unsubscribe link present and functional
- ✅ Email delivered within 2-5 minutes

---

### TC-NOT-008: Comment Mention Email (Immediate)

**Priority:** High  
**Feature:** Immediate email for @mentions  
**User Story:** US-031

**Preconditions:**
- Jane has email notifications enabled for `comments_mentions`

**Test Steps:**
1. As Sarah, comment on task mentioning Jane: "Can you review @JaneDoe?"
2. Wait 10 seconds
3. Check Mailtrap inbox

**Expected Results:**
- ✅ Email received within 10 seconds (immediate, no batching)
- ✅ Subject: "[Motionify] Sarah Williams mentioned you - Brand Video Campaign"
- ✅ Email shows truncated comment text (max 200 chars)
- ✅ Direct link to comment with #comment-{id} anchor
- ✅ Email priority: High

---

### TC-NOT-009: Notification Digest Email (Batched)

**Priority:** Medium  
**Feature:** Email batching  
**User Story:** US-031

**Preconditions:**
- Jane has email notifications enabled for multiple categories
- Email batching: "every_5_min"

**Test Steps:**
1. At T+0s: Mike assigns task to Jane
2. At T+45s: Sarah uploads file to project
3. At T+90s: Tom adds comment (not @mention)
4. Wait until T+120s (2 minute batch window)
5. Check Mailtrap inbox

**Expected Results:**
- ✅ Single digest email received (not 3 separate emails)
- ✅ Subject: "[Motionify] You have 3 new notifications - Brand Video Campaign"
- ✅ Email body lists all 3 notifications with separators
- ✅ Each notification has: icon, message, timestamp, individual "View" link
- ✅ "View All Notifications" button at bottom
- ✅ Email sent ~2 minutes after first notification

---

### TC-NOT-010: Email Respects User Preferences

**Priority:** High  
**Feature:** Email preference filtering  
**User Story:** US-032

**Preconditions:**
- Jane has disabled email for `file_updates` category
- Jane has enabled email for `task_updates` category

**Test Steps:**
1. Mike uploads file to project (should NOT send email)
2. Wait 5 minutes, check inbox
3. Mike assigns task to Jane (should send email)
4. Wait 5 minutes, check inbox

**Expected Results:**
- ✅ No email received for file upload
- ✅ In-app notification created for file upload
- ✅ Email received for task assignment
- ✅ User preferences correctly filter email delivery

---

### TC-NOT-011: Email Delivery Retry on Failure

**Priority:** Medium  
**Feature:** Email retry logic  
**User Story:** US-031

**Preconditions:**
- Amazon SES temporarily unavailable (simulated)
- Email queue has pending email for Jane

**Test Steps:**
1. Trigger task assignment notification
2. Simulate SES failure (return 500 error)
3. Wait 2 minutes
4. Restore SES
5. Check email queue table

**Expected Results:**
- ✅ Email status: pending → failed
- ✅ Retry count: 0 → 1
- ✅ After 2 minutes: Retry attempt made
- ✅ Email successfully sent on retry
- ✅ Status: failed → sent
- ✅ `ses_message_id` populated

---

## Notification Preferences

### TC-NOT-012: View Default Notification Preferences

**Priority:** Medium  
**Feature:** User notification preferences  
**User Story:** US-032

**Preconditions:**
- New user Jane registered (no preferences set yet)
- Jane logged in

**Test Steps:**
1. Navigate to Settings → Notifications
2. Observe default preferences
3. Check database `user_notification_preferences` table

**Expected Results:**
- ✅ Preferences page loads successfully
- ✅ Default preferences shown:
  - task_updates: in-app ✅ email ✅
  - comments_mentions: in-app ✅ email ✅
  - file_updates: in-app ✅ email ❌
  - approvals_revisions: in-app ✅ email ✅
  - team_changes: in-app ✅ email ✅
  - project_updates: in-app ✅ email ❌
- ✅ Email batching: "Every 5 minutes" selected
- ✅ Preferences record created in database

---

### TC-NOT-013: Update Notification Preferences

**Priority:** High  
**Feature:** Modify notification preferences  
**User Story:** US-032

**Preconditions:**
- Jane on notification preferences page
- Current settings: all enabled

**Test Steps:**
1. Disable email notifications for `file_updates`
2. Disable in-app notifications for `project_updates`
3. Change email batching to "Hourly"
4. Click "Save Changes"

**Expected Results:**
- ✅ API call: `PATCH /api/users/me/notification-preferences`
- ✅ Toast message: "Notification preferences updated"
- ✅ Database updated with new preferences
- ✅ Future file upload notifications: in-app ✅, email ❌
- ✅ Future project update notifications: in-app ❌, email ❌
- ✅ Email batching changed to hourly

---

### TC-NOT-014: Disable All Notifications for Category

**Priority:** Medium  
**Feature:** Mute notification category  
**User Story:** US-032

**Preconditions:**
- Jane on preferences page

**Test Steps:**
1. Disable both in-app AND email for `file_updates`
2. Click "Save Changes"
3. Trigger file upload event

**Expected Results:**
- ✅ Preferences saved successfully
- ✅ No notification created in database for file upload
- ✅ No email queued
- ✅ Badge count unchanged
- ✅ Jane completely opted out of file upload notifications

---

### TC-NOT-015: Cannot Disable Critical Notifications

**Priority:** Medium  
**Feature:** Prevent disabling critical notifications  
**User Story:** US-032

**Preconditions:**
- Jane (client role) on preferences page

**Test Steps:**
1. Attempt to disable both in-app and email for `approvals_revisions`
2. Click "Save Changes"

**Expected Results:**
- ✅ Validation error: "At least one delivery method required for critical notifications"
- ✅ Cannot save preferences
- ✅ Checkbox validation: At least one must remain enabled
- ✅ Help text explains critical notifications cannot be fully disabled

---

### TC-NOT-016: Email Batching Frequency Change

**Priority:** Medium  
**Feature:** Email batching options  
**User Story:** US-032

**Preconditions:**
- Jane on preferences page
- Current batching: "Every 5 minutes"

**Test Steps:**
1. Change batching to "Immediately"
2. Save preferences
3. Trigger 3 task assignment notifications within 2 minutes
4. Check inbox

**Expected Results:**
- ✅ 3 separate emails received (not batched)
- ✅ Each email sent immediately after event
- ✅ No digest email sent

---

### TC-NOT-017: Pause Notifications (Vacation Mode)

**Priority:** Low  
**Feature:** Temporary notification pause  
**User Story:** US-032

**Preconditions:**
- Jane on preferences page

**Test Steps:**
1. Enable "Pause notifications until" option
2. Select date: 7 days from now
3. Save preferences
4. Trigger notification event

**Expected Results:**
- ✅ Preferences saved with `paused_until` = future date
- ✅ No notifications created during pause period
- ✅ After pause period expires: Notifications resume normally
- ✅ User can manually unpause before date

---

## Real-Time Updates

### TC-NOT-018: WebSocket Notification Delivery

**Priority:** Medium  
**Feature:** Real-time notification push  
**User Story:** US-030

**Preconditions:**
- Jane has portal open in browser
- WebSocket connection established
- Jane viewing Dashboard page

**Test Steps:**
1. As Mike (different browser), assign task to Jane
2. Observe Jane's browser (no refresh)

**Expected Results:**
- ✅ Within 1 second: Badge count updates (3 → 4)
- ✅ Toast notification appears: "New notification: You were assigned to..."
- ✅ If dropdown open: New notification appears at top of list
- ✅ No full page refresh required

---

### TC-NOT-019: Multi-Device Sync

**Priority:** Medium  
**Feature:** Cross-device notification sync  
**User Story:** US-030

**Preconditions:**
- Jane logged in on Desktop (Chrome)
- Jane logged in on Mobile (Safari)
- Both devices show unread count: 5

**Test Steps:**
1. On Desktop: Click notification, mark as read
2. Observe Mobile device (within 5 seconds)

**Expected Results:**
- ✅ Mobile badge updates: 5 → 4
- ✅ Same notification marked as read on Mobile
- ✅ Sync occurs via WebSocket or polling
- ✅ Consistent state across devices

---

### TC-NOT-020: Reconnection After Network Drop

**Priority:** Medium  
**Feature:** WebSocket reconnection  
**User Story:** US-030

**Preconditions:**
- Jane has portal open
- WebSocket connected

**Test Steps:**
1. Simulate network disconnect (disable WiFi for 10 seconds)
2. During disconnect: Mike assigns task to Jane
3. Re-enable WiFi
4. Observe browser

**Expected Results:**
- ✅ WebSocket detects disconnect
- ✅ Auto-reconnect attempt after 2 seconds
- ✅ On reconnect: Missed notification delivered
- ✅ Badge count synced correctly
- ✅ No duplicate notifications

---

### TC-NOT-021: Polling Fallback (No WebSocket)

**Priority:** Low  
**Feature:** Polling fallback when WebSocket unavailable  
**User Story:** US-030

**Preconditions:**
- WebSocket connection fails (blocked by firewall)
- Jane's browser falls back to polling

**Test Steps:**
1. Disable WebSocket in browser settings
2. Log in as Jane
3. As Mike, assign task to Jane
4. Wait 30 seconds

**Expected Results:**
- ✅ Notification appears within 30 seconds (polling interval)
- ✅ Polling calls: `GET /api/notifications?limit=10&read=false` every 30s
- ✅ Badge updates correctly
- ✅ No WebSocket errors in console

---

### TC-NOT-022: Badge Count Performance (100+ Notifications)

**Priority:** Low  
**Feature:** Performance with high notification volume  
**User Story:** US-030

**Preconditions:**
- Jane has 150 unread notifications (simulated via test data)

**Test Steps:**
1. Log in as Jane
2. Observe page load time
3. Open notification dropdown
4. Navigate to notification history page

**Expected Results:**
- ✅ Badge shows "99+" (not "150" to avoid overflow)
- ✅ Page loads in < 2 seconds
- ✅ Dropdown shows most recent 10 notifications
- ✅ History page loads with pagination (50 per page)
- ✅ Database queries use indexes (< 100ms query time)
- ✅ No UI lag or freezing

---

## Edge Cases & Error Handling

### TC-NOT-023: Notification for Deleted Task

**Priority:** Medium  
**Feature:** Graceful handling of deleted entities  
**User Story:** US-030

**Preconditions:**
- Jane has notification: "You were assigned to 'Create storyboard'"
- Task has been deleted by Mike

**Test Steps:**
1. As Jane, click notification in dropdown
2. Observe behavior

**Expected Results:**
- ✅ Notification marked as read
- ✅ Redirect attempt to task detail page
- ✅ 404 page shown with message: "This task is no longer available"
- ✅ Option to dismiss notification or return to project
- ✅ No JavaScript errors

---

### TC-NOT-024: Rate Limiting Protection

**Priority:** Medium  
**Feature:** API rate limiting  
**User Story:** US-030

**Preconditions:**
- Jane authenticated

**Test Steps:**
1. Make 100 requests to `GET /api/notifications` within 1 minute
2. Make additional request
3. Observe response

**Expected Results:**
- ✅ First 100 requests: Success (200 OK)
- ✅ 101st request: 429 Too Many Requests
- ✅ Response header: `Retry-After: 900` (15 minutes)
- ✅ Error message: "Too many requests. Please try again later."

---

### TC-NOT-025: Concurrent Mark All Read

**Priority:** Low  
**Feature:** Race condition handling  
**User Story:** US-030

**Preconditions:**
- Jane has 10 unread notifications

**Test Steps:**
1. Open 2 browser tabs with Jane's account
2. In Tab 1: Click "Mark all as read"
3. In Tab 2 (simultaneously): Click "Mark all as read"
4. Observe results

**Expected Results:**
- ✅ Both requests process successfully
- ✅ No database deadlock or error
- ✅ All notifications marked as read exactly once
- ✅ Unread count: 10 → 0 in both tabs
- ✅ No duplicate "marked read" activity logs

---

## Test Summary

| Category | Total Tests | High | Medium | Low |
|----------|-------------|----|----|-----|
| In-App Notifications | 6 | 4 | 2 | 0 |
| Email Notifications | 5 | 3 | 2 | 0 |
| Preferences | 6 | 1 | 4 | 1 |
| Real-Time Updates | 5 | 0 | 3 | 2 |
| Edge Cases | 3 | 0 | 2 | 1 |
| **TOTAL** | **25** | **8** | **13** | **4** |

---

## Automation Strategy

### Priority for Automation
1. **High Tests** (8 tests) - Critical path, automate first
2. **Medium Tests** (13 tests) - Important features, automate second
3. **Low Tests** (4 tests) - Manual testing acceptable

### Recommended Tools
- **API Testing**: Jest + Supertest
- **Email Testing**: Mailtrap.io API
- **E2E Testing**: Playwright or Cypress
- **Database Testing**: pg-mem (in-memory PostgreSQL)

---

**Last Updated**: November 17, 2025  
**Test Coverage**: 25 test cases  
**Status**: Ready for QA Execution
