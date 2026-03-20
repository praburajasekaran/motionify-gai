---
status: diagnosed
trigger: "Comment submit button not submitting the comment with file attachment"
created: 2026-01-21T00:00:00Z
updated: 2026-01-21T00:00:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: Submit handler may not be including attachment data when posting comment
test: examining CommentInput and CommentThread submit flow
expecting: to find where attachment data gets lost in the submit chain
next_action: locate CommentInput in client portal and trace submit handler

## Symptoms

expected: Submit button posts comment with file attachment to the database
actual: Comment submit button not submitting the comment with file attachment
errors: none specified
reproduction: Attach a file to a comment and click submit button
started: UAT Test 2

## Eliminated

## Evidence

- timestamp: 2026-01-21T00:05:00Z
  checked: landing-page-new/src/components/CommentInput.tsx
  found: Line 166 - handleSubmit calls onSubmit(content.trim()) without passing pendingAttachments
  implication: Attachment data never reaches CommentThread

- timestamp: 2026-01-21T00:06:00Z
  checked: landing-page-new/src/components/CommentThread.tsx
  found: Lines 186-204 - handleSubmit expects attachments via pendingAttachmentsRef.current (set by onAttachmentsChange callback), but CommentInput never passes attachment IDs to the onSubmit callback
  implication: CommentThread stores attachments in ref via onAttachmentsChange, but CommentInput's onSubmit signature includes optional attachmentIds parameter that's never used

- timestamp: 2026-01-21T00:07:00Z
  checked: CommentInput interface (line 7)
  found: onSubmit signature is (content: string, attachmentIds?: string[]) but handleSubmit only passes content
  implication: The interface supports passing attachment IDs but implementation doesn't use it

- timestamp: 2026-01-21T00:08:00Z
  checked: components/proposals/CommentInput.tsx (admin portal)
  found: Identical bug at line 166 - same issue affects both admin and client portals
  implication: Both portals need the same fix

## Resolution

root_cause: CommentInput.handleSubmit only passes content to onSubmit callback, ignoring pendingAttachments state - line 166 calls await onSubmit(content.trim()) without the optional attachmentIds parameter
fix:
verification:
files_changed: []
