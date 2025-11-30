# API Endpoints: Project Deliverables & Approval Workflow

## Base URL
```
Production: https://api.motionify.studio
Development: http://localhost:3000
```

## Authentication
- **Client endpoints**: JWT token (PRIMARY_CONTACT role)
- **Admin endpoints**: JWT token (admin/project_manager role)

---

## Client Endpoints

### 1. List Project Deliverables
```
GET /api/projects/:projectId/deliverables
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "deliverables": [
      {
        "id": "deliv-001",
        "name": "Final Video",
        "description": "2-minute explainer video",
        "status": "awaiting_approval",
        "betaFileUrl": "https://r2.../beta.mp4",
        "canApprove": true,
        "canReject": true
      }
    ]
  }
}
```

### 2. Approve Deliverable
```
POST /api/deliverables/:id/approve
```

**Side Effects:**
- Creates approval record
- Updates deliverable status to 'approved' → 'payment_pending'
- Sends admin notification
- Generates balance payment link (Razorpay)

### 3. Reject Deliverable
```
POST /api/deliverables/:id/reject
```

**Request Body:**
```json
{
  "feedback": "Please adjust the color grading in scene 2"
}
```

**Side Effects:**
- Consumes 1 revision from project quota
- Creates rejection record
- Status → 'rejected' → 'revision_requested'
- Notifies team
- Increments deliverable.revisionsConsumed

### 4. Request Additional Revisions
```
POST /api/projects/:projectId/revisions/request
```

**Request Body:**
```json
{
  "deliverableId": "deliv-001",
  "reason": "Need significant changes to match new brand guidelines",
  "additionalRevisionsRequested": 2
}
```

---

## Admin Endpoints

### 5. Create Deliverable (during project conversion)
```
POST /api/projects/:projectId/deliverables
```

**Request Body:**
```json
{
  "deliverables": [
    {
      "id": "preserved-from-proposal",
      "name": "Final Video",
      "description": "...",
      "estimatedCompletionWeek": 6
    }
  ]
}
```

### 6. Upload Beta File
```
POST /api/deliverables/:id/beta-upload
```

**Request:** Multipart form with file

**Side Effects:**
- Uploads to Cloudflare R2
- Applies watermark
- Updates status to 'beta_ready' → 'awaiting_approval'
- Sends client notification

### 7. Upload Final File
```
POST /api/deliverables/:id/final-upload
```

**Side Effects:**
- Uploads full-resolution file (no watermark)
- Status → 'final_delivered' (after payment verification)
- Sets expiresAt = now + 365 days

### 8. Approve Additional Revision Request
```
PATCH /api/revision-requests/:id/approve
```

**Request Body:**
```json
{
  "revisionsGranted": 2,
  "adminNotes": "Approved due to scope change"
}
```

**Side Effects:**
- Updates project.totalRevisions += revisionsGranted
- Notifies client

---

## Webhooks

### Razorpay Payment Webhook
```
POST /api/webhooks/razorpay/payment
```

**Event:** payment.captured

**Action:**
- Verify payment signature
- Update deliverable.balancePaymentReceived = true
- Status 'payment_pending' → 'final_delivered'
- Send final delivery notification

---

## Error Responses
All endpoints return standard format:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_REVISIONS",
    "message": "No revisions remaining. Please request additional revisions.",
    "details": {
      "totalRevisions": 2,
      "usedRevisions": 2
    }
  }
}
```

**Error Codes:**
- `INSUFFICIENT_REVISIONS` - Cannot reject, quota exhausted
- `UNAUTHORIZED_APPROVAL` - Only PRIMARY_CONTACT can approve
- `INVALID_STATUS_TRANSITION` - Deliverable not in awaiting_approval status
- `PAYMENT_NOT_RECEIVED` - Cannot access final file before payment
- `FILE_EXPIRED` - Deliverable expired (365 days passed)

---

**Total Endpoints:** 14 (8 client, 6 admin)
