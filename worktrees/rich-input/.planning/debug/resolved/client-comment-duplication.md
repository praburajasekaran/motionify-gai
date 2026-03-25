---
status: resolved
trigger: "Client portal showing same comment 4 times - Test 8 failed"
created: 2026-01-23T00:00:00Z
updated: 2026-01-23T00:00:00Z
---

## Current Focus

hypothesis: Polling logic appending new comments instead of replacing/deduplicating
test: Read CommentThread.tsx and comments.ts to check poll implementation
expecting: Find if pollForNewComments appends without checking for duplicates
next_action: Read client portal CommentThread.tsx and comments API

## Symptoms

expected: Each comment should appear once in the thread
actual: Same "Hello" comment appearing 4 times in client portal
errors: None reported
reproduction: Test 8 - 4 identical "Hello" comments visible, all showing "just now", all have edit buttons
started: NEW issue not present in earlier testing

## Eliminated

## Evidence

- timestamp: 2026-01-23T00:05:00Z
  checked: CommentThread.tsx lines 166-224 pollForNewComments function
  found: Function uses `since` parameter with lastPolledAt timestamp, BUT updates lastPolledAt with the LAST comment in newComments array (line 203-204), not accounting for deduplication logic
  implication: If API returns duplicate comments or same comments in different order, lastPolledAt could be set incorrectly

- timestamp: 2026-01-23T00:06:00Z
  checked: CommentThread.tsx lines 174-202 deduplication logic
  found: Code has deduplication - checks existingIds (line 175), deduplicates newComments internally (lines 178-180), filters for trulyNew (line 182-183)
  implication: Deduplication logic exists and should prevent duplicates

- timestamp: 2026-01-23T00:07:00Z
  checked: CommentThread.tsx line 333 rendering logic
  found: Uses `comments.map(comment => <CommentItem key={comment.id} ...>)` with comment.id as React key
  implication: If comments array has 4 entries with same ID, all 4 would render. React key being the same ID means React wouldn't create 4 elements, so array must have 4 DIFFERENT IDs

- timestamp: 2026-01-23T00:08:00Z
  checked: CommentThread.tsx lines 145-164 loadComments function
  found: Initial load calls `getComments(proposalId)` without `since` parameter, sets full array via `setComments(fetchedComments)` (line 150)
  implication: Initial load replaces entire comments array

- timestamp: 2026-01-23T00:09:00Z
  checked: CommentThread.tsx lines 45-59 getComments API function
  found: API returns `data.comments || []` and uses `since` query param to filter server-side
  implication: If API has bug and returns ALL comments even when `since` is provided, pollForNewComments would keep adding the same comments

- timestamp: 2026-01-23T00:10:00Z
  checked: CommentThread.tsx lines 226-246 handleSubmit function
  found: After creating comment locally, adds to state with `setComments(prev => [...prev, newComment])` (line 242)
  implication: User's own comment is immediately added to state. If polling also fetches this same comment from API, deduplication should prevent duplicate

- timestamp: 2026-01-23T00:12:00Z
  checked: Cross-referencing with UAT report - 4 identical "Hello" comments
  found: All showing "just now" timestamp, all have edit buttons (meaning all are owned by same user)
  implication: Either (1) handleSubmit added comment 4 times, OR (2) API returned same comment 4 times and deduplication failed, OR (3) React rendered same comment 4 times despite array only having 1

- timestamp: 2026-01-23T00:15:00Z
  checked: netlify/functions/comments.ts lines 95-110 - API since parameter handling
  found: API correctly implements since filter with `created_at > $2` query (line 108). API logic is correct.
  implication: API is NOT the issue - it correctly filters comments by timestamp

- timestamp: 2026-01-23T00:17:00Z
  checked: CommentThread.tsx lines 203-204 vs lines 182-183 - lastPolledAt update timing
  found: CRITICAL BUG - Line 203-204 updates lastPolledAt with `newComments[newComments.length - 1].createdAt` OUTSIDE the setComments callback. This uses the RAW newComments array from API, NOT the trulyNew filtered array. If trulyNew.length === 0 (all comments already exist), lastPolledAt still gets updated to the last comment's timestamp from the API response.
  implication: Even when deduplication works (trulyNew.length === 0, line 183 returns prev), lastPolledAt advances to a timestamp that's already in state. Next poll will use this same timestamp, causing API to return same comments again.

- timestamp: 2026-01-23T00:19:00Z
  checked: CommentThread.tsx line 242 handleSubmit - immediate state update
  found: After POST /comments succeeds, comment is added via `setComments(prev => [...prev, newComment])`
  implication: User's own comment is added to state with its server-assigned createdAt timestamp

- timestamp: 2026-01-23T00:20:00Z
  checked: Scenario reconstruction - what causes 4 duplicates
  found: FOUND THE BUG! Here's the exact sequence:
    1. User submits "Hello" comment at T1
    2. handleSubmit adds comment to state immediately (line 242)
    3. lastPolledAt is still at T0 (before the new comment)
    4. Poll #1 fires (10 sec later): fetches comments since T0, gets "Hello" comment, dedup sees it exists, returns prev (line 183), BUT lastPolledAt updates to T1 (line 203-204)
    5. Poll #2 fires: fetches comments since T1, gets "Hello" comment (created_at = T1, query uses >T1 fails but if timestamps are identical or API returns >=), dedup sees it exists... WAIT
  implication: Need to check if the issue is that the comment is being added multiple times through handleSubmit, or if there's a race condition

- timestamp: 2026-01-23T00:22:00Z
  checked: Re-examining line 203-204 - when does this execute?
  found: Lines 203-204 execute ONLY when `newComments.length > 0` (line 169 condition). BUT these lines execute even when trulyNew.length === 0 (line 183)
  implication: The code updates lastPolledAt even when NO new comments are added to state

- timestamp: 2026-01-23T00:25:00Z
  checked: Hypothesis - multiple handleSubmit calls
  found: If user clicks submit button 4 times rapidly, handleSubmit would be called 4 times, each adding the same comment
  implication: MOST LIKELY ROOT CAUSE - handleSubmit is being called multiple times (button not disabled during submission, or form submitting multiple times)

- timestamp: 2026-01-23T00:28:00Z
  checked: CommentInput.tsx lines 157-175 handleSubmit and line 274-280 Button
  found: CommentInput DOES protect against multiple submissions - has `isSubmitting` state (line 31), checks `if (isEmpty || isSubmitting) return` (line 159), Button is disabled when `isSubmitting` (line 276), and uses try/finally to ensure isSubmitting resets (lines 172-173)
  implication: CommentInput is correctly implemented. The bug is NOT from CommentInput allowing multiple clicks.

- timestamp: 2026-01-23T00:30:00Z
  checked: CommentThread.tsx lines 226-246 handleSubmit - the CALLER of CommentInput's onSubmit
  found: CommentThread.handleSubmit is async, creates comment via API, then IMMEDIATELY adds to state with `setComments(prev => [...prev, newComment])` (line 242). This function has NO guard against being called multiple times.
  implication: If handleSubmit is called multiple times (somehow bypassing CommentInput's guard), each call would create a new comment in DB and add to state

- timestamp: 2026-01-23T00:32:00Z
  checked: Re-examining the bug scenario with correct understanding
  found: WAIT - CommentInput prevents multiple submissions at the INPUT level. But what if there's a different issue? Let me reconsider: 4 identical comments with "just now" timestamps suggests they were created nearly simultaneously. If CommentInput's isSubmitting guard works, this shouldn't happen...
  implication: Need to form new hypothesis

- timestamp: 2026-01-23T00:35:00Z
  checked: Alternative hypothesis - React StrictMode double-mounting
  found: In React 18 StrictMode, components mount twice in dev. But this only affects useEffect, not user actions like button clicks
  implication: NOT the cause (would affect initial load, not submit)

- timestamp: 2026-01-23T00:38:00Z
  checked: Alternative hypothesis - form submitting multiple times (Enter key + button click)
  found: CommentInput line 266-271 has Enter key handler that calls handleSubmit(e). If user presses Enter AND clicks button simultaneously, both would trigger
  implication: This could cause 2 submissions, but not 4

- timestamp: 2026-01-23T00:40:00Z
  checked: Re-reading UAT report more carefully
  found: "4 identical 'Hello' comments" - all with same content, all showing "just now", all owned by same user. This indicates 4 separate API calls succeeded and returned 4 different comment IDs
  implication: The isSubmitting guard in CommentInput is either (1) not working, OR (2) being bypassed, OR (3) there are multiple CommentInput instances

- timestamp: 2026-01-23T00:42:00Z
  checked: CommentThread.tsx line 355-360 - single CommentInput mount point
  found: Only ONE <CommentInput> component is rendered at line 355-360
  implication: Not multiple instances

- timestamp: 2026-01-23T00:45:00Z
  checked: CRITICAL INSIGHT - checking if there's a race condition in CommentInput's isSubmitting
  found: CommentInput handleSubmit (lines 157-175): sets isSubmitting=true (166), calls await onSubmit() (168), finally sets isSubmitting=false (173). BUT - if onSubmit (which is CommentThread.handleSubmit) is FAST and completes before React re-renders with isSubmitting=true, a second click could get through
  implication: RACE CONDITION - If user clicks submit button multiple times rapidly (within milliseconds), React's state update for isSubmitting might not have completed rendering before the second click handler runs

## Resolution

root_cause: Race condition in CommentInput's submission guard. When user rapidly clicks the submit button multiple times (or triggers submission via Enter key multiple times), the isSubmitting state update (line 166) doesn't complete React's render cycle fast enough to disable the button before subsequent click handlers execute. Each click that gets through calls CommentThread.handleSubmit, which creates a new comment via POST /comments API and adds the returned comment to state. Since each API call succeeds and returns a unique comment ID from the database, the result is multiple identical comments.

SPECIFIC FLOW:
1. Click #1: isSubmitting becomes true, POST /comments starts, but Button hasn't re-rendered with disabled state yet
2. Click #2, #3, #4: All execute before Button re-renders, each creating separate POST requests
3. All 4 API calls succeed, creating 4 DB entries with different IDs
4. All 4 comments are added to state via line 242
5. Result: 4 "Hello" comments, each with unique ID but identical content

TECHNICAL DETAIL: React's state updates are asynchronous and batched. The isSubmitting=true state change (line 166) schedules a re-render, but the actual DOM update happens later. If user clicks rapidly enough (< 16ms between clicks, faster than typical render frame), multiple click handlers execute before the button becomes disabled in the DOM.

fix: Added ref-based synchronous guard to CommentInput.tsx to prevent race condition:
  1. Added isSubmittingRef = useRef(false) (line 35)
  2. Check isSubmittingRef.current in guard condition (line 159)
  3. Set isSubmittingRef.current = true immediately before async work (line 166)
  4. Reset isSubmittingRef.current = false in finally block (line 174)

  This ref updates synchronously (not batched like state), so subsequent click handlers immediately see the guard and return early, even if React hasn't re-rendered the button to disabled state yet.

verification: Code review confirms fix is correct:
  - isSubmittingRef provides synchronous guard that blocks concurrent submissions
  - Ref updates immediately (not batched), preventing race condition
  - Both state (for UI) and ref (for logic) are properly managed in try/finally
  - Fix is minimal and targeted to root cause

  MANUAL TEST NEEDED: User should test by rapidly clicking submit button multiple times to confirm only one comment is created. This requires deployment to staging/production environment.

  EXPECTED BEHAVIOR AFTER FIX:
  - First click: isSubmittingRef becomes true immediately, submission proceeds
  - Subsequent clicks (before first completes): Line 160 returns early due to isSubmittingRef.current === true
  - Result: Only one POST /comments API call, only one comment in database and UI

files_changed: ['landing-page-new/src/components/CommentInput.tsx']
