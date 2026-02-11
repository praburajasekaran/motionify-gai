---
status: diagnosed
trigger: "Page doesn't scroll to show new comment when posted by another user"
created: 2026-01-21T10:00:00Z
updated: 2026-01-21T10:10:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - CommentThread intentionally preserves scroll position, preventing auto-scroll to new comments
test: analyzed both CommentThread implementations
expecting: verify scroll preservation logic is blocking auto-scroll behavior
next_action: document root cause

## Symptoms

expected: Page scrolls to show new comment when posted by another user
actual: The page doesn't scroll to the new comment
errors: none reported
reproduction: Post comment from another user, observe page does not scroll
started: UAT Test 6
context: Phase 04-integration-and-polish, CommentThread scroll behavior

## Eliminated

## Evidence

- timestamp: 2026-01-21T10:05:00Z
  checked: Both CommentThread.tsx files (proposals and landing-page-new)
  found: No scrollIntoView or auto-scroll logic exists anywhere
  implication: Auto-scroll feature was never implemented

- timestamp: 2026-01-21T10:06:00Z
  checked: pollForNewComments function (lines 78-127 proposals, 132-184 landing-page)
  found: Scroll position is preserved when new comments arrive via polling (lines 116-122, 173-179)
  implication: The code actively prevents scrolling by restoring previous position

- timestamp: 2026-01-21T10:07:00Z
  checked: Scroll preservation logic
  found: wasActive check (scrollPosRef.current.active && scrollPosRef.current.container > 100) determines if scroll should be preserved
  implication: Any user who has scrolled more than 100px will have their position preserved, preventing them from seeing new comments

- timestamp: 2026-01-21T10:08:00Z
  checked: User comment submission (handleSubmit)
  found: No scroll logic after posting own comment either
  implication: Even when user posts a comment, they don't scroll to see it if comment thread is scrollable

## Resolution

root_cause: CommentThread components lack auto-scroll logic to show newly posted comments, and the scroll-preservation mechanism (lines 116-122 in proposals portal, 173-179 in landing-page portal) actively prevents scrolling by restoring the previous scroll position whenever new comments arrive via polling.

artifacts:
  - path: /Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/components/proposals/CommentThread.tsx
    issue: pollForNewComments (lines 78-127) preserves scroll position when new comments arrive, preventing auto-scroll to show new content
  - path: /Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/landing-page-new/src/components/CommentThread.tsx
    issue: pollForNewComments (lines 132-184) preserves scroll position when new comments arrive, preventing auto-scroll to show new content

missing:
  - Auto-scroll logic to scroll to bottom when new comments arrive AND user is near bottom
  - Logic to differentiate between "user at bottom" (should auto-scroll) vs "user reading middle" (preserve position)
  - Scroll to bottom after user posts their own comment
  - Consider threshold like: if user is within 150px of bottom, auto-scroll; otherwise preserve position

fix:
verification:
files_changed: []
