# Email Templates: Team Management

This document specifies all email notifications for Team Management (US-021, US-022).

## Email Service Configuration

- **Provider:** Amazon SES
- **From Address:** `hello@motionify.studio`
- **From Name:** `Motionify Studio`
- **Reply-To:** `hello@motionify.studio`
- **Format:** React Email templates (TSX components)

---

## Invitation Emails

### 1. Team Invitation

**Trigger:** Primary contact or PM sends invitation to join project
**To:** Invitee
**Subject:** `🎬 You've been invited to join {{projectName}} on Motionify Studio`
**Template File:** `team-invitation.tsx`

```
Hi there,

{{inviterName}} has invited you to collaborate on {{projectName}}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{#if personalMessage}}
Personal message from {{inviterName}}:

"{{personalMessage}}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{/if}}

About this project:
• Project: {{projectName}}
• Organization: {{organizationName}}
• Your role: {{roleDisplayName}}

As a team member, you'll be able to:
✓ View all project deliverables and files
✓ Upload files and provide feedback
✓ Receive project updates and notifications
✓ Collaborate with the team

                   ┌──────────────────┐
                   │  Accept Invitation │
                   └──────────────────┘
                   {{acceptanceUrl}}

This invitation expires in {{daysUntilExpiry}} days ({{expiryDate}}).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions about this invitation? Reply to this email.

Best regards,
The Motionify Studio Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio | Video Production for Modern Brands
https://motionify.studio
```

**Variables:**
- `{{inviterName}}` - Name of person who sent invitation
- `{{projectName}}` - Project title
- `{{organizationName}}` - Client organization name
- `{{personalMessage}}` - Optional custom message (omitted if empty)
- `{{roleDisplayName}}` - "Team Member" or "Project Manager"
- `{{acceptanceUrl}}` - Acceptance link with token
- `{{daysUntilExpiry}}` - Days until expiry (7)
- `{{expiryDate}}` - Formatted expiry date

---

### 2. Invitation Accepted (To Primary Contact)

**Trigger:** Invitee accepts invitation and joins project
**To:** Primary contact and project managers
**Subject:** `✅ {{memberName}} joined {{projectName}}`
**Template File:** `team-member-joined.tsx`

```
Hi {{recipientName}},

{{memberName}} has accepted your invitation and joined {{projectName}}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

New team member:
• Name: {{memberName}}
• Email: {{memberEmail}}
• Role: {{roleDisplayName}}
• Joined: {{joinedAt}}

They now have full access to project deliverables, files, and updates.

                   ┌──────────────────┐
                   │  View Team       │
                   └──────────────────┘
                   {{teamUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your project team now has {{totalMembers}} members.

Best regards,
The Motionify Studio Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio | Video Production for Modern Brands
https://motionify.studio
```

**Variables:**
- `{{recipientName}}` - Primary contact/PM name
- `{{memberName}}` - New member name
- `{{memberEmail}}` - New member email
- `{{roleDisplayName}}` - Role
- `{{joinedAt}}` - Timestamp
- `{{projectName}}` - Project title
- `{{teamUrl}}` - Team page link
- `{{totalMembers}}` - Total active members

---

### 3. Welcome Email (To New Member)

**Trigger:** User accepts invitation
**To:** New team member
**Subject:** `🎉 Welcome to {{projectName}}!`
**Template File:** `team-welcome.tsx`

```
Hi {{memberName}},

Welcome to {{projectName}}! You're now part of the team.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Here's what you can do now:

📁 Access Files - View and download project deliverables
📤 Upload Files - Share your files and feedback
💬 Collaborate - Comment on tasks and provide feedback
🔔 Stay Updated - Receive project notifications

                   ┌──────────────────┐
                   │  Go to Project   │
                   └──────────────────┘
                   {{projectUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project team:
{{#each teamMembers}}
• {{name}} - {{role}}
{{/each}}

Need help? Reply to this email.

Best regards,
The Motionify Studio Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio | Video Production for Modern Brands
https://motionify.studio
```

**Variables:**
- `{{memberName}}` - New member name
- `{{projectName}}` - Project title
- `{{projectUrl}}` - Project dashboard link
- `{{teamMembers}}` - Array of team members

---

## Removal Emails

### 4. Team Member Removed (To Removed Member)

**Trigger:** Member removed from project
**To:** Removed team member
**Subject:** `You've been removed from {{projectName}}`
**Template File:** `team-member-removed.tsx`

```
Hi {{memberName}},

You have been removed from {{projectName}} by {{removedByName}}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What this means:
• You no longer have access to project files
• You won't receive project notifications
• You can no longer upload files or comment

What's preserved:
• Your contributions ({{tasksCount}} tasks, {{commentsCount}} comments, {{filesCount}} files)
• Activity history remains visible to the team
• Your work is attributed to you

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you believe this was a mistake, contact {{primaryContactName}} at {{primaryContactEmail}}.

Best regards,
The Motionify Studio Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio | Video Production for Modern Brands
https://motionify.studio
```

**Variables:**
- `{{memberName}}`, `{{projectName}}`, `{{removedByName}}`
- `{{tasksCount}}`, `{{commentsCount}}`, `{{filesCount}}`
- `{{primaryContactName}}`, `{{primaryContactEmail}}`

---

### 5. Team Member Removed (To Primary Contact)

**Trigger:** Team member removed
**To:** Primary contact
**Subject:** `{{memberName}} has been removed from {{projectName}}`
**Template File:** `team-member-removed-admin.tsx`

```
Hi {{recipientName}},

{{memberName}} has been removed from {{projectName}}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Removal details:
• Member: {{memberName}} ({{memberEmail}})
• Removed by: {{removedByName}}
• Date: {{removedAt}}

Their contributions remain visible ({{tasksCount}} tasks, {{commentsCount}} comments, {{filesCount}} files).

                   ┌──────────────────┐
                   │  View Activity   │
                   └──────────────────┘
                   {{activityUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your project team now has {{totalMembers}} active members.

Best regards,
The Motionify Studio Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio | Video Production for Modern Brands
https://motionify.studio
```

---

## Reminder Emails

### 6. Invitation Expiring Soon

**Trigger:** 2 days before expiry
**To:** Inviter
**Subject:** `⏰ Invitation to {{inviteeEmail}} expires in 2 days`
**Template File:** `invitation-expiring-soon.tsx`

```
Hi {{inviterName}},

The invitation you sent to {{inviteeEmail}} for {{projectName}} expires in 2 days.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Invitation details:
• Sent to: {{inviteeEmail}}
• Sent on: {{sentAt}}
• Expires: {{expiresAt}}

                   ┌──────────────────┐
                   │  Resend Invitation│
                   └──────────────────┘
                   {{resendUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Best regards,
The Motionify Studio Team
```

---

### 7. Invitation Expired

**Trigger:** Invitation expires
**To:** Inviter
**Subject:** `Invitation to {{inviteeEmail}} has expired`
**Template File:** `invitation-expired.tsx`

```
Hi {{inviterName}},

The invitation to {{inviteeEmail}} for {{projectName}} has expired.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sent: {{sentAt}}
Expired: {{expiredAt}}

Want to invite them again?

                   ┌──────────────────┐
                   │  Send New Invitation│
                   └──────────────────┘
                   {{newInvitationUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Best regards,
The Motionify Studio Team
```

---

## Email Design Guidelines

### Branding
- Professional, friendly tone
- Consistent visual style
- Clear call-to-action buttons

### Accessibility
- WCAG 2.1 AA compliant
- Clear subject lines (45-60 characters)
- High contrast text

### Variables
- Handlebars syntax: `{{variable}}`
- Conditionals: `{{#if condition}}...{{/if}}`
- Loops: `{{#each items}}...{{/each}}`

### Testing
- Mailtrap for development
- Test all variables and links
- Check mobile rendering
