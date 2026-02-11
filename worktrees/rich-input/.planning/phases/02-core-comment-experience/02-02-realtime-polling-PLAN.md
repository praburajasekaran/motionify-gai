---
phase: 02-core-comment-experience
plan: "02"
type: execute
wave: 2
depends_on:
  - "02-01"
files_modified:
  - "netlify/functions/comments.ts"
  - "components/proposals/CommentThread.tsx"
  - "landing-page-new/src/components/CommentThread.tsx"
autonomous: true
user_setup: []

must_haves:
  truths:
    - "New comments appear without page refresh within 10 seconds"
    - "Both parties see the same comment stream"
    - "Comment stream updates automatically via polling"
    - "Scroll position maintained during updates"
  artifacts:
    - path: "components/proposals/CommentThread.tsx"
      provides: "Polling mechanism for admin portal"
      contains: "useEffect with setInterval, polling interval state"
    - path: "landing-page-new/src/components/CommentThread.tsx"
      provides: "Polling mechanism for client portal"
      contains: "useEffect with setInterval, polling interval state"
    - path: "netlify/functions/comments.ts"
      provides: "GET endpoint returns current comments"
      exports: "GET method already exists"
  key_links:
    - from: "CommentThread.tsx (both portals)"
      to: "/comments GET endpoint"
      via: "useEffect polling with setInterval"
      pattern: "setInterval.*getComments"
    - from: "CommentThread.tsx"
      to: "useState(comments)"
      via: "append new comments without resetting"
      pattern: "setComments.*prev.*=>"
---

<objective>
Implement real-time comment updates via polling and fix hardcoded API URL.

Purpose: Users see new comments from the other party within 10 seconds without manually refreshing. This provides a near real-time experience using simple polling (WebSockets/Ably deferred to v2).

Output: Automatic comment stream updates via polling in both portals.
</objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/execute-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md

# Prior plans
@.planning/phases/02-core-comment-experience/02-01-comment-editing-PLAN.md

# Existing component pattern
@components/proposals/CommentThread.tsx
@landing-page-new/src/components/CommentThread.tsx
</context>

<tasks>

<task type="auto">
  <name>Add polling to admin CommentThread</name>
  <files>components/proposals/CommentThread.tsx</files>
  <action>
    Add automatic polling to the admin portal CommentThread component.

    Implementation requirements:
    - Add useEffect with setInterval to fetch comments every 10 seconds
    - Only poll when component is visible (use Page Visibility API or focus detection)
    - On poll success: merge new comments with existing state (don't replace, append new ones)
    - Track latest comment ID/timestamp to detect new comments
    - Handle race conditions (polling during manual refresh)
    - Clear interval on unmount

    UX requirements from roadmap:
    - New comments appear within 10 seconds
    - Scroll position maintained during updates
    - Visual indicator when new comments arrive (optional enhancement)
  </action>
  <verify>Open admin proposal detail, post a comment from client portal, see it appear within 10 seconds without refresh</verify>
  <done>Comments appear automatically within 10 seconds of being posted by other user</done>
</task>

<task type="auto">
  <name>Add polling to client CommentThread</name>
  <files>landing-page-new/src/components/CommentThread.tsx</files>
  <action>
    Add automatic polling to the client portal CommentThread component.

    Same requirements as admin:
    - Poll every 10 seconds using setInterval in useEffect
    - Merge new comments without replacing existing state
    - Track latest comment to detect additions
    - Clear interval on unmount
    - Handle visibility/focus for battery efficiency

    Also fix the hardcoded localhost URL - use environment variable or relative path.
  </action>
  <verify>Open client proposal page, see comments appear within 10 seconds of admin posting, hardcoded URL replaced</verify>
  <done>Client portal users see admin comments automatically, API URL no longer hardcoded</done>
</task>

<task type="auto">
  <name>Add GET by ID endpoint optimization</name>
  <files>netlify/functions/comments.ts</files>
  <action>
    Optimize polling by adding efficient "fetch new comments only" endpoint.

    The GET /comments?proposalId={id} returns ALL comments. For efficient polling:
    - Add optional `since` query parameter
    - When `since` provided, return only comments created after that timestamp
    - This reduces data transfer for polling updates

    Existing GET endpoint structure already supports query params, just add since filter.
  </action>
  <verify>GET /comments?proposalId={id}&since={timestamp} returns only newer comments</verify>
  <done>Polling can efficiently fetch only new comments since last poll</done>
</task>

</tasks>

<verification>
1. Comments appear within 10 seconds of being posted by the other party
2. Polling works in both admin and client portals
3. Hardcoded localhost URL in client portal is fixed
4. Scroll position maintained during updates
</verification>

<success_criteria>
- Real-time polling works in both portals
- New comments appear within 10 seconds without page refresh
- API optimization reduces polling bandwidth
- No hardcoded URLs in production code
</success_criteria>

<output>
After completion, create `.planning/phases/02-core-comment-experience/{phase}-02-SUMMARY.md`
</output>
