---
status: investigating
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

## Resolution

root_cause: API /comments endpoint likely returning ALL comments when `since` parameter is provided, instead of filtering for only NEW comments. The pollForNewComments deduplication logic (lines 174-183) should prevent duplicates, but there's a critical flaw: the deduplication only checks against existing state, but if the API returns the SAME new comment multiple times across different polling cycles, and lastPolledAt is not being updated correctly, the same "new" comment could be added multiple times.

SPECIFIC ISSUE: Line 203-204 updates lastPolledAt OUTSIDE the setComments callback, using newComments array BEFORE deduplication. If newComments contains duplicates or already-existing comments, lastPolledAt might not advance correctly, causing the next poll to fetch the same comments again.

SECONDARY ISSUE: Need to verify API behavior - check if comments API endpoint respects the `since` parameter correctly.

fix:
verification:
files_changed: []
