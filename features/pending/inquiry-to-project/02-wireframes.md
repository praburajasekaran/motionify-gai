# ASCII Wireframes: Inquiry to Project

This document contains all user interface wireframes for the inquiry-to-project workflow.

## 📋 UI Standards & Conventions

**Routing:** All routes updated to use `portal.motionify.studio` subdomain pattern
**Parameters:** `:projectId`, `:taskId`, `:fileId`, `:deliverableId` (consistent naming)
**Status Badges:** Colors only (no icons), hover for full label tooltips
**Modal Close:** `[×]` for all modals (disabled for blocking modals)
**Buttons:** Right-aligned with `[Cancel] [Primary]` order
**Required Fields:** Use `(required)` text format (not `*`)
**Dropdowns:** `[Select... ▼]` format
**Loading States:** `[Spinner]` notation
**Notification Bell:** 🔔 appears in all authenticated screen headers (top right)

_Note: See WIREFRAME_CONFLICT_ANALYSIS.md for complete standardization details_

---

## Table of Contents

### Customer-Facing Screens
1. [Home Page Quiz Form - Step 1](#screen-1-home-page-quiz-form-step-15)
2. [Project Type Selection - Step 2](#screen-2-project-type-step-25)
3. [Project Details - Step 3](#screen-3-project-details-step-35)
4. [Additional Information - Step 4](#screen-4-additional-information-step-45)
5. [Review & Submit - Step 5](#screen-5-review--submit-step-55)
6. [Success Confirmation](#screen-6-success-confirmation)
10. [Proposal Review Page (Public)](#screen-10-proposal-review-page-public---no-login)
11. [Request Changes Modal](#screen-11-request-changes-modal)
12. [After Acceptance - Payment Redirect](#screen-12-after-acceptance---payment-redirect)
13. [Payment Confirmation](#screen-13-payment-confirmation--account-creation)
14. [Welcome Email](#screen-14-welcome-email-magic-link)
15. [First Login - Project Agreement](#screen-15-customer-first-login---project-agreement)
16. [Customer Portal Dashboard](#screen-16-customer-portal---project-dashboard)

### Admin Screens
7. [Admin Inquiry Dashboard](#screen-7-admin-inquiry-dashboard)
8. [Admin Inquiry Detail View](#screen-8-admin-inquiry-detail-view)
9. [Admin Create Proposal](#screen-9-admin-create-proposal)

---

## Customer-Facing Screens

### SCREEN 1: Home Page Quiz Form (Step 1/5)

**Purpose:** Capture initial contact information from potential customers
**Route:** `/` or `/start-project` (embedded in landing page)
**Authentication:** None required

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      MOTIONIFY - START YOUR PROJECT                      │
└─────────────────────────────────────────────────────────────────────────┘

Tell us about your video project
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1 of 5: Your Information
────────────────────────────────

┌─────────────────────────────────────────────────────────────────────────┐
│ Company Name *                                                            │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ [                                                                 ] │   │
│ └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Company Website (optional)                                                │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ [https://                                                         ] │   │
│ └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Your Name *                                                               │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ [                                                                 ] │   │
│ └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────┐  ┌────────────────────────────────────┐
│ Email Address *                │  │ Phone Number (optional)            │
│ ┌────────────────────────────┐ │  │ ┌────────────────────────────────┐ │
│ │ [                         ] │ │  │ │ [                             ] │ │
│ └────────────────────────────┘ │  │ └────────────────────────────────┘ │
└────────────────────────────────┘  └────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ How did you hear about us? (optional)                                     │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ [Select...                                            ▼]          │   │
│ └───────────────────────────────────────────────────────────────────┘   │
│ Options: Google Search, Social Media, Referral, LinkedIn, Other          │
└─────────────────────────────────────────────────────────────────────────┘

                        ┌──────────────────┐
                        │  Next: Project   │  [Lucide: ArrowRight]
                        └──────────────────┘

────────────────────────────────────────────────────────────────────────────
* Required fields
```

**Validation Rules:**
- Company Name: Required, max 255 characters
- Company Website: Optional, valid URL format
- Your Name: Required, max 255 characters
- Email: Required, valid email format
- Phone: Optional, phone number format
- How did you hear about us?: Optional dropdown selection

**Hidden Fields (Auto-captured from URL):**
- UTM parameters (utm_source, utm_medium, utm_campaign, utm_term, utm_content) are automatically captured from the page URL query string and submitted with the form

**User Actions:**
- Fill form fields
- Select referral source (optional)
- Click "Next: Project" → Navigate to Step 2

---

### SCREEN 2: Project Type (Step 2/5)

**Purpose:** Identify the type of video project
**Route:** Same page, step 2 of multi-step form
**Authentication:** None required

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Step 2 of 5: What type of video do you need?                             │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  ○  Brand Story Video                                                   │
│     Tell your company's story and values                                │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  ○  Product Demo / Explainer                                            │
│     Showcase how your product works                                     │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  ○  Social Media Content                                                │
│     Short-form videos for Instagram, TikTok, LinkedIn                   │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  ○  Event Coverage / Highlight Reel                                     │
│     Capture and edit your event                                         │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  ○  Other                                                                │
│     Tell us more about your project                                     │
└────────────────────────────────────────────────────────────────────────┘

  ┌────────┐                           ┌─────────┐
  │  Back  │                           │  Next   │
  └────────┘                           └─────────┘
```

**Validation Rules:**
- Must select one option
- If "Other" selected, show additional text field for description

**User Actions:**
- Select one project type (radio button)
- Click "Back" → Return to Step 1
- Click "Next" → Navigate to Step 3

---

### SCREEN 3: Project Details (Step 3/5)

**Purpose:** Gather detailed project requirements
**Route:** Same page, step 3 of multi-step form
**Authentication:** None required

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Step 3 of 5: Project Details                                             │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Describe your video project *                                            │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ [                                                                 ] │   │
│ │ [                                                                 ] │   │
│ │ [                                                                 ] │   │
│ │ [                                                                 ] │   │
│ └───────────────────────────────────────────────────────────────────┘   │
│ Tell us about your goals, audience, and key message                      │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────┐  ┌────────────────────────────────────┐
│ Estimated Budget               │  │ Desired Timeline                   │
│ ┌────────────────────────────┐ │  │ ┌────────────────────────────────┐ │
│ │ [  Select...            ▼] │ │  │ │ [  Select...                ▼] │ │
│ └────────────────────────────┘ │  │ └────────────────────────────────┘ │
│                                │  │                                    │
│ • Less than $5,000             │  │ • Urgent (1-2 weeks)               │
│ • $5,000 - $10,000             │  │ • Standard (1-2 months)            │
│ • $10,000 - $25,000            │  │ • Flexible (3+ months)             │
│ • $25,000+                     │  │ • Not sure yet                     │
│ • Not sure yet                 │  │                                    │
└────────────────────────────────┘  └────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Desired Video Length                                                     │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ [  Select...                                                   ▼] │   │
│ └───────────────────────────────────────────────────────────────────┘   │
│ • 30 seconds  • 1 minute  • 2-3 minutes  • 5+ minutes  • Not sure       │
└─────────────────────────────────────────────────────────────────────────┘

  ┌────────┐                           ┌─────────┐
  │  Back  │                           │  Next   │
  └────────┘                           └─────────┘
```

**Validation Rules:**
- Project description: Required, max 2000 characters
- Budget: Optional dropdown
- Timeline: Optional dropdown
- Video length: Optional dropdown

**User Actions:**
- Fill textarea and select dropdowns
- Click "Back" → Return to Step 2
- Click "Next" → Navigate to Step 4

---

### SCREEN 4: Additional Information (Step 4/5)

**Purpose:** Capture specific requirements and references
**Route:** Same page, step 4 of multi-step form
**Authentication:** None required

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Step 4 of 5: Additional Information                                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Target Audience (optional)                                               │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ [                                                                 ] │   │
│ └───────────────────────────────────────────────────────────────────┘   │
│ Who will watch this video?                                               │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Specific Requirements or Features                                        │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ [                                                                 ] │   │
│ │ [                                                                 ] │   │
│ │ [                                                                 ] │   │
│ └───────────────────────────────────────────────────────────────────┘   │
│ e.g., Animation style, voiceover, music preferences, branding guidelines │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Reference Videos or Links (optional)                                     │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ [  Paste URL                                              ]  [+]  │   │
│ └───────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│ 🔗 https://youtube.com/example1                              [×]         │
└─────────────────────────────────────────────────────────────────────────┘

  ┌────────┐                           ┌─────────┐
  │  Back  │                           │  Review │
  └────────┘                           └─────────┘
```

**Validation Rules:**
- All fields optional
- Reference links: Validate URL format
- Allow multiple reference links (array)

**User Actions:**
- Fill optional fields
- Add/remove reference links
- Click "Back" → Return to Step 3
- Click "Review" → Navigate to Step 5

---

### SCREEN 5: Review & Submit (Step 5/5)

**Purpose:** Review all entered information before submission
**Route:** Same page, step 5 of multi-step form
**Authentication:** None required

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Step 5 of 5: Review Your Information                                     │
└─────────────────────────────────────────────────────────────────────────┘

Contact Information
────────────────────────────────────────────────────────────────────────────
Company:        Acme Corporation
Contact:        John Smith
Email:          john@acme.com
Phone:          +1 (555) 123-4567                                    [Edit]

Project Details
────────────────────────────────────────────────────────────────────────────
Type:           Product Demo / Explainer
Budget:         $5,000 - $10,000
Timeline:       Standard (1-2 months)
Length:         2-3 minutes                                          [Edit]

Description:
"We need an explainer video showing how our SaaS platform helps teams
collaborate remotely..."

Target Audience: B2B SaaS customers, team leads
Requirements:    Modern animation, upbeat music, professional voiceover
Reference:       🔗 https://youtube.com/example1                      [Edit]

────────────────────────────────────────────────────────────────────────────

 ✓  I agree to be contacted by Motionify Studio regarding this inquiry

              ┌──────────────────────────────────────┐
              │  Submit Inquiry [Lucide: Send]       │
              └──────────────────────────────────────┘

  By submitting, you agree to our Privacy Policy and Terms of Service
```

**Validation Rules:**
- Must check consent checkbox to submit
- All previous validations apply

**User Actions:**
- Review all information
- Click "[Edit]" next to any section → Return to that step
- Check consent checkbox
- Click "Submit Inquiry" → Submit form to API

**API Call:**
```
POST /api/inquiries
{
  "companyName": "Acme Corporation",
  "contactName": "John Smith",
  "contactEmail": "john@acme.com",
  "contactPhone": "+1 (555) 123-4567",
  "projectType": "Product Demo / Explainer",
  "projectDescription": "We need an explainer video...",
  "estimatedBudget": "$5,000 - $10,000",
  "desiredTimeline": "Standard (1-2 months)",
  "videoLength": "2-3 minutes",
  "targetAudience": "B2B SaaS customers, team leads",
  "specificRequirements": "Modern animation, upbeat music...",
  "referenceLinks": ["https://youtube.com/example1"]
}
```

---

### SCREEN 6: Success Confirmation

**Purpose:** Confirm inquiry submission and set expectations
**Route:** `/inquiry/success` or modal overlay
**Authentication:** None required

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                     ✓  Inquiry Submitted Successfully!                   │
│                                                                           │
│            Thank you for your interest in Motionify Studio!                     │
│                                                                           │
│   Our team will review your project details and get back to you within  │
│                           1-2 business days.                             │
│                                                                           │
│                    Inquiry Number: INQ-2025-042                          │
│                                                                           │
│   We've sent a confirmation email to john@acme.com with your inquiry     │
│                              details.                                    │
│                                                                           │
│                 ┌──────────────────────────────┐                         │
│                 │  Return to Home               │                         │
│                 └──────────────────────────────┘                         │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

**User Actions:**
- Click "Return to Home" → Navigate to landing page
- Close window/tab

**System Actions:**
- Create inquiry record in database
- Generate inquiry number (INQ-YYYY-NNN)
- Send confirmation email to customer
- Send alert email to admin
- Set inquiry status to 'new'

---

### SCREEN 10: Proposal Review Page (Public - No Login)

**Purpose:** Allow customer to review proposal without portal access
**Route:** `/proposal/review/{reviewToken}`
**Authentication:** Token-based (no login required)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            [MOTIONIFY LOGO]                              │
└─────────────────────────────────────────────────────────────────────────┘

Project Proposal for Acme Corporation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Proposal #PROP-2025-042-v1                           Sent: Jan 11, 2025

Hi John,

Thank you for your interest in working with Motionify Studio! We're excited about
your product explainer video project. Below is our detailed proposal.

INVESTMENT
────────────────────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────────────────┐
│ Concept & Script Development                                  $1,500.00 │
│ Storyboarding                                                 $1,000.00 │
│ Animation & Motion Graphics                                   $4,500.00 │
│ Professional Voiceover                                          $500.00 │
│ Sound Design & Music                                            $500.00 │
│                                                              ──────────── │
│                                                   Total:      $8,000.00 │
└─────────────────────────────────────────────────────────────────────────┘

PROJECT SCOPE
────────────────────────────────────────────────────────────────────────────
We will create a 2-3 minute product explainer video showcasing your SaaS
collaboration platform. The video will include:

• Professional script development aligned with your key messaging
• Modern 2D animation with UI/UX demonstrations
• Professional voiceover talent
• Custom sound design and royalty-free music
• Up to 2 rounds of revisions

WHAT YOU'LL RECEIVE
────────────────────────────────────────────────────────────────────────────
✓ Script & Concept (Week 1)
  Approved script and creative concept document

✓ Storyboard (Week 2)
  Visual outline of the entire video sequence

✓ First Draft Animation (Week 4)
  Initial version with voiceover and music for your review

✓ Final Video (Week 6)
  Completed video in multiple formats (1080p, 4K, social media sizes)

PROJECT TIMELINE
────────────────────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────────────────┐
│ Week 1-2:  Pre-Production (Script & Storyboard)                         │
│ Week 3-4:  Animation Phase                                               │
│ Week 5-6:  Revisions & Final Delivery                                    │
│                                                                          │
│ Estimated Duration: 6-8 weeks                                            │
└─────────────────────────────────────────────────────────────────────────┘

REVISIONS
────────────────────────────────────────────────────────────────────────────
✓ 2 rounds of revisions included
• Additional revisions: $500 per round

NOT INCLUDED
────────────────────────────────────────────────────────────────────────────
✗ Live action filming or on-location shooting
✗ 3D animation or complex visual effects
✗ Multiple language versions
✗ Paid stock footage (client to provide or approve additional costs)

PAYMENT TERMS
────────────────────────────────────────────────────────────────────────────
50% deposit ($4,000) to begin work
50% balance ($4,000) upon final delivery

────────────────────────────────────────────────────────────────────────────

Do you accept this proposal?

┌────────────────────────────────────┐  ┌────────────────────────────────┐
│  ✓  Accept & Proceed to Payment    │  │  Request Changes               │
└────────────────────────────────────┘  └────────────────────────────────┘

Questions? Reply to this email or call us at +1 (555) 123-4567
```

**User Actions:**
- Review proposal details
- Click "Accept & Proceed to Payment" → Update proposal status, redirect to payment
- Click "Request Changes" → Open feedback modal

**System Actions on Page Load:**
- Validate review token
- Track "viewed" event (proposal.status = 'viewed')
- Notify admin that customer opened proposal

---

### SCREEN 11: Request Changes Modal

**Purpose:** Allow customer to request modifications to proposal
**Trigger:** Click "Request Changes" on proposal review page
**Authentication:** Token-based

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Request Changes to Proposal                                         [×] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ Let us know what you'd like to adjust:                                  │
│                                                                          │
│ What would you like us to change?                                       │
│ ┌───────────────────────────────────────────────────────────────────┐  │
│ │ [                                                                 ]  │
│ │ [                                                                 ]  │
│ │ [                                                                 ]  │
│ │ [                                                                 ]  │
│ │ [                                                                 ]  │
│ └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ Specific areas (optional):                                              │
│ ☐ Pricing / Budget                                                      │
│ ☐ Timeline / Deadline                                                   │
│ ☐ Scope / Deliverables                                                  │
│ ☐ Revisions Policy                                                      │
│ ☐ Other                                                                 │
│                                                                          │
│                        ┌──────────┐  ┌──────────────────┐              │
│                        │  Cancel  │  │  Submit Request  │              │
│                        └──────────┘  └──────────────────┘              │
└─────────────────────────────────────────────────────────────────────────┘
```

**Validation Rules:**
- Feedback text: Required, min 10 characters
- Specific areas: Optional checkboxes

**User Actions:**
- Fill feedback textarea
- Optionally check specific areas
- Click "Cancel" → Close modal
- Click "Submit Request" → Send feedback to API

**API Call:**
```
POST /api/proposals/{token}/feedback
{
  "feedback": "Could we reduce the timeline to 4 weeks?...",
  "specificChanges": {
    "timeline": true
  }
}
```

**System Actions:**
- Save feedback to proposal_feedback table
- Update proposal.status = 'revision_requested'
- Update inquiry.status = 'negotiating'
- Send email to admin with feedback
- Show confirmation message to customer

---

### SCREEN 12: After Acceptance - Payment Redirect

**Purpose:** Guide customer to payment after accepting proposal
**Route:** `/proposal/review/{token}/payment`
**Authentication:** Token-based

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            [MOTIONIFY LOGO]                              │
└─────────────────────────────────────────────────────────────────────────┘

✓ Proposal Accepted!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for accepting our proposal, John!

NEXT STEP: Complete Payment
────────────────────────────────────────────────────────────────────────────

To begin work on your project, please complete the initial deposit payment
of $4,000.

          ┌────────────────────────────────────────────────┐
          │  Proceed to Payment (Razorpay)  [Lucide: Lock]   │
          └────────────────────────────────────────────────┘

                Secure payment powered by Razorpay

Once payment is confirmed:
✓ Your project will be initiated immediately
✓ You'll receive portal access to track progress
✓ Our team will begin work on your script

────────────────────────────────────────────────────────────────────────────
Need help? Contact us at hello@motionify.studio
```

**User Actions:**
- Click "Proceed to Payment" → Redirect to Razorpay payment link

**System Actions:**
- Update proposal.status = 'accepted'
- Update inquiry.status = 'accepted'
- Record acceptance timestamp and customer email
- Send acceptance notification to admin

---

### SCREEN 13: Payment Confirmation & Account Creation

**Purpose:** Confirm payment and inform about portal access
**Route:** `/payment/success` (Razorpay redirect)
**Authentication:** None (public success page)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            [MOTIONIFY LOGO]                              │
└─────────────────────────────────────────────────────────────────────────┘

✓ Payment Successful!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for your payment, John!

Your project is now being set up...

WHAT HAPPENS NEXT:
────────────────────────────────────────────────────────────────────────────

✓ Payment received: $4,000.00
✓ Project created: #PROJ-2025-042
✓ Account created for you

You'll receive an email at john@acme.com with:

• Magic link to access your project portal
• Your project details and timeline
• Next steps and what to expect

────────────────────────────────────────────────────────────────────────────

              ✉️  Check your email for portal access!

              We've sent you a secure login link.

────────────────────────────────────────────────────────────────────────────

Questions? We're here to help: hello@motionify.studio
```

**System Actions (via webhook):**
- Verify payment from Razorpay
- Update inquiry.status = 'paid'
- Create user account
- Generate magic link
- Convert inquiry to project
- Send welcome email with magic link

---

### SCREEN 14: Welcome Email (Magic Link)

**Purpose:** Provide portal access to new customer
**Delivery:** Email sent after payment
**Authentication:** Magic link token

```
From: Motionify Studio <hello@motionify.studio>
To: john@acme.com
Subject: Welcome to Motionify Studio - Your Project Portal Access

────────────────────────────────────────────────────────────────────────────

Hi John,

Welcome to Motionify Studio! Your project is officially underway. 🎉

PROJECT DETAILS
────────────────────────────────────────────────────────────────────────────
Project Name:        Acme Product Explainer Video
Project Number:      PROJ-2025-042
Total Investment:    $8,000
Timeline:            6-8 weeks
Included Revisions:  2

PRIMARY CONTACT
────────────────────────────────────────────────────────────────────────────
You've been designated as the primary contact for this project. You can:
• Approve deliverables
• Request revisions
• Invite your team members
• Communicate with our team

ACCESS YOUR PROJECT PORTAL
────────────────────────────────────────────────────────────────────────────

           ┌────────────────────────────────────────┐
           │  Access Your Project Portal             │
           │  [Magic Link - Expires in 24 hours]    │
           └────────────────────────────────────────┘

Or copy this link: https://motionify.studio/login?token=abc123...

WHAT'S NEXT
────────────────────────────────────────────────────────────────────────────
1. Log into your portal to review project scope
2. Our team will start working on your script this week
3. You'll be notified when deliverables are ready for review

────────────────────────────────────────────────────────────────────────────

Questions? Reply to this email or contact your project manager directly
through the portal.

Best regards,
The Motionify Studio Team

────────────────────────────────────────────────────────────────────────────
```

**User Actions:**
- Click magic link button/URL → Authenticate and redirect to portal

---

### SCREEN 15: Customer First Login - Project Agreement

**Purpose:** Require customer to agree to project terms before portal access
**Route:** `portal.motionify.studio/onboarding` (redirect after magic link authentication)
**Authentication:** Required (magic link)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MOTIONIFY PORTAL        john@acme.com                            [Menu]│
└─────────────────────────────────────────────────────────────────────────┘

Welcome to Your Project!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before we begin, please review and agree to your project terms:

PROJECT: Acme Product Explainer Video
────────────────────────────────────────────────────────────────────────────

SCOPE OF WORK
We will create a 2-3 minute product explainer video including:
• Professional script development
• Modern 2D animation with UI/UX demonstrations
• Professional voiceover talent
• Custom sound design and royalty-free music
• Up to 2 rounds of revisions

DELIVERABLES
✓ Script & Concept (Week 1)
✓ Storyboard (Week 2)
✓ First Draft Animation (Week 4)
✓ Final Video (Week 6)

TIMELINE
Estimated Duration: 6-8 weeks
Start Date: Jan 15, 2025
Estimated Completion: March 1, 2025

REVISIONS
Included: 2 rounds
Additional revisions: $500 per round

PAYMENT
Total Investment: $8,000
Paid: $4,000 (50% deposit)
Balance Due: $4,000 (upon final delivery)

YOUR RESPONSIBILITIES
• Provide timely feedback on deliverables (within 3 business days)
• Approve script and storyboard before animation begins
• Provide brand assets (logos, colors, fonts) within 5 days
• Review and approve final deliverable

────────────────────────────────────────────────────────────────────────────

☐ I have reviewed and agree to the above project terms

              ┌─────────────────────────────────────┐
              │  Agree & Access Project              │
              └─────────────────────────────────────┘

────────────────────────────────────────────────────────────────────────────
```

**Validation Rules:**
- Must check agreement checkbox to proceed

**User Actions:**
- Review project terms
- Check agreement checkbox
- Click "Agree & Access Project" → Update user.hasAgreed, redirect to project dashboard

**API Call:**
```
PATCH /api/user/me
{
  "hasAgreed": true
}
```

---

### SCREEN 16: Customer Portal - Project Dashboard

**Purpose:** Main project view for customer after onboarding
**Route:** `portal.motionify.studio/projects/:projectId`
**Authentication:** Required
**Navigation:** ← Back to Projects → `portal.motionify.studio/projects`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MOTIONIFY    Dashboard  Files  Team               john@acme.com  [▼]  │
└─────────────────────────────────────────────────────────────────────────┘

Acme Product Explainer Video
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROJECT STATUS                        REVISIONS
In Progress - Week 1 of 6             Used: 0 / 2 available

┌────────────────────────────────┐  ┌────────────────────────────────────┐
│ YOUR PROJECT MANAGER           │  │ TIMELINE                           │
├────────────────────────────────┤  ├────────────────────────────────────┤
│ 👤 Sarah Johnson               │  │ Started:    Jan 15, 2025           │
│    sarah@motionify.studio         │  │ Est. End:   March 1, 2025          │
│                                │  │ Duration:   6-8 weeks              │
│ [Send Message]                 │  │                                    │
└────────────────────────────────┘  │ Current Phase: Script Development  │
                                    └────────────────────────────────────┘

DELIVERABLES
────────────────────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────────────────┐
│ 🔄 Script & Concept                                    In Progress  [>] │
│    Due: Week 1 (Jan 22, 2025)                                           │
│    Our team is developing your script and creative concept               │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ⏳ Storyboard                                          Pending      [>] │
│    Due: Week 2 (Jan 29, 2025)                                           │
│    Starts after script approval                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ⏳ First Draft Animation                               Pending      [>] │
│    Due: Week 4 (Feb 12, 2025)                                           │
│    Initial version with voiceover and music                             │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ⏳ Final Video                                         Pending      [>] │
│    Due: Week 6 (Feb 26, 2025)                                           │
│    Completed video in all formats                                       │
└─────────────────────────────────────────────────────────────────────────┘

RECENT ACTIVITY
────────────────────────────────────────────────────────────────────────────
• Jan 15, 2025 - Project initiated
• Jan 15, 2025 - You agreed to project terms
• Jan 15, 2025 - Sarah Johnson assigned as project manager
• Jan 15, 2025 - Script development started

NEXT STEPS
────────────────────────────────────────────────────────────────────────────
📋 Provide brand assets (logos, fonts, colors) - Due Jan 20
✉️ Check for script draft - Expected Jan 22
```

**User Actions:**
- View project status and timeline
- Click deliverable → View deliverable details
- Click "Send Message" → Open messaging interface
- Navigate to Files, Team tabs
- Click activity items for details

---

## Admin Screens

### SCREEN 7: Admin Inquiry Dashboard

**Purpose:** Central hub for managing all inquiries
**Route:** `portal.motionify.studio/admin/inquiries`
**Authentication:** Required (admin/project_manager role)
**Note:** Admin approval is implicit - creating a proposal = approving the inquiry

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MOTIONIFY ADMIN  │  Inquiries  Projects  Team  Settings    [Admin] [▼]│
└─────────────────────────────────────────────────────────────────────────┘

Inquiries Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 🔍 Search inquiries...                    ┌──────────────────┐
                                           │  + New Inquiry   │
Filters:                                   └──────────────────┘
[All Statuses ▼] [All Types ▼] [Sort: Newest ▼]

┌─────────────────────────────────────────────────────────────────────────┐
│ 🔴 NEW     INQ-2025-042      Acme Corporation                          │
│            John Smith • john@acme.com              2 hours ago          │
│            Product Demo • $5k-$10k • 2-3 min                           │
│            ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│            │  View       │  │  Assign      │  │  Create Proposal │    │
│            └─────────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 📋 PROPOSAL_SENT   INQ-2025-041   TechStart Inc.                       │
│                    Sarah Johnson • sarah@techstart.com  1 day ago       │
│                    Brand Story • $10k-$25k • 5+ min                     │
│            Proposal sent 6 hours ago (not yet viewed)                   │
│            ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│            │  View       │  │  Follow Up   │  │  Edit Proposal   │    │
│            └─────────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 💬 NEGOTIATING     INQ-2025-040   Global Media Co.                     │
│                    Mike Chen • mike@globalmedia.com  2 days ago         │
│                    Social Content • Not sure • 30 sec                   │
│            Customer requested changes 30 min ago - RESPOND              │
│            ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│            │  View       │  │  Respond     │  │  Revise Proposal │    │
│            └─────────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ✅ ACCEPTED        INQ-2025-039   Startup Ventures                     │
│                    Lisa Park • lisa@startupvc.com  3 days ago           │
│                    Event Coverage • $5k-$10k • 3-5 min                  │
│            Proposal accepted - Payment pending                          │
│            ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│            │  View       │  │  Check Pay   │  │  Convert to Proj │    │
│            └─────────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘

Summary:  3 New  •  5 Awaiting Response  •  2 Payment Pending
```

**Features:**
- Search by company name, contact name, email
- Filter by status, project type
- Sort by date, status, budget
- Quick actions for each inquiry
- Visual status indicators
- Summary metrics

**User Actions:**
- Search/filter inquiries
- Click "View" → Navigate to inquiry detail
- Click "Assign" → Assign inquiry to admin
- Click "Create Proposal" → Navigate to proposal builder
- Click "+ New Inquiry" → Manually create inquiry

---

### SCREEN 8: Admin Inquiry Detail View

**Purpose:** View complete inquiry details and manage
**Route:** `portal.motionify.studio/admin/inquiries/:inquiryId`
**Authentication:** Required (admin/project_manager role)
**Navigation:** ← Back to Inquiries → `portal.motionify.studio/admin/inquiries`

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back to Inquiries                              [Assign to me] [Status]│
└─────────────────────────────────────────────────────────────────────────┘

Inquiry INQ-2025-042
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────┐  ┌────────────────────────────────────┐
│ CONTACT INFORMATION            │  │ STATUS & MANAGEMENT                │
├────────────────────────────────┤  ├────────────────────────────────────┤
│ Company: Acme Corporation      │  │ Status:      🔴 NEW                │
│ Name:    John Smith            │  │ Created:     Jan 11, 2025 2:30 PM │
│ Email:   john@acme.com         │  │ Updated:     2 hours ago           │
│ Phone:   +1 (555) 123-4567     │  │ Assigned:    [Unassigned ▼]       │
│                                │  │                                    │
│ ┌──────────────────────────┐   │  │ ┌──────────────────────────────┐   │
│ │  Email Customer          │   │  │ │  Create Proposal             │   │
│ └──────────────────────────┘   │  │ └──────────────────────────────┘   │
└────────────────────────────────┘  └────────────────────────────────────┘

PROJECT DETAILS
────────────────────────────────────────────────────────────────────────────
Type:           Product Demo / Explainer
Budget:         $5,000 - $10,000
Timeline:       Standard (1-2 months)
Video Length:   2-3 minutes

Description:
"We need an explainer video showing how our SaaS platform helps teams
collaborate remotely. The video should be modern, professional, and include
animated UI demonstrations."

Target Audience:
"B2B SaaS customers, team leads and managers looking for collaboration tools"

Requirements:
"Modern animation style, upbeat background music, professional voiceover,
must match our brand colors (blue/white)"

Reference Links:
🔗 https://youtube.com/watch?v=example1
🔗 https://vimeo.com/example2

INTERNAL NOTES (Not visible to customer)
────────────────────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────────────────┐
│ [Write a note...]                                                        │
│                                                                          │
│                                                 [Save Note]              │
└─────────────────────────────────────────────────────────────────────────┘

No notes yet.

ACTIVITY HISTORY
────────────────────────────────────────────────────────────────────────────
• Jan 11, 2025 2:30 PM - Inquiry submitted
• Jan 11, 2025 2:30 PM - Confirmation email sent to customer
```

**User Actions:**
- Assign inquiry to admin
- Change inquiry status
- Add internal notes
- Click "Email Customer" → Open email composer
- Click "Create Proposal" → Navigate to proposal builder
- View activity history

---

### SCREEN 9: Admin Create Proposal

**Purpose:** Build detailed proposal for customer
**Route:** `portal.motionify.studio/admin/inquiries/:inquiryId/proposal/new`
**Authentication:** Required (admin/project_manager role)
**Navigation:** ← Back to Inquiry → `portal.motionify.studio/admin/inquiries/:inquiryId`

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back to Inquiry INQ-2025-042                   [Save Draft] [Preview] │
└─────────────────────────────────────────────────────────────────────────┘

Create Proposal for Acme Corporation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRICING
────────────────────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────────────────┐
│ Item Description                                 Quantity   Amount       │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────┐  ┌────┐  ┌─────────────┐  [×]        │
│ │ Concept & Script Development  │  │ 1  │  │  $1,500.00  │             │
│ └───────────────────────────────┘  └────┘  └─────────────┘             │
│                                                                          │
│ ┌───────────────────────────────┐  ┌────┐  ┌─────────────┐  [×]        │
│ │ Storyboarding                 │  │ 1  │  │  $1,000.00  │             │
│ └───────────────────────────────┘  └────┘  └─────────────┘             │
│                                                                          │
│ ┌───────────────────────────────┐  ┌────┐  ┌─────────────┐  [×]        │
│ │ Animation & Motion Graphics   │  │ 1  │  │  $4,500.00  │             │
│ └───────────────────────────────┘  └────┘  └─────────────┘             │
│                                                                          │
│ ┌───────────────────────────────┐  ┌────┐  ┌─────────────┐  [×]        │
│ │ Professional Voiceover        │  │ 1  │  │    $500.00  │             │
│ └───────────────────────────────┘  └────┘  └─────────────┘             │
│                                                                          │
│ ┌───────────────────────────────┐  ┌────┐  ┌─────────────┐  [×]        │
│ │ Sound Design & Music          │  │ 1  │  │    $500.00  │             │
│ └───────────────────────────────┘  └────┘  └─────────────┘             │
│                                                                          │
│ [+ Add Line Item]                                                        │
│                                                                          │
│                                            Subtotal:     $8,000.00       │
│                                            Tax (0%):         $0.00       │
│                                            Total:        $8,000.00       │
└─────────────────────────────────────────────────────────────────────────┘

PROJECT SCOPE
────────────────────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────────────────┐
│ [Rich text editor]                                                       │
│                                                                          │
│ We will create a 2-3 minute product explainer video showcasing your     │
│ SaaS collaboration platform. The video will include:                    │
│                                                                          │
│ • Professional script development aligned with your key messaging       │
│ • Modern 2D animation with UI/UX demonstrations                         │
│ • Professional voiceover talent                                         │
│ • Custom sound design and royalty-free music                            │
│ • Up to 2 rounds of revisions                                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

DELIVERABLES
────────────────────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────────────────┐
│ Deliverable Name                    Description              Est. Week   │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────┐  ┌─────────────────────┐  ┌────┐   [×]       │
│ │ Script & Concept      │  │ Approved script...  │  │ 1  │            │
│ └───────────────────────┘  └─────────────────────┘  └────┘            │
│                                                                          │
│ ┌───────────────────────┐  ┌─────────────────────┐  ┌────┐   [×]       │
│ │ Storyboard            │  │ Visual outline...   │  │ 2  │            │
│ └───────────────────────┘  └─────────────────────┘  └────┘            │
│                                                                          │
│ ┌───────────────────────┐  ┌─────────────────────┐  ┌────┐   [×]       │
│ │ First Draft Animation │  │ Initial version...  │  │ 4  │            │
│ └───────────────────────┘  └─────────────────────┘  └────┘            │
│                                                                          │
│ ┌───────────────────────┐  ┌─────────────────────┐  ┌────┐   [×]       │
│ │ Final Video           │  │ All formats...      │  │ 6  │            │
│ └───────────────────────┘  └─────────────────────┘  └────┘            │
│                                                                          │
│ [+ Add Deliverable]                                                      │
└─────────────────────────────────────────────────────────────────────────┘

MILESTONES
────────────────────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────────────────┐
│ Milestone                    Includes Deliverables         Est. Date    │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────┐  [✓] Script  [✓] Storyboard   ┌────────┐  [×]    │
│ │ Pre-Production   │  [ ] Draft   [ ] Final         │ Week 2 │         │
│ └──────────────────┘                                └────────┘         │
│                                                                          │
│ ┌──────────────────┐  [ ] Script  [ ] Storyboard   ┌────────┐  [×]    │
│ │ Animation Phase  │  [✓] Draft   [ ] Final         │ Week 4 │         │
│ └──────────────────┘                                └────────┘         │
│                                                                          │
│ ┌──────────────────┐  [ ] Script  [ ] Storyboard   ┌────────┐  [×]    │
│ │ Final Delivery   │  [ ] Draft   [✓] Final         │ Week 6 │         │
│ └──────────────────┘                                └────────┘         │
│                                                                          │
│ [+ Add Milestone]                                                        │
└─────────────────────────────────────────────────────────────────────────┘

REVISIONS & TIMELINE
────────────────────────────────────────────────────────────────────────────
┌──────────────────────────────┐  ┌────────────────────────────────────┐
│ Included Revisions           │  │ Estimated Duration                 │
│ ┌──────────────────────────┐ │  │ ┌────────────────────────────────┐ │
│ │ [2]                      │ │  │ │ 6-8 weeks                      │ │
│ └──────────────────────────┘ │  │ └────────────────────────────────┘ │
└──────────────────────────────┘  └────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Revision Policy                                                          │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ Two rounds of revisions are included. Additional revisions can be │   │
│ │ requested at $500 per round.                                      │   │
│ └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘

NOT INCLUDED
────────────────────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────────────────┐
│ • Live action filming or on-location shooting                           │
│ • 3D animation or complex visual effects                                │
│ • Multiple language versions                                            │
│ • Paid stock footage (client to provide or approve additional costs)    │
│                                                                          │
│ [Edit non-inclusions...]                                                │
└─────────────────────────────────────────────────────────────────────────┘

PAYMENT
────────────────────────────────────────────────────────────────────────────
┌──────────────────────────────────────────────────────────────────────────┐
│ Payment Terms                                                           │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ 50% advance payment, 50% on completion                            │  │
│ └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Payment Terms                                                            │
│ ○ Full payment upfront                                                   │
│ ● 50% deposit to begin, 50% upon final delivery                          │
│ ○ Custom payment schedule                                                │
└──────────────────────────────────────────────────────────────────────────┘

ADDITIONAL NOTES
────────────────────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────────────────┐
│ Optional message to customer...                                          │
│                                                                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐  ┌─────────────────────┐
                    │  Save Draft  │  │  Send to Customer   │
                    └──────────────┘  └─────────────────────┘
```

**Features:**
- Dynamic pricing calculator
- Rich text editor for scope
- Deliverable builder with week estimates
- Milestone creator linking deliverables
- Revision policy editor
- Payment link entry
- Draft saving
- Preview mode

**User Actions:**
- Add/remove pricing line items
- Write project scope
- Add deliverables with details
- Create milestones
- Set revision count and policy
- Add payment link
- Click "Save Draft" → Save without sending
- Click "Preview" → See customer view
- Click "Send to Customer" → Generate token, send email, update status

---

## Design Notes

### Responsive Behavior
- All screens should be responsive (mobile, tablet, desktop)
- Multi-step form should show progress indicator on all screen sizes
- Admin tables should be scrollable on mobile
- Proposal review page should be optimized for mobile viewing

### Accessibility
- All form fields must have labels
- Color not the only indicator of status
- Keyboard navigation support
- Screen reader compatibility
- Sufficient color contrast (WCAG AA)

### Loading States
- Show skeleton loaders while fetching data
- Disable buttons during API calls
- Show progress indicators for multi-step processes

### Error Handling
- Inline validation errors
- Toast notifications for system errors
- Graceful degradation for failed API calls
- Retry mechanisms for critical actions

### Branding
- Use Motionify Studio brand colors and fonts
- Consistent spacing and layout grid
- Lucide React icons throughout
- Professional, clean aesthetic matching Todoist/Linear style
