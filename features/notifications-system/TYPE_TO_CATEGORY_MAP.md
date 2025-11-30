# Notification Type to Category Mapping

This document defines the canonical mapping between notification `type` values and their corresponding `category`. This mapping must be used consistently across the application when creating notifications.

---

## Category Definitions

| Category | Description | UI Treatment | Email Batching |
|----------|-------------|--------------|----------------|
| **task_updates** | Task-related changes (status, assignments) | Blue badge | Batchable |
| **comments_mentions** | Comments and @ mentions | Yellow badge | Immediate for mentions |
| **file_updates** | File uploads and file comments | Green badge | Batchable |
| **approvals_revisions** | Approval requests and revision workflows | Purple badge | Immediate |
| **team_changes** | Team member additions/removals | Gray badge | Batchable |
| **project_updates** | Project-level changes | Orange badge | Important, low batch delay |

---

## Complete Type to Category Mapping

### Task Updates (6 types)

| Type | Category | Description | Priority | Send Email |
|------|----------|-------------|----------|------------|
| `task_assigned` | `task_updates` | User assigned to a task | Medium | ✅ Yes |
| `task_status_changed` | `task_updates` | Task moved to new status | Low | Only if completed/approved |
| `task_comment_added` | `task_updates` | New comment on task (not @ mention) | Low | ✅ Yes (batchable) |

**Code Example:**
```typescript
await createNotification({
  userId: assignedUserId,
  type: 'task_assigned',
  category: 'task_updates',  // ← Always use this category
  title: 'New task assigned',
  message: `You've been assigned to "${taskTitle}"`,
  projectId,
  relatedEntityType: 'task',
  relatedEntityId: taskId,
  actionUrl: `/projects/${projectId}/tasks/${taskId}`
});
```

---

### Comments & Mentions (2 types)

| Type | Category | Description | Priority | Send Email |
|------|----------|-------------|----------|------------|
| `comment_mention` | `comments_mentions` | User @ mentioned in comment | **High** | ✅ Yes (immediate) |
| `comment_reply` | `comments_mentions` | Reply to user's comment | Medium | ✅ Yes (batchable) |

**Code Example:**
```typescript
// When user is @ mentioned
await createNotification({
  userId: mentionedUserId,
  type: 'comment_mention',
  category: 'comments_mentions',  // ← Always use this category
  title: 'You were mentioned',
  message: `${actorName} mentioned you in a comment`,
  priority: 'high',  // Mentions are high priority
  projectId,
  relatedEntityType: 'comment',
  relatedEntityId: commentId,
  actionUrl: `/projects/${projectId}/comments/${commentId}`,
  metadata: {
    commentType: 'task_comment',  // or 'file_comment'
    parentId: taskId
  }
});
```

---

### File Updates (2 types)

| Type | Category | Description | Priority | Send Email |
|------|----------|-------------|----------|------------|
| `file_uploaded` | `file_updates` | New file uploaded to deliverable | Medium | ✅ Yes |
| `file_comment_added` | `file_updates` | Comment added to file | Low | ✅ Yes (batchable) |

**Code Example:**
```typescript
await createNotification({
  userId: clientUserId,
  type: 'file_uploaded',
  category: 'file_updates',  // ← Always use this category
  title: 'New file uploaded',
  message: `${fileName} has been uploaded to ${deliverableName}`,
  projectId,
  relatedEntityType: 'file',
  relatedEntityId: fileId,
  actionUrl: `/projects/${projectId}/deliverables/${deliverableId}`,
  metadata: {
    fileName,
    fileType: 'beta',  // or 'final'
    deliverableId
  }
});
```

---

### Approvals & Revisions (4 types)

| Type | Category | Description | Priority | Send Email |
|------|----------|-------------|----------|------------|
| `approval_request` | `approvals_revisions` | Client needs to approve deliverable | **High** | ✅ Yes (immediate) |
| `approval_granted` | `approvals_revisions` | Client approved deliverable | Medium | ✅ Yes |
| `revision_requested` | `approvals_revisions` | Client rejected, needs revision | **High** | ✅ Yes (immediate) |
| `revision_completed` | `approvals_revisions` | Team completed revision | Medium | ✅ Yes |

**Code Example:**
```typescript
// When deliverable ready for approval
await createNotification({
  userId: primaryContactUserId,
  type: 'approval_request',
  category: 'approvals_revisions',  // ← Always use this category
  title: 'Approval Required',
  message: `${deliverableName} is ready for your review`,
  priority: 'high',
  projectId,
  relatedEntityType: 'deliverable',
  relatedEntityId: deliverableId,
  actionUrl: `/projects/${projectId}/deliverables/${deliverableId}/approve`,
  metadata: {
    deliverableName,
    fileType: 'beta',
    remainingRevisions: 2
  }
});
```

---

### Team Changes (2 types)

| Type | Category | Description | Priority | Send Email |
|------|----------|-------------|----------|------------|
| `team_member_added` | `team_changes` | New member added to project team | Medium | ✅ Yes |
| `team_member_removed` | `team_changes` | Member removed from project | Low | ✅ Yes |

**Code Example:**
```typescript
await createNotification({
  userId: newMemberUserId,
  type: 'team_member_added',
  category: 'team_changes',  // ← Always use this category
  title: 'Added to project team',
  message: `You've been added to ${projectName}`,
  projectId,
  relatedEntityType: 'project_team',
  relatedEntityId: projectTeamId,
  actionUrl: `/projects/${projectId}`,
  metadata: {
    role: 'project_manager',
    addedBy: adminName
  }
});
```

---

### Project Updates (3 types)

| Type | Category | Description | Priority | Send Email |
|------|----------|-------------|----------|------------|
| `project_created` | `project_updates` | New project created from inquiry | **High** | ✅ Yes (immediate) |
| `project_status_changed` | `project_updates` | Project status updated | Medium | ✅ Yes |
| `terms_accepted` | `project_updates` | Client accepted project terms | Medium | ✅ Yes |
| `terms_updated` | `project_updates` | Project terms modified | Medium | ✅ Yes |

**Code Example:**
```typescript
// When inquiry converts to project
await createNotification({
  userId: customerUserId,
  type: 'project_created',
  category: 'project_updates',  // ← Always use this category
  title: 'Welcome to your project!',
  message: `Your project "${projectName}" is now active`,
  priority: 'high',
  projectId,
  relatedEntityType: 'project',
  relatedEntityId: projectId,
  actionUrl: `/projects/${projectId}`,
  metadata: {
    fromInquiryId: inquiryId,
    advancePaid: true,
    totalDeliverables: 2
  }
});
```

---

## Reference Code Implementation

### TypeScript Constants

```typescript
// features/notifications-system/constants.ts

export const TYPE_TO_CATEGORY_MAP = {
  // Task Updates
  'task_assigned': 'task_updates',
  'task_status_changed': 'task_updates',
  'task_comment_added': 'task_updates',

  // Comments & Mentions
  'comment_mention': 'comments_mentions',
  'comment_reply': 'comments_mentions',

  // File Updates
  'file_uploaded': 'file_updates',
  'file_comment_added': 'file_updates',

  // Approvals & Revisions
  'approval_request': 'approvals_revisions',
  'approval_granted': 'approvals_revisions',
  'revision_requested': 'approvals_revisions',
  'revision_completed': 'approvals_revisions',

  // Team Changes
  'team_member_added': 'team_changes',
  'team_member_removed': 'team_changes',

  // Project Updates
  'project_created': 'project_updates',
  'project_status_changed': 'project_updates',
  'terms_accepted': 'project_updates',
  'terms_updated': 'project_updates',
} as const;

export type NotificationType = keyof typeof TYPE_TO_CATEGORY_MAP;
export type NotificationCategory = typeof TYPE_TO_CATEGORY_MAP[NotificationType];

// Helper function to ensure correct mapping
export function getCategory(type: NotificationType): NotificationCategory {
  return TYPE_TO_CATEGORY_MAP[type];
}
```

### Usage in Notification Service

```typescript
// services/notificationService.ts

import { getCategory, NotificationType } from './constants';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  // category is auto-determined, don't pass it
  title: string;
  message: string;
  projectId?: string;
  priority?: 'low' | 'medium' | 'high';
  // ... other fields
}

async function createNotification(params: CreateNotificationParams) {
  const category = getCategory(params.type);  // ← Auto-map

  return await db.notifications.create({
    data: {
      ...params,
      category,  // ← Always correct
      createdAt: new Date(),
      read: false,
    }
  });
}
```

---

## Priority Guidelines

| Priority | Types | Email Timing | UI Indicator |
|----------|-------|--------------|--------------|
| **High** | comment_mention, approval_request, revision_requested, project_created | Immediate (within 1 min) | Red dot + sound |
| **Medium** | Most others | Batched (5-15 min) | Blue dot |
| **Low** | task_status_changed, file_comment_added, team_member_removed | Batched (hourly) | No special indicator |

---

## Email Batching Rules

### Immediate Send (No Batching)
- `comment_mention` - User was @ mentioned
- `approval_request` - Action required
- `revision_requested` - Action required
- `project_created` - Welcome email

### Batchable (User Preference)
All other notification types respect user's `email_batching_frequency`:
- `every_5_min` - Send every 5 minutes if notifications pending
- `hourly` - Send once per hour
- `daily` - Send digest once per day
- `never` - Never send email notifications

### Email Queue Logic

```typescript
async function scheduleNotificationEmail(notification: Notification) {
  const userPrefs = await getUserNotificationPreferences(notification.userId);

  // Check if this type should be sent immediately
  const immediateTypes = [
    'comment_mention',
    'approval_request',
    'revision_requested',
    'project_created'
  ];

  let scheduledFor: Date;

  if (immediateTypes.includes(notification.type)) {
    // Send immediately
    scheduledFor = new Date();
  } else {
    // Batch according to user preference
    const batchInterval = userPrefs.email_batching_frequency;
    scheduledFor = calculateNextBatchTime(batchInterval);
  }

  await db.notification_email_queue.create({
    data: {
      userId: notification.userId,
      notificationIds: [notification.id],
      scheduledFor,
      status: 'pending'
    }
  });
}
```

---

## Validation

### Database Constraints

The database enforces valid type/category combinations through CHECK constraints. However, having the wrong category will cause insertion to fail, so always use the mapping.

### Testing Your Mapping

```typescript
// __tests__/notificationMapping.test.ts

import { TYPE_TO_CATEGORY_MAP, getCategory } from '../constants';

describe('Notification Type to Category Mapping', () => {
  it('should map task_assigned to task_updates', () => {
    expect(getCategory('task_assigned')).toBe('task_updates');
  });

  it('should map comment_mention to comments_mentions', () => {
    expect(getCategory('comment_mention')).toBe('comments_mentions');
  });

  it('should have mapping for all notification types', () => {
    const allTypes = [
      'task_assigned', 'task_status_changed', 'task_comment_added',
      'comment_mention', 'comment_reply',
      'file_uploaded', 'file_comment_added',
      'approval_request', 'approval_granted', 'revision_requested', 'revision_completed',
      'team_member_added', 'team_member_removed',
      'project_created', 'project_status_changed', 'terms_accepted', 'terms_updated'
    ];

    allTypes.forEach(type => {
      expect(TYPE_TO_CATEGORY_MAP[type]).toBeDefined();
    });
  });
});
```

---

## Common Mistakes

### ❌ WRONG: Manually setting category
```typescript
await createNotification({
  type: 'task_assigned',
  category: 'task_updates',  // ❌ Don't do this
  // ...
});
```

### ✅ CORRECT: Let the system determine category
```typescript
await createNotification({
  type: 'task_assigned',
  // category is auto-determined from type
  // ...
});
```

### ❌ WRONG: Inconsistent mapping
```typescript
// In file A
createNotification({ type: 'task_assigned', category: 'task_updates' });

// In file B
createNotification({ type: 'task_assigned', category: 'project_updates' });  // ❌ Wrong!
```

### ✅ CORRECT: Use constant
```typescript
import { getCategory } from './constants';

const category = getCategory('task_assigned');  // Always returns 'task_updates'
```

---

**Last Updated:** 2025-11-19
**Maintained By:** Development Team
**Version:** 1.0
