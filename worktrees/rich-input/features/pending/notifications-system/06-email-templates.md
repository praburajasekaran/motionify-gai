# Email Templates: Notifications System

This document specifies all email notification templates sent via Amazon SES.

## Email Configuration

**Email Provider:** Amazon SES  
**From Address:** `Motionify Portal <hello@motionify.studio>`  
**Reply-To:** `noreply@motionify.studio`  
**Content-Type:** `multipart/alternative` (plain text + HTML)  
**Character Encoding:** UTF-8

## Template System

- **Engine:** Handlebars
- **Variables:** Dynamic content wrapped in `{{variable_name}}`
- **Helpers:** `{{#if}}`, `{{#each}}`, `{{formatDate}}`
- **Layout:** Base template with header/footer, content injected

---

## Table of Contents

1. [Task Assignment Email](#1-task-assignment-email)
2. [Comment Mention Email](#2-comment-mention-email)
3. [File Uploaded Email](#3-file-uploaded-email)
4. [Approval Request Email](#4-approval-request-email)
5. [Revision Requested Email](#5-revision-requested-email)
6. [Team Member Added Email](#6-team-member-added-email)
7. [Notification Digest Email (Batched)](#7-notification-digest-email-batched)
8. [Email Delivery Guidelines](#email-delivery-guidelines)
9. [Testing Guidelines](#testing-guidelines)

---

## 1. Task Assignment Email

**Trigger:** User assigned to a task  
**Priority:** Normal (batched within 2 minutes)  
**Template ID:** `task-assigned-v1`

### Subject Line
```
[Motionify] You were assigned to a task - {{project_name}}
```

### Plain Text Version
```
Hi {{user_first_name}},

You have been assigned to a task in the {{project_name}} project.

Task: {{task_title}}
Assigned by: {{actor_name}}
{{#if task_due_date}}Due Date: {{task_due_date}}{{/if}}
{{#if task_description}}

Description:
{{task_description}}
{{/if}}

View Task: {{action_url}}

---

Need to update your notification settings?
Manage your preferences: {{preferences_url}}

Motionify PM Portal
© 2025 Motionify Studio. All rights reserved.

Unsubscribe: {{unsubscribe_url}}
```

### HTML Version
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Assignment</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; border-bottom: 1px solid #e5e7eb;">
              <img src="{{logo_url}}" alt="Motionify" height="32">
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px; color: #111827; font-size: 16px; line-height: 24px;">
                Hi {{user_first_name}},
              </p>
              
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 24px;">
                You have been assigned to a task in the <strong>{{project_name}}</strong> project.
              </p>
              
              <!-- Notification Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-left: 4px solid #3b82f6; border-radius: 4px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px; color: #111827; font-size: 18px; font-weight: 600;">
                      🎯 {{task_title}}
                    </p>
                    
                    <p style="margin: 0 0 4px; color: #6b7280; font-size: 14px;">
                      Assigned by: {{actor_name}}
                    </p>
                    
                    {{#if task_due_date}}
                    <p style="margin: 0 0 4px; color: #6b7280; font-size: 14px;">
                      Due Date: {{task_due_date}}
                    </p>
                    {{/if}}
                    
                    {{#if task_description}}
                    <p style="margin: 16px 0 0; color: #374151; font-size: 14px; line-height: 20px;">
                      {{task_description}}
                    </p>
                    {{/if}}
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 24px;">
                    <a href="{{action_url}}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                      View Task in Portal
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 20px;">
                Need to update your notification settings?
                <a href="{{preferences_url}}" style="color: #3b82f6; text-decoration: none;">Manage your preferences</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; line-height: 16px;">
                Motionify PM Portal
              </p>
              <p style="margin: 0 0 8px; color: #9ca3af; font-size: 12px; line-height: 16px;">
                © 2025 Motionify Studio. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 16px;">
                <a href="{{unsubscribe_url}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### Handlebars Variables
- `{{user_first_name}}` - Recipient's first name
- `{{project_name}}` - Project name
- `{{task_title}}` - Task title
- `{{task_description}}` - Task description (optional)
- `{{task_due_date}}` - Due date formatted (optional)
- `{{actor_name}}` - Who assigned the task
- `{{action_url}}` - Direct link to task in portal
- `{{preferences_url}}` - Link to notification preferences
- `{{unsubscribe_url}}` - Unsubscribe link
- `{{logo_url}}` - Motionify logo URL

---

## 2. Comment Mention Email

**Trigger:** User @mentioned in a comment  
**Priority:** High (sent immediately)  
**Template ID:** `comment-mention-v1`

### Subject Line
```
[Motionify] {{actor_name}} mentioned you - {{project_name}}
```

### Plain Text Version
```
Hi {{user_first_name}},

{{actor_name}} mentioned you in a comment on {{project_name}}.

Comment:
"{{comment_text}}"

Task: {{task_title}}

View Comment: {{action_url}}

---

Motionify PM Portal
© 2025 Motionify Studio. All rights reserved.

Unsubscribe: {{unsubscribe_url}}
```

### Handlebars Variables
- `{{user_first_name}}`
- `{{actor_name}}` - Who mentioned the user
- `{{project_name}}`
- `{{task_title}}` - Related task
- `{{comment_text}}` - Comment content (truncated to 200 chars)
- `{{action_url}}` - Direct link to comment

---

## 3. File Uploaded Email

**Trigger:** New file uploaded to project  
**Priority:** Low (batched within 5 minutes)  
**Template ID:** `file-uploaded-v1`

### Subject Line
```
[Motionify] New file uploaded - {{project_name}}
```

### Plain Text Version
```
Hi {{user_first_name}},

A new file was uploaded to the {{project_name}} project.

File: {{file_name}}
Uploaded by: {{actor_name}}
Deliverable: {{deliverable_name}}
{{#if file_size}}Size: {{file_size}}{{/if}}

View File: {{action_url}}

---

Motionify PM Portal
© 2025 Motionify Studio. All rights reserved.

Unsubscribe: {{unsubscribe_url}}
```

---

## 4. Approval Request Email

**Trigger:** Deliverable awaiting client approval  
**Priority:** High (sent immediately)  
**Template ID:** `approval-request-v1`

### Subject Line
```
[Motionify] Deliverable awaiting your approval - {{project_name}}
```

### Plain Text Version
```
Hi {{user_first_name}},

A deliverable is ready for your approval in the {{project_name}} project.

Deliverable: {{deliverable_name}}
Submitted by: {{actor_name}}

Please review the work and approve or request revisions.

View Deliverable: {{action_url}}

---

Motionify PM Portal
© 2025 Motionify Studio. All rights reserved.

Unsubscribe: {{unsubscribe_url}}
```

---

## 5. Revision Requested Email

**Trigger:** Client requests revision on deliverable  
**Priority:** High (sent immediately)  
**Template ID:** `revision-requested-v1`

### Subject Line
```
[Motionify] Revision requested - {{project_name}}
```

### Plain Text Version
```
Hi {{user_first_name}},

The client has requested a revision for the {{project_name}} project.

Deliverable: {{deliverable_name}}
Requested by: {{actor_name}}
Revisions Remaining: {{revisions_remaining}} of {{revisions_total}}

Feedback:
"{{revision_feedback}}"

View Deliverable: {{action_url}}

---

Motionify PM Portal
© 2025 Motionify Studio. All rights reserved.

Unsubscribe: {{unsubscribe_url}}
```

---

## 6. Team Member Added Email

**Trigger:** User added to project team  
**Priority:** Normal (batched within 2 minutes)  
**Template ID:** `team-member-added-v1`

### Subject Line
```
[Motionify] Welcome to {{project_name}}
```

### Plain Text Version
```
Hi {{user_first_name}},

You have been added to the {{project_name}} project.

Added by: {{actor_name}}
Your Role: {{user_role}}

Get started by viewing the project overview.

View Project: {{action_url}}

---

Motionify PM Portal
© 2025 Motionify Studio. All rights reserved.

Unsubscribe: {{unsubscribe_url}}
```

---

## 7. Notification Digest Email (Batched)

**Trigger:** Multiple notifications within batching window  
**Priority:** Normal (batched within 2-5 minutes)  
**Template ID:** `notification-digest-v1`

### Subject Line
```
[Motionify] You have {{notification_count}} new notification{{#if multiple}}s{{/if}}{{#if project_name}} - {{project_name}}{{/if}}
```

### Plain Text Version
```
Hi {{user_first_name}},

You have {{notification_count}} new notifications from your projects:

{{#each notifications}}
──────────────────────────────────────────
{{icon}} {{message}}
{{project_name}} • {{time_ago}}

View: {{action_url}}
{{/each}}

──────────────────────────────────────────

View All Notifications: {{view_all_url}}

---

Motionify PM Portal
© 2025 Motionify Studio. All rights reserved.

Update notification preferences: {{preferences_url}}
Unsubscribe: {{unsubscribe_url}}
```

### HTML Version (Batched)
```html
<!-- Similar structure to single notification email -->
<!-- Loop through notifications array -->
{{#each notifications}}
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-left: 4px solid #3b82f6; border-radius: 4px; margin-bottom: 16px;">
    <tr>
      <td style="padding: 16px;">
        <p style="margin: 0 0 8px; color: #111827; font-size: 16px; font-weight: 500;">
          {{icon}} {{message}}
        </p>
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
          {{project_name}} • {{time_ago}}
        </p>
        <p style="margin: 0;">
          <a href="{{action_url}}" style="color: #3b82f6; text-decoration: none; font-size: 14px;">
            {{action_label}} →
          </a>
        </p>
      </td>
    </tr>
  </table>
{{/each}}
```

### Handlebars Variables (Digest)
- `{{user_first_name}}`
- `{{notification_count}}` - Total notifications in digest
- `{{multiple}}` - Boolean for pluralization
- `{{project_name}}` - If all notifications from same project
- `{{notifications}}` - Array of notification objects
  - Each with: `icon`, `message`, `project_name`, `time_ago`, `action_url`, `action_label`
- `{{view_all_url}}` - Link to notification history page
- `{{preferences_url}}`
- `{{unsubscribe_url}}`

---

## Email Delivery Guidelines

### Batching Rules

1. **Immediate Send (No Batching)**
   - Approval requests
   - Revision requests
   - Comment mentions (@mentions)
   - First notification to user after 24+ hours of inactivity

2. **2-Minute Batching Window**
   - Task assignments
   - Team member additions/removals
   - Status change notifications

3. **5-Minute Batching Window**
   - File uploads
   - Comment replies (non-mentions)
   - General project updates

4. **Batching Logic**
   - Wait X minutes for additional notifications
   - Group by recipient and project (if applicable)
   - Max 10 notifications per digest email
   - If > 10: Send digest of 10, queue remaining for next batch

### Delivery Schedule

- Background job runs every 2 minutes
- Checks `notification_email_queue` for pending emails
- Groups by `user_id` and `scheduled_for`
- Sends via Amazon SES
- Updates status to `sent` or `failed`

### Retry Logic

- Failed emails retry up to 3 times
- Retry delays: 2 minutes, 10 minutes, 1 hour
- After 3 failures: Status → `abandoned`, admin alert sent

---

## Spam Prevention

### Best Practices

1. **Sender Reputation**
   - Use verified Amazon SES domain
   - Implement SPF, DKIM, DMARC records
   - Monitor bounce and complaint rates

2. **Content Quality**
   - Clear subject lines with project context
   - Personalized greetings
   - Relevant, concise content
   - Prominent unsubscribe link
   - Text + HTML versions

3. **Rate Limiting**
   - Max 50 emails per user per day
   - Max 10 emails per project per hour
   - Warn admins if limits approached

4. **User Control**
   - Easy unsubscribe process
   - Granular notification preferences
   - Email batching options (hourly, daily)
   - Temporary pause option

### Unsubscribe Flow

1. User clicks unsubscribe link: `{{unsubscribe_url}}`
2. Lands on preferences page (authenticated)
3. Can disable all email notifications or specific categories
4. Cannot unsubscribe from critical system emails (password reset, account changes)

---

## Testing Guidelines

### Manual Testing

1. **Trigger Events**
   - Assign task to yourself
   - @mention yourself in comment
   - Upload file to project you're on
   - Request approval as client

2. **Check Email**
   - Subject line correct
   - From address: `hello@motionify.studio`
   - Content renders correctly (HTML + plain text)
   - Links work and redirect to correct pages
   - Unsubscribe link functional

3. **Test Batching**
   - Trigger 3 events within 2 minutes
   - Verify single digest email received
   - Check all 3 notifications included

### Automated Testing

```javascript
// Example test for task assignment email
describe('Task Assignment Email', () => {
  it('should send email when user assigned to task', async () => {
    const user = await createTestUser();
    const task = await createTestTask();
    
    await assignTaskToUser(task.id, user.id);
    
    const email = await getLastEmailSent(user.email);
    
    expect(email.subject).toContain('You were assigned to a task');
    expect(email.body).toContain(task.title);
    expect(email.body).toContain(task.project.name);
    expect(email.to).toBe(user.email);
  });
  
  it('should respect user email preferences', async () => {
    const user = await createTestUser();
    await updateNotificationPreferences(user.id, {
      preferences: [
        { category: 'task_updates', emailEnabled: false }
      ]
    });
    
    const task = await createTestTask();
    await assignTaskToUser(task.id, user.id);
    
    const email = await getLastEmailSent(user.email);
    expect(email).toBeNull(); // No email sent
  });
});
```

### SES Sandbox Testing

During development, use Amazon SES Sandbox mode:
- Only send to verified email addresses
- Max 200 emails per 24 hours
- Test with team emails first
- Request production access before launch

---

## Email Metrics to Track

1. **Delivery Rate**: % of emails successfully delivered
2. **Bounce Rate**: % of emails bounced (< 5% acceptable)
3. **Complaint Rate**: % of emails marked as spam (< 0.1% acceptable)
4. **Open Rate**: % of emails opened (target: > 40%)
5. **Click-Through Rate**: % of users clicking links (target: > 25%)
6. **Unsubscribe Rate**: % of users unsubscribing (target: < 2%)

---

**Last Updated**: November 17, 2025
**Template Version**: 1.0
**Status**: Ready for Implementation
