# Motionify User Types, Permissions, and Jobs-to-be-Done

## Table of Contents
1. [User Types Overview](#user-types-overview)
2. [Role Mapping & Database Values](#role-mapping--database-values)
3. [Permissions Matrix](#permissions-matrix)
   - 3.1 [Project Management Permissions](#project-management-permissions)
   - 3.2 [Task Management Permissions](#task-management-permissions)
   - 3.3 [Deliverable Management Permissions](#deliverable-management-permissions)
   - 3.4 [File Management Permissions](#file-management-permissions)
   - 3.5 [Team Management Permissions](#team-management-permissions)
   - 3.6 [Financial & Billing Permissions](#financial--billing-permissions)
   - 3.7 [Revision Management Permissions](#revision-management-permissions)
   - 3.8 [Communication & Meetings Permissions](#communication--meetings-permissions)
   - 3.9 [System Administration Permissions](#system-administration-permissions)
   - 3.10 [API & Integrations Permissions](#api--integrations-permissions)
   - 3.11 [Data & Compliance Permissions](#data--compliance-permissions)
4. [State-Based Permissions](#state-based-permissions)
5. [Permission Enforcement Patterns](#permission-enforcement-patterns)
6. [Jobs-to-be-Done by User Type](#jobs-to-be-done-by-user-type)
7. [UI Implementation Requirements](#ui-implementation-requirements)
8. [Permission Utility Structure](#permission-utility-structure)
9. [Edge Cases & Special Scenarios](#edge-cases--special-scenarios)
10. [Database Schema Recommendations](#database-schema-recommendations)

## User Types Overview

Motionify implements a **5-role permission system** with fine-grained access control:

### 1. Motionify Admin (Super Admin)
- **Database Value:** `super_admin`
- **Primary Responsibilities:**
  - Creates projects and proposals
  - Handles payments and financial oversight
  - Approves revision count increases beyond quota
  - Full system access and user management
  - Project lifecycle management (archive, delete)

### 2. Motionify Support
- **Database Value:** `project_manager`
- **Primary Responsibilities:**
  - Accesses and manages assigned projects
  - Invites team members to projects
  - Uploads files to deliverables
  - Creates and assigns tasks
  - Oversees project execution and delivery

### 3. Motionify Team Member
- **Database Value:** `team_member`
- **Primary Responsibilities:**
  - Tackles assigned tasks
  - Replies to comments and collaborates
  - Uploads files to tasks and deliverables
  - Creates tasks within assigned projects
  - Executes hands-on creative work

### 4. Client Primary Contact
- **Database Value:** `client` with `is_primary_contact: true`
- **Primary Responsibilities:**
  - Accepts and negotiates pricing
  - Approves or requests changes to deliverables via revision request feature
  - Makes payments (50% advance, 50% balance)
  - Invites and removes client team members (full control)
  - Acts as main point of contact for Motionify team

### 5. Client Team Member
- **Database Value:** `client` with `is_primary_contact: false`
- **Primary Responsibilities:**
  - Writes comments on tasks, files, and deliverables
  - Reviews project progress
  - Provides feedback on deliverables
  - Limited collaboration and viewing permissions

## Role Mapping & Database Values

### Database Role Constraint

The `users` table enforces valid roles via CHECK constraint:

```sql
CONSTRAINT valid_user_role CHECK (
  role IN ('super_admin', 'project_manager', 'team_member', 'client')
)
```

### Role Mapping Table

| Display Name | Database Value | Primary Contact Flag | Description |
|--------------|----------------|----------------------|-------------|
| **Motionify Admin** | `super_admin` | N/A | Full system access, creates projects |
| **Motionify Support** | `project_manager` | N/A | Manages assigned projects, uploads deliverables |
| **Motionify Team Member** | `team_member` | N/A | Executes tasks, uploads files |
| **Client Primary Contact** | `client` | `TRUE` | Approves deliverables, makes payments |
| **Client Team Member** | `client` | `FALSE` | Comments and reviews only |

### Important Note on Types

The `/types.ts` file currently uses **display names** instead of database values:

```typescript
// CURRENT (INCORRECT - needs update)
role: 'Admin' | 'Project Manager' | 'Client' | 'Editor' | 'Designer'

// CORRECT (should match database)
role: 'super_admin' | 'project_manager' | 'team_member' | 'client'
```

**Action Required:** Update `/types.ts` to use database values for consistency.

### Helper Functions for Permission Checks

```typescript
function isMotionifyStaff(role: UserRole): boolean {
  return ['super_admin', 'project_manager', 'team_member'].includes(role);
}

function isClientPrimaryContact(user: User, projectId: string): boolean {
  return user.role === 'client' &&
         user.projectTeamMembership?.[projectId]?.isPrimaryContact === true;
}

function canManageClientTeam(user: User, projectId: string): boolean {
  if (user.role === 'super_admin') return true;
  if (user.role === 'project_manager') return true;
  if (user.role === 'client') {
    return isClientPrimaryContact(user, projectId);
  }
  return false;
}
```

## Permissions Matrix

### Project Management Permissions

| Permission | Admin | PM | Team | Client PM | Client Team |
|-----------|-------|----|----- |-----------|-------------|
| Create projects | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete projects | ✅ | ❌ | ❌ | ❌ | ❌ |
| Archive projects | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign Motionify team | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite Motionify team to project | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite client team | ✅ | ✅ | ❌ | ✅ | ❌ |
| Remove client team | ✅ | ✅ | ❌ | ✅ | ❌ |
| Create/edit tasks | ✅ | ✅ | ✅ | ❌ | ❌ |
| Assign tasks | ✅ | ✅ | ✅ | ✅ | ✅ |
| Follow tasks | ✅ | ✅ | ✅ | ✅ | ✅ |
| Accept project terms | ❌ | ❌ | ❌ | ✅ | ❌ |
| Negotiate pricing | ❌ | ❌ | ❌ | ✅ | ❌ |
| Approve deliverables | ❌ | ❌ | ❌ | ✅ | ❌ |
| Request revisions | ❌ | ❌ | ❌ | ✅ | ❌ |
| Upload/download files | ✅ | ✅ | ✅ | ✅ | ✅ |
| Comment on tasks/files | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage project status | ✅ | ❌ | ❌ | ❌ | ❌ |
| View activity logs | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export activity logs | ✅ | ❌ | ❌ | ❌ | ❌ |

**Key Notes:**
- **All 3 Motionify roles** (Admin, PM, Team) can create tasks
- **Client PM has full control** to invite AND remove client team members
- **Task assignment** is available to all roles for collaboration

### Task Management Permissions

| Permission | Admin | PM | Team | Client PM | Client Team |
|-----------|-------|----|----- |-----------|-------------|
| Create tasks | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit task details | ✅ | ✅ | ✅* | ❌ | ❌ |
| Delete tasks | ✅ | ✅ | ❌ | ❌ | ❌ |
| Change task status | ✅ | ✅ | ✅* | ✅** | ❌ |
| Set task visibility | ✅ | ✅ | ❌ | ❌ | ❌ |
| Add delivery notes | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve tasks | ❌ | ❌ | ❌ | ✅ | ❌ |
| Request task revisions | ❌ | ❌ | ❌ | ✅ | ❌ |
| Comment on tasks | ✅ | ✅ | ✅ | ✅ | ✅ |
| Assign team members | ✅ | ✅ | ✅ | ✅ | ❌ |
| View internal tasks | ✅ | ✅ | ✅ | ❌ | ❌ |
| View client-visible tasks | ✅ | ✅ | ✅ | ✅ | ✅ |
| Follow tasks for notifications | ✅ | ✅ | ✅ | ✅ | ✅ |

**Notes:**
- \* Team members can only edit/change status of **assigned tasks**
- \*\* Client PM can only change status to approve/reject deliverables
- Task visibility controls whether clients see the task (internal vs client-visible)

### Deliverable Management Permissions

**Hierarchical Relationship:** Deliverables contain Tasks as children.

```
Project
└── Deliverable (del_123: "Main Launch Video")
    ├── Task 1 (deliverableId: del_123, "Script Writing")
    ├── Task 2 (deliverableId: del_123, "Voiceover Recording")
    └── Task 3 (deliverableId: del_123, "Video Editing")
```

| Permission | Admin | PM | Team | Client PM | Client Team |
|-----------|-------|----|----- |-----------|-------------|
| Create deliverables | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit deliverable details | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete deliverables | ✅ | ❌ | ❌ | ❌ | ❌ |
| Upload beta files | ✅ | ✅ | ✅* | ❌ | ❌ |
| Upload final files | ✅ | ✅ | ❌ | ❌ | ❌ |
| View beta deliverables | ✅ | ✅ | ✅ | ✅** | ✅** |
| Approve deliverables | ❌ | ❌ | ❌ | ✅ | ❌ |
| Request revisions | ❌ | ❌ | ❌ | ✅ | ❌ |
| View approval history | ✅ | ✅ | ✅ | ✅ | ❌ |
| Access final files (paid) | ✅ | ✅ | ✅ | ✅† | ✅† |
| Download final files (365-day limit) | ✅ | ✅ | ✅ | ✅† | ✅† |

**Notes:**
- \* Team members can upload beta files **to tasks they're assigned to**
- \*\* Clients can view beta deliverables only when status is `beta_ready` or later
- † Final files accessible only **after 50% balance payment** received
- Final files automatically **expire 365 days** after delivery

### File Management Permissions

| Permission | Admin | PM | Team | Client PM | Client Team |
|-----------|-------|----|----- |-----------|-------------|
| Upload files | ✅ | ✅ | ✅ | ✅ | ✅ |
| Download files | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rename files | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete files | ✅ | ✅ | ✅ | ❌ | ❌ |
| Comment on files | ✅ | ✅ | ✅ | ✅ | ✅ |
| Organize files by deliverable | ✅ | ✅ | ✅ | ✅ | ✅ |
| View file history | ✅ | ✅ | ✅ | ✅ | ✅ |
| Restore previous versions | ✅ | ✅ | ❌ | ❌ | ❌ |
| Access expired files (>365 days) | ✅ | ✅ | ✅ | ❌ | ❌ |

**Notes:**
- Client Team Members cannot rename or delete files
- File version history maintains audit trail
- Expired files (>365 days after final delivery) accessible only to Motionify staff

### Team Management Permissions

| Permission | Admin | PM | Team | Client PM | Client Team |
|-----------|-------|----|----- |-----------|-------------|
| Add Motionify team members (global) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Remove Motionify team members (global) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite Motionify team to project | ✅ | ✅ | ❌ | ❌ | ❌ |
| Remove Motionify team from project | ✅ | ✅ | ❌ | ❌ | ❌ |
| Add client team members | ✅ | ✅ | ❌ | ✅ | ❌ |
| Remove client team members | ✅ | ✅ | ❌ | ✅ | ❌ |
| Transfer primary contact role | ✅ | ❌ | ❌ | ✅* | ❌ |
| View team activity | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage user roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| Deactivate user accounts | ✅ | ❌ | ❌ | ❌ | ❌ |

**Notes:**
- \* Client PM can transfer primary contact to another client team member
- Client PM cannot remove themselves (must transfer primary contact first)
- Project Manager can invite team members to their assigned projects only

### Financial & Billing Permissions

| Permission | Admin | PM | Team | Client PM | Client Team |
|-----------|-------|----|----- |-----------|-------------|
| View project budget | ✅ | ✅ | ❌ | ✅ | ❌ |
| Create invoices | ✅ | ❌ | ❌ | ❌ | ❌ |
| Upload invoices manually | ✅ | ❌ | ❌ | ❌ | ❌ |
| View payment history | ✅ | ✅ | ❌ | ✅ | ❌ |
| Download invoices | ✅ | ❌ | ❌ | ✅ | ❌ |
| Approve pricing/proposals | ❌ | ❌ | ❌ | ✅ | ❌ |
| Make payments (50% advance) | ❌ | ❌ | ❌ | ✅ | ❌ |
| Make payments (50% balance) | ❌ | ❌ | ❌ | ✅ | ❌ |
| Request additional revisions (beyond quota) | ❌ | ❌ | ❌ | ✅ | ❌ |
| Approve additional revision costs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Add revision quota to project | ✅ | ❌ | ❌ | ❌ | ❌ |
| View transaction history | ✅ | ❌ | ❌ | ✅ | ❌ |
| Configure payment gateway settings | ✅ | ❌ | ❌ | ❌ | ❌ |

**Notes:**
- Only Admin can approve paid additional revisions beyond quota
- Client PM must pay 50% advance before production begins
- Final files released only after 50% balance payment

### Revision Management Permissions

| Permission | Admin | PM | Team | Client PM | Client Team |
|-----------|-------|----|----- |-----------|-------------|
| View remaining revisions | ✅ | ✅ | ✅ | ✅ | ✅ |
| View revision history | ✅ | ✅ | ✅ | ✅ | ❌ |
| Request revisions (within quota) | ❌ | ❌ | ❌ | ✅ | ❌ |
| Request additional revisions (paid) | ❌ | ❌ | ❌ | ✅ | ❌ |
| Approve additional revision request | ✅ | ❌ | ❌ | ❌ | ❌ |
| Add revisions to quota | ✅ | ❌ | ❌ | ❌ | ❌ |
| Track revision usage | ✅ | ✅ | ❌ | ✅ | ❌ |
| Set revision limits per project | ✅ | ❌ | ❌ | ❌ | ❌ |

**Revision Workflow:**

1. **Within Quota:**
   - Client PM requests revision → Auto-approved → Revision count increments → Motionify team handles

2. **Beyond Quota:**
   - Client PM requests additional revision → Requires Admin approval + payment
   - Admin reviews request → Approves with pricing → Client PM pays
   - Admin adds revisions to quota → Revision count updated → Work proceeds

3. **Quota Rules:**
   - Each project has predefined revision limits (e.g., 3 revisions included)
   - Additional revisions require approval and payment
   - Revision count resets per deliverable, not per project

### Communication & Meetings Permissions

| Permission | Admin | PM | Team | Client PM | Client Team |
|-----------|-------|----|----- |-----------|-------------|
| Comment on tasks/files | ✅ | ✅ | ✅ | ✅ | ✅ |
| @mention users | ✅ | ✅ | ✅ | ✅ | ✅ |
| Schedule meetings | ✅ | ✅ | ❌ | ✅ | ❌ |
| Accept/decline meetings | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reschedule meetings | ✅ | ✅ | ❌ | ✅ | ❌ |
| Cancel meetings | ✅ | ✅ | ❌ | ✅ | ❌ |
| View meeting history | ✅ | ✅ | ✅ | ✅ | ✅ |
| Configure notification preferences | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mute project notifications | ✅ | ✅ | ✅ | ✅ | ✅ |
| Unmute project notifications | ✅ | ✅ | ✅ | ✅ | ✅ |
| Set "do not disturb" hours | ✅ | ✅ | ✅ | ✅ | ✅ |

**Notes:**
- Meetings can be scheduled via Google Meet, Zoom, or Microsoft Teams integration
- Both Motionify and Client PM can initiate, reschedule, or cancel meetings
- Team members can only accept/decline, not initiate meetings
- All roles can customize their notification preferences

### System Administration Permissions

| Permission | Admin | PM | Team | Client PM | Client Team |
|-----------|-------|----|----- |-----------|-------------|
| User management (create/edit/delete) | ✅ | ❌ | ❌ | ❌ | ❌ |
| System settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| View all projects | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage payment settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configure email templates | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configure notification rules | ✅ | ❌ | ❌ | ❌ | ❌ |
| View system logs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage service catalog | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configure delivery expiry rules | ✅ | ❌ | ❌ | ❌ | ❌ |

### API & Integrations Permissions

| Permission | Admin | PM | Team | Client PM | Client Team |
|-----------|-------|----|----- |-----------|-------------|
| Generate API keys | ✅ | ❌ | ❌ | ❌ | ❌ |
| View API keys | ✅ | ❌ | ❌ | ❌ | ❌ |
| Revoke API keys | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configure webhooks | ✅ | ❌ | ❌ | ❌ | ❌ |
| View webhook logs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Access API documentation | ✅ | ✅ | ❌ | ✅ | ❌ |
| Test API endpoints | ✅ | ❌ | ❌ | ❌ | ❌ |

**Notes:**
- API access limited to Admin for security
- Webhooks can trigger on events: deliverable_approved, payment_received, revision_requested
- API keys have scoped permissions and expiry dates

### Data & Compliance Permissions

| Permission | Admin | PM | Team | Client PM | Client Team |
|-----------|-------|----|----- |-----------|-------------|
| Export project data (CSV/JSON) | ✅ | ✅ | ❌ | ✅ | ❌ |
| Export all data (backup) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Request data deletion (GDPR) | ❌ | ❌ | ❌ | ✅ | ❌ |
| Process deletion requests | ✅ | ❌ | ❌ | ❌ | ❌ |
| View audit trail (own actions) | ✅ | ✅ | ✅ | ✅ | ✅ |
| View audit trail (all actions) | ✅ | ✅ | ❌ | ✅ | ❌ |
| Export audit logs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configure data retention | ✅ | ❌ | ❌ | ❌ | ❌ |
| Anonymize user data | ✅ | ❌ | ❌ | ❌ | ❌ |

**GDPR Compliance Notes:**
- Client PM can request deletion of their organization's data
- Admin must process within 30 days
- Audit logs are anonymized (PII removed) but events retained for compliance
- File expiry (365 days) is separate from data deletion

## State-Based Permissions

Permissions dynamically change based on **project status**, **deliverable status**, and **time constraints**.

### Project Status-Based Rules

| Project Status | Permission Effects |
|---------------|-------------------|
| **Draft** | - Only Admin/PM can view<br>- No client access<br>- Limited file uploads<br>- No deliverable approvals |
| **Active** | - All permissions as documented above<br>- Full feature access<br>- Client can view and interact |
| **Awaiting Payment** | - Client PM **cannot approve** new deliverables<br>- No new revision requests<br>- Read-only for client team<br>- Motionify team can still work |
| **On Hold** | - **No task creation** (except Admin override)<br>- **No file uploads** (except Admin)<br>- Status changes locked<br>- Comments still allowed |
| **Completed** | - **Read-only** for all except Admin<br>- Files accessible for **365 days**<br>- No new tasks/comments<br>- Audit trail preserved |
| **Archived** | - **Admin read-only** access only<br>- All others: no access<br>- Cannot be reactivated<br>- Permanent archival |

### Deliverable Status-Based Rules

| Deliverable Status | Permission Effects |
|-------------------|-------------------|
| **pending** | - Motionify team can upload files<br>- Clients **cannot view**<br>- Internal work phase |
| **in_progress** | - Team uploads files<br>- Clients still **cannot view**<br>- Task execution phase |
| **beta_ready** | - Client PM/Team **can view beta** with watermark<br>- Client PM **cannot approve yet**<br>- Review-only phase |
| **awaiting_approval** | - Client PM **can approve or reject**<br>- Motionify team **cannot edit** (locked)<br>- Decision phase |
| **approved** | - Awaiting 50% balance payment<br>- **No final file access** until paid<br>- Invoice generated |
| **payment_pending** | - Client PM must pay to proceed<br>- Final files withheld<br>- Reminders sent |
| **final_delivered** | - **Full access** to final files<br>- **365-day expiry countdown** starts<br>- Project completion |
| **rejected** | - Motionify team can re-upload<br>- **Revision count increments**<br>- Back to in_progress |

### Time-Based Constraints

| Constraint | Duration | Permission Effect |
|-----------|----------|------------------|
| **Delivery notes edit window** | 1 hour | After submitting task for approval, team has 1hr to edit delivery notes |
| **File access expiry** | 365 days | After final delivery, files auto-expire. Only Motionify staff can access expired files |
| **Magic link validity** | 15 minutes | Authentication magic links expire after 15 minutes |
| **Invitation expiry** | 7 days | Team invitations expire and must be resent |
| **Payment grace period** | 7 days | After deliverable approval, client has 7 days to pay before project paused |
| **Revision window** | 30 days | Revisions must be requested within 30 days of delivery (configurable) |

### State Transition Rules

**Project State Machine:**
```
Draft → Active → [On Hold] → Completed → Archived
              ↓
        Awaiting Payment
```

**Deliverable State Machine:**
```
pending → in_progress → beta_ready → awaiting_approval → approved → payment_pending → final_delivered
                                           ↓
                                        rejected (back to in_progress)
```

**Permission Checks Must Include State:**
```typescript
function canApproveDeliverable(user: User, deliverable: Deliverable, project: Project): boolean {
  // Role check
  if (!isClientPrimaryContact(user, project.id)) return false;

  // State check
  if (deliverable.status !== 'awaiting_approval') return false;

  // Project state check
  if (project.status === 'on_hold' || project.status === 'archived') return false;

  return true;
}
```

## Permission Enforcement Patterns

### Helper Functions

```typescript
// File: /utils/permissions.ts

export function isMotionifyStaff(role: UserRole): boolean {
  return ['super_admin', 'project_manager', 'team_member'].includes(role);
}

export function isClientPrimaryContact(user: User, projectId: string): boolean {
  return user.role === 'client' &&
         user.projectTeamMembership?.[projectId]?.isPrimaryContact === true;
}

export function canApproveDeliverable(user: User, project: Project): boolean {
  return user.role === 'client' &&
         isClientPrimaryContact(user, project.id);
}

export function canAccessFinalFiles(user: User, deliverable: Deliverable): boolean {
  // Motionify staff always have access
  if (isMotionifyStaff(user.role)) {
    return true;
  }

  // Clients only if payment received and not expired
  if (user.role === 'client') {
    return deliverable.balancePaymentReceived &&
           !isExpired(deliverable.expiresAt);
  }

  return false;
}

export function canCreateTask(user: User): boolean {
  // All 3 Motionify roles can create tasks
  return user.role === 'super_admin' ||
         user.role === 'project_manager' ||
         user.role === 'team_member';
}

export function canRemoveClientMember(
  user: User,
  project: Project,
  targetUser: User
): boolean {
  // Admin and PM always can
  if (user.role === 'super_admin' || user.role === 'project_manager') {
    return true;
  }

  // Client PM can remove others, but not themselves
  if (user.role === 'client' && isClientPrimaryContact(user, project.id)) {
    return targetUser.id !== user.id; // Cannot remove self
  }

  return false;
}

export function canManageRevisions(user: User): boolean {
  // Only Admin can approve paid additional revisions
  return user.role === 'super_admin';
}

function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date() > new Date(expiresAt);
}
```

### State-Based Permission Checks

```typescript
export function canPerformAction(
  user: User,
  action: string,
  resource: any,
  context: {
    projectStatus?: string;
    deliverableStatus?: string;
    taskStatus?: string;
  }
): boolean {
  // Project status restrictions
  if (context.projectStatus === 'archived') {
    return user.role === 'super_admin'; // Only admin can access archived
  }

  if (context.projectStatus === 'on_hold' && action === 'create_task') {
    return user.role === 'super_admin'; // Only admin can create tasks when on hold
  }

  if (context.projectStatus === 'awaiting_payment' && action === 'approve_deliverable') {
    return false; // No approvals until payment
  }

  // Deliverable status restrictions
  if (context.deliverableStatus === 'awaiting_approval' && action === 'edit_deliverable') {
    return user.role === 'super_admin'; // Locked during approval
  }

  if (context.deliverableStatus === 'pending' && action === 'view_deliverable') {
    return isMotionifyStaff(user.role); // Clients cannot view pending deliverables
  }

  // Continue with normal permission checks...
  return true;
}
```

## Jobs-to-be-Done by User Type

### Motionify Admin Jobs-to-be-Done

**Primary Responsibilities:**
- System administration and user management
- Project creation and financial oversight
- Revision quota management
- System monitoring and reporting

**Key Jobs:**

1. **Create and configure new projects**
   - Set up project scope, deliverables, and revision limits
   - Assign Motionify project managers and team members
   - Configure project-specific settings and permissions
   - Create and send proposals to clients

2. **Financial management**
   - Handle payment processing and tracking
   - Approve additional revision requests (beyond quota)
   - Add revision quota to projects
   - Create and upload invoices manually
   - Monitor payment schedules and reminders

3. **User account management**
   - Create new Motionify staff accounts (PM, Team Member)
   - Deactivate/activate user accounts as needed
   - Assign appropriate roles and permissions
   - Monitor user activity and system usage

4. **Project lifecycle management**
   - Archive completed projects
   - Delete test/cancelled projects
   - Monitor project progress and intervene when needed
   - Handle project status transitions (on hold, completed, archived)
   - Override state restrictions when necessary

5. **System monitoring and reporting**
   - View comprehensive activity logs across all projects
   - Export audit data for analysis and compliance
   - Monitor system health and performance
   - Generate reports on project completion rates and team productivity
   - Configure system-wide settings and rules

6. **Client onboarding**
   - Invite client primary contacts to projects
   - Handle client account issues and access requests
   - Process GDPR data deletion requests
   - Monitor client activity and engagement

### Motionify Support Jobs-to-be-Done

**Primary Responsibilities:**
- Project execution and delivery
- Team coordination and management
- Deliverable uploads and quality control
- Client communication

**Key Jobs:**

1. **Project setup and team management**
   - Access assigned projects
   - Invite Motionify team members to projects
   - Invite client team members to projects
   - Assign tasks to team members
   - Monitor team workload and progress

2. **Deliverable management**
   - Create deliverables within projects
   - Upload files to deliverables (beta and final)
   - Organize files by deliverable
   - Ensure quality before client submission
   - Track deliverable approval status

3. **Task creation and oversight**
   - Create tasks within deliverables (hierarchical structure)
   - Set task visibility (internal vs client-visible)
   - Assign tasks to team members
   - Monitor task progress and completion
   - Review delivery notes before submission

4. **Client communication**
   - Respond to client comments and questions
   - Schedule meetings with clients
   - Provide project updates and status reports
   - Clarify requirements and deliverables
   - Handle client feedback professionally

5. **Quality assurance**
   - Review all work before client submission
   - Ensure deliverables meet project scope
   - Handle revision requests from clients
   - Maintain project documentation and history
   - Track revision usage

### Motionify Team Member Jobs-to-be-Done

**Primary Responsibilities:**
- Task execution and completion
- File uploads and creative work
- Collaboration with team and clients
- Quality delivery

**Key Jobs:**

1. **Task execution**
   - View and tackle assigned tasks
   - Update task status and progress
   - Create new tasks within assigned projects
   - Complete tasks within deadlines
   - Add delivery notes when submitting work

2. **File management**
   - Upload files to tasks and deliverables (beta phase)
   - Download and review project files
   - Organize files appropriately
   - Comment on files to provide context
   - Ensure files meet quality standards

3. **Team collaboration**
   - Reply to comments on tasks and files
   - Participate in team discussions
   - Follow relevant tasks for updates
   - Coordinate with other team members
   - Share knowledge and best practices

4. **Client interaction**
   - Respond to client comments
   - Clarify requirements when needed
   - Provide work-in-progress updates
   - Handle client feedback professionally
   - Ensure client satisfaction

5. **Quality delivery**
   - Review work before submission
   - Ensure deliverables meet requirements
   - Handle revision requests efficiently
   - Maintain attention to detail
   - Meet project timelines

### Client Primary Contact Jobs-to-be-Done

**Primary Responsibilities:**
- Project approvals and decision-making
- Payment processing
- Client team management
- Quality control and feedback

**Key Jobs:**

1. **Project terms and financial management**
   - Review and accept project terms and conditions
   - Negotiate pricing with Motionify Admin
   - Approve project proposals
   - Make 50% advance payment to initiate project
   - Make 50% balance payment to access final deliverables
   - Request additional revisions (beyond quota) when needed
   - View payment history and invoices

2. **Deliverable approval workflow**
   - View beta deliverables (with watermark)
   - Approve deliverables when satisfactory
   - Request revisions via revision request feature
   - Provide detailed feedback on deliverables
   - Track revision usage and remaining quota
   - Ensure work meets project scope and requirements

3. **Client team management**
   - Invite client team members to projects (full control)
   - Remove client team members when needed
   - Assign tasks to client team for review
   - Monitor client team activity
   - Transfer primary contact role if needed (cannot remove self)

4. **Project oversight**
   - Monitor project progress and timelines
   - Schedule meetings with Motionify team
   - Coordinate between client stakeholders and Motionify
   - View project activity logs
   - Export project data for internal reporting

5. **Communication and coordination**
   - Serve as primary point of contact for Motionify team
   - Facilitate meetings and discussions
   - Ensure clear communication throughout project lifecycle
   - Escalate issues when necessary
   - Provide timely feedback and approvals

### Client Team Member Jobs-to-be-Done

**Primary Responsibilities:**
- Reviewing deliverables and providing feedback
- Commenting on tasks and files
- Limited collaboration
- Supporting primary contact

**Key Jobs:**

1. **Deliverable review**
   - View beta deliverables when available
   - View final deliverables after payment
   - Download files for review
   - Provide input on quality and requirements
   - Support primary contact in decision-making

2. **Feedback and comments**
   - Write comments on tasks and files
   - Provide feedback on deliverables
   - Participate in discussions
   - Share stakeholder perspectives
   - Clarify requirements when asked

3. **Task collaboration**
   - View client-visible tasks
   - Comment on tasks to provide input
   - Follow relevant tasks to stay informed
   - Participate in task discussions as needed
   - Assign tasks to other team members for awareness

4. **Project monitoring**
   - View project progress and status
   - Access project documentation and resources
   - Stay informed about project developments
   - Monitor timelines and deliverables
   - Participate in discussions within scope

5. **Communication**
   - Communicate with Motionify team through comments
   - Attend meetings when invited
   - Provide feedback on specific tasks and files
   - Escalate issues to Client Primary Contact when necessary
   - Configure personal notification preferences

## UI Implementation Requirements

### User Type Identification

1. **Visual Distinction**
   - Different colored badges for each user type:
     - **Admin:** Red badge with "Admin" label
     - **PM:** Blue badge with "PM" label
     - **Team:** Green badge with "Team" label
     - **Client PM:** Gold badge with crown icon + "Primary" label
     - **Client Team:** Gray badge with "Client" label
   - Role-specific avatars or icons
   - Clear role labels in user profiles and activity feeds

2. **Permission-Based UI Elements**
   - Conditional rendering based on `PermissionService` checks
   - Disabled states for actions user cannot perform
   - Tooltips explaining why certain actions are unavailable
   - State-aware UI (e.g., "Locked during approval" for deliverables)

3. **Role-Specific Dashboards**
   - Custom dashboard layouts for each user type
   - Role-appropriate quick actions and shortcuts
   - Personalized activity feeds and notifications
   - Different navigation menus based on permissions

### Key UI Components by User Type

**Motionify Admin UI Components:**
- System administration panel
- User management interface (create, edit, deactivate users)
- Project creation wizard
- Comprehensive reporting tools
- Global activity monitor
- Financial dashboard (payments, invoices, revision approvals)
- API key management interface
- System settings panel

**Motionify Support UI Components:**
- Project dashboard (assigned projects only)
- Task management interface (create, assign, monitor)
- Deliverable upload interface (beta and final)
- File upload and organization tools
- Team invitation interface
- Client communication tools
- Meeting scheduler
- Project progress tracking

**Motionify Team Member UI Components:**
- Task list (assigned tasks prominently displayed)
- File upload interface (beta uploads to assigned tasks)
- Comment and collaboration tools
- Delivery notes editor
- Task progress tracker
- Team collaboration features
- Notification center

**Client Primary Contact UI Components:**
- Project approval workflow (accept terms, approve deliverables)
- Payment management interface (invoices, payment buttons)
- Team invitation and management panel
- Revision request form (rich feedback with attachments)
- Budget and payment history view
- Project oversight dashboard
- Meeting scheduler
- Data export interface

**Client Team Member UI Components:**
- Task comment interface (read-only tasks with comment ability)
- File review and feedback tools
- Limited project view (client-visible content only)
- Communication tools
- Activity feed with relevant updates
- Notification center

### State-Aware UI Indicators

```typescript
// Example: Deliverable card shows different UI based on status

function DeliverableCard({ deliverable, user, project }) {
  const status = deliverable.status;
  const role = user.role;

  // State-based visibility
  if (status === 'pending' && role === 'client') {
    return null; // Don't show to clients
  }

  // State-based actions
  const canApprove =
    status === 'awaiting_approval' &&
    isClientPrimaryContact(user, project.id) &&
    project.status !== 'on_hold';

  const canEdit =
    status !== 'awaiting_approval' &&
    (role === 'super_admin' || role === 'project_manager');

  return (
    <Card>
      <StatusBadge status={status} />
      {status === 'beta_ready' && <WatermarkIcon />}
      {canApprove && <ApproveButton />}
      {canEdit && <EditButton />}
      {status === 'final_delivered' && (
        <ExpiryCountdown expiresAt={deliverable.expiresAt} />
      )}
    </Card>
  );
}
```

### Implementation Strategy

1. **Backend Implementation**
   - Extend database schema with all 5 roles
   - Implement `PermissionService` class for all checks
   - Create role-based API middleware
   - Add state-based validation in API endpoints
   - Implement comprehensive audit logging

2. **Frontend Implementation**
   - Create `usePermissions()` hook for permission checks
   - Implement permission-based component rendering
   - Build role-appropriate navigation and menus
   - Create personalized dashboards for each user type
   - Add state indicators to all status-dependent UI

3. **Testing and Validation**
   - Unit tests for `PermissionService` methods
   - Integration tests for each permission matrix row
   - E2E tests for complete user workflows
   - State transition testing (project/deliverable statuses)
   - Performance testing with different user loads

## Permission Utility Structure

### Core Permission Service

```typescript
// File: /utils/permissions.ts

import { User, Project, Task, Deliverable, UserRole } from '@/types';

export class PermissionService {
  // ============================================
  // PROJECT PERMISSIONS
  // ============================================

  static canCreateProject(user: User): boolean {
    return user.role === 'super_admin';
  }

  static canArchiveProject(user: User): boolean {
    return user.role === 'super_admin';
  }

  static canDeleteProject(user: User): boolean {
    return user.role === 'super_admin';
  }

  // ============================================
  // TASK PERMISSIONS
  // ============================================

  static canCreateTask(user: User): boolean {
    return ['super_admin', 'project_manager', 'team_member'].includes(user.role);
  }

  static canEditTask(user: User, task: Task): boolean {
    if (user.role === 'super_admin' || user.role === 'project_manager') {
      return true;
    }
    if (user.role === 'team_member') {
      return task.assignees?.some(a => a.id === user.id) ?? false;
    }
    return false;
  }

  static canDeleteTask(user: User): boolean {
    return user.role === 'super_admin' || user.role === 'project_manager';
  }

  static canSetTaskVisibility(user: User): boolean {
    return user.role === 'super_admin' || user.role === 'project_manager';
  }

  // ============================================
  // DELIVERABLE PERMISSIONS
  // ============================================

  static canApproveDeliverable(user: User, project: Project): boolean {
    if (user.role !== 'client') return false;
    return this.isClientPrimaryContact(user, project.id);
  }

  static canUploadFinalFiles(user: User): boolean {
    return user.role === 'super_admin' || user.role === 'project_manager';
  }

  static canAccessFinalFiles(user: User, deliverable: Deliverable): boolean {
    // Motionify staff always have access
    if (['super_admin', 'project_manager', 'team_member'].includes(user.role)) {
      return true;
    }

    // Clients only if paid and not expired
    if (user.role === 'client') {
      return deliverable.balancePaymentReceived &&
             !this.isExpired(deliverable.expiresAt);
    }

    return false;
  }

  // ============================================
  // FINANCIAL PERMISSIONS
  // ============================================

  static canApproveAdditionalRevisions(user: User): boolean {
    return user.role === 'super_admin';
  }

  static canAddRevisionQuota(user: User): boolean {
    return user.role === 'super_admin';
  }

  static canViewBudget(user: User, project: Project): boolean {
    if (['super_admin', 'project_manager'].includes(user.role)) return true;
    if (user.role === 'client') {
      return this.isClientPrimaryContact(user, project.id);
    }
    return false;
  }

  static canMakePayments(user: User, project: Project): boolean {
    return user.role === 'client' && this.isClientPrimaryContact(user, project.id);
  }

  // ============================================
  // TEAM MANAGEMENT PERMISSIONS
  // ============================================

  static canRemoveClientMember(user: User, project: Project, target: User): boolean {
    if (user.role === 'super_admin' || user.role === 'project_manager') {
      return true;
    }
    if (user.role === 'client' && this.isClientPrimaryContact(user, project.id)) {
      return target.id !== user.id; // Cannot remove self
    }
    return false;
  }

  static canInviteClientMember(user: User, project: Project): boolean {
    if (['super_admin', 'project_manager'].includes(user.role)) return true;
    if (user.role === 'client') {
      return this.isClientPrimaryContact(user, project.id);
    }
    return false;
  }

  // ============================================
  // STATE-BASED PERMISSIONS
  // ============================================

  static canPerformAction(
    user: User,
    action: string,
    resource: any,
    context: { projectStatus?: string; deliverableStatus?: string }
  ): boolean {
    // Project status restrictions
    if (context.projectStatus === 'archived') {
      return user.role === 'super_admin';
    }

    if (context.projectStatus === 'on_hold' && action === 'create_task') {
      return user.role === 'super_admin';
    }

    if (context.projectStatus === 'awaiting_payment' && action === 'approve_deliverable') {
      return false; // No approvals until payment
    }

    // Deliverable status restrictions
    if (context.deliverableStatus === 'awaiting_approval' && action === 'edit_deliverable') {
      return user.role === 'super_admin'; // Locked during approval
    }

    if (context.deliverableStatus === 'pending' && action === 'view_deliverable') {
      return this.isMotionifyStaff(user.role);
    }

    // Default to normal permission check
    return true;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private static isClientPrimaryContact(user: User, projectId: string): boolean {
    return user.projectTeamMembership?.[projectId]?.isPrimaryContact === true;
  }

  private static isMotionifyStaff(role: UserRole): boolean {
    return ['super_admin', 'project_manager', 'team_member'].includes(role);
  }

  private static isExpired(expiresAt: Date | null): boolean {
    if (!expiresAt) return false;
    return new Date() > new Date(expiresAt);
  }
}
```

### Permission Constants

```typescript
// File: /constants/permissions.ts

export const PERMISSIONS = {
  // Project Permissions
  PROJECT_CREATE: 'project:create',
  PROJECT_DELETE: 'project:delete',
  PROJECT_ARCHIVE: 'project:archive',
  PROJECT_MANAGE_STATUS: 'project:manage_status',

  // Task Permissions
  TASK_CREATE: 'task:create',
  TASK_EDIT: 'task:edit',
  TASK_DELETE: 'task:delete',
  TASK_APPROVE: 'task:approve',
  TASK_SET_VISIBILITY: 'task:set_visibility',

  // Deliverable Permissions
  DELIVERABLE_APPROVE: 'deliverable:approve',
  DELIVERABLE_UPLOAD_FINAL: 'deliverable:upload_final',
  DELIVERABLE_ACCESS_FINAL: 'deliverable:access_final',

  // Financial Permissions
  BILLING_VIEW: 'billing:view',
  BILLING_MAKE_PAYMENT: 'billing:make_payment',
  REVISION_APPROVE_ADDITIONAL: 'revision:approve_additional',
  REVISION_ADD_QUOTA: 'revision:add_quota',

  // Team Management
  TEAM_INVITE_MOTIONIFY: 'team:invite_motionify',
  TEAM_INVITE_CLIENT: 'team:invite_client',
  TEAM_REMOVE_CLIENT: 'team:remove_client',

  // System Administration
  SYSTEM_ADMIN: 'system:admin',
  USER_MANAGE: 'user:manage',
  AUDIT_EXPORT: 'audit:export',

  // API & Integrations
  API_GENERATE_KEYS: 'api:generate_keys',
  WEBHOOK_CONFIGURE: 'webhook:configure',

  // Data & Compliance
  DATA_EXPORT: 'data:export',
  DATA_DELETE_REQUEST: 'data:delete_request',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
```

### API Middleware

```typescript
// File: /middleware/requirePermission.ts

import { Request, Response, NextFunction } from 'express';
import { PermissionService } from '@/utils/permissions';
import { PERMISSIONS, Permission } from '@/constants/permissions';

export function requirePermission(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // From JWT middleware

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Map permission string to PermissionService method
    const hasPermission = checkPermission(user, permission, req);

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `You do not have permission to perform this action: ${permission}`
      });
    }

    next();
  };
}

function checkPermission(user: any, permission: Permission, req: Request): boolean {
  switch (permission) {
    case PERMISSIONS.PROJECT_CREATE:
      return PermissionService.canCreateProject(user);

    case PERMISSIONS.TASK_CREATE:
      return PermissionService.canCreateTask(user);

    case PERMISSIONS.DELIVERABLE_APPROVE:
      const project = req.body.project; // Assume project in request
      return PermissionService.canApproveDeliverable(user, project);

    // ... map all other permissions

    default:
      return false;
  }
}

// Usage in routes
import { Router } from 'express';
const router = Router();

router.post('/projects',
  requireAuth(),
  requirePermission(PERMISSIONS.PROJECT_CREATE),
  createProjectHandler
);

router.post('/projects/:id/tasks',
  requireAuth(),
  requirePermission(PERMISSIONS.TASK_CREATE),
  createTaskHandler
);
```

### React Hook for Permissions

```typescript
// File: /hooks/usePermissions.ts

import { useContext } from 'react';
import { UserContext } from '@/contexts/UserContext';
import { PermissionService } from '@/utils/permissions';
import { Permission } from '@/constants/permissions';

export function usePermissions() {
  const { user, currentProject } = useContext(UserContext);

  const can = (permission: Permission, resource?: any): boolean => {
    if (!user) return false;

    // Map permission to PermissionService method
    switch (permission) {
      case 'project:create':
        return PermissionService.canCreateProject(user);

      case 'task:create':
        return PermissionService.canCreateTask(user);

      case 'deliverable:approve':
        return PermissionService.canApproveDeliverable(user, resource || currentProject);

      // ... map other permissions

      default:
        return false;
    }
  };

  return { can, user };
}

// Usage in components
function ProjectHeader() {
  const { can } = usePermissions();

  return (
    <div>
      {can('project:create') && (
        <Button>Create Project</Button>
      )}
      {can('task:create') && (
        <Button>Create Task</Button>
      )}
    </div>
  );
}
```

## Edge Cases & Special Scenarios

### 1. Multi-Tenancy Scenarios

**Scenario:** User is Client PM on Project A but Client Team Member on Project B

**Resolution:**
- Permissions are **project-scoped**
- Check `is_primary_contact` flag per project using `project_team_members` table
- User sees different UI/actions based on their role in each project

```typescript
function getUserRoleInProject(user: User, projectId: string): string {
  const membership = user.projectTeamMembership?.[projectId];
  if (!membership) return 'none';

  if (user.role === 'client' && membership.isPrimaryContact) {
    return 'client_pm';
  }
  return user.role;
}
```

### 2. Delegation & Vacation Coverage

**Scenario:** Client PM on vacation, needs temporary delegate to approve deliverables

**Resolution:**
- Add `acting_role` and `acting_until` columns to `project_team_members` table
- Admin or Client PM can assign temporary acting primary contact
- Acting role automatically expires after specified date

```sql
-- Temporary delegation
UPDATE project_team_members
SET acting_role = 'primary_contact',
    acting_until = '2025-12-31'
WHERE user_id = 'delegate_user_id' AND project_id = 'project_123';
```

### 3. File Expiry & Re-Access

**Scenario:** Final files expired (365 days), client needs access again

**Resolution:**
- Client PM requests file re-access extension (may incur fee)
- Admin reviews request and approves with optional payment
- Admin extends `expiresAt` date on deliverable
- Client regains access for additional period

### 4. Revision Quota Exhausted

**Scenario:** Client exceeds revision quota, Admin hasn't approved additional revisions

**Resolution:**
- Block revision request UI for Client PM
- Show "Request Additional Revisions" button instead
- Admin receives notification of additional revision request
- Revision request blocked until Admin approves + Client pays

### 5. Self-Removal Prevention

**Scenario:** Client PM tries to remove themselves from project

**Resolution:**
- Check `targetUser.id !== currentUser.id` before allowing removal
- Require Client PM to transfer primary contact role first
- Show error message: "You must transfer primary contact role before leaving"

### 6. GDPR Data Deletion

**Scenario:** Client PM requests complete data deletion of their organization

**Resolution:**
- Client PM submits GDPR deletion request via portal
- Admin receives notification and has 30 days to process
- Admin anonymizes PII in audit logs (replace with "Deleted User")
- Admin deletes all contact info, files, and personal data
- Audit trail events preserved (anonymized) for compliance

### 7. Payment Grace Period Expired

**Scenario:** Client PM approved deliverable but hasn't paid balance for 7 days

**Resolution:**
- Automated reminder emails sent (3 days, 5 days, 7 days)
- After 7 days, project status changes to `awaiting_payment`
- No new deliverable approvals allowed
- Final files withheld until payment received

### 8. Concurrent Edits

**Scenario:** Two team members edit same task simultaneously

**Resolution:**
- Implement optimistic locking with `updated_at` timestamp
- Check `updated_at` hasn't changed before saving
- If changed, show conflict resolution UI
- User can view changes and choose to merge or overwrite

### 9. Archived Project Access

**Scenario:** Client needs to reference archived project files

**Resolution:**
- Archived projects read-only for Admin only by default
- Client can request temporary access reactivation
- Admin can grant time-limited read access (e.g., 7 days)
- Access automatically revoked after expiry

### 10. Role Change Mid-Project

**Scenario:** Motionify Team Member promoted to Project Manager mid-project

**Resolution:**
- Admin updates user's global role to `project_manager`
- Role change takes effect immediately
- User gains PM permissions on all assigned projects
- Audit log records role change with timestamp

## Database Schema Recommendations

### 1. Add Delegation Support

```sql
-- Add temporary delegation columns to project_team_members
ALTER TABLE project_team_members
  ADD COLUMN acting_role VARCHAR(50),
  ADD COLUMN acting_until TIMESTAMPTZ,
  ADD CONSTRAINT valid_acting_role CHECK (
    acting_role IS NULL OR
    acting_role IN ('project_manager', 'primary_contact')
  );

-- Index for checking active delegations
CREATE INDEX idx_project_team_acting_role
  ON project_team_members(acting_role, acting_until)
  WHERE acting_role IS NOT NULL;
```

### 2. Add Notification Preferences

```sql
-- Add notification preferences to project_team_members
ALTER TABLE project_team_members
  ADD COLUMN notification_preferences JSONB DEFAULT '{
    "email": true,
    "in_app": true,
    "do_not_disturb_start": null,
    "do_not_disturb_end": null,
    "muted": false
  }'::jsonb;

-- Index for efficient notification queries
CREATE INDEX idx_project_team_notification_prefs
  ON project_team_members USING GIN (notification_preferences);
```

### 3. Create Permission Overrides Table

```sql
-- Optional: For future custom permission overrides per user/project
CREATE TABLE IF NOT EXISTS permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  permission VARCHAR(100) NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by UUID NOT NULL REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ,
  reason TEXT,

  CONSTRAINT unique_permission_override UNIQUE (user_id, project_id, permission)
);

-- Index for permission lookups
CREATE INDEX idx_permission_overrides_lookup
  ON permission_overrides(user_id, project_id, permission, granted);
```

### 4. Create API Keys Table

```sql
-- For API access management
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  key_prefix VARCHAR(20) NOT NULL, -- First few chars for identification (e.g., "mtfy_abc")
  name VARCHAR(100) NOT NULL,
  scopes JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  CONSTRAINT valid_key_prefix CHECK (key_prefix ~ '^mtfy_[a-zA-Z0-9]{3,}$')
);

-- Indexes for API key lookups
CREATE INDEX idx_api_keys_user ON api_keys(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;
```

### 5. Add Task Deliverable Relationship

```sql
-- Ensure tasks table has deliverableId for hierarchical structure
ALTER TABLE tasks
  ADD COLUMN deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE;

-- Index for fast deliverable -> tasks lookup
CREATE INDEX idx_tasks_deliverable ON tasks(deliverable_id);

-- Add task visibility for client-visible vs internal
ALTER TABLE tasks
  ADD COLUMN visibility VARCHAR(20) DEFAULT 'client' CHECK (
    visibility IN ('internal', 'client')
  );
```

### 6. Recommended Indexes for Performance

```sql
-- Fast permission checks
CREATE INDEX idx_users_role_active
  ON users(role)
  WHERE deleted_at IS NULL;

-- Fast primary contact lookups
CREATE INDEX idx_project_team_primary_contact
  ON project_team_members(project_id, user_id, is_primary_contact)
  WHERE removed_at IS NULL;

-- Fast task visibility filtering
CREATE INDEX idx_tasks_visibility
  ON tasks(visibility, status, deliverable_id)
  WHERE deleted_at IS NULL;

-- Fast deliverable status queries
CREATE INDEX idx_deliverables_status
  ON deliverables(status, project_id)
  WHERE deleted_at IS NULL;

-- Fast project status queries
CREATE INDEX idx_projects_status
  ON projects(status)
  WHERE deleted_at IS NULL;
```

### 7. Add File Expiry Tracking

```sql
-- Ensure deliverables table tracks expiry
ALTER TABLE deliverables
  ADD COLUMN final_delivered_at TIMESTAMPTZ,
  ADD COLUMN expires_at TIMESTAMPTZ,
  ADD COLUMN balance_payment_received BOOLEAN DEFAULT FALSE;

-- Automatically set expiry 365 days after delivery
CREATE OR REPLACE FUNCTION set_deliverable_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.final_delivered_at IS NOT NULL AND OLD.final_delivered_at IS NULL THEN
    NEW.expires_at := NEW.final_delivered_at + INTERVAL '365 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_deliverable_expiry
  BEFORE UPDATE ON deliverables
  FOR EACH ROW
  EXECUTE FUNCTION set_deliverable_expiry();
```

---

## Implementation Checklist

### Phase 1: Database & Types (High Priority)
- [ ] Update `/types.ts` - Fix User.role to use database values
- [ ] Add `team_member` role to database schema constraints
- [ ] Add `acting_role` and `acting_until` columns for delegation
- [ ] Add `notification_preferences` JSONB column
- [ ] Add `deliverable_id` to tasks table
- [ ] Add `visibility` column to tasks table
- [ ] Create recommended indexes

### Phase 2: Permission Service (High Priority)
- [ ] Create `/utils/permissions.ts` with PermissionService class
- [ ] Create `/constants/permissions.ts` with permission constants
- [ ] Implement all permission check methods
- [ ] Add state-based permission logic
- [ ] Write unit tests for PermissionService

### Phase 3: API Middleware (Medium Priority)
- [ ] Create `/middleware/requirePermission.ts`
- [ ] Add permission checks to all API endpoints
- [ ] Implement state validation in API routes
- [ ] Add audit logging for permission denials

### Phase 4: Frontend Implementation (Medium Priority)
- [ ] Create `/hooks/usePermissions.ts` hook
- [ ] Update UI components with permission checks
- [ ] Add state-aware UI indicators
- [ ] Implement role-specific dashboards
- [ ] Add 5-role badge system

### Phase 5: Advanced Features (Low Priority)
- [ ] Create `api_keys` table and management UI
- [ ] Create `permission_overrides` table
- [ ] Implement delegation workflow
- [ ] Add GDPR data deletion workflow
- [ ] Implement file expiry automation

### Phase 6: Testing & Documentation (Ongoing)
- [ ] Write integration tests for all permission matrices
- [ ] Create E2E tests for user workflows
- [ ] Performance test with multiple user types
- [ ] Update API documentation with permissions
- [ ] Create permission troubleshooting guide

---

**Document Version:** 2.0
**Last Updated:** December 3, 2025
**Status:** Ready for Implementation
**Breaking Changes:** Yes - Role structure updated from 4 to 5 roles, database values required in types.ts
