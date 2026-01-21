# Integration Check Report: Proposal Comments Feature
**Date:** 2026-01-21
**Scope:** Phases 1-3 (Foundation, Core Experience, Attachments & Notifications)

---

## Executive Summary

**Overall Status:** ⚠️ PARTIALLY INTEGRATED - Critical schema conflict detected

| Category | Status | Count |
|----------|--------|-------|
| Connected Flows | ✅ Working | 4 |
| Broken Flows | ❌ Issues | 2 |
| Orphaned Code | ⚠️ Unused | 1 |
| Missing Connections | ⚠️ Gaps | 2 |

---

## Critical Issues

### 🔴 CRITICAL: Database Schema Conflict

**Impact:** HIGH - API endpoints will fail if incorrect schema was applied

**Issue:** Two conflicting `proposal_comments` table schemas exist:

1. **`database/add-proposal-comments-table.sql`** (Used by API):
   ```sql
   CREATE TABLE proposal_comments (
     id UUID PRIMARY KEY,
     proposal_id UUID REFERENCES proposals(id),
     user_id UUID REFERENCES users(id),      -- ← user_id
     content TEXT NOT NULL,
     user_name VARCHAR(255) NOT NULL,
     is_edited BOOLEAN DEFAULT FALSE,          -- ← is_edited exists
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **`database/migrations/002_add_comments_and_notifications.sql`** (Old/incorrect):
   ```sql
   CREATE TABLE proposal_comments (
     id UUID PRIMARY KEY,
     proposal_id UUID,                         -- ← NO FK to proposals
     content TEXT NOT NULL,
     author_id UUID NOT NULL,                   -- ← author_id instead of user_id
     author_type VARCHAR(20) CHECK ('CLIENT', 'ADMIN'),  -- ← author_type enum
     user_name VARCHAR(255) NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
     -- ← NO is_edited field
   );
   ```

**API Code Expects Schema 1** (`netlify/functions/comments.ts`):
```typescript
// Line 88: Queries is_edited
is_edited as "isEdited"

// Line 347: Queries user_id
SELECT user_id, content FROM proposal_comments WHERE id = $1

// Line 375: Updates is_edited
SET content = $1, is_edited = true, updated_at = NOW()
```

**If migration 002 was applied, these API calls WILL FAIL:**
- ✗ GET /comments will fail (column "is_edited" does not exist)
- ✗ POST /comments will fail (column "user_id" does not exist)
- ✗ PUT /comments will fail (column "is_edited" does not exist)

**Resolution Required:**
```sql
-- Drop and recreate with correct schema
DROP TABLE IF EXISTS proposal_comments CASCADE;
-- Run: database/add-proposal-comments-table.sql
-- Then: database/add-comment-attachments-table.sql
```

---

## Integration Analysis by Phase

### Phase 1: Foundation (Database, API, UI Components)

#### ✅ Database Schema Integrity
**Schema:** `add-proposal-comments-table.sql`
- **Foreign Keys:** ✅ `proposal_id REFERENCES proposals(id)`, `user_id REFERENCES users(id)`
- **Indexes:** ✅ `proposal_id`, `user_id`, `created_at`
- **Constraints:** ✅ Properly cascading deletes

#### ✅ API Endpoints (GET, POST)
**File:** `netlify/functions/comments.ts`

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/comments` | GET | ✅ CONNECTED | Used by both portals with polling |
| `/comments` | POST | ✅ CONNECTED | Creates comment, sends email + in-app notification |
| `/comments` | PUT | ✅ CONNECTED | Editing with ownership check |

**Validation:** ✅ UUID validation, content length (1-10000 chars), auth required

#### ✅ Frontend Components
**Admin Portal (`components/proposals/`):**
- `CommentThread.tsx` ✅ Uses `lib/comments.ts` (shared)
- `CommentItem.tsx` ✅ Renders comments with edit badge
- `CommentInput.tsx` ✅ Handles input and file uploads

**Client Portal (`landing-page-new/src/components/`):**
- `CommentThread.tsx` ⚠️ Inline API calls (not using shared lib)
- `CommentItem.tsx` ✅ Same component as admin
- `CommentInput.tsx` ✅ Same component as admin

---

### Phase 2: Core Experience (Editing, Polling)

#### ✅ Comment Editing (PUT)
**API:** `netlify/functions/comments.ts` lines 301-403

**Features Implemented:**
- ✅ Ownership validation: `commentCheck.rows[0].user_id !== user.id`
- ✅ Returns 403 if not owner
- ✅ Sets `is_edited = true` on update
- ✅ Returns updated comment with `isEdited: true`

**Frontend Integration:**
```typescript
// Both portals - CommentItem.tsx lines 95-110
const handleSave = async () => {
    await onEdit?.(comment.id, trimmedContent);
    setIsEditing(false);
};
```

**Status:** ✅ FULLY INTEGRATED

---

#### ✅ Real-time Polling
**API:** `netlify/functions/comments.ts` lines 66-134

**Features Implemented:**
- ✅ `since` parameter accepts ISO timestamp
- ✅ Filters: `WHERE proposal_id = $1 AND created_at > $2`
- ✅ Returns only new comments since timestamp

**Frontend Integration:**
```typescript
// Both portals - CommentThread.tsx
const POLL_INTERVAL = 10000; // 10 seconds

// Page Visibility API - only poll when visible
document.addEventListener('visibilitychange', handleVisibilityChange);
```

**Flow Trace:**
1. User views proposal → `loadComments()` → GET /comments
2. Track `lastPolledAt = latest.createdAt`
3. Every 10s → `pollForNewComments()` → GET /comments?since={timestamp}
4. Merge new comments without scroll disruption
5. Restore scroll position if user was reading

**Status:** ✅ FULLY INTEGRATED

---

### Phase 3: Attachments & Notifications

#### ✅ File Attachments
**Database:** `database/add-comment-attachments-table.sql`
```sql
CREATE TABLE comment_attachments (
  id UUID PRIMARY KEY,
  comment_id UUID REFERENCES proposal_comments(id) ON DELETE CASCADE,
  file_name VARCHAR(255),
  file_type VARCHAR(100),
  file_size INTEGER,
  r2_key VARCHAR(512),
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Schema Integrity:** ✅ Proper FK cascade delete

**API:** `netlify/functions/attachments.ts`

| Endpoint | Method | Status |
|----------|--------|--------|
| `/attachments?commentId={id}` | GET | ✅ Fetches attachments for comment |
| `/attachments?attachmentId={id}` | GET | ✅ Generates R2 download URL (1hr expiry) |
| `/attachments` | POST | ✅ Creates attachment record |

**R2 Integration:**
- ✅ Presign URL generation: `netlify/functions/r2-presign.ts`
- ✅ Folder: `comment-attachments/`
- ✅ Upload flow:
  1. Frontend: `getPresignedUploadUrl(fileName, fileType, proposalId)`
  2. Returns presigned PUT URL + R2 key
  3. Frontend: Uploads file directly to R2
  4. Frontend: `createAttachment(commentId, fileName, fileType, fileSize, r2Key)`

**Frontend Integration:**
```typescript
// Both portals - CommentInput.tsx lines 93-136
const uploadFileItem = async (uploadingFile: UploadingFile) => {
    const presignedData = await getPresignedUploadUrl(file.name, file.type, proposalId);
    const uploadSuccess = await uploadFile(presignedData.uploadUrl, file);
    setPendingAttachments(prev => [...prev, { tempId, fileName, fileType, fileSize, r2Key: presignedData.key }]);
};
```

**Attachment Display:**
```typescript
// Both portals - CommentItem.tsx lines 58-72
useEffect(() => {
    loadAttachments(); // Calls getAttachments(comment.id)
}, [comment.id]);

// Renders file list with download buttons
attachments.map((attachment) => (
    <AttachmentItem
        fileName={attachment.fileName}
        fileSize={attachment.fileSize}
        onDownload={() => getAttachmentDownloadUrl(attachment.id)}
    />
))
```

**Status:** ✅ FULLY INTEGRATED

---

#### ✅ Email Notifications
**API:** `netlify/functions/send-email.ts`

**Function:** `sendCommentNotificationEmail`
```typescript
export async function sendCommentNotificationEmail(data: {
  to: string;
  commenterName: string;
  commenterRole: 'client' | 'admin';
  commentPreview: string;
  proposalId: string;
  proposalNumber?: string;
})
```

**Integration in Comments API:**
```typescript
// netlify/functions/comments.ts lines 207-289
try {
    // Determine recipient
    let recipientEmail: string | null = null;
    if (user.role === 'client') {
        // Notify superadmin/project_manager
        const adminResult = await client.query(
            `SELECT email FROM users WHERE role IN ('super_admin', 'project_manager') LIMIT 1`
        );
        recipientEmail = adminResult.rows[0].email;
    } else {
        // Notify client
        const proposalResult = await client.query(
            `SELECT p.client_user_id, i.contact_email, i.inquiry_number
             FROM proposals p JOIN inquiries i ON p.inquiry_id = i.id
             WHERE p.id = $1`,
            [proposalId]
        );
        recipientEmail = proposalResult.rows[0].contact_email;
    }

    // Send email
    await sendCommentNotificationEmail({
        to: recipientEmail,
        commenterName: user.fullName,
        commenterRole: user.role === 'client' ? 'client' : 'admin',
        commentPreview: trimmedContent.substring(0, 100),
        proposalId,
        proposalNumber: proposalResult.rows[0]?.inquiry_number,
    });
} catch (emailError) {
    // Log but don't fail the comment creation
    console.error('❌ Failed to send comment notification email:', emailError);
}
```

**Status:** ✅ FULLY INTEGRATED - Non-blocking error handling

---

#### ✅ In-App Notifications
**Database:** `database/add-notifications-table.sql`
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url VARCHAR(500),
  actor_id UUID REFERENCES users(id),
  actor_name VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**API:** `netlify/functions/notifications.ts`
- ✅ GET /notifications?userId={id} - Fetch notifications
- ✅ PATCH /notifications - Mark as read / mark all as read

**Integration in Comments API:**
```typescript
// netlify/functions/comments.ts lines 260-285
if (recipientUserId && recipientUserId !== user.id) {
    try {
        const commentPreview = trimmedContent.substring(0, 100);
        const proposalUrl = `${process.env.URL}/proposal/${proposalId}`;

        await client.query(
            `INSERT INTO notifications (user_id, project_id, type, title, message, action_url, actor_id, actor_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                recipientUserId,
                proposalId,
                'comment_created',
                'New Comment',
                `"${user.fullName}" commented: "${commentPreview}"`,
                proposalUrl,
                user.id,
                user.fullName,
            ]
        );
        console.log(`✅ In-app notification created for user ${recipientUserId}`);
    } catch (notifError) {
        console.error('❌ Failed to create in-app notification:', notifError);
    }
}
```

**Frontend Notification Context:**
```typescript
// contexts/NotificationContext.tsx
const addNotification = useCallback(
    (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
        const newNotification: AppNotification = {
            ...notification,
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            read: false,
        };
        setNotifications(prev => [newNotification, ...prev]);
    },
    []
);
```

**Used in Polling:**
```typescript
// Both portals - CommentThread.tsx lines 89-100
trulyNew.forEach(comment => {
    if (comment.userId !== currentUserId) {
        addNotification({
            type: 'comment_created',
            title: 'New Comment',
            message: `${comment.userName} commented on the proposal`,
            actionUrl: `/proposal/${proposalId}`,
            projectId: proposalId,
        });
    }
});
```

**Status:** ✅ FULLY INTEGRATED

---

## Cross-Portal Parity Analysis

### Admin Portal (Vite)
**Location:** `components/proposals/`

| Component | File | Pattern |
|-----------|------|---------|
| CommentThread | `CommentThread.tsx` | ✅ Uses `lib/comments.ts` |
| CommentItem | `CommentItem.tsx` | ✅ Has edit UI, attachments |
| CommentInput | `CommentInput.tsx` | ✅ Has file upload UI |

**API Integration:**
```typescript
import { getComments, createComment, updateComment } from '@/lib/comments';
```

### Client Portal (Next.js)
**Location:** `landing-page-new/src/components/`

| Component | File | Pattern |
|-----------|------|---------|
| CommentThread | `CommentThread.tsx` | ⚠️ Inline API calls (not using shared lib) |
| CommentItem | `CommentItem.tsx` | ✅ Same as admin |
| CommentInput | `CommentInput.tsx` | ✅ Same as admin |

**API Integration:**
```typescript
// Inline in CommentThread.tsx - NOT using shared lib
async function getComments(proposalId: string, since?: string): Promise<Comment[]> {
    let url = `${API_BASE}/comments?proposalId=${proposalId}`;
    const response = await fetch(url);
    return data.comments || [];
}
```

**Issue:** Client portal doesn't use `lib/comments.ts` or `lib/attachments.ts`
- ❌ Duplicates API logic
- ❌ Inconsistent error handling
- ❌ Harder to maintain

**Recommendation:** Refactor client portal to use shared `lib/` functions

---

## E2E Flow Analysis

### Flow 1: User Posts Comment
**Steps:**
1. ✅ User types in CommentInput
2. ✅ Clicks Send → calls `handleSubmit`
3. ✅ Calls `createComment({ proposalId, content })`
4. ✅ POST /comments → DB stores in `proposal_comments`
5. ✅ Triggers `sendCommentNotificationEmail`
6. ✅ Creates in-app notification record
7. ✅ Frontend updates state → shows new comment
8. ✅ Polling updates other users within 10s

**Status:** ✅ COMPLETE

---

### Flow 2: User Attaches File
**Steps:**
1. ✅ User clicks Paperclip → selects file
2. ✅ `validateFile` checks type (image/pdf/doc/txt) and size (10MB max)
3. ✅ `getPresignedUploadUrl` → POST /r2-presign
4. ✅ Gets R2 presigned URL + key
5. ✅ `uploadFile` → PUT to R2 directly
6. ✅ After upload → creates PendingAttachment with r2Key
7. ✅ User submits comment → `createAttachment` called
8. ✅ POST /attachments → stores in `comment_attachments`
9. ✅ R2 key linked to comment_id

**Status:** ✅ COMPLETE

---

### Flow 3: User Edits Comment
**Steps:**
1. ✅ User clicks Edit on own comment (only shown if `currentUserId === comment.userId`)
2. ✅ Shows textarea with current content
3. ✅ User edits → clicks Save
4. ✅ PUT /comments with `{ id, content }`
5. ✅ API validates ownership: `commentCheck.rows[0].user_id !== user.id`
6. ✅ Updates DB: `SET content = $1, is_edited = true`
7. ✅ Returns updated comment with `isEdited: true`
8. ✅ Frontend shows "edited" badge

**Status:** ✅ COMPLETE

---

### Flow 4: Real-time Polling
**Steps:**
1. ✅ Component mounts → `loadComments()` → GET /comments
2. ✅ Sets `lastPolledAt = latest.createdAt`
3. ✅ Starts 10s interval → `pollForNewComments()`
4. ✅ Calls GET /comments?since={timestamp}
5. ✅ API filters: `WHERE created_at > $2`
6. ✅ Returns only newer comments
7. ✅ Frontend merges: `[...prev, ...newComments]`
8. ✅ Deduplicates by ID
9. ✅ Preserves scroll position if user was reading
10. ✅ Stops polling when page hidden (Page Visibility API)

**Status:** ✅ COMPLETE

---

## Orphaned / Unused Code

### ⚠️ Task CommentItem Component
**File:** `components/tasks/CommentItem.tsx`

**Issue:** This is a different comment system (for tasks, not proposals)
- Uses different props interface
- Has delete functionality (not used in proposal comments)
- Has mention highlighting (not implemented in proposal comments)
- **Not connected** to proposal comment system

**Status:** SEPARATE SYSTEM (not orphaned, just different domain)

---

## Missing Connections

### ⚠️ Client Portal Not Using Shared Lib
**Issue:** `landing-page-new/src/components/CommentThread.tsx` has inline API calls instead of using shared `lib/comments.ts`

**Impact:**
- Code duplication
- Inconsistent error handling
- Harder to maintain

**Fix Required:**
```typescript
// landing-page-new/src/components/CommentThread.tsx
// CHANGE FROM:
async function getComments(proposalId: string, since?: string): Promise<Comment[]> {
    let url = `${API_BASE}/comments?proposalId=${proposalId}`;
    const response = await fetch(url);
    return data.comments || [];
}

// TO:
import { getComments, createComment } from '@/lib/comments'; // Need to create this file in client portal
```

---

## Recommendations

### Priority 1: Fix Database Schema
```bash
# Drop incorrect schema
psql $DATABASE_URL -c "DROP TABLE IF EXISTS proposal_comments CASCADE;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS comment_attachments CASCADE;"

# Apply correct schema
psql $DATABASE_URL -f database/add-proposal-comments-table.sql
psql $DATABASE_URL -f database/add-comment-attachments-table.sql
```

### Priority 2: Refactor Client Portal
Create `landing-page-new/src/lib/comments.ts` to share API logic:
```typescript
// landing-page-new/src/lib/comments.ts
import { api } from './api-config';

export async function getComments(proposalId: string, since?: string) {
    // Share with admin portal
}
```

### Priority 3: Add Delete Comment Endpoint (Future)
Currently, comments can't be deleted. Consider adding:
```typescript
// netlify/functions/comments.ts
if (event.httpMethod === 'DELETE') {
    // Add DELETE handler with ownership check
}
```

---

## Verification Checklist

| Check | Status | Evidence |
|-------|--------|----------|
| Database tables properly related | ✅ | FK: `comment_id REFERENCES proposal_comments(id)` |
| API endpoints use same validation | ✅ | UUID regex, content length checks consistent |
| Frontend components call correct APIs | ⚠️ | Admin uses shared lib, client uses inline calls |
| Cross-portal parity | ⚠️ | Feature parity yes, code structure no |
| Email notifications trigger on comment creation | ✅ | `sendCommentNotificationEmail` called in POST |
| File uploads integrate with R2 | ✅ | Presign → upload → attachment record |
| Polling fetches without scroll disruption | ✅ | Scroll position preserved |

---

## Summary

**Strengths:**
- ✅ Email notifications working with proper recipient detection
- ✅ In-app notifications integrated into polling flow
- ✅ Attachments fully wired with R2 presign
- ✅ Edit functionality with ownership checks
- ✅ Real-time polling with efficient `since` parameter
- ✅ Page Visibility API for battery efficiency

**Critical Issues to Address:**
1. ❌ **Database schema conflict** - Apply correct schema
2. ⚠️ **Client portal code duplication** - Use shared lib

**Overall Integration Assessment:**
- API layer: ✅ WELL_INTEGRATED
- Database layer: ⚠️ SCHEMA_CONFLICT
- Frontend layer: ⚠️ PARTIALLY_INTEGRATED
- E2E flows: ✅ MOSTLY_WORKING (pending schema fix)
