<objective>
Build a complete, production-ready Deliverable Approval Flow frontend for the Motionify PM Portal. This feature enables clients to review video deliverables, approve or reject them, request revisions with quota tracking, and download final files after payment.

This is for a CLIENT DEMO - create polished, visually impressive UI that demonstrates the complete workflow from beta delivery review through final file download. The implementation should be easily pluggable with backend APIs later.
</objective>

<context>
You are building this feature for a video production project management portal. The business flow is:
1. Motionify team uploads BETA deliverable (watermarked)
2. Client reviews beta and either APPROVES or REJECTS
3. If rejected, revision quota is consumed and team makes changes
4. When approved, client pays balance and receives FINAL deliverable (no watermark)

**Existing Tech Stack:**
- React 19.2.0 with TypeScript
- React Router DOM 7.9.6 (HashRouter)
- Tailwind CSS with custom design system
- Lucide React icons (ALWAYS use these, per CLAUDE.md)
- Recharts for data visualization

**Integration Point:**
This feature integrates as a TAB within the existing ProjectDetail page at `/projects/:id`. DO NOT create a separate route.

**Key Files to Examine:**
@pages/ProjectDetail.tsx - Understand the existing structure to integrate the deliverables tab
@components/Layout.tsx - Reference for consistent design patterns
@types.ts - Existing data models (Project, User, Deliverable interfaces)
@components/ui/design-system.tsx - Reusable UI components (if exists, otherwise create necessary components)
@features/pending/deliverable-approval/02-wireframes.md - UI specifications
@features/pending/deliverable-approval/03-data-models.md - TypeScript interfaces
@features/pending/deliverable-approval/README.md - Feature overview and business rules
</context>

<requirements>

## 1. Data Models & State Management

Create a Context API provider (`DeliverableContext`) with full state management:
- Deliverable list state with filtering/sorting
- Approval/rejection workflow state
- Revision quota tracking (project-level)
- Modal state management (review modal, revision form)
- Mock data for demo purposes (3-5 sample deliverables in various states)

TypeScript interfaces should include:
- `DeliverableStatus`: 'pending' | 'in_progress' | 'beta_ready' | 'awaiting_approval' | 'approved' | 'rejected' | 'payment_pending' | 'final_delivered'
- `Deliverable`: id, title, type, status, progress, dueDate, betaFileUrl, finalFileUrl, watermarked, approvalHistory, duration, format, resolution
- `DeliverableApproval`: id, deliverableId, action ('approved' | 'rejected'), feedback, timestampedComments, issueCategories, priority, attachments, timestamp, userId
- `TimestampedComment`: id, timestamp (seconds), comment, category, resolved
- `IssueCategory`: 'color' | 'audio' | 'timing' | 'editing' | 'content' | 'other'
- `Priority`: 'critical' | 'important' | 'nice-to-have'
- `FeedbackAttachment`: id, fileName, fileSize, fileType, url, thumbnailUrl
- `RevisionQuota`: total, used, remaining

## 2. Component Architecture

Build these components in `./components/deliverables/`:

**Core Components:**
- `DeliverablesTab.tsx` - Main tab content, integrates into ProjectDetail
- `DeliverablesList.tsx` - Grid/list view of all deliverables with status badges
- `DeliverableCard.tsx` - Individual deliverable card with thumbnail, status, progress
- `DeliverableReviewModal.tsx` - Full-screen modal with video player and approve/reject actions
- `RevisionRequestForm.tsx` - Enhanced form container with all feedback features
- `FinalDeliveryView.tsx` - Success state with download button and expiry notice
- `RevisionQuotaIndicator.tsx` - Visual quota tracker (e.g., "2/3 revisions used")
- `ApprovalTimeline.tsx` - History of approvals/rejections with timestamps and detailed feedback

**Revision Form Sub-Components:**
- `VideoCommentTimeline.tsx` - Video player with interactive timeline markers
- `TimestampComment.tsx` - Individual timestamp comment bubble/card
- `RichTextEditor.tsx` - Text feedback input with formatting toolbar
- `IssueCategorySelector.tsx` - Checkbox grid for issue categories with icons
- `PrioritySelector.tsx` - Radio button priority picker with color coding
- `FileUploadZone.tsx` - Drag-drop file upload with previews
- `FeedbackSummaryPanel.tsx` - Right sidebar showing all feedback before submission
- `AnnotationTool.tsx` - (Optional Phase 2) Screenshot annotation interface

**UI Components (create in `./components/ui/` if not already present):**
- `Badge.tsx` - Status badges with color coding
- `ProgressBar.tsx` - Deliverable progress indicator
- `Modal.tsx` - Full-screen modal wrapper
- `VideoPlayer.tsx` - HTML5 video player with watermark overlay and timeline interaction support

## 3. Feature Implementation

### Deliverables List View
- Grid layout (responsive: 1 col mobile, 2 cols tablet, 3 cols desktop)
- Each card shows: thumbnail, title, type (Video/Image/Document), status badge, progress bar, due date
- Filter by status (All, Beta Ready, Awaiting Approval, Approved, etc.)
- Sort by: Due Date, Status, Recently Updated
- Empty state when no deliverables
- Revision quota indicator at the top (e.g., "2 of 3 revisions used")

### Beta Review Modal
- Full-screen modal with dark background overlay
- HTML5 video player with:
  - Custom controls (play/pause, timeline, volume, fullscreen)
  - Watermark overlay (use CSS overlay with "BETA - DO NOT DISTRIBUTE" text)
  - Video metadata (duration, format, resolution)
- Deliverable details sidebar: title, description, upload date, version number
- Action buttons:
  - **Approve** (green, prominent) - Shows confirmation dialog
  - **Request Revision** (orange) - Opens RevisionRequestForm
  - **Close** (gray)
- Keyboard shortcuts: Space = play/pause, Esc = close modal

### Revision Request Form (Enhanced Feedback System)

Build a comprehensive feedback interface with multiple input methods:

**1. Timestamped Video Comments**
- Video player with timeline scrubber
- Click anywhere on the timeline to add a comment marker
- Comment markers appear as colored dots on the timeline
- Each marker shows timestamp (e.g., "0:32", "1:45")
- Click marker to view/edit comment at that timestamp
- Hover over marker shows preview tooltip with comment text
- Visual indicator when playing through a commented section

**2. Text Feedback Area**
- Rich text editor for general feedback (required, min 20 characters)
- Support for:
  - Bold, italic, lists for structured feedback
  - @mentions for team members (if multi-user)
  - Emoji reactions for tone (optional: 👍 😕 ⚠️)
- Character counter with minimum requirement indicator
- Auto-save draft feedback (localStorage) to prevent loss

**3. Issue Categorization**
- Checkbox categories with visual icons:
  - 🎨 **Color/Grading** - Color correction, grading issues
  - 🔊 **Audio** - Sound quality, mixing, voiceover
  - ⏱️ **Timing/Pacing** - Edit timing, transitions, duration
  - ✂️ **Editing** - Cuts, effects, overlays
  - 📝 **Content/Copy** - Text, messaging, accuracy
  - 🎭 **Other** - Miscellaneous issues
- Allow multiple selections
- Each selected category shows count badge (e.g., "Audio (2)")

**4. Visual Annotations (Optional but Impressive)**
- "Add Screenshot Comment" button that pauses video and captures current frame
- Annotate captured frame with:
  - Arrows pointing to specific areas
  - Text boxes explaining the issue
  - Highlight/circle tools to mark problem areas
- Each annotation saves with timestamp
- Show annotation thumbnails in feedback summary

**5. Priority Levels**
- Radio button selection for revision urgency:
  - 🔴 **Critical** - Blocks approval, must fix
  - 🟡 **Important** - Should fix for quality
  - 🟢 **Nice to have** - Optional improvement
- Default to "Important"
- Visual indicator (color + icon) next to priority selection

**6. Reference Attachments**
- File upload area for reference materials:
  - Images (style references, screenshots)
  - Documents (brand guidelines, scripts)
  - Max 5 files, 10MB total
- Drag-and-drop support
- Preview thumbnails for uploaded files
- Remove button for each attachment

**7. Feedback Summary Panel**
- Right sidebar showing:
  - List of all timestamped comments (chronological)
  - Selected issue categories with counts
  - Priority level indicator
  - Attached files list
  - Total character count
- "Review before submitting" checklist

**8. Submission & Quota**
- Revision quota warning prominently displayed:
  - "Using 1 of 3 remaining revisions"
  - Warning color if last revision: "⚠️ This is your final included revision"
  - Link to request additional revisions if quota exhausted
- Submit button:
  - Disabled until minimum feedback requirements met
  - Shows validation errors inline
  - Confirmation dialog: "Submit revision request? This will consume 1 revision."
- Success confirmation with:
  - Checkmark animation
  - "Revision request sent to the team"
  - Expected timeline: "Team will review within 2-3 business days"
  - Option to view submitted feedback summary

**9. Form Validation**
- Real-time validation:
  - Minimum 20 characters in text feedback ✓
  - At least one issue category selected ✓
  - Priority level chosen ✓
- Clear error messages above form:
  - "Please provide detailed feedback (minimum 20 characters)"
  - "Select at least one issue category"
- Disabled submit button until all requirements met

**UI Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Request Revision                                    [X]│
├─────────────────────────────────┬──────────────────────┤
│                                 │  Feedback Summary    │
│  Video Player with Timeline     │  ───────────────────│
│  [Commented markers shown]      │  📍 0:32 - Color...  │
│                                 │  📍 1:45 - Audio...  │
│  ─────────────────────────      │                      │
│                                 │  Categories:         │
│  Describe the changes needed:   │  🎨 Color (2)       │
│  [Rich text editor]             │  🔊 Audio (1)       │
│                                 │                      │
│  Issue Categories:              │  Priority: Important │
│  ☑ Color  ☑ Audio  ☐ Timing    │                      │
│                                 │  Files: 2 attached   │
│  Priority:                      │                      │
│  ○ Critical ⦿ Important ○ Nice  │  Quota: 2/3 used    │
│                                 │                      │
│  📎 Attach References           │  [Submit Request]    │
└─────────────────────────────────┴──────────────────────┘
```

**Component Structure:**
- `RevisionRequestForm.tsx` - Main form container
- `VideoCommentTimeline.tsx` - Video player with timeline markers
- `TimestampComment.tsx` - Individual timestamp comment component
- `RichTextEditor.tsx` - Text feedback input (use simple contenteditable or textarea with formatting buttons)
- `IssueCategorySelector.tsx` - Checkbox grid for categories
- `PrioritySelector.tsx` - Radio button priority picker
- `FileUploadZone.tsx` - Drag-drop file upload
- `FeedbackSummaryPanel.tsx` - Right sidebar summary
- `AnnotationTool.tsx` - Screenshot annotation interface (can be Phase 2 if complex)

### Approval Confirmation
- Success animation (checkmark animation or confetti effect)
- Next steps message: "Payment link will be sent to your email"
- Status changes to "Payment Pending"
- Option to view invoice/payment details

### Final Delivery View
- Shown when status = 'final_delivered'
- Large download button with file size and format
- Expiry notice: "Download available until [date] (365 days from approval)"
- File preview thumbnail
- Option to share download link (copy to clipboard)

## 4. Visual Design Requirements

**Design must follow these principles from @erik-kennedy-ui-heuristics.md:**
- Use hierarchy: Larger text for deliverable titles, smaller for metadata
- Consistent spacing: Use Tailwind spacing scale (4, 6, 8, 12, 16, 24)
- Color psychology:
  - Green (#10b981) for approved/success states
  - Orange (#f59e0b) for revision/warning states
  - Blue (#3b82f6) for in-progress states
  - Gray (#6b7280) for pending states
  - Red (#ef4444) for rejected/error states
- Shadows for depth: Use Tailwind shadow utilities for cards and modals
- Smooth transitions: 200-300ms duration for hover states and modal animations

**Status Badge Color Coding:**
- Pending: Gray
- In Progress: Blue
- Beta Ready: Purple
- Awaiting Approval: Orange
- Approved: Green
- Rejected: Red
- Payment Pending: Yellow
- Final Delivered: Emerald

## 5. Interactivity & State

Implement these user flows with full state management:

**Approve Flow:**
1. Click "Approve" in review modal
2. Show confirmation dialog: "Are you sure you want to approve this deliverable?"
3. On confirm: Update status to 'approved', add approval to history, show success animation
4. Close modal, update deliverable card status badge
5. Simulate API call with 500ms delay

**Reject Flow (Enhanced):**
1. Click "Request Revision" in review modal
2. Open enhanced RevisionRequestForm modal with video player
3. User interacts with multiple feedback methods:
   - Clicks on video timeline to add timestamped comments (e.g., at 0:32, 1:45)
   - Writes general feedback in rich text editor
   - Selects issue categories (Color, Audio, Timing, etc.)
   - Sets priority level (Critical, Important, Nice-to-have)
   - Optionally uploads reference files
4. Feedback summary panel updates in real-time showing all comments
5. Form validates: min 20 chars feedback + at least 1 category + priority selected
6. On submit: Show confirmation dialog with quota warning
7. On confirm: Check quota, consume 1 revision, update status to 'rejected'
8. Add detailed rejection to approval history with:
   - All timestamped comments
   - Issue categories selected
   - Priority level
   - Attached files
   - General feedback text
9. Show success confirmation: "Revision request sent to the team"
10. Update UI to reflect new quota and status
11. Timeline shows rich feedback summary in approval history

**Quota Management:**
- Display quota prominently at top of deliverables list
- Warn when 1 revision remaining
- Block revision requests when quota exhausted (show upgrade prompt)
- Visual progress indicator (e.g., 3 circles, 2 filled = 2 used)

## 6. Mock Data for Demo

Create realistic mock data with:
- Project with 3-5 deliverables in various states
- At least one in 'beta_ready' (can be reviewed - this is the main demo deliverable)
- At least one in 'awaiting_approval' (pending client action)
- At least one in 'approved' or 'final_delivered' (success state)
- At least one 'rejected' deliverable with rich feedback history to showcase the enhanced feedback system
- Sample video URLs (use placeholder services like `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4` or other free sample videos)
- Video metadata: duration (e.g., "2:45"), format (e.g., "MP4"), resolution (e.g., "1920x1080")
- Approval history with timestamps and user info
- For rejected deliverables, include sample feedback data:
  - 2-3 timestamped comments (e.g., "0:32 - Color grading too warm here", "1:45 - Audio levels too low")
  - Multiple issue categories selected (e.g., Color + Audio)
  - Priority level (e.g., "Important")
  - Mock attachment references (e.g., "brand-guidelines.pdf", "reference-image.jpg")
  - Rich text feedback with formatting
- Revision quota: total=3, used=2 (to show quota pressure and warn user)
- Include at least one approval with simple feedback for contrast

## 7. Integration with ProjectDetail

**Modify `pages/ProjectDetail.tsx` to:**
1. Add a "Deliverables" tab to the existing tab navigation
2. Conditionally render `<DeliverablesTab />` when deliverables tab is active
3. Maintain existing tabs (Overview, Tasks, Files, Settings, etc.)
4. Pass project ID as prop to DeliverablesTab for context
5. Use React Router's `useSearchParams` or hash navigation for tab state

**DO NOT:**
- Create a separate route
- Break existing ProjectDetail functionality
- Remove or modify other tabs
- Change the overall layout structure
</requirements>

<implementation>

## File Organization

```
components/
  deliverables/
    DeliverablesTab.tsx          # Main entry point, integrates with ProjectDetail
    DeliverablesList.tsx          # Grid view of deliverables
    DeliverableCard.tsx           # Individual deliverable card
    DeliverableReviewModal.tsx    # Full-screen review modal
    RevisionRequestForm.tsx       # Revision request form modal
    FinalDeliveryView.tsx         # Final download view
    RevisionQuotaIndicator.tsx    # Quota tracker component
    ApprovalTimeline.tsx          # Approval history timeline
    DeliverableContext.tsx        # Context provider for state management

  ui/                              # Shared UI components (create if missing)
    Badge.tsx
    ProgressBar.tsx
    Modal.tsx
    VideoPlayer.tsx

pages/
  ProjectDetail.tsx               # MODIFY to integrate deliverables tab

types/
  deliverable.types.ts            # New type definitions for deliverables
```

## Code Quality Standards

- Use TypeScript with strict mode, no `any` types
- Functional components with React hooks
- Use Tailwind classes exclusively (no inline styles or CSS files)
- Lucide React for ALL icons (per CLAUDE.md requirement)
- Proper prop typing with TypeScript interfaces
- Accessibility: aria-labels, keyboard navigation, focus management
- Responsive design: mobile-first approach
- Error boundaries for video player failures
- Loading states for async operations (simulate with setTimeout)

## State Management Pattern

Use Context API with reducer pattern:

```typescript
// DeliverableContext.tsx structure
interface DeliverableState {
  deliverables: Deliverable[];
  quota: RevisionQuota;
  selectedDeliverable: Deliverable | null;
  isReviewModalOpen: boolean;
  isRevisionFormOpen: boolean;
  filter: DeliverableStatus | 'all';
  sortBy: 'dueDate' | 'status' | 'updated';
}

type DeliverableAction =
  | { type: 'APPROVE_DELIVERABLE'; id: string }
  | { type: 'REJECT_DELIVERABLE'; id: string; feedback: DeliverableApproval }
  | { type: 'ADD_TIMESTAMP_COMMENT'; timestamp: number; comment: string; category: IssueCategory }
  | { type: 'REMOVE_TIMESTAMP_COMMENT'; commentId: string }
  | { type: 'UPDATE_FEEDBACK_TEXT'; text: string }
  | { type: 'TOGGLE_ISSUE_CATEGORY'; category: IssueCategory }
  | { type: 'SET_PRIORITY'; priority: Priority }
  | { type: 'ADD_ATTACHMENT'; file: FeedbackAttachment }
  | { type: 'REMOVE_ATTACHMENT'; fileId: string }
  | { type: 'OPEN_REVIEW_MODAL'; deliverable: Deliverable }
  | { type: 'CLOSE_REVIEW_MODAL' }
  | { type: 'SET_FILTER'; filter: DeliverableStatus | 'all' }
  | { type: 'SET_SORT'; sortBy: string };
```

## Animation Requirements

- Fade-in animations for modal overlays (200ms)
- Slide-up animations for forms (300ms)
- Success checkmark animation on approval (use CSS animations or Framer Motion if needed)
- Smooth hover transitions on cards (150ms)
- Progress bar animations (use CSS transitions)

## Accessibility

- Modal focus trapping (focus should stay within modal when open)
- Escape key closes modals
- Keyboard navigation for video player
- Screen reader friendly status badges
- Proper heading hierarchy (h2, h3, h4)
- Color contrast meets WCAG AA standards
</implementation>

<output>
Create or modify the following files:

1. **Core Deliverable Components:**
   - `./components/deliverables/DeliverableContext.tsx` - Context provider with state management
   - `./components/deliverables/DeliverablesTab.tsx` - Main tab component
   - `./components/deliverables/DeliverablesList.tsx` - Grid view
   - `./components/deliverables/DeliverableCard.tsx` - Card component
   - `./components/deliverables/DeliverableReviewModal.tsx` - Review modal
   - `./components/deliverables/RevisionQuotaIndicator.tsx` - Quota tracker
   - `./components/deliverables/ApprovalTimeline.tsx` - History timeline with rich feedback display
   - `./components/deliverables/mockDeliverables.ts` - Mock data

2. **Enhanced Revision Form Components:**
   - `./components/deliverables/RevisionRequestForm.tsx` - Main form container
   - `./components/deliverables/VideoCommentTimeline.tsx` - Video player with timeline markers
   - `./components/deliverables/TimestampComment.tsx` - Individual timestamp comment
   - `./components/deliverables/RichTextEditor.tsx` - Text feedback input
   - `./components/deliverables/IssueCategorySelector.tsx` - Category checkbox grid
   - `./components/deliverables/PrioritySelector.tsx` - Priority radio buttons
   - `./components/deliverables/FileUploadZone.tsx` - File upload with drag-drop
   - `./components/deliverables/FeedbackSummaryPanel.tsx` - Feedback summary sidebar

3. **TypeScript Definitions:**
   - `./types/deliverable.types.ts` - All TypeScript interfaces (Deliverable, DeliverableApproval, TimestampedComment, IssueCategory, Priority, FeedbackAttachment, RevisionQuota)

4. **UI Components (create if not present):**
   - `./components/ui/Badge.tsx` - Status badges
   - `./components/ui/ProgressBar.tsx` - Progress indicator
   - `./components/ui/Modal.tsx` - Modal wrapper
   - `./components/ui/VideoPlayer.tsx` - Video player with watermark support

5. **Modifications:**
   - `./pages/ProjectDetail.tsx` - Add deliverables tab integration

Each file should be production-ready with:
- Full TypeScript typing
- Comprehensive comments explaining business logic
- Proper error handling
- Responsive design
- Accessibility features
</output>

<verification>
Before declaring complete, verify:

1. **Visual Quality:**
   - Run `npm run dev` and navigate to a project detail page
   - Deliverables tab appears and is clickable
   - All components render without console errors
   - Design matches the quality of existing Layout component
   - Responsive on mobile, tablet, desktop (test with browser DevTools)

2. **Functional Testing:**
   - Click on a deliverable card → review modal opens with video player
   - Video plays correctly with watermark overlay visible
   - Click "Approve" → confirmation dialog → status updates to approved
   - Click "Request Revision" → enhanced form opens with:
     - Video player with clickable timeline
     - Add timestamped comment by clicking timeline → marker appears
     - Type feedback text → character counter updates
     - Select issue categories → count badges update
     - Choose priority level → visual indicator changes
     - Upload file → preview thumbnail appears
     - Feedback summary panel updates in real-time
     - Submit → quota decrements, status updates, feedback saved
   - Quota indicator updates in real-time
   - Filter and sort controls work correctly
   - All modals close with Escape key and close button
   - View approval history → see rich feedback details from previous rejections

3. **Code Quality:**
   - No TypeScript errors (`tsc --noEmit`)
   - No unused imports or variables
   - All Lucide React icons imported correctly
   - Consistent Tailwind class usage
   - Proper component composition (no 500+ line components)

4. **Integration:**
   - ProjectDetail page still shows all existing tabs
   - Deliverables tab integrates seamlessly
   - No broken functionality in other parts of the app
   - Browser console is clean (no warnings or errors)

5. **Demo Readiness:**
   - Mock data is realistic and visually impressive
   - All states are represented (pending, approved, rejected, etc.)
   - Quota shows realistic usage (e.g., 2/3 used)
   - At least one deliverable is in 'beta_ready' state for live demo
</verification>

<success_criteria>
This feature is complete when:

1. ✅ Client can view all deliverables in a beautiful grid layout
2. ✅ Client can click on a beta deliverable and watch the video in a full-screen modal
3. ✅ Client can approve a deliverable (with confirmation animation)
4. ✅ Client can request a revision using the ENHANCED FEEDBACK SYSTEM:
   - Click on video timeline to add timestamped comments
   - Write detailed text feedback with rich formatting
   - Select multiple issue categories (Color, Audio, Timing, etc.)
   - Set priority level (Critical, Important, Nice-to-have)
   - Upload reference files with drag-drop
   - See real-time feedback summary before submission
5. ✅ Revision quota is prominently displayed and updates in real-time
6. ✅ All status badges are color-coded and accurate
7. ✅ Approval history timeline shows all past actions WITH RICH FEEDBACK DETAILS:
   - Timestamped comments displayed inline
   - Issue categories with icons
   - Priority indicators
   - Attached file references
8. ✅ Final delivery view shows download button for approved deliverables
9. ✅ Design quality matches or exceeds existing portal pages
10. ✅ Video player with timeline markers is smooth and intuitive
11. ✅ Form validation works correctly (prevents submission without required fields)
12. ✅ Feature is easily pluggable with real API (all state management uses Context, mock API calls have clear placeholders)

**IMPORTANT:** Go beyond the basics - create a fully-featured, polished implementation that will impress the client. This is a demo, so prioritize visual polish and smooth interactions over backend integration.
</success_criteria>



<constraints>
- DO NOT create separate routes - integrate as a tab in ProjectDetail
- DO NOT modify the Layout component or routing structure
- DO NOT use external UI libraries - build with Tailwind and existing design system
- DO NOT use inline styles - Tailwind classes only
- DO NOT use any icons except Lucide React (per CLAUDE.md)
- DO NOT create backend API calls - use mock data and simulated delays
- DO NOT use `any` type in TypeScript
- DO NOT skip responsive design - mobile experience is crucial

WHY these constraints matter:
- Integration as a tab keeps navigation simple and avoids route complexity
- Tailwind-only styling ensures consistency with existing design system
- Lucide React icons are a project standard for visual consistency
- Mock data allows frontend demo without backend dependencies
- TypeScript strictness prevents runtime errors in the demo
- Responsive design ensures impressive demo on any device
</constraints>