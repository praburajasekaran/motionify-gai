# Data Models: Feedback & Revisions System

This document defines all TypeScript interfaces and types for the feedback and revision workflow.

## Table of Contents

1. [TaskComment Model](#taskcomment-model)
2. [FileComment Model](#filecomment-model)
3. [DeliverableComment Model](#deliverablecomment-model)
4. [RevisionRequest Model](#revisionrequest-model)
5. [AdditionalRevisionRequest Model](#additionalrevisionrequest-model)
6. [CommentMention Model](#commentmention-model)
7. [Supporting Types](#supporting-types)
8. [Relationships](#relationships)
9. [Validation Rules](#validation-rules)

---

## TaskComment Model

Comments on tasks for informal feedback and discussion.

```typescript
export interface TaskComment {
  // Core Identification
  id: string;                    // UUID
  taskId: string;                // UUID of parent task
  projectId: string;             // UUID of project (for easier queries)
  createdAt: Date;
  updatedAt: Date;

  // Content
  text: string;                  // Comment content (supports Markdown)
  rawText: string;               // Original unprocessed text

  // Author
  authorId: string;              // UUID of user who created comment
  authorName: string;            // Cached for display (from users table)
  authorRole: 'client' | 'project_manager' | 'super_admin';

  // Editing
  isEdited: boolean;             // True if comment was edited
  editedAt?: Date;               // When last edited
  canEdit: boolean;              // True if < 1 hour old (computed)

  // Deletion
  isDeleted: boolean;            // Soft delete flag
  deletedAt?: Date;
  deletedBy?: string;            // UUID of user who deleted

  // Mentions
  mentionedUserIds: string[];    // Array of UUIDs of @mentioned users
  mentions: CommentMention[];    // Full mention objects (populated)

  // Counts
  replyCount: number;            // Number of replies (future threading feature)
}
```

---

## FileComment Model

Comments on files for feedback on specific assets.

```typescript
export interface FileComment {
  // Core Identification
  id: string;                    // UUID
  fileId: string;                // UUID of parent file
  projectId: string;             // UUID of project
  createdAt: Date;
  updatedAt: Date;

  // Content
  text: string;                  // Comment content (supports Markdown)
  rawText: string;               // Original unprocessed text

  // Timestamp Reference (optional for video/audio comments)
  timestamp?: string;            // e.g., "00:42" or "1:15" for media files
  timestampSeconds?: number;     // Seconds for programmatic use

  // Author
  authorId: string;
  authorName: string;
  authorRole: 'client' | 'project_manager' | 'super_admin';

  // Editing
  isEdited: boolean;
  editedAt?: Date;
  canEdit: boolean;              // Computed: < 1 hour old

  // Deletion
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;

  // Mentions
  mentionedUserIds: string[];
  mentions: CommentMention[];

  // Counts
  replyCount: number;
}
```

---

## DeliverableComment Model

Draft comments on video deliverables for collaborative feedback before formal revision request submission.

**Purpose**: These are temporary comments that allow team members to collaboratively provide timestamped feedback on deliverables during the review process. When the Primary Contact submits a revision request, all draft comments are automatically bundled into the revision request and then deleted from the draft comments table.

**Lifecycle**: Draft → Bundled into revision request → Preserved in approval history → Draft comments deleted

**Key Differences from File Comments**:
- **Deliverable-specific**: Only for deliverable videos in review
- **Temporary/ephemeral**: Automatically deleted after bundling
- **Collaborative**: Multiple team members can comment before submission
- **Status-dependent**: Only visible for deliverables in `awaiting_approval` status

```typescript
export interface DeliverableComment {
  // Core Identification
  id: string;                    // UUID
  deliverableId: string;         // UUID of parent deliverable
  projectId: string;             // UUID of project (for easier queries)
  createdAt: Date;
  updatedAt: Date;

  // Content
  timestamp: number;             // Seconds from video start (e.g., 32 for 0:32)
  comment: string;               // Comment text

  // Author
  authorId: string;              // UUID of user who created comment
  authorName: string;            // Cached for display (from users table)

  // Status
  resolved: boolean;             // Whether the comment has been addressed

  // Lifecycle
  isDraft: boolean;              // True until bundled into revision request
}
```

### Lifecycle Phases

**1. Draft Phase**: Comments are stored in `deliverable_comments` table
- Users add timestamped comments while reviewing deliverable
- Multiple team members can see and add comments
- Comments can be edited by author
- Comments can be deleted by author or Primary Contact (moderation)

**2. Bundling Phase**: Primary Contact submits revision request
- All draft comments are collected
- Comments are bundled into `DeliverableApproval.timestampedComments[]` array
- `isDraft` flag is conceptually set to `false` (though records are deleted)

**3. Archive Phase**: Comments are preserved in approval history
- Comments stored permanently in `approval_history.timestamped_comments` JSONB field
- Provides audit trail and historical reference

**4. Cleanup Phase**: Draft comments are deleted
- Records removed from `deliverable_comments` table
- Prevents data duplication
- Single source of truth: approval history

### Example Data

```typescript
const sampleDeliverableComment: DeliverableComment = {
  id: "j9k0l1m2-9012-3456-2345-678901234567",
  deliverableId: "g7h8i9j0-7890-1234-f123-456789012345",
  projectId: "c3d4e5f6-3456-7890-bcde-f12345678901",
  createdAt: new Date("2025-01-15T10:30:00Z"),
  updatedAt: new Date("2025-01-15T10:30:00Z"),

  timestamp: 32,
  comment: "The logo transition feels too fast here",

  authorId: "d4e5f6g7-4567-8901-cdef-123456789012",
  authorName: "John Doe",

  resolved: false,

  isDraft: true,
};
```

---

## RevisionRequest Model

Formal revision requests that consume project-level revision quota.

```typescript
export interface RevisionRequest {
  // Core Identification
  id: string;                    // UUID
  projectId: string;             // UUID of project
  deliverableId: string;         // UUID of deliverable being revised
  createdAt: Date;
  updatedAt: Date;

  // Request Details
  feedback: string;              // Required detailed feedback (min 50 chars)
  requestedBy: string;           // UUID of PRIMARY_CONTACT
  requestedByName: string;       // Cached name

  // Status
  status: RevisionRequestStatus;

  // Reference Files (optional attachments)
  referenceFileIds: string[];    // Array of file UUIDs uploaded with request

  // Quota Impact
  revisionNumber: number;        // Which revision this is (1, 2, 3...)
  quotaBefore: {
    total: number;
    used: number;
  };
  quotaAfter: {
    total: number;
    used: number;
  };

  // Resolution
  resolvedAt?: Date;             // When team completed revision
  resolvedBy?: string;           // UUID of team member
  resolutionNotes?: string;      // Internal team notes

  // Related Records
  deliverable: Deliverable;      // Populated deliverable object
  referenceFiles: File[];        // Populated file objects
}
```

### RevisionRequestStatus Type

```typescript
export type RevisionRequestStatus =
  | 'pending'           // Just submitted, team not started
  | 'in_progress'       // Team working on changes
  | 'completed'         // Team finished, new beta uploaded
  | 'cancelled';        // Request cancelled (rare)
```

---

## AdditionalRevisionRequest Model

Requests for additional revisions when project quota is exhausted.

```typescript
export interface AdditionalRevisionRequest {
  // Core Identification
  id: string;                    // UUID
  projectId: string;             // UUID of project
  createdAt: Date;
  updatedAt: Date;

  // Request Details
  requestedCount: number;        // How many revisions requested (1-5)
  reason: string;                // Required explanation (min 100 chars)
  requestedBy: string;           // UUID of PRIMARY_CONTACT
  requestedByName: string;

  // Status
  status: AdditionalRevisionRequestStatus;

  // Context at Time of Request
  quotaSnapshot: {
    total: number;               // totalRevisions at request time
    used: number;                // usedRevisions at request time
    remaining: number;           // 0 (should always be 0)
  };

  // Review by Admin
  reviewedAt?: Date;
  reviewedBy?: string;           // UUID of admin
  reviewerName?: string;

  // Decision
  approvedCount?: number;        // How many actually approved (may differ from requested)
  declineReason?: string;        // Required if declined
  internalNotes?: string;        // Admin's private notes

  // Related Records
  project: Project;              // Populated project object
}
```

### AdditionalRevisionRequestStatus Type

```typescript
export type AdditionalRevisionRequestStatus =
  | 'pending'           // Awaiting admin review
  | 'approved'          // Admin approved (quota increased)
  | 'declined';         // Admin declined request
```

---

## CommentMention Model

Tracks @mentions in comments for notifications.

```typescript
export interface CommentMention {
  // Core Identification
  id: string;                    // UUID
  commentId: string;             // UUID of parent comment
  commentType: 'task' | 'file';  // Type of comment
  createdAt: Date;

  // Mentioned User
  mentionedUserId: string;       // UUID of mentioned user
  mentionedUserName: string;     // Cached name
  mentionText: string;           // Original @mention text (e.g., "@JohnDoe")

  // Context
  projectId: string;             // For permission checks
  taskId?: string;               // If comment is on task
  fileId?: string;               // If comment is on file

  // Notification Status
  notificationSent: boolean;     // True after notification created
  notificationSentAt?: Date;
  notificationId?: string;       // UUID of notification record

  // Related Records
  mentionedUser: User;           // Populated user object
}
```

---

## Supporting Types

### Revision Quota Snapshot

```typescript
export interface RevisionQuota {
  total: number;                 // Total revisions allowed
  used: number;                  // Revisions consumed so far
  remaining: number;             // total - used (computed)
  percentage: number;            // (used / total) * 100 (computed)
  isExhausted: boolean;          // used >= total (computed)
  isWarning: boolean;            // remaining === 1 (computed)
}
```

### Centralized Edit Window Config

**Note:** This constant is used across features (comments, delivery notes, etc.)

```typescript
export const EDIT_WINDOW_CONFIG = {
  COMMENT_EDIT_MINUTES: 60,           // Can edit comments within 1 hour
  DELIVERY_NOTES_EDIT_MINUTES: 60,   // Can edit delivery notes within 1 hour
} as const;

export const COMMENT_CONFIG = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 5000,
  EDIT_WINDOW_MINUTES: EDIT_WINDOW_CONFIG.COMMENT_EDIT_MINUTES,  // Use centralized config
  RATE_LIMIT_PER_MINUTE: 10,     // Max 10 comments per minute
  MENTION_PATTERN: /@(\w+)/g,    // Regex for detecting mentions
} as const;
```

### Revision Request Validation Config

```typescript
export const REVISION_REQUEST_CONFIG = {
  FEEDBACK_MIN_LENGTH: 50,
  FEEDBACK_MAX_LENGTH: 5000,
  MAX_REFERENCE_FILES: 5,
  ADDITIONAL_REQUEST_REASON_MIN: 100,
  ADDITIONAL_REQUEST_REASON_MAX: 2000,
  ADDITIONAL_REVISIONS_MIN: 1,
  ADDITIONAL_REVISIONS_MAX: 5,
} as const;
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
       │
       ├────────────────────────────────┬─────────────────────┐
       │                                │                     │
       ↓                                ↓                     ↓
┌─────────────┐                  ┌──────────────┐    ┌──────────────────────┐
│    Task     │                  │ Deliverable  │    │ AdditionalRevision   │
└──────┬──────┘                  └──────┬───────┘    │      Request         │
       │                                │             └──────────────────────┘
       │ 1:N                            │ 1:N
       │                                │
       ↓                                ↓
┌─────────────────┐            ┌──────────────────┐
│  TaskComment    │            │ RevisionRequest  │
└──────┬──────────┘            └──────────────────┘
       │
       │ 1:N
       │
       ↓
┌─────────────────┐
│CommentMention   │
└─────────────────┘


┌─────────────┐
│    File     │
└──────┬──────┘
       │
       │ 1:N
       │
       ↓
┌─────────────────┐
│  FileComment    │
└──────┬──────────┘
       │
       │ 1:N
       │
       ↓
┌─────────────────┐
│CommentMention   │
└─────────────────┘


┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ 1:N (author)
       │
       ├────────────────────┬────────────────────┐
       │                    │                    │
       ↓                    ↓                    ↓
┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│  TaskComment    │  │  FileComment    │  │ RevisionRequest  │
│  .authorId      │  │  .authorId      │  │  .requestedBy    │
└─────────────────┘  └─────────────────┘  └──────────────────┘
```

### Comment → Mention Relationship

```
TaskComment or FileComment
       │
       │ has many
       ↓
   CommentMention
       │
       │ references
       ↓
      User (mentioned)
```

---

## Validation Rules

### TaskComment Validation

| Field | Required | Min | Max | Format |
|-------|----------|-----|-----|--------|
| text | Yes | 1 | 5000 | Markdown string |
| taskId | Yes | - | - | Valid UUID |
| projectId | Yes | - | - | Valid UUID |
| authorId | Yes | - | - | Valid UUID |

### FileComment Validation

| Field | Required | Min | Max | Format |
|-------|----------|-----|-----|--------|
| text | Yes | 1 | 5000 | Markdown string |
| fileId | Yes | - | - | Valid UUID |
| projectId | Yes | - | - | Valid UUID |
| timestamp | No | - | - | HH:MM or MM:SS format |

### RevisionRequest Validation

| Field | Required | Min | Max | Format |
|-------|----------|-----|-----|--------|
| feedback | Yes | 50 | 5000 | Plain text |
| deliverableId | Yes | - | - | Valid UUID |
| projectId | Yes | - | - | Valid UUID |

### AdditionalRevisionRequest Validation

| Field | Required | Min | Max | Format |
|-------|----------|-----|-----|--------|
| requestedCount | Yes | 1 | 5 | Integer |
| reason | Yes | 100 | 2000 | Plain text |
| projectId | Yes | - | - | Valid UUID |

### Validation Schemas

```typescript
import { z } from 'zod';

export const TaskCommentSchema = z.object({
  text: z.string().min(1).max(5000),
  taskId: z.string().uuid(),
  projectId: z.string().uuid(),
});

export const FileCommentSchema = z.object({
  text: z.string().min(1).max(5000),
  fileId: z.string().uuid(),
  projectId: z.string().uuid(),
  timestamp: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
});

export const RevisionRequestSchema = z.object({
  feedback: z.string().min(50).max(5000),
  deliverableId: z.string().uuid(),
  projectId: z.string().uuid(),
  referenceFileIds: z.array(z.string().uuid()).max(5).optional(),
});

export const AdditionalRevisionRequestSchema = z.object({
  requestedCount: z.number().int().min(1).max(5),
  reason: z.string().min(100).max(2000),
  projectId: z.string().uuid(),
});
```

---

## Example Data

### Sample TaskComment

```typescript
const sampleTaskComment: TaskComment = {
  id: "a1b2c3d4-1234-5678-9abc-def123456789",
  taskId: "b2c3d4e5-2345-6789-abcd-ef1234567890",
  projectId: "c3d4e5f6-3456-7890-bcde-f12345678901",
  createdAt: new Date("2025-01-15T14:30:00Z"),
  updatedAt: new Date("2025-01-15T14:30:00Z"),

  text: "Can we also adjust the saturation? @JaneDoe can you take a look?",
  rawText: "Can we also adjust the saturation? @JaneDoe can you take a look?",

  authorId: "d4e5f6g7-4567-8901-cdef-123456789012",
  authorName: "John Smith",
  authorRole: "client",

  isEdited: false,
  canEdit: true,

  isDeleted: false,

  mentionedUserIds: ["e5f6g7h8-5678-9012-def1-234567890123"],
  mentions: [],

  replyCount: 0,
};
```

### Sample RevisionRequest

```typescript
const sampleRevisionRequest: RevisionRequest = {
  id: "f6g7h8i9-6789-0123-ef12-345678901234",
  projectId: "c3d4e5f6-3456-7890-bcde-f12345678901",
  deliverableId: "g7h8i9j0-7890-1234-f123-456789012345",
  createdAt: new Date("2025-01-15T16:00:00Z"),
  updatedAt: new Date("2025-01-15T16:00:00Z"),

  feedback: "1. At 0:42 - Add crossfade transition\n2. At 1:15 - Increase logo size by 20%",
  requestedBy: "d4e5f6g7-4567-8901-cdef-123456789012",
  requestedByName: "John Smith",

  status: "pending",

  referenceFileIds: [],

  revisionNumber: 2,
  quotaBefore: { total: 3, used: 1 },
  quotaAfter: { total: 3, used: 2 },
};
```

### Sample AdditionalRevisionRequest

```typescript
const sampleAdditionalRequest: AdditionalRevisionRequest = {
  id: "h8i9j0k1-8901-2345-1234-567890123456",
  projectId: "c3d4e5f6-3456-7890-bcde-f12345678901",
  createdAt: new Date("2025-01-20T10:00:00Z"),
  updatedAt: new Date("2025-01-20T11:30:00Z"),

  requestedCount: 2,
  reason: "Our marketing team reviewed the latest version and provided new feedback based on recent stakeholder input. The changes include repositioning key product shots per brand team guidance and updating messaging to reflect Q1 2025 campaign language.",
  requestedBy: "d4e5f6g7-4567-8901-cdef-123456789012",
  requestedByName: "John Smith",

  status: "approved",

  quotaSnapshot: {
    total: 3,
    used: 3,
    remaining: 0,
  },

  reviewedAt: new Date("2025-01-20T11:30:00Z"),
  reviewedBy: "i9j0k1l2-9012-3456-2345-678901234567",
  reviewerName: "Admin User",

  approvedCount: 2,
};
```
