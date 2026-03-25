# Motionify Permission Matrix

**Last Updated:** December 31, 2025  
**Purpose:** Single source of truth for role-based permissions across all features  
**Status:** Living document - update when adding new features

---

## Table of Contents

1. [Role Definitions](#role-definitions)
2. [Quick Reference Matrix](#quick-reference-matrix)
3. [Feature-by-Feature Permissions](#feature-by-feature-permissions)
4. [Implementation Status](#implementation-status)
5. [Usage Guidelines](#usage-guidelines)

---

## Role Definitions

### Database Values (Use These in Code)

| Role | Database Value | Description |
|------|----------------|-------------|
| **Super Admin** | `super_admin` | Full system access, creates projects/proposals, manages payments |
| **Project Manager** | `project_manager` | Manages assigned projects, uploads deliverables, coordinates team |
| **Team Member** | `team_member` | Executes tasks, uploads files to assigned tasks, collaborates |
| **Client** | `client` | Views projects, provides feedback (Primary Contact has approval rights) |

### Client Sub-Roles (Same Database Value)

Clients are differentiated by `is_primary_contact` flag in `project_team_members`:

- **Client Primary Contact**: `client` + `is_primary_contact: true`
  - Approves deliverables, makes payments, manages client team
- **Client Team Member**: `client` + `is_primary_contact: false`
  - Views deliverables, comments only

---

## Quick Reference Matrix

### Legend
- ✅ **Full Access** - Can perform action without restrictions
- ⚠️ **Conditional** - Can perform with specific conditions (see notes)
- ❌ **No Access** - Cannot perform action

### Core Features

| Feature | Super Admin | Project Manager | Team Member | Client Primary | Client Team |
|---------|-------------|-----------------|-------------|----------------|-------------|
| **Inquiries & Proposals** |
| View all inquiries | ✅ | ❌ | ❌ | ❌ | ❌ |
| View own inquiries | ✅ | ❌ | ❌ | ✅ | ✅ |
| Create proposals | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create new inquiry | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Projects** |
| Create projects | ✅ | ❌ | ❌ | ❌ | ❌ |
| View all projects | ✅ | ⚠️ | ⚠️ | ❌ | ❌ |
| View assigned projects | ✅ | ✅ | ✅ | ✅ | ✅ |
| Archive projects | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete projects | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Deliverables** |
| Create deliverables | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit deliverables | ✅ | ✅ | ❌ | ❌ | ❌ |
| Upload beta files | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| Upload final files | ✅ | ✅ | ❌ | ❌ | ❌ |
| View deliverables | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| Approve deliverables | ❌ | ❌ | ❌ | ✅ | ❌ |
| Request revisions | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Tasks** |
| Create tasks | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit tasks | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| Delete tasks | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign tasks | ✅ | ✅ | ✅ | ❌ | ❌ |
| Comment on tasks | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Team Management** |
| Invite Motionify team | ✅ | ✅ | ❌ | ❌ | ❌ |
| Remove Motionify team | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite client team | ✅ | ✅ | ❌ | ✅ | ❌ |
| Remove client team | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Files** |
| Upload files | ✅ | ✅ | ✅ | ✅ | ✅ |
| Download files | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete files | ✅ | ✅ | ✅ | ❌ | ❌ |
| Rename files | ✅ | ✅ | ✅ | ✅ | ❌ |
| **System** |
| User management | ✅ | ❌ | ❌ | ❌ | ❌ |
| System settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| View activity logs | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export activity logs | ✅ | ❌ | ❌ | ❌ | ❌ |

### Conditional Access Notes

- **⚠️ Team Member - Upload beta files**: Only to tasks they're assigned to
- **⚠️ Team Member - Edit tasks**: Only tasks they're assigned to
- **⚠️ Project Manager/Team Member - View all projects**: Only assigned projects
- **⚠️ Client - View deliverables**: Only when status is `beta_ready` or later
- **⚠️ Client - Download files**: Not available if deliverable status is `pending` or `in_progress`

---

## Feature-by-Feature Permissions

### 1. Inquiries & Proposals

#### 1.1 Inquiry Dashboard Access
```typescript
Permissions.canManageInquiries(user)
// Returns: super_admin OR client
```

**Permission Logic:**
- **Super Admin**: Can view ALL inquiries (global view)
- **Client**: Can view ONLY their own inquiries (filtered by `client_user_id`)
- **Project Manager/Team Member**: No access

**Implemented In:**
- `pages/admin/InquiryDashboard.tsx` (line 154)
- Backend: `lib/inquiries.ts`

#### 1.2 Create Proposal (UPDATED)
```typescript
Permissions.canCreateProposals(user)
// Returns: super_admin ONLY
```

**Permission Logic:**
- **Super Admin**: ✅ Can create proposals
- **Project Manager**: ❌ Cannot create proposals (changed from previous)
- **Others**: ❌ No access

**Implemented In:**
- `pages/admin/InquiryDashboard.tsx` (line 379)
- `pages/admin/ProposalBuilder.tsx` (line 67)
- `pages/admin/ProposalDetail.tsx` (line 71)

**UI Behavior:**
- "Create Proposal" button only visible to super_admin
- Direct URL access blocked by permission check

#### 1.3 Create New Inquiry (Client)
```typescript
isClient(user)
// Returns: true if role === 'client'
```

**Permission Logic:**
- **Client**: ✅ Can create new inquiry via modal
- **Others**: ❌ No access

**Implemented In:**
- `pages/admin/InquiryDashboard.tsx` (line 179)
- `components/admin/NewInquiryModal.tsx`

---

### 2. Projects

#### 2.1 View All Projects
```typescript
Permissions.canViewAllProjects(user)
// Returns: super_admin OR project_manager OR team_member
```

**Permission Logic:**
- **Motionify Team**: ✅ Can view all projects
- **Client**: ❌ Can only view assigned projects

**Implemented In:**
- `lib/permissions.ts` (line 92-94)

#### 2.2 Manage Team
```typescript
Permissions.canManageTeam(user)
// Returns: super_admin OR project_manager
```

**Permission Logic:**
- **Super Admin**: ✅ Full team management
- **Project Manager**: ✅ Can invite/remove team on assigned projects
- **Others**: ❌ No access

**Implemented In:**
- `lib/permissions.ts` (line 99-101)

---

### 3. Deliverables

#### 3.1 View Deliverables (Client)
```typescript
// Implemented in: utils/deliverablePermissions.ts
canViewDeliverable(user, deliverable, project)
```

**Permission Logic:**
- **Motionify Team**: ✅ Always can view
- **Client**: ⚠️ Conditional
  - `pending`: ❌ Cannot view
  - `in_progress`: ❌ Cannot view
  - `beta_ready` or later: ✅ Can view

**Implemented In:**
- `utils/deliverablePermissions.ts` (line 351)

#### 3.2 Approve Deliverable
```typescript
canApproveDeliverable(user, deliverable, project)
```

**Permission Logic:**
- **Client Primary Contact**: ✅ Can approve when `status === 'awaiting_approval'`
- **Others**: ❌ Cannot approve

**Validation:**
- Must be client role
- Must be primary contact
- Deliverable must be in `awaiting_approval` status

**Implemented In:**
- `utils/deliverablePermissions.ts` (line 359-360)
- `hooks/useDeliverablePermissions.ts`

#### 3.3 Request Revision
```typescript
canRequestRevision(user, deliverable, project)
```

**Permission Logic:**
- **Client Primary Contact**: ✅ Can request revisions
- **Others**: ❌ Cannot request

**Validation:**
- Must be client role
- Must be primary contact
- Project must have remaining revisions

**Implemented In:**
- `utils/deliverablePermissions.ts` (line 366-367)

#### 3.4 Upload Files to Deliverables
```typescript
canUploadBetaFiles(user) / canUploadFinalFiles(user)
```

**Permission Logic:**

**Beta Files:**
- **Super Admin**: ✅ Can upload
- **Project Manager**: ✅ Can upload
- **Team Member**: ⚠️ Can upload to assigned tasks only
- **Client**: ❌ Cannot upload

**Final Files:**
- **Super Admin**: ✅ Can upload
- **Project Manager**: ✅ Can upload
- **Others**: ❌ Cannot upload

**Implemented In:**
- `utils/deliverablePermissions.ts` (line 373, 379)

#### 3.5 Create/Edit Deliverables
```typescript
canCreateDeliverable(user)
canEditDeliverable(user, deliverable)
```

**Permission Logic:**
- **Super Admin**: ✅ Can create/edit
- **Project Manager**: ✅ Can create/edit
- **Others**: ❌ Cannot create/edit

**Implemented In:**
- `utils/deliverablePermissions.ts` (line 393, 398)

---

### 4. Tasks

#### 4.1 Create Tasks
**Permission Logic:**
- **Super Admin**: ✅ Can create
- **Project Manager**: ✅ Can create
- **Team Member**: ✅ Can create
- **Client**: ❌ Cannot create

**Note:** All three Motionify roles can create tasks for collaboration.

#### 4.2 Edit Tasks (IMPLEMENTED)
```typescript
canEditTask(user: User, task?: Task): boolean
```

**Permission Logic:**
- **Super Admin**: ✅ Can edit any task
- **Project Manager**: ✅ Can edit any task
- **Team Member**: ⚠️ Can edit only assigned tasks (checks both single and multiple assignees)
- **Client**: ❌ Cannot edit

**Validation:**
- Checks user role first
- For Team Members, verifies assignment via `task.assignee?.id` or `task.assignees[]`
- Returns false if task is not provided to Team Members

**UI Behavior:**
- Edit button appears on hover for authorized users
- Button is hidden for users without permission
- Opening edit modal validates permission with toast notification if denied
- Modal allows editing: title, status, and assignee

**Implemented In:**
- `utils/deliverablePermissions.ts` (lines 337-357) - Core permission logic
- `pages/ProjectDetail.tsx` - Task list rendering with permission checks
- `components/tasks/TaskEditModal.tsx` - Modal form component
- Permission check on task list (line ~550): Only shows Edit button if `canEditTask(user, task)`
- Permission check on edit handler (line ~194): Validates before opening modal

#### 4.3 Visibility (Internal vs Client)
**Permission Logic:**
- Tasks have `visibility` field: `'internal'` or `'client'`
- **Motionify Team**: Can see all tasks
- **Client**: Can only see tasks marked `visibility: 'client'`

**Implemented In:**
- `landing-page-new/src/lib/portal/components/ProjectOverview.tsx` (line 99)

---

### 5. Team Management

#### 5.1 Invite Client Team Members
**Permission Logic:**
- **Super Admin**: ✅ Can invite
- **Project Manager**: ✅ Can invite to assigned projects
- **Client Primary Contact**: ✅ Can invite to their projects
- **Others**: ❌ Cannot invite

#### 5.2 Remove Client Team Members
**Permission Logic:**
- **Super Admin**: ✅ Can remove
- **Project Manager**: ✅ Can remove from assigned projects
- **Client Primary Contact**: ⚠️ Can remove others, but NOT themselves
- **Others**: ❌ Cannot remove

**Special Rule:** Client Primary Contact must transfer primary contact role before removing themselves.

**Implemented In:**
- Referenced in `docs/user-types-permissions.md` (line 506-511)

---

### 6. System Settings

#### 6.1 Access Settings
```typescript
Permissions.canAccessSettings(user)
// Returns: super_admin ONLY
```

**Permission Logic:**
- **Super Admin**: ✅ Full system settings access
- **Others**: ❌ No access

**Implemented In:**
- `lib/permissions.ts` (line 106-108)

---

## Implementation Status

### ✅ Implemented Features

| Feature | Permission Function | Locations |
|---------|---------------------|-----------|
| Inquiry Dashboard Access | `Permissions.canManageInquiries()` | InquiryDashboard.tsx |
| Create Proposal | `Permissions.canCreateProposals()` | InquiryDashboard.tsx, ProposalBuilder.tsx |
| View All Projects | `Permissions.canViewAllProjects()` | permissions.ts |
| Manage Team | `Permissions.canManageTeam()` | permissions.ts |
| System Settings | `Permissions.canAccessSettings()` | permissions.ts |
| Deliverable Permissions | `useDeliverablePermissions()` | hooks/useDeliverablePermissions.ts |
| Client Primary Contact Check | `isClientPrimaryContact()` | utils/deliverablePermissions.ts |
| Task Editing Permissions | `canEditTask()` | utils/deliverablePermissions.ts, pages/ProjectDetail.tsx, components/tasks/TaskEditModal.tsx |

### 📋 Planned Features

| Feature | Expected Implementation | Priority |
|---------|------------------------|----------|
| File permissions | Create `canDeleteFile()`, `canRenameFile()` | High |
| Revision quota management | Create `canApproveAdditionalRevisions()` | Critical |
| Payment permissions | Create `canMakePayments()` | Critical |
| API key management | Create `canGenerateApiKeys()` | Medium |

---

## Usage Guidelines

### For Developers

#### 1. Adding a New Feature

When adding a new feature that requires permissions:

```typescript
// Step 1: Add permission function to lib/permissions.ts
export const Permissions = {
  // ... existing permissions
  
  canDoNewThing(user: User | null): boolean {
    if (!user) return false;
    return isSuperAdmin(user); // Or your logic
  },
};
```

```tsx
// Step 2: Use in components
import { Permissions } from '@/lib/permissions';

function MyComponent() {
  const { user } = useAuthContext();
  
  // Check permission before rendering
  if (!Permissions.canDoNewThing(user)) {
    return <AccessDenied />;
  }
  
  return (
    <div>
      {/* Conditional rendering */}
      {Permissions.canDoNewThing(user) && (
        <button>Do New Thing</button>
      )}
    </div>
  );
}
```

```typescript
// Step 3: Update this matrix document
// Add the new feature to the Quick Reference Matrix
// Document the permission logic in Feature-by-Feature section
```

#### 2. Checking Multiple Roles

```typescript
// Good: Use helper functions
if (isMotionifyAdmin(user)) { ... }
if (isClient(user)) { ... }

// Bad: Direct role checks (harder to maintain)
if (user.role === 'super_admin' || user.role === 'project_manager') { ... }
```

#### 3. Project-Specific Permissions

For features that depend on user's role IN A SPECIFIC PROJECT:

```typescript
import { isClientPrimaryContact } from '@/utils/deliverablePermissions';

// Check if user is primary contact in THIS project
const isPrimary = isClientPrimaryContact(user, project.id);

if (isPrimary) {
  // Show approval button
}
```

#### 4. State-Based Permissions

Some permissions depend on resource state:

```typescript
function canApprove(user: User, deliverable: Deliverable): boolean {
  // Check role
  if (user.role !== 'client') return false;
  
  // Check project-specific role
  if (!isClientPrimaryContact(user, deliverable.projectId)) return false;
  
  // Check state
  if (deliverable.status !== 'awaiting_approval') return false;
  
  return true;
}
```

### For Product/Design

#### Permission-Aware UI Design

When designing new features, consider:

1. **Who can see this?** - Should it be hidden or just disabled?
2. **Who can use this?** - Show tooltips explaining why it's disabled
3. **What's the state requirement?** - Document conditions (status, payment, etc.)

#### Example: Button States

```tsx
{/* Hidden for users without permission */}
{Permissions.canCreateProposals(user) && (
  <button>Create Proposal</button>
)}

{/* Visible but disabled with explanation */}
<button
  disabled={!canApprove}
  title={!canApprove ? "Only Primary Contact can approve" : ""}
>
  Approve
</button>
```

---

## Permission Helper Functions Reference

### Available in `lib/permissions.ts`

```typescript
// Role checks
isSuperAdmin(user: User | null): boolean
isProjectManager(user: User | null): boolean
isMotionifyAdmin(user: User | null): boolean
isMotionifyTeam(user: User | null): boolean
isClient(user: User | null): boolean

// Feature permissions
Permissions.canManageInquiries(user): boolean
Permissions.canCreateProposals(user): boolean
Permissions.canViewAllProjects(user): boolean
Permissions.canManageTeam(user): boolean
Permissions.canAccessSettings(user): boolean
```

### Available in `utils/deliverablePermissions.ts`

```typescript
// Client-specific checks
isClient(user: User): boolean
isClientPrimaryContact(user: User, projectId: string): boolean
isMotionifyTeam(user: User): boolean

// Deliverable permissions
canViewDeliverable(user, deliverable, project): PermissionResult
canApproveDeliverable(user, deliverable, project): PermissionResult
canRequestRevision(user, deliverable, project): PermissionResult
canUploadBetaFiles(user, project): PermissionResult
canUploadFinalFiles(user, project): PermissionResult
canEditDeliverable(user, deliverable): PermissionResult
canCreateDeliverable(user): PermissionResult
canViewFinalFiles(user, deliverable, project): PermissionResult
```

---

## Change Log

| Date | Change | Updated By |
|------|--------|------------|
| 2025-12-31 | Initial permission matrix created | AI Assistant |
| 2025-12-31 | Updated `canCreateProposals` to super_admin only | AI Assistant |

---

## Related Documentation

- [User Types & Permissions (Comprehensive)](./user-types-permissions.md) - Full permission specification
- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Development roadmap
- [Feature Status Matrix](./FEATURE_STATUS_MATRIX.md) - Feature implementation tracking

---

**Maintenance Notes:**
- Update this matrix when adding new features
- Keep Quick Reference Matrix in sync with code
- Document all conditional permissions with clear examples
- Review quarterly for permission drift
