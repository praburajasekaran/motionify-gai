---
title: Rich Text Editor for Proposal Description
type: feat
date: 2026-02-03
---

# Rich Text Editor for Proposal Description

## Overview

Replace the plain `<textarea>` for "Project Description" in the proposal form with a Tiptap rich text editor supporting bold, italic, headings, bullet lists, ordered lists, and paragraph formatting. The editor will store HTML in the existing `description TEXT` column and render formatted content in both admin and client-facing views.

## Files to Be Modified

### Admin Portal (React/Vite)

| # | File | Change |
|---|------|--------|
| 1 | `package.json` | Add Tiptap dependencies |
| 2 | **NEW** `components/ui/RichTextEditor.tsx` | Reusable Tiptap editor component with toolbar |
| 3 | `pages/admin/ProposalBuilder.tsx` | Replace `<textarea>` with `<RichTextEditor>` |
| 4 | `pages/admin/ProposalDetail.tsx` | Replace `<textarea>` (edit mode) and `<p>` (view mode) with editor/HTML renderer |

### Client-Facing Landing Page (Next.js)

| # | File | Change |
|---|------|--------|
| 5 | `landing-page-new/package.json` | Add `@tiptap/react`, `@tiptap/starter-kit` (for read-only rendering) |
| 6 | `landing-page-new/src/components/proposal/ProposalReview.tsx` | Render HTML description instead of plain text |

### Backend

| # | File | Change |
|---|------|--------|
| 7 | `netlify/functions/_shared/schemas.ts` | Increase `max` on description Zod schema (HTML tags add overhead) |

**Total: 6 modified files + 1 new file**

## Step-by-Step Implementation Plan

### Step 1: Install Tiptap Dependencies

Install in admin portal root:
```
@tiptap/react
@tiptap/starter-kit (includes Bold, Italic, Heading, BulletList, OrderedList, Paragraph, etc.)
@tiptap/extension-placeholder
```

Install in `landing-page-new/`:
```
@tiptap/react
@tiptap/starter-kit
```

### Step 2: Create `components/ui/RichTextEditor.tsx`

Build a reusable rich text editor component with:

**Props:**
- `content: string` (HTML string)
- `onChange: (html: string) => void`
- `placeholder?: string`
- `editable?: boolean` (default `true`)

**Toolbar buttons** (using Lucide React icons):
- **Bold** (`Bold` icon) — toggles `bold` mark
- **Italic** (`Italic` icon) — toggles `italic` mark
- **Heading 1** (`Heading1` icon) — toggles `heading` level 1
- **Heading 2** (`Heading2` icon) — toggles `heading` level 2
- **Heading 3** (`Heading3` icon) — toggles `heading` level 3
- **Paragraph** (`Pilcrow` icon) — sets block to `paragraph` (clears heading)
- **Bullet List** (`List` icon) — toggles `bulletList`
- **Ordered List** (`ListOrdered` icon) — toggles `orderedList`

**Toolbar design** (Basecamp-inspired):
- Horizontal row of icon buttons above the editor area
- Active formatting state highlighted (e.g., `bg-muted` or `text-violet-500`)
- Buttons grouped with subtle dividers
- Toolbar only visible when `editable` is `true`

**Editor styling:**
- Match existing textarea design: `bg-muted border border-border rounded-lg text-foreground`
- Focus ring: `focus-within:ring-2 focus-within:ring-violet-500/50`
- Toolbar + editor wrapped in a single bordered container
- Min height ~6 rows to match current textarea
- `prose` class applied to editor content area for typography

### Step 3: Update `ProposalBuilder.tsx`

- Replace the `<textarea>` element (lines 297-303) with `<RichTextEditor>`
- Change `description` state from plain text to HTML string
- `onChange` handler: `setDescription(html)` (replaces `setDescription(e.target.value)`)
- Validation: adjust `validateForm()` — strip HTML tags before checking `trim()` length to detect empty rich text (`<p></p>` is not empty-looking but has no real content)

### Step 4: Update `ProposalDetail.tsx`

**Edit mode (line 607-613):**
- Replace `<textarea>` with `<RichTextEditor content={description} onChange={setDescription} />`

**View mode (line 616):**
- Replace `<p className="... whitespace-pre-wrap">{proposal.description}</p>`
- With `<div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: proposal.description }} />`
- Add detection: if description doesn't contain HTML tags, wrap in `<p>` tags and preserve newlines (backward compatibility for existing plain text descriptions)

### Step 5: Update `ProposalReview.tsx` (Client-Facing)

- Replace the plain text render (lines 89-91) with HTML rendering
- Use `dangerouslySetInnerHTML` within the existing `prose prose-sm max-w-none` container
- Add same backward compatibility: detect plain text vs HTML and handle both

### Step 6: Update Zod Validation Schema

In `netlify/functions/_shared/schemas.ts`:
- Increase `max` from `10000` to `50000` on both `createProposalSchema.description` and `updateProposalSchema.description` (HTML tags add ~2-3x overhead)
- Keep `min(10)` as-is (HTML content will still pass this easily)

## Assumptions and Edge Cases

### Assumptions

1. **HTML storage format** — Tiptap output stored as HTML string in the existing `TEXT` column. No schema migration needed.
2. **No server-side sanitization** — Tiptap generates safe HTML from its own schema (no script tags possible). The editor only allows the marks/nodes configured in StarterKit. If server-side sanitization is desired later, it can be added independently.
3. **Backward compatibility** — Existing proposals have plain text descriptions. The renderer will detect plain text (no HTML tags) and display it with `whitespace-pre-wrap` preserved, or wrap in `<p>` tags.
4. **Single toolbar style** — Same toolbar for both create and edit modes.

### Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Existing plain text descriptions | Detect via regex (`/<[^>]+>/`). If no HTML tags, render with `whitespace-pre-wrap` or convert `\n` to `<br>` |
| Empty editor content | Tiptap returns `<p></p>` for empty. Strip tags and trim to check for real content in validation |
| Copy-paste from Word/Google Docs | Tiptap's StarterKit handles paste normalization — strips unsupported formatting, keeps supported marks |
| Very long content | Zod max increased to 50000 chars. UI scrolls naturally. |
| Editor in dark mode | Uses CSS variables (`text-foreground`, `bg-muted`, etc.) — inherits theme automatically |
| Toolbar keyboard shortcuts | Tiptap provides built-in: Cmd+B (bold), Cmd+I (italic), etc. — no extra work needed |

## What Will NOT Be Changed

- Database schema (no migration needed — `TEXT` column stores HTML strings fine)
- API endpoint logic in `netlify/functions/proposals.ts` (description passes through as string)
- `lib/proposals.ts` client-side API functions (description is still a string)
- Any other form fields (deliverables, pricing, currency, etc.)
- Comment system (`CommentInput.tsx`)
- MentionInput component
- Styling of any other pages or components
- Config files (vite.config, tailwind.config, tsconfig, netlify.toml)
- Build scripts or CI/CD pipeline
- Any other proposal fields besides `description`

## References

- `pages/admin/ProposalBuilder.tsx:297-303` — current textarea to replace
- `pages/admin/ProposalDetail.tsx:607-613` — edit mode textarea
- `pages/admin/ProposalDetail.tsx:616` — view mode plain text render
- `landing-page-new/src/components/proposal/ProposalReview.tsx:88-92` — client-facing render
- `netlify/functions/_shared/schemas.ts:41,51` — Zod validation schemas
- `database/schema.sql:74` — `description TEXT NOT NULL` column
