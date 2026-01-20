# Architecture Patterns: Real-Time Comment System for Motionify

**Project:** Comment Thread Feature Integration
**Researched:** 2026-01-20
**Confidence:** MEDIUM-HIGH

## Executive Summary

This architecture document outlines a **real-time comment system** designed for Motionify's dual-app architecture (Vite admin SPA + Next.js client portal) deployed on **Netlify Functions** with **PostgreSQL** storage. The system must integrate seamlessly with existing proposal detail pages while adhering to Motionify's established patterns for authentication, file attachments (R2 presigned URLs), and notifications.

**Key Architecture Decisions:**

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Real-time Strategy | **Optimistic polling + Ably (optional)** | Netlify Functions don't support WebSockets; Ably provides durable connections without server maintenance |
| Comment Data Model | **Adjacency List + Path Enumeration** | Simpler than ltree for this scale; supports nested threads with reasonable query performance |
| File Attachments | **Direct-to-R2 via presigned URLs** | Already established pattern; bypasses Netlify payload limits |
| API Structure | **RESTful CRUD + Event Broadcasting** | Follows existing Netlify Function patterns; integrates with NotificationContext |

**Recommended Build Order:**
1. Database schema and CRUD API
2. Comment UI component (read-only, manual refresh)
3. File attachment integration
4. Real-time sync (polling or Ably)
5. Notification integration

---

## 1. System Architecture Overview

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MOTIONIFY COMMENT SYSTEM                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐          ┌─────────────────────────────────────┐  │
│  │   VITE ADMIN SPA    │          │         NEXT.JS CLIENT PORTAL       │  │
│  │   /admin/proposals  │          │      /proposal/[proposalId]         │  │
│  │                     │          │                                     │  │
│  │  ProposalDetail.tsx │          │   landing-page-new/src/app/...      │  │
│  │         │           │          │         │                           │  │
│  │         ▼           │          │         ▼                           │  │
│  │  CommentThread.tsx  │          │   CommentThread.tsx                 │  │
│  │  CommentItem.tsx    │          │   CommentItem.tsx                   │  │
│  │  CommentInput.tsx   │          │   CommentInput.tsx                  │  │
│  └─────────┬───────────┘          └─────────────┬───────────────────────┘  │
│            │                                    │                          │
│            │         ┌─────────────────────────┘                          │
│            │         │                                                   │
│            ▼         ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    NETLIFY FUNCTIONS (API LAYER)                     │  │
│  │                                                                     │  │
│  │  /.netlify/functions/comments.ts     │  /.netlify/functions/r2-presign│ │
│  │  - GET /comments?proposalId=...     │  - POST: Generate upload URL   │  │
│  │  - POST /comments                    │  - GET: Generate download URL  │  │
│  │  - PUT /comments/:id                 │                               │  │
│  │  - DELETE /comments/:id              │                               │  │
│  │                                     │                               │  │
│  │  /.netlify/functions/notifications.ts                               │  │
│  │  - Creates notifications on new comments                             │  │
│  └─────────────────────────────────────┬───────────────────────────────┘  │
│                                        │                                  │
│                                        ▼                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                      POSTGRES DATABASE                               │  │
│  │                                                                     │  │
│  │  ┌─────────────────────────────────────────────────────────────┐    │  │
│  │  │  comments TABLE                                              │    │  │
│  │  │  - id, proposal_id, parent_id, author_id, content           │    │  │
│  │  │  - attachments JSONB, is_deleted, created_at, updated_at    │    │  │
│  │  └─────────────────────────────────────────────────────────────┘    │  │
│  │                                                                     │  │
│  │  ┌─────────────────────────────────────────────────────────────┐    │  │
│  │  │  notifications TABLE (existing)                              │    │  │
│  │  │  - type: 'comment_added' | 'comment_mention'                 │    │  │
│  │  └─────────────────────────────────────────────────────────────┘    │  │
│  └─────────────────────────────────────┬───────────────────────────────┘  │
│                                        │                                  │
│                                        ▼                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                     EXTERNAL SERVICES                               │  │
│  │                                                                     │  │
│  │  Cloudflare R2           │  Ably (optional)      │  Resend Email    │  │
│  │  - File storage          │  - Real-time sync     │  - Comment       │  │
│  │  - Presigned URLs        │  - Connection mgmt    │    notifications │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Integration Point |
|-----------|---------------|-------------------|
| **CommentThread.tsx** | Manages comment list state, loading, filtering | Uses `useComments` hook |
| **CommentItem.tsx** | Renders individual comment with replies | Recursive for nested threads |
| **CommentInput.tsx** | New comment form with file attachments | Uses R2 presign API |
| **comments.ts (Netlify)** | CRUD operations, authorization, notification triggering | Connects to PostgreSQL |
| **r2-presign.ts (existing)** | Generates upload/download URLs for files | Already implemented |
| **notifications.ts (existing)** | Creates notification records | Existing system |
| **NotificationContext** | Displays in-app notifications | Polls for updates |

---

## 2. Data Model

### Comment Table Schema

```sql
-- ============================================================================
-- COMMENTS TABLE (Add to database/schema.sql)
-- ============================================================================

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  -- Author
  author_id UUID NOT NULL REFERENCES users(id),
  
  -- Content (supports markdown, mentions)
  content TEXT NOT NULL,
  
  -- Soft delete (preserves thread structure)
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  
  -- Attachments (R2 keys and metadata)
  attachments JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{key, fileName, fileType, fileSize, uploadedAt}]
  
  -- Edit history
  edit_count INTEGER DEFAULT 0,
  last_edited_at TIMESTAMPTZ,
  
  -- Thread metadata for efficient queries
  depth INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (char_length(content) > 0),
  CHECK (depth >= 0 AND depth <= 10) -- Prevent infinite nesting
);

-- Indexes for performance
CREATE INDEX idx_comments_proposal ON comments(proposal_id) WHERE parent_id IS NULL;
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_created ON comments(created_at DESC);
CREATE INDEX idx_comments_proposal_created ON comments(proposal_id, created_at DESC);

-- Self-referential constraint (no circular threads)
CREATE OR REPLACE FUNCTION prevent_circular_references()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    -- Prevent a comment from being its own ancestor
    PERFORM id FROM comments WHERE id = NEW.parent_id AND (
      id = NEW.id OR
      id IN (WITH RECURSIVE ancestors(id) AS (
        SELECT id FROM comments WHERE id = NEW.id
        UNION ALL
        SELECT c.parent_id FROM comments c
        INNER JOIN ancestors a ON c.id = a.id
      ) SELECT id FROM ancestors)
    );
    IF FOUND THEN
      RAISE EXCEPTION 'Cannot reply to a comment that is a descendant of this comment';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_prevent_circular
BEFORE INSERT OR UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION prevent_circular_references();

-- Trigger for updated_at
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Data Model Rationale

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Parent Reference** | Adjacency List (`parent_id`) | Simpler than ltree; supports up to 10 levels of nesting which is more than sufficient |
| **Soft Delete** | `is_deleted` flag | Preserves thread structure; children remain accessible; UI shows "[deleted]" placeholder |
| **Depth Tracking** | `depth` column (computed) | Denormalized for efficient sorting; updated via trigger when parent changes |
| **Reply Count** | `reply_count` column (computed) | Denormalized for UI badges; updated via trigger on insert/delete |
| **Attachments** | JSONB array | Flexible structure; can store R2 keys without separate table for this use case |

---

## 3. API Structure

### Netlify Function: comments.ts

```typescript
// /netlify/functions/comments.ts

import { requireAuth } from './_shared/auth';
import { query } from './_shared/db';
import { sendEmail } from './send-email';

interface NetlifyEvent {
  httpMethod: string;
  headers: Record<string, string>;
  body: string | null;
  queryStringParameters: Record<string, string> | null;
}

const handler = async (event: NetlifyEvent): Promise<NetlifyResponse> => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Authenticate
  const authResult = await requireAuth(event);
  if (!authResult.success) {
    return authResult.response;
  }
  const user = authResult.user;

  // GET: Fetch comments for a proposal
  if (event.httpMethod === 'GET') {
    const { proposalId, parentId, limit = '50', offset = '0' } = event.queryStringParameters || {};
    
    if (!proposalId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'proposalId required' }) };
    }

    // Fetch top-level comments or replies
    const sql = parentId
      ? `SELECT c.*, u.full_name as author_name, u.email as author_email, u.role as author_role
         FROM comments c
         JOIN users u ON c.author_id = u.id
         WHERE c.proposal_id = $1 AND c.parent_id = $2 AND c.is_deleted = false
         ORDER BY c.created_at ASC
         LIMIT $3 OFFSET $4`
      : `SELECT c.*, u.full_name as author_name, u.email as author_email, u.role as author_role
         FROM comments c
         JOIN users u ON c.author_id = u.id
         WHERE c.proposal_id = $1 AND c.parent_id IS NULL AND c.is_deleted = false
         ORDER BY c.created_at DESC
         LIMIT $3 OFFSET $4`;

    const params = parentId ? [proposalId, parentId, limit, offset] : [proposalId, limit, offset];
    const result = await query(sql, params);

    return { statusCode: 200, headers, body: JSON.stringify({ comments: result.rows }) };
  }

  // POST: Create new comment
  if (event.httpMethod === 'POST') {
    const { proposalId, parentId, content, attachments } = JSON.parse(event.body || '{}');

    if (!proposalId || !content) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'proposalId and content required' }) };
    }

    // Verify user has access to this proposal
    const proposalCheck = await query(
      `SELECT p.id, p.inquiry_id, i.client_user_id, i.contact_email
       FROM proposals p
       JOIN inquiries i ON p.inquiry_id = i.id
       WHERE p.id = $1`,
      [proposalId]
    );

    if (proposalCheck.rows.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Proposal not found' }) };
    }

    const proposal = proposalCheck.rows[0];
    const isClient = user.role === 'client';
    
    // Clients can only comment on their own proposals
    if (isClient && proposal.client_user_id && proposal.client_user_id !== user.id) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) };
    }

    // Insert comment with computed depth
    const insertSql = parentId
      ? `INSERT INTO comments (proposal_id, parent_id, author_id, content, attachments, depth)
         VALUES ($1, $2, $3, $4, $5, (SELECT depth + 1 FROM comments WHERE id = $2))
         RETURNING *`
      : `INSERT INTO comments (proposal_id, parent_id, author_id, content, attachments, depth)
         VALUES ($1, NULL, $3, $4, $5, 0)
         RETURNING *`;

    const result = await query(insertSql, [
      proposalId,
      parentId || null,
      user.id,
      content.trim(),
      JSON.stringify(attachments || [])
    ]);

    const comment = result.rows[0];

    // Update parent's reply count
    if (parentId) {
      await query(
        `UPDATE comments SET reply_count = reply_count + 1, updated_at = NOW() WHERE id = $1`,
        [parentId]
      );
    }

    // Create notifications
    await createCommentNotifications(proposalId, parentId, comment, proposal, user);

    return { statusCode: 201, headers, body: JSON.stringify({ comment }) };
  }

  // PUT: Update comment (only by author)
  if (event.httpMethod === 'PUT') {
    const { id, content } = JSON.parse(event.body || '{}');

    if (!id || !content) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'id and content required' }) };
    }

    const result = await query(
      `UPDATE comments 
       SET content = $1, edit_count = edit_count + 1, last_edited_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND author_id = $3 AND is_deleted = false
       RETURNING *`,
      [content.trim(), id, user.id]
    );

    if (result.rows.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Comment not found or unauthorized' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ comment: result.rows[0] }) };
  }

  // DELETE: Soft delete (only by author or admin)
  if (event.httpMethod === 'DELETE') {
    const pathParts = event.path.split('/');
    const commentId = pathParts[pathParts.length - 1];

    if (!commentId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Comment ID required' }) };
    }

    const result = await query(
      `UPDATE comments 
       SET is_deleted = true, deleted_at = NOW(), deleted_by = $1
       WHERE id = $2 AND (author_id = $1 OR $2 IN (SELECT id FROM users WHERE role = 'super_admin'))
       RETURNING *`,
      [user.id, commentId]
    );

    if (result.rows.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Comment not found or unauthorized' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};

export { handler };
```

### API Endpoint Reference

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/comments?proposalId={id}` | GET | Fetch top-level comments | Yes |
| `/api/comments?proposalId={id}&parentId={id}` | GET | Fetch replies to a comment | Yes |
| `/api/comments` | POST | Create new comment | Yes |
| `/api/comments/{id}` | PUT | Update own comment | Yes |
| `/api/comments/{id}` | DELETE | Soft delete own comment | Yes |

---

## 4. Real-Time Strategy

### Option A: Polling (Simplest, Lowest Cost)

**Implementation:** Add to `CommentThread.tsx`

```typescript
// Use React Query or SWR for automatic polling
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetch comments with polling every 10 seconds
const { data: comments, isLoading } = useQuery({
  queryKey: ['comments', proposalId],
  queryFn: () => fetchComments(proposalId),
  refetchInterval: 10000, // Poll every 10 seconds
});

// Optimistic updates for new comments
const queryClient = useQueryClient();
const addComment = useMutation({
  mutationFn: (comment) => createComment(comment),
  onSuccess: () => {
    queryClient.invalidateQueries(['comments', proposalId]);
  },
});
```

**Pros:**
- Zero additional cost
- Works with existing Netlify infrastructure
- Simple to implement

**Cons:**
- Not truly real-time (10-second delay)
- Increases API load

**Recommended Configuration:**
- Poll every 10-15 seconds (trade-off between freshness and cost)
- Use conditional requests (If-Modified-Since headers) to reduce payload

### Option B: Ably Integration (Recommended for True Real-Time)

**Implementation:**

```typescript
// In CommentThread.tsx
import Ably from 'ably';

const [comments, setComments] = useState([]);
let channel: Ably.RealtimeChannelPromise;

useEffect(() => {
  const ably = new Ably.Realtime({
    key: process.env.REACT_APP_ABLY_API_KEY,
    recoveryKey: localStorage.getItem('ablyRecoveryKey'),
  });

  channel = ably.channels.get(`proposal-${proposalId}-comments`);
  
  // Subscribe to new comments
  channel.subscribe('comment:created', (message) => {
    setComments(prev => [message.data, ...prev]);
  });

  channel.subscribe('comment:updated', (message) => {
    setComments(prev => prev.map(c => 
      c.id === message.data.id ? { ...c, ...message.data } : c
    ));
  });

  return () => {
    channel.unsubscribe();
    channel.detach();
  };
}, [proposalId]);
```

**Backend: Publish to Ably**

```typescript
// In comments.ts handler, after creating a comment:
if (process.env.ABLY_API_KEY) {
  const ably = new Ably.Rest(process.env.ABLY_API_KEY);
  const channel = ably.channels.get(`proposal-${proposalId}-comments`);
  await channel.publish('comment:created', comment);
}
```

**Pros:**
- True real-time (sub-second updates)
- Connection recovery built-in
- Scales to many concurrent users

**Cons:**
- Requires Ably account (free tier available)
- Additional service dependency

**Recommendation:** Start with **polling** (Option A) for MVP. Add Ably (Option B) in Phase 2 when real-time requirements are validated.

---

## 5. File Attachment Flow

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FILE ATTACHMENT FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. User selects file in CommentInput.tsx                                    │
│                                                                              │
│  2. Request presigned upload URL from existing r2-presign API               │
│     POST /api/r2-presign                                                     │
│     Body: { fileName, fileType, proposalId, folder: 'comments' }            │
│                                                                              │
│  3. Receive response: { uploadUrl, key }                                     │
│                                                                              │
│  4. Upload file directly to R2 (bypasses Netlify limits)                    │
│     PUT {uploadUrl}                                                          │
│     Headers: { 'Content-Type': fileType }                                    │
│     Body: (file binary data)                                                 │
│                                                                              │
│  5. On success, add attachment metadata to comment payload                  │
│     attachments: [{                                                           │
│       key: "projects/{proposalId}/comments/{timestamp}-{fileName}",         │
│       fileName,                                                               │
│       fileType,                                                               │
│       fileSize                                                                │
│     }]                                                                        │
│                                                                              │
│  6. Submit comment with attachments array                                    │
│     POST /api/comments                                                       │
│     Body: { proposalId, content, attachments }                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implementation Details

**Frontend: CommentInput.tsx with file upload**

```typescript
import { uploadFile } from '../services/storage';

interface CommentInputProps {
  proposalId: string;
  parentId?: string;
  onCommentAdded?: () => void;
}

export function CommentInput({ proposalId, parentId, onCommentAdded }: CommentInputProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    try {
      // Get presigned URL and upload directly to R2
      const result = await uploadFile(file, {
        folder: 'comments',
        customPrefix: `projects/${proposalId}/comments/${Date.now()}-${file.name}`
      });
      
      setAttachments(prev => [...prev, {
        key: result.key,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      }]);
    } catch (error) {
      console.error('Upload failed:', error);
      // Show error to user
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    
    await createComment({
      proposalId,
      parentId,
      content,
      attachments
    });
    
    setContent('');
    setAttachments([]);
    onCommentAdded?.();
  };

  return (
    <div className="comment-input">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a comment..."
      />
      
      {/* File attachments list */}
      {attachments.length > 0 && (
        <div className="attachments">
          {attachments.map((att, i) => (
            <div key={i} className="attachment">
              <span>{att.fileName}</span>
              <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* File upload button */}
      <input type="file" onChange={(e) => {
        if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
      }} />
      
      <button onClick={handleSubmit} disabled={isUploading}>
        {isUploading ? 'Uploading...' : 'Post Comment'}
      </button>
    </div>
  );
}
```

**Existing Storage Service Integration**

The project already has a storage service at `/services/storage.ts` that handles R2 uploads. The comment system should reuse this:

```typescript
// Reuse existing uploadFile from storage.ts
import { uploadFile } from '../services/storage';

async function uploadToR2(file: File, folder: string) {
  const result = await uploadFile(file, {
    folder: folder || 'misc',
    projectId: undefined // Comments are proposal-scoped
  });
  return result;
}
```

---

## 6. Notification Integration

### Notification Types

Add to existing `NotificationType` in `NotificationContext.tsx`:

```typescript
export type NotificationType = 
  | 'task_assigned'
  | 'task_status_changed'
  | 'comment_mention'      // NEW: User was mentioned in a comment
  | 'comment_added'        // NEW: New comment on proposal
  | 'file_uploaded'
  | 'approval_request'
  | 'revision_requested'
  | 'payment_received'
  | 'team_member_added'
  | 'project_status_changed';
```

### Notification Creation Logic

In `comments.ts`, after creating a comment:

```typescript
async function createCommentNotifications(
  proposalId: string,
  parentId: string | null,
  comment: any,
  proposal: any,
  author: any
) {
  // 1. Notify author of parent comment (if this is a reply)
  if (parentId) {
    const parentComment = await query(
      `SELECT author_id, content FROM comments WHERE id = $1`,
      [parentId]
    );
    
    if (parentComment.rows[0]?.author_id !== author.id) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, action_url, actor_id, actor_name, project_id)
         VALUES ($1, 'comment_added', 'New reply to your comment', $2, $3, $4, $5, $6)`,
        [
          parentComment.rows[0].author_id,
          `${author.fullName} replied to your comment`,
          `/admin/proposals/${proposalId}#comment-${comment.id}`,
          author.id,
          author.fullName,
          proposalId
        ]
      );
    }
  }
  
  // 2. Check for @mentions in content
  const mentions = extractMentions(comment.content); // e.g., @username
  for (const username of mentions) {
    const userResult = await query(
      `SELECT id FROM users WHERE full_name ILIKE $1 OR email ILIKE $1`,
      [`%${username}%`]
    );
    
    if (userResult.rows[0]?.id && userResult.rows[0].id !== author.id) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, action_url, actor_id, actor_name, project_id)
         VALUES ($1, 'comment_mention', 'You were mentioned', $2, $3, $4, $5, $6)`,
        [
          userResult.rows[0].id,
          `${author.fullName} mentioned you in a comment`,
          `/admin/proposals/${proposalId}#comment-${comment.id}`,
          author.id,
          author.fullName,
          proposalId
        ]
      );
    }
  }
}
```

### Email Notifications (Optional)

For important comments (e.g., client feedback on proposal), send email:

```typescript
// In comments.ts
if (shouldSendEmail) {
  await sendEmail({
    to: proposal.contact_email,
    subject: `New comment on proposal ${proposalId}`,
    html: `<p>${author.fullName} commented on your proposal...</p>`
  });
}
```

---

## 7. Integration Points with Existing System

### Vite Admin SPA Integration

**File:** `/pages/admin/ProposalDetail.tsx`

Add comment section below existing proposal content:

```typescript
// Existing imports...
import { CommentThread } from '../../components/comments/CommentThread';
import { useAuthContext } from '../../contexts/AuthContext';

// In ProposalDetail component render:
{
  /* ... existing proposal content ... */
}

/* NEW: Comment Thread Section */
<div className="mt-8 bg-white rounded-xl p-6 ring-1 ring-gray-200 shadow-sm">
  <h2 className="text-lg font-semibold text-gray-900 mb-4">Comments</h2>
  <CommentThread proposalId={proposalId} />
</div>
```

### Next.js Client Portal Integration

**File:** `landing-page-new/src/app/proposal/[proposalId]/page.tsx`

Add comment section for client view:

```typescript
import { CommentThread } from '@/components/comments/CommentThread';

// Add after ProposalReview component:
<CommentThread proposalId={proposalId} />
```

### Reuse Existing Components

Create shared components that work in both apps:

```
/components/comments/
├── CommentThread.tsx     # Main container, fetches and displays comments
├── CommentItem.tsx       # Individual comment with reply toggle
├── CommentInput.tsx      # New comment form with file upload
└── CommentList.tsx       # Comment list with nesting
```

**Path Strategy:**
- For Vite SPA: `/components/comments/CommentThread.tsx`
- For Next.js: Either copy to `landing-page-new/src/components/comments/` or configure Next.js to resolve from parent

---

## 8. Build Order and Dependencies

### Phase 1: Foundation (MVP)
**Goal:** Comments appear on proposal pages with manual refresh

| Step | Task | Dependencies | Duration Estimate |
|------|------|--------------|-------------------|
| 1 | Database migration | None | 1 hour |
| 2 | Netlify Function (comments.ts) | DB migration | 4 hours |
| 3 | Frontend API client | Backend API | 2 hours |
| 4 | CommentThread component (read-only) | API client | 4 hours |
| 5 | CommentInput component (no files) | API client | 3 hours |
| 6 | Integration in ProposalDetail.tsx | Components | 2 hours |
| 7 | Integration in Next.js proposal page | Components | 2 hours |
| 8 | Notification integration | Comments API | 2 hours |

**Total Phase 1:** ~18-20 hours

### Phase 2: File Attachments
**Goal:** Users can attach files to comments

| Step | Task | Dependencies | Duration Estimate |
|------|------|--------------|-------------------|
| 1 | File upload UI in CommentInput | Phase 1 complete | 4 hours |
| 2 | Attachment display in CommentItem | File upload | 2 hours |
| 3 | File download via R2 presign | Existing R2 | 3 hours |
| 4 | File type validation & limits | Upload UI | 1 hour |

**Total Phase 2:** ~10 hours

### Phase 3: Real-Time (Optional)
**Goal:** Comments appear instantly without refresh

| Step | Task | Dependencies | Duration Estimate |
|------|------|--------------|-------------------|
| 1 | Ably account setup | None | 1 hour |
| 2 | Backend: Ably publish on new comment | Ably account | 2 hours |
| 3 | Frontend: Ably subscription | Backend | 4 hours |
| 4 | Connection recovery & reconnection | Ably | 2 hours |

**Total Phase 3:** ~9 hours

---

## 9. Scalability Considerations

| Scale | Strategy | Implementation |
|-------|----------|----------------|
| **10 comments** | Simple query | `SELECT * FROM comments WHERE proposal_id = $1` |
| **100 comments** | Pagination | `LIMIT 50 OFFSET 0` with "Load More" |
| **1000+ comments** | Virtualized list | Use `react-window` for efficient rendering |
| **Deep nesting** | Lazy load replies | Fetch child comments when expanding parent |
| **High traffic** | Add Ably | Offload real-time to dedicated service |
| **File heavy** | R2 lifecycle | Configure R2 auto-expiration for temp files |

---

## 10. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| **Unauthorized access** | Verify user has access to proposal before allowing comment |
| **File injection** | Validate file types; use presigned URLs with short expiry |
| **Spam** | Rate limiting per user; consider captcha for anonymous |
| **XSS in comments** | Sanitize markdown before rendering; use `DOMPurify` |
| **Large payloads** | Limit comment length (2000 chars); limit attachments (5 per comment) |

### Rate Limiting (Add to comments.ts)

```typescript
import { rateLimit } from './_shared/rateLimit';

// Apply to POST endpoint
const rateLimitedHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 comments per minute per user
  message: { error: 'Too many comments, please wait' }
})(handler);
```

---

## 11. Anti-Patterns to Avoid

### Anti-Pattern 1: Hard Deleting Comments
**Problem:** Removing a parent comment orphans all children; breaks thread navigation.
**Solution:** Use `is_deleted` flag; UI shows "[deleted]" placeholder.

### Anti-Pattern 2: Loading All Comments at Once
**Problem:** Large threads freeze the UI.
**Solution:** Use pagination or virtual scrolling; load replies on demand.

### Anti-Pattern 3: Storing Files in Database
**Problem:** Bloats database; performance issues.
**Solution:** Store only R2 keys in `attachments` JSONB; files go to R2.

### Anti-Pattern 4: Circular Dependencies
**Problem:** Comment A replies to B, B replies to A.
**Solution:** Add database trigger to prevent; validate on frontend.

### Anti-Pattern 5: Direct File Proxy Through Netlify
**Problem:** Netlify Functions have payload limits (10MB); timeouts.
**Solution:** Always use presigned URLs for direct-to-R2 uploads.

---

## 12. Monitoring and Observability

### Key Metrics to Track

| Metric | Where | Purpose |
|--------|-------|---------|
| `comments_created_total` | Backend (comments.ts) | Usage analytics |
| `comment_creation_duration_ms` | Backend | Performance monitoring |
| `comment_api_errors` | Backend | Error tracking |
| `comment_attachment_size_bytes` | Backend | Storage monitoring |
| `comment_polling_frequency` | Frontend | Real-time effectiveness |

### Logging (Add to comments.ts)

```typescript
// Log comment creation
console.log('[COMMENTS] Created:', {
  commentId: comment.id,
  proposalId,
  parentId,
  authorId: user.id,
  hasAttachments: attachments.length > 0,
  timestamp: new Date().toISOString()
});

// Log errors with context
console.error('[COMMENTS] Error creating comment:', {
  error: error.message,
  proposalId,
  userId: user.id,
  timestamp: new Date().toISOString()
});
```

---

## 13. Testing Strategy

### Backend Tests (comments.ts)

```typescript
// Test in netlify/functions/__tests__/comments.test.ts
describe('comments API', () => {
  it('creates a comment', async () => {
    const response = await handler({
      httpMethod: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: JSON.stringify({
        proposalId: 'valid-proposal-id',
        content: 'Test comment'
      }),
      queryStringParameters: null
    });
    
    expect(response.statusCode).toBe(201);
  });
  
  it('rejects unauthorized users', async () => {
    const response = await handler({
      httpMethod: 'GET',
      headers: {},
      body: null,
      queryStringParameters: { proposalId: 'proposal-id' }
    });
    
    expect(response.statusCode).toBe(401);
  });
});
```

### Frontend Tests (CommentThread.tsx)

```typescript
// Test in components/comments/__tests__/CommentThread.test.tsx
describe('CommentThread', () => {
  it('displays comments', async () => {
    render(<CommentThread proposalId="proposal-id" />);
    
    await waitFor(() => {
      expect(screen.getByText('Test comment')).toBeInTheDocument();
    });
  });
  
  it('creates new comment', async () => {
    render(<CommentInput proposalId="proposal-id" />);
    
    fireEvent.change(screen.getByPlaceholderText('Write a comment...'), {
      target: { value: 'New comment' }
    });
    fireEvent.click(screen.getByText('Post Comment'));
    
    await waitFor(() => {
      expect(screen.getByText('New comment')).toBeInTheDocument();
    });
  });
});
```

---

## 14. Rollout Strategy

### Step 1: Database Migration
```bash
# Apply migration to production
psql $DATABASE_URL -f database/migrations/001-create-comments-table.sql
```

### Step 2: Deploy Backend
```bash
# Deploy Netlify Functions
netlify deploy --functions netlify/functions/comments.ts
```

### Step 3: Deploy Frontend (Vite)
```bash
# Build and deploy admin portal
cd pages && npm run build
netlify deploy --dir=dist
```

### Step 4: Deploy Frontend (Next.js)
```bash
# Deploy client portal
cd landing-page-new && npm run build
netlify deploy --dir=.next
```

### Step 5: Feature Flag
- Deploy with comments hidden behind feature flag
- Enable for internal users first
- Roll out to clients gradually

---

## Sources

1. **Existing Motionify Infrastructure**
   - `/netlify/functions/_shared/db.ts` - Database pooling pattern
   - `/netlify/functions/r2-presign.ts` - R2 presigned URL generation
   - `/contexts/NotificationContext.tsx` - Notification system
   - `/database/schema.sql` - Existing table structures

2. **Real-Time Patterns for Serverless**
   - Ably + Neon integration patterns (2026)
   - Netlify Async Workloads for event-driven architecture
   - Supabase Realtime for PostgreSQL CDC

3. **Comment System Best Practices**
   - Soft delete for thread preservation
   - Adjacency list with computed depth
   - Direct-to-storage file uploads
   - Optimistic UI updates

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Database Schema | HIGH | PostgreSQL patterns well-understood; adjacency list proven |
| API Structure | HIGH | Follows existing Netlify Function patterns |
| Real-Time Strategy | MEDIUM | Polling is proven; Ably integration needs validation |
| File Attachments | HIGH | Existing R2 infrastructure fully supports this |
| Notification Integration | HIGH | Existing NotificationContext designed for this |
| Frontend Integration | MEDIUM | Both apps can render shared components |
| Scalability | MEDIUM | Patterns defined, need load testing at scale |
