---
status: investigating
trigger: "When user is scrolled near bottom of comment thread, new comments from other users arrive via polling but page doesn't auto-scroll to show them"
created: 2026-01-23T17:01:43Z
updated: 2026-01-23T17:12:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: Actually investigating deeper - scrollPosRef preservation on line 156-162 (admin) / 211-218 (client) may be overriding auto-scroll
test: analyzing the else branch that preserves scroll position
expecting: scroll preservation logic may be executing even when it shouldn't
next_action: analyze the scroll preservation conditions

## Symptoms

expected: Page should smoothly auto-scroll to show new comment when user is within 100px of bottom
actual: Comment appears after polling but NO auto-scroll - user must manually scroll to see new comment
errors: none reported
reproduction: User scrolls to bottom, another user posts comment, after 10 seconds (polling) comment appears but page doesn't auto-scroll
started: UAT Test 6 failure
context: Previous fix attempt in 04-04 supposedly added isNearBottom() helper, scrollToBottom() helper, and updated pollForNewComments to auto-scroll

## Eliminated

- hypothesis: Helper functions were never implemented
  evidence: Found isNearBottom() (lines 44-50 admin, 93-99 client) and scrollToBottom() (lines 52-59 admin, 101-108 client) in both files
  timestamp: 2026-01-23T17:05:00Z

- hypothesis: Auto-scroll logic not called in pollForNewComments
  evidence: Lines 151-153 (admin) and 206-208 (client) show auto-scroll IS called when wasNearBottom is true
  timestamp: 2026-01-23T17:06:00Z

## Evidence

- timestamp: 2026-01-23T17:02:00Z
  checked: components/proposals/CommentThread.tsx
  found: isNearBottom() helper exists at lines 44-50, scrollToBottom() at lines 52-59
  implication: The 04-04 fix was implemented

- timestamp: 2026-01-23T17:03:00Z
  checked: landing-page-new/src/components/CommentThread.tsx
  found: isNearBottom() helper exists at lines 93-99, scrollToBottom() at lines 101-108
  implication: Both portals have the auto-scroll logic

- timestamp: 2026-01-23T17:04:00Z
  checked: pollForNewComments function (lines 112-169 admin, 166-224 client)
  found: Line 117 (admin) and 171 (client) - isNearBottom() is called BEFORE setComments() updates state
  implication: isNearBottom() checks scroll position before new comments are added to DOM

- timestamp: 2026-01-23T17:07:00Z
  checked: Timing sequence in pollForNewComments
  found: wasNearBottom = isNearBottom() → setComments() → setTimeout(scrollToBottom, 50)
  implication: Race condition - checking bottom position BEFORE new content renders means measurement is based on OLD scrollHeight

- timestamp: 2026-01-23T17:08:00Z
  checked: isNearBottom() implementation (lines 44-50 admin, 93-99 client)
  found: distanceFromBottom = scrollHeight - scrollTop - clientHeight; return distanceFromBottom < 100;
  implication: This measures distance using CURRENT scrollHeight, not the scrollHeight AFTER new comments render

- timestamp: 2026-01-23T17:10:00Z
  checked: React state update timing
  found: setComments() is async - DOM doesn't update until after current function completes
  implication: When isNearBottom() runs on line 117/171, scrollHeight reflects OLD comment list (before new comments), not new one

## Resolution

root_cause: Race condition in pollForNewComments - isNearBottom() is called BEFORE new comments are added to the DOM. The function checks if user is near bottom using the OLD scrollHeight (before new comments), but after new comments render, the scrollHeight increases and the user is no longer near bottom. This causes wasNearBottom to always be false, preventing auto-scroll.

Sequence breakdown:
1. Line 117 (admin) / 171 (client): wasNearBottom = isNearBottom() - checks CURRENT scroll position
2. At this moment, scrollHeight = height with N comments
3. User is at bottom, so distanceFromBottom < 100 → should return true
4. BUT: scrollHeight hasn't updated yet because setComments() hasn't re-rendered
5. Lines 119-147 (admin) / 174-202 (client): setComments() triggers re-render
6. DOM updates, new comments render, scrollHeight increases to height with N+1 comments
7. Line 152 (admin) / 207 (client): if (wasNearBottom) check uses stale value
8. setTimeout(scrollToBottom, 50) may or may not trigger depending on race timing

artifacts:
  - path: /Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/components/proposals/CommentThread.tsx
    line: 117
    issue: "const wasNearBottom = isNearBottom();" is called before setComments() on line 119, measuring scroll position against OLD DOM
  - path: /Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/landing-page-new/src/components/CommentThread.tsx
    line: 171
    issue: "const wasNearBottom = isNearBottom();" is called before setComments() on line 174, measuring scroll position against OLD DOM

solution: Move isNearBottom() check to AFTER DOM updates, either:
  A. Use useEffect to check isNearBottom() after comments state updates and DOM renders
  B. Use requestAnimationFrame or setTimeout to defer the check until after React flushes updates
  C. Calculate expected behavior based on pre-update metrics: store scrollTop and check if scrollTop === scrollHeight - clientHeight (exact bottom)

fix:
verification:
files_changed: []
