# Email Templates: Project Terms & Acceptance

This document specifies all email notifications for the Project Terms & Acceptance feature.

## Email Service Configuration

- **Provider:** Amazon SES
- **From Address:** `hello@motionify.studio`
- **From Name:** `Motionify`
- **Reply-To:** `hello@motionify.studio`
- **Character Limit:** 10,000 characters per email (plain text)

##Client Email Templates

### 1. Terms Accepted Confirmation (to Client)

**Trigger:** Client primary contact accepts project terms
**To:** Client primary contact
**CC:** None
**Subject:** `Project Terms Accepted - {{projectName}}`

```
Hi {{clientName}},

Thank you for accepting the project terms for "{{projectName}}"!

You now have full access to the project portal. Here's what you can do next:

• View project deliverables and timeline
• Track tasks and progress
• Upload and download files
• Communicate with the Motionify team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROJECT SUMMARY

Project: {{projectName}}
Total Revisions: {{totalRevisions}}
Final Deadline: {{finalDeadline}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                        ┌──────────────────┐
                        │  View Project    │
                        │  {{projectUrl}}  │
                        └──────────────────┘

If you have any questions, reply to this email or contact your project manager.

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

**Variables:**
- `{{clientName}}` - Client primary contact first name
- `{{projectName}}` - Project name
- `{{totalRevisions}}` - Number of included revisions
- `{{finalDeadline}}` - Project end date (formatted: "March 30, 2025")
- `{{projectUrl}}` - Link to project dashboard

---

### 2. Terms Updated - Re-acceptance Required (to Client)

**Trigger:** Admin updates project terms
**To:** Client primary contact
**CC:** None
**Subject:** `Action Required: Review Updated Project Terms - {{projectName}}`

```
Hi {{clientName}},

We've updated the project terms for "{{projectName}}" based on your feedback.

WHAT CHANGED:

{{changesSummary}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT STEPS:

To continue working on your project, please:

1. Review the updated terms (version {{newVersion}})
2. Accept the new terms to unlock project access

                        ┌──────────────────┐
                        │  Review Terms    │
                        │  {{termsUrl}}    │
                        └──────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you have additional concerns or questions about these changes, please reply to this email.

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

**Variables:**
- `{{clientName}}` - Client primary contact first name
- `{{projectName}}` - Project name
- `{{changesSummary}}` - Summary of what changed (from admin)
- `{{newVersion}}` - New version number
- `{{termsUrl}}` - Direct link to project (will show terms modal)

---

## Admin Email Templates

### 3. Client Accepted Terms (to Admin & PM)

**Trigger:** Client primary contact accepts project terms
**To:** Project admin and assigned project manager
**CC:** None
**Subject:** `[TERMS ACCEPTED] {{projectName}} - {{clientName}}`

```
[TERMS ACCEPTED]

Client: {{clientName}} ({{clientEmail}})
Project: {{projectName}}
Terms Version: {{termsVersion}}
Accepted At: {{acceptedAt}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AUDIT TRAIL

IP Address: {{ipAddress}}
User Agent: {{userAgent}}
Acceptance ID: {{acceptanceId}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT STEPS:

• Project is now unlocked for client access
• Client can view tasks, upload files, and communicate
• Proceed with project work according to timeline

                        ┌──────────────────┐
                        │  View Project    │
                        │  {{projectUrl}}  │
                        └──────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Portal
Automated notification - do not reply
```

**Variables:**
- `{{clientName}}` - Client primary contact full name
- `{{clientEmail}}` - Client email address
- `{{projectName}}` - Project name
- `{{termsVersion}}` - Which version was accepted
- `{{acceptedAt}}` - Formatted timestamp (e.g., "January 15, 2025 10:35 AM EST")
- `{{ipAddress}}` - Client IP address (for audit)
- `{{userAgent}}` - Client browser user agent (for audit)
- `{{acceptanceId}}` - UUID of acceptance record
- `{{projectUrl}}` - Link to project admin view

---

### 4. Client Requested Term Changes (to Admin)

**Trigger:** Client primary contact requests modifications to terms
**To:** Project admin
**CC:** Assigned project manager
**Subject:** `[CHANGE REQUEST] {{projectName}} - {{clientName}}`

```
[CHANGE REQUEST]

Client: {{clientName}} ({{clientEmail}})
Project: {{projectName}}
Terms Version: {{termsVersion}}
Requested At: {{requestedAt}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUESTED CHANGES:

{{requestedChanges}}

{{#if additionalContext}}
ADDITIONAL CONTEXT:

{{additionalContext}}
{{/if}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT STEPS:

1. Review the change request
2. Either:
   a) Update terms to address concerns, OR
   b) Respond with a message explaining why changes aren't feasible

                        ┌──────────────────┐
                        │  Manage Terms    │
                        │  {{adminUrl}}    │
                        └──────────────────┘

REMINDER: Project access is blocked until client accepts terms.
Expected response time: Within 24 hours.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Portal
Automated notification - do not reply
```

**Variables:**
- `{{clientName}}` - Client primary contact full name
- `{{clientEmail}}` - Client email address
- `{{projectName}}` - Project name
- `{{termsVersion}}` - Version they're requesting changes to
- `{{requestedAt}}` - Formatted timestamp
- `{{requestedChanges}}` - Required field from client
- `{{additionalContext}}` - Optional field from client (conditional)
- `{{adminUrl}}` - Link to admin terms editor

---

## Email Design Guidelines

### Branding
- Plain text format for maximum deliverability
- Professional, friendly tone
- Clear structure with ASCII art separators
- Consistent use of line breaks and spacing

### Accessibility
- Clear subject lines (45-60 characters)
- Front-load important information
- Use descriptive link text (not "click here")
- Good contrast for readability
- Keep paragraphs short (2-3 lines max)

### Variables Syntax

All templates support Handlebars syntax:
- `{{variableName}}` - Simple variable substitution
- `{{#if condition}}...{{/if}}` - Conditional sections
- `{{#each items}}...{{/each}}` - Loops (for lists)

### Testing

- **Development**: Use Mailtrap for all testing
  - SMTP Host: `smtp.mailtrap.io`
  - Port: 587 (or 2525)
  - Username: From Mailtrap account
  - Password: From Mailtrap account

- **Staging**: Use Amazon SES sandbox
  - Only sends to verified email addresses
  - Verify test email addresses in SES console

- **Production**: Amazon SES production mode
  - Full sending capabilities
  - Monitor bounce and complaint rates

### Testing Checklist

Before deploying email templates:

- [ ] Test all variable substitutions
- [ ] Test conditional sections (with and without data)
- [ ] Verify all links work and redirect correctly
- [ ] Check formatting in major email clients:
  - Gmail (web, iOS, Android)
  - Outlook (desktop, web)
  - Apple Mail (macOS, iOS)
- [ ] Verify plain text rendering (no HTML artifacts)
- [ ] Test subject lines don't get truncated (< 60 chars)
- [ ] Verify "from" name and address display correctly
- [ ] Check spam score using mail-tester.com
- [ ] Ensure unsubscribe compliance (if required by jurisdiction)

### Email Timing & Frequency

- **Immediate**: Terms accepted, terms updated, change request submitted
- **No batching**: All emails sent immediately upon trigger
- **No digests**: Each event triggers one email
- **Rate limiting**: Maximum 1 email per event type per project per hour (prevents duplicate sends)

### Spam Prevention

- **SPF Record**: Add Motionify domain to SES
- **DKIM**: Enable in SES for domain verification
- **DMARC**: Configure policy for domain
- **Content**: Avoid spam trigger words:
  - "Free", "Act now", "Limited time"
  - Excessive punctuation (!!!)
  - All caps subject lines
- **Reputation**: Monitor bounce and complaint rates
- **List Management**: Remove hard bounces immediately

### Internationalization (Future)

Not implemented in v1, but planned for v2:
- Support for multiple languages
- Timezone-aware timestamps
- Currency formatting based on project location
- Date formatting based on locale

---

## Email Delivery Monitoring

### Key Metrics to Track

1. **Delivery Rate**: % of emails successfully delivered (target: > 99%)
2. **Open Rate**: % of delivered emails opened (target: > 40%)
3. **Click Rate**: % of emails with link clicks (target: > 15%)
4. **Bounce Rate**: % of emails that bounced (target: < 1%)
5. **Complaint Rate**: % of emails marked as spam (target: < 0.1%)

### Alerts

Set up alerts for:
- Bounce rate > 2% (investigate sender reputation)
- Complaint rate > 0.5% (review content for spam triggers)
- Delivery failures > 5% (check SES configuration)

---

## Email Content Updates

To update email templates:

1. Edit template content in this markdown file
2. Update corresponding template in codebase (`netlify/functions/emails/`)
3. Test in development using Mailtrap
4. Review with stakeholder for copy approval
5. Deploy to staging and test with real SES sandbox
6. Deploy to production after QA approval
