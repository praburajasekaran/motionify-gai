# Data Models: Admin Features

This document defines all TypeScript interfaces and types for admin features.

## Table of Contents

1. [User Model](#user-model)
2. [Activity Log Model](#activity-log-model)
3. [Project Status Model](#project-status-model)
4. [Supporting Types](#supporting-types)
5. [Relationships](#relationships)
6. [Validation Rules](#validation-rules)
7. [Example Data](#example-data)

---

## User Model

Primary model for user management, including authentication, roles, and status tracking.

```typescript
export interface User {
  // Core Identification
  id: string;                    // UUID
  email: string;                 // Unique, lowercase
  fullName: string;
  role: UserRole;

  // Status & Activation
  isActive: boolean;             // false when deactivated
  status: UserStatus;            // pending_activation | active | deactivated

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  deactivatedAt: Date | null;

  // Optional Fields
  avatarUrl?: string;            // Profile photo URL (R2)

  // Deactivation Metadata
  deactivatedBy?: string;        // UUID of admin who deactivated
  deactivationReason?: string;   // Optional reason
}
```

### UserRole Type

```typescript
export type UserRole =
  | 'super_admin'       // Full platform access
  | 'project_manager'   // Manage assigned projects
  | 'team_member'       // Limited to assigned tasks
  | 'client';           // Read-only + approvals
```

### UserStatus Type

```typescript
export type UserStatus =
  | 'pending_activation'  // User created, invitation sent
  | 'active'              // User activated and can log in
  | 'deactivated';        // No login access, data preserved
```

---

## Activity Log Model

Comprehensive audit trail model for all user actions in the system.

```typescript
export interface ActivityLog {
  // Core Identification
  id: string;                    // UUID
  projectId: string;             // UUID of project
  userId: string;                // UUID of user who performed action

  // Action Details
  actionType: ActivityType;
  entityType: EntityType;
  entityId: string;              // UUID of affected entity

  // Descriptive Information
  description: string;           // Human-readable description
  details: ActivityDetails;      // JSON object with action-specific data

  // Context
  ipAddress: string | null;
  userAgent: string | null;

  // Timestamps
  timestamp: Date;               // When action occurred
}
```

### ActivityType Enumeration

**Note:** This is the unified activity type enum used across all features. Core-task-management and other features should import this enum rather than defining their own.

```typescript
export enum ActivityType {
  // User Management
  USER_CREATED = 'user_created',
  USER_ACTIVATED = 'user_activated',
  USER_DEACTIVATED = 'user_deactivated',
  USER_ROLE_CHANGED = 'user_role_changed',

  // Task Actions
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_STATUS_CHANGED = 'task_status_changed',
  TASK_ASSIGNED = 'task_assigned',
  TASK_UNASSIGNED = 'task_unassigned',
  TASK_FOLLOWED = 'task_followed',
  TASK_UNFOLLOWED = 'task_unfollowed',
  TASK_DELETED = 'task_deleted',
  TASK_RESTORED = 'task_restored',
  DELIVERY_NOTES_ADDED = 'delivery_notes_added',
  DELIVERY_NOTES_UPDATED = 'delivery_notes_updated',
  DEADLINE_UPDATED = 'deadline_updated',

  // File Actions
  FILE_UPLOADED = 'file_uploaded',
  FILE_DOWNLOADED = 'file_downloaded',
  FILE_DELETED = 'file_deleted',
  FILE_ATTACHED = 'file_attached',  // File linked to task/deliverable

  // Comment Actions
  COMMENT_ADDED = 'comment_added',
  COMMENT_EDITED = 'comment_edited',
  COMMENT_DELETED = 'comment_deleted',

  // Team Actions
  TEAM_MEMBER_ADDED = 'team_member_added',
  TEAM_MEMBER_REMOVED = 'team_member_removed',

  // Deliverable Actions
  DELIVERABLE_APPROVED = 'deliverable_approved',
  DELIVERABLE_REVISION_REQUESTED = 'deliverable_revision_requested',

  // Project Actions
  PROJECT_CREATED = 'project_created',
  PROJECT_STATUS_CHANGED = 'project_status_changed',
  PROJECT_ARCHIVED = 'project_archived',

  // Terms Actions
  TERMS_ACCEPTED = 'terms_accepted',
  TERMS_REVISION_REQUESTED = 'terms_revision_requested',
}
```

### EntityType Type

```typescript
export type EntityType =
  | 'user'
  | 'project'
  | 'task'
  | 'file'
  | 'comment'
  | 'deliverable'
  | 'team'
  | 'terms';
```

### ActivityDetails Interface

```typescript
export interface ActivityDetails {
  // Common fields
  entityName?: string;           // Name of affected entity

  // Status change specific
  oldStatus?: string;
  newStatus?: string;

  // User action specific
  oldRole?: UserRole;
  newRole?: UserRole;

  // File specific
  fileName?: string;
  fileSize?: number;

  // Comment specific
  commentText?: string;
  mentions?: string[];           // Array of user IDs

  // Override/admin action
  override?: boolean;
  adminReason?: string;

  // Additional context (flexible)
  [key: string]: any;
}
```

---

## Project Status Model

Model for project lifecycle management.

```typescript
export interface ProjectStatus {
  status: ProjectStatusType;
  statusChangedAt: Date;
  statusChangedBy: string;       // UUID of user
  completedAt: Date | null;
  archivedAt: Date | null;
}
```

### ProjectStatusType Type

```typescript
export type ProjectStatusType =
  | 'in_progress'   // Active project
  | 'completed'     // All deliverables done
  | 'on_hold'       // Paused temporarily
  | 'archived';     // Hidden, read-only
```

### Status Transition Validation

```typescript
export const VALID_STATUS_TRANSITIONS: Record<ProjectStatusType, ProjectStatusType[]> = {
  in_progress: ['completed', 'on_hold'],
  on_hold: ['in_progress', 'completed'],
  completed: ['archived', 'in_progress'],  // Reopen allowed
  archived: [],                              // Cannot transition from archived
};

export function isValidStatusTransition(
  currentStatus: ProjectStatusType,
  newStatus: ProjectStatusType
): boolean {
  return VALID_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}
```

---

## Supporting Types

### User List Filter Options

```typescript
export interface UserFilters {
  search?: string;               // Search name or email
  role?: UserRole;
  status?: UserStatus;
  page?: number;
  limit?: number;
}
```

### Activity Log Filter Options

```typescript
export interface ActivityFilters {
  projectId?: string;
  userId?: string;
  actionType?: ActivityType;
  entityType?: EntityType;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}
```

### CSV Export Configuration

```typescript
export interface CSVExportConfig {
  projectId: string;
  filters: ActivityFilters;
  columns: ActivityCSVColumn[];
  format: 'csv' | 'json';
}

export type ActivityCSVColumn =
  | 'timestamp'
  | 'user_id'
  | 'user_name'
  | 'action_type'
  | 'entity_type'
  | 'entity_id'
  | 'description'
  | 'details';
```

### Pagination Response

```typescript
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

## Relationships

### Entity Relationship Diagram

```
┌─────────┐
│  User   │
└────┬────┘
     │
     │ 1:N (creates)
     ↓
┌──────────────┐
│ ActivityLog  │
└──────┬───────┘
       │
       │ N:1 (belongs to)
       ↓
  ┌──────────┐
  │ Project  │
  └────┬─────┘
       │
       │ 1:1
       ↓
┌──────────────────┐
│ ProjectStatus    │
└──────────────────┘

User Relationships:
- User has many ActivityLogs (user_id)
- User deactivates other Users (deactivated_by)
- User changes ProjectStatus (status_changed_by)

ActivityLog Relationships:
- ActivityLog belongs to User (user_id)
- ActivityLog belongs to Project (project_id)
- ActivityLog references Entity (entity_id + entity_type)

Project Relationships:
- Project has one ProjectStatus (embedded or separate table)
- Project has many ActivityLogs
```

---

## Validation Rules

### User Validation

| Field | Required | Min | Max | Format | Notes |
|-------|----------|-----|-----|--------|-------|
| email | Yes | - | 255 | Valid email, lowercase | Must be unique |
| fullName | Yes | 2 | 100 | Letters, spaces, hyphens | No numbers |
| role | Yes | - | - | Enum | Must be valid UserRole |
| isActive | Yes | - | - | Boolean | Default true |
| deactivationReason | No | 10 | 500 | Any string | Required if deactivating |

### Activity Log Validation

| Field | Required | Min | Max | Format | Notes |
|-------|----------|-----|-----|--------|-------|
| projectId | Yes | - | - | UUID | Must exist |
| userId | Yes | - | - | UUID | Must exist |
| actionType | Yes | - | - | Enum | Must be valid ActivityType |
| entityType | Yes | - | - | Enum | Must be valid EntityType |
| description | Yes | 10 | 500 | Any string | Human-readable |

### Validation Schemas (Zod)

```typescript
import { z } from 'zod';

// User Creation Schema
export const CreateUserSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .max(255, 'Email too long'),
  fullName: z.string()
    .min(2, 'Name too short')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s-']+$/, 'Name can only contain letters, spaces, and hyphens'),
  role: z.enum(['super_admin', 'project_manager', 'team_member', 'client']),
});

// User Update Schema
export const UpdateUserSchema = z.object({
  fullName: z.string()
    .min(2)
    .max(100)
    .regex(/^[a-zA-Z\s-']+$/)
    .optional(),
  role: z.enum(['super_admin', 'project_manager', 'team_member', 'client']).optional(),
});

// User Deactivation Schema
export const DeactivateUserSchema = z.object({
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason too long')
    .optional(),
});

// Activity Log Creation Schema
export const CreateActivityLogSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  actionType: z.nativeEnum(ActivityType),
  entityType: z.enum(['user', 'project', 'task', 'file', 'comment', 'deliverable', 'team', 'terms']),
  entityId: z.string().uuid(),
  description: z.string().min(10).max(500),
  details: z.record(z.any()),
});

// Project Status Update Schema
export const UpdateProjectStatusSchema = z.object({
  status: z.enum(['in_progress', 'completed', 'on_hold', 'archived']),
  override: z.boolean().optional(),
  reason: z.string().max(500).optional(),
});

// CSV Export Schema
export const CSVExportSchema = z.object({
  projectId: z.string().uuid(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  userId: z.string().uuid().optional(),
  actionType: z.nativeEnum(ActivityType).optional(),
  format: z.enum(['csv', 'json']).default('csv'),
});
```

---

## Example Data

### Sample User Instance

```typescript
const sampleUser: User = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "sarah@motionify.studio",
  fullName: "Sarah Mitchell",
  role: "project_manager",
  isActive: true,
  status: "active",
  createdAt: new Date("2025-01-15T10:00:00Z"),
  updatedAt: new Date("2025-01-17T14:30:00Z"),
  lastLoginAt: new Date("2025-01-17T14:30:00Z"),
  deactivatedAt: null,
  avatarUrl: "https://r2.motionify.studio/avatars/550e8400.jpg",
};
```

### Sample Deactivated User

```typescript
const deactivatedUser: User = {
  id: "660e8400-e29b-41d4-a716-446655440001",
  email: "tom@motionify.studio",
  fullName: "Tom Wilson",
  role: "project_manager",
  isActive: false,
  status: "deactivated",
  createdAt: new Date("2024-12-20T09:00:00Z"),
  updatedAt: new Date("2025-02-01T10:00:00Z"),
  lastLoginAt: new Date("2025-01-31T16:45:00Z"),
  deactivatedAt: new Date("2025-02-01T10:00:00Z"),
  deactivatedBy: "770e8400-e29b-41d4-a716-446655440002", // Jane Smith (Super Admin)
  deactivationReason: "Employee left the company",
};
```

### Sample Activity Log Entry

```typescript
const sampleActivity: ActivityLog = {
  id: "880e8400-e29b-41d4-a716-446655440003",
  projectId: "990e8400-e29b-41d4-a716-446655440004",
  userId: "550e8400-e29b-41d4-a716-446655440000", // Sarah Mitchell
  actionType: ActivityType.TASK_STATUS_CHANGED,
  entityType: "task",
  entityId: "aa0e8400-e29b-41d4-a716-446655440005",
  description: "Task status changed: Review storyboards (In Progress → Awaiting Approval)",
  details: {
    entityName: "Review storyboards",
    oldStatus: "in_progress",
    newStatus: "awaiting_approval",
    deliveryNotes: "Uploaded 3 storyboard concepts for review",
  },
  ipAddress: "192.168.1.100",
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
  timestamp: new Date("2025-01-17T14:30:00Z"),
};
```

### Sample User Deactivation Activity

```typescript
const deactivationActivity: ActivityLog = {
  id: "bb0e8400-e29b-41d4-a716-446655440006",
  projectId: "990e8400-e29b-41d4-a716-446655440004",
  userId: "770e8400-e29b-41d4-a716-446655440002", // Jane Smith (admin)
  actionType: ActivityType.USER_DEACTIVATED,
  entityType: "user",
  entityId: "660e8400-e29b-41d4-a716-446655440001", // Tom Wilson
  description: "User deactivated: Tom Wilson (Project Manager)",
  details: {
    entityName: "Tom Wilson",
    oldRole: "project_manager",
    deactivationReason: "Employee left the company",
    historicalDataPreserved: true,
  },
  ipAddress: "192.168.1.101",
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
  timestamp: new Date("2025-02-01T10:00:00Z"),
};
```

### Sample Project Status Change Activity

```typescript
const statusChangeActivity: ActivityLog = {
  id: "cc0e8400-e29b-41d4-a716-446655440007",
  projectId: "990e8400-e29b-41d4-a716-446655440004",
  userId: "770e8400-e29b-41d4-a716-446655440002", // Jane Smith (admin)
  actionType: ActivityType.PROJECT_STATUS_CHANGED,
  entityType: "project",
  entityId: "990e8400-e29b-41d4-a716-446655440004",
  description: "Project status changed: Brand Video Campaign (In Progress → Completed)",
  details: {
    entityName: "Brand Video Campaign",
    oldStatus: "in_progress",
    newStatus: "completed",
    override: true,
    adminReason: "Client requested early completion despite pending deliverables",
    deliverablesApproved: 2,
    deliverablesTotal: 4,
  },
  ipAddress: "192.168.1.101",
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
  timestamp: new Date("2025-02-15T16:00:00Z"),
};
```

### Sample CSV Export Configuration

```typescript
const exportConfig: CSVExportConfig = {
  projectId: "990e8400-e29b-41d4-a716-446655440004",
  filters: {
    dateFrom: new Date("2025-01-01T00:00:00Z"),
    dateTo: new Date("2025-01-31T23:59:59Z"),
    actionType: ActivityType.TASK_STATUS_CHANGED,
  },
  columns: [
    'timestamp',
    'user_name',
    'action_type',
    'description',
    'details',
  ],
  format: 'csv',
};
```

---

## Type Guards

```typescript
// Check if user is super admin
export function isSuperAdmin(user: User): boolean {
  return user.role === 'super_admin';
}

// Check if user is active
export function isActiveUser(user: User): boolean {
  return user.isActive && user.status === 'active';
}

// Check if user can manage other users
export function canManageUsers(user: User): boolean {
  return isSuperAdmin(user) && isActiveUser(user);
}

// Check if status transition is valid
export function canTransitionStatus(
  currentStatus: ProjectStatusType,
  newStatus: ProjectStatusType
): boolean {
  return VALID_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}

// Check if activity requires admin permissions
export function isAdminOnlyAction(actionType: ActivityType): boolean {
  const adminOnlyActions = [
    ActivityType.USER_CREATED,
    ActivityType.USER_DEACTIVATED,
    ActivityType.USER_ROLE_CHANGED,
    ActivityType.PROJECT_STATUS_CHANGED,
    ActivityType.PROJECT_ARCHIVED,
  ];
  return adminOnlyActions.includes(actionType);
}
```

---

## Utility Functions

```typescript
// Format user display name
export function formatUserDisplayName(user: User): string {
  return user.isActive
    ? user.fullName
    : `${user.fullName} (Deactivated)`;
}

// Calculate user tenure
export function getUserTenure(user: User): number {
  const endDate = user.deactivatedAt || new Date();
  const diffMs = endDate.getTime() - user.createdAt.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)); // Days
}

// Format activity description with user name
export function formatActivityWithUser(activity: ActivityLog, users: User[]): string {
  const user = users.find(u => u.id === activity.userId);
  const userName = user ? formatUserDisplayName(user) : 'Unknown User';
  return `${userName}: ${activity.description}`;
}

// Generate CSV filename
export function generateCSVFilename(projectName: string, filters: ActivityFilters): string {
  const dateStr = new Date().toISOString().split('T')[0];
  const sanitizedName = projectName.toLowerCase().replace(/\s+/g, '-');
  return `activity-log-${sanitizedName}-${dateStr}.csv`;
}
```
