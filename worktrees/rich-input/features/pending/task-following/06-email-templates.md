# Email Templates: Task Following System

This document specifies email notifications for task followers.

## Email Service Configuration

- **Provider:** Amazon SES
- **From Address:** `hello@motionify.studio`
- **From Name:** `Motionify`
- **Reply-To:** `hello@motionify.studio`

## Notification Strategy

**Key Principle:** Followers receive notifications for task updates, but can opt out per-task.

### Notification Types

1. **Task Status Changed** - When task moves between statuses
2. **New Comment Added** - When someone comments on the task
3. **File Uploaded** - When files are attached to the task
4. **Task Priority Changed** - When priority is updated

### Email Frequency

- **Immediate:** Individual emails sent for each event
- **Digest Option (Future):** Daily digest of all followed task updates

---

## Email Templates

### 1. Task Status Changed

**Trigger:** Task status updated (e.g., Pending → In Progress)
**To:** All task followers (except the user who made the change)
**Subject:** `[TASK-{id}] Status changed to "{newStatus}" - {taskTitle}`

```
Hi {{userName}},

A task you're following has been updated.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TASK STATUS CHANGED

Task: {{taskTitle}} (TASK-{{taskId}})
Project: {{projectName}}

Status changed: {{oldStatus}} → {{newStatus}}
Changed by: {{changedBy}}
Changed at: {{timestamp}}

{{#if comment}}
Comment:
{{comment}}
{{/if}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                        ┌──────────────────┐
                        │  View Task       │
                        │  {{taskUrl}}     │
                        └──────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You're receiving this because you're following this task.
To stop receiving updates, click "Unfollow" on the task page.

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

**Variables:**
- `{{userName}}` - Recipient's first name
- `{{taskTitle}}` - Task title
- `{{taskId}}` - Task ID
- `{{projectName}}` - Project name
- `{{oldStatus}}` - Previous status
- `{{newStatus}}` - New status
- `{{changedBy}}` - User who made the change
- `{{timestamp}}` - Formatted timestamp
- `{{comment}}` - Optional comment (conditional)
- `{{taskUrl}}` - Direct link to task

---

### 2. New Comment Added

**Trigger:** Comment added to task
**To:** All task followers (except the commenter)
**Subject:** `[TASK-{id}] New comment by {userName} - {taskTitle}`

```
Hi {{recipientName}},

Someone commented on a task you're following.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEW COMMENT

Task: {{taskTitle}} (TASK-{{taskId}})
Project: {{projectName}}
Status: {{taskStatus}}

{{commenterName}} commented:

  "{{commentText}}"

Posted at: {{timestamp}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                        ┌──────────────────┐
                        │  View Comment    │
                        │  {{taskUrl}}     │
                        └──────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You're receiving this because you're following this task.
To stop receiving updates, click "Unfollow" on the task page.

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

**Variables:**
- `{{recipientName}}` - Recipient's first name
- `{{taskTitle}}` - Task title
- `{{taskId}}` - Task ID
- `{{projectName}}` - Project name
- `{{taskStatus}}` - Current task status
- `{{commenterName}}` - User who commented
- `{{commentText}}` - Comment content (truncated if > 200 chars)
- `{{timestamp}}` - Formatted timestamp
- `{{taskUrl}}` - Direct link to task with comment anchor

---

### 3. File Uploaded

**Trigger:** File attached to task
**To:** All task followers (except the uploader)
**Subject:** `[TASK-{id}] New file uploaded - {taskTitle}`

```
Hi {{recipientName}},

A new file has been uploaded to a task you're following.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FILE UPLOADED

Task: {{taskTitle}} (TASK-{{taskId}})
Project: {{projectName}}

File: {{fileName}} ({{fileSize}})
Uploaded by: {{uploaderName}}
Uploaded at: {{timestamp}}

{{#if description}}
Description: {{description}}
{{/if}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                        ┌──────────────────┐
                        │  View File       │
                        │  {{taskUrl}}     │
                        └──────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You're receiving this because you're following this task.
To stop receiving updates, click "Unfollow" on the task page.

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

**Variables:**
- `{{recipientName}}` - Recipient's first name
- `{{taskTitle}}` - Task title
- `{{taskId}}` - Task ID
- `{{projectName}}` - Project name
- `{{fileName}}` - Name of uploaded file
- `{{fileSize}}` - Human-readable file size (e.g., "2.5 MB")
- `{{uploaderName}}` - User who uploaded
- `{{timestamp}}` - Formatted timestamp
- `{{description}}` - Optional file description (conditional)
- `{{taskUrl}}` - Direct link to task

---

## Email Design Guidelines

### Branding
- Plain text format for maximum deliverability
- Professional, friendly tone
- Clear structure with ASCII separators

### Accessibility
- Clear subject lines (< 60 characters)
- Front-load important information (task title, action)
- Descriptive link text
- Good contrast for readability

### Unsubscribe Mechanism

Users can stop receiving notifications by:
1. Clicking "Unfollow" on the task detail page
2. Future: Per-task notification preferences

**Note:** We intentionally do NOT include an "Unsubscribe" link in emails because:
- Unfollow is task-specific (user may want to follow other tasks)
- Users should control follows in the portal for better UX
- Reduces accidental unsubscribes

### Testing Checklist

Before deploying:
- [ ] Test all variable substitutions
- [ ] Test conditional sections (with and without data)
- [ ] Verify all links work
- [ ] Check in Gmail, Outlook, Apple Mail
- [ ] Verify plain text rendering
- [ ] Subject lines don't truncate (< 60 chars)
- [ ] Check spam score using mail-tester.com

---

## Email Delivery Metrics

### Key Metrics to Track

1. **Delivery Rate**: > 99% (target)
2. **Open Rate**: > 40% (followers engaged)
3. **Click Rate**: > 15% (followers click task links)
4. **Unfollow Rate**: < 20% (low notification fatigue)

### Alert Thresholds

- Bounce rate > 2%: Investigate sender reputation
- Open rate < 30%: Review subject lines
- Unfollow rate > 30%: Too many notifications, add digest option
