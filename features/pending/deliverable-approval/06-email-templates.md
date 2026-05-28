# Email Templates: Deliverables & Approval Workflow

## Customer Email Templates

### 1. Beta Ready for Review

**Trigger:** Admin uploads beta file
**To:** PRIMARY_CONTACT
**Subject:** `{{deliverableName}} is Ready for Your Review`

```
Hi {{clientName}},

Good news! Your deliverable is ready for review.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DELIVERABLE: {{deliverableName}}
PROJECT: {{projectName}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  DRAFT VERSION - This file contains a watermark for review purposes.

What's Next:

1. Download and review the beta file
2. Approve it to proceed to final delivery
3. OR request changes (you have {{revisionsRemaining}} revisions included)

                        ┌──────────────────┐
                        │  Review Now      │
                        └──────────────────┘
                {{portalUrl}}/project/{{projectId}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Reply to this email.

Best regards,
The Motionify Studio Team
```

---

### 2. Deliverable Approved - Payment Required

**Trigger:** Client approves deliverable
**To:** PRIMARY_CONTACT
**Subject:** `Payment Required for {{deliverableName}}`

```
Hi {{clientName}},

Thank you for approving {{deliverableName}}!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BALANCE PAYMENT: {{currencySymbol}}{{balanceAmount}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To receive your final files (without watermark, full resolution):

1. Complete the balance payment below
2. Final files will be available immediately after payment
3. Files will be accessible for 365 days

                        ┌──────────────────┐
                        │  Pay Now         │
                        └──────────────────┘
                    {{paymentLink}}

Payment Methods: UPI, Cards, Net Banking, Wallets

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Reply to this email.

Best regards,
The Motionify Studio Team
```

---

### 3. Final Delivery Ready

**Trigger:** Payment received
**To:** PRIMARY_CONTACT
**Subject:** `{{deliverableName}} - Final Files Ready!`

```
Hi {{clientName}},

Your final files are ready for download! 🎉

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DELIVERABLE: {{deliverableName}}
FILES: {{fileCount}} files ({{totalSize}})

EXPIRES: {{expiryDate}} (365 days from now)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                        ┌──────────────────┐
                        │  Download Files  │
                        └──────────────────┘
                {{portalUrl}}/project/{{projectId}}

⚠️  IMPORTANT: Files will be available for 365 days. Please download and backup before {{expiryDate}}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We'd love to hear your feedback! Reply to this email to share your experience.

Best regards,
The Motionify Studio Team
```

---

## Admin Email Templates

### 4. Deliverable Approved

**Trigger:** Client approves
**To:** Admin team
**Subject:** `[APPROVED] {{clientName}} - {{deliverableName}}`

```
Client approved deliverable!

PROJECT: {{projectName}}
CLIENT: {{clientName}}
DELIVERABLE: {{deliverableName}}

NEXT STEPS:
- Payment link sent to client ({{currencySymbol}}{{balanceAmount}})
- Upload final files after payment received
- Ensure files are ready within 24 hours of payment

View Project: {{adminPortalUrl}}/project/{{projectId}}
```

---

### 5. Deliverable Rejected - Revision Requested

**Trigger:** Client rejects
**To:** Admin team
**Subject:** `[REVISION] {{clientName}} - {{deliverableName}}`

```
Client requested changes!

PROJECT: {{projectName}}
CLIENT: {{clientName}}
DELIVERABLE: {{deliverableName}}

REVISIONS USED: {{usedRevisions}}/{{totalRevisions}}

CLIENT FEEDBACK:
"{{feedback}}"

NEXT STEPS:
- Review feedback
- Make requested changes
- Re-upload beta file
- Update client on timeline

View Project: {{adminPortalUrl}}/project/{{projectId}}
```
