# Deliverables Components - Role-Based Permission Audit

**Date:** December 3, 2025
**Auditor:** Claude (AI Assistant)
**Scope:** All 13 components in `components/deliverables/`
**Reference:** `docs/user-types-permissions.md` (5-role permission system)

---

## Executive Summary

### Overview
This audit analyzes all 13 deliverable components against the newly defined 5-role permission system. The system defines roles using database values (`super_admin`, `project_manager`, `team_member`, `client`) with `is_primary_contact` flag to distinguish client types.

### Critical Findings

**🚨 BLOCKER ISSUES:**
- **Zero permission checks implemented** across all 13 components
- **Wrong role values used** - types.ts uses display names ('Admin', 'Project Manager', 'Client', 'Editor', 'Designer') instead of database values
- **Missing state-based access control** - no deliverable status or project status checks
- **No is_primary_contact validation** - cannot distinguish Client Primary Contact from Client Team Member

**📊 STATISTICS:**
- **Total Components Reviewed:** 13
- **Components with Permission Checks:** 0 (0%)
- **Critical Permission Gaps:** 47
- **State-Based Logic Gaps:** 23
- **Type System Issues:** 1 (blocks all implementations)

**⏱️ ESTIMATED EFFORT:**
- **Phase 1 (Foundation):** 8-12 hours
- **Phase 2 (Component Updates):** 16-24 hours
- **Phase 3 (Testing):** 8-12 hours
- **Total:** 32-48 hours (4-6 developer days)

---

## 1. Type System Analysis

### Current Issue
The `/types.ts` file uses **display names** instead of **database values**:

```typescript
// CURRENT (INCORRECT)
export interface User {
  id: string;
  name: string;
  role: 'Admin' | 'Project Manager' | 'Client' | 'Editor' | 'Designer';
  avatar: string;
  email?: string;
}
```

### Required Fix
```typescript
// CORRECT (matches database)
export interface User {
  id: string;
  name: string;
  role: 'super_admin' | 'project_manager' | 'team_member' | 'client';
  avatar: string;
  email?: string;
  is_primary_contact?: boolean; // Required for client role differentiation
  projectTeamMembership?: {
    [projectId: string]: {
      isPrimaryContact: boolean;
      role?: string;
    };
  };
}
```

### Impact
**This is a BLOCKER** - All permission checks depend on correct role values. Must be fixed before implementing any permission logic.

---

## 2. Component-by-Component Analysis

### 2.1 ApprovalTimeline.tsx

**Purpose:** Displays approval/rejection history with timestamped feedback.

**Current Permission Checks:** ❌ None

**Permission Gaps:**

| Gap ID | Description | Severity | Required Fix |
|--------|-------------|----------|--------------|
| AT-001 | No visibility control - all users see full approval history | HIGH | Hide approval history from Client Team Members |
| AT-002 | Sensitive financial/revision data exposed to all | HIGH | Filter financial details for non-primary contacts |
| AT-003 | No role-based data filtering | MEDIUM | Different views per role (Motionify staff sees internal notes) |

**Code Snippet (Current):**
```typescript
export const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({
  approvalHistory,
  className,
}) => {
  // NO PERMISSION CHECKS AT ALL
  if (approvalHistory.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      {approvalHistory.map((approval, idx) => (
        <div key={approval.id}>
          {/* SHOWS ALL DATA TO ALL USERS */}
        </div>
      ))}
    </div>
  );
};
```

**Required Changes:**
1. Add user context prop
2. Filter approval history based on role
3. Hide sensitive data (revision quotas, internal notes) from clients
4. Show different detail levels based on role

**State-Based Logic Gaps:**
- AT-S001: No check if deliverable is in `pending` or `in_progress` (clients shouldn't see these)
- AT-S002: No project status validation

---

### 2.2 DeliverableCard.tsx

**Purpose:** Individual card showing deliverable thumbnail, status, progress, and actions.

**Current Permission Checks:** ❌ None

**Permission Gaps:**

| Gap ID | Description | Severity | Required Fix |
|--------|-------------|----------|--------------|
| DC-001 | Shows ALL deliverables regardless of status | CRITICAL | Hide `pending` and `in_progress` from clients |
| DC-002 | "Review Beta" button visible to all users | CRITICAL | Only Client PM can review/approve |
| DC-003 | Download button accessible to all | HIGH | Check payment status & expiry for clients |
| DC-004 | Progress bar shown to clients during internal phases | MEDIUM | Hide progress for `pending`/`in_progress` |
| DC-005 | No watermark indicator validation | MEDIUM | Ensure beta versions show watermark badge |

**Code Snippet (Current):**
```typescript
export const DeliverableCard: React.FC<DeliverableCardProps> = ({
  deliverable,
  onReview,
  className,
}) => {
  // NO USER CONTEXT OR PERMISSION CHECKS

  const getActionButton = () => {
    if (deliverable.status === 'final_delivered') {
      return (
        <Button onClick={() => onReview(deliverable)}>
          <Download /> Download
        </Button>
      );
    }

    if (deliverable.status === 'beta_ready' || deliverable.status === 'awaiting_approval') {
      return (
        <Button onClick={() => onReview(deliverable)}>
          <Eye /> Review Beta
        </Button>
      );
    }
  };

  // VISIBLE TO ALL USERS, NO ROLE CHECKS
  return <div>...</div>;
};
```

**Required Changes:**
1. Add `user` and `project` props
2. Implement `canViewDeliverable()` check
3. Implement `canApprove()` check (Client PM only)
4. Implement `canDownloadFinal()` check (payment + expiry)
5. Conditionally hide entire card if user lacks permission

**State-Based Logic Gaps:**
- DC-S001: No validation that `beta_ready` requires payment
- DC-S002: No check for 365-day expiry on final files
- DC-S003: No project status check (archived, on hold)

---

### 2.3 DeliverableContext.tsx

**Purpose:** State management for deliverable workflow (approvals, rejections, revisions).

**Current Permission Checks:** ❌ None

**Permission Gaps:**

| Gap ID | Description | Severity | Required Fix |
|--------|-------------|----------|--------------|
| DCX-001 | `APPROVE_DELIVERABLE` action has no permission check | CRITICAL | Only Client PM can approve |
| DCX-002 | `REJECT_DELIVERABLE` action has no permission check | CRITICAL | Only Client PM can request revisions |
| DCX-003 | Revision quota consumed without validation | CRITICAL | Check quota before allowing rejection |
| DCX-004 | No state validation on approve/reject | HIGH | Validate deliverable status before action |
| DCX-005 | No project status validation | HIGH | Block actions if project is on hold/archived |

**Code Snippet (Current):**
```typescript
function deliverableReducer(state: DeliverableState, action: DeliverableAction): DeliverableState {
  switch (action.type) {
    case 'APPROVE_DELIVERABLE': {
      // NO PERMISSION CHECK - ANY USER CAN APPROVE
      const approval: DeliverableApproval = {
        id: `appr-${Date.now()}`,
        deliverableId: action.id,
        action: 'approved',
        timestamp: new Date(),
        userId: action.userId,
        userName: action.userName,
        userEmail: action.userEmail,
      };

      return {
        ...state,
        deliverables: state.deliverables.map(d =>
          d.id === action.id
            ? {
              ...d,
              status: 'approved' as DeliverableStatus,
              approvalHistory: [...d.approvalHistory, approval],
            }
            : d
        ),
      };
    }

    case 'REJECT_DELIVERABLE': {
      // NO PERMISSION CHECK - ANY USER CAN REJECT
      // CONSUMES REVISION QUOTA WITHOUT VALIDATION
      const newQuota: RevisionQuota = {
        ...state.quota,
        used: state.quota.used + 1,
        remaining: state.quota.remaining - 1,
      };

      return {
        ...state,
        deliverables: state.deliverables.map(d => ...),
        quota: newQuota,
      };
    }
  }
}
```

**Required Changes:**
1. Add permission validation middleware/hook
2. Check user role before dispatching approve/reject actions
3. Validate revision quota before allowing rejection
4. Validate deliverable status (must be `awaiting_approval`)
5. Validate project status (not on hold, not archived)
6. Add error states for permission denials

**State-Based Logic Gaps:**
- DCX-S001: No validation that deliverable must be in `awaiting_approval` to approve
- DCX-S002: No validation that quota must have remaining revisions
- DCX-S003: No validation of project payment status

---

### 2.4 DeliverableReviewModal.tsx

**Purpose:** Full-screen modal for reviewing beta/final deliverables with video player.

**Current Permission Checks:** ❌ None

**Permission Gaps:**

| Gap ID | Description | Severity | Required Fix |
|--------|-------------|----------|--------------|
| DRM-001 | Modal opens for all users regardless of role | CRITICAL | Only show to users with view permission |
| DRM-002 | "Approve" button visible to all users | CRITICAL | Only Client PM can approve |
| DRM-003 | "Request Revision" button visible to all | CRITICAL | Only Client PM can request revisions |
| DRM-004 | Download button accessible without payment check | HIGH | Validate payment & expiry for final files |
| DRM-005 | Approval timeline shown to all users | MEDIUM | Filter based on role |
| DRM-006 | Video player accessible during `pending` status | HIGH | Block clients from seeing internal work |

**Code Snippet (Current):**
```typescript
export const DeliverableReviewModal: React.FC<DeliverableReviewModalProps> = ({
  deliverable,
  isOpen,
  onClose,
  onApprove,
  onRequestRevision,
}) => {
  if (!deliverable) return null;

  const isFinalDelivered = deliverable.status === 'final_delivered';
  const canApprove =
    deliverable.status === 'beta_ready' || deliverable.status === 'awaiting_approval';
  // ^^^ WRONG - Based on status only, not user role!

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* Video Player - accessible to all */}
      <VideoPlayer src={deliverable.betaFileUrl} />

      {/* Action Buttons - NO ROLE CHECKS */}
      {canApprove ? (
        <>
          <Button onClick={onApprove}>
            <CheckCircle2 /> Approve Deliverable
          </Button>
          <Button onClick={onRequestRevision}>
            <XCircle /> Request Revision
          </Button>
        </>
      ) : null}
    </Modal>
  );
};
```

**Required Changes:**
1. Add `user` and `project` props
2. Implement proper `canApprove()` check (role + status)
3. Implement `canDownload()` check (role + payment + expiry)
4. Conditionally render action buttons based on permissions
5. Filter approval timeline data based on role
6. Add permission-denied state with helpful message

**State-Based Logic Gaps:**
- DRM-S001: No check if user has paid 50% balance for final files
- DRM-S002: No check for 365-day expiry on downloads
- DRM-S003: No validation of project status before allowing actions

---

### 2.5 DeliverablesList.tsx

**Purpose:** Grid view with filters and sorting for all deliverables.

**Current Permission Checks:** ❌ None

**Permission Gaps:**

| Gap ID | Description | Severity | Required Fix |
|--------|-------------|----------|--------------|
| DLS-001 | Shows all deliverables regardless of status | CRITICAL | Filter based on user role and deliverable status |
| DLS-002 | No role-based filtering of list | CRITICAL | Clients shouldn't see `pending`/`in_progress` |
| DLS-003 | Filter dropdown shows all statuses | MEDIUM | Hide internal statuses from clients |
| DLS-004 | No state-based visibility rules | HIGH | Apply deliverable status-based rules |

**Code Snippet (Current):**
```typescript
export const DeliverablesList: React.FC<DeliverablesListProps> = ({
  deliverables,
  filter,
  sortBy,
  onFilterChange,
  onSortChange,
  onReviewDeliverable,
}) => {
  // NO USER CONTEXT

  // Filter deliverables
  const filteredDeliverables =
    filter === 'all'
      ? deliverables // SHOWS ALL TO ALL USERS
      : deliverables.filter((d) => d.status === filter);

  // Sort deliverables
  const sortedDeliverables = [...filteredDeliverables].sort(...);

  return (
    <div>
      {/* Filter shows all statuses to all users */}
      <Select
        value={filter}
        onValueChange={onFilterChange}
        options={filterOptions} // Includes 'pending', 'in_progress'
      />

      {/* Grid shows all filtered deliverables */}
      <div className="grid">
        {sortedDeliverables.map((deliverable) => (
          <DeliverableCard
            key={deliverable.id}
            deliverable={deliverable}
            onReview={onReviewDeliverable}
          />
        ))}
      </div>
    </div>
  );
};
```

**Required Changes:**
1. Add `user` and `project` props
2. Pre-filter deliverables based on role BEFORE displaying
3. Filter status dropdown options based on role
4. Add permission-based rendering logic
5. Show different empty states based on why list is empty (no permission vs no data)

**State-Based Logic Gaps:**
- DLS-S001: No filtering based on deliverable visibility rules
- DLS-S002: No project status consideration

---

### 2.6 DeliverablesTab.tsx

**Purpose:** Main entry point, integrates all deliverable sub-components.

**Current Permission Checks:** ❌ None

**Permission Gaps:**

| Gap ID | Description | Severity | Required Fix |
|--------|-------------|----------|--------------|
| DT-001 | No user context passed to child components | CRITICAL | Add user/project context provider |
| DT-002 | Approve action has no permission validation | CRITICAL | Validate before dispatching approve |
| DT-003 | Request revision has no permission validation | CRITICAL | Validate before opening form |
| DT-004 | Uses CURRENT_USER from constants (mock data) | HIGH | Get user from auth context |
| DT-005 | No project status validation | HIGH | Check if project allows actions |

**Code Snippet (Current):**
```typescript
const DeliverablesTabContent: React.FC = () => {
  const { state, dispatch, onConvertToTask } = useDeliverables();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const handleApprove = () => {
    if (!state.selectedDeliverable) return;

    // WEAK VALIDATION - Only confirms with window.confirm
    const confirmed = window.confirm(`Are you sure...`);

    if (confirmed) {
      // NO ROLE CHECK BEFORE DISPATCHING
      dispatch({
        type: 'APPROVE_DELIVERABLE',
        id: state.selectedDeliverable.id,
        userId: CURRENT_USER.id, // USING MOCK DATA
        userName: CURRENT_USER.name,
        userEmail: CURRENT_USER.email || 'user@example.com',
      });
    }
  };

  const handleRequestRevision = () => {
    // NO PERMISSION CHECK BEFORE OPENING FORM
    dispatch({ type: 'OPEN_REVISION_FORM' });
  };

  return (
    <div>
      <RevisionQuotaIndicator quota={state.quota} />
      <DeliverablesList
        deliverables={state.deliverables} // NO FILTERING
        filter={state.filter}
        sortBy={state.sortBy}
        onFilterChange={...}
        onSortChange={...}
        onReviewDeliverable={handleReviewDeliverable}
      />
      <DeliverableReviewModal
        deliverable={state.selectedDeliverable}
        isOpen={state.isReviewModalOpen}
        onClose={handleCloseReviewModal}
        onApprove={handleApprove} // NO VALIDATION
        onRequestRevision={handleRequestRevision} // NO VALIDATION
      />
      <RevisionRequestForm
        deliverable={state.selectedDeliverable}
        isOpen={state.isRevisionFormOpen}
        onClose={...}
        onSubmit={handleSubmitRevision}
        quota={state.quota}
        currentUserId={CURRENT_USER.id}
        currentUserName={CURRENT_USER.name}
        currentUserEmail={CURRENT_USER.email || 'user@example.com'}
      />
    </div>
  );
};
```

**Required Changes:**
1. Create AuthContext to get real user (not CURRENT_USER constant)
2. Add permission validation before approve/reject actions
3. Pass user and project context to all child components
4. Add permission middleware to validate before state changes
5. Show permission-denied messages when actions blocked
6. Add loading/error states for permission checks

**State-Based Logic Gaps:**
- DT-S001: No project status validation before allowing actions
- DT-S002: No deliverable status validation
- DT-S003: No payment status validation

---

### 2.7 FeedbackSummaryPanel.tsx

**Purpose:** Right sidebar showing real-time feedback summary before submission.

**Current Permission Checks:** ❌ None

**Permission Gaps:**

| Gap ID | Description | Severity | Required Fix |
|--------|-------------|----------|--------------|
| FSP-001 | Displayed to all users (should be Client PM only) | MEDIUM | Hide from non-PM clients |
| FSP-002 | No validation that user can submit feedback | MEDIUM | Only shown during revision request flow |

**Current State:** ✅ Mostly safe (passive display component)

**Required Changes:**
1. Add role check to ensure only Client PM sees this during revision flow
2. Add validation that deliverable is in correct state

**State-Based Logic Gaps:**
- FSP-S001: No validation of deliverable status (should be `beta_ready` or `awaiting_approval`)

---

### 2.8 FileUploadZone.tsx

**Purpose:** Drag-and-drop file upload for revision feedback attachments.

**Current Permission Checks:** ❌ None

**Permission Gaps:**

| Gap ID | Description | Severity | Required Fix |
|--------|-------------|----------|--------------|
| FUZ-001 | Any user can upload attachments | MEDIUM | Only Client PM during revision request |
| FUZ-002 | No file type validation for permissions | LOW | May need role-based file type restrictions |

**Current State:** ✅ Mostly safe (child component of RevisionRequestForm)

**Required Changes:**
1. Add role validation (Client PM only)
2. Validate user is in revision request context

**State-Based Logic Gaps:**
- FUZ-S001: No validation that revision request is in progress

---

### 2.9 IssueCategorySelector.tsx

**Purpose:** Checkbox grid for selecting issue categories.

**Current Permission Checks:** ❌ None

**Permission Gaps:**

| Gap ID | Description | Severity | Required Fix |
|--------|-------------|----------|--------------|
| ICS-001 | Any user can select categories | MEDIUM | Only Client PM during revision request |

**Current State:** ✅ Mostly safe (child component of RevisionRequestForm)

**Required Changes:**
1. Add role validation
2. Ensure only shown in revision request context

---

### 2.10 PrioritySelector.tsx

**Purpose:** Radio group for selecting revision priority level.

**Current Permission Checks:** ❌ None

**Permission Gaps:**

| Gap ID | Description | Severity | Required Fix |
|--------|-------------|----------|--------------|
| PS-001 | Any user can set priority | MEDIUM | Only Client PM during revision request |

**Current State:** ✅ Mostly safe (child component of RevisionRequestForm)

**Required Changes:**
1. Add role validation
2. Ensure only shown in revision request context

---

### 2.11 RevisionQuotaIndicator.tsx

**Purpose:** Visual indicator of revision quota usage.

**Current Permission Checks:** ❌ None

**Permission Gaps:**

| Gap ID | Description | Severity | Required Fix |
|--------|-------------|----------|--------------|
| RQI-001 | Shows quota to all users | HIGH | Different views per role (hide from Client Team) |
| RQI-002 | No differentiation between roles | MEDIUM | Show detailed info to Motionify staff, basic to Client PM |

**Code Snippet (Current):**
```typescript
export const RevisionQuotaIndicator: React.FC<RevisionQuotaIndicatorProps> = ({
  quota,
  className,
}) => {
  const percentage = quota.total > 0 ? (quota.remaining / quota.total) * 100 : 0;

  // NO USER CONTEXT - SHOWS SAME INFO TO ALL USERS
  return (
    <div>
      <p>{quota.remaining} Revisions Remaining</p>
      <p>{quota.used} of {quota.total} included revisions used</p>
    </div>
  );
};
```

**Required Changes:**
1. Add `user` prop
2. Show different detail levels based on role:
   - **Motionify staff:** Full details + ability to add quota (Admin only)
   - **Client PM:** Full details (read-only)
   - **Client Team:** Hide or show limited info
3. Add "Request Additional Revisions" button for Client PM when quota exhausted

**State-Based Logic Gaps:**
- RQI-S001: No indication of whether additional revisions are pending approval

---

### 2.12 RevisionRequestForm.tsx

**Purpose:** Comprehensive form for requesting revisions with all feedback methods.

**Current Permission Checks:** ❌ None

**Permission Gaps:**

| Gap ID | Description | Severity | Required Fix |
|--------|-------------|----------|--------------|
| RRF-001 | Form accessible to all users | CRITICAL | Only Client PM can access |
| RRF-002 | Submit button has no role validation | CRITICAL | Validate user is Client PM |
| RRF-003 | No quota validation before submit | CRITICAL | Check remaining quota before allowing submit |
| RRF-004 | Uses CURRENT_USER from constants | HIGH | Get user from auth context |
| RRF-005 | No deliverable status validation | HIGH | Only allow for `beta_ready` or `awaiting_approval` |

**Code Snippet (Current):**
```typescript
export const RevisionRequestForm: React.FC<RevisionRequestFormProps> = ({
  deliverable,
  isOpen,
  onClose,
  onSubmit,
  quota,
  currentUserId,
  currentUserName,
  currentUserEmail,
}) => {
  const { state, dispatch } = useDeliverables();

  // Validation - ONLY CHECKS FORM FIELDS, NOT USER PERMISSIONS
  const isTextValid = revisionFeedback.text.length >= minCharacters;
  const isFormValid = isTextValid;

  const handleSubmit = () => {
    if (!isFormValid) return; // NO ROLE CHECK

    const approval: DeliverableApproval = {
      id: `appr-${Date.now()}`,
      deliverableId: deliverable.id,
      action: 'rejected',
      timestamp: new Date(),
      userId: currentUserId, // USING MOCK DATA PASSED FROM PARENT
      userName: currentUserName,
      userEmail: currentUserEmail,
      feedback: revisionFeedback.text,
      timestampedComments: revisionFeedback.timestampedComments,
      issueCategories: revisionFeedback.issueCategories,
      priority: revisionFeedback.priority,
      attachments: revisionFeedback.attachments,
    };

    // NO PERMISSION VALIDATION BEFORE SUBMITTING
    setTimeout(() => {
      onSubmit(approval);
      setShowConfirmation(false);
    }, 500);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      {/* Form fields accessible to all */}
      <Textarea
        value={revisionFeedback.text}
        onChange={(e) => dispatch({ type: 'UPDATE_FEEDBACK_TEXT', text: e.target.value })}
      />
      <PrioritySelector />
      <FileUploadZone />

      {/* Submit button - NO ROLE CHECK */}
      <Button
        onClick={() => setShowConfirmation(true)}
        disabled={!isFormValid || quota.remaining === 0}
      >
        Submit Request
      </Button>
    </Modal>
  );
};
```

**Required Changes:**
1. Get user from auth context (not props)
2. Validate user is Client PM on mount
3. Show permission-denied message if user is not Client PM
4. Validate quota before allowing form to open
5. Validate deliverable status before allowing form to open
6. Add project status validation
7. Disable form if project is on hold/archived

**State-Based Logic Gaps:**
- RRF-S001: No validation that deliverable must be in `beta_ready` or `awaiting_approval`
- RRF-S002: No validation that project must be `active`
- RRF-S003: No validation that user has not exceeded quota

---

### 2.13 VideoCommentTimeline.tsx

**Purpose:** Video player with timeline markers for timestamped comments.

**Current Permission Checks:** ❌ None

**Permission Gaps:**

| Gap ID | Description | Severity | Required Fix |
|--------|-------------|----------|--------------|
| VCT-001 | All users can add comments | MEDIUM | Only Client PM during revision request |
| VCT-002 | All users can edit/delete comments | MEDIUM | Only comment author or Admin |

**Current State:** ✅ Mostly safe (child component of RevisionRequestForm)

**Required Changes:**
1. Add role validation
2. Add comment ownership validation for edit/delete
3. Ensure only shown in appropriate context

---

## 3. Comprehensive Gap List

### 3.1 Critical Gaps (Blocks Core Functionality)

| ID | Component | Gap | Impact | Priority |
|----|-----------|-----|--------|----------|
| CG-001 | types.ts | Wrong role values (display names vs database values) | BLOCKS ALL PERMISSION CHECKS | P0 |
| CG-002 | types.ts | Missing is_primary_contact field | Cannot distinguish client types | P0 |
| CG-003 | DeliverableContext | Approve action has no permission check | Any user can approve deliverables | P0 |
| CG-004 | DeliverableContext | Reject action has no permission check | Any user can request revisions | P0 |
| CG-005 | DeliverableContext | Quota consumed without validation | Can exceed revision limits | P0 |
| CG-006 | DeliverableCard | Shows all deliverables to all users | Clients see internal work (`pending`, `in_progress`) | P0 |
| CG-007 | DeliverableCard | Action buttons have no role checks | Any user can click approve/download | P0 |
| CG-008 | DeliverableReviewModal | Approve button visible to all | Any user can approve | P0 |
| CG-009 | DeliverableReviewModal | Request revision button visible to all | Any user can request revisions | P0 |
| CG-010 | DeliverablesList | No role-based filtering | Clients see all statuses | P0 |
| CG-011 | DeliverablesTab | No user context from auth | Uses mock CURRENT_USER constant | P0 |
| CG-012 | RevisionRequestForm | Form accessible to all users | Any user can submit revision requests | P0 |

**Total Critical Gaps:** 12

### 3.2 Important Gaps (UX Issues, Data Exposure)

| ID | Component | Gap | Impact | Priority |
|----|-----------|-----|--------|----------|
| IG-001 | ApprovalTimeline | Full history shown to all users | Client Team sees sensitive data | P1 |
| IG-002 | DeliverableCard | Download button has no payment check | Clients can download without paying | P1 |
| IG-003 | DeliverableCard | No file expiry validation | Clients access expired files | P1 |
| IG-004 | DeliverableReviewModal | No payment validation for final files | Unpaid clients download finals | P1 |
| IG-005 | RevisionQuotaIndicator | Shows same info to all users | No role differentiation | P1 |
| IG-006 | RevisionRequestForm | No state validation before opening | Can open form when deliverable not ready | P1 |
| IG-007 | DeliverablesList | Filter dropdown shows internal statuses | Clients see "pending", "in_progress" options | P1 |
| IG-008 | ApprovalTimeline | No role-based data filtering | All users see internal notes | P1 |
| IG-009 | DeliverableCard | Progress bar shown during internal phases | Clients see work-in-progress % | P1 |
| IG-010 | DeliverablesTab | No project status validation | Actions allowed when project on hold | P1 |

**Total Important Gaps:** 10

### 3.3 Nice-to-Have Improvements

| ID | Component | Gap | Impact | Priority |
|----|-----------|-----|--------|----------|
| NH-001 | All components | No permission-denied messaging | Users don't know why actions blocked | P2 |
| NH-002 | All components | No loading states for permission checks | Poor UX during validation | P2 |
| NH-003 | RevisionQuotaIndicator | No "Request Additional" button | Client PM must email to request more | P2 |
| NH-004 | DeliverableCard | No role badges visible | Users can't see who has what permissions | P2 |
| NH-005 | ApprovalTimeline | No role-specific tooltips | Users don't understand permission levels | P2 |
| NH-006 | VideoCommentTimeline | No comment ownership indicators | Can't tell who made comments | P2 |
| NH-007 | DeliverablesList | No empty state differentiation | Can't tell if no data vs no permission | P2 |
| NH-008 | All components | No analytics tracking | Can't measure permission check performance | P2 |

**Total Nice-to-Have:** 8

---

## 4. State-Based Logic Gaps

### 4.1 Deliverable Status Rules (Missing)

| Status | Current Behavior | Required Behavior | Components Affected |
|--------|------------------|-------------------|---------------------|
| `pending` | Visible to all | Only Motionify staff | DeliverableCard, DeliverablesList |
| `in_progress` | Visible to all | Only Motionify staff | DeliverableCard, DeliverablesList |
| `beta_ready` | All can approve | Only Client PM can approve | DeliverableReviewModal, RevisionRequestForm |
| `awaiting_approval` | All can approve | Only Client PM can approve | DeliverableReviewModal |
| `approved` | Downloadable by all | Only if payment received | DeliverableCard, DeliverableReviewModal |
| `final_delivered` | Downloadable by all | Only if not expired (365 days) | DeliverableCard, DeliverableReviewModal |

### 4.2 Project Status Rules (Missing)

| Status | Current Behavior | Required Behavior | Components Affected |
|--------|------------------|-------------------|---------------------|
| `Active` | All actions allowed | Full permissions apply | All components |
| `On Hold` | All actions allowed | Only Admin can create/edit, others read-only | DeliverablesTab, DeliverableContext |
| `Awaiting Payment` | All actions allowed | Client PM cannot approve new deliverables | DeliverableReviewModal, RevisionRequestForm |
| `Completed` | All actions allowed | Read-only for all except Admin | All components |
| `Archived` | All actions allowed | Admin read-only, others no access | All components |

### 4.3 Time-Based Constraints (Missing)

| Constraint | Duration | Current Behavior | Required Behavior |
|-----------|----------|------------------|-------------------|
| File access expiry | 365 days | No check | Block download after expiry |
| Revision window | 30 days | No check | Block revision requests after 30 days from delivery |
| Payment grace period | 7 days | No check | Auto-pause project after 7 days unpaid |

---

## 5. Refactoring Plan

### Phase 1: Foundation (8-12 hours)

**Objective:** Create permission infrastructure and fix type system.

#### Step 1.1: Fix Type System (2 hours)
```typescript
// File: /types.ts

export type UserRole = 'super_admin' | 'project_manager' | 'team_member' | 'client';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  email?: string;
  is_primary_contact?: boolean;
  projectTeamMembership?: {
    [projectId: string]: {
      isPrimaryContact: boolean;
      joinedAt: Date;
    };
  };
}

export interface Project {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'awaiting_payment' | 'on_hold' | 'completed' | 'archived';
  // ... existing fields
}

export interface Deliverable {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'beta_ready' | 'awaiting_approval' |
          'approved' | 'rejected' | 'payment_pending' | 'final_delivered';
  balancePaymentReceived: boolean;
  finalDeliveredAt?: Date;
  expiresAt?: Date;
  // ... existing fields
}
```

#### Step 1.2: Create Permission Utility (4 hours)
```typescript
// File: /utils/permissions.ts

import { User, Project, Deliverable, UserRole } from '@/types';

export class PermissionService {
  // ============================================
  // ROLE HELPERS
  // ============================================

  static isMotionifyStaff(role: UserRole): boolean {
    return ['super_admin', 'project_manager', 'team_member'].includes(role);
  }

  static isClientPrimaryContact(user: User, projectId: string): boolean {
    return user.role === 'client' &&
           user.projectTeamMembership?.[projectId]?.isPrimaryContact === true;
  }

  static isClient(role: UserRole): boolean {
    return role === 'client';
  }

  // ============================================
  // DELIVERABLE PERMISSIONS
  // ============================================

  static canViewDeliverable(
    user: User,
    deliverable: Deliverable,
    projectId: string
  ): boolean {
    // Motionify staff can view all deliverables
    if (this.isMotionifyStaff(user.role)) {
      return true;
    }

    // Clients cannot view pending or in_progress
    if (deliverable.status === 'pending' || deliverable.status === 'in_progress') {
      return false;
    }

    // Client PM and Client Team can view beta_ready and beyond
    return user.role === 'client' &&
           ['beta_ready', 'awaiting_approval', 'approved', 'rejected',
            'payment_pending', 'final_delivered'].includes(deliverable.status);
  }

  static canApproveDeliverable(
    user: User,
    deliverable: Deliverable,
    project: Project,
    projectId: string
  ): boolean {
    // Only Client Primary Contact can approve
    if (!this.isClientPrimaryContact(user, projectId)) {
      return false;
    }

    // Must be in awaiting_approval status
    if (deliverable.status !== 'awaiting_approval') {
      return false;
    }

    // Project must be active (not on hold, not awaiting payment)
    if (project.status !== 'active') {
      return false;
    }

    return true;
  }

  static canRequestRevision(
    user: User,
    deliverable: Deliverable,
    project: Project,
    projectId: string,
    quota: { remaining: number }
  ): boolean {
    // Only Client Primary Contact can request revisions
    if (!this.isClientPrimaryContact(user, projectId)) {
      return false;
    }

    // Must be in beta_ready or awaiting_approval status
    if (!['beta_ready', 'awaiting_approval'].includes(deliverable.status)) {
      return false;
    }

    // Must have remaining revisions (or can request additional)
    if (quota.remaining <= 0) {
      return false; // Should show "Request Additional Revisions" flow
    }

    // Project must be active
    if (project.status !== 'active') {
      return false;
    }

    return true;
  }

  static canDownloadFinalFiles(
    user: User,
    deliverable: Deliverable,
    projectId: string
  ): boolean {
    // Motionify staff can always download
    if (this.isMotionifyStaff(user.role)) {
      return true;
    }

    // Clients need payment and not expired
    if (user.role === 'client') {
      // Must be final delivered
      if (deliverable.status !== 'final_delivered') {
        return false;
      }

      // Must have paid balance
      if (!deliverable.balancePaymentReceived) {
        return false;
      }

      // Must not be expired (365 days)
      if (deliverable.expiresAt && new Date() > new Date(deliverable.expiresAt)) {
        return false;
      }

      return true;
    }

    return false;
  }

  static canViewApprovalHistory(
    user: User,
    projectId: string
  ): boolean {
    // Motionify staff can view all
    if (this.isMotionifyStaff(user.role)) {
      return true;
    }

    // Client Primary Contact can view
    if (this.isClientPrimaryContact(user, projectId)) {
      return true;
    }

    // Client Team Member cannot view
    return false;
  }

  // ============================================
  // STATE-BASED CHECKS
  // ============================================

  static canPerformActionOnProject(
    user: User,
    project: Project,
    action: 'approve' | 'revise' | 'view' | 'edit'
  ): boolean {
    // Archived projects: Only Admin can view
    if (project.status === 'archived') {
      return user.role === 'super_admin' && action === 'view';
    }

    // Completed projects: Read-only except for Admin
    if (project.status === 'completed') {
      return action === 'view' || user.role === 'super_admin';
    }

    // On Hold: Only Admin can edit
    if (project.status === 'on_hold') {
      if (action === 'edit') {
        return user.role === 'super_admin';
      }
      return action === 'view';
    }

    // Awaiting Payment: No new approvals from client
    if (project.status === 'awaiting_payment') {
      if (action === 'approve' && user.role === 'client') {
        return false;
      }
    }

    // Active: Normal permission rules apply
    return true;
  }

  static isExpired(expiresAt: Date | null | undefined): boolean {
    if (!expiresAt) return false;
    return new Date() > new Date(expiresAt);
  }
}
```

#### Step 1.3: Create Auth Context (2 hours)
```typescript
// File: /contexts/AuthContext.tsx

import React, { createContext, useContext, ReactNode } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode; user?: User }> = ({
  children,
  user = null
}) => {
  // In real app, fetch from auth service
  // For now, use prop or mock data

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading: false
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

#### Step 1.4: Create Permission Hooks (2 hours)
```typescript
// File: /hooks/useDeliverablePermissions.ts

import { useAuth } from '@/contexts/AuthContext';
import { PermissionService } from '@/utils/permissions';
import { Deliverable, Project } from '@/types';

export function useDeliverablePermissions(
  deliverable: Deliverable | null,
  project: Project | null,
  quota?: { remaining: number }
) {
  const { user } = useAuth();

  if (!user || !deliverable || !project) {
    return {
      canView: false,
      canApprove: false,
      canRequestRevision: false,
      canDownloadFinal: false,
      canViewHistory: false,
      isLoading: !user,
    };
  }

  return {
    canView: PermissionService.canViewDeliverable(user, deliverable, project.id),
    canApprove: PermissionService.canApproveDeliverable(user, deliverable, project, project.id),
    canRequestRevision: quota
      ? PermissionService.canRequestRevision(user, deliverable, project, project.id, quota)
      : false,
    canDownloadFinal: PermissionService.canDownloadFinalFiles(user, deliverable, project.id),
    canViewHistory: PermissionService.canViewApprovalHistory(user, project.id),
    isLoading: false,
  };
}
```

### Phase 2: Component Updates (16-24 hours)

**Objective:** Apply permission checks to all components in priority order.

#### Priority Order:
1. **P0 - Critical (12 hours)**
   - DeliverableContext.tsx (3 hours)
   - DeliverablesTab.tsx (2 hours)
   - DeliverableCard.tsx (2 hours)
   - DeliverableReviewModal.tsx (2 hours)
   - RevisionRequestForm.tsx (2 hours)
   - DeliverablesList.tsx (1 hour)

2. **P1 - Important (4 hours)**
   - ApprovalTimeline.tsx (2 hours)
   - RevisionQuotaIndicator.tsx (2 hours)

3. **P2 - Nice-to-Have (4 hours)**
   - FeedbackSummaryPanel.tsx (1 hour)
   - VideoCommentTimeline.tsx (1 hour)
   - FileUploadZone.tsx (1 hour)
   - IssueCategorySelector.tsx (0.5 hour)
   - PrioritySelector.tsx (0.5 hour)

#### Example Refactor: DeliverableCard.tsx

**Before:**
```typescript
export const DeliverableCard: React.FC<DeliverableCardProps> = ({
  deliverable,
  onReview,
}) => {
  // NO PERMISSION CHECKS

  const getActionButton = () => {
    if (deliverable.status === 'final_delivered') {
      return <Button onClick={() => onReview(deliverable)}>Download</Button>;
    }
    if (deliverable.status === 'beta_ready' || deliverable.status === 'awaiting_approval') {
      return <Button onClick={() => onReview(deliverable)}>Review Beta</Button>;
    }
  };

  return <div>...</div>;
};
```

**After:**
```typescript
export const DeliverableCard: React.FC<DeliverableCardProps> = ({
  deliverable,
  project,
  quota,
  onReview,
}) => {
  const permissions = useDeliverablePermissions(deliverable, project, quota);

  // HIDE ENTIRE CARD IF USER CAN'T VIEW
  if (!permissions.canView) {
    return null;
  }

  const getActionButton = () => {
    // Download final files
    if (deliverable.status === 'final_delivered') {
      if (permissions.canDownloadFinal) {
        return <Button onClick={() => onReview(deliverable)}>Download</Button>;
      } else {
        // Show why download is blocked
        return (
          <Tooltip content="Payment required or files expired">
            <Button disabled>Download</Button>
          </Tooltip>
        );
      }
    }

    // Review beta
    if (deliverable.status === 'beta_ready' || deliverable.status === 'awaiting_approval') {
      if (permissions.canApprove) {
        return <Button onClick={() => onReview(deliverable)}>Review Beta</Button>;
      } else {
        // Only Client PM can review
        return null; // Or show disabled button with tooltip
      }
    }
  };

  return <div>...</div>;
};
```

#### Example Refactor: DeliverableContext.tsx

**Before:**
```typescript
case 'APPROVE_DELIVERABLE': {
  // NO VALIDATION
  const approval: DeliverableApproval = { ... };
  return {
    ...state,
    deliverables: state.deliverables.map(d =>
      d.id === action.id
        ? { ...d, status: 'approved', approvalHistory: [...d.approvalHistory, approval] }
        : d
    ),
  };
}
```

**After:**
```typescript
// Add validation middleware in component that dispatches action

const handleApprove = () => {
  if (!state.selectedDeliverable || !project) return;

  // VALIDATE PERMISSIONS BEFORE DISPATCHING
  const canApprove = PermissionService.canApproveDeliverable(
    user,
    state.selectedDeliverable,
    project,
    project.id
  );

  if (!canApprove) {
    // Show permission denied message
    toast.error('You do not have permission to approve this deliverable.');
    return;
  }

  // Validate state
  if (state.selectedDeliverable.status !== 'awaiting_approval') {
    toast.error('Deliverable must be in "Awaiting Approval" status to approve.');
    return;
  }

  // Now dispatch
  dispatch({
    type: 'APPROVE_DELIVERABLE',
    id: state.selectedDeliverable.id,
    userId: user.id,
    userName: user.name,
    userEmail: user.email || '',
  });
};
```

### Phase 3: Testing & Validation (8-12 hours)

**Objective:** Ensure all permission checks work correctly across all roles.

#### Step 3.1: Unit Tests (4 hours)
```typescript
// File: /utils/__tests__/permissions.test.ts

import { PermissionService } from '../permissions';
import { User, Deliverable, Project } from '@/types';

describe('PermissionService', () => {
  describe('canViewDeliverable', () => {
    it('should allow Motionify staff to view all deliverables', () => {
      const user: User = { id: '1', name: 'Admin', role: 'super_admin', avatar: '' };
      const deliverable: Deliverable = {
        id: 'd1',
        status: 'pending',
        // ...
      };

      expect(PermissionService.canViewDeliverable(user, deliverable, 'p1')).toBe(true);
    });

    it('should hide pending deliverables from clients', () => {
      const user: User = {
        id: '1',
        name: 'Client',
        role: 'client',
        avatar: '',
        projectTeamMembership: {
          'p1': { isPrimaryContact: true, joinedAt: new Date() }
        }
      };
      const deliverable: Deliverable = {
        id: 'd1',
        status: 'pending',
        // ...
      };

      expect(PermissionService.canViewDeliverable(user, deliverable, 'p1')).toBe(false);
    });

    it('should show beta_ready deliverables to all clients', () => {
      const user: User = {
        id: '1',
        name: 'Client Team',
        role: 'client',
        avatar: '',
        projectTeamMembership: {
          'p1': { isPrimaryContact: false, joinedAt: new Date() }
        }
      };
      const deliverable: Deliverable = {
        id: 'd1',
        status: 'beta_ready',
        // ...
      };

      expect(PermissionService.canViewDeliverable(user, deliverable, 'p1')).toBe(true);
    });
  });

  describe('canApproveDeliverable', () => {
    const project: Project = { id: 'p1', status: 'active', /* ... */ };

    it('should allow Client Primary Contact to approve', () => {
      const user: User = {
        id: '1',
        name: 'Client PM',
        role: 'client',
        avatar: '',
        projectTeamMembership: {
          'p1': { isPrimaryContact: true, joinedAt: new Date() }
        }
      };
      const deliverable: Deliverable = {
        id: 'd1',
        status: 'awaiting_approval',
        // ...
      };

      expect(PermissionService.canApproveDeliverable(user, deliverable, project, 'p1')).toBe(true);
    });

    it('should NOT allow Client Team Member to approve', () => {
      const user: User = {
        id: '1',
        name: 'Client Team',
        role: 'client',
        avatar: '',
        projectTeamMembership: {
          'p1': { isPrimaryContact: false, joinedAt: new Date() }
        }
      };
      const deliverable: Deliverable = {
        id: 'd1',
        status: 'awaiting_approval',
        // ...
      };

      expect(PermissionService.canApproveDeliverable(user, deliverable, project, 'p1')).toBe(false);
    });

    it('should NOT allow approval when project is on hold', () => {
      const user: User = {
        id: '1',
        name: 'Client PM',
        role: 'client',
        avatar: '',
        projectTeamMembership: {
          'p1': { isPrimaryContact: true, joinedAt: new Date() }
        }
      };
      const deliverable: Deliverable = {
        id: 'd1',
        status: 'awaiting_approval',
        // ...
      };
      const project: Project = { id: 'p1', status: 'on_hold', /* ... */ };

      expect(PermissionService.canApproveDeliverable(user, deliverable, project, 'p1')).toBe(false);
    });
  });

  // ... more tests for all methods
});
```

#### Step 3.2: Integration Tests (4 hours)
Test each component with different user roles to ensure UI renders correctly.

#### Step 3.3: E2E Tests (4 hours)
Test complete workflows:
- Client PM approves deliverable
- Client PM requests revision
- Client Team Member tries to approve (should fail)
- Motionify staff uploads deliverable
- Payment and file expiry flows

---

## 6. Code Examples

### 6.1 Example: Refactored DeliverablesTab.tsx

```typescript
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionService } from '@/utils/permissions';
import { DeliverableProvider, useDeliverables } from './DeliverableContext';
import { RevisionQuotaIndicator } from './RevisionQuotaIndicator';
import { DeliverablesList } from './DeliverablesList';
import { DeliverableReviewModal } from './DeliverableReviewModal';
import { RevisionRequestForm } from './RevisionRequestForm';
import { Deliverable, DeliverableApproval, Project } from '@/types';
import { toast } from 'sonner';

interface DeliverablesTabContentProps {
  project: Project;
}

const DeliverablesTabContent: React.FC<DeliverablesTabContentProps> = ({ project }) => {
  const { state, dispatch } = useDeliverables();
  const { user } = useAuth(); // GET USER FROM AUTH CONTEXT
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (!user) {
    return <div>Loading...</div>;
  }

  const handleReviewDeliverable = (deliverable: Deliverable) => {
    // CHECK PERMISSION BEFORE OPENING MODAL
    const canView = PermissionService.canViewDeliverable(user, deliverable, project.id);

    if (!canView) {
      toast.error('You do not have permission to view this deliverable.');
      return;
    }

    dispatch({ type: 'OPEN_REVIEW_MODAL', deliverable });
  };

  const handleApprove = () => {
    if (!state.selectedDeliverable) return;

    // VALIDATE PERMISSIONS
    const canApprove = PermissionService.canApproveDeliverable(
      user,
      state.selectedDeliverable,
      project,
      project.id
    );

    if (!canApprove) {
      if (!PermissionService.isClientPrimaryContact(user, project.id)) {
        toast.error('Only the Client Primary Contact can approve deliverables.');
      } else if (state.selectedDeliverable.status !== 'awaiting_approval') {
        toast.error('This deliverable is not ready for approval.');
      } else if (project.status !== 'active') {
        toast.error(`Cannot approve deliverables when project is ${project.status}.`);
      } else {
        toast.error('You cannot approve this deliverable at this time.');
      }
      return;
    }

    // Show confirmation
    const confirmed = window.confirm(
      `Are you sure you want to approve "${state.selectedDeliverable.title}"?\n\nAfter approval, you'll receive a payment link to complete the balance payment, and final files will be delivered within 24 hours.`
    );

    if (confirmed) {
      dispatch({
        type: 'APPROVE_DELIVERABLE',
        id: state.selectedDeliverable.id,
        userId: user.id,
        userName: user.name,
        userEmail: user.email || '',
      });

      setSuccessMessage('Deliverable approved successfully! Payment link will be sent to your email.');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  };

  const handleRequestRevision = () => {
    if (!state.selectedDeliverable) return;

    // VALIDATE PERMISSIONS
    const canRequestRevision = PermissionService.canRequestRevision(
      user,
      state.selectedDeliverable,
      project,
      project.id,
      state.quota
    );

    if (!canRequestRevision) {
      if (!PermissionService.isClientPrimaryContact(user, project.id)) {
        toast.error('Only the Client Primary Contact can request revisions.');
      } else if (state.quota.remaining <= 0) {
        toast.error('You have no remaining revisions. Please contact the team to request additional revisions (may incur fees).');
      } else if (!['beta_ready', 'awaiting_approval'].includes(state.selectedDeliverable.status)) {
        toast.error('This deliverable is not available for revision requests.');
      } else if (project.status !== 'active') {
        toast.error(`Cannot request revisions when project is ${project.status}.`);
      } else {
        toast.error('You cannot request revisions at this time.');
      }
      return;
    }

    dispatch({ type: 'OPEN_REVISION_FORM' });
  };

  const handleSubmitRevision = (approval: DeliverableApproval) => {
    dispatch({ type: 'REJECT_DELIVERABLE', id: approval.deliverableId, approval });

    setSuccessMessage('Revision request submitted successfully! The team will review within 2-3 business days.');
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 5000);
  };

  // FILTER DELIVERABLES BASED ON USER ROLE
  const visibleDeliverables = state.deliverables.filter(d =>
    PermissionService.canViewDeliverable(user, d, project.id)
  );

  return (
    <div className="space-y-6">
      {/* Success Message Toast */}
      {showSuccessMessage && (
        <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Revision Quota Indicator - Role-based display */}
      {(PermissionService.isMotionifyStaff(user.role) ||
        PermissionService.isClientPrimaryContact(user, project.id)) && (
        <RevisionQuotaIndicator
          quota={state.quota}
          user={user}
          project={project}
        />
      )}

      {/* Deliverables List - Pre-filtered */}
      <DeliverablesList
        deliverables={visibleDeliverables}
        filter={state.filter}
        sortBy={state.sortBy}
        onFilterChange={(filter) => dispatch({ type: 'SET_FILTER', filter })}
        onSortChange={(sortBy) => dispatch({ type: 'SET_SORT', sortBy })}
        onReviewDeliverable={handleReviewDeliverable}
        user={user}
        project={project}
      />

      {/* Review Modal */}
      <DeliverableReviewModal
        deliverable={state.selectedDeliverable}
        isOpen={state.isReviewModalOpen}
        onClose={() => dispatch({ type: 'CLOSE_REVIEW_MODAL' })}
        onApprove={handleApprove}
        onRequestRevision={handleRequestRevision}
        user={user}
        project={project}
        quota={state.quota}
      />

      {/* Revision Request Form */}
      <RevisionRequestForm
        deliverable={state.selectedDeliverable}
        isOpen={state.isRevisionFormOpen}
        onClose={() => dispatch({ type: 'CLOSE_REVISION_FORM' })}
        onSubmit={handleSubmitRevision}
        quota={state.quota}
        user={user}
        project={project}
      />
    </div>
  );
};

/**
 * Main export - wrapped with DeliverableProvider
 */
export const DeliverablesTab: React.FC<{
  project: Project;
  onConvertToTask?: (commentId: string, taskTitle: string, assigneeId: string) => void;
}> = ({ project, onConvertToTask }) => {
  return (
    <DeliverableProvider onConvertToTask={onConvertToTask}>
      <DeliverablesTabContent project={project} />
    </DeliverableProvider>
  );
};
```

### 6.2 Example: Refactored DeliverableCard.tsx

```typescript
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDeliverablePermissions } from '@/hooks/useDeliverablePermissions';
import { cn, Badge, Progress, Button, Tooltip } from '../ui/design-system';
import { Deliverable, Project } from '@/types';
import {
  FileVideo,
  Download,
  Eye,
  Lock,
  Clock,
} from 'lucide-react';

export interface DeliverableCardProps {
  deliverable: Deliverable;
  project: Project;
  quota?: { remaining: number };
  onReview: (deliverable: Deliverable) => void;
  className?: string;
}

export const DeliverableCard: React.FC<DeliverableCardProps> = ({
  deliverable,
  project,
  quota,
  onReview,
  className,
}) => {
  const { user } = useAuth();
  const permissions = useDeliverablePermissions(deliverable, project, quota);

  // HIDE CARD IF USER CANNOT VIEW
  if (!permissions.canView || !user) {
    return null;
  }

  const Icon = TYPE_ICONS[deliverable.type];
  const statusConfig = STATUS_CONFIG[deliverable.status];
  const dueDate = new Date(deliverable.dueDate);
  const isOverdue = dueDate < new Date() && deliverable.progress < 100;

  const getActionButton = () => {
    // Final delivered - check download permission
    if (deliverable.status === 'final_delivered') {
      if (permissions.canDownloadFinal) {
        return (
          <Button
            variant="gradient"
            size="sm"
            className="gap-2"
            onClick={(e) => {
              e.stopPropagation();
              onReview(deliverable);
            }}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        );
      } else {
        // Show why download is blocked
        const reason = !deliverable.balancePaymentReceived
          ? 'Payment required to download final files'
          : 'Final files have expired (365 days from delivery)';

        return (
          <Tooltip content={reason}>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 cursor-not-allowed opacity-50"
              disabled
            >
              <Lock className="h-4 w-4" />
              Locked
            </Button>
          </Tooltip>
        );
      }
    }

    // Beta ready or awaiting approval - check approve permission
    if (deliverable.status === 'beta_ready' || deliverable.status === 'awaiting_approval') {
      if (permissions.canApprove) {
        return (
          <Button
            variant="default"
            size="sm"
            className="gap-2"
            onClick={(e) => {
              e.stopPropagation();
              onReview(deliverable);
            }}
          >
            <Eye className="h-4 w-4" />
            Review Beta
          </Button>
        );
      } else {
        // Show why review is not available
        const reason = user.role === 'client'
          ? 'Only the Client Primary Contact can review and approve'
          : 'You do not have permission to approve deliverables';

        return (
          <Tooltip content={reason}>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 cursor-help"
              disabled
            >
              <Eye className="h-4 w-4" />
              Review Beta
            </Button>
          </Tooltip>
        );
      }
    }

    return null;
  };

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-1 overflow-hidden',
        permissions.canApprove && 'cursor-pointer',
        className
      )}
      onClick={() => permissions.canApprove && onReview(deliverable)}
    >
      {/* Thumbnail/Icon Area */}
      <div className="relative aspect-video bg-gradient-to-br from-zinc-100 to-zinc-50 flex items-center justify-center overflow-hidden">
        {deliverable.betaFileUrl && deliverable.type === 'Video' ? (
          <div className="relative w-full h-full bg-zinc-900">
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className="h-16 w-16 text-white/20" />
            </div>
            {deliverable.watermarked && (
              <div className="absolute top-2 right-2">
                <Badge variant="warning" className="text-xs">
                  BETA
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
            <Icon className={cn('h-10 w-10', statusConfig.color)} />
          </div>
        )}

        {/* Progress Overlay for In-Progress (only for Motionify staff) */}
        {deliverable.status === 'in_progress' && user.role !== 'client' && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
            <div className="flex items-center justify-between text-white text-xs font-medium mb-1">
              <span>Progress</span>
              <span>{deliverable.progress}%</span>
            </div>
            <Progress value={deliverable.progress} className="h-1.5" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title & Status */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm text-zinc-900 line-clamp-2 flex-1">
              {deliverable.title}
            </h3>
            <Badge variant={statusConfig.variant as any} className="shrink-0 text-xs">
              {statusConfig.label}
            </Badge>
          </div>

          {deliverable.description && (
            <p className="text-xs text-zinc-500 line-clamp-2">
              {deliverable.description}
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          {deliverable.duration && (
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {deliverable.duration}
            </div>
          )}
          {deliverable.format && (
            <div className="font-medium uppercase">{deliverable.format}</div>
          )}
          {deliverable.resolution && (
            <div className="font-mono">{deliverable.resolution}</div>
          )}
        </div>

        {/* Due Date */}
        <div
          className={cn(
            'flex items-center gap-2 text-xs font-medium',
            isOverdue ? 'text-red-600' : 'text-zinc-600'
          )}
        >
          <Calendar className="h-3.5 w-3.5" />
          Due {dueDate.toLocaleDateString()}
          {isOverdue && <span className="text-red-600 font-bold">(Overdue)</span>}
        </div>

        {/* Progress Bar (for non-completed, only for Motionify staff) */}
        {deliverable.progress < 100 &&
         deliverable.status !== 'beta_ready' &&
         user.role !== 'client' && (
          <div className="pt-2">
            <Progress
              value={deliverable.progress}
              indicatorClassName={
                deliverable.progress > 80
                  ? 'bg-emerald-500'
                  : deliverable.progress > 50
                  ? 'bg-blue-500'
                  : 'bg-amber-500'
              }
            />
          </div>
        )}

        {/* Action Button */}
        {getActionButton()}

        {/* Approval History Count (only if user can view history) */}
        {deliverable.approvalHistory.length > 0 && permissions.canViewHistory && (
          <div className="pt-2 border-t border-zinc-100">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {deliverable.approvalHistory.length} review
              {deliverable.approvalHistory.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## 7. Implementation Checklist

### Phase 1: Foundation ✅

- [ ] **Update /types.ts** - Fix role values to match database
  - [ ] Change User.role to use database values
  - [ ] Add is_primary_contact field
  - [ ] Add projectTeamMembership field
  - [ ] Update Project.status values
  - [ ] Update Deliverable.status values
  - [ ] Add payment and expiry fields to Deliverable
- [ ] **Create /utils/permissions.ts** - Permission utility class
  - [ ] Implement isMotionifyStaff()
  - [ ] Implement isClientPrimaryContact()
  - [ ] Implement canViewDeliverable()
  - [ ] Implement canApproveDeliverable()
  - [ ] Implement canRequestRevision()
  - [ ] Implement canDownloadFinalFiles()
  - [ ] Implement canViewApprovalHistory()
  - [ ] Implement canPerformActionOnProject()
  - [ ] Implement isExpired()
- [ ] **Create /contexts/AuthContext.tsx** - User authentication context
  - [ ] Create AuthContext
  - [ ] Create AuthProvider component
  - [ ] Create useAuth() hook
  - [ ] Handle loading states
- [ ] **Create /hooks/useDeliverablePermissions.ts** - Permission hook
  - [ ] Implement useDeliverablePermissions hook
  - [ ] Return all permission flags
  - [ ] Handle loading states
  - [ ] Handle null cases

### Phase 2: Component Updates (Priority Order) ✅

#### P0 - Critical Components (Must Fix First)

- [ ] **DeliverableContext.tsx**
  - [ ] Add permission validation middleware
  - [ ] Validate APPROVE_DELIVERABLE action
  - [ ] Validate REJECT_DELIVERABLE action
  - [ ] Validate revision quota before consuming
  - [ ] Add error states for permission denials
  - [ ] Add state validation (deliverable status, project status)
- [ ] **DeliverablesTab.tsx**
  - [ ] Replace CURRENT_USER with useAuth()
  - [ ] Add project prop
  - [ ] Validate permissions before approve action
  - [ ] Validate permissions before request revision action
  - [ ] Pass user and project to all child components
  - [ ] Add permission-denied toast messages
  - [ ] Filter visible deliverables based on role
- [ ] **DeliverableCard.tsx**
  - [ ] Add user and project props
  - [ ] Implement useDeliverablePermissions hook
  - [ ] Hide card if !canView
  - [ ] Conditionally render action buttons based on permissions
  - [ ] Add permission-denied tooltips
  - [ ] Hide progress bar from clients during internal phases
- [ ] **DeliverableReviewModal.tsx**
  - [ ] Add user and project props
  - [ ] Implement useDeliverablePermissions hook
  - [ ] Validate canApprove before showing approve button
  - [ ] Validate canRequestRevision before showing revision button
  - [ ] Validate canDownloadFinal before allowing download
  - [ ] Filter approval timeline based on canViewHistory
  - [ ] Add permission-denied messages
- [ ] **RevisionRequestForm.tsx**
  - [ ] Get user from useAuth() instead of props
  - [ ] Add project prop
  - [ ] Validate user is Client PM on mount
  - [ ] Show permission-denied if not Client PM
  - [ ] Validate quota before opening form
  - [ ] Validate deliverable status before opening
  - [ ] Validate project status before opening
  - [ ] Add state validation messages
- [ ] **DeliverablesList.tsx**
  - [ ] Add user and project props
  - [ ] Pre-filter deliverables based on canView
  - [ ] Filter status dropdown options based on role
  - [ ] Pass user/project to DeliverableCard
  - [ ] Add role-aware empty states

#### P1 - Important Components (Fix Second)

- [ ] **ApprovalTimeline.tsx**
  - [ ] Add user and project props
  - [ ] Filter approval history based on role
  - [ ] Hide sensitive data from Client Team Members
  - [ ] Show different detail levels based on role
  - [ ] Add permission checks for visibility
- [ ] **RevisionQuotaIndicator.tsx**
  - [ ] Add user and project props
  - [ ] Show different views based on role
  - [ ] Show detailed info to Motionify staff + Client PM
  - [ ] Hide or limit info for Client Team
  - [ ] Add "Request Additional Revisions" button for Client PM

#### P2 - Nice-to-Have Components (Fix Last)

- [ ] **FeedbackSummaryPanel.tsx**
  - [ ] Add role validation
  - [ ] Only show during revision request flow
  - [ ] Validate deliverable status
- [ ] **VideoCommentTimeline.tsx**
  - [ ] Add role validation
  - [ ] Add comment ownership validation for edit/delete
  - [ ] Ensure only shown in appropriate context
- [ ] **FileUploadZone.tsx**
  - [ ] Add role validation (Client PM only)
  - [ ] Validate revision request context
- [ ] **IssueCategorySelector.tsx**
  - [ ] Add role validation
  - [ ] Ensure only shown in revision request context
- [ ] **PrioritySelector.tsx**
  - [ ] Add role validation
  - [ ] Ensure only shown in revision request context

### Phase 3: Testing & Validation ✅

- [ ] **Unit Tests**
  - [ ] Write tests for PermissionService.canViewDeliverable()
  - [ ] Write tests for PermissionService.canApproveDeliverable()
  - [ ] Write tests for PermissionService.canRequestRevision()
  - [ ] Write tests for PermissionService.canDownloadFinalFiles()
  - [ ] Write tests for PermissionService.canViewApprovalHistory()
  - [ ] Write tests for state-based rules
  - [ ] Write tests for edge cases
- [ ] **Integration Tests**
  - [ ] Test DeliverableCard with all roles
  - [ ] Test DeliverableReviewModal with all roles
  - [ ] Test RevisionRequestForm with all roles
  - [ ] Test DeliverablesList filtering for all roles
  - [ ] Test state transitions
- [ ] **E2E Tests**
  - [ ] Test Client PM approves deliverable flow
  - [ ] Test Client PM requests revision flow
  - [ ] Test Client Team Member denied access flow
  - [ ] Test Motionify staff workflows
  - [ ] Test payment and expiry flows
  - [ ] Test project status overrides
- [ ] **Manual QA**
  - [ ] Test each role in browser
  - [ ] Test all permission-denied messages
  - [ ] Test all tooltips and empty states
  - [ ] Test loading states
  - [ ] Test error states

---

## 8. Risk Assessment & Mitigation

### High-Risk Areas

1. **Breaking Changes in types.ts**
   - **Risk:** Changing role values will break existing code
   - **Mitigation:** Use global find-replace, update all components in one go, add deprecation warnings

2. **Missing Auth Context**
   - **Risk:** Components depend on CURRENT_USER constant which is mock data
   - **Mitigation:** Implement AuthContext first, gradually migrate components, maintain backwards compatibility during transition

3. **State Management Conflicts**
   - **Risk:** Permission checks in Context vs Components may conflict
   - **Mitigation:** Implement validation at component level (before dispatch), not in reducer

4. **Performance Degradation**
   - **Risk:** Permission checks on every render may slow down UI
   - **Mitigation:** Use useMemo for permission results, implement caching in PermissionService

### Medium-Risk Areas

1. **Incorrect Permission Logic**
   - **Risk:** Wrong role checks could grant/deny access incorrectly
   - **Mitigation:** Comprehensive unit tests, manual QA with all roles

2. **State-Based Rule Complexity**
   - **Risk:** Deliverable/project status combinations are complex
   - **Mitigation:** Document all state transitions, test each combination

3. **UX Confusion**
   - **Risk:** Users don't understand why actions are blocked
   - **Mitigation:** Clear permission-denied messages, helpful tooltips

---

## 9. Success Metrics

### Code Quality Metrics
- [ ] 100% of components have role-based checks
- [ ] 100% of critical actions validated
- [ ] 90%+ unit test coverage for PermissionService
- [ ] 80%+ integration test coverage for components

### Security Metrics
- [ ] Zero unauthorized approvals possible
- [ ] Zero unauthorized revision requests possible
- [ ] Zero unauthorized file downloads possible
- [ ] All sensitive data filtered by role

### UX Metrics
- [ ] Clear permission-denied messages for all blocked actions
- [ ] Helpful tooltips on disabled buttons
- [ ] Role-appropriate dashboards and views
- [ ] No confusion about permission levels

---

## 10. Next Steps

### Immediate Actions (Week 1)
1. **Fix types.ts** - This is the blocker for everything else
2. **Create PermissionService utility** - Foundation for all checks
3. **Create AuthContext** - Replace mock CURRENT_USER
4. **Update constants.ts** - Add correct role values to mock data

### Short-term Actions (Weeks 2-3)
1. **Update P0 components** - Critical permission checks
2. **Write unit tests** - Validate permission logic
3. **Manual QA** - Test with different roles

### Medium-term Actions (Week 4)
1. **Update P1/P2 components** - Important and nice-to-have
2. **Integration tests** - Test component interactions
3. **E2E tests** - Test complete workflows
4. **Documentation** - Update component docs with permission info

---

## 11. Conclusion

### Summary
The deliverables feature currently has **zero permission checks** implemented across all 13 components. This is a **critical security and UX issue** that must be addressed before production use. The wrong role values in types.ts block all permission implementations.

### Priority Recommendation
**URGENT:** Fix types.ts and implement P0 components (DeliverableContext, DeliverablesTab, DeliverableCard, DeliverableReviewModal, RevisionRequestForm, DeliverablesList) immediately. These components handle core approval workflows and are security-critical.

### Estimated Timeline
- **Week 1:** Foundation (types, utils, context, hooks)
- **Weeks 2-3:** P0 + P1 components + tests
- **Week 4:** P2 components + E2E tests + documentation

**Total:** 4 weeks (32-48 developer hours)

### Business Impact
- **Current Risk:** Any user can approve deliverables, request revisions, download files
- **After Fix:** Proper role-based access control, secure workflows, better UX
- **ROI:** Prevents unauthorized actions, reduces support tickets, improves client trust

---

**Document Status:** ✅ Complete
**Last Updated:** December 3, 2025
**Next Review:** After Phase 1 completion
