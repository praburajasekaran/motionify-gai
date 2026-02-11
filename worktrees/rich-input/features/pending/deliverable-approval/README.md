# Project Deliverables & Approval Workflow

> **Version:** 1.0
> **Status:** Product Design Phase
> **Last Updated:** January 13, 2025

## Overview

This feature manages the deliverable approval workflow for video production projects. After a project starts (converted from inquiry), the team creates deliverables that clients can review, approve, or request revisions. This feature tracks deliverable status, manages revision quotas, handles beta vs final deliveries, and integrates with the payment workflow.

## Customer Journey Summary

```
Project Created (from Inquiry)
    ↓
Deliverables Defined (from Proposal)
    ↓
Motionify Team Uploads Beta Deliverable
    ↓
Client Reviews Beta (with watermark)
    ↓
┌─────────────┬──────────────┐
│   Approve   │    Reject    │
└─────┬───────┴──────┬───────┘
      ↓              ↓
Final Payment   Revision Request
      ↓         (consume quota)
      ↓              ↓
Final Delivery  Team Re-uploads
 (no watermark)      ↓
      ↓         Client Reviews Again
      ↓              ↓
   Complete      (loop until approved)
```

## Key Benefits

- **Clear Approval Process** - Clients can approve/reject deliverables through the portal
- **Revision Management** - Automatically tracks revision quota usage (2 included, more can be requested)
- **Beta → Final Workflow** - Beta delivery with watermark, final delivery after approval + payment
- **Transparency** - Full history of approvals, rejections, and feedback
- **Payment Integration** - Final delivery unlocked after 50% balance payment

## Documentation Structure

This feature is documented across multiple files for modularity and ease of review:

### 1. [User Journey](./01-user-journey.md)
Complete workflow including:
- Deliverable creation from proposals
- Beta delivery upload
- Client approval/rejection flow
- Revision request workflow
- Final payment → final delivery
- State transition diagrams
- Automation triggers

### 2. [Wireframes](./02-wireframes.md)
ASCII wireframes for all screens:
- **Customer-facing:**
  - Deliverables list view
  - Beta delivery review modal
  - Approval confirmation screen
  - Revision request form
  - Final delivery download
- **Admin:**
  - Upload beta deliverable
  - View approval status
  - Handle revision requests
  - Upload final deliverable

### 3. [Data Models](./03-data-models.md)
TypeScript interfaces for:
- Deliverable (with approval tracking)
- DeliverableStatus enum
- DeliverableApproval (history tracking)
- RevisionRequest
- DeliverableFile

### 4. [Database Schema](./04-database-schema.sql)
SQL table definitions for:
- `deliverables` - Main deliverable records
- `deliverable_approvals` - Approval/rejection history
- `deliverable_files` - Beta and final file references

### 5. [API Endpoints](./05-api-endpoints.md)
REST API specifications:
- 8 client endpoints (view, approve, reject, request revision)
- 6 admin endpoints (create, upload, manage)
- Webhook endpoints for file uploads (Cloudflare R2)

### 6. [Email Templates](./06-email-templates.md)
Notification specifications:
- 4 customer email templates (beta ready, approved, rejected, final ready)
- 3 admin notification templates (approval received, revision requested, payment received)

### 7. [Test Cases](./07-test-cases.md)
Comprehensive test scenarios covering:
- Deliverable creation from proposals
- Beta approval workflow
- Revision quota management
- Payment integration
- Final delivery access

## Technical Requirements

### Frontend
- DeliverablesList component (shows all deliverables for project)
- DeliverableReviewModal (client reviews beta)
- ApprovalConfirmation component
- RevisionRequestForm component
- FinalDeliveryDownload component
- DeliverableUploadForm (admin)

### Backend
- GET `/api/projects/:id/deliverables` - List deliverables
- POST `/api/deliverables/:id/approve` - Approve deliverable
- POST `/api/deliverables/:id/reject` - Reject with feedback
- POST `/api/projects/:id/deliverables` - Create deliverable (admin)
- POST `/api/deliverables/:id/beta-upload` - Upload beta file
- POST `/api/deliverables/:id/final-upload` - Upload final file
- Razorpay integration for balance payment
- Revision quota tracking

### Infrastructure
- Cloudflare R2 for file storage (beta + final files)
- Amazon SES for email notifications
- Watermark generation service (for beta deliveries)

## Implementation Phases

1. **Phase 1: Core Approval Workflow (Week 5-6)**
   - Create deliverables from proposals during project conversion
   - Beta upload by admin
   - Client approve/reject functionality
   - Basic revision tracking

2. **Phase 2: Revision Management (Week 6-7)**
   - Revision quota enforcement
   - Additional revision requests
   - Admin approval for extra revisions
   - Revision history tracking

3. **Phase 3: Payment Integration (Week 7-8)**
   - Balance payment link generation
   - Payment verification
   - Final delivery unlock after payment
   - 365-day expiry tracking

**Estimated Timeline:** 3-4 weeks

## Success Metrics

- **Approval Rate** - Percentage of deliverables approved on first submission
- **Revision Usage** - Average revisions used per project
- **Time to Approval** - Average time from beta upload to approval
- **Payment Completion** - Percentage of clients who pay balance after approval

## Integration Points

### With inquiry-to-project Feature
- Deliverables are created from `ProposalDeliverable[]` during project conversion
- Preserves: name, description, estimatedCompletionWeek, format
- Adds: status tracking, approval history, file references

### With Existing Portal
- Uses existing `projects` table (foreign key: project_id)
- Uses existing `users` table (foreign key: approved_by, rejected_by)
- Uses existing `files` table (extended for beta/final deliverables)
- Uses existing `activities` table (new activity types for approvals)
- Integrates with revision quota (`projects.totalRevisions`, `projects.usedRevisions`)

## Business Rules

1. **Revision Consumption:**
   - Each deliverable rejection = 1 revision consumed (project-level)
   - Approvals do NOT consume revisions
   - When quota exhausted, client can REQUEST additional revisions (admin approval required)

2. **Approval Permissions:**
   - Only PRIMARY_CONTACT can approve/reject deliverables
   - Other team members can VIEW deliverables but not approve

3. **Deliverable Status Flow:**
   ```
   pending → in_progress → beta_ready → awaiting_approval
        ↓                                    ↓
   (admin uploads beta)          ┌───────────┴────────────┐
                                 ↓                        ↓
                           approved                  rejected
                                 ↓                        ↓
                        payment_pending        revision_requested
                                 ↓                        ↓
                        final_delivered        (back to in_progress)
   ```

4. **File Delivery:**
   - Beta: Watermarked, limited resolution, accessible immediately
   - Final: No watermark, full resolution, accessible ONLY after balance payment

5. **Expiry:**
   - Final deliverables expire 365 days after `final_delivered` status
   - After expiry, download links are disabled (files archived)

## Related Documentation

- `features/inquiry-to-project/` - How proposals convert to projects with deliverables
- `features/INCONSISTENCY_RESOLVED.md` - Integration requirements and resolved inconsistencies
- `docs/user-stories.md` - US-023 through US-029
- `docs/FEATURE_STATUS_MATRIX.md` - Implementation tracking

## Questions or Feedback?

For questions about this feature specification, contact the product team.
