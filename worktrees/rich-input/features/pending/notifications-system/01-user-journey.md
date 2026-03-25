# User Journey: Notifications System

## Complete Customer Journey

### Happy Path: Task Assignment Notification

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  IN-APP NOTIFICATION WORKFLOW                            │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1: Event Triggered (Task Assignment)
    ↓
[Project Manager assigns task to Jane Smith]
[System creates task_assignments record]
    ↓

STEP 2: Notification Created
    ↓
[System checks Jane's notification preferences]
[Preference check: task_assigned → in_app: TRUE, email: TRUE]
[System creates notifications record]
[Sets: type=task_assigned, userId=Jane's ID, read=FALSE]
[Metadata includes: taskId, taskTitle, assignedBy, projectId, projectName]
    ↓

STEP 3: In-App Notification Delivered
    ↓
[If Jane has active WebSocket connection: Push immediately]
[If no active connection: Notification waiting in database]
[Unread count incremented: 3 → 4]
    ↓

STEP 4: User Opens Portal
    ↓
[Jane opens portal, sees notification bell with badge "4"]
[Frontend calls GET /api/notifications?limit=10]
[System returns 4 unread notifications + 6 recent read notifications]
    ↓

STEP 5: User Views Notification
    ↓
[Jane clicks notification bell]
[Dropdown opens showing notification list]
[Jane sees: "You were assigned to 'Create storyboard concepts' by Mike Johnson"]
[Notification shows: icon, message, time ago, project name]
    ↓

STEP 6: User Clicks Notification
    ↓
[Jane clicks notification item]
[Frontend calls PATCH /api/notifications/:id/read]
[System marks notification as read]
[Badge count decrements: 4 → 3]
[Jane redirected to task detail view]
    ↓

STEP 7: Notification Marked as Read
    ↓
[Notification status: read = TRUE]
[Read timestamp recorded: read_at = current timestamp]
[Notification moves to "read" section in history]
```

### Email Notification Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     EMAIL NOTIFICATION WORKFLOW                          │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1: Event Triggered + In-App Notification Created
    ↓
[Same as above: Event occurs, notification created]
[System checks user preferences: email enabled for this type]
    ↓

STEP 2: Email Queue Entry Created
    ↓
[System creates notification_email_queue record]
[Status: pending, scheduled_for: NOW + 2 minutes (batching window)]
[Includes notification IDs to batch together]
    ↓

STEP 3: Email Batching Logic (Background Job Every 2 Minutes)
    ↓
[Background job checks for pending emails]
[Groups emails by recipient and project within 5-minute window]
[If Jane has 3 notifications in last 2 minutes: Batch them]
[If only 1 notification: Send individual email]
    ↓

STEP 4: Email Sent via Amazon SES
    ↓
[Email template populated with notification data]
[Subject: "[Motionify] You have 3 new notifications - Brand Video Campaign"]
[Body includes: All 3 notifications, "View in Portal" button, unsubscribe link]
[SES sends email to Jane's address]
[Email queue status: pending → sent]
    ↓

STEP 5: User Receives Email
    ↓
[Jane receives email (1-3 minutes after initial event)]
[Email shows: Project name, 3 notifications with links]
[Click "View in Portal" → Redirects to notifications page]
[Click individual notification link → Redirects to specific item]
    ↓

STEP 6: User Clicks Email Link
    ↓
[Jane clicks "View Task" link in email]
[Opens portal, authenticates if needed]
[Notification auto-marked as read (clicked via email)]
[Navigates to task detail view]
```

## State Transition Diagrams

### Notification Status Flow

```
                    ┌─────────────┐
                    │   CREATED   │  ← Notification created, read=false
                    │  (unread)   │
                    └──────┬──────┘
                           │
                ┌──────────┼──────────┐
                ↓                     ↓
         [User Views]          [Auto-expires 7 days]
                ↓                     ↓
         ┌──────────┐          ┌─────────────┐
         │   READ   │          │ AUTO-READ   │  ← Marked read automatically
         └──────────┘          └──────┬──────┘
                │                     │
                └──────────┬──────────┘
                           │
                           ↓
                    [After 90 days]
                           ↓
                    ┌──────────┐
                    │ DELETED  │  ← Auto-deleted by cleanup job
                    └──────────┘

Terminal States:
- READ (manually or auto-marked read)
- DELETED (after retention period)
```

### Email Delivery Status Flow

```
                    ┌─────────────┐
                    │   PENDING   │  ← Email queued, awaiting batch window
                    └──────┬──────┘
                           │
                    [Batch window expires]
                           │
                           ↓
                    ┌─────────────┐
                    │  BATCHED    │  ← Grouped with other notifications
                    └──────┬──────┘
                           │
                    [SES send request]
                           │
                ┌──────────┼──────────┐
                ↓                     ↓
         [Success]              [SES Error]
                ↓                     ↓
         ┌──────────┐          ┌─────────────┐
         │   SENT   │          │   FAILED    │
         └──────────┘          └──────┬──────┘
                                      │
                               [Retry 3x, then]
                                      ↓
                               ┌─────────────┐
                               │  ABANDONED  │  ← Max retries exceeded
                               └─────────────┘
```

### User Preference States

```
For each notification category (task_assigned, comment_mention, etc.):

    ┌──────────────────────────────────┐
    │  DEFAULT (both enabled)          │
    │  in_app: ✅  email: ✅           │
    └───────────┬──────────────────────┘
                │
    User changes preferences
                │
    ┌───────────┴──────────┬───────────────────┬──────────────────┐
    ↓                      ↓                   ↓                  ↓
┌─────────┐        ┌──────────────┐    ┌─────────────┐    ┌────────────┐
│ In-App  │        │  Email Only  │    │  Both Off   │    │ Both On    │
│  Only   │        │              │    │  (muted)    │    │ (default)  │
│ ✅ ❌   │        │  ❌ ✅       │    │  ❌ ❌      │    │  ✅ ✅     │
└─────────┘        └──────────────┘    └─────────────┘    └────────────┘
```

## Decision Points

### System: Should Email Be Sent?

```
Notification Created
       │
       ↓
┌──────────────────────┐
│ Check User Prefs     │
└──────────┬───────────┘
           │
    ┌──────┴──────┐
    ↓             ↓
YES (enabled)   NO (disabled)
    ↓             ↓
Queue email    Skip email
    ↓             ↓
Batch & send  In-app only
```

### System: Batch or Send Immediately?

```
Email Queued
     │
     ↓
┌──────────────────────────────┐
│ Other pending emails for     │
│ same user in last 2 minutes? │
└──────────┬───────────────────┘
           │
    ┌──────┴──────┐
    ↓             ↓
  YES           NO
    ↓             ↓
Wait for       Send
batch         immediately
window
    ↓
Group 2-10
notifications
    ↓
Send digest
email
```

### User: View in Dropdown or History Page?

```
User Clicks Notification Bell
              │
              ↓
   ┌──────────┴──────────┐
   ↓                     ↓
Recent 10         "View All" Link
notifications           │
shown in                ↓
dropdown            Full History Page
   │                    │
   ↓                    ↓
Click item         Filter by:
→ Mark read        - Unread only
→ Navigate         - By project
                   - By type
                   - Date range
```

## Automation Triggers

### In-App Notification Creation (Automatic)

| Trigger Event | Recipients | Notification Type | Timing |
|--------------|------------|-------------------|--------|
| Task assigned | Assignees | `task_assigned` | Immediate |
| Task status changed | Assignees + Followers | `task_status_changed` | Immediate |
| Comment @mention | Mentioned users | `comment_mention` | Immediate |
| File uploaded | Project team | `file_uploaded` | Immediate |
| Deliverable awaiting approval | Client primary contact | `approval_request` | Immediate |
| Revision requested | Motionify PM + Admin | `revision_requested` | Immediate |
| Team member added | New team member | `team_member_added` | Immediate |
| Team member removed | Removed member | `team_member_removed` | Immediate |

### Email Notifications (Batched)

| Trigger Event | Recipients | Email Type | Batching Window | Max Batch Size |
|--------------|------------|------------|----------------|----------------|
| Task assigned | Assignees | Individual | 2 minutes | 10 notifications |
| Comment @mention | Mentioned users | Individual | 2 minutes | 10 notifications |
| Approval request | Client primary contact | Individual | None (immediate) | 1 |
| High-priority events | Relevant users | Individual | None (immediate) | 1 |
| Normal events | Relevant users | Batched digest | 5 minutes | 10 notifications |

### Status Updates (Automatic)

| Trigger Event | Status Change |
|--------------|---------------|
| Notification created | `notifications.read` → FALSE |
| User clicks notification | `notifications.read` → TRUE |
| 7 days pass, no interaction | `notifications.read` → TRUE (auto-expire) |
| 90 days pass | `notifications` → DELETED (cleanup) |
| Email sent successfully | `notification_email_queue.status` → sent |
| Email delivery failed | `notification_email_queue.retry_count` +1 |

### System Actions (Automatic)

| Trigger Event | System Action |
|--------------|---------------|
| Notification created | Update unread count for user in cache |
| Notification marked read | Decrement unread count |
| All notifications marked read | Reset unread count to 0 |
| User connects (WebSocket) | Push pending unread notifications |
| Daily at 3 AM UTC | Run cleanup job: Delete notifications > 90 days old |
| Every 2 minutes | Process email queue: Batch and send pending emails |

## Timeline Estimates

### Instant Notification Flow

```
Time 0s:        PM assigns task to Jane
Time 0.1s:      Notification created in database
Time 0.2s:      WebSocket push to Jane's browser (if online)
Time 0.3s:      Badge count updates: 3 → 4
                ↓
Total: < 1 second from event to in-app notification
```

### Batched Email Flow

```
Time 0s:        Event A occurs (task assigned)
Time 0.1s:      Email queued (scheduled for T+2min)
Time 45s:       Event B occurs (comment mention)
Time 45.1s:     Email queued (same batch window)
Time 90s:       Event C occurs (file uploaded)
Time 90.1s:     Email queued (same batch window)
Time 120s:      Batch window closes
Time 121s:      Background job groups 3 emails
Time 122s:      Single digest email sent to Jane
Time 125s:      SES delivers email
                ↓
Total: ~2 minutes from first event to email delivery
```

### High-Priority Immediate Email

```
Time 0s:        Client requests deliverable approval
Time 0.1s:      Notification created
Time 0.2s:      Email queued with priority=high flag
Time 0.3s:      Background job detects high-priority email
Time 1s:        Email sent immediately (no batching)
Time 4s:        SES delivers email
                ↓
Total: ~4 seconds from event to email delivery
```

## Edge Cases & Error Handling

### Edge Case: User Deletes Notification Before Reading

**Description:** User clicks "X" to delete notification without marking as read

**Expected Behavior:**
- Notification removed from list immediately
- Unread count decremented (even though not marked "read")
- Deleted notification moves to deleted state (soft delete for 7 days)
- User can't accidentally re-see deleted notification

**Resolution:** Frontend removes from UI, backend soft-deletes record

---

### Edge Case: 100+ Unread Notifications

**Description:** User hasn't logged in for 3 weeks, has 150 unread notifications

**Expected Behavior:**
- Badge shows "99+" (not actual count to avoid UI overflow)
- Dropdown shows most recent 10 notifications
- "View All" link prominently displayed
- Full history page shows all 150 with pagination (50 per page)
- System doesn't slow down or crash

**Resolution:** Capped badge display + pagination

---

### Edge Case: User Disables All Email Notifications

**Description:** User turns off all email notification categories

**Expected Behavior:**
- System still creates in-app notifications
- Email queue entries not created at all (no unnecessary DB writes)
- User still receives critical system emails (password reset, account changes)
- User can re-enable email notifications anytime

**Resolution:** Preference check before queueing emails

---

### Edge Case: Notification for Deleted Project/Task

**Description:** Task deleted after notification created but before user views it

**Expected Behavior:**
- Notification still visible in history
- Click on notification shows friendly message: "This task is no longer available"
- Option to dismiss notification
- No error or broken page

**Resolution:** Frontend handles 404 gracefully with user-friendly message

---

### Error Case: Email Delivery Fails (SES Error)

**Description:** Amazon SES returns error (rate limit, invalid email, bounce)

**Expected Behavior:**
- Email queue status: pending → failed
- Retry up to 3 times with exponential backoff (2min, 10min, 1hr)
- After 3 failures: status → abandoned
- Admin notification: "Email delivery failed for user@example.com"
- In-app notification still delivered (user not blocked)

**Resolution:** Retry logic with eventual abandonment, admin alert

---

### Error Case: WebSocket Connection Lost

**Description:** User's WebSocket connection drops (network issue, browser sleep)

**Expected Behavior:**
- Notifications still created in database
- When user reconnects: Missed notifications pushed immediately
- Unread count synced on reconnection
- No duplicate notifications
- Fallback to polling if WebSocket unavailable

**Resolution:** Stateless notification system, reconnection sync

---

### Error Case: Concurrent "Mark All Read" + New Notification

**Description:** User clicks "Mark All Read" while new notification being created

**Expected Behavior:**
- Mark all read applies to notifications existing at T=0
- New notification (created at T+0.1s) remains unread
- No race condition or lost unread status
- Badge count updates correctly: 5 → 0 → 1

**Resolution:** Timestamp-based filtering, optimistic UI updates

---

### Error Case: User Clicks Notification Link in Email After Deleting Item

**Description:** User receives email about task assignment, task is deleted before they click link

**Expected Behavior:**
- Link opens portal, authenticates user
- Shows friendly 404 page: "This task has been deleted"
- Notification marked as read anyway (user attempted to view)
- Suggests navigating to project overview instead

**Resolution:** Graceful 404 handling with navigation suggestions

---

## Permission Guards

### Frontend Guards

```typescript
// Only show notification bell if user has project access
if (user.projects.length > 0) {
  showNotificationBell();
}

// Only fetch notifications for current user
GET /api/notifications?userId={currentUser.id}

// Only allow marking own notifications as read
if (notification.userId === currentUser.id) {
  allowMarkAsRead();
}
```

### Backend API Guards

```typescript
// GET /api/notifications
// Only return notifications for authenticated user
const notifications = await db.query(
  'SELECT * FROM notifications WHERE user_id = $1',
  [req.user.id]
);

// PATCH /api/notifications/:id/read
// Verify notification belongs to user
const notification = await db.findById(notificationId);
if (notification.userId !== req.user.id) {
  throw new ForbiddenError('Cannot access other users\' notifications');
}

// GET /api/users/me/notification-preferences
// Only allow viewing/editing own preferences
if (req.params.userId !== req.user.id) {
  throw new ForbiddenError('Cannot access other users\' preferences');
}
```

## Metrics & Analytics

### Key Metrics to Track

1. **Notification Delivery Success Rate**: % of created notifications successfully delivered (in-app + email)
2. **Average Time to Read**: Hours from notification creation to user marking as read
3. **Click-Through Rate**: % of notifications clicked to navigate to related item
4. **Email Opt-Out Rate**: % of users who disable email notifications per category
5. **Unread Notification Accumulation**: Average unread count per user over time

### Success Criteria

- **> 99% delivery rate** for in-app notifications
- **> 95% delivery rate** for email notifications
- **< 4 hours average** time to read
- **> 60% click-through rate** on notifications
- **< 10% email opt-out rate** per category

---

## Workflow Summary

| Step | Actor | Action | Duration |
|------|-------|--------|----------|
| 1 | System | Event occurs (task assigned, etc.) | Immediate |
| 2 | System | Create notification record | < 100ms |
| 3 | System | Push to WebSocket (if connected) | < 200ms |
| 4 | System | Queue email (if preference enabled) | < 100ms |
| 5 | User | Opens portal, sees badge | User-dependent |
| 6 | User | Clicks notification bell | Immediate |
| 7 | User | Views notification dropdown | < 500ms |
| 8 | User | Clicks notification item | Immediate |
| 9 | System | Mark as read, navigate to item | < 200ms |
| 10 | System | Send batched email (background) | 2-5 minutes |

**Total Timeline:**
- **In-app notification:** < 1 second from event to delivery
- **Email notification:** 2-5 minutes (batched) or 5-10 seconds (high-priority)
- **User interaction:** User-dependent (minutes to hours to view)
