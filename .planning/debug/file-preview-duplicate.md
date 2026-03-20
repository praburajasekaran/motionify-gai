---
status: diagnosed
trigger: "Uploaded file appears twice in preview - once with complete tag and another with file size info"
created: 2026-01-21T00:00:00Z
updated: 2026-01-21T00:00:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: File preview renders duplicates due to showing both uploading and completed states simultaneously
test: examine CommentInput file preview rendering logic
expecting: find duplicate render conditions or multiple state arrays being displayed
next_action: read CommentInput component and file preview rendering code

## Symptoms

expected: Uploaded file appears once in preview before submitting comment
actual: File displayed twice - once with "complete" tag and another with file size info
errors: none reported
reproduction: Upload one file less than 10mb in CommentInput
started: unknown

## Eliminated

## Evidence

- timestamp: 2026-01-21T00:05:00Z
  checked: CommentInput.tsx lines 186-245
  found: Two separate render blocks - uploadingFiles (lines 186-218) and pendingAttachments (lines 220-245)
  implication: Same file appears in both arrays simultaneously when upload completes

- timestamp: 2026-01-21T00:06:00Z
  checked: uploadFileItem function lines 94-141
  found: At line 117, progress is set to 100, then at lines 120-133 the same file is added to pendingAttachments array
  implication: File remains in uploadingFiles array with progress=100 showing "Complete" tag while also being added to pendingAttachments showing file size

- timestamp: 2026-01-21T00:07:00Z
  checked: removeUploadingFile function line 143-145
  found: Function exists but is only called on X button click, not automatically when upload completes
  implication: Completed uploads stay in uploadingFiles array indefinitely until manually removed

## Resolution

root_cause: Completed files remain in uploadingFiles array (showing "Complete" tag) while simultaneously being added to pendingAttachments array (showing file size), causing duplicate display
fix:
verification:
files_changed: []
