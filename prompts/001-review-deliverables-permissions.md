<objective>
Review all components in `components/deliverables/` to audit role-based UI rendering against the 5-role permission system defined in the updated permissions documentation.

Create a comprehensive refactoring plan that identifies permission check gaps and provides step-by-step implementation guidance to properly implement role-based and state-based permission checks across all deliverable components.
</objective>

<context>
The project recently updated its permissions documentation to define a 5-role system with 11 permission categories and state-based rules. The deliverables components need to be reviewed to ensure they properly implement role-based UI rendering according to these new specifications.

**Reference Documentation:**
@docs/user-types-permissions.md - Complete permission matrices, role definitions, and state-based rules

**Components to Review:**
@components/deliverables/*.tsx - All 13 components in the deliverables directory

**Current Tech Stack:**
- React with TypeScript
- Lucide React for icons
- No formal permission service yet (components may have ad-hoc permission checks)
</context>

<permission_system_summary>
**5 User Roles (Database Values):**
1. `super_admin` - Motionify Admin (full system access, creates projects, approves revision quotas)
2. `project_manager` - Motionify Project Manager (manages assigned projects, uploads final files)
3. `team_member` - Motionify Team Member (tackles tasks, uploads beta files to assigned tasks)
4. `client` + `is_primary_contact: true` - Client Primary Contact (approves deliverables, makes payments, invites client team)
5. `client` + `is_primary_contact: false` - Client Team Member (comments only, limited viewing)

**Critical Deliverable Permissions:**

| Permission | Admin | PM | Team | Client PM | Client Team |
|-----------|-------|----|----- |-----------|-------------|
| Create deliverables | ✅ | ✅ | ❌ | ❌ | ❌ |
| Upload beta files | ✅ | ✅ | ✅* | ❌ | ❌ |
| Upload final files | ✅ | ✅ | ❌ | ❌ | ❌ |
| View beta deliverables | ✅ | ✅ | ✅ | ✅** | ✅** |
| Approve deliverables | ❌ | ❌ | ❌ | ✅ | ❌ |
| Request revisions | ❌ | ❌ | ❌ | ✅ | ❌ |
| View approval history | ✅ | ✅ | ✅ | ✅ | ❌ |
| Access final files (paid) | ✅ | ✅ | ✅ | ✅† | ✅† |

*Team members can upload beta files **only to tasks they're assigned to**
**Clients can view beta deliverables **only when status is `beta_ready` or later**
†Final files accessible **only after 50% balance payment** received

**State-Based Permission Rules:**

Deliverable status affects what actions are available:
- `pending`: Motionify team can upload, clients **cannot view**
- `in_progress`: Team uploads files, clients still **cannot view**
- `beta_ready`: Client PM/Team **can view beta** (watermarked), Client PM **cannot approve yet**
- `awaiting_approval`: Client PM **can approve or reject**, Motionify team **cannot edit** (locked)
- `approved`: Awaiting payment, **no final file access** until paid
- `payment_pending`: Client PM must pay to proceed, final files withheld
- `final_delivered`: **Full access** to final files, **365-day expiry countdown** starts
- `rejected`: Team can re-upload, **revision count increments**, back to in_progress

**Project Status Also Affects Permissions:**
- `Draft`: Only Admin/PM can view, no client access
- `Active`: Full permissions as documented
- `Awaiting Payment`: Client PM cannot approve new deliverables
- `On Hold`: No file uploads except Admin, status changes locked
- `Completed`: Read-only except Admin, files accessible 365 days
- `Archived`: Admin read-only only, all others no access
</permission_system_summary>

<review_requirements>
For each component in `components/deliverables/`, analyze:

1. **Current Permission Checks:**
   - What role-based checks currently exist?
   - Are they using database values (`super_admin`, `project_manager`, etc.) or display names?
   - Are permission checks in the right places (component level, button level, etc.)?

2. **Missing Permission Checks:**
   - Actions that should be role-restricted but aren't
   - UI elements that should be hidden/disabled for certain roles
   - State-based checks that are missing (deliverable status, project status)

3. **Incorrect Implementations:**
   - Checks using wrong role values
   - Missing `is_primary_contact` checks for Client PM distinction
   - Team member checks not verifying task assignment
   - Missing payment status checks for final file access

4. **State-Based Logic Gaps:**
   - Status checks missing for client visibility (pending/in_progress should hide from clients)
   - Approval button shown when deliverable not in `awaiting_approval` status
   - Edit/upload actions available when deliverable is locked during approval
   - Payment requirement not enforced for final file downloads

5. **Edge Cases:**
   - Multi-tenancy (user is Client PM on one project, Client Team on another)
   - Expired files (365 days after final delivery)
   - Project status overrides (on hold, archived)
</review_requirements>

<implementation_approach>
Follow this systematic review process:

**Step 1: Component Inventory**
- List all 13 components in `components/deliverables/`
- Categorize by function (upload, review, approval, display, forms)

**Step 2: Permission Check Analysis**
For each component, document:
- Current permission logic (show code snippets)
- Role checks present
- State checks present
- What's missing or incorrect

**Step 3: Gap Identification**
Create a comprehensive gap list:
- Missing role checks by component
- Missing state checks by component
- Incorrect permission logic requiring fixes
- Priority: Critical (blocks functionality) vs Important (UX issue) vs Nice-to-have

**Step 4: Refactoring Plan**
Provide step-by-step refactoring plan:
- Recommended helper functions to create (e.g., `canApproveDeliverable()`, `canUploadFiles()`)
- Component-by-component changes needed
- Code examples showing before/after
- Implementation order (dependencies, critical path)

**Step 5: Testing Strategy**
- Permission scenarios to test
- Edge cases to validate
- Manual testing checklist
</implementation_approach>

<output_format>
Structure your output as follows:

## Executive Summary
- Total components reviewed
- Critical gaps found
- High-priority fixes needed
- Estimated refactoring effort

## Component-by-Component Analysis

For each component:

### [ComponentName.tsx]
**Purpose:** [What this component does]

**Current Permission Checks:**
```typescript
// Show existing permission logic
```

**Gaps Identified:**
- ❌ Missing check: [describe what's missing]
- ⚠️ Incorrect check: [describe what's wrong]
- 🔧 State-based logic missing: [describe missing state checks]

**Required Changes:**
[Describe what needs to be added/fixed]

## Comprehensive Gap List

### Critical Gaps (Blocks Core Functionality)
1. [Component] - [Issue]
2. [Component] - [Issue]

### Important Gaps (UX Issues)
1. [Component] - [Issue]

### Nice-to-Have Improvements
1. [Component] - [Issue]

## Refactoring Plan

### Phase 1: Foundation (Priority)
**Goal:** Create permission utility functions

**Tasks:**
1. Create `utils/deliverablePermissions.ts`:
```typescript
// Example helper functions needed
export function canUploadBetaFiles(user: User, task?: Task): boolean {
  // Admin and PM always can
  if (user.role === 'super_admin' || user.role === 'project_manager') return true;

  // Team member only if assigned to task
  if (user.role === 'team_member') {
    return task?.assignees?.some(a => a.id === user.id) ?? false;
  }

  return false;
}

export function canApproveDeliverable(user: User, project: Project, deliverable: Deliverable): boolean {
  // Must be client primary contact
  if (user.role !== 'client') return false;
  if (!user.projectTeamMembership?.[project.id]?.isPrimaryContact) return false;

  // Deliverable must be awaiting approval
  if (deliverable.status !== 'awaiting_approval') return false;

  // Project must not be on hold or archived
  if (project.status === 'on_hold' || project.status === 'archived') return false;

  return true;
}

// ... other helpers
```

2. Create `hooks/useDeliverablePermissions.ts`:
```typescript
export function useDeliverablePermissions(deliverable: Deliverable) {
  const { user, currentProject } = useContext(UserContext);

  return {
    canApprove: canApproveDeliverable(user, currentProject, deliverable),
    canUploadBeta: canUploadBetaFiles(user),
    canViewBeta: canViewBetaDeliverable(user, deliverable),
    // ... other permissions
  };
}
```

### Phase 2: Component Updates (Sequential)
Update components in priority order:

**Priority 1 - Core Approval Flow:**
1. DeliverableReviewModal.tsx
2. RevisionRequestForm.tsx
3. ApprovalTimeline.tsx

**Priority 2 - Upload/File Management:**
4. FileUploadZone.tsx
5. DeliverableCard.tsx
6. DeliverablesList.tsx

**Priority 3 - Supporting UI:**
7. FeedbackSummaryPanel.tsx
8. RevisionQuotaIndicator.tsx
9. IssueCategorySelector.tsx
10. PrioritySelector.tsx
11. VideoCommentTimeline.tsx
12. DeliverablesTab.tsx
13. DeliverableContext.tsx

### Phase 3: Testing & Validation
- Test matrix: 5 roles × 8 deliverable statuses × 6 project statuses
- Manual testing checklist
- Edge case validation

## Code Examples

### Example 1: Before/After for Approval Button

**Before:**
```typescript
{deliverable.status === 'beta_ready' && (
  <Button onClick={handleApprove}>Approve</Button>
)}
```

**After:**
```typescript
const { canApprove } = useDeliverablePermissions(deliverable);

{canApprove && (
  <Button onClick={handleApprove}>Approve</Button>
)}

// Disabled state with tooltip
{deliverable.status === 'beta_ready' && !canApprove && (
  <Tooltip content="Only Client Primary Contact can approve">
    <Button disabled>Approve</Button>
  </Tooltip>
)}
```

### Example 2: State-Based Visibility

**Before:**
```typescript
<DeliverableCard deliverable={deliverable} />
```

**After:**
```typescript
// Don't show pending/in_progress deliverables to clients
if ((deliverable.status === 'pending' || deliverable.status === 'in_progress') &&
    user.role === 'client') {
  return null;
}

<DeliverableCard deliverable={deliverable} />
```

## Implementation Checklist

Use this checklist to track progress:

### Foundation
- [ ] Create `utils/deliverablePermissions.ts` with all helper functions
- [ ] Create `hooks/useDeliverablePermissions.ts` hook
- [ ] Update `types.ts` if role enum needs fixing
- [ ] Add TypeScript types for permission functions

### Component Updates
- [ ] DeliverableReviewModal.tsx - Approval permission checks
- [ ] RevisionRequestForm.tsx - Client PM only access
- [ ] ApprovalTimeline.tsx - View permission checks
- [ ] FileUploadZone.tsx - Upload permission by role and status
- [ ] DeliverableCard.tsx - Status-based visibility
- [ ] DeliverablesList.tsx - Filter by visibility
- [ ] FeedbackSummaryPanel.tsx - View approval history check
- [ ] RevisionQuotaIndicator.tsx - Who can see remaining count
- [ ] IssueCategorySelector.tsx - Client PM only
- [ ] PrioritySelector.tsx - Client PM only
- [ ] VideoCommentTimeline.tsx - Comment permission checks
- [ ] DeliverablesTab.tsx - Create deliverable permission
- [ ] DeliverableContext.tsx - Action permission guards

### Testing
- [ ] Test Admin role (full access)
- [ ] Test PM role (upload final, no approval)
- [ ] Test Team Member role (upload beta to assigned tasks only)
- [ ] Test Client PM role (approve, request revisions)
- [ ] Test Client Team role (view only, no actions)
- [ ] Test state transitions (pending → beta_ready → awaiting_approval)
- [ ] Test project status overrides (on hold, archived)
- [ ] Test payment requirement for final files
- [ ] Test 365-day expiry

## Estimated Effort

**Phase 1 (Foundation):** 2-3 hours
**Phase 2 (Component Updates):** 6-8 hours
**Phase 3 (Testing):** 2-3 hours
**Total:** 10-14 hours

## Dependencies

- Assumes `UserContext` exists with `user` and `currentProject`
- Assumes `user` object has `role`, `projectTeamMembership` properties
- May need to update user type definitions first if using display names

Save your analysis and refactoring plan to: `./analysis/deliverables-permissions-audit.md`
</output_format>

<verification>
Before completing, verify your analysis:

1. ✓ All 13 components reviewed
2. ✓ Permission gaps identified for each component
3. ✓ State-based logic gaps documented
4. ✓ Refactoring plan is step-by-step and actionable
5. ✓ Code examples show before/after clearly
6. ✓ Implementation priorities assigned
7. ✓ Testing strategy included
8. ✓ Effort estimates provided
</verification>

<success_criteria>
Your deliverable is successful when:
- Every component has been analyzed for permission checks
- Gaps are clearly documented with specific examples
- Refactoring plan provides actionable steps in priority order
- Code examples demonstrate correct implementation patterns
- Testing checklist covers all role × status combinations
- Document saved to `./analysis/deliverables-permissions-audit.md`
</success_criteria>
