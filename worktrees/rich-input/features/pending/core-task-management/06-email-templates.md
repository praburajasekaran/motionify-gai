# Email Templates: Core Task Management

Email notification templates for task management events.

## Email Service Configuration

- **Provider:** Amazon SES
- **From:** notifications@motionify.studio
- **Reply-To:** support@motionify.studio
- **Service:** Transactional emails via SES

## Team Email Templates

### 1. Task Created & Assigned

**Trigger:** User assigned to a new task
**To:** Assignees
**Subject:** `New task assigned: {{taskTitle}}`

```
Hi {{userName}},

You've been assigned to a new task on {{projectName}}.

Task: {{taskTitle}}
Deliverable: {{deliverableName}}
{{#if deadline}}Deadline: {{deadline}}{{/if}}

[View Task]({{taskUrl}})

---
Motionify PM Portal
```

### 2. Task Status Changed

**Trigger:** Task status updated
**To:** Assignees + Followers
**Subject:** `Task updated: {{taskTitle}} → {{newStatus}}`

```
Hi {{userName}},

{{changedByName}} updated the status of {{taskTitle}}.

Status: {{oldStatus}} → {{newStatus}}

[View Task]({{taskUrl}})

---
Motionify PM Portal
```

### 3. Task Ready for Client Review

**Trigger:** Status changed to "awaiting_approval"
**To:** Client Primary Contact
**Subject:** `Your review needed: {{taskTitle}}`

```
Hi {{userName}},

The team has completed {{taskTitle}} and it's ready for your review.

Delivery Notes:
{{deliveryNotes}}

[Review Task]({{taskUrl}})

---
Motionify Studios
```

### 4. Task Approved

**Trigger:** Client approves task
**To:** Assignees + Followers
**Subject:** `Task approved: {{taskTitle}}`

```
Hi {{userName}},

{{approvedByName}} approved {{taskTitle}}!

[View Task]({{taskUrl}})

---
Motionify PM Portal
```

### 5. Revision Requested

**Trigger:** Client requests revision
**To:** Assignees + Followers
**Subject:** `Revision requested: {{taskTitle}}`

```
Hi {{userName}},

{{requestedByName}} requested revisions on {{taskTitle}}.

Feedback:
{{revisionFeedback}}

[View Task]({{taskUrl}})

---
Motionify PM Portal
```

### 6. Comment Added

**Trigger:** New comment posted
**To:** Assignees + Followers (except commenter)
**Subject:** `New comment on {{taskTitle}}`

```
Hi {{userName}},

{{commenterName}} commented on {{taskTitle}}.

"{{commentPreview}}"

[View & Reply]({{taskUrl}})

---
[Unfollow Task]({{unfollowUrl}})
```

### 7. User Mentioned

**Trigger:** User mentioned in comment (@username)
**To:** Mentioned user
**Subject:** `{{mentionedByName}} mentioned you`

```
Hi {{userName}},

{{mentionedByName}} mentioned you in {{taskTitle}}.

[View Comment]({{taskUrl}})

---
Motionify PM Portal
```

### 8. Deadline Reminder (24h)

**Trigger:** 24 hours before deadline
**To:** Assignees
**Subject:** `Deadline tomorrow: {{taskTitle}}`

```
Hi {{userName}},

Reminder: {{taskTitle}} is due tomorrow.

Deadline: {{deadline}}
Status: {{currentStatus}}

[View Task]({{taskUrl}})

---
Motionify PM Portal
```

## Client Email Templates

### 9. Task Ready for Review (Client-Friendly)

**Trigger:** Status → awaiting_approval (client-visible task)
**To:** Client Primary Contact
**Subject:** `Please review: {{taskTitle}}`

```html
Hi {{userName}},

Great news! We've completed {{taskTitle}} for {{projectName}}.

What we've done:
{{deliveryNotes}}

Next steps:
1. Review the work
2. Approve or request changes

[Review Now]({{taskUrl}})

Questions? Reply to this email.

---
Motionify Studios
{{supportEmail}}
```

### 10. Task Approved Confirmation

**Trigger:** Client approves task
**To:** Client (approver)
**Subject:** `Thank you for approving {{taskTitle}}`

```
Hi {{userName}},

Thank you for approving {{taskTitle}}!

We'll continue with the next tasks.

[View Project]({{projectUrl}})

---
Motionify Studios
```

### 11. Revision Acknowledged

**Trigger:** Client requests revision
**To:** Client (requester)
**Subject:** `We've received your feedback for {{taskTitle}}`

```
Hi {{userName}},

We've received your revision request for {{taskTitle}}.

Your feedback:
{{revisionFeedback}}

We'll make the adjustments and notify you when ready.

[Track Progress]({{taskUrl}})

---
Motionify Studios
```

## Overdue Task

### 12. Task Overdue Notification

**Trigger:** Task deadline passed, status != completed
**To:** Assignees + Task Creator
**Subject:** `Overdue: {{taskTitle}}`

```
Hi {{userName}},

{{taskTitle}} is now {{daysOverdue}} day(s) overdue.

Deadline was: {{deadline}}
Current status: {{currentStatus}}

Please update the task.

[View Task]({{taskUrl}})

---
Motionify PM Portal
```

## Email Variables

Common variables available in all templates:

```
{{userName}} - Recipient name
{{userEmail}} - Recipient email
{{taskTitle}} - Task title
{{taskUrl}} - Direct link to task
{{projectName}} - Project name
{{projectUrl}} - Project dashboard link
{{deliverableName}} - Linked deliverable name
{{currentStatus}} - Task current status
{{deadline}} - Formatted deadline
```

## Email Preferences

Users can configure notification preferences:

- Real-time notifications
- Daily digest
- Weekly digest
- Disable specific notification types

## Testing

Test all templates with sample data before deployment.

```json
{
  "userName": "John Doe",
  "projectName": "Acme Corp Video",
  "taskTitle": "Color grading scene 2",
  "taskUrl": "https://portal.motionify.studio/tasks/123",
  "deliveryNotes": "Adjusted per your feedback.",
  "deadline": "Nov 25, 2025"
}
```
