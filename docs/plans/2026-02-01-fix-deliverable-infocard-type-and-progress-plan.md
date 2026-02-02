---
title: "Fix Deliverable Info Card: Auto-detect Type from Files, Compute Progress from Status"
type: fix
date: 2026-02-01
---

# Fix Deliverable Info Card: Auto-detect Type from Files, Compute Progress from Status

## Overview

The deliverable details sidebar shows two incorrect values:
1. **Type** always displays "Video" regardless of actual uploaded files (a `.png` image shows as "Video")
2. **Progress** displays "% Complete" with no numeric value (renders as `undefined% Complete`)

Both fields have no database column — they exist only in the TypeScript interface. The frontend transformation in `DeliverableContext.tsx` hardcodes `type` to `'Video'` and never sets `progress` at all.

## Root Cause Analysis

| Field | DB Column? | API Returns? | Frontend Transform | Result |
|-------|-----------|-------------|-------------------|--------|
| `type` | No `type` column in `deliverables` table | No | `d.type \|\| 'Video'` (line 425) — always `'Video'` since DB never has it | Always "Video" |
| `progress` | No `progress` column in `deliverables` table | No | **Not set at all** — omitted from transform (line 420-439) | `undefined` |

## Proposed Solution

**Do NOT add database columns.** Both values can be derived from existing data:

### 1. Type: Derive from uploaded files' MIME types

The `deliverable_files` table already stores `mime_type` and `file_category` for each uploaded file. The dominant file category determines the deliverable type:

- If any file has `file_category = 'video'` → Type is "Video"
- Else if any file has `file_category = 'image'` → Type is "Image"
- Else if any file has `file_category IN ('document', 'script')` → Type is "Document"
- Else if no files uploaded → Type is "—" (no type yet)

This mirrors how Frame.io and similar platforms auto-detect asset type from the actual uploaded content rather than requiring manual classification.

### 2. Progress: Derive from deliverable status

Map each status to a meaningful progress percentage. This is the standard approach used by Monday.com, ClickUp, and Asana for status-driven progress:

| Status | Progress | Rationale |
|--------|----------|-----------|
| `pending` | 0% | Not started |
| `in_progress` | 25% | Work underway |
| `beta_ready` | 50% | Beta file uploaded |
| `awaiting_approval` | 60% | Sent to client for review |
| `revision_requested` | 40% | Back in revision cycle |
| `approved` | 75% | Client approved, awaiting payment |
| `payment_pending` | 85% | Payment in process |
| `final_delivered` | 100% | Complete |

### 3. Sidebar UI Enhancement

Replace the raw "% Complete" text with a progress bar + percentage for better visual communication. Show a "—" or "No files yet" state when type can't be determined.

## Exact Files to Modify

| # | File | What Changes |
|---|------|-------------|
| 1 | `netlify/functions/deliverables.ts` | JOIN `deliverable_files` to include dominant file category in GET responses |
| 2 | `components/deliverables/DeliverableContext.tsx` | Compute `type` from file categories; compute `progress` from status |
| 3 | `components/deliverables/DeliverableMetadataSidebar.tsx` | Add progress bar, handle "no type" state, add file-type icon |

## Step-by-Step Implementation Plan

### Step 1: Add file category data to deliverables API response

**File:** `netlify/functions/deliverables.ts`

In both GET handlers (single deliverable by `id` and list by `projectId`), add a subquery or JOIN to fetch the dominant file category from `deliverable_files`:

```sql
SELECT d.*,
  (SELECT file_category FROM deliverable_files
   WHERE deliverable_id = d.id
   ORDER BY CASE file_category
     WHEN 'video' THEN 1
     WHEN 'image' THEN 2
     WHEN 'document' THEN 3
     WHEN 'script' THEN 4
     ELSE 5 END
   LIMIT 1) as dominant_file_category
FROM deliverables d ...
```

This adds a single `dominant_file_category` field to each deliverable response without changing the table schema.

### Step 2: Compute `type` and `progress` in frontend transform

**File:** `components/deliverables/DeliverableContext.tsx` (lines 420-439)

In the `transformedDeliverables` map:

**For type** (replace hardcoded `'Video'`):
```typescript
type: d.dominant_file_category === 'video' ? 'Video'
    : d.dominant_file_category === 'image' ? 'Image'
    : ['document', 'script'].includes(d.dominant_file_category) ? 'Document'
    : null, // no files uploaded yet
```

**For progress** (add missing field):
```typescript
progress: STATUS_PROGRESS_MAP[d.status] ?? 0,
```

Where `STATUS_PROGRESS_MAP` is a const defined above the transform:
```typescript
const STATUS_PROGRESS_MAP: Record<string, number> = {
  pending: 0,
  in_progress: 25,
  beta_ready: 50,
  awaiting_approval: 60,
  revision_requested: 40,
  approved: 75,
  payment_pending: 85,
  final_delivered: 100,
};
```

### Step 3: Update the sidebar UI

**File:** `components/deliverables/DeliverableMetadataSidebar.tsx`

1. **Type field**: Show type with a Lucide icon (FileVideo, FileImage, FileText). If type is null, show "No files yet" in muted text.

2. **Progress field**: Replace plain text `{deliverable.progress}% Complete` with:
   - A visual progress bar (use existing `Progress` component from design system)
   - The percentage label next to it
   - Color-code: zinc for 0%, blue for 1-59%, amber for 60-84%, emerald for 85-100%

## Assumptions and Edge Cases

1. **No files uploaded yet**: Type shows "—" or "No files yet". Progress is derived from status (a deliverable can be `in_progress` before any files are uploaded).
2. **Mixed file types**: Priority order is video > image > document. If a deliverable has both a video and an image, it's classified as "Video" (the primary asset).
3. **`DeliverableType` union**: The TypeScript type `'Video' | 'Image' | 'Document'` needs to accept `null` for the "no files" case. Update to `DeliverableType | null`.
4. **Existing code referencing `deliverable.type`**: `DeliverableCard.tsx` uses `TYPE_ICONS[deliverable.type]` with a fallback `|| FileVideo`, so `null` will safely fall through to the default icon.
5. **`payment_pending` not in DB CHECK constraint**: The status CHECK constraint in the schema doesn't include `payment_pending`. The progress map includes it defensively, but this status may not currently exist in practice.

## What Will NOT Be Changed

- **Database schema** — no new columns, no migrations
- **`AddDeliverableModal.tsx`** — no type selector added to creation form (type is auto-detected from files)
- **`DeliverableCard.tsx`** — already has fallback icon logic, no changes needed
- **`DeliverableFilesList.tsx`** — file category detection on upload is already correct
- **`netlify/functions/deliverable-files.ts`** — upload API already stores `file_category` correctly
- **`types/deliverable.types.ts`** — only change is making `type` nullable (one-line union update)
- **Config, env, build, or infrastructure files** — untouched
- **Any other components or pages** — scoped to the three files listed above
