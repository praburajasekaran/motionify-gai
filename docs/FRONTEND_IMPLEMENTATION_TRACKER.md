# Frontend Implementation Tracker - Motionify PM Portal

**Last Updated**: 2025-12-29
**Timeline**: 6 weeks frontend development
**Current Phase**: Week 1-2 - Inquiry to Proposal Journey

---

## Overall Progress

- [ ] Week 1-2: Inquiry to Proposal Journey (0/50 tasks)
- [ ] Week 3: Project Terms Acceptance (0/24 tasks)
- [ ] Week 4: Payment Workflow UI (0/38 tasks)
- [ ] Week 5: Delivery Management UI (0/24 tasks)
- [ ] Week 6: Notifications System (0/33 tasks)
- [ ] Week 7+: Meeting Scheduling (Optional - 0/17 tasks)

**Total Progress**: 0/186 tasks complete (0%)

---

## Week 1-2: Extend Existing Quiz to Create Inquiries

**Status**: Quiz already exists in `landing-page-new/src/components/Quiz/Quiz.tsx`
**Approach**: Extend the 5-step quiz to collect contact info and create inquiry records

### Quiz Integration Tasks (0/8)
- [ ] Add Step 6: Contact Information form (name, email, company, phone)
- [ ] Update `useQuiz.ts` to handle contact info state
- [ ] Create inquiry submission handler
- [ ] Show success confirmation after submission
- [ ] Add "View My Inquiry" link after submission
- [ ] Create inquiry ID/token for tracking
- [ ] Add email notification trigger (mock)
- [ ] Handle form validation and errors

### Mock Data Setup (0/3)
- [ ] Create `data/mockInquiries.ts` with sample inquiries
- [ ] Create `data/mockProposals.ts` with sample proposals
- [ ] Include edge cases (rejected, pending, accepted states)
- [ ] Store quiz answers in inquiry records

### Admin Inquiry Dashboard - React Dashboard `pages/admin/InquiryDashboard.tsx` (0/8)
- [ ] Inquiry list with status badges
- [ ] Filter by status (new, reviewing, proposal sent, accepted, rejected)
- [ ] Search by client name/email
- [ ] Sort by date
- [ ] Click to view details
- [ ] Assign to project manager dropdown
- [ ] "Create Proposal" button
- [ ] Show quiz answers in inquiry details (niche, audience, style, mood, duration)

### Admin Proposal Builder - React Dashboard `pages/admin/ProposalBuilder.tsx` (0/13)
- [ ] Rich text editor for proposal content
- [ ] Deliverables section (add/remove multiple)
- [ ] Pricing configuration form
- [ ] Total cost input
- [ ] Advance % selector (40/50/60%)
- [ ] Auto-calculate amounts
- [ ] Revision count input (default 3)
- [ ] Timeline/deadline picker
- [ ] Preview proposal button
- [ ] Send to client button
- [ ] Save as draft button
- [ ] Form validation
- [ ] Pre-fill deliverables based on quiz recommendation

### Public Proposal Review - Next.js Landing `pages/ProposalReview.tsx` (0/8)
- [ ] Display proposal details (read-only)
- [ ] Show deliverables list
- [ ] Show pricing breakdown
- [ ] Show revision count
- [ ] Accept button (with confirmation)
- [ ] Reject button (with reason textarea)
- [ ] Request Changes button (with comment textarea)
- [ ] Status indicator (pending/accepted/rejected)

### Supporting Components (0/5)
- [ ] `components/inquiry/ServiceTypeSelector.tsx`
- [ ] `components/inquiry/InquiryStatusBadge.tsx`
- [ ] `components/proposal/ProposalPreview.tsx`
- [ ] `components/proposal/DeliverableListEditor.tsx`
- [ ] `components/proposal/PricingCalculator.tsx`

---

## Week 3: Project Terms Acceptance & Contract/NDA

### Mock Data Setup (0/3)
- [ ] Create `data/mockProjectTerms.ts`
- [ ] Sample contracts/NDAs
- [ ] Terms in different states

### Onboarding Agreement Modal - `components/terms/OnboardingAgreementModal.tsx` (0/9)
- [ ] Full-screen blocking modal (cannot close until accepted)
- [ ] Project scope section
- [ ] Deliverables summary
- [ ] Revision count display
- [ ] Contract text display (scrollable)
- [ ] NDA text display (scrollable)
- [ ] "I accept all terms" checkbox
- [ ] Accept button (disabled until checkbox checked)
- [ ] Request Changes button (opens change request form)

### Request Terms Changes - `components/terms/RequestTermsChanges.tsx` (0/5)
- [ ] Comment textarea (required, min 20 chars)
- [ ] Submit to admin button
- [ ] Cancel button
- [ ] Success confirmation
- [ ] Track request status

### Terms Reacceptance Modal - `components/terms/TermsReacceptanceModal.tsx` (0/4)
- [ ] Show when admin updates terms
- [ ] "What changed" section (highlights)
- [ ] Full terms display
- [ ] Re-acceptance checkbox
- [ ] Accept updated terms button

### Terms Version History - `components/terms/TermsVersionHistory.tsx` (0/5)
- [ ] List all versions with dates
- [ ] Show acceptance timestamps
- [ ] Show who accepted (user name)
- [ ] Show change requests history
- [ ] Expandable version details

### Route Guard Implementation (0/3)
- [ ] Add terms check to `pages/ProjectDetail.tsx`
- [ ] Redirect to onboarding if not accepted
- [ ] Show acceptance status in project header

---

## Week 4: Payment Workflow UI

### Mock Data Setup (0/4)
- [ ] Create `data/mockPayments.ts`
- [ ] Payment records (pending, completed, failed)
- [ ] Mock invoices (PDF URLs)
- [ ] Razorpay mock integration

### Payment Initiation - `pages/PaymentInitiation.tsx` (0/7)
- [ ] Payment type indicator (Advance 50% / Balance 50%)
- [ ] Amount display (large, prominent)
- [ ] Project details summary
- [ ] Payment method selection (mock)
- [ ] Terms checkbox "I agree to payment terms"
- [ ] Razorpay checkout button
- [ ] Mock Razorpay integration (2s delay → success/failure)

### Payment Success - `pages/PaymentSuccess.tsx` (0/7)
- [ ] Success icon/animation
- [ ] Payment confirmation message
- [ ] Transaction ID display
- [ ] Amount paid display
- [ ] Invoice download button
- [ ] "Access granted" message
- [ ] Next steps display
- [ ] Return to project button

### Payment Failure - `pages/PaymentFailure.tsx` (0/6)
- [ ] Error icon
- [ ] Error message display
- [ ] Reason for failure (if available)
- [ ] Retry payment button
- [ ] Contact support button
- [ ] Return to project button

### Payment Status Widget - `components/payment/PaymentStatusWidget.tsx` (0/6)
- [ ] Shows on project dashboard
- [ ] Advance payment: Paid ✓ / Pending with "Pay Now" button
- [ ] Balance payment: Paid ✓ / Pending with "Pay Now" button
- [ ] Total paid vs total cost progress bar
- [ ] Payment due date display
- [ ] Invoice download links

### Payment Reminder Banner - `components/payment/PaymentReminderBanner.tsx` (0/5)
- [ ] Shows when payment is overdue
- [ ] Countdown to due date
- [ ] Urgency indicator (colors: green/yellow/red)
- [ ] Quick "Pay Now" button
- [ ] Dismiss button

### Admin Payment Dashboard - `pages/admin/AdminPaymentDashboard.tsx` (0/9)
- [ ] List all payments with filters
- [ ] Filter by project
- [ ] Filter by status (pending/completed/failed)
- [ ] Filter by type (advance/balance)
- [ ] Date range filter
- [ ] Mark as paid manually (admin)
- [ ] Upload invoice button
- [ ] Send payment reminder button
- [ ] Export to CSV

### Admin Invoice Upload - `components/admin/InvoiceUploadForm.tsx` (0/6)
- [ ] File upload (PDF only)
- [ ] Preview uploaded invoice
- [ ] Associate with payment record
- [ ] Send to client email checkbox
- [ ] Upload button
- [ ] Success confirmation

### Deliverable Access Guard - `components/deliverables/DeliverableAccessGuard.tsx` (0/5)
- [ ] Wraps final deliverable downloads
- [ ] Check payment status
- [ ] Show "Payment Required" if unpaid
- [ ] Show "365 days remaining" countdown if paid
- [ ] Show expiry warning banners (30/7/1 days before)

---

## Week 5: Delivery Management UI

### Mock Data Setup (0/4)
- [ ] Beta deliverables with watermark URLs
- [ ] Final deliverables (payment-gated)
- [ ] Deliverables at various expiry stages
- [ ] Upload progress states

### Admin: Beta Delivery Upload - `components/admin/BetaDeliveryUpload.tsx` (0/8)
- [ ] File upload with drag-and-drop
- [ ] Deliverable selection dropdown
- [ ] Add watermark checkbox (auto-apply)
- [ ] Resolution limiter (max 720p for beta)
- [ ] Upload progress bar
- [ ] Preview uploaded file
- [ ] Notify client checkbox
- [ ] Submit button

### Admin: Final Delivery Upload - `components/admin/FinalDeliveryUpload.tsx` (0/9)
- [ ] Check payment status first (block if unpaid)
- [ ] File upload with drag-and-drop
- [ ] Deliverable selection dropdown
- [ ] Full resolution support (4K)
- [ ] Upload progress bar
- [ ] Preview uploaded file
- [ ] Set 365-day expiry (auto)
- [ ] Notify client checkbox
- [ ] Submit button

### Client: Beta Delivery Review - `components/deliverables/BetaDeliveryReview.tsx` (0/7)
- [ ] Video player component
- [ ] Watermark indicator badge
- [ ] "This is a beta version" notice
- [ ] Approve button → redirects to payment
- [ ] Request Revision button → opens revision form
- [ ] Download beta option (optional)
- [ ] Feedback textarea

### Client: Final Delivery Download - `components/deliverables/FinalDeliveryDownload.tsx` (0/8)
- [ ] Payment verification check
- [ ] Download button (presigned URL)
- [ ] File size display
- [ ] Resolution display (4K, 1080p, etc.)
- [ ] Expiry countdown (365 days)
- [ ] "Available until [date]" message
- [ ] Re-download link (if already downloaded)
- [ ] Request extension button (admin approval needed)

### Expiry Warning Banner - `components/deliverables/ExpiryWarningBanner.tsx` (0/7)
- [ ] Shows 30 days before expiry (yellow)
- [ ] Shows 7 days before expiry (orange)
- [ ] Shows 1 day before expiry (red)
- [ ] "Download before it expires" message
- [ ] Download button
- [ ] Request extension button
- [ ] Dismiss button

### Enhancements to Existing Components (0/3)
- [ ] Update `DeliverableVideoSection.tsx` - add upload UI for admin
- [ ] Update `DeliverableCard.tsx` - show beta vs final status
- [ ] Create `DeliverableApprovalModal.tsx` - integrate with payment check

---

## Week 6: Notifications System Completion

### Mock Data Setup (0/5)
- [ ] Create `data/mockNotifications.ts` (50+ notifications)
- [ ] All notification types
- [ ] Read/unread states
- [ ] Notification preferences
- [ ] Real-time stream simulation

### Notification Dropdown - `components/notifications/NotificationDropdown.tsx` (0/9)
- [ ] Triggered by NotificationBell click
- [ ] Show last 10 notifications
- [ ] Notification item component (icon, message, timestamp, unread indicator)
- [ ] Mark as read on click
- [ ] "Mark all as read" button
- [ ] "View all" link to history page
- [ ] Empty state ("No new notifications")
- [ ] Real-time updates (mock with polling every 30s)
- [ ] Click notification to view details

### Notification History - `pages/NotificationHistory.tsx` (0/9)
- [ ] Full notification list with pagination
- [ ] Filter by type dropdown
- [ ] Filter by read/unread
- [ ] Date range filter
- [ ] Search notifications
- [ ] Bulk select checkboxes
- [ ] Bulk actions: Mark read, Delete
- [ ] Sort by date (newest/oldest)
- [ ] Export to CSV button

### Notification Preferences - `pages/NotificationPreferences.tsx` (0/10)
- [ ] Category toggles (email notifications) - 7 categories
- [ ] Category toggles (in-app notifications) - 7 categories
- [ ] Per-project settings (mute all for specific project)
- [ ] "Pause notifications" option with time selections
- [ ] Pause for 1 hour
- [ ] Pause for 4 hours
- [ ] Pause for 1 day
- [ ] Pause until [date picker]
- [ ] Save preferences button
- [ ] Reset to defaults button

### Real-Time Listener - `components/notifications/RealTimeListener.tsx` (0/5)
- [ ] Mock WebSocket/SSE connection
- [ ] Simulate new notification every 30-60s (random)
- [ ] Update NotificationBell badge count
- [ ] Show toast notification for new items
- [ ] Integrate with NotificationContext

### Notification Types Implementation (0/9)
- [ ] Task assigned notification
- [ ] Task status changed notification
- [ ] Comment mention (@user) notification
- [ ] File uploaded notification
- [ ] Approval request notification
- [ ] Revision requested notification
- [ ] Payment reminder notification
- [ ] Team member added notification
- [ ] Team member removed notification

---

## Week 7+: Meeting Scheduling (Optional - Not in MVP)

### Specification Creation (0/4)
- [ ] Create `/docs/features/meeting-scheduling/` folder
- [ ] Write overview, user journey, wireframes
- [ ] Define API endpoints
- [ ] Define data models

### Mock Data Setup (0/2)
- [ ] Create `data/mockMeetings.ts`
- [ ] Sample meetings (scheduled, pending, completed, cancelled)

### Meeting Management - `pages/Meetings.tsx` (0/6)
- [ ] Calendar view (month/week/day)
- [ ] Meeting request form
- [ ] Accept/reject pending meetings
- [ ] Meeting history list
- [ ] Filter by status
- [ ] Upcoming meetings widget

### Meeting Request Card - `components/meetings/MeetingRequestCard.tsx` (0/7)
- [ ] Meeting details (title, description, time)
- [ ] Attendees list
- [ ] Accept button
- [ ] Reject button
- [ ] Reschedule button
- [ ] Add to calendar button
- [ ] Meeting link (Google Meet/Zoom mock)

---

## Documentation References

For each feature, reference these documentation files from `docs/features/`:

### Inquiry to Proposal (`inquiry-to-project/`)
- `01-user-journey.md` - Complete user flow from quiz to proposal acceptance
- `02-wireframes.md` - UI mockups for all screens
- `03-data-models.md` - TypeScript interfaces and data structures
- `04-database-schema.sql` - Database schema (for API contract understanding)
- `05-api-endpoints.md` - API endpoints to mock in frontend
- `06-email-templates.md` - Email notification triggers
- `07-test-cases.md` - Test scenarios to cover
- `08-project-setup-flow.md` - Project setup flow details
- `COMPLETE_FLOW.md` - End-to-end flow documentation
- `DECISIONS.md` - Key architectural decisions
- `DELIVERABLE_ID_PRESERVATION.md` - Deliverable handling logic
- `PROJECT_SETUP_FLOW.md` - Detailed project setup workflow
- `STATE_MACHINE.md` - State transitions and business logic
- `README.md` - Feature overview and quick reference

### Project Terms Acceptance (`project-terms-acceptance/`)
- `01-user-journey.md` - Terms acceptance user flow
- `02-wireframes.md` - Modal designs and UI states
- `03-data-models.md` - Terms, acceptance records, version history
- `04-database-schema.sql` - Database schema
- `05-api-endpoints.md` - API endpoints for terms management
- `06-email-templates.md` - Terms notification emails
- `07-test-cases.md` - Edge cases and testing scenarios
- `README.md` - Feature overview

### Payment Workflow (`payment-workflow/`)
- `01-user-journey.md` - Payment flow from initiation to completion
- `02-wireframes.md` - Payment screens (initiation, success, failure)
- `03-data-models.md` - Payment records, invoices, transactions
- `04-database-schema.sql` - Payment schema
- `05-api-endpoints.md` - Razorpay integration endpoints
- `06-email-templates.md` - Payment notification emails
- `07-test-cases.md` - Payment scenarios and edge cases
- `README.md` - Feature overview

### Deliverable Approval (`deliverable-approval/`)
- `01-user-journey.md` - Beta/final delivery workflow
- `02-wireframes.md` - Delivery review screens
- `03-data-models.md` - Deliverable states and metadata
- `04-database-schema.sql` - Deliverable schema
- `05-api-endpoints.md` - Upload and download endpoints
- `06-email-templates.md` - Delivery notification emails
- `07-test-cases.md` - Delivery and expiry scenarios
- `README.md` - Feature overview

### Notifications System (`notifications-system/`)
- `01-user-journey.md` - Notification flow and user interactions
- `02-wireframes.md` - Notification UI components
- `03-data-models.md` - Notification types and preferences
- `04-database-schema.sql` - Notification schema
- `05-api-endpoints.md` - Real-time notification endpoints
- `06-email-templates.md` - Email notification templates
- `07-test-cases.md` - Notification scenarios
- `EMAIL_BATCHING_ALGORITHM.md` - Email batching logic
- `NOTIFICATION_BATCHING_RULES.md` - Batching rules for in-app notifications
- `TYPE_TO_CATEGORY_MAP.md` - Notification categorization
- `README.md` - Feature overview

### Additional Feature Documentation (for reference)
- `admin-features/` - Admin-specific features
- `authentication-system/` - Auth implementation details
- `core-foundation/` - Core app foundation
- `core-task-management/` - Task management features
- `feedback-and-revisions/` - Revision request system
- `file-management/` - File upload/download system
- `prospect-portal/` - Prospect-facing portal
- `task-following/` - Task following and updates
- `team-management/` - Team collaboration features

### Top-Level Documentation Files
- `CONFLICTS_RESOLVED.md` - Resolved design conflicts
- `IMPLEMENTATION_SUMMARY.md` - Overall implementation summary
- `MIGRATION_ORDER.md` - Feature migration sequence
- `NOTIFICATION_AUDIT.md` - Notification system audit
- `SCHEDULED_JOBS.md` - Background jobs and cron tasks
- `SCHEMA_FIXES_SUMMARY.md` - Database schema fixes
- `SCHEMA_OWNERSHIP.md` - Schema ownership and responsibility
- `STATUS_MAPPING.md` - Status field mappings across features
- `WIREFRAME_UPDATE_SUMMARY.md` - Wireframe change log

---

## Key Principles

1. **Build with mock data** - All features use mock data until backend is ready
2. **Match API contracts** - Frontend interfaces should match documented API specs
3. **Include edge cases** - Mock data should include errors, loading states, empty states
4. **Reusable components** - Extract common patterns into shared components
5. **TypeScript interfaces** - Create interfaces from API documentation

---

## Next Steps

1. Start with Week 1-2: Inquiry to Proposal Journey
2. First task: Create `data/mockInquiries.ts`
3. First component: `pages/InquiryForm.tsx`
4. Reference: `/docs/features/inquiry-to-project/03-wireframes.md` (Screen 1)

---

**Progress tracking**: Mark items as `[x]` when complete. Update the "Total Progress" percentage at the top of this document after each week.
