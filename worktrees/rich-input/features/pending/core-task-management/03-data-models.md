# Data Models: Core Task Management

This document defines all TypeScript interfaces and types for the Core Task Management feature.

## Table of Contents

1. [Task Model](#task-model)
2. [TaskAssignment Model](#taskassignment-model)
3. [TaskFollower Model](#taskfollower-model)
4. [Supporting Types](#supporting-types)
5. [TaskActivity Model](#taskactivity-model)
6. [Relationships](#relationships)
7. [Validation Rules](#validation-rules)
8. [State Machine](#state-machine)
9. [Example Data](#example-data)

**Important:** `TaskComment` model is defined in `feedback-and-revisions/03-data-models.md` - import from there.

---

## Task Model

The main model representing a task within a project deliverable.

```typescript
export interface Task {
  // Core Identification
  id: string;                    // UUID
  projectId: string;             // UUID of parent project
  deliverableId: string;         // UUID of linked deliverable (required)
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;             // UUID of user who created task

  // Task Details
  title: string;                 // Required, 1-255 chars
  description?: string;          // Optional, markdown supported
  deliveryNotes?: string;        // Notes added when status → awaiting_approval
  deliveryNotesUpdatedAt?: Date; // When delivery notes last edited
  deliveryNotesEditable: boolean; // True if within 1-hour edit window

  // Workflow
  status: TaskStatus;            // Current status
  visibility: TaskVisibility;    // 'client_visible' or 'internal_only'

  // Scheduling
  deadline?: Date;               // Optional deadline
  isOverdue: boolean;            // Computed: deadline < now && status != completed
  daysUntilDeadline?: number;    // Computed: Math.ceil((deadline - now) / 86400000)

  // Statistics (computed fields)
  commentCount: number;          // Count of comments
  fileCount: number;             // Count of attached files
  assigneeCount: number;         // Count of assignees
  followerCount: number;         // Count of followers

  // Status Timestamps (for analytics)
  pendingSince?: Date;           // When task entered 'pending'
  inProgressSince?: Date;        // When task entered 'in_progress'
  awaitingApprovalSince?: Date;  // When task entered 'awaiting_approval'
  approvedAt?: Date;             // When client approved
  approvedBy?: string;           // UUID of client who approved
  revisionRequestedAt?: Date;    // When client requested revision
  revisionRequestedBy?: string;  // UUID of client who requested revision
  revisionFeedback?: string;     // Client's feedback on revision request
  completedAt?: Date;            // When task marked completed
  completedBy?: string;          // UUID of user who completed

  // Soft Delete
  deletedAt?: Date;              // Soft delete timestamp
  deletedBy?: string;            // UUID of user who deleted
}
```

### TaskStatus Type

```typescript
export type TaskStatus =
  | 'pending'              // Task created, not yet started
  | 'in_progress'          // Team is actively working on task
  | 'awaiting_approval'    // Submitted to client for review (client-visible only)
  | 'approved'             // Client approved (intermediate state before completed)
  | 'revision_requested'   // Client requested changes
  | 'completed';           // Task done
```

### TaskVisibility Type

```typescript
export type TaskVisibility =
  | 'client_visible'       // Visible to all project team members (client + team)
  | 'internal_only';       // Visible only to Motionify team members
```

---

## TaskAssignment Model

Tracks task assignments (many-to-many relationship: tasks ↔ users).

```typescript
export interface TaskAssignment {
  // Core
  id: string;                    // UUID
  taskId: string;                // UUID of task
  userId: string;                // UUID of assigned user
  assignedAt: Date;              // When assignment was made
  assignedBy: string;            // UUID of user who assigned

  // User Details (denormalized for performance)
  userName: string;              // Display name
  userEmail: string;             // Email address
  userRole: UserRole;            // 'super_admin' | 'project_manager' | 'client'

  // Metadata
  selfAssigned: boolean;         // True if user assigned themselves
  autoFollowing: boolean;        // True (assignees auto-follow tasks)
}
```

---

## TaskFollower Model

Tracks users following a task for notifications (many-to-many).

```typescript
export interface TaskFollower {
  // Core
  id: string;                    // UUID
  taskId: string;                // UUID of task
  userId: string;                // UUID of follower
  followedAt: Date;              // When user started following

  // User Details (denormalized for performance)
  userName: string;              // Display name
  userEmail: string;             // Email address
  userRole: UserRole;            // Role in project

  // Metadata
  source: FollowerSource;        // How they became a follower
  canUnfollow: boolean;          // False if assigned (must unassign first)
}
```

### FollowerSource Type

```typescript
export type FollowerSource =
  | 'assignment'           // Auto-followed when assigned to task
  | 'creator'              // Auto-followed when creating task
  | 'comment'              // Auto-followed when commenting
  | 'manual';              // Manually clicked "Follow" button
```

---

## TaskActivity Model

Activity log entries for audit trail. This extends the global `activities` table with task-specific entries.

**Important:** Use the unified `ActivityType` enum from `admin-features/03-data-models.md` instead of a separate TaskActivityType.

```typescript
import { ActivityType } from '../admin-features/03-data-models';

export interface TaskActivity {
  // Core (extends Activity table)
  id: string;                    // UUID
  projectId: string;             // UUID of project
  taskId: string;                // UUID of task
  createdAt: Date;
  createdBy: string;             // UUID of actor

  // Activity Details
  activityType: ActivityType;    // Use unified ActivityType enum
  description: string;           // Human-readable description
  metadata?: Record<string, any>; // Additional context (JSON)

  // User Details (denormalized)
  userName: string;              // Display name of actor
  userRole: UserRole;            // Role of actor

  // Visibility
  visibleToClient: boolean;      // False for internal-only activities
}
```

### Activity Types for Tasks

The following `ActivityType` values are commonly used for task activities (imported from admin-features):

- `task_created` - Task created
- `task_updated` - Title or description edited
- `task_assigned` - User assigned to task
- `task_unassigned` - User removed from task
- `task_followed` - User started following
- `task_unfollowed` - User stopped following
- `task_status_changed` - Status transition
- `delivery_notes_added` - Delivery notes added
- `delivery_notes_updated` - Delivery notes edited
- `comment_added` - Comment posted
- `comment_edited` - Comment edited
- `comment_deleted` - Comment deleted
- `file_attached` - File linked to task
- `deadline_updated` - Deadline changed
- `task_deleted` - Task soft-deleted
- `task_restored` - Task restored from deletion

---

## Supporting Types

### UserRole (imported from global types)

```typescript
export type UserRole =
  | 'super_admin'                // Full system access
  | 'project_manager'            // Motionify team member (manages projects)
  | 'team_member'                // Motionify team member (limited to assigned tasks)
  | 'client';                    // Client user
```

### TaskStatusTransition

Defines valid state transitions with permission checks.

```typescript
export interface TaskStatusTransition {
  from: TaskStatus;
  to: TaskStatus;
  allowedRoles: UserRole[];      // Who can make this transition
  requiresDeliveryNotes: boolean; // True if delivery notes required
  requiresPrimaryContact: boolean; // True if PRIMARY_CONTACT role required
  validationFn?: (task: Task, user: User) => boolean; // Custom validation
}
```

### TaskFilter

Filter options for querying tasks.

```typescript
export interface TaskFilter {
  projectId?: string;            // Filter by project
  deliverableId?: string;        // Filter by deliverable
  status?: TaskStatus[];         // Filter by status(es)
  visibility?: TaskVisibility;   // Filter by visibility
  assignedToUserId?: string;     // Tasks assigned to specific user
  followedByUserId?: string;     // Tasks followed by specific user
  unassigned?: boolean;          // Tasks with no assignees
  overdue?: boolean;             // Tasks past deadline
  createdBy?: string;            // Tasks created by specific user
  searchQuery?: string;          // Full-text search on title/description
}
```

### TaskSort

Sort options for task lists.

```typescript
export interface TaskSort {
  field: TaskSortField;
  direction: 'asc' | 'desc';
}

export type TaskSortField =
  | 'created_at'
  | 'updated_at'
  | 'deadline'
  | 'status'
  | 'title';
```

### TaskWithRelations

Full task object with all related data loaded (for detail view).

```typescript
export interface TaskWithRelations extends Task {
  // Related Entities
  assignees: TaskAssignment[];   // All assignments
  followers: TaskFollower[];     // All followers
  comments: TaskComment[];       // All comments (not deleted)
  activities: TaskActivity[];    // Activity log

  // Computed
  currentUserIsAssigned: boolean;
  currentUserIsFollowing: boolean;
  currentUserCanEdit: boolean;
  currentUserCanDelete: boolean;
  currentUserCanChangeStatus: boolean;
  availableStatusTransitions: TaskStatus[]; // Valid next statuses
}
```

### TaskCreateInput

Input for creating a new task.

```typescript
export interface TaskCreateInput {
  // Required
  title: string;                 // 1-255 chars
  projectId: string;             // UUID
  deliverableId: string;         // UUID
  visibility: TaskVisibility;

  // Optional
  description?: string;          // Markdown
  deadline?: Date;
  initialAssignees?: string[];   // Array of user UUIDs
}
```

### TaskUpdateInput

Input for updating an existing task.

```typescript
export interface TaskUpdateInput {
  title?: string;
  description?: string;
  deliveryNotes?: string;
  deadline?: Date | null;        // null to clear deadline
  visibility?: TaskVisibility;
}
```

### TaskStatusUpdateInput

Input for changing task status.

```typescript
export interface TaskStatusUpdateInput {
  status: TaskStatus;
  deliveryNotes?: string;        // Required if status → awaiting_approval
  revisionFeedback?: string;     // Optional if status → revision_requested
}
```

---

## Relationships

### Entity Relationship Diagram

```
┌─────────────┐
│   Project   │
└──────┬──────┘
       │
       │ 1:N
       ↓
┌─────────────┐
│ Deliverable │
└──────┬──────┘
       │
       │ 1:N
       ↓
┌─────────────┐         N:M        ┌──────────────┐
│    Task     │◄───────────────────►│     User     │
└──────┬──────┘    (assignments)    └──────────────┘
       │
       │ 1:N
       ├──────────┐
       │          │
       ↓          ↓
┌──────────────┐ ┌──────────────┐
│TaskAssignment│ │ TaskFollower │
└──────────────┘ └──────────────┘
       │
       │ 1:N
       ├──────────┬──────────────┐
       │          │              │
       ↓          ↓              ↓
┌───────────┐ ┌──────────┐ ┌─────────────┐
│TaskComment│ │TaskActivity│ │    File     │
└───────────┘ └──────────┘ └─────────────┘
```

### Relationship Details

| Parent | Child | Type | Description |
|--------|-------|------|-------------|
| Project | Task | 1:N | Each task belongs to one project |
| Deliverable | Task | 1:N | Each task belongs to one deliverable |
| Task | TaskAssignment | 1:N | Task can have multiple assignees |
| Task | TaskFollower | 1:N | Task can have multiple followers |
| Task | TaskComment | 1:N | Task can have multiple comments |
| Task | TaskActivity | 1:N | Task has activity log entries |
| User | TaskAssignment | 1:N | User can be assigned to multiple tasks |
| User | TaskFollower | 1:N | User can follow multiple tasks |

---

## Validation Rules

### Task Validation

| Field | Required | Min | Max | Format | Notes |
|-------|----------|-----|-----|--------|-------|
| title | Yes | 1 | 255 | String | No special constraints |
| description | No | 0 | 10000 | Markdown | |
| deliveryNotes | Conditional | 0 | 5000 | Markdown | Required when status → awaiting_approval (client-visible tasks only) |
| projectId | Yes | - | - | UUID | Must exist in projects table |
| deliverableId | Yes | - | - | UUID | Must exist in deliverables table |
| visibility | Yes | - | - | Enum | 'client_visible' or 'internal_only' |
| status | Yes | - | - | Enum | Must follow state machine |
| deadline | No | - | - | ISO Date | Must be in future (when creating) |

### Validation Schema (Zod)

```typescript
import { z } from 'zod';

export const TaskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().max(10000).optional(),
  projectId: z.string().uuid('Invalid project ID'),
  deliverableId: z.string().uuid('Invalid deliverable ID'),
  visibility: z.enum(['client_visible', 'internal_only']),
  deadline: z.date().min(new Date(), 'Deadline must be in future').optional(),
  initialAssignees: z.array(z.string().uuid()).optional(),
});

export const TaskUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(10000).optional(),
  deliveryNotes: z.string().max(5000).optional(),
  deadline: z.date().nullable().optional(),
  visibility: z.enum(['client_visible', 'internal_only']).optional(),
});

export const TaskStatusUpdateSchema = z.object({
  status: z.enum([
    'pending',
    'in_progress',
    'awaiting_approval',
    'approved',
    'revision_requested',
    'completed'
  ]),
  deliveryNotes: z.string().min(1).max(5000).optional(),
  revisionFeedback: z.string().max(2000).optional(),
}).refine((data) => {
  // Delivery notes required if transitioning to awaiting_approval
  if (data.status === 'awaiting_approval' && !data.deliveryNotes) {
    return false;
  }
  return true;
}, {
  message: 'Delivery notes required when submitting for approval',
  path: ['deliveryNotes'],
});
```

### Business Rule Validation

```typescript
export function validateTaskStatusTransition(
  currentStatus: TaskStatus,
  newStatus: TaskStatus,
  userRole: UserRole,
  isPrimaryContact: boolean,
  task: Task
): { valid: boolean; error?: string } {
  // Define state machine
  const transitions: Record<TaskStatus, {
    allowedNext: TaskStatus[];
    roles: UserRole[];
    requiresPrimary?: boolean;
    requiresDeliveryNotes?: boolean;
  }> = {
    pending: {
      allowedNext: ['in_progress'],
      roles: ['super_admin', 'project_manager', 'client'],
    },
    in_progress: {
      allowedNext: ['pending', 'awaiting_approval', 'completed'],
      roles: ['super_admin', 'project_manager'],
    },
    awaiting_approval: {
      allowedNext: ['approved', 'revision_requested', 'in_progress'],
      roles: ['super_admin', 'project_manager', 'client'],
      requiresPrimary: true, // For approved/revision_requested
      requiresDeliveryNotes: false, // Already has delivery notes
    },
    approved: {
      allowedNext: ['completed'],
      roles: ['super_admin', 'project_manager'],
    },
    revision_requested: {
      allowedNext: ['in_progress'],
      roles: ['super_admin', 'project_manager'],
    },
    completed: {
      allowedNext: ['in_progress'], // Reopen (admin only)
      roles: ['super_admin'],
    },
  };

  const transition = transitions[currentStatus];

  // Check if transition is allowed
  if (!transition.allowedNext.includes(newStatus)) {
    return {
      valid: false,
      error: `Cannot transition from ${currentStatus} to ${newStatus}`,
    };
  }

  // Check role permission
  if (!transition.roles.includes(userRole)) {
    return {
      valid: false,
      error: `Your role (${userRole}) cannot make this transition`,
    };
  }

  // Check primary contact requirement for approval/rejection
  if (transition.requiresPrimary &&
      (newStatus === 'approved' || newStatus === 'revision_requested') &&
      !isPrimaryContact &&
      userRole === 'client') {
    return {
      valid: false,
      error: 'Only the primary contact can approve or request revisions',
    };
  }

  // Check delivery notes requirement
  if (newStatus === 'awaiting_approval' &&
      task.visibility === 'client_visible' &&
      !task.deliveryNotes) {
    return {
      valid: false,
      error: 'Delivery notes required for client-visible tasks',
    };
  }

  // Check visibility: internal tasks can't go to awaiting_approval
  if (newStatus === 'awaiting_approval' && task.visibility === 'internal_only') {
    return {
      valid: false,
      error: 'Internal tasks cannot be submitted for client approval',
    };
  }

  return { valid: true };
}
```

---

## State Machine

### Task Status State Machine

```
┌─────────┐
│ pending │  ← Initial state (created)
└────┬────┘
     │ Any team member
     ↓
┌─────────────┐
│ in_progress │  ← Work in progress
└────┬────────┘
     │ Motionify team only
     │
     ├─────────────────┬───────────────────┬──────────────────┐
     │                 │                   │                  │
     │ (internal)      │ (client-visible)  │ (skip approval)  │
     ↓                 ↓                   ↓                  │
┌──────────┐   ┌──────────────────┐   ┌──────────┐         │
│completed │   │ awaiting_approval│   │ pending  │         │
└──────────┘   └────┬─────────────┘   └──────────┘         │
                    │                                       │
     ┌──────────────┴───────────────┐                      │
     │ (client primary contact)     │                      │
     ↓                              ↓                      │
┌──────────┐              ┌───────────────────┐           │
│ approved │              │ revision_requested│           │
└────┬─────┘              └────┬──────────────┘           │
     │                         │                          │
     │ (team)                  │ (team restarts)          │
     ↓                         ↓                          │
┌──────────┐              ┌─────────────┐                │
│completed │◄─────────────┤ in_progress │◄───────────────┘
└──────────┘              └─────────────┘
     ↑
     │ (admin only: reopen)
     └─────────────────────────────────────┐
                                            │
                                     ┌──────────┐
                                     │ completed│
                                     └──────────┘
```

### Transition Rules

| From | To | Who Can Transition | Notes |
|------|----|--------------------|-------|
| pending | in_progress | Any team member | Start work |
| in_progress | pending | Motionify team | Move back to backlog |
| in_progress | awaiting_approval | Motionify team | Submit for client review (requires delivery notes if client-visible) |
| in_progress | completed | Motionify team | Complete directly (internal tasks only) |
| awaiting_approval | approved | Client primary contact | Approve work |
| awaiting_approval | revision_requested | Client primary contact | Request changes |
| awaiting_approval | in_progress | Motionify team | Pull back from review |
| approved | completed | Motionify team | Mark as done |
| revision_requested | in_progress | Motionify team | Start revisions |
| completed | in_progress | Admin only | Reopen task |

---

## Example Data

### Sample Task (Client-Visible, Awaiting Approval)

```typescript
const sampleTask: Task = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  projectId: "660e8400-e29b-41d4-a716-446655440001",
  deliverableId: "770e8400-e29b-41d4-a716-446655440002",
  createdAt: new Date("2025-11-10T10:00:00Z"),
  updatedAt: new Date("2025-11-16T15:30:00Z"),
  createdBy: "880e8400-e29b-41d4-a716-446655440003", // John Smith

  title: "Video editing - Scene 2 color grading",
  description: "Adjust color grading in scene 2 to match brand guidelines:\n- Increase blue saturation\n- Adjust brightness for consistency",
  deliveryNotes: "Color grading adjusted according to new brand guidelines. Please review and let us know if further adjustments needed.",
  deliveryNotesUpdatedAt: new Date("2025-11-16T15:30:00Z"),
  deliveryNotesEditable: true, // Within 1-hour window

  status: "awaiting_approval",
  visibility: "client_visible",

  deadline: new Date("2025-11-18T23:59:59Z"),
  isOverdue: true, // Past deadline
  daysUntilDeadline: -2,

  commentCount: 3,
  fileCount: 2,
  assigneeCount: 2,
  followerCount: 4,

  pendingSince: new Date("2025-11-10T10:00:00Z"),
  inProgressSince: new Date("2025-11-12T09:00:00Z"),
  awaitingApprovalSince: new Date("2025-11-16T15:30:00Z"),
};
```

### Sample Task Assignment

```typescript
const sampleAssignment: TaskAssignment = {
  id: "990e8400-e29b-41d4-a716-446655440004",
  taskId: "550e8400-e29b-41d4-a716-446655440000",
  userId: "aa0e8400-e29b-41d4-a716-446655440005", // Sarah Johnson
  assignedAt: new Date("2025-11-10T10:05:00Z"),
  assignedBy: "880e8400-e29b-41d4-a716-446655440003", // John Smith

  userName: "Sarah Johnson",
  userEmail: "sarah.johnson@motionify.studio",
  userRole: "project_manager",

  selfAssigned: false,
  autoFollowing: true,
};
```

### Sample Task Comment

```typescript
const sampleComment: TaskComment = {
  id: "bb0e8400-e29b-41d4-a716-446655440006",
  taskId: "550e8400-e29b-41d4-a716-446655440000",
  createdAt: new Date("2025-11-16T10:15:00Z"),
  updatedAt: new Date("2025-11-16T10:15:00Z"),
  createdBy: "cc0e8400-e29b-41d4-a716-446655440007", // Mike Chen

  content: "Color grading complete. @sarah ready for your final check before submitting to client.",
  mentions: ["aa0e8400-e29b-41d4-a716-446655440005"], // Sarah

  userName: "Mike Chen",
  userEmail: "mike.chen@motionify.studio",
  userRole: "project_manager",

  edited: false,
};
```

### Sample Task Activity

```typescript
const sampleActivity: TaskActivity = {
  id: "dd0e8400-e29b-41d4-a716-446655440008",
  projectId: "660e8400-e29b-41d4-a716-446655440001",
  taskId: "550e8400-e29b-41d4-a716-446655440000",
  createdAt: new Date("2025-11-16T15:30:00Z"),
  createdBy: "aa0e8400-e29b-41d4-a716-446655440005", // Sarah

  activityType: "status_changed",
  description: "Status changed from In Progress to Awaiting Approval by Sarah Johnson",
  metadata: {
    from: "in_progress",
    to: "awaiting_approval",
    deliveryNotesAdded: true,
  },

  userName: "Sarah Johnson",
  userRole: "project_manager",

  visibleToClient: true,
};
```

### Sample TaskWithRelations

```typescript
const taskWithRelations: TaskWithRelations = {
  ...sampleTask,

  assignees: [
    sampleAssignment,
    {
      id: "ee0e8400-e29b-41d4-a716-446655440009",
      taskId: "550e8400-e29b-41d4-a716-446655440000",
      userId: "cc0e8400-e29b-41d4-a716-446655440007", // Mike Chen
      assignedAt: new Date("2025-11-10T10:05:00Z"),
      assignedBy: "880e8400-e29b-41d4-a716-446655440003",
      userName: "Mike Chen",
      userEmail: "mike.chen@motionify.studio",
      userRole: "project_manager",
      selfAssigned: false,
      autoFollowing: true,
    },
  ],

  followers: [
    {
      id: "ff0e8400-e29b-41d4-a716-446655440010",
      taskId: "550e8400-e29b-41d4-a716-446655440000",
      userId: "aa0e8400-e29b-41d4-a716-446655440005", // Sarah (via assignment)
      followedAt: new Date("2025-11-10T10:05:00Z"),
      userName: "Sarah Johnson",
      userEmail: "sarah.johnson@motionify.studio",
      userRole: "project_manager",
      source: "assignment",
      canUnfollow: false, // Cannot unfollow while assigned
    },
    {
      id: "000e8400-e29b-41d4-a716-446655440011",
      taskId: "550e8400-e29b-41d4-a716-446655440000",
      userId: "880e8400-e29b-41d4-a716-446655440003", // John (creator)
      followedAt: new Date("2025-11-10T10:00:00Z"),
      userName: "John Smith",
      userEmail: "john.smith@motionify.studio",
      userRole: "super_admin",
      source: "creator",
      canUnfollow: true,
    },
  ],

  comments: [sampleComment],
  activities: [sampleActivity],

  currentUserIsAssigned: false, // Depends on current user
  currentUserIsFollowing: false,
  currentUserCanEdit: false,
  currentUserCanDelete: false,
  currentUserCanChangeStatus: false,
  availableStatusTransitions: ['approved', 'revision_requested', 'in_progress'],
};
```
