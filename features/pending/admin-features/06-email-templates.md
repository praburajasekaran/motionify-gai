# Email Templates: Admin Features

This document specifies all email notifications for admin features.

## Email Service Configuration

- **Provider:** Amazon SES
- **From Address:** `hello@motionify.studio`
- **From Name:** `Motionify`
- **Reply-To:** `hello@motionify.studio`

## User Management Email Templates

### 1. Welcome Email - New User Invitation

**Trigger:** Admin creates new user account
**To:** New user
**Subject:** `Welcome to Motionify PM Portal`

```
Hi {{fullName}},

Welcome to the Motionify Project Management Portal! Your account has been
created and you're ready to start collaborating on video production projects.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your Account Details:

• Email: {{email}}
• Role: {{roleDisplay}}
• Created by: {{adminName}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To activate your account and log in, click the button below:

                    ┌──────────────────────────┐
                    │  Activate Your Account   │
                    └──────────────────────────┘
                    {{magicLinkUrl}}

This link will expire in 15 minutes for security reasons.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What You Can Do:

{{#if isProjectManager}}
• Manage your assigned projects
• Create and assign tasks to team members
• Upload and organize project files
• Track project progress and milestones
{{/if}}

{{#if isTeamMember}}
• View your assigned tasks
• Upload deliverables and files
• Comment on tasks and collaborate
• Track your work and deadlines
{{/if}}

{{#if isSuperAdmin}}
• Full platform access and control
• Manage users and permissions
• Update project statuses
• View comprehensive activity logs
• Export data for reporting
{{/if}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Need Help?

If you have any questions or need assistance getting started, reply to
this email or reach out to your project manager.

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

---

### 2. User Activated - Admin Notification

**Trigger:** New user clicks magic link and activates account
**To:** Admin who created the user
**Subject:** `[MOTIONIFY] {{fullName}} has activated their account`

```
Hi {{adminName}},

Good news! {{fullName}} has successfully activated their Motionify account
and is now ready to start working on projects.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User Details:

• Name: {{fullName}}
• Email: {{email}}
• Role: {{roleDisplay}}
• Activated: {{activatedAt}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next Steps:

{{#if isProjectManager}}
• Assign them to relevant projects
• Review their project access and permissions
{{/if}}

{{#if isTeamMember}}
• Add them to project teams
• Assign their first tasks
{{/if}}

                    ┌──────────────────────────┐
                    │  View User Profile       │
                    └──────────────────────────┘
                    {{userProfileUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

---

### 3. Account Deactivated - User Notification

**Trigger:** Admin deactivates user account
**To:** Deactivated user
**Subject:** `Your Motionify Portal access has been deactivated`

```
Hi {{fullName}},

Your access to the Motionify Project Management Portal has been deactivated.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Account Details:

• Email: {{email}}
• Deactivated: {{deactivatedAt}}
• Deactivated by: {{adminName}}

{{#if hasReason}}
Reason: {{deactivationReason}}
{{/if}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What This Means:

• You can no longer log in to the portal
• Your historical work remains preserved
• All tasks, comments, and files you created are still accessible to
  the team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions?

If you believe this was done in error or have questions, please contact
your administrator or reply to this email.

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

---

### 4. User Role Changed

**Trigger:** Admin updates user's role
**To:** User whose role changed
**Subject:** `Your role has been updated in Motionify Portal`

```
Hi {{fullName}},

Your role in the Motionify Project Management Portal has been updated.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Role Change:

• Previous Role: {{oldRoleDisplay}}
• New Role: {{newRoleDisplay}}
• Updated by: {{adminName}}
• Effective: Immediately

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your New Permissions:

{{#if isSuperAdmin}}
You now have full administrative access:
• Manage all users and permissions
• Update project statuses and archive projects
• View all activity logs across all projects
• Export data for reporting and compliance
{{/if}}

{{#if isProjectManager}}
You now have project management access:
• Manage your assigned projects
• Create and assign tasks to team members
• Upload and organize project files
• Track project progress and generate reports
{{/if}}

{{#if isTeamMember}}
You now have team member access:
• View and complete your assigned tasks
• Upload deliverables and collaborate on tasks
• Comment and communicate with the team
• Track your work and upcoming deadlines
{{/if}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                    ┌──────────────────────────┐
                    │  Log In to Portal        │
                    └──────────────────────────┘
                    {{portalUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions about your new role? Reply to this email and we'll be happy
to help.

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

---

### 5. Account Reactivated

**Trigger:** Admin reactivates previously deactivated user
**To:** Reactivated user
**Subject:** `Your Motionify Portal access has been reactivated`

```
Hi {{fullName}},

Welcome back! Your access to the Motionify Project Management Portal has
been reactivated.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Account Details:

• Email: {{email}}
• Role: {{roleDisplay}}
• Reactivated: {{reactivatedAt}}
• Reactivated by: {{adminName}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To log in to your account, click the button below:

                    ┌──────────────────────────┐
                    │  Log In to Portal        │
                    └──────────────────────────┘
                    {{magicLinkUrl}}

This link will expire in 15 minutes for security reasons.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All your historical work has been preserved:
• Your tasks and assignments
• Comments and communications
• Uploaded files and deliverables
• Project memberships

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Reply to this email or contact your project manager.

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

---

## Project Status Email Templates

### 6. Project Completed Notification

**Trigger:** Admin marks project as completed
**To:** All project team members (Motionify + Client)
**Subject:** `Project "{{projectName}}" marked as Completed`

```
Hi {{recipientName}},

Great news! The project "{{projectName}}" has been marked as Completed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project Details:

• Project: {{projectName}}
• Status: Completed ✓
• Completed: {{completedAt}}
• Changed by: {{adminName}}

{{#if hasReason}}
Note: {{statusChangeReason}}
{{/if}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project Summary:

• Total Tasks: {{totalTasks}} ({{completedTasks}} completed)
• Deliverables: {{totalDeliverables}} ({{approvedDeliverables}} approved)
• Duration: {{projectDuration}}
• Team Members: {{teamMemberCount}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                    ┌──────────────────────────┐
                    │  View Project            │
                    └──────────────────────────┘
                    {{projectUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The project remains accessible in read-only mode for reference and future
review.

{{#if isClient}}
Thank you for choosing Motionify! We hope you're thrilled with the final
results. We'd love to work with you again on future projects.
{{/if}}

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

---

### 7. Project Archived Notification

**Trigger:** Admin archives completed project
**To:** All project team members
**Subject:** `Project "{{projectName}}" has been archived`

```
Hi {{recipientName}},

The project "{{projectName}}" has been archived and moved to long-term
storage.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project Details:

• Project: {{projectName}}
• Status: Archived
• Archived: {{archivedAt}}
• Archived by: {{adminName}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What This Means:

• The project is hidden from the main project list
• All data remains accessible in read-only mode
• You can still view tasks, files, and communications
• The project cannot be modified or reopened

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To access archived projects, use the "View Archived Projects" toggle in
the project list.

                    ┌──────────────────────────┐
                    │  View Archived Projects  │
                    └──────────────────────────┘
                    {{archivedProjectsUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you need to work on this project again, please contact your project
manager to create a new project.

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

---

### 8. Activity Log Export Ready

**Trigger:** Large activity log export completes (async processing)
**To:** User who requested the export
**Subject:** `Your activity log export is ready`

```
Hi {{fullName}},

Your activity log export for project "{{projectName}}" is ready for
download.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Export Details:

• Project: {{projectName}}
• Date Range: {{dateFrom}} to {{dateTo}}
• Total Records: {{recordCount}}
• File Size: {{fileSize}}
• Format: {{format}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                    ┌──────────────────────────┐
                    │  Download Export File    │
                    └──────────────────────────┘
                    {{downloadUrl}}

⚠️  This download link will expire in 24 hours for security reasons.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

File Details:

Filename: {{filename}}
Contains: {{#each columns}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Reply to this email and we'll be happy to help.

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

---

## Email Design Guidelines

### Branding
- Plain text format for maximum deliverability
- Professional, friendly tone
- Clear call-to-action buttons (represented in ASCII)
- Consistent footer with brand information

### Accessibility
- Clear subject lines (45-60 characters)
- Descriptive link text
- Good contrast for readability
- No images required (all plain text)

### Variables

All templates support Handlebars syntax:
- `{{variableName}}` - Simple variable
- `{{#if condition}}...{{/if}}` - Conditional blocks
- `{{#each items}}...{{/each}}` - Loops
- `{{#unless condition}}...{{/unless}}` - Negative conditional

### Testing

- **Development:** Use Mailtrap for email testing
- **Staging:** Test with real @motionify.studio addresses
- **Production:** Monitor delivery rates and bounce rates

**Test Checklist:**
- [ ] All variables render correctly
- [ ] Conditional blocks display appropriately
- [ ] Links are clickable and valid
- [ ] Text wraps correctly at 72 characters
- [ ] No spelling or grammar errors
- [ ] Personalization works for all roles
- [ ] Magic links expire correctly
- [ ] Unsubscribe links work (if applicable)

### Spam Prevention

- Avoid excessive capitalization
- Limit use of words like "Free", "Click Now", etc.
- Include physical address in footer (if required)
- Provide unsubscribe option for marketing emails
- Authenticate with SPF, DKIM, and DMARC

### Performance Metrics

Track these metrics for each email template:

- **Delivery Rate:** Target > 99%
- **Open Rate:** Target > 40%
- **Click Rate:** Target > 15%
- **Bounce Rate:** Target < 1%
- **Spam Complaint Rate:** Target < 0.1%
