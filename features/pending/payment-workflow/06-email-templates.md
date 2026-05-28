# Email Templates: Payment Workflow

## Email Service Configuration

- **Provider:** Mailtrap (Development) / Amazon SES (Production)
- **From Address:** `hello@motionify.studio`
- **From Name:** `Motionify Studio`
- **Reply-To:** `hello@motionify.studio`

## Template Variables

Common variables available in all templates:
- `{{clientName}}` - Client's full name
- `{{projectName}}` - Project name
- `{{projectId}}` - Project UUID
- `{{portalUrl}}` - Base portal URL
- `{{currentYear}}` - Current year for footer

---

## Client Email Templates

### 1. Advance Payment Request

**File:** `advance-payment-request.html`
**Trigger:** When super admin sets payment terms and triggers payment request
**To:** Customer email from inquiry/project
**Subject:** `Payment Request: Your {{projectName}} is Ready to Start`

```
Hi {{customerName}},

Great news! We're ready to begin work on your project.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROJECT DETAILS

Project: {{projectName}}
Total Project Cost: {{currencySymbol}}{{totalAmount}}
Advance Payment Required: {{currencySymbol}}{{advanceAmount}} ({{advancePercentage}}%)
Balance Due: {{currencySymbol}}{{balanceAmount}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT HAPPENS AFTER PAYMENT:

✓ Your project will be initiated immediately
✓ You'll receive portal access to track progress
✓ Our production team will begin work within 24 hours
✓ Beta delivery estimated in {{estimatedWeeks}} weeks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                    ┌────────────────────────┐
                    │  Pay {{currencySymbol}}{{advanceAmount}} Now      │
                    │  {{paymentLink}}        │
                    └────────────────────────┘

This secure payment link will take you to our payment gateway where
you can pay using UPI, Credit/Debit Card, Net Banking, or Wallet.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUESTIONS?

If you have any questions about this payment or the project, please
reply to this email or contact us at hello@motionify.studio.

We're excited to bring your vision to life!

Best regards,
The Motionify Studio Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio | Video Production for Modern Brands
https://motionify.studio
```

**Variables:**
- `{{customerName}}` - Customer's full name
- `{{projectName}}` - Project name
- `{{totalAmount}}` - Total project cost
- `{{advanceAmount}}` - Advance payment amount
- `{{advancePercentage}}` - Advance payment percentage (40, 50, 60, etc.)
- `{{balanceAmount}}` - Balance amount
- `{{currencySymbol}}` - Currency symbol (₹ or $)
- `{{paymentLink}}` - Razorpay payment link
- `{{estimatedWeeks}}` - Estimated project duration in weeks

---

### 2. Payment Request Reminder

**File:** `payment-request-reminder.html`
**Trigger:** If customer hasn't paid after X days (configurable, e.g., 3 days)
**To:** Customer email
**Subject:** `Reminder: Complete Payment to Start Your Project | {{projectName}}`

```
Hi {{customerName}},

Just a friendly reminder about your project with Motionify Studio.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROJECT: {{projectName}}
Advance Payment Due: {{currencySymbol}}{{advanceAmount}} ({{advancePercentage}}%)
Payment Request Sent: {{requestSentDate}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We're ready to start working on your project as soon as we receive
the advance payment. Complete your payment to get started:

                    ┌────────────────────────┐
                    │  Pay {{currencySymbol}}{{advanceAmount}} Now      │
                    │  {{paymentLink}}        │
                    └────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Need to discuss payment terms or have questions?
Reply to this email anytime - we're here to help!

Best regards,
The Motionify Studio Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio | Video Production for Modern Brands
https://motionify.studio
```

---

### 3. Advance Payment Confirmation

**File:** `payment-advance-confirmation.html`
**Trigger:** Advance payment completed successfully
**To:** Client lead + CC to Motionify Studio admin
**Subject:** `Payment Received - Production Starting Soon | {{projectName}}`

```
Hi {{clientName}},

Great news! We've received your advance payment for:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: {{projectName}}
Amount Paid: {{currencySymbol}}{{amount}}
Payment ID: {{paymentId}}
Date: {{paymentDate}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your invoice is attached to this email.

What Happens Next:

✓ Our production team has been notified
✓ Work will begin within 24 hours
✓ You'll receive regular updates as we progress
✓ Beta delivery estimated in Week {{estimatedWeek}}

Track your project progress anytime in the portal:

                    ┌────────────────────────┐
                    │  View Project Status   │
                    │  {{projectUrl}}        │
                    └────────────────────────┘

Questions? Just reply to this email or contact us at hello@motionify.studio

Best regards,
The Motionify Studio Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio | Video Production for Modern Brands
https://motionify.studio
```

**Attachments:** Invoice PDF

---

### 4. Balance Payment Confirmation

**File:** `payment-balance-confirmation.html`
**Trigger:** Balance payment completed successfully
**To:** Client lead + CC to Motionify Studio admin
**Subject:** `Final Payment Received - Deliverables Now Available | {{projectName}}`

```
Hi {{clientName}},

Excellent! Your final payment has been received.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: {{projectName}}
Amount Paid: {{currencySymbol}}{{amount}}
Payment ID: {{paymentId}}
Date: {{paymentDate}}

Total Project Cost: {{currencySymbol}}{{totalAmount}} ✓ Paid in Full

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your final invoice is attached to this email.

🎉 Your Final Deliverables Are Ready!

You now have full access to:
• High-resolution video files (4K + 1080p)
• Social media versions (all formats)
• Source files
• No watermarks

Access expires on: {{expiryDate}} (365 days from today)

                    ┌────────────────────────┐
                    │  Download Files Now    │
                    │  {{deliverableUrl}}    │
                    └────────────────────────┘

⚠️  Important: Please download and backup all files before {{expiryDate}}
After this date, files will be archived and no longer accessible.

We'd Love Your Feedback!

If you're happy with the final result, we'd appreciate a testimonial:

                    ┌────────────────────────┐
                    │  Leave a Review        │
                    │  {{reviewUrl}}         │
                    └────────────────────────┘

Thank you for choosing Motionify Studio!

Best regards,
The Motionify Studio Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio | Video Production for Modern Brands
https://motionify.studio
```

**Attachments:** Invoice PDF

---

### 5. Payment Failed

**File:** `payment-failed-retry.html`
**Trigger:** Payment attempt failed at gateway
**To:** Client lead
**Subject:** `Payment Could Not Be Completed | {{projectName}}`

```
Hi {{clientName}},

We encountered an issue processing your payment for {{projectName}}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Payment Type: {{paymentType}}
Amount: {{currencySymbol}}{{amount}}
Status: Failed
Reason: {{failureReason}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Common reasons for payment failure:
• Insufficient balance in account
• Incorrect payment details
• Bank security verification failed
• Transaction timeout

What to do next:

1. Check with your bank if there are any issues
2. Ensure sufficient balance is available
3. Try a different payment method
4. Retry the payment using the link below

                    ┌────────────────────────┐
                    │  Retry Payment         │
                    │  {{paymentUrl}}        │
                    └────────────────────────┘

Need help? Reply to this email or contact us at hello@motionify.studio

Best regards,
The Motionify Studio Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio | Video Production for Modern Brands
https://motionify.studio
```

---

### 6. Advance Payment Reminder (Day 3)

**File:** `payment-advance-reminder-day3.html`
**Trigger:** 3 days after terms accepted, no advance payment
**To:** Client lead
**Subject:** `Reminder: Complete Payment to Start Production | {{projectName}}`

```
Hi {{clientName}},

Just a friendly reminder about your project with Motionify Studio.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: {{projectName}}
Terms Accepted: {{termsAcceptedDate}}
Status: Awaiting Advance Payment

Amount Due: {{currencySymbol}}{{amount}} (50% advance)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We're excited to start working on your project!

To begin production, please complete the advance payment using the secure link below:

                    ┌────────────────────────┐
                    │  Pay {{currencySymbol}}{{amount}} Now      │
                    │  {{paymentUrl}}        │
                    └────────────────────────┘

Once payment is received:
✓ Production starts within 24 hours
✓ You'll receive regular updates
✓ Beta delivery in approximately {{estimatedWeeks}} weeks

Questions about payment or the project? Just reply to this email.

Best regards,
The Motionify Studio Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio | Video Production for Modern Brands
https://motionify.studio
```

---

### 7. Balance Payment Reminder (Day 3)

**File:** `payment-balance-reminder-day3.html`
**Trigger:** 3 days after final deliverable ready, no balance payment
**To:** Client lead
**Subject:** `Your Final Deliverable is Ready - Payment Required | {{projectName}}`

```
Hi {{clientName}},

Great news! Your final deliverable is ready for {{projectName}}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: {{projectName}}
Beta Approved: {{betaApprovalDate}}
Status: Final deliverable ready, awaiting payment

Amount Due: {{currencySymbol}}{{amount}} (50% balance)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To access your final high-resolution files (no watermark), please complete the balance payment:

                    ┌────────────────────────┐
                    │  Pay {{currencySymbol}}{{amount}} Now      │
                    │  {{paymentUrl}}        │
                    └────────────────────────┘

What you'll get after payment:
✓ 4K and 1080p video files
✓ Social media versions (all formats)
✓ Source files
✓ No watermarks
✓ 365-day access

Complete your payment today to download your final files!

Questions? Reply to this email.

Best regards,
The Motionify Studio Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio | Video Production for Modern Brands
https://motionify.studio
```

---

### 8. Invoice Ready

**File:** `invoice-ready.html`
**Trigger:** Admin uploads invoice manually after payment
**To:** Client lead
**Subject:** `Invoice for {{projectName}} - {{invoiceNumber}}`

```
Hi {{clientName}},

Your invoice for {{projectName}} is now ready.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Invoice Number: {{invoiceNumber}}
Payment Type: {{paymentType}}
Amount: {{currencySymbol}}{{amount}}
Payment Date: {{paymentDate}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your invoice is attached to this email as a PDF.

You can also access it anytime from your project dashboard:

                    ┌────────────────────────┐
                    │  View Project          │
                    │  {{projectUrl}}        │
                    └────────────────────────┘

For any questions regarding this invoice, please reply to this email.

Best regards,
The Motionify Studio Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio | Video Production for Modern Brands
https://motionify.studio
```

**Attachments:** Invoice PDF

---

### 9. Access Expiring Soon (7 Days Warning)

**File:** `access-expiring-soon.html`
**Trigger:** 7 days before deliverable access expires
**To:** Client lead
**Subject:** `⚠️  Your Files Expire in 7 Days - Download Now | {{projectName}}`

```
Hi {{clientName}},

Important reminder about your project deliverables.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: {{projectName}}
Expiry Date: {{expiryDate}}
Days Remaining: 7

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Your deliverable access will expire in 7 days!

After {{expiryDate}}, these files will no longer be available for download:

• final-video-4k.mp4 ({{file1Size}})
• final-video-1080p.mp4 ({{file2Size}})
• social-media-versions.zip ({{file3Size}})
• source-files.zip ({{file4Size}})

Total: {{totalSize}}

                    ┌────────────────────────┐
                    │  Download All Files    │
                    │  {{downloadUrl}}       │
                    └────────────────────────┘

⚡ Action Required: Download and backup all files before {{expiryDate}}

Need Extended Access?

If you need to extend access to your files, please contact us at hello@motionify.studio.
Additional charges may apply for extended storage.

Best regards,
The Motionify Studio Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio | Video Production for Modern Brands
https://motionify.studio
```

---

### 10. Access Expired

**File:** `access-expired.html`
**Trigger:** After 365 days from final delivery
**To:** Client lead
**Subject:** `Deliverable Access Expired | {{projectName}}`

```
Hi {{clientName}},

Your deliverable access has expired for:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: {{projectName}}
Delivery Date: {{deliveryDate}}
Expiry Date: {{expiryDate}} (365 days)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

As per our terms, deliverable access expires 365 days after final delivery.
Your files have been archived and are no longer accessible through the portal.

Need to Retrieve Your Files?

If you need access to these files, please contact us at hello@motionify.studio.
We may be able to restore access from our archives.

Note: File restoration may incur additional charges and is subject to availability.

Thank you for working with Motionify Studio!

Best regards,
The Motionify Studio Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio | Video Production for Modern Brands
https://motionify.studio
```

---

### 11. Refund Processed

**File:** `refund-processed.html`
**Trigger:** Admin marks payment as refunded
**To:** Client lead
**Subject:** `Refund Processed for {{projectName}}`

```
Hi {{clientName}},

We've processed a refund for your payment.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: {{projectName}}
Original Payment: {{currencySymbol}}{{originalAmount}}
Refund Amount: {{currencySymbol}}{{refundAmount}}
Date: {{refundDate}}

Reason: {{refundReason}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The refund has been initiated and should appear in your account within 5-10 business days,
depending on your payment method and bank.

Refund Details:
• Original Payment Method: {{paymentMethod}}
• Processing Time: 5-10 business days
• Transaction ID: {{transactionId}}

If you have any questions about this refund, please reply to this email or contact us at hello@motionify.studio.

Best regards,
The Motionify Studio Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio | Video Production for Modern Brands
https://motionify.studio
```

---

## Admin Email Templates

### 12. Admin: Payment Received Notification

**File:** `admin-payment-received.html`
**Trigger:** Any payment completed successfully
**To:** hello@motionify.studio (admin email)
**Subject:** `[PAYMENT] {{paymentType}} Received - {{projectName}} - {{currencySymbol}}{{amount}}`

```
Payment Received

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROJECT DETAILS
• Project: {{projectName}} ({{projectId}})
• Client: {{clientName}} ({{clientEmail}})

PAYMENT DETAILS
• Type: {{paymentType}}
• Amount: {{currencySymbol}}{{amount}}
• Currency: {{currency}}
• Method: {{paymentMethod}}
• Payment ID: {{paymentId}}
• Razorpay ID: {{razorpayPaymentId}}
• Date: {{paymentDate}}

PROJECT STATUS
• Payment Status: {{projectPaymentStatus}}
• Total Paid: {{currencySymbol}}{{totalPaid}} / {{currencySymbol}}{{totalAmount}}
• Remaining: {{currencySymbol}}{{remainingAmount}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT ACTIONS

{{#if isAdvancePayment}}
✓ Begin production within 24 hours
✓ Upload invoice for advance payment
{{/if}}

{{#if isBalancePayment}}
✓ Upload invoice for balance payment
✓ Ensure final deliverable is accessible
✓ Project is now fully paid!
{{/if}}

                    ┌────────────────────────┐
                    │  View in Admin Panel   │
                    │  {{adminUrl}}          │
                    └────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio Admin
https://portal.motionify.studio/admin
```

---

### 13. Admin: Payment Failed Notification

**File:** `admin-payment-failed.html`
**Trigger:** Payment attempt failed
**To:** hello@motionify.studio
**Subject:** `[ALERT] Payment Failed - {{projectName}} - {{currencySymbol}}{{amount}}`

```
⚠️  Payment Failed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROJECT DETAILS
• Project: {{projectName}} ({{projectId}})
• Client: {{clientName}} ({{clientEmail}})

PAYMENT DETAILS
• Type: {{paymentType}}
• Amount: {{currencySymbol}}{{amount}}
• Status: FAILED
• Failure Reason: {{failureReason}}
• Payment ID: {{paymentId}}
• Razorpay Order ID: {{razorpayOrderId}}
• Date: {{attemptDate}}

CLIENT NOTIFICATION
✓ Client has been notified via email
✓ Retry link provided to client

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACTION REQUIRED

Monitor for retry attempt or follow up with client if payment is not retried within 24 hours.

                    ┌────────────────────────┐
                    │  View in Admin Panel   │
                    │  {{adminUrl}}          │
                    └────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio Admin
https://portal.motionify.studio/admin
```

---

### 14. Admin: Invoice Upload Reminder

**File:** `admin-invoice-upload-reminder.html`
**Trigger:** 24 hours after payment, if invoice not uploaded
**To:** hello@motionify.studio
**Subject:** `[REMINDER] Upload Invoice - {{projectName}} - {{invoiceNumber}}`

```
Invoice Upload Pending

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROJECT DETAILS
• Project: {{projectName}} ({{projectId}})
• Client: {{clientName}} ({{clientEmail}})

PAYMENT DETAILS
• Type: {{paymentType}}
• Amount: {{currencySymbol}}{{amount}}
• Payment Date: {{paymentDate}}
• Suggested Invoice Number: {{invoiceNumber}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  ACTION REQUIRED

Payment was completed 24 hours ago but invoice has not been uploaded.
Please upload the invoice as soon as possible.

                    ┌────────────────────────┐
                    │  Upload Invoice Now    │
                    │  {{adminUploadUrl}}    │
                    └────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio Admin
https://portal.motionify.studio/admin
```

---

### 15. Admin: Overdue Payment Alert

**File:** `admin-overdue-payment-alert.html`
**Trigger:** Daily digest of overdue payments
**To:** hello@motionify.studio
**Subject:** `[DAILY] {{overdueCount}} Overdue Payments - Action Required`

```
Daily Overdue Payments Report

Generated: {{reportDate}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUMMARY
• Total Overdue: {{overdueCount}} payments
• Total Amount: {{currencySymbol}}{{totalOverdueAmount}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OVERDUE PAYMENTS

{{#each overduePayments}}
• {{projectName}}
  Client: {{clientEmail}}
  Type: {{paymentType}}
  Amount: {{currencySymbol}}{{amount}}
  Days Overdue: {{daysOverdue}}
  Last Reminder: {{lastReminderDate}}
  Action: {{#if shouldFollowUp}}Follow up manually{{else}}Automated reminder sent{{/if}}

{{/each}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                    ┌────────────────────────┐
                    │  View All Payments     │
                    │  {{adminPaymentsUrl}}  │
                    └────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio Admin
https://portal.motionify.studio/admin
```

---

## Email Design Guidelines

### Visual Design

- **Format**: Plain text for maximum deliverability
- **Width**: 75 characters per line max
- **Spacing**: Use line breaks and dividers (━) for visual separation
- **Buttons**: ASCII art boxes for CTA buttons with centered text

### Tone & Voice

- **Client Emails**: Friendly, professional, encouraging
- **Admin Emails**: Direct, informative, action-oriented
- **Consistency**: Use Motionify Studio brand voice throughout

### Accessibility

- **Subject Lines**: 45-60 characters for mobile visibility
- **Preview Text**: First 50 chars should summarize email purpose
- **Link Text**: Descriptive (not "click here")
- **Readability**: Short paragraphs, bullet points for scanning

### Variable Handling

All templates use Handlebars syntax:

```handlebars
{{variableName}}                    // Simple variable
{{#if condition}}...{{/if}}         // Conditional block
{{#each items}}...{{/each}}         // Loop through array
{{currencySymbol}}{{amount}}        // Currency formatting
```

### Currency Display

Always show currency symbol with amount:
- INR: `₹40,000.00`
- USD: `$500.00`

Format: `{{currencySymbol}}{{amount}}`

### Testing Checklist

Before deploying any template:

- [ ] Test all variable substitutions
- [ ] Verify all links work
- [ ] Check mobile rendering
- [ ] Test with missing optional variables
- [ ] Verify attachments (if any)
- [ ] Check spam score (use Mail Tester)
- [ ] Test in Gmail, Outlook, Apple Mail
- [ ] Verify unsubscribe link (if transactional allows)

### Development Setup

**Mailtrap Configuration:**
```javascript
{
  host: 'smtp.mailtrap.io',
  port: 2525,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS
  }
}
```

**Production SES:**
```javascript
{
  host: 'email-smtp.us-east-1.amazonaws.com',
  port: 587,
  auth: {
    user: process.env.AWS_SES_SMTP_USER,
    pass: process.env.AWS_SES_SMTP_PASS
  }
}
```

---

## Email Sending Best Practices

### Rate Limiting

- Max 10 emails per second per project
- Max 1000 emails per hour globally
- Implement exponential backoff for failures

### Retry Logic

- Retry failed sends up to 3 times
- Wait 1 min, 5 min, 15 min between retries
- Log all failures for manual review

### Bounce Handling

- Monitor bounce rates via SES
- Automatically suppress hard bounces
- Alert admin if bounce rate > 5%

### Tracking

- Track email opens (optional, privacy-conscious)
- Track link clicks for CTAs
- Monitor delivery rates
- Report metrics in admin dashboard

### Compliance

- Include physical address in footer
- Honor unsubscribe requests immediately
- Include email category in headers
- Store email logs for 30 days minimum

---

## Template File Structure

```
/email-templates
├── client
│   ├── advance-payment-request.html
│   ├── payment-request-reminder.html
│   ├── payment-advance-confirmation.html
│   ├── payment-balance-confirmation.html
│   ├── payment-failed-retry.html
│   ├── payment-advance-reminder-day3.html
│   ├── payment-balance-reminder-day3.html
│   ├── invoice-ready.html
│   ├── access-expiring-soon.html
│   ├── access-expired.html
│   └── refund-processed.html
└── admin
    ├── admin-payment-received.html
    ├── admin-payment-failed.html
    ├── admin-invoice-upload-reminder.html
    └── admin-overdue-payment-alert.html
```

---

## Internationalization (Future)

For future multi-language support:

- Store templates in `/locales/{lang}/emails/`
- Use i18n library for variable translation
- Default to English (en-US)
- Detect client language from user preferences

---

## A/B Testing

Consider testing variations of:
- Subject lines (urgency vs. informational)
- CTA button text
- Email length (brief vs. detailed)
- Reminder timing (Day 3 vs. Day 5)

Track conversion rates and adjust accordingly.
