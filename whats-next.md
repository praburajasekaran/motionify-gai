# What's Next: Deliverable Comments Feature - Handoff Document

## Original Task

<original_task>
**Primary Issue**: Client Team Members cannot add comments on deliverables with "waiting for approval" status. Only the Client Primary Contact sees the commenting interface when viewing deliverable del-002 at http://localhost:5173#/projects/5823632/deliverables/del-002.

**Root Cause**: The `DeliverableVideoSection.tsx` component was using the `canRequestRevision` permission (which requires `isPrimaryContact === true`) to determine whether to show the interactive commenting UI (`VideoCommentTimeline`) vs view-only mode (`VideoPlayer`).

**User Decision**: Client Team Members should be able to add timestamped comments collaboratively for feedback, but only the Primary Contact can approve/reject deliverables or submit formal revision requests.

**Follow-up Task**: After implementing the frontend fix, the user discovered comments don't persist across sessions/devices because they're stored in browser memory only. They requested backend integration documentation be added to the existing feature docs in `features/pending/feedback-and-revisions/` instead of a standalone guide.
</original_task>

## Work Completed

<work_completed>

### Phase 1: Frontend Permission Fix (COMPLETED)

**Investigation:**
- Launched Explore agent to investigate permission logic and commenting UI
- Identified the root cause in `DeliverableVideoSection.tsx:45` where `canRequestRevision` prop gates the commenting interface
- Discovered that `canCommentOnDeliverable()` function already exists in `utils/deliverablePermissions.ts:328-334` and allows all viewers to comment
- Confirmed that `useDeliverablePermissions.ts:87` already exposes `canComment` property
- Verified the permission system was working correctly, just using the wrong permission check

**Files Modified:**

1. **`components/deliverables/DeliverableVideoSection.tsx`**:
   - Line 19-27: Added `canComment: boolean` prop to `DeliverableVideoSectionProps` interface
   - Line 29-37: Added `canComment` to destructured props in component function
   - Line 47: Changed conditional from `canRequestRevision ? (` to `canComment ? (`
   - Line 48: Updated comment from "users who can request revisions" to "users with comment permissions"
   - Line 58: Updated comment from "without revision permissions" to "without comment permissions"

2. **`pages/DeliverableReview.tsx`**:
   - Line 225: Added `canComment={permissions.canComment}` prop to `DeliverableVideoSection` component call
   - Kept existing `canRequestRevision={permissions.canReject}` for backward compatibility

3. **`components/deliverables/DeliverableMetadataSidebar.tsx`**:
   - Lines 164-165: Changed "View Only" heading to "Team Member View"
   - Updated message from "Only the Primary Contact can approve or request revisions" to "You can add timeline comments. Only the Primary Contact can approve or submit revision requests."

**Testing:**
- Frontend changes tested and confirmed working
- Client Team Members can now see and use the `VideoCommentTimeline` component
- Primary Contact retains exclusive access to "Approve" and "Request Revision" buttons

### Phase 2: Backend Integration Research (COMPLETED)

**Problem Identified:**
- Comments are stored in `DeliverableContext` state (`revisionFeedback.timestampedComments`) which is browser memory only
- `initialState.revisionFeedback.timestampedComments` starts as empty array (`[]`)
- `LOAD_DELIVERABLE_BY_ID` action (line 196-202) loads deliverable but NOT draft comments
- When different users add comments from different devices, they cannot see each other's comments
- Comments are lost on page refresh

**Documentation Created:**
- Created `BACKEND_INTEGRATION_GUIDE.md` with comprehensive backend integration requirements:
  - Database schema for `draft_comments` table
  - 4 API endpoints (GET, POST, PUT, DELETE)
  - Frontend code changes needed in `DeliverableContext.tsx` and `DeliverableReview.tsx`
  - Explanation of comment lifecycle (draft → bundled into revision request → deleted)
  - Testing scenarios for multi-user collaboration

**User Feedback:**
- User requested integration into existing feature documentation instead of standalone guide
- Preferred location: `features/pending/feedback-and-revisions/` directory

### Phase 3: Documentation Plan Created (APPROVED, NOT IMPLEMENTED)

**Plan Created**: `/Users/praburajasekaran/.claude/plans/sprightly-munching-anchor.md`

**Files to Update:**
1. `features/pending/feedback-and-revisions/03-data-models.md` - Add `DeliverableComment` model after line 104
2. `features/pending/feedback-and-revisions/04-database-schema.sql` - Add `deliverable_comments` table after line 120
3. `features/pending/feedback-and-revisions/05-api-endpoints.md` - Add 4 draft comment endpoints after line 195

**Content Defined:**
- TypeScript interface for `DeliverableComment` with fields: id, deliverableId, projectId, timestamp, comment, authorId, authorName, resolved, createdAt, updatedAt
- SQL schema with proper indexes, constraints, and update triggers
- API endpoints: GET/POST/PATCH/DELETE for draft comments
- Permission matrix showing Team Member, Primary Contact, and Motionify Team capabilities
- Lifecycle diagram showing draft comments → bundled → deleted flow
- Distinction from file comments (temporary vs permanent, deliverable-specific vs general)

**Key Design Decisions:**
- Draft comments are temporary (deleted after bundling into revision request)
- Used for collaborative pre-submission feedback
- Only visible for deliverables in `awaiting_approval` status
- Comments bundled into `DeliverableApproval.timestampedComments[]` when Primary Contact submits revision
- Rate limiting: Max 20 comments per deliverable per user

</work_completed>

## Work Remaining

<work_remaining>

### Task: Update Feature Documentation Files

The next step is to implement the documentation updates planned in Phase 3. All three files need to be modified to add draft deliverable comments documentation.

#### File 1: `features/pending/feedback-and-revisions/03-data-models.md`

**Location to insert**: After line 104 (after the `FileComment Model` section, before relationships section)

**Sections to add**:

1. New section header: `## DeliverableComment Model`

2. Introductory paragraph explaining draft comments:
   - These are temporary comments added before revision request submission
   - Used for collaborative feedback between team members
   - Automatically deleted after bundling into revision request
   - Distinct from file comments (deliverable-specific, ephemeral)

3. TypeScript interface:
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

4. Lifecycle explanation:
   - Draft phase: Comments stored in `deliverable_comments` table
   - Bundling phase: Primary Contact submits revision request
   - Archive phase: Comments moved to `approval_history.timestamped_comments`
   - Cleanup phase: Draft comments deleted from table

5. Example data section with sample `DeliverableComment` object

6. Update Table of Contents at top of file to include new section

7. Update Relationships section to show `DeliverableComment` → `User` and `DeliverableComment` → `Deliverable` relationships

#### File 2: `features/pending/feedback-and-revisions/04-database-schema.sql`

**Location to insert**: After line 120 (after the `FILE_COMMENTS TABLE` section, before `COMMENT_MENTIONS TABLE`)

**Content to add**:

1. SQL comment header block:
```sql
-- ============================================================================
-- DELIVERABLE_COMMENTS TABLE
-- ============================================================================
-- Stores draft comments on deliverables for collaborative feedback
-- LIFECYCLE: Comments are temporary - deleted after bundling into revision request
-- SCOPE: Only for deliverables in awaiting_approval status
```

2. Table creation:
```sql
CREATE TABLE IF NOT EXISTS deliverable_comments (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Content
  timestamp_seconds INTEGER NOT NULL CHECK (timestamp_seconds >= 0),
  comment TEXT NOT NULL CHECK (char_length(comment) >= 1 AND char_length(comment) <= 5000),

  -- Author
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  author_name VARCHAR(255) NOT NULL,  -- Cached from users table

  -- Status
  resolved BOOLEAN DEFAULT FALSE,

  -- Lifecycle
  is_draft BOOLEAN DEFAULT TRUE  -- False after bundling into revision request
);
```

3. Indexes:
```sql
-- Indexes for performance
CREATE INDEX idx_deliverable_comments_deliverable_id ON deliverable_comments(deliverable_id);
CREATE INDEX idx_deliverable_comments_project_id ON deliverable_comments(project_id);
CREATE INDEX idx_deliverable_comments_author_id ON deliverable_comments(author_id);
CREATE INDEX idx_deliverable_comments_created_at ON deliverable_comments(created_at DESC);
CREATE INDEX idx_deliverable_comments_draft ON deliverable_comments(is_draft) WHERE is_draft = TRUE;
```

4. Update trigger function:
```sql
-- Trigger for deliverable_comments updated_at
CREATE OR REPLACE FUNCTION update_deliverable_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deliverable_comments_updated_at
  BEFORE UPDATE ON deliverable_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_deliverable_comments_updated_at();
```

5. Table and column comments:
```sql
COMMENT ON TABLE deliverable_comments IS 'Draft comments on deliverables for collaborative feedback. Temporary - deleted after bundling into revision requests.';
COMMENT ON COLUMN deliverable_comments.timestamp_seconds IS 'Video timestamp in seconds where comment applies';
COMMENT ON COLUMN deliverable_comments.is_draft IS 'True until bundled into revision request, then deleted';
COMMENT ON COLUMN deliverable_comments.author_id IS 'SET NULL on user delete to preserve comment history';
```

#### File 3: `features/pending/feedback-and-revisions/05-api-endpoints.md`

**Location to insert**: After line 195 (after `File Comments` section, before `Revision Requests` section)

**Content to add**:

1. Update Table of Contents (lines 17-23):
   - Add new item: `3. [Deliverable Draft Comments](#deliverable-draft-comments) - 4 endpoints`
   - Renumber existing items (Revision Requests becomes #4, etc.)

2. New section header and introduction:
```markdown
---

## Deliverable Draft Comments

**Purpose**: Collaborative timestamped feedback on video deliverables before formal revision submission.

**Lifecycle**: Draft comments are temporary. When a Primary Contact submits a revision request, all draft comments are automatically:
1. Bundled into the `DeliverableApproval.timestampedComments[]` array
2. Deleted from the `deliverable_comments` table
3. Preserved in approval history for audit trail

**Permissions**:
- Any project member with view access can add/view draft comments
- Only comment author can edit their own comments
- Comment author OR Primary Contact can delete comments (moderation)
- Primary Contact bundles and submits all comments with revision request
```

3. Four API endpoints:

**Endpoint 1: GET /api/deliverables/:deliverableId/draft-comments**
```markdown
### 9. Get Deliverable Draft Comments

\`\`\`
GET /api/deliverables/:deliverableId/draft-comments
\`\`\`

**Auth:** Required (project member)

**Query Parameters:**
- None

**Response (200 OK):**
\`\`\`json
{
  "comments": [
    {
      "id": "uuid",
      "timestamp": 32,
      "comment": "The logo transition feels too fast here",
      "authorId": "uuid",
      "authorName": "John Doe",
      "resolved": false,
      "createdAt": "2025-01-15T10:30:00Z"
    },
    {
      "id": "uuid",
      "timestamp": 75,
      "comment": "Audio levels seem low in this section",
      "authorId": "uuid",
      "authorName": "Jane Smith",
      "resolved": false,
      "createdAt": "2025-01-15T10:35:00Z"
    }
  ],
  "total": 2
}
\`\`\`

**Notes:**
- Comments sorted by timestamp ascending (chronological order)
- Only returns draft comments (is_draft = true)
- Used to load collaborative feedback when viewing deliverable
- Multiple team members' comments returned together
```

**Endpoint 2: POST /api/deliverables/:deliverableId/draft-comments**
```markdown
### 10. Create Draft Comment

\`\`\`
POST /api/deliverables/:deliverableId/draft-comments
\`\`\`

**Auth:** Required (project member with view permission on deliverable)

**Request Body:**
\`\`\`json
{
  "timestamp": 32,
  "comment": "The logo transition feels too fast here"
}
\`\`\`

**Validation:**
- `timestamp`: Required, integer >= 0 (seconds from video start)
- `comment`: Required, 1-5000 chars

**Pre-conditions:**
- User must have `canViewDeliverable` permission
- Rate limit: Max 20 comments per deliverable per user

**Response (201 Created):**
\`\`\`json
{
  "id": "uuid",
  "timestamp": 32,
  "comment": "The logo transition feels too fast here",
  "authorId": "uuid",
  "authorName": "John Doe",
  "resolved": false,
  "createdAt": "2025-01-15T10:30:00Z"
}
\`\`\`

**Business Logic:**
- Author ID and name populated from authenticated user
- `isDraft` automatically set to `true`
- `resolved` defaults to `false`
- Duplicate timestamps allowed (multiple users can comment at same point)
```

**Endpoint 3: PATCH /api/deliverables/:deliverableId/draft-comments/:commentId**
```markdown
### 11. Update Draft Comment

\`\`\`
PATCH /api/deliverables/:deliverableId/draft-comments/:commentId
\`\`\`

**Auth:** Required (comment author only)

**Request Body:**
\`\`\`json
{
  "comment": "Updated: The logo transition is definitely too fast, needs 0.5s more"
}
\`\`\`

**Validation:**
- `comment`: Required, 1-5000 chars

**Pre-conditions:**
- User must be the comment author (authorId === currentUser.id)
- Comment must still be draft (is_draft = true)

**Response (200 OK):**
\`\`\`json
{
  "id": "uuid",
  "comment": "Updated: The logo transition is definitely too fast, needs 0.5s more",
  "updatedAt": "2025-01-15T11:00:00Z"
}
\`\`\`

**Error Cases:**
- 403 Forbidden if user is not the comment author
- 409 Conflict if comment already bundled into revision request
```

**Endpoint 4: DELETE /api/deliverables/:deliverableId/draft-comments/:commentId**
```markdown
### 12. Delete Draft Comment

\`\`\`
DELETE /api/deliverables/:deliverableId/draft-comments/:commentId
\`\`\`

**Auth:** Required (comment author OR Primary Contact OR Motionify team)

**Permission Check:**
- Comment author can delete their own comments
- Primary Contact can delete any comment on their project (moderation)
- Motionify team can delete any comment (moderation)

**Response (200 OK):**
\`\`\`json
{
  "success": true,
  "message": "Comment deleted"
}
\`\`\`

**Error Cases:**
- 403 Forbidden if user lacks delete permission
- 404 Not Found if comment doesn't exist
```

4. Permission matrix table:
```markdown
### Permission Matrix

| Action | Team Member | Primary Contact | Motionify Team |
|--------|-------------|-----------------|----------------|
| View draft comments | ✅ (if can view deliverable) | ✅ | ✅ |
| Add draft comment | ✅ | ✅ | ✅ |
| Edit own comment | ✅ | ✅ | ✅ |
| Edit others' comments | ❌ | ❌ | ❌ |
| Delete own comment | ✅ | ✅ | ✅ |
| Delete others' comments | ❌ | ✅ (moderation) | ✅ (moderation) |
| Bundle & submit revision | ❌ | ✅ | ❌ |
```

5. Lifecycle documentation:
```markdown
### Draft Comment Lifecycle

When a Primary Contact submits a revision request via `POST /api/deliverables/:deliverableId/request-revision`:

**Backend Processing:**

1. **Load draft comments**:
   ```sql
   SELECT * FROM deliverable_comments
   WHERE deliverable_id = :deliverableId AND is_draft = true
   ORDER BY timestamp_seconds ASC;
   ```

2. **Bundle into approval record**:
   ```sql
   INSERT INTO deliverable_approvals (
     /* ... other fields ... */,
     timestamped_comments
   )
   VALUES (
     /* ... other values ... */,
     (SELECT json_agg(row_to_json(dc.*))
      FROM deliverable_comments dc
      WHERE dc.deliverable_id = :deliverableId AND dc.is_draft = true)
   );
   ```

3. **Delete draft comments**:
   ```sql
   DELETE FROM deliverable_comments
   WHERE deliverable_id = :deliverableId AND is_draft = true;
   ```

**Transaction Safety**: All three operations must complete in a single database transaction to ensure atomicity. If any step fails, the entire revision request should roll back.

**Audit Trail**: After deletion, draft comments are preserved permanently in the `deliverable_approvals.timestamped_comments` JSONB field for historical reference.
```

6. Update error responses section:
```markdown
### 409 Conflict (Deliverable Comments)
\`\`\`json
{
  "error": "Rate limit exceeded",
  "message": "Maximum 20 comments per deliverable reached. Delete some comments before adding more.",
  "currentCount": 20,
  "limit": 20
}
\`\`\`

### 409 Conflict (Already Bundled)
\`\`\`json
{
  "error": "Comment already submitted",
  "message": "This comment has been bundled into a revision request and cannot be modified."
}
\`\`\`
```

#### Additional Task: Delete Standalone Guide

**File to remove**: `/Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/BACKEND_INTEGRATION_GUIDE.md`

**Reason**: Content has been integrated into the three feature documentation files above.

#### Verification Checklist

After completing all updates:

1. **SQL Syntax Validation**:
   - Copy the `deliverable_comments` table SQL from 04-database-schema.sql
   - Validate using PostgreSQL syntax checker or online validator
   - Ensure no syntax errors or missing semicolons

2. **TypeScript Interface Consistency**:
   - Compare `DeliverableComment` interface fields (03-data-models.md)
   - Against SQL column names (04-database-schema.sql)
   - Against API response examples (05-api-endpoints.md)
   - Ensure snake_case (SQL) matches camelCase (TypeScript) appropriately

3. **Permission Rules Consistency**:
   - Verify permission matrix is identical in all three files
   - Check that API endpoint permission checks match the matrix
   - Confirm lifecycle explanation is consistent across all docs

4. **Documentation Completeness**:
   - Table of Contents updated in 03-data-models.md
   - Table of Contents updated in 05-api-endpoints.md
   - All endpoint numbers sequential in 05-api-endpoints.md
   - Lifecycle diagram present in all three files

5. **Examples Quality**:
   - Sample data uses realistic values
   - JSON examples are valid
   - SQL examples are executable
   - Error responses cover common cases

</work_remaining>

## Attempted Approaches

<attempted_approaches>

### Initial Standalone Documentation Approach (Replaced)

**What was tried:**
- Created standalone `BACKEND_INTEGRATION_GUIDE.md` file in project root
- Included comprehensive backend integration instructions:
  - Database schema for `draft_comments` table
  - API endpoints (GET, POST, PUT, DELETE)
  - Frontend service layer (`services/draftComments.ts`)
  - Context updates (`DeliverableContext.tsx`)
  - Page updates (`DeliverableReview.tsx`)
  - Testing scenarios

**Why it was abandoned:**
- User preferred integration into existing feature documentation structure
- Standalone guide would be harder to maintain alongside feature docs
- Existing `features/pending/feedback-and-revisions/` already has data models, schema, and API docs
- Better to have all related documentation in one place

**What was learned:**
- The project has a well-organized feature documentation structure
- Each feature has 9 standard docs: user journey, wireframes, data models, schema, API endpoints, email templates, test cases, README
- New functionality should be added to existing feature docs rather than creating new files

### Alternative Permission Check Approaches (Not Needed)

**Considered:**
- Creating a new `canCommentOnDeliverable()` function with custom logic
- Modifying the existing `canRequestRevisions()` function to have multiple modes

**Why not pursued:**
- Discovery that `canCommentOnDeliverable()` already exists in `utils/deliverablePermissions.ts:328-334`
- The function already has the correct logic (allows all viewers to comment)
- `useDeliverablePermissions` hook already exposes it as `canComment` property
- No new permission logic needed - just use the existing permission in the right place

**What was learned:**
- Always search for existing implementations before creating new ones
- The codebase already had the correct permission model, just wasn't being used correctly
- Simple solution: change which permission prop gates the UI component

</attempted_approaches>

## Critical Context

<critical_context>

### Frontend Architecture Understanding

**Permission System:**
- Permissions are centralized in `utils/deliverablePermissions.ts`
- Hook `useDeliverablePermissions` provides React components with permission checks
- Key permissions relevant to this feature:
  - `canComment`: Allows any user who can view the deliverable to comment
  - `canReject`: Allows only Primary Contact to request revisions/reject
  - `canApprove`: Allows only Primary Contact to approve
- Permission functions accept `(user, deliverable, project)` parameters
- `isClientPrimaryContact()` checks `user.projectTeamMemberships[projectId].isPrimaryContact`

**Component Architecture:**
- `DeliverableReview` page is the container component
- `DeliverableVideoSection` handles video player and commenting UI
- `DeliverableMetadataSidebar` shows status, actions, and informational messages
- Two different video components:
  - `VideoCommentTimeline`: Interactive, allows adding/editing comments
  - `VideoPlayer`: View-only, shows historical comments from approval history
- Choice between these components is now based on `canComment` permission

**State Management:**
- `DeliverableContext` provides centralized state via React Context
- State includes `revisionFeedback.timestampedComments` for draft comments
- Comments are currently stored only in browser memory (lost on refresh)
- `LOAD_DELIVERABLE_BY_ID` action loads deliverable but NOT draft comments
- When revision request submitted, comments bundled into `DeliverableApproval` record

### Backend Integration Requirements

**Why Draft Comments Need Persistence:**
1. **Multi-User Collaboration**: Team Members and Primary Contact on different devices need to see each other's comments
2. **Session Persistence**: Comments should survive page refreshes
3. **Audit Trail**: Comments bundled into approval history for record-keeping
4. **Real-Time Sync**: Multiple team members reviewing simultaneously need to see updates

**Draft Comment Lifecycle:**
```
1. Team member adds comment → Saved to deliverable_comments table
2. Other team members view deliverable → Load from deliverable_comments table
3. Primary Contact clicks "Request Revision" → Frontend bundles all comments
4. Backend receives revision request → Bundles comments into approval_history
5. Backend deletes from deliverable_comments → Draft comments cleared
6. Comments preserved in approval_history.timestamped_comments → Audit trail maintained
```

**Key Database Considerations:**
- Draft comments are temporary (CASCADE DELETE when deliverable deleted)
- Foreign key to deliverable ensures referential integrity
- Index on `deliverable_id` for fast loading
- Index on `is_draft` for efficient bundling queries
- `author_id` uses SET NULL on delete (preserve comment if user deleted)
- `timestamp_seconds` must be >= 0 (CHECK constraint)

**API Design Decisions:**
- GET returns sorted by timestamp (chronological order for video playback)
- POST validates user has view permission (can't comment on hidden deliverables)
- PATCH restricted to author only (can't edit others' comments)
- DELETE allows Primary Contact override (moderation capability)
- Rate limiting prevents spam (20 comments per deliverable per user)

### Documentation Structure Pattern

**Existing Feature Documentation Pattern (`features/pending/feedback-and-revisions/`):**
1. `01-user-journey.md` - User flows and scenarios
2. `02-wireframes.md` - UI mockups and layouts
3. `03-data-models.md` - TypeScript interfaces
4. `04-database-schema.sql` - PostgreSQL schema
5. `05-api-endpoints.md` - REST API specifications
6. `06-email-templates.md` - Notification templates
7. `07-test-cases.md` - Test scenarios
8. `README.md` - Feature overview

**Current Coverage:**
- Task comments (for task discussions)
- File comments (for file feedback)
- Revision requests (formal revision submissions)
- Additional revision requests (quota exhausted requests)

**Missing Coverage:**
- Deliverable draft comments (collaborative pre-submission feedback)

**Integration Strategy:**
- Add deliverable comments to existing data models, schema, and API docs
- Maintain consistency with existing comment types (task, file)
- Follow same patterns for structure, validation, and error handling

### Important Gotchas and Edge Cases

**Frontend:**
1. **Comment Ownership**: Users can only delete their own comments, unless they're Primary Contact (moderation)
2. **Bundling Behavior**: When revision submitted, `InlineFeedbackForm` includes all comments in `timestampedComments` field
3. **Permission Change**: Changing from `canRequestRevision` to `canComment` is intentional - broader permission scope
4. **Backward Compatibility**: `canRequestRevision` prop still passed to `DeliverableVideoSection` but not used for commenting

**Backend:**
1. **Cascade Deletion**: When deliverable deleted, draft comments auto-delete (ON DELETE CASCADE)
2. **User Deletion**: If user deleted, comments preserved with NULL author_id (ON DELETE SET NULL)
3. **Transaction Safety**: Bundling and deletion should happen in same transaction (atomicity)
4. **Duplicate Prevention**: No unique constraint on (deliverable_id, timestamp) - multiple comments at same timestamp allowed
5. **Status Check**: Frontend filters to `awaiting_approval` but backend should accept comments for any status (more flexible)

**Documentation:**
1. **Endpoint Numbering**: Need to renumber all endpoints after line 195 when inserting new section
2. **Table of Contents**: Must update in both 03-data-models.md and 05-api-endpoints.md
3. **SQL Comments**: Use `COMMENT ON TABLE/COLUMN` for schema documentation
4. **Consistency**: TypeScript fields must match SQL columns (snake_case vs camelCase)

### Environment and Configuration

**Project Setup:**
- React + TypeScript frontend
- Vite as build tool
- React Router for routing
- React Context for state management
- Neon PostgreSQL for database (based on schema comments)
- Mock data currently used (`mockDeliverables.ts`)

**Development URL:**
- Local dev: http://localhost:5173
- Test URL: http://localhost:5173#/projects/5823632/deliverables/del-002

**File Paths:**
- Feature docs: `features/pending/feedback-and-revisions/`
- Components: `components/deliverables/`
- Pages: `pages/`
- Utils: `utils/`
- Hooks: `hooks/`
- Types: `types/deliverable.types.ts`

**Current Users for Testing:**
- Client Team Member (not Primary Contact) - can now comment but not approve/reject
- Client Primary Contact - can comment, approve, reject, and submit revision requests
- Motionify Team - can comment and moderate

### Key Decisions and Trade-offs

**Decision 1: Use Existing `canComment` Permission**
- Trade-off: Could have created new permission with custom logic
- Chosen: Use existing `canCommentOnDeliverable()` function
- Reasoning: Already implements correct logic (all viewers can comment), reduces code duplication
- Impact: Simpler implementation, consistent with existing permission model

**Decision 2: Draft Comments as Temporary Data**
- Trade-off: Could keep comments permanent for historical reference
- Chosen: Delete draft comments after bundling into revision request
- Reasoning: Avoid data duplication, comments preserved in approval history anyway
- Impact: Cleaner database, single source of truth for historical comments

**Decision 3: Integrate into Existing Feature Docs**
- Trade-off: Standalone guide easier to create initially
- Chosen: Update existing 03-data-models.md, 04-database-schema.sql, 05-api-endpoints.md
- Reasoning: Maintains documentation structure, easier long-term maintenance
- Impact: More work upfront, better organization long-term

**Decision 4: Allow Multiple Comments at Same Timestamp**
- Trade-off: Could enforce unique (deliverable_id, timestamp) constraint
- Chosen: Allow multiple comments at same timestamp
- Reasoning: Multiple team members might identify same issue, adds flexibility
- Impact: Frontend must handle duplicate timestamps gracefully

**Decision 5: Team Member Message Wording**
- Original: "View Only - Only the Primary Contact can approve or request revisions"
- Changed to: "Team Member View - You can add timeline comments. Only the Primary Contact can approve or submit revision requests."
- Reasoning: Clarifies that commenting is available, sets expectations about limitations
- Impact: Better user understanding, reduces confusion about capabilities

### Assumptions Requiring Validation

1. **Database exists**: Assumes `deliverables` table already exists with correct structure
2. **User authentication**: Assumes JWT-based auth with user ID available in request
3. **Project membership**: Assumes `canViewDeliverable()` check works correctly
4. **Frontend API client**: Assumes `apiClient` service exists for making requests
5. **Revision request endpoint**: Assumes `POST /api/deliverables/:id/request-revision` exists
6. **Approval history structure**: Assumes `DeliverableApproval` has `timestampedComments` array field

</critical_context>

## Current State

<current_state>

### Deliverable Status

**COMPLETED:**
1. ✅ Frontend permission fix implementation
   - `DeliverableVideoSection.tsx` - Modified (3 changes)
   - `DeliverableReview.tsx` - Modified (1 change)
   - `DeliverableMetadataSidebar.tsx` - Modified (1 change)
   - All changes committed to git working tree (files show as modified in git status)
   - Feature tested and working - Team Members can now add comments

2. ✅ Backend integration research
   - Problem identified (browser memory storage)
   - Solution designed (database persistence with draft comments)
   - Initial documentation created (`BACKEND_INTEGRATION_GUIDE.md`)

3. ✅ Documentation plan created
   - Plan file: `/Users/praburajasekaran/.claude/plans/sprightly-munching-anchor.md`
   - Plan reviewed and approved by user
   - Detailed breakdown of exactly what to add to each file

**IN PROGRESS:**
1. 🔄 Feature documentation updates (READY TO START)
   - User said "continue" which signals to proceed with implementation
   - All three documentation files need to be updated
   - Standalone guide needs to be deleted

**NOT STARTED:**
1. ⬜ Backend API implementation (out of scope for this session)
2. ⬜ Frontend service layer (`services/draftComments.ts`)
3. ⬜ Frontend context updates for loading draft comments
4. ⬜ Frontend page updates for backend API calls

### Files State

**Modified (Changes in Git Working Tree):**
- `components/deliverables/DeliverableVideoSection.tsx` - Production code, finalized
- `pages/DeliverableReview.tsx` - Production code, finalized
- `components/deliverables/DeliverableMetadataSidebar.tsx` - Production code, finalized

**Created (To Be Deleted):**
- `BACKEND_INTEGRATION_GUIDE.md` - Temporary standalone guide, content to be integrated into feature docs

**To Be Modified (Next Steps):**
- `features/pending/feedback-and-revisions/03-data-models.md` - Needs DeliverableComment model added
- `features/pending/feedback-and-revisions/04-database-schema.sql` - Needs deliverable_comments table added
- `features/pending/feedback-and-revisions/05-api-endpoints.md` - Needs 4 draft comment endpoints added

**Unchanged (Reference Files):**
- `utils/deliverablePermissions.ts` - Contains `canCommentOnDeliverable()` function, no changes needed
- `hooks/useDeliverablePermissions.ts` - Exposes `canComment` property, no changes needed
- `types/deliverable.types.ts` - Contains `TimestampedComment` interface, no changes needed
- `components/deliverables/DeliverableContext.tsx` - State management, future backend integration needed

### Current Position in Workflow

**Workflow Stage:** Documentation Update Phase

**Last Action Taken:** User said "continue" after plan approval, signaling to proceed with implementation

**Next Action:** Begin documentation updates by modifying `03-data-models.md`

**Sequence:**
1. ✅ Investigate issue → Completed
2. ✅ Implement frontend fix → Completed
3. ✅ Test frontend changes → Completed
4. ✅ Research backend requirements → Completed
5. ✅ Create documentation plan → Completed
6. 👉 **CURRENT**: Update feature documentation files
7. ⬜ Verify documentation consistency
8. ⬜ Delete standalone guide

### Open Questions and Pending Decisions

**No open questions** - All decisions made and plan approved. Ready to proceed with implementation.

### Git Status

Based on git status from conversation start:
```
Modified:
 M components/deliverables/DeliverableMetadataSidebar.tsx
 M components/deliverables/DeliverableVideoSection.tsx
 M pages/DeliverableReview.tsx

New files:
?? BACKEND_INTEGRATION_GUIDE.md (to be deleted after integration)
?? whats-next.md (this file)
```

### Next Immediate Steps

1. Update `features/pending/feedback-and-revisions/03-data-models.md`
2. Update `features/pending/feedback-and-revisions/04-database-schema.sql`
3. Update `features/pending/feedback-and-revisions/05-api-endpoints.md`
4. Delete `BACKEND_INTEGRATION_GUIDE.md`
5. Verify all documentation is consistent
6. Create git commit with all changes

</current_state>
