# Notification Batching Rules

**Date:** January 2025  
**Status:** ✅ Complete  
**Purpose:** Define which notifications are batched vs immediate across all features

---

## Overview

The notification system supports two delivery modes:
1. **Immediate** - Sent right away (high-priority events)
2. **Batched** - Grouped and sent together (normal events)

This document defines the batching rules for all notification types across all features.

---

## Notification Priority Classification

### High-Priority (Immediate - No Batching)

These notifications are sent immediately without batching:

| Notification Type | Feature | Reason | Timing |
|------------------|---------|--------|--------|
| `approval_request` | Deliverable Approval | Client needs to act quickly | Immediate |
| `task-ready-for-review` | Core Task Management | Client action required | Immediate |
| `payment-advance-confirmation` | Payment Workflow | Financial transaction confirmation | Immediate |
| `payment-balance-confirmation` | Payment Workflow | Financial transaction confirmation | Immediate |
| `payment-failed-retry` | Payment Workflow | Action required to retry | Immediate |
| `terms-accepted` | Project Terms | Important milestone | Immediate |
| `proposal-accepted` | Inquiry to Project | Business-critical event | Immediate |
| `proposal-change-requested` | Inquiry to Project | Admin action needed | Immediate |
| `team-invitation` | Team Management | User needs to accept invitation | Immediate |
| `magic-link` | Authentication System | Security-sensitive | Immediate |
| `welcome-client` | Authentication System | First-time user onboarding | Immediate |
| `session-expiry-warning` | Authentication System | Security/access warning | Immediate |

**Criteria for High-Priority:**
- Requires immediate user action
- Financial/security sensitive
- Time-critical business events
- User onboarding/access

---

### Normal Priority (Batched)

These notifications are batched and sent together:

| Notification Type | Feature | Batching Window | Max Batch Size |
|------------------|---------|----------------|----------------|
| `task_assigned` | Core Task Management | 2 minutes | 10 notifications |
| `task_status_changed` | Core Task Management | 5 minutes | 10 notifications |
| `task-commented` | Core Task Management | 5 minutes | 10 notifications |
| `task-mention` | Core Task Management | 2 minutes | 10 notifications |
| `task-deadline-reminder` | Core Task Management | 5 minutes | 10 notifications |
| `task-overdue` | Core Task Management | 5 minutes | 10 notifications |
| `file_uploaded` | File Management | 5 minutes | 10 notifications |
| `file-expiring-soon` | File Management | 5 minutes | 10 notifications |
| `comment_mention` | Feedback & Revisions | 2 minutes | 10 notifications |
| `task-comment-added` | Feedback & Revisions | 5 minutes | 10 notifications |
| `file-comment-added` | Feedback & Revisions | 5 minutes | 10 notifications |
| `revision-requested` | Feedback & Revisions | 5 minutes | 10 notifications |
| `additional-revisions-requested` | Feedback & Revisions | 5 minutes | 10 notifications |
| `additional-revisions-approved` | Feedback & Revisions | Immediate* | 1 |
| `additional-revisions-declined` | Feedback & Revisions | Immediate* | 1 |
| `revised-beta-ready` | Feedback & Revisions | 5 minutes | 10 notifications |
| `revision-quota-warning` | Feedback & Revisions | Immediate* | 1 |
| `team-member-joined` | Team Management | 5 minutes | 10 notifications |
| `team-member-removed` | Team Management | 5 minutes | 10 notifications |
| `invitation-expired-reminder` | Team Management | 5 minutes | 10 notifications |
| `deliverable-approved` | Deliverable Approval | 5 minutes | 10 notifications |
| `deliverable-rejected` | Deliverable Approval | 5 minutes | 10 notifications |
| `deliverable-beta-ready` | Deliverable Approval | Immediate* | 1 |
| `deliverable-final-ready` | Deliverable Approval | Immediate* | 1 |
| `balance-payment-required` | Deliverable Approval | Immediate* | 1 |
| `balance-payment-received` | Deliverable Approval | Immediate* | 1 |
| `invoice-ready` | Payment Workflow | 5 minutes | 10 notifications |
| `final-deliverable-ready` | Payment Workflow | Immediate* | 1 |
| `access-expiring-soon` | Payment Workflow | 5 minutes | 10 notifications |
| `access-expired` | Payment Workflow | 5 minutes | 10 notifications |
| `refund-processed` | Payment Workflow | Immediate* | 1 |

*Note: Some notifications marked as "Immediate" in the table above are actually high-priority and should be sent immediately. See exceptions below.

---

## Batching Rules

### Rule 1: Batching Window

**Normal Priority Notifications:**
- Wait up to **2-5 minutes** (depending on type) for other notifications to accumulate
- If no other notifications arrive within the window, send immediately
- Window starts when first notification is created

**High-Priority Notifications:**
- No batching window
- Sent immediately (< 1 second)

---

### Rule 2: Batch Grouping

Notifications are grouped by:
1. **Recipient** (same user)
2. **Project** (same project context)
3. **Time window** (within batching window)

**Example:**
```
Time 0s:   Task A assigned to Jane (Project X)
Time 30s:  Task B assigned to Jane (Project X)
Time 60s:  Comment on Task A (Jane mentioned)
Time 120s: Batch window closes
Result:    Single email to Jane with 3 notifications about Project X
```

---

### Rule 3: Maximum Batch Size

- **Maximum 10 notifications** per batched email
- If more than 10 notifications accumulate, send multiple emails:
  - First email: 10 notifications
  - Second email: Remaining notifications
- Each email is still grouped by project when possible

---

### Rule 4: Project Grouping

When batching, prioritize grouping by project:
- If user has notifications from multiple projects, group by project
- Send separate batched emails per project (if multiple projects)
- This keeps context clear for the user

**Example:**
```
Jane has:
- 3 notifications from Project A
- 2 notifications from Project B
- 1 notification from Project C

Result:
- Email 1: "3 new notifications - Project A" (batched)
- Email 2: "2 new notifications - Project B" (batched)
- Email 3: "1 new notification - Project C" (immediate, < 5 min)
```

---

## Exceptions & Special Cases

### Exception 1: First Notification in Batch

If a notification is the first one for a user in the batching window:
- Start the batching timer
- Wait for the full window (2-5 minutes)
- Send even if only 1 notification (to avoid indefinite delay)

### Exception 2: User Preference Override

Users can set notification preferences:
- If user disables email for a category → No email sent (in-app only)
- If user sets "immediate" for a normally-batched type → Send immediately
- Preferences override default batching rules

### Exception 3: Quota Warnings

Notifications about quota exhaustion are always immediate:
- `revision-quota-warning` (1 revision remaining)
- `access-expiring-soon` (7 days before expiry)

These require user awareness and action.

---

## Implementation Details

### Background Job

A background job runs **every 2 minutes** to:
1. Check for pending notifications in the email queue
2. Group notifications by recipient and project
3. Check if batching window has expired
4. Send batched emails or individual emails

### Email Queue Table

```sql
notification_email_queue
- notification_id (array of IDs to batch)
- recipient_id
- project_id (for grouping)
- status: pending | batched | sent | failed
- scheduled_for: timestamp (when to send)
- priority: high | normal
- created_at
```

### Batching Logic

```typescript
// Pseudo-code
function processEmailQueue() {
  const pending = getPendingEmails();
  
  for (const recipient of groupByRecipient(pending)) {
    for (const project of groupByProject(recipient.notifications)) {
      const batch = project.notifications.filter(n => 
        n.priority === 'normal' && 
        n.scheduled_for < now() - 2.minutes
      );
      
      const immediate = project.notifications.filter(n => 
        n.priority === 'high'
      );
      
      // Send immediate notifications
      sendImmediate(immediate);
      
      // Send batched notifications
      if (batch.length > 0) {
        sendBatched(batch, recipient, project);
      }
    }
  }
}
```

---

## Feature-Specific Rules

### Core Task Management

- **Batched:** Task assignments, status changes, comments, mentions
- **Immediate:** Tasks ready for review (awaiting_approval)

### File Management

- **Batched:** File uploads, expiring soon warnings
- **Immediate:** None (all batched)

### Feedback & Revisions

- **Batched:** Comments, mentions, revision requests
- **Immediate:** Additional revision approvals/declines, quota warnings

### Deliverable Approval

- **Batched:** Approval/rejection confirmations
- **Immediate:** Beta ready, final ready, payment required

### Payment Workflow

- **Batched:** Invoice ready, access expiring/expired
- **Immediate:** Payment confirmations, payment failures, refunds

### Team Management

- **Batched:** Team member joined/removed, invitation reminders
- **Immediate:** Team invitations (user needs to act)

### Inquiry to Project

- **Batched:** Proposal updates, status changes
- **Immediate:** Proposal accepted, change requests

### Project Terms

- **Batched:** None
- **Immediate:** Terms accepted (business-critical)

---

## User Experience Considerations

### Email Frequency

**Goal:** Balance between:
- Keeping users informed (not too few emails)
- Avoiding email fatigue (not too many emails)

**Strategy:**
- Batch similar notifications together
- Group by project for context
- Send high-priority immediately for action items

### Email Content

**Batched Email Format:**
```
Subject: [Motionify] You have 3 new notifications - Project Name

Body:
- Notification 1: Task assigned
- Notification 2: Comment added
- Notification 3: File uploaded

[View All Notifications] button
```

**Immediate Email Format:**
```
Subject: [Motionify] Action Required: Approve Deliverable - Project Name

Body:
- Single notification with clear call-to-action
- Direct link to item
- Context and details
```

---

## Testing Scenarios

### Scenario 1: Multiple Task Assignments

**Setup:** PM assigns 5 tasks to Jane within 1 minute

**Expected:**
- 5 in-app notifications (immediate)
- 1 batched email after 2 minutes with all 5 tasks

### Scenario 2: Mixed Priority

**Setup:** 
- Task assigned (normal)
- Deliverable ready for approval (high-priority)

**Expected:**
- 2 in-app notifications (immediate)
- 1 immediate email for deliverable approval
- 1 batched email after 2 minutes for task assignment

### Scenario 3: Cross-Project Notifications

**Setup:** Jane has notifications from 2 different projects

**Expected:**
- 2 separate batched emails (one per project)
- Or 1 email with clear project sections

---

## Configuration

### Batching Windows (Configurable)

```typescript
const BATCHING_WINDOWS = {
  'task_assigned': 2 * 60 * 1000,        // 2 minutes
  'task_status_changed': 5 * 60 * 1000,  // 5 minutes
  'file_uploaded': 5 * 60 * 1000,        // 5 minutes
  'comment_mention': 2 * 60 * 1000,      // 2 minutes
  // ... etc
};
```

### Priority Mapping

```typescript
const NOTIFICATION_PRIORITY = {
  'approval_request': 'high',
  'task-ready-for-review': 'high',
  'payment-advance-confirmation': 'high',
  'task_assigned': 'normal',
  'file_uploaded': 'normal',
  // ... etc
};
```

---

## Related Documentation

- `features/notifications-system/01-user-journey.md` - Main notification workflow
- `features/notifications-system/05-api-endpoints.md` - Notification API
- `features/notifications-system/06-email-templates.md` - Email templates

---

**Last Updated:** January 2025  
**Status:** ✅ Complete

