# Email Templates: Feedback & Revisions System

This document specifies all email notifications for comments, revisions, and quota management.

## Email Service Configuration

- **Provider:** Amazon SES
- **From Address:** `hello@motionify.studio`
- **From Name:** `Motionify Studio`
- **Reply-To:** `hello@motionify.studio`

## Customer Email Templates

### 1. Task Comment Added

**Trigger:** Someone comments on a task
**To:** Task assignees, followers, @mentioned users
**Subject:** `💬 {{authorName}} commented on "{{taskName}}"`

```
Hi {{recipientName}},

{{authorName}} just left a comment on the task "{{taskName}}":

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{commentText}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: {{projectName}}
Task: {{taskName}}

                        ┌──────────────────┐
                        │  View Comment    │
                        └──────────────────┘
                  {{linkToTask}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Reply to this email or comment in the portal.

Best regards,
The Motionify Studio Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio | Video Production for Modern Brands
https://motionify.studio
```

---

### 2. File Comment Added

**Trigger:** Someone comments on a file
**To:** File uploader, @mentioned users
**Subject:** `💬 {{authorName}} commented on {{fileName}}`

```
Hi {{recipientName}},

{{authorName}} left feedback on {{fileName}}:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{#if timestamp}}
At {{timestamp}}:
{{/if}}

{{commentText}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: {{projectName}}
File: {{fileName}}

                        ┌──────────────────┐
                        │  View File       │
                        └──────────────────┘
                  {{linkToFile}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Reply to this email.

Best regards,
The Motionify Studio Team
```

---

### 3. Mention in Comment

**Trigger:** User is @mentioned in a comment
**To:** Mentioned user
**Subject:** `👋 {{authorName}} mentioned you in a comment`

```
Hi {{mentionedUserName}},

{{authorName}} mentioned you in a comment:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"{{commentText}}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Context:
• Project: {{projectName}}
• {{contextType}}: {{contextName}}

                        ┌──────────────────┐
                        │  View & Reply    │
                        └──────────────────┘
                  {{linkToContext}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Best regards,
The Motionify Studio Team
```

---

### 4. Revision Requested

**Trigger:** Client requests revision on deliverable
**To:** Motionify Studio team, project manager
**Subject:** `🔄 Revision Requested: {{deliverableName}} ({{projectName}})`

```
Hi Team,

{{clientName}} has requested a revision on {{deliverableName}}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 CLIENT FEEDBACK:

{{feedback}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 REVISION QUOTA:

• Revision Number: {{revisionNumber}}
• Remaining: {{quotaRemaining}} of {{quotaTotal}}
{{#if quotaWarning}}
⚠️  Only {{quotaRemaining}} revision remaining!
{{/if}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📎 Reference Files: {{referenceFileCount}}

                        ┌──────────────────┐
                        │  Start Working   │
                        └──────────────────┘
                  {{linkToProject}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The Motionify Studio Team
```

---

### 5. Revised Beta Ready

**Trigger:** Team re-uploads beta after revision
**To:** Client PRIMARY_CONTACT
**Subject:** `✅ Revised Beta Ready: {{deliverableName}}`

```
Hi {{clientName}},

Great news! We've completed the revisions you requested for {{deliverableName}}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 WHAT WE CHANGED:

Based on your feedback, we:

{{#each changes}}
• {{this}}
{{/each}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎬 REVIEW THE UPDATED VERSION:

The revised beta is now ready for your review (watermarked preview).

                        ┌──────────────────┐
                        │  Review Beta     │
                        └──────────────────┘
                  {{linkToDeliverable}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Revisions Remaining: {{quotaRemaining}} of {{quotaTotal}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions about the changes? Reply to this email!

Best regards,
The Motionify Studio Team
```

---

### 6. Revision Quota Warning

**Trigger:** 1 revision remaining
**To:** Client PRIMARY_CONTACT, Motionify Studio PM
**Subject:** `⚠️  Revision Quota Alert: 1 Remaining ({{projectName}})`

```
Hi {{clientName}},

Quick heads-up: You have 1 revision remaining for {{projectName}}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 USAGE SUMMARY:

• Total Revisions: {{quotaTotal}}
• Used: {{quotaUsed}}
• Remaining: 1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 TIP FOR YOUR LAST REVISION:

To make the most of your final revision, we recommend:

• Consolidate all feedback into one comprehensive request
• Review with your full team before submitting
• Be as specific as possible (timestamps, colors, sizes, etc.)
• Attach reference files to clarify requirements

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  NEED MORE REVISIONS?

If you exhaust your quota, you can request additional revisions which
will be reviewed by our team (usually approved within 2 hours).

                        ┌──────────────────┐
                        │  View Project    │
                        └──────────────────┘
                  {{linkToProject}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Best regards,
The Motionify Studio Team
```

---

## Admin Email Templates

### 7. Additional Revisions Requested

**Trigger:** Client requests additional revisions
**To:** Admin team
**Subject:** `📬 Additional Revision Request: {{projectName}}`

```
Hi Admin,

{{clientName}} has requested additional revisions for {{projectName}}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 REQUEST DETAILS:

• Requested: {{requestedCount}} additional revisions
• Current Quota: {{quotaUsed}}/{{quotaTotal}} used (exhausted)
• Client: {{clientName}} ({{clientEmail}})
• Project: {{projectName}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 CLIENT'S REASON:

{{reason}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 REVISION HISTORY:

{{#each revisionHistory}}
• Revision {{number}}: {{deliverableName}} ({{date}})
  Feedback: {{feedbackSnippet}}
{{/each}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ QUICK ACTIONS:

                ┌──────────────┐  ┌──────────────┐
                │  Approve     │  │  Decline     │
                └──────────────┘  └──────────────┘
           {{approveLink}}    {{declineLink}}

Or review in admin portal: {{adminLink}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Motionify Studio Admin System
```

---

### 8. Additional Revisions Approved (to Client)

**Trigger:** Admin approves additional revisions
**To:** Client PRIMARY_CONTACT
**Subject:** `✅ Additional Revisions Approved ({{projectName}})`

```
Hi {{clientName}},

Good news! We've approved your request for additional revisions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 UPDATED QUOTA:

• Previous: {{quotaBefore}} revisions
• Added: +{{approvedCount}} revisions
• New Total: {{quotaAfter}} revisions

You can now request revisions on your deliverables.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                        ┌──────────────────┐
                        │  View Project    │
                        └──────────────────┘
                  {{linkToProject}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Just reply to this email.

Best regards,
The Motionify Studio Team
```

---

### 9. Additional Revisions Declined (to Client)

**Trigger:** Admin declines additional revisions
**To:** Client PRIMARY_CONTACT
**Subject:** `Additional Revision Request Update ({{projectName}})`

```
Hi {{clientName}},

We've reviewed your request for additional revisions on {{projectName}}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After careful consideration, we're unable to approve additional revisions
at this time.

Here's why:

{{declineReason}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 NEXT STEPS:

We'd love to discuss this further. Please reply to this email or schedule
a call with your project manager to explore alternative solutions.

                        ┌──────────────────┐
                        │  Contact Us      │
                        └──────────────────┘
                {{contactLink}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We're committed to delivering exceptional results for your project.

Best regards,
The Motionify Studio Team
```

---

## Email Variables Reference

### Common Variables (all templates)
- `{{recipientName}}`: Recipient's first name
- `{{projectName}}`: Project name
- `{{projectId}}`: Project UUID
- `{{linkToProject}}`: URL to project

### Comment Variables
- `{{authorName}}`: Comment author
- `{{commentText}}`: Comment content
- `{{taskName}}`: Task name
- `{{fileName}}`: File name
- `{{timestamp}}`: Video/audio timestamp

### Revision Variables
- `{{deliverableName}}`: Deliverable name
- `{{feedback}}`: Client feedback
- `{{revisionNumber}}`: Sequential number
- `{{quotaTotal}}`: Total revisions
- `{{quotaUsed}}`: Used revisions
- `{{quotaRemaining}}`: Remaining revisions

### Additional Revision Variables
- `{{requestedCount}}`: Number requested
- `{{approvedCount}}`: Number approved
- `{{reason}}`: Client's reason
- `{{declineReason}}`: Admin's decline reason
