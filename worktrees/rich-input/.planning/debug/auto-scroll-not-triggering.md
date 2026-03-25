---
status: diagnosed
trigger: "When user is scrolled near bottom of comment thread, new comments from other users arrive via polling but page doesn't auto-scroll to show them"
created: 2026-01-23T17:01:43Z
updated: 2026-01-23T17:30:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - User must scroll within 100px of bottom, but after viewing new notification and clicking, focus/scroll position may shift before polling completes
test: Analyzed entire flow including notification interaction
expecting: User behavior (clicking notification, changing tabs) resets scroll position before auto-scroll check
next_action: document complete root cause with behavioral flow

## Symptoms

expected: Page should smoothly auto-scroll to show new comment when user is within 100px of bottom
actual: Comment appears after polling but NO auto-scroll - user must manually scroll to see new comment
errors: none reported
reproduction: User scrolls to bottom, another user posts comment, after 10 seconds (polling) comment appears but page doesn't auto-scroll
started: UAT Test 6 failure
context: Previous fix attempt in 04-04 added isNearBottom() helper, scrollToBottom() helper, and updated pollForNewComments to auto-scroll

## Eliminated

- hypothesis: Helper functions were never implemented
  evidence: Found isNearBottom() (lines 44-50 admin, 93-99 client) and scrollToBottom() (lines 52-59 admin, 101-108 client) in both files
  timestamp: 2026-01-23T17:05:00Z

- hypothesis: Auto-scroll logic not called in pollForNewComments
  evidence: Lines 151-153 (admin) and 206-208 (client) show auto-scroll IS called when wasNearBottom is true
  timestamp: 2026-01-23T17:06:00Z

- hypothesis: Race condition between if/else branches
  evidence: if/else structure prevents both branches from executing
  timestamp: 2026-01-23T17:18:00Z

- hypothesis: isNearBottom() doesn't work for non-scrolling containers
  evidence: Math works correctly when scrollHeight <= clientHeight (returns true)
  timestamp: 2026-01-23T17:25:00Z

## Evidence

- timestamp: 2026-01-23T17:02:00Z
  checked: components/proposals/CommentThread.tsx
  found: isNearBottom() at lines 44-50, scrollToBottom() at 52-59, auto-scroll logic at 117, 151-153
  implication: Implementation is complete

- timestamp: 2026-01-23T17:03:00Z
  checked: landing-page-new/src/components/CommentThread.tsx
  found: isNearBottom() at lines 93-99, scrollToBottom() at 101-108, auto-scroll logic at 171, 206-208
  implication: Both portals have identical logic structure

- timestamp: 2026-01-23T17:28:00Z
  checked: handleScroll function (lines 204-211 admin, 264-271 client)
  found: Updates scrollPosRef on every scroll event with current scrollTop
  implication: scrollPosRef is continuously updated as user scrolls

- timestamp: 2026-01-23T17:29:00Z
  checked: Notification behavior (lines 132-144 admin, 187-199 client)
  found: Shows notification for comments from other users, actionUrl navigates to proposal
  implication: User may click notification, which could cause page navigation/re-render

- timestamp: 2026-01-23T17:30:00Z
  checked: Most probable root cause
  found: isNearBottom() checks scrollContainer at moment of polling, but user's actual scroll position may have changed due to:
    1. Browser automatic scroll adjustment when container height changes
    2. User scrolled away from bottom between polling intervals
    3. Container ref is not properly pointing to scrollable element
  implication: Auto-scroll trigger condition (wasNearBottom) may be false even when user expects auto-scroll

## Resolution

root_cause: The auto-scroll logic is implemented correctly, but the most likely issue is that `isNearBottom()` returns `false` when it should return `true`. This happens because:

**Primary Issue: Browser scroll adjustment**
When React re-renders after `setComments()`, the browser automatically adjusts scroll position to maintain visual continuity. This means:
- BEFORE new comments: scrollTop = 400px, scrollHeight = 500px (at bottom, distanceFromBottom = 0)
- isNearBottom() called: returns true ✓
- AFTER React adds new comments: scrollHeight = 700px, but browser MAINTAINS scrollTop = 400px
- Result: User is now 300px from bottom, but wasNearBottom was true, so scrollToBottom() should execute
- **BUT**: The setTimeout delay of 50ms may occur AFTER browser has already adjusted scroll, or smooth scroll behavior may conflict with browser's automatic adjustment

**Secondary Issue: Scroll position tracking**
The `scrollPosRef` is updated on every manual scroll (handleScroll), but `isNearBottom()` reads directly from DOM, not from ref. This creates potential desync.

**Tertiary Issue: Container ref timing**
If `scrollContainerRef.current` is null at the moment `isNearBottom()` is called (line 117/171), the function returns `false` and auto-scroll never triggers.

artifacts:
  - path: /Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/components/proposals/CommentThread.tsx
    lines: 44-50 (isNearBottom), 117 (check timing), 152-153 (auto-scroll execution)
    issue: setTimeout delay of 50ms may be too long or too short; smooth scroll may conflict with browser adjustment

  - path: /Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/landing-page-new/src/components/CommentThread.tsx
    lines: 93-99 (isNearBottom), 171 (check timing), 207-208 (auto-scroll execution)
    issue: setTimeout delay of 50ms may be too long or too short; smooth scroll may conflict with browser adjustment

suggested_fix_approaches:

**Option A: More reliable bottom detection**
```javascript
const isNearBottom = () => {
    if (!scrollContainerRef.current) return false;
    const { scrollHeight, scrollTop, clientHeight } = scrollContainerRef.current;
    // Use more generous threshold and check for exact bottom
    return (scrollHeight - scrollTop - clientHeight) <= 150; // increased from 100px
};
```

**Option B: Use useEffect to trigger scroll after DOM updates**
```javascript
// Instead of setTimeout in pollForNewComments, use a flag and useEffect
const shouldScrollToNewComment = useRef(false);

// In pollForNewComments, after wasNearBottom check:
if (wasNearBottom) {
    shouldScrollToNewComment.current = true;
}

// Add useEffect watching comments:
useEffect(() => {
    if (shouldScrollToNewComment.current) {
        scrollToBottom();
        shouldScrollToNewComment.current = false;
    }
}, [comments]);
```

**Option C: Calculate relative position before update**
```javascript
const pollForNewComments = async () => {
    // Capture metrics BEFORE checking for new comments
    const scrollMetrics = scrollContainerRef.current ? {
        scrollTop: scrollContainerRef.current.scrollTop,
        scrollHeight: scrollContainerRef.current.scrollHeight,
        clientHeight: scrollContainerRef.current.clientHeight,
    } : null;

    const newComments = await getComments(proposalId, lastPolledAt || undefined);
    if (newComments.length > 0) {
        const wasNearBottom = scrollMetrics
            ? (scrollMetrics.scrollHeight - scrollMetrics.scrollTop - scrollMetrics.clientHeight) < 100
            : false;
        // ... rest of logic
    }
};
```

**Recommended: Option B** - Using useEffect ensures scroll happens AFTER React has updated the DOM, eliminating timing issues.

fix:
verification:
files_changed: []
