# Email Templates: Inquiry to Project

This document specifies all email notifications for the inquiry-to-project workflow.

## Email Service Configuration

- **Provider:** Amazon SES
- **From Address:** `hello@motionify.studio` (verified sender)
- **From Name:** `Motionify`
- **Reply-To:** `hello@motionify.studio`
- **Development:** Mailtrap for testing

## Customer Email Templates

### 1. Inquiry Confirmation Email

**Trigger:** Immediately after inquiry submission
**To:** Customer email from inquiry
**Subject:** `Your Motionify Inquiry ({{inquiryNumber}})`

```
Hi {{contactName}},

Thank you for your interest in Motionify!

We've received your inquiry for a {{projectType}} project.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INQUIRY DETAILS
Inquiry Number: {{inquiryNumber}}
Company: {{companyName}}
Project Type: {{projectType}}
Submitted: {{createdAt}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT'S NEXT?

Our team will review your project details and get back to you within
1-2 business days with a detailed proposal.

If you have any questions in the meantime, feel free to reply to this
email or call us at +1 (555) 123-4567.

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

---

### 2. Proposal Sent Email

**Trigger:** When admin sends proposal
**To:** Customer email from inquiry
**Subject:** `Your Video Production Proposal ({{proposalNumber}})`

```
Hi {{contactName}},

Thank you for your patience! We're excited to share our proposal for
your {{projectType}} project.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROPOSAL OVERVIEW

Investment: {{formatCurrency totalPrice}}
Timeline: {{estimatedDuration}}
Revisions: {{includedRevisions}} rounds included

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REVIEW YOUR PROPOSAL

Click the button below to review the full proposal details:

[View Full Proposal] → {{reviewUrl}}

This link is secure and doesn't require a login.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUESTIONS?

If you have any questions about this proposal or would like to discuss
adjustments, simply reply to this email or use the "Request Changes"
option when reviewing the proposal.

We're here to help: hello@motionify.studio | +1 (555) 123-4567

Looking forward to working with you!

Best regards,
{{primaryContactName}} & The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

---

### 3. Revised Proposal Email

**Trigger:** When admin sends updated proposal after customer feedback
**To:** Customer email
**Subject:** `Updated Proposal - {{companyName}} ({{proposalNumber}} v{{version}})`

```
Hi {{contactName}},

Thanks for your feedback! We've updated our proposal based on your requests.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT'S CHANGED

{{changesSinceLastVersion}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

UPDATED PROPOSAL

Investment: {{formatCurrency totalPrice}}
Timeline: {{estimatedDuration}}
Revisions: {{includedRevisions}} rounds included

[View Updated Proposal] → {{reviewUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We hope these adjustments work better for your needs. If you'd like to
discuss further changes, just let us know!

Best regards,
{{primaryContactName}} & The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

---

### 4. Payment Reminder Email

**Trigger:** 3 days after proposal accepted (if payment not received)
**To:** Customer email
**Subject:** `Payment Pending - Let's Get Your Project Started!`

```
Hi {{contactName}},

You recently accepted our proposal for your {{projectType}} project,
and we're excited to get started!

We noticed the payment hasn't been completed yet. To begin work, please
complete the payment at your earliest convenience.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PAYMENT DETAILS

Amount Due: {{formatCurrency depositAmount}}
Proposal: {{proposalNumber}}

[Complete Payment] → {{paymentLink}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ONCE PAYMENT IS COMPLETE:

✓ Your project will be initiated immediately
✓ You'll receive portal access to track progress
✓ Our team will begin work on your project

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions about payment or need to adjust the terms?
Reply to this email or call us at +1 (555) 123-4567.

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

---

### 5. Payment Request Email

**Trigger:** When super admin sets payment terms and triggers payment request
**To:** Customer email
**Subject:** `Payment Request: Your {{projectName}} is Ready to Start`

**Note:** This template is shared with the Payment Workflow feature. See `features/payment-workflow/06-email-templates.md` for complete template specification.

---

### 6. Payment Confirmation Email

**Trigger:** After successful payment (webhook)
**To:** Customer email
**Subject:** `Payment Received - Your Project is Starting! 🎉`

```
Hi {{contactName}},

Great news! Your payment has been successfully processed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PAYMENT CONFIRMED

Amount Paid: {{formatCurrency paidAmount}}
Project: {{projectName}}
Project ID: {{projectNumber}}
Payment Date: {{paymentDate}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT'S NEXT?

Your project is now being set up in our system. Within the next few
minutes, you'll receive a separate email with secure access to your
project portal.

Through the portal, you'll be able to:
• Track project progress in real-time
• Review and approve deliverables
• Communicate with your project team
• Access all project files

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We're excited to bring your vision to life!

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

---

### 7. Welcome Email (Portal Access)

**Trigger:** After account creation (triggered by payment webhook success)
**To:** Customer email
**Subject:** `Welcome to Motionify - Your Project Portal Access`

**Note:** See wireframe Screen 14 for full content. Key elements:

- Magic link for portal access
- Project details summary
- Primary contact designation
- Next steps
- Contact information

---

### 8. Change Request Acknowledgment

**Trigger:** After customer submits proposal feedback
**To:** Customer email
**Subject:** `We received your feedback - {{proposalNumber}}`

```
Hi {{contactName}},

Thank you for reviewing our proposal and providing feedback.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR FEEDBACK

"{{feedbackText}}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Our team is reviewing your requests and will get back to you within
1 business day with either an updated proposal or clarifying questions.

We appreciate your input and want to make sure the proposal works
perfectly for your needs.

Questions in the meantime? Reply to this email anytime.

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

---

## Admin Email Templates

### 8. New Inquiry Alert

**Trigger:** Immediately after inquiry submission
**To:** Admin team (`team@motionify.studio` or configured address)
**Subject:** `[NEW INQUIRY] {{companyName}} - {{projectType}}`

```
New inquiry received!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INQUIRY: {{inquiryNumber}}
Status: NEW
Received: {{createdAt}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTACT INFO
Company: {{companyName}}
Name: {{contactName}}
Email: {{contactEmail}}
Phone: {{contactPhone}}

PROJECT DETAILS
Type: {{projectType}}
Budget: {{estimatedBudget}}
Timeline: {{desiredTimeline}}
Length: {{videoLength}}

Description:
{{projectDescription}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[View in Portal] → {{adminInquiryUrl}}
[Create Proposal] → {{adminProposalUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Admin | Inquiry Management System
```

---

### 9. Proposal Viewed Notification

**Trigger:** When customer first views proposal
**To:** Assigned admin or proposal creator
**Subject:** `[VIEWED] {{contactName}} viewed proposal {{proposalNumber}}`

```
📧 Proposal Activity

{{contactName}} from {{companyName}} just viewed the proposal!

Proposal: {{proposalNumber}}
Viewed at: {{viewedAt}}
Time since sent: {{timeSinceSent}}

[View Inquiry] → {{adminInquiryUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Consider following up if no response within 3-5 days.
```

---

### 10. Proposal Accepted Notification

**Trigger:** When customer accepts proposal
**To:** Assigned admin or proposal creator
**Subject:** `[ACCEPTED] {{companyName}} accepted proposal {{proposalNumber}} 🎉`

```
✅ Proposal Accepted!

{{contactName}} from {{companyName}} just accepted the proposal.

Proposal: {{proposalNumber}}
Amount: {{formatCurrency totalPrice}}
Accepted at: {{acceptedAt}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT STEPS:

1. Customer needs to complete payment
2. Monitor payment status in admin panel
3. Project will auto-convert after payment

[View Inquiry] → {{adminInquiryUrl}}
[Check Payment Status] → {{paymentStatusUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Admin | Inquiry Management System
```

---

### 11. Change Request Notification

**Trigger:** When customer requests proposal changes
**To:** Assigned admin or proposal creator
**Subject:** `[CHANGES REQUESTED] {{companyName}} - {{proposalNumber}}`

```
💬 Customer Feedback Received

{{contactName}} from {{companyName}} requested changes to the proposal.

Proposal: {{proposalNumber}}
Submitted: {{feedbackCreatedAt}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FEEDBACK:
"{{feedbackText}}"

SPECIFIC AREAS:
{{#if specificChanges.budget}}• Pricing / Budget{{/if}}
{{#if specificChanges.timeline}}• Timeline / Deadline{{/if}}
{{#if specificChanges.scope}}• Scope / Deliverables{{/if}}
{{#if specificChanges.revisions}}• Revisions Policy{{/if}}
{{#if specificChanges.other}}• Other{{/if}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACTION REQUIRED:

[View Feedback] → {{adminFeedbackUrl}}
[Respond] → {{adminRespondUrl}}
[Revise Proposal] → {{adminReviseUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Aim to respond within 1 business day to keep momentum.
```

---

### 12. Payment Received Notification

**Trigger:** After payment webhook confirms payment
**To:** Admin team
**Subject:** `[PAYMENT RECEIVED] {{companyName}} - {{formatCurrency paidAmount}}`

```
💰 Payment Confirmed!

Payment received for {{companyName}}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PAYMENT DETAILS
Amount: {{formatCurrency paidAmount}}
Inquiry: {{inquiryNumber}}
Proposal: {{proposalNumber}}
Customer: {{contactName}} ({{contactEmail}})
Paid at: {{paidAt}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROJECT STATUS:

✓ User account created: {{customerEmail}}
✓ Project created: {{projectNumber}}
✓ Welcome email sent with portal access
✓ Inquiry converted to project

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT STEPS:

• Assign project manager
• Begin script development
• Set up initial kickoff call

[View Project] → {{adminProjectUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Admin | Project Management System
```

---

### 13. Daily Inquiry Digest

**Trigger:** Daily at 9:00 AM (configurable)
**To:** Admin team
**Subject:** `Inquiry Digest - {{date}}`

```
Daily Inquiry Summary - {{date}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 OVERVIEW

{{newCount}} New Inquiries
{{awaitingResponseCount}} Awaiting Response
{{paymentPendingCount}} Payment Pending
{{convertedCount}} Converted to Projects (last 24h)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ NEEDS ATTENTION

{{#each needsAttention}}
• {{companyName}} - {{reason}}
  {{inquiryNumber}} | {{status}}
  [View] → {{adminUrl}}
{{/each}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 NEW INQUIRIES (Last 24h)

{{#each newInquiries}}
• {{companyName}} - {{projectType}}
  Budget: {{estimatedBudget}} | Timeline: {{desiredTimeline}}
  {{inquiryNumber}} | {{createdAt}}
  [View] → {{adminUrl}}
{{/each}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[View All Inquiries] → {{adminDashboardUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Admin | Inquiry Management System
```

---

## Email Design Guidelines

### Branding
- Use plain text format for better deliverability
- Include Motionify logo in header (HTML version)
- Consistent typography and spacing
- Professional, friendly tone

### Accessibility
- Clear subject lines (45-60 characters)
- Descriptive link text (not "click here")
- Good contrast for readability
- Works in dark mode

### Technical
- Responsive for mobile viewing
- Tested in major email clients
- SPF, DKIM, DMARC configured
- Unsubscribe link (admin emails only)

### Variables

All templates support Handlebars syntax for dynamic content:
- `{{variableName}}` - Simple variable
- `{{#if condition}}...{{/if}}` - Conditional
- `{{#each items}}...{{/each}}` - Loop
- `{{formatCurrency amount currency}}` - Currency helper function

### Currency Formatting Helper

The `formatCurrency` helper automatically formats amounts based on currency:

```javascript
// Usage in templates:
{{formatCurrency 800000 'INR'}}  // Output: ₹8,000.00
{{formatCurrency 800000 'USD'}}  // Output: $8,000.00

// With proposal object:
{{formatCurrency totalPrice currency}}  // Uses proposal's currency
```

**Implementation:**
```javascript
function formatCurrency(smallestUnit, currency = 'INR') {
  const CURRENCY_CONFIG = {
    INR: { symbol: '₹', multiplier: 100, locale: 'en-IN' },
    USD: { symbol: '$', multiplier: 100, locale: 'en-US' },
  };

  const config = CURRENCY_CONFIG[currency];
  const mainUnit = smallestUnit / config.multiplier;

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency,
  }).format(mainUnit);
}
```

**Important:**
- All amounts in database are stored in smallest unit (paise/cents)
- Template helper converts to display format automatically
- Currency symbol and formatting adapt based on currency code

### Testing

Use email preview tool before deployment:
- Litmus or Email on Acid for rendering tests
- Mailtrap for development testing
- Test all personalization variables
- Verify all links work correctly
