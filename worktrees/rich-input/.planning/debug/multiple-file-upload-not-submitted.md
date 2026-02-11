---
status: diagnosed
trigger: "Multiple file attachments can be submitted with a single comment - we have not got multiple files uploaded but they are not getting submitted"
created: 2026-01-21T00:00:00Z
updated: 2026-01-21T00:00:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: Multiple files are uploaded but not all sent in API call
test: Check CommentInput file handling and API submission
expecting: Find where multiple files are lost in the flow
next_action: Examine CommentInput component and attachment handling

## Symptoms

expected: Multiple file attachments can be submitted with a single comment
actual: Multiple files uploaded but not getting submitted
errors: None specified
reproduction: Upload multiple files, submit comment
started: During UAT Test 3
severity: major

## Eliminated

## Evidence

- timestamp: 2026-01-21T00:05:00Z
  checked: CommentInput.tsx handleSubmit function (line 155-173)
  found: handleSubmit only accepts content parameter, does not receive or pass attachmentIds
  implication: Attachment data is never sent to the API even though files are uploaded

- timestamp: 2026-01-21T00:06:00Z
  checked: CommentInput.tsx onSubmit prop signature (line 7)
  found: Interface declares onSubmit: (content: string, attachmentIds?: string[]) => Promise<void>
  implication: The prop signature supports attachmentIds, but handleSubmit doesn't use it

- timestamp: 2026-01-21T00:07:00Z
  checked: CommentThread.tsx handleSubmit function (line 129-150)
  found: handleSubmit receives only content parameter, calls createComment with only proposalId and content
  implication: Even if CommentInput sent attachmentIds, CommentThread wouldn't pass them to API

- timestamp: 2026-01-21T00:08:00Z
  checked: CommentInput.tsx pendingAttachments state (line 32, 120-133)
  found: Files are successfully uploaded and stored in pendingAttachments array with r2Key
  implication: Files are uploaded correctly, the issue is submission not including attachment metadata

- timestamp: 2026-01-21T00:09:00Z
  checked: lib/comments.ts CreateCommentData interface (line 14-17)
  found: Interface only defines proposalId and content, no attachment field
  implication: API client doesn't support sending attachment IDs with comment creation

## Resolution

root_cause: CommentInput.handleSubmit does not pass pendingAttachments to onSubmit callback - only sends content string, ignoring all uploaded attachment metadata
fix:
verification:
files_changed: []
