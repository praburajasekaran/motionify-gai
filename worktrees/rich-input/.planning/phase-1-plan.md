# Phase 1 Plan: Foundation (Database, API, Embedded UI)

**Phase:** 1 of 3  
**Goal:** Users can view and persist comments in the proposal detail page with a working database and API layer.  
**Requirements:** COMM-07, COMM-08  
**Success Criteria:** 3 observable behaviors

---

## Task Breakdown

### 1. Database Migration
**Type:** database  
**Description:** Create proposal_comments table with proper schema  
**Priority:** Must Do  
**Dependencies:** None  

**Tasks:**
1. Create `database/add-proposal-comments-table.sql` with:
   - `id` (UUID, primary key)
   - `proposal_id` (UUID, FK to proposals, ON DELETE CASCADE)
   - `user_id` (UUID, FK to users, ON DELETE CASCADE)
   - `content` (TEXT, NOT NULL)
   - `user_name` (VARCHAR, denormalized for display)
   - `is_edited` (BOOLEAN, DEFAULT FALSE)
   - `created_at` (TIMESTAMPTZ, DEFAULT NOW())
   - `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
   - Indexes on `proposal_id`, `user_id`, `created_at`
2. Run migration against database

**Verification:**  
- Table exists in database with correct schema
- Indexes exist for query performance

---

### 2. API: Comments CRUD
**Type:** backend  
**Description:** Create Netlify Function for comment CRUD operations  
**Priority:** Must Do  
**Dependencies:** Task 1 (database migration)  

**Tasks:**
1. Create `netlify/functions/comments.ts` with endpoints:
   - `GET /api/comments?proposalId=<uuid>` - List comments for proposal
   - `POST /api/comments` - Create new comment
2. Implement GET handler:
   - Validate proposalId is valid UUID
   - Query comments ordered by `created_at ASC`
   - Return user info (id, name) with each comment
   - Filter by proposal_id (no cross-proposal leakage)
3. Implement POST handler:
   - Require authentication (user from magic link session)
   - Validate proposalId, content (non-empty, max length)
   - Insert comment with user_id, user_name denormalized
   - Return created comment

**Verification:**  
- GET returns comments for valid proposalId
- GET returns 400 for invalid/missing proposalId
- POST creates comment with authenticated user
- POST returns 401 for unauthenticated requests

---

### 3. Frontend: Comment Components
**Type:** frontend  
**Description:** Create shared comment UI components for both portals  
**Priority:** Must Do  
**Dependencies:** Task 2 (API exists)  

**Tasks:**
1. Create `components/proposals/CommentThread.tsx`:
   - Container for comment list
   - Handles empty state
   - Integrates with CommentItem and CommentInput
2. Create `components/proposals/CommentItem.tsx`:
   - Display single comment with user avatar, name, timestamp
   - Show "Edited" badge if is_edited is true
   - Use existing UI patterns from CommentItem.tsx in tasks
3. Create `components/proposals/CommentInput.tsx`:
   - Textarea for comment content
   - Submit button
   - Loading state during submission
4. Create `components/proposals/index.ts` to export all

**Verification:**  
- Components render without errors in isolation
- Empty state shows when no comments exist
- Comment items display user info and content correctly

---

### 4. Integration: Admin Portal
**Type:** frontend  
**Description:** Add comment section to admin ProposalDetail.tsx  
**Priority:** Must Do  
**Dependencies:** Task 3 (components exist)  

**Tasks:**
1. Import CommentThread component in ProposalDetail.tsx
2. Add comment section before "Response Tracking" section:
   - Conditional: only show if user can view comments (admins + clients)
   - Pass proposalId to CommentThread
   - Pass current user info for authorization
3. Test in admin portal with sample proposal

**Verification:**  
- Admin users see comment section on proposal detail page
- Comment section positioned appropriately (before response tracking)
- Empty state shows when no comments exist

---

### 5. Integration: Client Portal
**Type:** frontend  
**Description:** Add comment section to Next.js client proposal page  
**Priority:** Must Do  
**Dependencies:** Task 3 (components exist)  

**Tasks:**
1. Read `landing-page-new/src/app/proposal/[proposalId]/page.tsx` structure
2. Create shared comment components in shared location (or adapt for Next.js)
3. Add comment section to client proposal page:
   - Conditional: only show if user is authenticated client
   - Position after proposal content, before any action buttons
4. Test in client portal with sample proposal

**Verification:**  
- Client users see comment section on proposal detail page
- Both admin and client see the same comment thread for same proposal

---

### 6. Integration: API Client
**Type:** frontend  
**Description:** Create API client functions for comment operations  
**Priority:** Must Do  
**Dependencies:** Task 2 (API exists)  

**Tasks:**
1. Create `lib/comments.ts` with:
   - `getComments(proposalId: string): Promise<Comment[]>`
   - `createComment(data: CreateCommentData): Promise<Comment>`
2. Implement functions using existing API call patterns
3. Handle errors gracefully (show user-friendly messages)

**Verification:**  
- Frontend can fetch comments via lib/comments.ts
- Frontend can create comments via lib/comments.ts
- Errors are handled gracefully

---

## Task Graph

```
Task 1: Database Migration ──┬──► Task 2: API CRUD
                              │
                              └──► Task 6: API Client ──► Task 3: Components ──┬──► Task 4: Admin Integration
                                                                                │
                                                                                └──► Task 5: Client Integration
```

---

## Implementation Notes

**Database Pattern:**
- Follow existing migration pattern from `add-notifications-table.sql`
- Use `gen_random_uuid()` for UUID generation
- Include denormalized `user_name` to avoid joins (performance)

**API Pattern:**
- Follow existing pattern from `netlify/functions/notifications.ts`
- Include CORS headers for both admin and client portals
- Validate UUIDs using existing `isValidUUID` helper

**Component Pattern:**
- Use existing UI components (buttons, inputs) from `components/ui/`
- Follow existing styling conventions (Tailwind, design system)
- Use existing `CommentItem.tsx` as reference for comment display

**Integration Pattern:**
- Position comments before "Response Tracking" in admin (line ~747)
- Position comments after proposal content in client portal
- Keep authentication logic in existing AuthContext

---

## Files to Create/Modify

**New Files:**
- `database/add-proposal-comments-table.sql`
- `netlify/functions/comments.ts`
- `lib/comments.ts`
- `components/proposals/CommentThread.tsx`
- `components/proposals/CommentItem.tsx`
- `components/proposals/CommentInput.tsx`
- `components/proposals/index.ts`

**Modified Files:**
- `pages/admin/ProposalDetail.tsx` - Add comment section
- `landing-page-new/src/app/proposal/[proposalId]/page.tsx` - Add comment section

---

## Estimated Effort

| Task | Complexity | Notes |
|------|------------|-------|
| Database Migration | Low | Standard table creation |
| API CRUD | Medium | Following existing patterns |
| Components | Medium | UI work, existing patterns |
| Admin Integration | Low | Import and place component |
| Client Integration | Low | Import and place component |
| API Client | Low | Simple wrapper functions |
| **Total** | **~4-6 hours** | |

---

## Success Criteria Verification

| Criterion | How to Verify |
|-----------|---------------|
| Users see comment section on proposal detail page | Navigate to admin ProposalDetail.tsx and client proposal page; comment section visible |
| Comments persist in database across sessions | Post a comment; refresh page; comment still appears |
| Both user types view same comment thread | Post as admin; view as client; comment visible to both |

---

*Plan created: 2026-01-20*
