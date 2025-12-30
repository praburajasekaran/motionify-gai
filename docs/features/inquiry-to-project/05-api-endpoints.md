# API Endpoints: Inquiry to Project

This document specifies all REST API endpoints for the inquiry-to-project workflow.

## Base URL

```
Production: https://api.motionify.studio
Development: http://localhost:3000
```

## Authentication

- **Public endpoints**: No authentication required
- **Admin endpoints**: Require JWT token in `Authorization: Bearer <token>` header
- **Webhook endpoints**: Validate Razorpay signature header

## Table of Contents

1. [Public Endpoints](#public-endpoints)
2. [Admin Endpoints](#admin-endpoints)
3. [Webhook Endpoints](#webhook-endpoints)
4. [Error Responses](#error-responses)
5. [Rate Limiting](#rate-limiting)

---

## Public Endpoints

### 1. Submit Inquiry

Create a new inquiry from the website quiz/form.

```
POST /api/inquiries
```

**Authentication:** None

**Request Body:**
```json
{
  "companyName": "Acme Corporation",
  "companyWebsite": "https://acme.com",
  "contactName": "John Smith",
  "contactEmail": "john@acme.com",
  "contactPhone": "+1 (555) 123-4567",
  "referralSource": "Google Search",
  "projectType": "Product Demo / Explainer",
  "projectDescription": "We need an explainer video...",
  "estimatedBudget": "$5,000 - $10,000",
  "desiredTimeline": "Standard (1-2 months)",
  "videoLength": "2-3 minutes",
  "targetAudience": "B2B SaaS customers",
  "specificRequirements": "Modern animation, upbeat music",
  "referenceLinks": ["https://youtube.com/watch?v=example1"],

  "quizAnswers": {
    "niche": "Technology",
    "audience": "Young Adults 18-25",
    "style": "Modern & Minimalist",
    "mood": "Energetic & Upbeat",
    "duration": "30-60 seconds"
  },
  "projectNotes": "Additional project requirements and details not captured in quiz",
  "recommendedVideoType": "Tech Product Launch Video",

  "utmSource": "google",
  "utmMedium": "cpc",
  "utmCampaign": "winter-2025-saas",
  "utmTerm": "explainer-video-company",
  "utmContent": "text-ad-variant-a"
}
```

**Validation:**
- `companyName`: Required, 1-255 chars
- `companyWebsite`: Optional, valid URL format
- `contactName`: Required, 1-255 chars
- `contactEmail`: Required, valid email format
- `contactPhone`: Optional, valid phone format
- `referralSource`: Optional, 1-255 chars
- `projectType`: Required, one of enum values
- `projectDescription`: Required, 10-2000 chars
- `utmSource`, `utmMedium`, `utmCampaign`, `utmTerm`, `utmContent`: Optional, max 255 chars each (auto-captured from URL)
- All other fields: Optional

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "inquiry": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "inquiryNumber": "INQ-2025-042",
      "status": "new",
      "createdAt": "2025-01-11T14:30:00Z",
      "contactEmail": "john@acme.com"
    },
    "user": {
      "id": "770e8400-e29b-41d4-a716-446655440099",
      "email": "john@acme.com",
      "fullName": "John Smith",
      "role": "prospect",
      "isProspect": true,
      "isNewUser": true
    },
    "portalAccess": {
      "magicLinkSent": true,
      "portalUrl": "https://portal.motionify.studio"
    }
  },
  "message": "Inquiry submitted successfully. Check your email for portal access!"
}
```

**Side Effects:**
- Creates inquiry record with status 'new' (includes quiz answers and project notes)
- Generates unique inquiry number
- Checks if user exists by email
- If new user:
  - Creates user account with role 'prospect'
  - Generates magic link token
  - Sends welcome email with portal login link + inquiry confirmation
- If existing user:
  - Links inquiry to existing user account
  - Sends inquiry confirmation email (no new account created)
- Sends alert email to admin team
- Logs activity

**Error Responses:**
- `400 Bad Request`: Validation failed
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

### 2. View Proposal (Public)

Retrieve proposal details using the review token (no login required).

```
GET /api/proposals/:reviewToken
```

**Authentication:** None (token-based access)

**URL Parameters:**
- `reviewToken` (UUID): Unique token from email link

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "proposalNumber": "PROP-2025-042",
    "version": 1,
    "status": "sent",
    "createdAt": "2025-01-11T16:00:00Z",

    "companyName": "Acme Corporation",
    "contactName": "John Smith",

    "totalPrice": 800000,
    "currency": "USD",
    "pricingBreakdown": [
      {
        "id": "price-1",
        "description": "Concept & Script Development",
        "amount": 150000,
        "quantity": 1
      }
    ],

    "projectScope": "We will create a 2-3 minute product explainer video...",

    "deliverables": [
      {
        "id": "deliv-1",
        "name": "Script & Concept",
        "description": "Approved script and creative concept document",
        "estimatedCompletionWeek": 1
      }
    ],

    "nonInclusions": [
      "Live action filming or on-location shooting"
    ],

    "estimatedDuration": "6-8 weeks",

    "milestones": [
      {
        "id": "mile-1",
        "name": "Pre-Production",
        "description": "Script development and storyboarding",
        "deliverableIds": ["deliv-1", "deliv-2"],
        "estimatedDate": "Week 2",
        "order": 1
      }
    ],

    "includedRevisions": 2,
    "revisionPolicy": "Two rounds of revisions are included...",

    "paymentLink": "https://rzp.io/i/example-link",
    "paymentTerms": "50% deposit ($4,000) to begin work...",

    "primaryContactName": "Sarah Johnson",

    "expiresAt": null
  }
}
```

**Side Effects:**
- Tracks view event (first view only)
- Updates `viewedAt` timestamp
- Updates proposal status to 'viewed' if currently 'sent'
- Notifies admin that customer viewed proposal

**Error Responses:**
- `404 Not Found`: Invalid token or proposal not found
- `410 Gone`: Proposal has expired
- `500 Internal Server Error`: Server error

---

### 3. Accept Proposal

Customer accepts the proposal terms.

```
POST /api/proposals/:reviewToken/accept
```

**Authentication:** None (token-based access)

**URL Parameters:**
- `reviewToken` (UUID): Unique token from email link

**Request Body:**
```json
{
  "acceptedBy": "john@acme.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "proposalId": "660e8400-e29b-41d4-a716-446655440001",
    "status": "accepted",
    "acceptedAt": "2025-01-11T18:00:00Z",
    "paymentLink": "https://rzp.io/i/example-link",
    "nextSteps": "Please complete payment to begin your project."
  },
  "message": "Proposal accepted successfully!"
}
```

**Side Effects:**
- Updates proposal.status to 'accepted'
- Updates inquiry.status to 'accepted'
- Records acceptance timestamp and email
- Sends acceptance notification to admin
- Sends next steps email to customer

**Error Responses:**
- `404 Not Found`: Invalid token
- `409 Conflict`: Proposal already accepted/rejected
- `410 Gone`: Proposal expired
- `500 Internal Server Error`: Server error

---

### 4. Request Changes to Proposal

Customer requests modifications to the proposal.

```
POST /api/proposals/:reviewToken/feedback
```

**Authentication:** None (token-based access)

**URL Parameters:**
- `reviewToken` (UUID): Unique token from email link

**Request Body:**
```json
{
  "feedback": "Could we reduce the timeline to 4 weeks and add an additional revision round?",
  "specificChanges": {
    "budget": false,
    "timeline": true,
    "scope": false,
    "revisions": true,
    "other": false
  }
}
```

**Validation:**
- `feedback`: Required, min 10 chars
- `specificChanges`: Optional object with boolean flags

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "feedbackId": "770e8400-e29b-41d4-a716-446655440003",
    "status": "pending",
    "createdAt": "2025-01-11T17:00:00Z"
  },
  "message": "Your feedback has been sent to our team. We'll respond shortly."
}
```

**Side Effects:**
- Creates proposal_feedback record
- Updates proposal.status to 'revision_requested'
- Updates inquiry.status to 'negotiating'
- Sends notification email to admin with feedback
- Sends confirmation email to customer

**Error Responses:**
- `404 Not Found`: Invalid token
- `400 Bad Request`: Validation failed
- `409 Conflict`: Proposal already accepted/rejected
- `500 Internal Server Error`: Server error

---

## Admin Endpoints

All admin endpoints require authentication via JWT token.

### 5. List All Inquiries

Retrieve paginated list of inquiries with filtering.

```
GET /api/admin/inquiries
```

**Authentication:** Required (admin/project_manager role)

**Query Parameters:**
- `status` (optional): Filter by status (e.g., `new`, `reviewing`)
- `projectType` (optional): Filter by project type
- `assignedTo` (optional): Filter by assigned admin ID
- `search` (optional): Full-text search query
- `page` (optional): Page number (default 1)
- `limit` (optional): Items per page (default 20, max 100)
- `sort` (optional): Sort field (default `createdAt`)
- `order` (optional): Sort order (`asc` or `desc`, default `desc`)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "inquiries": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "inquiryNumber": "INQ-2025-042",
        "status": "new",
        "createdAt": "2025-01-11T14:30:00Z",
        "updatedAt": "2025-01-11T14:30:00Z",

        "companyName": "Acme Corporation",
        "contactName": "John Smith",
        "contactEmail": "john@acme.com",
        "contactPhone": "+1 (555) 123-4567",

        "projectType": "Product Demo / Explainer",
        "estimatedBudget": "$5,000 - $10,000",
        "desiredTimeline": "Standard (1-2 months)",
        "videoLength": "2-3 minutes",

        "assignedToAdminId": null,
        "proposalId": null,
        "convertedToProjectId": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "totalPages": 3
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Server error

---

### 6. Get Inquiry Details

Retrieve complete details for a specific inquiry.

```
GET /api/admin/inquiries/:inquiryId
```

**Authentication:** Required (admin/project_manager role)

**URL Parameters:**
- `inquiryId` (UUID): Inquiry ID

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "inquiry": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "inquiryNumber": "INQ-2025-042",
      "status": "new",
      "createdAt": "2025-01-11T14:30:00Z",
      "updatedAt": "2025-01-11T14:30:00Z",

      "companyName": "Acme Corporation",
      "contactName": "John Smith",
      "contactEmail": "john@acme.com",
      "contactPhone": "+1 (555) 123-4567",

      "projectType": "Product Demo / Explainer",
      "projectDescription": "We need an explainer video showing...",
      "estimatedBudget": "$5,000 - $10,000",
      "desiredTimeline": "Standard (1-2 months)",
      "videoLength": "2-3 minutes",
      "targetAudience": "B2B SaaS customers",
      "specificRequirements": "Modern animation, upbeat music",
      "referenceLinks": ["https://youtube.com/watch?v=example1"],

      "assignedToAdminId": null,
      "proposalId": null,
      "convertedToProjectId": null
    },
    "notes": [
      {
        "id": "note-1",
        "authorId": "admin-1",
        "authorName": "Sarah Johnson",
        "content": "This looks like a good fit for our animation team.",
        "createdAt": "2025-01-11T15:00:00Z",
        "isPinned": false
      }
    ],
    "proposals": [],
    "feedback": []
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Inquiry not found
- `500 Internal Server Error`: Server error

---

### 7. Update Inquiry

Update inquiry details or status.

```
PATCH /api/admin/inquiries/:inquiryId
```

**Authentication:** Required (admin/project_manager role)

**URL Parameters:**
- `inquiryId` (UUID): Inquiry ID

**Request Body:**
```json
{
  "status": "reviewing",
  "assignedToAdminId": "admin-123"
}
```

**Allowed Updates:**
- `status`: Any valid InquiryStatus
- `assignedToAdminId`: UUID of admin user

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "reviewing",
    "assignedToAdminId": "admin-123",
    "updatedAt": "2025-01-11T15:30:00Z"
  },
  "message": "Inquiry updated successfully"
}
```

**Side Effects:**
- Updates inquiry record
- Logs activity
- Notifies assigned admin (if assigned)

**Error Responses:**
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Inquiry not found
- `400 Bad Request`: Invalid status or admin ID
- `500 Internal Server Error`: Server error

---

### 8. Add Inquiry Note

Add an internal note to an inquiry.

```
POST /api/admin/inquiries/:inquiryId/notes
```

**Authentication:** Required (admin/project_manager role)

**URL Parameters:**
- `inquiryId` (UUID): Inquiry ID

**Request Body:**
```json
{
  "content": "Called customer to discuss timeline. They're flexible on dates.",
  "isPinned": false
}
```

**Validation:**
- `content`: Required, min 1 char
- `isPinned`: Optional boolean (default false)

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "note-123",
    "inquiryId": "550e8400-e29b-41d4-a716-446655440000",
    "authorId": "admin-123",
    "authorName": "Sarah Johnson",
    "content": "Called customer to discuss timeline...",
    "createdAt": "2025-01-11T16:00:00Z",
    "isPinned": false
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Inquiry not found
- `400 Bad Request`: Validation failed
- `500 Internal Server Error`: Server error

---

### 9. Create Proposal

Create a new proposal for an inquiry.

```
POST /api/admin/proposals
```

**Authentication:** Required (admin/project_manager role)

**Request Body:**
```json
{
  "inquiryId": "550e8400-e29b-41d4-a716-446655440000",
  "totalPrice": 800000,
  "currency": "USD",
  "pricingBreakdown": [
    {
      "description": "Concept & Script Development",
      "amount": 150000,
      "quantity": 1
    }
  ],
  "projectScope": "We will create a 2-3 minute product explainer video...",
  "deliverables": [
    {
      "name": "Script & Concept",
      "description": "Approved script and creative concept document",
      "estimatedCompletionWeek": 1
    }
  ],
  "nonInclusions": ["Live action filming or on-location shooting"],
  "estimatedDuration": "6-8 weeks",
  "milestones": [
    {
      "name": "Pre-Production",
      "description": "Script development and storyboarding",
      "deliverableIds": ["deliv-1", "deliv-2"],
      "estimatedDate": "Week 2",
      "order": 1
    }
  ],
  "includedRevisions": 2,
  "revisionPolicy": "Two rounds of revisions are included...",
  "paymentTerms": "50% advance payment, 50% on completion",
  "paymentTerms": "50% deposit ($4,000) to begin work...",
  "primaryContactName": "Sarah Johnson",
  "additionalNotes": "Looking forward to working with you!"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "proposalNumber": "PROP-2025-042",
    "version": 1,
    "status": "draft",
    "reviewToken": "770e8400-e29b-41d4-a716-446655440002",
    "reviewUrl": "https://motionify.studio/proposal/review/770e8400-e29b-41d4-a716-446655440002",
    "createdAt": "2025-01-11T16:00:00Z"
  },
  "message": "Proposal created successfully. Send it to the customer when ready."
}
```

**Side Effects:**
- Creates proposal record with status 'draft'
- Generates unique proposal number
- Generates unique review token
- Associates with inquiry

**Error Responses:**
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Inquiry not found
- `400 Bad Request`: Validation failed
- `500 Internal Server Error`: Server error

---

### 10. Update Proposal

Update a draft proposal.

```
PATCH /api/admin/proposals/:proposalId
```

**Authentication:** Required (admin/project_manager role)

**URL Parameters:**
- `proposalId` (UUID): Proposal ID

**Request Body:** (any proposal fields to update)
```json
{
  "totalPrice": 850000,
  "pricingBreakdown": [...]
}
```

**Constraint:** Can only update proposals with status 'draft'

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "updatedAt": "2025-01-11T16:30:00Z"
  },
  "message": "Proposal updated successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Insufficient permissions or proposal already sent
- `404 Not Found`: Proposal not found
- `400 Bad Request`: Validation failed
- `500 Internal Server Error`: Server error

---

### 11. Send Proposal to Customer

Send proposal via email and make it viewable.

```
POST /api/admin/proposals/:proposalId/send
```

**Authentication:** Required (admin/project_manager role)

**URL Parameters:**
- `proposalId` (UUID): Proposal ID

**Request Body:** (optional)
```json
{
  "customMessage": "Hi John, excited to work with you on this project!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "proposalId": "660e8400-e29b-41d4-a716-446655440001",
    "status": "sent",
    "reviewUrl": "https://motionify.studio/proposal/review/770e8400-e29b-41d4-a716-446655440002",
    "sentAt": "2025-01-11T16:45:00Z"
  },
  "message": "Proposal sent to customer successfully"
}
```

**Side Effects:**
- Updates proposal.status to 'sent'
- Updates inquiry.status to 'proposal_sent'
- Sends proposal email to customer with review link
- Logs activity

**Error Responses:**
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Proposal not found
- `409 Conflict`: Proposal already sent
- `500 Internal Server Error`: Server error or email sending failed

---

### 12. Create Revised Proposal

Create a new version of a proposal after customer feedback.

```
POST /api/admin/proposals/:proposalId/revise
```

**Authentication:** Required (admin/project_manager role)

**URL Parameters:**
- `proposalId` (UUID): Previous proposal ID

**Request Body:**
```json
{
  "changesSummary": "Reduced timeline to 4 weeks and added 1 additional revision round",
  "updatedFields": {
    "estimatedDuration": "4 weeks",
    "includedRevisions": 3,
    "totalPrice": 850000
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "new-proposal-id",
    "proposalNumber": "PROP-2025-042",
    "version": 2,
    "status": "draft",
    "previousVersionId": "660e8400-e29b-41d4-a716-446655440001",
    "changesSinceLastVersion": "Reduced timeline to 4 weeks...",
    "reviewToken": "new-token",
    "reviewUrl": "https://motionify.studio/proposal/review/new-token"
  },
  "message": "New proposal version created. Send it to the customer when ready."
}
```

**Side Effects:**
- Creates new proposal with incremented version
- Marks old proposal as 'superseded'
- Links to previous version
- Generates new review token
- Does NOT automatically send (remains in draft)

**Error Responses:**
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Proposal not found
- `500 Internal Server Error`: Server error

---

### 13. Convert Inquiry to Project

Manually convert a paid inquiry to a project.

```
POST /api/admin/inquiries/:inquiryId/convert
```

**Authentication:** Required (admin/project_manager role)

**URL Parameters:**
- `inquiryId` (UUID): Inquiry ID

**Request Body:**
```json
{
  "projectManagerId": "admin-123"
}
```

**Constraint:** Inquiry must have status 'paid' and accepted proposal

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "projectId": "new-project-id",
    "projectName": "Acme Corporation - Product Demo / Explainer",
    "inquiryId": "550e8400-e29b-41d4-a716-446655440000",
    "customerUserId": "new-user-id"
  },
  "message": "Inquiry converted to project successfully"
}
```

**Note:** This endpoint is now primarily used for manual conversion if needed. In the normal flow, project conversion happens automatically via payment webhook after successful advance payment.

**Side Effects:**
- Creates user account for customer (if not exists)
- Creates project record with proposal details
- Copies deliverables and milestones from project setup
- Updates inquiry.status to 'converted'
- Sets convertedToProjectId
- Sends welcome email with magic link (if account was just created)

**Error Responses:**
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Inquiry not found
- `409 Conflict`: Inquiry not in 'paid' status or already converted
- `500 Internal Server Error`: Server error

---

## Webhook Endpoints

### 14. Setup Project Structure & Payment Terms

Create project structure and set payment terms for an accepted proposal.

```
POST /api/admin/inquiries/:inquiryId/setup-project
```

**Authentication:** Required (super_admin only)

**Request Body:**
```json
{
  "proposalId": "uuid",
  "totalAmount": 80000.00,
  "advancePercentage": 50,
  "currency": "INR",
  "milestones": [
    {
      "name": "Pre-Production",
      "deliverables": ["script", "storyboard"],
      "estimatedWeeks": 2
    }
  ],
  "deliverables": [
    {
      "name": "Final Video (4K)",
      "description": "4K resolution final video"
    }
  ],
  "sendPaymentRequest": true
}
```

**Validation:**
- `proposalId`: Required, valid UUID, proposal must be accepted
- `totalAmount`: Required, positive number
- `advancePercentage`: Required, integer between 1 and 99
- `currency`: Required, must be 'INR' or 'USD'
- `milestones`: Required, array of milestone objects
- `deliverables`: Required, array of deliverable objects

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "projectSetup": {
      "id": "uuid",
      "inquiryId": "uuid",
      "proposalId": "uuid",
      "totalAmount": 80000.00,
      "advancePercentage": 50,
      "advanceAmount": 40000.00,
      "balanceAmount": 40000.00,
      "currency": "INR",
      "paymentRequestSent": true,
      "paymentLink": "https://rzp.io/i/ABC123XYZ"
    }
  },
  "message": "Project setup completed and payment request sent"
}
```

**Side Effects:**
- Creates `project_setup` record
- Creates `project_payment_status` record with calculated amounts
- Generates Razorpay payment link
- Sends payment request email to customer (if `sendPaymentRequest` is true)
- Updates inquiry status to 'payment_pending'

**Error Responses:**
- `400 Bad Request`: Validation failed
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not super admin
- `404 Not Found`: Inquiry or proposal not found
- `409 Conflict`: Project setup already exists for this inquiry

---

### 15. Razorpay Payment Webhook

Receive payment confirmation from Razorpay.

```
POST /api/webhooks/payment
```

**Authentication:** Razorpay signature verification using webhook secret

**Headers:**
- `X-Razorpay-Signature`: Webhook signature for verification

**Request Body:** (Razorpay webhook event)
```json
{
  "entity": "event",
  "account_id": "acc_xxx",
  "event": "payment.captured",
  "contains": ["payment"],
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_xxx",
        "entity": "payment",
        "amount": 400000,
        "currency": "INR",
        "status": "captured",
        "order_id": "order_xxx",
        "method": "upi",
        "description": "Payment for Inquiry INQ-2025-042",
        "notes": {
          "inquiryId": "550e8400-e29b-41d4-a716-446655440000",
          "proposalId": "660e8400-e29b-41d4-a716-446655440001"
        },
        "created_at": 1673456789
      }
    }
  }
}
```

**Alternative Event:** `payment_link.paid` (for Payment Links)
```json
{
  "event": "payment_link.paid",
  "payload": {
    "payment_link": {
      "entity": {
        "id": "plink_xxx",
        "status": "paid",
        "amount": 400000,
        "currency": "USD",
        "notes": {
          "inquiryId": "550e8400-e29b-41d4-a716-446655440000",
          "proposalId": "660e8400-e29b-41d4-a716-446655440001"
        }
      }
    },
    "payment": {
      "entity": {
        "id": "pay_xxx",
        "amount": 400000,
        "currency": "USD",
        "status": "captured"
      }
    }
  }
}
```

**Response (200 OK):**
```json
{
  "received": true
}
```

**Signature Verification:**
```javascript
// Verify webhook authenticity
const crypto = require('crypto');

function verifyRazorpaySignature(body, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');

  return expectedSignature === signature;
}
```

**Supported Events:**
- `payment.captured` - Payment successfully captured
- `payment.failed` - Payment failed
- `payment_link.paid` - Payment Link was paid

**Side Effects:**
- Verifies Razorpay signature
- Verifies payment amount matches project setup (handles both INR & USD)
- Updates payment status to COMPLETED
- If advance payment:
  - Creates customer user account immediately (if not exists)
  - Creates project record with saved structure (if not already created)
  - Generates magic link for portal access
  - Sends welcome email with portal access link
  - Updates inquiry.status to 'converted'
- Updates project_payment_status
- Sends payment confirmation emails
- Notifies admin of payment

**Error Responses:**
- `400 Bad Request`: Invalid signature or payload
- `404 Not Found`: Inquiry/proposal not found in notes/metadata
- `409 Conflict`: Payment already processed (idempotency)
- `500 Internal Server Error`: Server error

**Notes:**
- Store `inquiryId` and `proposalId` in Razorpay Payment Link `notes` field
- Payment amount stored in paise (100 paise = ₹1) or cents (100 cents = $1)
- Handle both INR and USD currencies
- Webhook secret is available in Razorpay Dashboard → Settings → Webhooks

---

## Error Responses

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Company name is required",
    "field": "companyName",
    "details": {}
  }
}
```

### Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Request validation failed |
| 400 | `INVALID_STATUS_TRANSITION` | Cannot change status in current state |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication token |
| 403 | `FORBIDDEN` | Insufficient permissions for this action |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource state conflict (e.g., already accepted) |
| 410 | `GONE` | Resource has expired |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

---

## Rate Limiting

### Public Endpoints

- **Inquiry submission**: 5 requests per hour per IP
- **Proposal viewing**: 20 requests per hour per token
- **Proposal actions** (accept/feedback): 10 requests per hour per token

### Admin Endpoints

- **Standard operations**: 100 requests per minute per user
- **Bulk operations**: 20 requests per minute per user

### Headers

Rate limit information is returned in response headers:

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1673456789
```

When rate limit is exceeded:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 3600

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 1 hour.",
    "retryAfter": 3600
  }
}
```

---

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default 1)
- `limit`: Items per page (default 20, max 100)

**Response Format:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## Filtering & Sorting

**Filter Parameters:**
- `status`: Filter by exact status
- `projectType`: Filter by exact project type
- `assignedTo`: Filter by admin ID
- `search`: Full-text search across multiple fields

**Sort Parameters:**
- `sort`: Field to sort by (e.g., `createdAt`, `updatedAt`, `companyName`)
- `order`: `asc` or `desc` (default `desc`)

**Example:**
```
GET /api/admin/inquiries?status=new&sort=createdAt&order=desc&page=1&limit=20
```

---

## API Versioning

Currently using v1 (implicit). Future versions will use URL versioning:

```
/api/v2/inquiries
```

Breaking changes will be introduced in new versions while maintaining backward compatibility for at least 6 months.

---

## Development Notes

### Testing

Use these test email domains for development:
- `@test.motionify.studio`: Bypasses email sending
- `@example.com`: Logs emails instead of sending

### Idempotency

Mutation endpoints support idempotency keys:

```
POST /api/inquiries
Idempotency-Key: unique-key-123
```

Same key within 24 hours returns cached response instead of creating duplicate.

### CORS

Allowed origins for public endpoints:
- `https://motionify.studio`
- `https://www.motionify.studio`
- `http://localhost:3000` (development)
