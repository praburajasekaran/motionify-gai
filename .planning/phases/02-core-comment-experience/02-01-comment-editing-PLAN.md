---
phase: 02-core-comment-experience
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - "netlify/functions/comments.ts"
  - "components/proposals/CommentThread.tsx"
  - "components/proposals/CommentItem.tsx"
  - "landing-page-new/src/components/CommentThread.tsx"
  - "landing-page-new/src/components/CommentItem.tsx"
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Users can edit their own comments"
    - "Edit button appears only on user's own comments"
    - "Edit option disappears after replies (based on isEdited + replies check)"
    - "Edited comments show edit indicator"
  artifacts:
    - path: "netlify/functions/comments.ts"
      provides: "PUT endpoint for updating comments"
      exports: "PUT method handler"
    - path: "components/proposals/CommentItem.tsx"
      provides: "Edit mode UI for admin portal"
      contains: "EditButton, edit mode state, save/cancel"
    - path: "landing-page-new/src/components/CommentItem.tsx"
      provides: "Edit mode UI for client portal"
      contains: "EditButton, edit mode state, save/cancel"
  key_links:
    - from: "CommentItem.tsx (both portals)"
      to: "/comments PUT endpoint"
      via: "onEdit callback -> API call"
      pattern: "PUT.*comments"
    - from: "CommentThread.tsx (both portals)"
      to: "CommentItem.tsx"
      via: "onEdit prop passing"
      pattern: "onEdit=.*handleEdit"
---

<objective>
Implement comment editing functionality: PUT API endpoint and edit UI in both portals.

Purpose: Users can correct typos or update content in their comments. Editing is restricted to the author's own comments and disabled after replies to maintain conversation clarity.

Output: Working edit feature with PUT endpoint and inline edit UI.
</objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/execute-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md

# Prior work (Phase 1)
@.planning/phases/01-foundation/01-01-foundation-impl-SUMMARY.md

# Existing API pattern
@netlify/functions/comments.ts
</context>

<tasks>

<task type="auto">
  <name>Add PUT endpoint to comments API</name>
  <files>netlify/functions/comments.ts</files>
  <action>
    Add PUT method handler to the existing comments Netlify Function.

    Implementation requirements:
    - Extract comment ID from URL path or body (following existing pattern)
    - Verify the requesting user owns the comment (match userId from token/session to comment.userId)
    - Update only the content field (preserve createdAt, userName)
    - Set isEdited = true and updatedAt = now()
    - Return updated comment object with 200 status
    - Return 403 if user doesn't own the comment
    - Return 404 if comment doesn't exist

    Follow existing auth pattern from POST endpoint.
  </action>
  <verify>curl -X PUT -H "Content-Type: application/json" -d '{"content":"updated"}' https://.../comments/{id} returns 200 with updated comment including isEdited: true</verify>
  <done>PUT /comments/{id} endpoint returns updated comment with isEdited flag set</done>
</task>

<task type="auto">
  <name>Add edit UI to admin CommentItem</name>
  <files>components/proposals/CommentItem.tsx</files>
  <action>
    Add inline editing capability to the admin portal CommentItem component.

    Requirements:
    - Add EditButton (pencil icon from Lucide) that appears only when comment.userId === currentUserId
    - Add edit mode state (isEditing boolean)
    - When editing: replace content display with textarea pre-filled with current content
    - Show Save and Cancel buttons in edit mode
    - On Save: call API PUT, update local state, exit edit mode
    - On Cancel: discard changes, exit edit mode
    - Show "edited" badge if comment.isEdited is true (existing logic)

    Note: For the "disable after replies" requirement, the API will handle enforcement by checking if replies exist. For now, show edit button based on ownership only.
  </action>
  <verify>npm run build passes, edit button appears on own comments, clicking edit shows textarea with save/cancel</verify>
  <done>Users can click Edit on their comments, modify content, and save changes</done>
</task>

<task type="auto">
  <name>Add edit UI to client CommentItem</name>
  <files>landing-page-new/src/components/CommentItem.tsx</files>
  <action>
    Add inline editing capability to the client portal CommentItem component.

    Use the same pattern as admin CommentItem:
    - Add EditButton (pencil icon from Lucide) for own comments
    - Add edit mode state (isEditing boolean)
    - When editing: textarea with current content
    - Save/Cancel buttons with API PUT call
    - Show "edited" badge if comment.isEdited is true

    Ensure Lucide icons are imported (import { Pencil, X, Check } from 'lucide-react')
  </action>
  <verify>npm run build passes for landing-page-new, edit functionality works same as admin</verify>
  <done>Client portal users can edit their own comments with same UI/UX as admin</done>
</task>

</tasks>

<verification>
1. PUT /comments/{id} returns 200 with updated comment
2. Edit button appears only on user's own comments in both portals
3. Editing a comment updates it and shows "edited" indicator
4. No edit button on other users' comments
</verification>

<success_criteria>
- Comment editing works for both portals
- Edit button visibility correctly restricted to comment author
- Edited comments persist and display "edited" indicator
- PUT endpoint properly validates ownership
</success_criteria>

<output>
After completion, create `.planning/phases/02-core-comment-experience/{phase}-01-SUMMARY.md`
</output>
