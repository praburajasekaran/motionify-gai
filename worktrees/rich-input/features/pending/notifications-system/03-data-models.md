# Data Models: Notifications System

This document defines all TypeScript interfaces and types for the feature.

## Table of Contents

1. [Notification Model](#notification-model)
2. [NotificationPreference Model](#notificationpreference-model)
3. [EmailNotificationQueue Model](#emailnotificationqueue-model)
4. [Supporting Types](#supporting-types)
5. [Relationships](#relationships)
6. [Validation Rules](#validation-rules)
7. [Example Data](#example-data)
8. [Type Guards & Utilities](#type-guards--utilities)

---

## Notification Model

The primary model storing all in-app notifications.

```typescript
export interface Notification {
  // Core Identification
  id: string;                          // UUID
  userId: string;                      // UUID - recipient of notification
  projectId: string;                   // UUID - which project this relates to
  type: NotificationType;
  category: NotificationCategory;
  read: boolean;                       // Has user marked as read
  createdAt: Date;
  readAt: Date | null;                 // Timestamp when marked read
  deletedAt: Date | null;              // Soft delete timestamp

  // Notification Content
  title: string;                       // Short title (e.g., "Task Assigned")
  message: string;                     // Full message (e.g., "You were assigned to 'Create storyboard'")
  icon: string;                        // Emoji or icon identifier (e.g., "🎯", "task-icon")

  // Action/Navigation
  actionUrl: string | null;            // Deep link to related item (e.g., "/projects/xxx/tasks/yyy")
  actionLabel: string | null;          // Button text (e.g., "View Task", "View File")

  // Metadata (JSON)
  metadata: NotificationMetadata;

  // Actor Information
  actorId: string | null;              // UUID - who triggered this notification
  actorName: string | null;            // Cached actor name for display
}

export interface NotificationMetadata {
  // Context-specific data (flexible JSON structure)
  taskId?: string;
  taskTitle?: string;
  fileId?: string;
  fileName?: string;
  commentId?: string;
  deliverableId?: string;
  deliverableName?: string;
  oldStatus?: string;
  newStatus?: string;
  mentionedBy?: string;
  projectName?: string;
  // ... extensible for future notification types
}
```

---

## NotificationPreference Model

User preferences for notification delivery per category.

```typescript
export interface NotificationPreference {
  // Core Identification
  id: string;                          // UUID
  userId: string;                      // UUID - user these preferences belong to
  createdAt: Date;
  updatedAt: Date;

  // Category Preferences (JSON array)
  preferences: CategoryPreference[];

  // Global Settings
  emailBatchingFrequency: EmailBatchingFrequency;  // See NOTIFICATION_BATCHING_RULES.md for batching logic
  pausedUntil: Date | null;            // Temporary pause (e.g., vacation mode)
}

export interface CategoryPreference {
  category: NotificationCategory;      // Which notification type
  inAppEnabled: boolean;               // Receive in-app notifications
  emailEnabled: boolean;               // Receive email notifications
}
```

---

## EmailNotificationQueue Model

Queue for batching and sending email notifications.

```typescript
export interface EmailNotificationQueue {
  // Core Identification
  id: string;                          // UUID
  userId: string;                      // UUID - recipient
  projectId: string;                   // UUID - related project
  createdAt: Date;
  scheduledFor: Date;                  // When to send (for batching)
  sentAt: Date | null;
  status: EmailQueueStatus;

  // Email Content
  notificationIds: string[];           // UUIDs of notifications to include
  emailType: EmailType;                // 'individual' | 'digest'
  subject: string;
  bodyHtml: string;
  bodyText: string;

  // Delivery Tracking
  retryCount: number;                  // How many send attempts
  lastError: string | null;            // Error message if failed
  sesMessageId: string | null;         // Amazon SES message ID
}
```

---

## Supporting Types

### NotificationType Enum

```typescript
export type NotificationType =
  // Task Notifications
  | 'task_assigned'
  | 'task_status_changed'
  | 'task_comment_added'
  
  // Comment Notifications
  | 'comment_mention'
  | 'comment_reply'
  
  // File Notifications
  | 'file_uploaded'
  | 'file_comment_added'
  
  // Approval & Revision Notifications
  | 'approval_request'
  | 'approval_granted'
  | 'revision_requested'
  | 'revision_completed'
  
  // Payment Notifications
  | 'payment_advance_received'
  | 'payment_balance_received'
  | 'payment_failed'
  
  // Team Notifications
  | 'team_member_added'
  | 'team_member_removed'
  | 'invitation_sent'
  | 'invitation_accepted'
  | 'invitation_expired'
  | 'invitation_resent'
  
  // Project Notifications
  | 'project_created'
  | 'project_status_changed'
  | 'terms_accepted'
  | 'terms_updated';
```

### NotificationCategory Enum

```typescript
export type NotificationCategory =
  | 'task_updates'
  | 'comments_mentions'
  | 'file_updates'
  | 'approvals_revisions'
  | 'team_changes'
  | 'project_updates';
```

### EmailQueueStatus Enum

```typescript
export type EmailQueueStatus =
  | 'pending'      // Waiting to be processed
  | 'batched'      // Grouped with other notifications
  | 'sending'      // Currently being sent
  | 'sent'         // Successfully delivered
  | 'failed'       // Delivery failed
  | 'abandoned';   // Max retries exceeded
```

### EmailType Enum

```typescript
export type EmailType =
  | 'individual'   // Single notification email
  | 'digest';      // Batched notification digest
```

### EmailBatchingFrequency Enum

```typescript
export type EmailBatchingFrequency =
  | 'immediately'  // No batching (send each notification separately)
  | 'every_5_min'  // Batch notifications every 5 minutes (default)
  | 'hourly'       // Hourly digest
  | 'daily';       // Daily digest
```

---

## API Response Types

```typescript
// GET /api/notifications response
export interface GetNotificationsResponse {
  success: true;
  data: {
    notifications: Notification[];
    unreadCount: number;
    totalCount: number;
    hasMore: boolean;
  };
  pagination: {
    limit: number;
    offset: number;
  };
}

// PATCH /api/notifications/:id/read response
export interface MarkNotificationReadResponse {
  success: true;
  data: {
    notification: Notification;
    unreadCount: number;
  };
  message: string;
}

// POST /api/notifications/mark-all-read response
export interface MarkAllReadResponse {
  success: true;
  data: {
    markedCount: number;
    unreadCount: number;
  };
  message: string;
}

// GET /api/users/me/notification-preferences response
export interface GetPreferencesResponse {
  success: true;
  data: {
    preferences: NotificationPreference;
  };
}

// PATCH /api/users/me/notification-preferences response
export interface UpdatePreferencesResponse {
  success: true;
  data: {
    preferences: NotificationPreference;
  };
  message: string;
}
```

---

## Constants

```typescript
export const NOTIFICATION_CONFIG = {
  MAX_UNREAD_DISPLAY: 99,                    // Show "99+" if more than this
  DROPDOWN_LIMIT: 10,                        // Notifications in dropdown
  HISTORY_PAGE_SIZE: 50,                     // Notifications per page
  AUTO_READ_DAYS: 7,                         // Auto-mark read after X days
  RETENTION_DAYS: 90,                        // Delete after X days
  EMAIL_BATCH_WINDOW_MINUTES: 2,             // Wait X minutes before batching
  EMAIL_MAX_BATCH_SIZE: 10,                  // Max notifications per email
  EMAIL_RETRY_ATTEMPTS: 3,                   // Retry failed emails X times
  EMAIL_RETRY_DELAYS: [120, 600, 3600],      // Seconds: 2min, 10min, 1hr
} as const;

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  'task_assigned': 'Task Assigned',
  'task_status_changed': 'Task Status Changed',
  'task_comment_added': 'Task Comment',
  'comment_mention': 'Mentioned',
  'comment_reply': 'Comment Reply',
  'file_uploaded': 'File Uploaded',
  'file_comment_added': 'File Comment',
  'approval_request': 'Approval Request',
  'approval_granted': 'Approved',
  'revision_requested': 'Revision Requested',
  'revision_completed': 'Revision Completed',
  'payment_advance_received': 'Advance Payment Received',
  'payment_balance_received': 'Balance Payment Received',
  'payment_failed': 'Payment Failed',
  'team_member_added': 'Team Member Added',
  'team_member_removed': 'Team Member Removed',
  'invitation_sent': 'Invitation Sent',
  'invitation_accepted': 'Invitation Accepted',
  'invitation_expired': 'Invitation Expired',
  'invitation_resent': 'Invitation Resent',
  'project_created': 'Project Created',
  'project_status_changed': 'Project Status Changed',
  'terms_accepted': 'Terms Accepted',
  'terms_updated': 'Terms Updated',
} as const;

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  'task_updates': 'Task Updates',
  'comments_mentions': 'Comments & Mentions',
  'file_updates': 'File Updates',
  'approvals_revisions': 'Approvals & Revisions',
  'team_changes': 'Team Changes',
  'project_updates': 'Project Updates',
} as const;

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  'task_assigned': '🎯',
  'task_status_changed': '✅',
  'task_comment_added': '💬',
  'comment_mention': '💬',
  'comment_reply': '💬',
  'file_uploaded': '📁',
  'file_comment_added': '📁',
  'approval_request': '👍',
  'approval_granted': '✅',
  'revision_requested': '🔄',
  'revision_completed': '✅',
  'payment_advance_received': '💰',
  'payment_balance_received': '💰',
  'payment_failed': '❌',
  'team_member_added': '👥',
  'team_member_removed': '👥',
  'invitation_sent': '✉️',
  'invitation_accepted': '✅',
  'invitation_expired': '⏰',
  'invitation_resent': '✉️',
  'project_created': '📂',
  'project_status_changed': '📂',
  'terms_accepted': '📝',
  'terms_updated': '📝',
} as const;

export const NOTIFICATION_CATEGORY_MAPPING: Record<NotificationType, NotificationCategory> = {
  'task_assigned': 'task_updates',
  'task_status_changed': 'task_updates',
  'task_comment_added': 'comments_mentions',
  'comment_mention': 'comments_mentions',
  'comment_reply': 'comments_mentions',
  'file_uploaded': 'file_updates',
  'file_comment_added': 'file_updates',
  'approval_request': 'approvals_revisions',
  'approval_granted': 'approvals_revisions',
  'revision_requested': 'approvals_revisions',
  'revision_completed': 'approvals_revisions',
  'payment_advance_received': 'project_updates',
  'payment_balance_received': 'project_updates',
  'payment_failed': 'project_updates',
  'team_member_added': 'team_changes',
  'team_member_removed': 'team_changes',
  'invitation_sent': 'team_changes',
  'invitation_accepted': 'team_changes',
  'invitation_expired': 'team_changes',
  'invitation_resent': 'team_changes',
  'project_created': 'project_updates',
  'project_status_changed': 'project_updates',
  'terms_accepted': 'project_updates',
  'terms_updated': 'project_updates',
} as const;

export const DEFAULT_PREFERENCES: CategoryPreference[] = [
  { category: 'task_updates', inAppEnabled: true, emailEnabled: true },
  { category: 'comments_mentions', inAppEnabled: true, emailEnabled: true },
  { category: 'file_updates', inAppEnabled: true, emailEnabled: false },
  { category: 'approvals_revisions', inAppEnabled: true, emailEnabled: true },
  { category: 'team_changes', inAppEnabled: true, emailEnabled: true },
  { category: 'project_updates', inAppEnabled: true, emailEnabled: false },
];
```

---

## Relationships

### Entity Relationship Diagram

```
┌─────────────┐
│   users     │
└──────┬──────┘
       │
       │ 1:N
       │
       ├──────────────────────┬──────────────────────┐
       ↓                      ↓                      ↓
┌──────────────┐     ┌────────────────────┐  ┌──────────────────────┐
│notifications │     │ notification_      │  │ notification_email_  │
│              │     │ preferences        │  │ queue                │
└──────┬───────┘     └────────────────────┘  └──────────────────────┘
       │
       │ N:1
       ↓
┌──────────────┐
│  projects    │
└──────────────┘

┌──────────────┐
│notifications │
└──────┬───────┘
       │
       │ N:1
       ↓
┌──────────────┐
│    users     │  (actor who triggered notification)
└──────────────┘
```

### Relationship Rules

1. **Users → Notifications**: One-to-Many (user can have many notifications)
2. **Projects → Notifications**: One-to-Many (project can generate many notifications)
3. **Users → NotificationPreferences**: One-to-One (each user has one preferences record)
4. **Users → EmailNotificationQueue**: One-to-Many (user can have multiple queued emails)
5. **Notifications → Users (actor)**: Many-to-One (many notifications can be triggered by one user)

---

## Validation Rules

### Notification Validation

| Field | Required | Min | Max | Format |
|-------|----------|-----|-----|--------|
| userId | Yes | - | - | Valid UUID |
| projectId | Yes | - | - | Valid UUID |
| type | Yes | - | - | Valid NotificationType enum |
| category | Yes | - | - | Valid NotificationCategory enum |
| title | Yes | 1 | 100 | Any string |
| message | Yes | 1 | 500 | Any string |
| icon | Yes | 1 | 50 | Emoji or icon identifier |
| actionUrl | No | 0 | 500 | Valid URL path |

### NotificationPreference Validation

| Field | Required | Min | Max | Format |
|-------|----------|-----|-----|--------|
| userId | Yes | - | - | Valid UUID |
| preferences | Yes | 1 | 10 | Array of CategoryPreference objects |
| emailBatchingFrequency | Yes | - | - | Valid EmailBatchingFrequency enum |

### EmailNotificationQueue Validation

| Field | Required | Min | Max | Format |
|-------|----------|-----|-----|--------|
| userId | Yes | - | - | Valid UUID |
| notificationIds | Yes | 1 | 10 | Array of UUIDs |
| emailType | Yes | - | - | 'individual' or 'digest' |
| subject | Yes | 1 | 200 | Any string |
| bodyHtml | Yes | 10 | 100000 | Valid HTML |

### Validation Schema (Zod)

```typescript
import { z } from 'zod';

export const NotificationMetadataSchema = z.object({
  taskId: z.string().uuid().optional(),
  taskTitle: z.string().max(255).optional(),
  fileId: z.string().uuid().optional(),
  fileName: z.string().max(255).optional(),
  commentId: z.string().uuid().optional(),
  deliverableId: z.string().uuid().optional(),
  deliverableName: z.string().max(255).optional(),
  oldStatus: z.string().max(50).optional(),
  newStatus: z.string().max(50).optional(),
  mentionedBy: z.string().max(255).optional(),
  projectName: z.string().max(255).optional(),
});

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  projectId: z.string().uuid(),
  type: z.enum([
    'task_assigned', 'task_status_changed', 'task_comment_added',
    'comment_mention', 'comment_reply',
    'file_uploaded', 'file_comment_added',
    'approval_request', 'approval_granted', 'revision_requested', 'revision_completed',
    'team_member_added', 'team_member_removed',
    'project_created', 'project_status_changed', 'terms_accepted', 'terms_updated'
  ]),
  category: z.enum([
    'task_updates', 'comments_mentions', 'file_updates',
    'approvals_revisions', 'team_changes', 'project_updates'
  ]),
  read: z.boolean(),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  icon: z.string().min(1).max(50),
  actionUrl: z.string().max(500).nullable().optional(),
  actionLabel: z.string().max(50).nullable().optional(),
  metadata: NotificationMetadataSchema,
  actorId: z.string().uuid().nullable().optional(),
  actorName: z.string().max(255).nullable().optional(),
});

export const CategoryPreferenceSchema = z.object({
  category: z.enum([
    'task_updates', 'comments_mentions', 'file_updates',
    'approvals_revisions', 'team_changes', 'project_updates'
  ]),
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
});

export const NotificationPreferenceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  preferences: z.array(CategoryPreferenceSchema).min(1).max(10),
  emailBatchingFrequency: z.enum(['immediately', 'every_5_min', 'hourly', 'daily']),
  pausedUntil: z.date().nullable().optional(),
});

export const EmailNotificationQueueSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  projectId: z.string().uuid(),
  notificationIds: z.array(z.string().uuid()).min(1).max(10),
  emailType: z.enum(['individual', 'digest']),
  subject: z.string().min(1).max(200),
  bodyHtml: z.string().min(10).max(100000),
  bodyText: z.string().min(10).max(50000),
  status: z.enum(['pending', 'batched', 'sending', 'sent', 'failed', 'abandoned']),
  retryCount: z.number().int().min(0).max(10),
});
```

---

## Example Data

### Sample Notification Instance (Task Assigned)

```typescript
const taskAssignedNotification: Notification = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  userId: "660e8400-e29b-41d4-a716-446655440001",
  projectId: "770e8400-e29b-41d4-a716-446655440002",
  type: "task_assigned",
  category: "task_updates",
  read: false,
  createdAt: new Date("2025-01-15T10:30:00Z"),
  readAt: null,
  deletedAt: null,
  title: "Task Assigned",
  message: "You were assigned to 'Create storyboard concepts' by Mike Johnson",
  icon: "🎯",
  actionUrl: "/projects/770e8400-e29b-41d4-a716-446655440002/tasks/880e8400-e29b-41d4-a716-446655440003",
  actionLabel: "View Task",
  metadata: {
    taskId: "880e8400-e29b-41d4-a716-446655440003",
    taskTitle: "Create storyboard concepts",
    projectName: "Brand Video Campaign",
  },
  actorId: "990e8400-e29b-41d4-a716-446655440004",
  actorName: "Mike Johnson",
};
```

### Sample Notification Instance (Comment Mention)

```typescript
const mentionNotification: Notification = {
  id: "aa0e8400-e29b-41d4-a716-446655440005",
  userId: "660e8400-e29b-41d4-a716-446655440001",
  projectId: "770e8400-e29b-41d4-a716-446655440002",
  type: "comment_mention",
  category: "comments_mentions",
  read: false,
  createdAt: new Date("2025-01-15T10:45:00Z"),
  readAt: null,
  deletedAt: null,
  title: "Mentioned",
  message: "Sarah mentioned you in a comment: \"Can you review @JaneDoe?\"",
  icon: "💬",
  actionUrl: "/projects/770e8400-e29b-41d4-a716-446655440002/tasks/880e8400-e29b-41d4-a716-446655440003#comment-bb0e8400",
  actionLabel: "View Comment",
  metadata: {
    taskId: "880e8400-e29b-41d4-a716-446655440003",
    taskTitle: "Create storyboard concepts",
    commentId: "bb0e8400-e29b-41d4-a716-446655440006",
    mentionedBy: "Sarah Williams",
    projectName: "Brand Video Campaign",
  },
  actorId: "cc0e8400-e29b-41d4-a716-446655440007",
  actorName: "Sarah Williams",
};
```

### Sample NotificationPreference Instance

```typescript
const samplePreferences: NotificationPreference = {
  id: "dd0e8400-e29b-41d4-a716-446655440008",
  userId: "660e8400-e29b-41d4-a716-446655440001",
  createdAt: new Date("2025-01-10T09:00:00Z"),
  updatedAt: new Date("2025-01-15T11:00:00Z"),
  preferences: [
    { category: 'task_updates', inAppEnabled: true, emailEnabled: true },
    { category: 'comments_mentions', inAppEnabled: true, emailEnabled: true },
    { category: 'file_updates', inAppEnabled: true, emailEnabled: false },
    { category: 'approvals_revisions', inAppEnabled: true, emailEnabled: true },
    { category: 'team_changes', inAppEnabled: true, emailEnabled: true },
    { category: 'project_updates', inAppEnabled: true, emailEnabled: false },
  ],
  emailBatchingFrequency: 'every_5_min',
  pausedUntil: null,
};
```

### Sample EmailNotificationQueue Instance

```typescript
const sampleEmailQueue: EmailNotificationQueue = {
  id: "ee0e8400-e29b-41d4-a716-446655440009",
  userId: "660e8400-e29b-41d4-a716-446655440001",
  projectId: "770e8400-e29b-41d4-a716-446655440002",
  createdAt: new Date("2025-01-15T10:30:00Z"),
  scheduledFor: new Date("2025-01-15T10:32:00Z"),
  sentAt: null,
  status: "pending",
  notificationIds: [
    "550e8400-e29b-41d4-a716-446655440000",
    "aa0e8400-e29b-41d4-a716-446655440005",
  ],
  emailType: "digest",
  subject: "[Motionify] You have 2 new notifications - Brand Video Campaign",
  bodyHtml: "<html>...</html>",
  bodyText: "Plain text version...",
  retryCount: 0,
  lastError: null,
  sesMessageId: null,
};
```

---

## Type Guards & Utilities

```typescript
// Type guard to check if notification is unread
export function isNotificationUnread(notification: Notification): boolean {
  return !notification.read && notification.deletedAt === null;
}

// Type guard to check if notification should auto-expire
export function shouldAutoExpire(notification: Notification): boolean {
  const daysSinceCreated = (Date.now() - notification.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return !notification.read && daysSinceCreated > NOTIFICATION_CONFIG.AUTO_READ_DAYS;
}

// Type guard to check if notification should be deleted
export function shouldDelete(notification: Notification): boolean {
  const daysSinceCreated = (Date.now() - notification.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceCreated > NOTIFICATION_CONFIG.RETENTION_DAYS;
}

// Utility to format time ago
export function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

// Utility to get category from type
export function getCategoryFromType(type: NotificationType): NotificationCategory {
  return NOTIFICATION_CATEGORY_MAPPING[type];
}

// Utility to check if email should be sent
export function shouldSendEmail(
  type: NotificationType,
  preferences: NotificationPreference
): boolean {
  const category = getCategoryFromType(type);
  const categoryPref = preferences.preferences.find(p => p.category === category);
  return categoryPref?.emailEnabled ?? false;
}

// Utility to check if in-app notification should be created
export function shouldCreateInApp(
  type: NotificationType,
  preferences: NotificationPreference
): boolean {
  const category = getCategoryFromType(type);
  const categoryPref = preferences.preferences.find(p => p.category === category);
  return categoryPref?.inAppEnabled ?? true; // Default to true
}

// Utility to build notification message
export function buildNotificationMessage(
  type: NotificationType,
  metadata: NotificationMetadata,
  actorName: string
): string {
  switch (type) {
    case 'task_assigned':
      return `You were assigned to '${metadata.taskTitle}' by ${actorName}`;
    case 'task_status_changed':
      return `Task status changed: '${metadata.taskTitle}' → ${metadata.newStatus}`;
    case 'comment_mention':
      return `${actorName} mentioned you in a comment`;
    case 'file_uploaded':
      return `New file uploaded: ${metadata.fileName} by ${actorName}`;
    case 'approval_request':
      return `Deliverable awaiting your approval: ${metadata.deliverableName}`;
    case 'revision_requested':
      return `Client requested revision on ${metadata.deliverableName}`;
    case 'team_member_added':
      return `New team member added: ${actorName}`;
    case 'team_member_removed':
      return `Team member removed: ${actorName}`;
    default:
      return 'New notification';
  }
}

// Utility to create notification object
export function createNotification(params: {
  userId: string;
  projectId: string;
  type: NotificationType;
  metadata: NotificationMetadata;
  actorId?: string;
  actorName?: string;
}): Omit<Notification, 'id' | 'createdAt' | 'readAt' | 'deletedAt'> {
  const category = getCategoryFromType(params.type);
  const icon = NOTIFICATION_ICONS[params.type];
  const message = buildNotificationMessage(
    params.type,
    params.metadata,
    params.actorName || 'Someone'
  );
  
  return {
    userId: params.userId,
    projectId: params.projectId,
    type: params.type,
    category,
    read: false,
    title: NOTIFICATION_TYPE_LABELS[params.type],
    message,
    icon,
    actionUrl: buildActionUrl(params.type, params.metadata, params.projectId),
    actionLabel: buildActionLabel(params.type),
    metadata: params.metadata,
    actorId: params.actorId || null,
    actorName: params.actorName || null,
  };
}

// Helper to build action URL
function buildActionUrl(
  type: NotificationType,
  metadata: NotificationMetadata,
  projectId: string
): string | null {
  if (metadata.taskId) {
    return `/projects/${projectId}/tasks/${metadata.taskId}`;
  }
  if (metadata.fileId) {
    return `/projects/${projectId}/files/${metadata.fileId}`;
  }
  if (metadata.deliverableId) {
    return `/projects/${projectId}/deliverables/${metadata.deliverableId}`;
  }
  return `/projects/${projectId}`;
}

// Helper to build action label
function buildActionLabel(type: NotificationType): string | null {
  if (type.includes('task')) return 'View Task';
  if (type.includes('file')) return 'View File';
  if (type.includes('comment')) return 'View Comment';
  if (type.includes('approval') || type.includes('revision')) return 'View Deliverable';
  if (type.includes('team')) return 'View Team';
  return 'View Details';
}

// Validation function for notification metadata per type
export function validateNotificationMetadata(
  type: NotificationType,
  metadata: NotificationMetadata
): { valid: boolean; error?: string } {
  switch (type) {
    case 'task_assigned':
    case 'task_status_changed':
    case 'task_comment_added':
      if (!metadata.taskId || !metadata.taskTitle) {
        return { valid: false, error: 'taskId and taskTitle required for task notifications' };
      }
      break;
    
    case 'comment_mention':
    case 'comment_reply':
      if (!metadata.commentId) {
        return { valid: false, error: 'commentId required for comment notifications' };
      }
      break;
    
    case 'file_uploaded':
    case 'file_comment_added':
      if (!metadata.fileId || !metadata.fileName) {
        return { valid: false, error: 'fileId and fileName required for file notifications' };
      }
      break;
    
    case 'approval_request':
    case 'approval_granted':
    case 'revision_requested':
    case 'revision_completed':
      if (!metadata.deliverableId || !metadata.deliverableName) {
        return { valid: false, error: 'deliverableId and deliverableName required for deliverable notifications' };
      }
      break;
    
    case 'payment_advance_received':
    case 'payment_balance_received':
    case 'payment_failed':
      if (!metadata.projectName) {
        return { valid: false, error: 'projectName required for payment notifications' };
      }
      break;
    
    // Other types may have optional metadata
    default:
      break;
  }
  
  return { valid: true };
}
```
