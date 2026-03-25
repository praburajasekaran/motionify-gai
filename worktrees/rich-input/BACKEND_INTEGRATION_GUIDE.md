# Backend Integration Guide: Draft Comments Persistence

## Problem Statement
Currently, comments added by team members are stored in browser memory (React Context) only. When different users add comments on different devices, they cannot see each other's comments because there is no backend synchronization.

## Solution: Add Draft Comments Persistence

When integrating your backend, you need to ensure that **draft comments** (comments that haven't been submitted as part of a revision request) are persisted to the database and loaded for all users viewing the same deliverable.

---

## Backend Data Model

### Database Schema: `draft_comments` Table

```sql
CREATE TABLE draft_comments (
  id VARCHAR(255) PRIMARY KEY,
  deliverable_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  timestamp_seconds INT NOT NULL,  -- Video timestamp in seconds
  comment TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (deliverable_id) REFERENCES deliverables(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  INDEX idx_deliverable (deliverable_id),
  INDEX idx_user (user_id)
);
```

**Key Points:**
- Draft comments are tied to a specific deliverable
- When a revision request is submitted, these draft comments are bundled into the `approval_history` and then deleted
- Users can only delete their own comments (unless they're the Primary Contact)

---

## API Endpoints Required

### 1. **GET /api/deliverables/:deliverableId/draft-comments**
Load all draft comments for a deliverable.

**Response:**
```json
{
  "comments": [
    {
      "id": "comment-123",
      "timestamp": 32,
      "comment": "The logo transition feels too fast here",
      "resolved": false,
      "userId": "user-456",
      "userName": "John Doe",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 2. **POST /api/deliverables/:deliverableId/draft-comments**
Add a new draft comment.

**Request Body:**
```json
{
  "timestamp": 32,
  "comment": "The logo transition feels too fast here"
}
```

**Response:**
```json
{
  "comment": {
    "id": "comment-123",
    "timestamp": 32,
    "comment": "The logo transition feels too fast here",
    "resolved": false,
    "userId": "user-456",
    "userName": "John Doe",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### 3. **PUT /api/deliverables/:deliverableId/draft-comments/:commentId**
Update an existing draft comment (user can only update their own).

**Request Body:**
```json
{
  "comment": "Updated comment text"
}
```

### 4. **DELETE /api/deliverables/:deliverableId/draft-comments/:commentId**
Delete a draft comment (user can only delete their own, unless Primary Contact).

---

## Frontend Code Changes

### File 1: Create API Service (`services/draftComments.ts`)

```typescript
import { TimestampedComment } from '@/types/deliverable.types';

// Replace with your actual API client
import { apiClient } from './api';

export const draftCommentsAPI = {
  /**
   * Load all draft comments for a deliverable
   */
  async loadComments(deliverableId: string): Promise<TimestampedComment[]> {
    const response = await apiClient.get(
      `/deliverables/${deliverableId}/draft-comments`
    );
    return response.data.comments.map((c: any) => ({
      ...c,
      createdAt: new Date(c.createdAt),
    }));
  },

  /**
   * Add a new draft comment
   */
  async addComment(
    deliverableId: string,
    timestamp: number,
    comment: string
  ): Promise<TimestampedComment> {
    const response = await apiClient.post(
      `/deliverables/${deliverableId}/draft-comments`,
      { timestamp, comment }
    );
    return {
      ...response.data.comment,
      createdAt: new Date(response.data.comment.createdAt),
    };
  },

  /**
   * Update an existing draft comment
   */
  async updateComment(
    deliverableId: string,
    commentId: string,
    comment: string
  ): Promise<void> {
    await apiClient.put(
      `/deliverables/${deliverableId}/draft-comments/${commentId}`,
      { comment }
    );
  },

  /**
   * Delete a draft comment
   */
  async deleteComment(
    deliverableId: string,
    commentId: string
  ): Promise<void> {
    await apiClient.delete(
      `/deliverables/${deliverableId}/draft-comments/${commentId}`
    );
  },
};
```

### File 2: Update `DeliverableContext.tsx`

**Add new action type for loading draft comments:**

```typescript
// Add to DeliverableAction union type (around line 69):
| { type: 'LOAD_DRAFT_COMMENTS'; comments: TimestampedComment[] }
```

**Add reducer case:**

```typescript
case 'LOAD_DRAFT_COMMENTS':
  return {
    ...state,
    revisionFeedback: {
      ...state.revisionFeedback,
      timestampedComments: action.comments,
    },
  };
```

### File 3: Update `DeliverableReview.tsx`

**Add effect to load draft comments when deliverable loads:**

```typescript
// Add this useEffect after the LOAD_DELIVERABLE_BY_ID effect (around line 53):
useEffect(() => {
  async function loadDraftComments() {
    if (!deliverableId) return;

    try {
      const comments = await draftCommentsAPI.loadComments(deliverableId);
      dispatch({ type: 'LOAD_DRAFT_COMMENTS', comments });
    } catch (error) {
      console.error('Failed to load draft comments:', error);
    }
  }

  loadDraftComments();
}, [deliverableId, dispatch]);
```

**Update handleAddComment to save to backend:**

```typescript
const handleAddComment = async (timestamp: number, comment: string) => {
  if (!currentUser || !deliverable) return;

  try {
    // Save to backend first
    const newComment = await draftCommentsAPI.addComment(
      deliverable.id,
      timestamp,
      comment
    );

    // Then update local state with the server response
    dispatch({
      type: 'ADD_TIMESTAMP_COMMENT',
      timestamp: newComment.timestamp,
      comment: newComment.comment,
      userId: newComment.userId,
      userName: newComment.userName,
    });
  } catch (error) {
    console.error('Failed to add comment:', error);
    alert('Failed to add comment. Please try again.');
  }
};
```

**Update handleUpdateComment to save to backend:**

```typescript
const handleUpdateComment = async (commentId: string, newText: string) => {
  if (!deliverable) return;

  try {
    // Save to backend first
    await draftCommentsAPI.updateComment(deliverable.id, commentId, newText);

    // Then update local state
    dispatch({
      type: 'UPDATE_TIMESTAMP_COMMENT',
      commentId,
      newText,
    });
  } catch (error) {
    console.error('Failed to update comment:', error);
    alert('Failed to update comment. Please try again.');
  }
};
```

**Update handleRemoveComment to delete from backend:**

```typescript
const handleRemoveComment = async (commentId: string) => {
  if (!currentUser || !deliverable) return;

  const isPrimaryContact =
    currentUser.projectTeamMemberships?.[currentProject.id]?.isPrimaryContact || false;

  try {
    // Delete from backend first
    await draftCommentsAPI.deleteComment(deliverable.id, commentId);

    // Then update local state
    dispatch({
      type: 'DELETE_COMMENT_BY_ID',
      commentId,
      userId: currentUser.id,
      isPrimaryContact,
    });
  } catch (error) {
    console.error('Failed to delete comment:', error);
    alert('Failed to delete comment. Please try again.');
  }
};
```

---

## Important: Clear Draft Comments After Submission

When the Primary Contact submits a revision request (clicks "Request Revision"), the draft comments should be:
1. Bundled into the `DeliverableApproval` record (already happening in the frontend)
2. Deleted from the `draft_comments` table (backend only)

**Backend logic for revision request submission:**

```python
# Pseudo-code for backend
def submit_revision_request(deliverable_id, approval_data):
    # 1. Get all draft comments
    draft_comments = db.query(DraftComment).filter_by(
        deliverable_id=deliverable_id
    ).all()

    # 2. Create approval record with bundled comments
    approval = DeliverableApproval(
        deliverable_id=deliverable_id,
        action='rejected',
        feedback=approval_data['feedback'],
        timestamped_comments=draft_comments,  # Bundle draft comments
        # ... other fields
    )
    db.add(approval)

    # 3. Delete draft comments (they're now part of approval history)
    db.query(DraftComment).filter_by(
        deliverable_id=deliverable_id
    ).delete()

    db.commit()
```

---

## Testing Checklist

Once backend integration is complete, test these scenarios:

### ✅ Scenario 1: Multi-User Collaboration
1. User A (Team Member) logs in and adds 3 comments on deliverable
2. User B (Primary Contact) logs in on a different device
3. **EXPECTED:** User B sees all 3 of User A's comments
4. User B adds 2 more comments
5. User A refreshes their page
6. **EXPECTED:** User A sees all 5 comments (3 theirs + 2 from User B)

### ✅ Scenario 2: Comment Persistence
1. Add comments to a deliverable
2. Close the browser completely
3. Reopen and navigate to the same deliverable
4. **EXPECTED:** All comments are still visible

### ✅ Scenario 3: Submission Clears Drafts
1. Add 5 draft comments to a deliverable
2. Primary Contact submits revision request
3. Navigate back to the deliverable
4. **EXPECTED:** The draft comments are gone (they're now in approval history)
5. Check approval history
6. **EXPECTED:** All 5 comments appear in the revision request record

### ✅ Scenario 4: Permission Enforcement
1. User A adds a comment
2. User B tries to delete User A's comment
3. **EXPECTED:** Backend returns 403 Forbidden (unless User B is Primary Contact)

---

## Summary

**Before Backend Integration:**
- Comments stored in browser memory only
- Users on different devices can't see each other's comments
- Comments lost on page refresh

**After Backend Integration:**
- Comments saved to database immediately when added
- All users see all team members' comments in real-time
- Comments persist across sessions
- Comments are bundled into revision request and cleared when submitted

**Files to Modify:**
1. Create `services/draftComments.ts` - API client
2. Update `components/deliverables/DeliverableContext.tsx` - Add LOAD_DRAFT_COMMENTS action
3. Update `pages/DeliverableReview.tsx` - Add backend calls to comment handlers

**Backend Requirements:**
1. Create `draft_comments` table
2. Implement 4 API endpoints (GET, POST, PUT, DELETE)
3. Add logic to bundle draft comments into approval records on submission
4. Add logic to clear draft comments after successful submission
