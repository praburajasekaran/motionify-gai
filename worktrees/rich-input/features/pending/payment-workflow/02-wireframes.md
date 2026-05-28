# ASCII Wireframes: Payment Workflow

## 📋 UI Standards & Conventions

**Routing:** All routes use `portal.motionify.studio` subdomain pattern  
**Parameters:** `:projectId`, `:paymentId`, `:deliverableId` (consistent naming)  
**Status Badges:** Colors only, hover for full label tooltips  
**Modal Close:** `[×]` for all modals  
**Buttons:** Right-aligned with `[Cancel] [Primary]` order  
**Terminology:** Use "Primary Contact" (not "Client Lead")  
**Loading States:** `[Spinner]` notation  
**Notification Bell:** 🔔 in all authenticated headers

_Note: See WIREFRAME_CONFLICT_ANALYSIS.md for complete standardization details_

---

## Client-Facing Screens

### SCREEN 1: Advance Payment Required (Initial State)

**Route:** `portal.motionify.studio/projects/:projectId/payment`
**Role:** Client Lead only
**Trigger:** After project terms accepted, before production starts

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 💳 Payment Required                                                      │
│ Project: Acme Corp Product Explainer                                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│   ⏸️  Production Awaiting Payment                                        │
│                                                                           │
│   To begin production, please complete the 50% advance payment.          │
│                                                                           │
│   ┌───────────────────────────────────────────────────────────────┐     │
│   │  Payment Summary                                               │     │
│   │                                                                 │     │
│   │  Project Total:              ₹80,000.00                       │     │
│   │  Advance Payment (50%):      ₹40,000.00                       │     │
│   │  Balance Payment (50%):      ₹40,000.00  (due after beta)    │     │
│   │                                                                 │     │
│   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │     │
│   │                                                                 │     │
│   │  Amount Due Now:             ₹40,000.00                       │     │
│   └───────────────────────────────────────────────────────────────┘     │
│                                                                           │
│   ✓ Your project terms have been accepted                                │
│   ✓ Production will begin within 24 hours of payment                     │
│   ✓ Invoice will be emailed after payment confirmation                   │
│                                                                           │
│   ┌─────────────────────────┐                                            │
│   │  Pay ₹40,000 via Razorpay │  🔒 Secure payment                      │
│   └─────────────────────────┘                                            │
│                                                                           │
│   Payment powered by Razorpay · PCI DSS Compliant                        │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### SCREEN 2: Payment Processing (Razorpay Gateway)

**Route:** External (Razorpay hosted page)
**Trigger:** Client clicks "Pay via Razorpay"

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Razorpay Logo]                                                   [X]    │
│ Motionify Studio - Advance Payment                                       │
└─────────────────────────────────────────────────────────────────────────┘

  Order #: ORD-2025-00123
  Amount: ₹40,000.00

  Payment Method:

  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
  │ UPI  │  │ Card │  │ Net  │  │Wallet│
  │ [✓]  │  │      │  │Banking│  │      │
  └──────┘  └──────┘  └──────┘  └──────┘

  Enter UPI ID:
  ┌───────────────────────────────────────┐
  │ user@paytm                             │
  └───────────────────────────────────────┘

  ┌───────────────────────────────────────┐
  │  Pay ₹40,000.00                       │
  └───────────────────────────────────────┘

  🔒 This is a secure 256-bit SSL encrypted payment

[External Razorpay interface - system redirects here]
```

---

### SCREEN 3: Payment Success Confirmation

**Route:** `portal.motionify.studio/projects/:projectId/payment/success`
**Trigger:** Razorpay redirects after successful payment

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ✅ Payment Successful                                                    │
│ Project: Acme Corp Product Explainer                                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                           ✅                                             │
│                  Payment Received!                                       │
│                                                                           │
│   Payment ID: pay_12345ABCDE67890                                       │
│   Amount Paid: ₹40,000.00                                               │
│   Date: January 14, 2025 at 2:45 PM                                     │
│                                                                           │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━      │
│                                                                           │
│   ✓ Payment confirmed                                                    │
│   ✓ Production team has been notified                                    │
│   ✓ Work will begin within 24 hours                                      │
│   ✓ Invoice will be emailed to hello@acmecorp.com                       │
│                                                                           │
│   Next Steps:                                                            │
│   • Track production progress in your dashboard                          │
│   • Receive beta delivery for review (estimated Week 6)                  │
│   • Final payment due after beta approval                                │
│                                                                           │
│   ┌─────────────────────┐   ┌──────────────────┐                       │
│   │  View Project        │   │  Download Receipt│                       │
│   └─────────────────────┘   └──────────────────┘                       │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### SCREEN 4: Project Dashboard (After Advance Paid)

**Route:** `portal.motionify.studio/projects/:projectId`
**State:** Production in progress

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Project: Acme Corp Product Explainer                      ACTIVE         │
│ Timeline: Week 3 of 8                                                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 💰 Payment Status                                                        │
│                                                                           │
│   ✅ Advance Payment: ₹40,000.00  (Paid on Jan 14, 2025)                │
│      └─ Invoice: INV-2025-00123.pdf  [Download]                         │
│                                                                           │
│   ⏳ Balance Payment: ₹40,000.00  (Due after beta approval)             │
│                                                                           │
│   Progress: ████████████░░░░░░░░░░░░ 50% paid                           │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 📦 Deliverables                                                          │
│                                                                           │
│   ⏳ Script & Concept                               Week 2  IN PROGRESS  │
│   ⏸️  Final Video                                   Week 6  NOT STARTED │
│   ⏸️  Social Media Versions                         Week 7  NOT STARTED │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### SCREEN 5: Balance Payment Required (After Beta Approval)

**Route:** `portal.motionify.studio/projects/:projectId/payment`
**Trigger:** Client approves beta deliverable

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 💳 Final Payment Required                                                │
│ Project: Acme Corp Product Explainer                                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│   ✅ Beta Deliverable Approved                                           │
│                                                                           │
│   You've approved the beta version. To access the final deliverable     │
│   (no watermark, full resolution), please complete the balance payment. │
│                                                                           │
│   ┌───────────────────────────────────────────────────────────────┐     │
│   │  Payment Summary                                               │     │
│   │                                                                 │     │
│   │  ✅ Advance Payment (50%):   ₹40,000.00  (Paid Jan 14)       │     │
│   │                                                                 │     │
│   │  Balance Payment (50%):      ₹40,000.00                       │     │
│   │                                                                 │     │
│   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │     │
│   │                                                                 │     │
│   │  Amount Due Now:             ₹40,000.00                       │     │
│   └───────────────────────────────────────────────────────────────┘     │
│                                                                           │
│   Final Deliverable Includes:                                            │
│   ✓ Full resolution video (4K + 1080p)                                   │
│   ✓ No watermark                                                         │
│   ✓ Social media versions (9:16, 1:1)                                    │
│   ✓ Source files                                                         │
│   ✓ 365-day access from delivery date                                    │
│                                                                           │
│   ┌─────────────────────────┐                                            │
│   │  Pay ₹40,000 via Razorpay │  🔒 Secure payment                      │
│   └─────────────────────────┘                                            │
│                                                                           │
│   Payment powered by Razorpay · PCI DSS Compliant                        │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### SCREEN 6: Final Deliverable Unlocked (After Balance Paid)

**Route:** `portal.motionify.studio/projects/:projectId/deliverables/:deliverableId`
**Trigger:** Balance payment webhook success

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ✅ Final Video                                      Week 6  COMPLETED    │
│    2-minute product explainer in multiple formats                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│   ✅ Payment Complete · Final Files Available                            │
│                                                                           │
│   ┌───────────────────────────────────────────────────────────────┐     │
│   │  💰 Payment Summary                                            │     │
│   │                                                                 │     │
│   │  ✅ Advance Payment:  ₹40,000.00  (Paid Jan 14, 2025)        │     │
│   │  ✅ Balance Payment:  ₹40,000.00  (Paid Feb 28, 2025)        │     │
│   │                                                                 │     │
│   │  Total Paid: ₹80,000.00                                       │     │
│   │                                                                 │     │
│   │  Invoice: INV-2025-00456.pdf  [Download]                      │     │
│   └───────────────────────────────────────────────────────────────┘     │
│                                                                           │
│   📦 Final Deliverable Package                                           │
│                                                                           │
│   Delivered: February 28, 2025 at 3:15 PM                               │
│   Access Expires: February 28, 2026 (365 days remaining)                │
│                                                                           │
│   Files Ready for Download:                                              │
│   ├─ 🎬 final-video-4k.mp4 (8.4 GB) - 4K resolution                    │
│   ├─ 🎬 final-video-1080p.mp4 (2.1 GB) - HD resolution                 │
│   ├─ 📱 social-9x16-instagram.mp4 (1.2 GB) - Vertical format           │
│   ├─ 📱 social-1x1-facebook.mp4 (987 MB) - Square format               │
│   └─ 📂 source-files.zip (342 MB) - Project files                      │
│                                                                           │
│   ┌────────────────────┐   ┌──────────────────┐                        │
│   │  Download All (ZIP) │   │  Download Receipt│                        │
│   └────────────────────┘   └──────────────────┘                        │
│                                                                           │
│   ⚠️  Files will expire on February 28, 2026                            │
│      Download and backup all files before this date                      │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### SCREEN 7: Payment Failed

**Route:** `portal.motionify.studio/projects/:projectId/payment/failed`
**Trigger:** Razorpay returns payment failure

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ❌ Payment Failed                                                        │
│ Project: Acme Corp Product Explainer                                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                           ❌                                             │
│                  Payment Not Completed                                   │
│                                                                           │
│   Transaction ID: txn_XXXXXXXXXX                                        │
│   Reason: Payment declined by bank                                       │
│   Date: January 14, 2025 at 2:45 PM                                     │
│                                                                           │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━      │
│                                                                           │
│   Common reasons for payment failure:                                    │
│   • Insufficient balance in account                                      │
│   • Incorrect payment details                                            │
│   • Bank security verification failed                                    │
│   • Transaction timeout                                                  │
│                                                                           │
│   What to do next:                                                       │
│   1. Check with your bank if there are any issues                        │
│   2. Ensure sufficient balance is available                              │
│   3. Try a different payment method                                      │
│                                                                           │
│   ┌─────────────────────┐   ┌──────────────────┐                       │
│   │  Retry Payment       │   │  Contact Support │                       │
│   └─────────────────────┘   └──────────────────┘                       │
│                                                                           │
│   Need help? Email: hello@motionify.studio                              │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### SCREEN 8: Access Expiry Warning (7 Days Before)

**Route:** `portal.motionify.studio/projects/:projectId/deliverables/:deliverableId`
**Trigger:** Automated notification 7 days before expiry

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⚠️  Files Expiring Soon                                                  │
│ Project: Acme Corp Product Explainer                                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│   ⚠️  Your deliverable access expires in 7 days                         │
│                                                                           │
│   Expiry Date: February 28, 2026                                        │
│   Days Remaining: 7                                                      │
│                                                                           │
│   After expiry, these files will no longer be available:                │
│   • final-video-4k.mp4 (8.4 GB)                                         │
│   • final-video-1080p.mp4 (2.1 GB)                                      │
│   • social-9x16-instagram.mp4 (1.2 GB)                                  │
│   • social-1x1-facebook.mp4 (987 MB)                                    │
│   • source-files.zip (342 MB)                                           │
│                                                                           │
│   ┌────────────────────────────────────────────────────────────┐       │
│   │  ⚡ Download All Files Now (12.8 GB total)                 │       │
│   └────────────────────────────────────────────────────────────┘       │
│                                                                           │
│   Need extended access? Contact: hello@motionify.studio                 │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### SCREEN 9: Access Expired

**Route:** `portal.motionify.studio/projects/:projectId/deliverables/:deliverableId`
**Trigger:** 365 days after final delivery

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🔒 Access Expired                                                        │
│ Project: Acme Corp Product Explainer                                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                           🔒                                             │
│                  Files No Longer Available                               │
│                                                                           │
│   This deliverable expired on: February 28, 2026                        │
│   Files have been archived and are no longer accessible.                │
│                                                                           │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━      │
│                                                                           │
│   Need to retrieve these files?                                          │
│   Contact Motionify Studio for restoration options.                     │
│                                                                           │
│   ✉️  hello@motionify.studio                                            │
│                                                                           │
│   Note: File restoration may incur additional charges.                   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Admin Screens

### SCREEN 10: Admin Payment Dashboard

**Route:** `portal.motionify.studio/admin/payments`
**Role:** Motionify Studio Admin only

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 💰 Payment Management                             🔍 Search  [Filter ▼] │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Overview                                                                  │
│                                                                           │
│   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐           │
│   │ ₹2,40,000      │  │ ₹80,000        │  │ ₹1,60,000      │           │
│   │ Total Received │  │ Pending        │  │ Expected (30d) │           │
│   └────────────────┘  └────────────────┘  └────────────────┘           │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Recent Payments                                                           │
├───────────────────┬─────────────┬──────────┬────────────┬──────────────┤
│ Project           │ Type        │ Amount   │ Status     │ Actions       │
├───────────────────┼─────────────┼──────────┼────────────┼──────────────┤
│ Acme Corp         │ BALANCE     │ ₹40,000 │ COMPLETED  │ 📄 Upload    │
│ Product Explainer │ 50%         │          │ 2h ago     │    Invoice   │
├───────────────────┼─────────────┼──────────┼────────────┼──────────────┤
│ TechStart         │ ADVANCE     │ ₹60,000 │ PENDING    │ 🔔 Remind    │
│ Pitch Deck        │ 50%         │          │ 3 days     │    Client    │
├───────────────────┼─────────────┼──────────┼────────────┼──────────────┤
│ FoodCo            │ BALANCE     │ ₹25,000 │ OVERDUE    │ ⚠️  Follow   │
│ Social Ads        │ 50%         │          │ 14 days    │    Up        │
├───────────────────┼─────────────┼──────────┼────────────┼──────────────┤
│ RetailBrand       │ ADVANCE     │ ₹75,000 │ COMPLETED  │ ✅ Invoice   │
│ Brand Video       │ 50%         │          │ Jan 10     │    Sent      │
└───────────────────┴─────────────┴──────────┴────────────┴──────────────┘

Filters: [All Projects ▼] [All Statuses ▼] [Last 30 days ▼]
```

---

### SCREEN 11: Admin Upload Invoice

**Route:** `portal.motionify.studio/admin/projects/:projectId/payments/:paymentId/invoice`
**Trigger:** Admin clicks "Upload Invoice"

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Upload Invoice                                                     [X]   │
└─────────────────────────────────────────────────────────────────────────┘

  Payment Details:
  Project: Acme Corp Product Explainer
  Type: Balance Payment (50%)
  Amount: ₹40,000.00
  Payment Date: February 28, 2025

  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
  │                                                                       │
  │   📄  Drag and drop invoice PDF here or click to browse            │
  │                                                                       │
  │       Max size: 10MB                                                  │
  │       Format: PDF only                                                │
  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘

  Invoice Number (optional):
  ┌───────────────────────────────────────┐
  │ INV-2025-00456                         │
  └───────────────────────────────────────┘

  ☑ Send email notification to client
  ☑ Store in project documents

                 ┌──────────┐  ┌────────────────┐
                 │  Cancel  │  │  Upload Invoice│
                 └──────────┘  └────────────────┘
```

---

### SCREEN 12: Admin Payment Transaction Details

**Route:** `portal.motionify.studio/admin/projects/:projectId/payments/:paymentId`
**View-only detail screen**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Payment Details: Acme Corp Product Explainer                      [X]   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Transaction Information                                                   │
│                                                                           │
│   Payment ID:         pay_12345ABCDE67890                               │
│   Order ID:           order_ABC123XYZ789                                │
│   Type:               Balance Payment (50%)                              │
│   Amount:             ₹40,000.00                                        │
│   Status:             ✅ COMPLETED                                       │
│   Payment Method:     UPI (Google Pay)                                   │
│                                                                           │
│   Initiated By:       John Doe (john@acmecorp.com)                      │
│   Initiated At:       Feb 28, 2025 at 3:10 PM                           │
│   Completed At:       Feb 28, 2025 at 3:15 PM                           │
│                                                                           │
│   Gateway Response:   Success                                            │
│   Gateway Ref:        RZP_123456789                                     │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Invoice                                                                   │
│                                                                           │
│   ✅ Invoice Uploaded                                                    │
│   File: INV-2025-00456.pdf                                              │
│   Uploaded: Feb 28, 2025 at 4:00 PM                                     │
│   Uploaded By: Admin User                                                │
│                                                                           │
│   ✅ Email sent to client: john@acmecorp.com                            │
│   Sent: Feb 28, 2025 at 4:01 PM                                         │
│                                                                           │
│   ┌──────────────────┐   ┌──────────────────┐                          │
│   │  View Invoice     │   │  Resend Email    │                          │
│   └──────────────────┘   └──────────────────┘                          │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Audit Log                                                                 │
│                                                                           │
│   Feb 28, 3:10 PM  │  Payment initiated by client                       │
│   Feb 28, 3:11 PM  │  Redirected to Razorpay                            │
│   Feb 28, 3:15 PM  │  Payment successful (UPI)                          │
│   Feb 28, 3:15 PM  │  Webhook received from Razorpay                    │
│   Feb 28, 3:15 PM  │  Project status updated: FULLY_PAID                │
│   Feb 28, 3:15 PM  │  Final deliverable unlocked                        │
│   Feb 28, 3:16 PM  │  Notification sent to client                       │
│   Feb 28, 3:16 PM  │  Notification sent to admin                        │
│   Feb 28, 4:00 PM  │  Invoice uploaded by admin                         │
│   Feb 28, 4:01 PM  │  Invoice email sent to client                      │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

                        ┌──────────────────┐
                        │  Close           │
                        └──────────────────┘
```

---

## Mobile Responsive Considerations

### Payment Button (Mobile)
```
┌─────────────────────────────┐
│ 💳 Payment Required         │
│                             │
│ Amount Due: ₹40,000.00     │
│                             │
│ ┌─────────────────────────┐ │
│ │ Pay via Razorpay 🔒     │ │
│ └─────────────────────────┘ │
│                             │
│ Secure · PCI Compliant      │
└─────────────────────────────┘
```

### Payment Success (Mobile)
```
┌─────────────────────────────┐
│      ✅                      │
│  Payment Successful!        │
│                             │
│ ₹40,000.00 Paid            │
│                             │
│ ✓ Invoice emailed          │
│ ✓ Production starting      │
│                             │
│ ┌─────────────────────┐    │
│ │ View Project         │    │
│ └─────────────────────┘    │
└─────────────────────────────┘
```
