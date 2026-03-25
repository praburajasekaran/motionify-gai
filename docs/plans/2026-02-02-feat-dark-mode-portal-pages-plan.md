---
title: "feat: Add dark mode support to all authenticated portal pages"
type: feat
date: 2026-02-02
branch: dark-mode
---

# feat: Add dark mode support to all authenticated portal pages

## Overview

Wire up the existing `next-themes` library and CSS variable dark theme (already defined in `index.css`) so all authenticated portal pages support dark mode with a user-togglable theme switcher in the Layout header. No new dependencies required — the CSS variables, `.dark` selector, and `next-themes` package are already in place but not connected.

## Problem Statement / Motivation

The project already has a complete dark theme defined in CSS (`index.css:164-217`) and `next-themes` installed, but there is no `ThemeProvider` in the component tree and no toggle UI. Additionally, many portal components use hardcoded Tailwind color classes (`bg-white`, `text-gray-900`, `bg-zinc-50`, `border-zinc-200`, etc.) instead of the semantic design tokens (`bg-background`, `text-foreground`, `bg-card`, `border-border`, etc.) that automatically respond to the `.dark` class.

## Scope

**In scope:** All authenticated pages rendered inside `<Layout>` (the `<ProtectedRoute>` wrapper), plus the Layout shell itself and shared UI components used by those pages.

**Out of scope:** Public marketing pages (`LandingPage.tsx`, `Login.tsx`, `InquiryTracking.tsx`), landing components (`Hero.tsx`, `Header.tsx`, `Footer.tsx`, `BrandLogos.tsx`, `PortfolioGrid.tsx`, `SupportSection.tsx`, `ReadyToTellYourStory.tsx`, `CreativeControlRoom.tsx`).

---

## Proposed Solution

### Phase 1: ThemeProvider integration + toggle UI

Add `ThemeProvider` from `next-themes` at the app root and a theme toggle button (Sun/Moon icons from Lucide React) in the Layout header.

### Phase 2: Convert hardcoded colors to semantic tokens

Replace hardcoded Tailwind color classes with semantic design tokens across all in-scope files so the CSS variable swap works automatically.

### Phase 3: Logo swap for dark mode

Use a light variant of the sidebar logo when dark mode is active.

---

## Exact list of files to be modified

### Core wiring (Phase 1)
| # | File | Change |
|---|------|--------|
| 1 | `App.tsx` | Wrap provider stack with `<ThemeProvider>` from `next-themes` |
| 2 | `components/Layout.tsx` | Add theme toggle button (Sun/Moon) in header; swap sidebar logo based on theme; convert hardcoded colors to semantic tokens |
| 3 | `components/ui/sonner.tsx` | Already uses `useTheme()` — no change needed, will work once ThemeProvider is added |

### Portal pages — hardcoded color fixes (Phase 2)
| # | File | Change |
|---|------|--------|
| 4 | `pages/Dashboard.tsx` | Replace `bg-white`, `text-gray-900`, `ring-gray-200` with semantic tokens |
| 5 | `pages/ProjectList.tsx` | Replace `bg-white`, `border-zinc-200`, `bg-white/50` with semantic tokens |
| 6 | `pages/ProjectDetail.tsx` | Replace hardcoded gray/white/zinc classes with semantic tokens |
| 7 | `pages/ProjectSettings.tsx` | Replace `bg-white`, `border-zinc-200`, `text-gray-*` with semantic tokens |
| 8 | `pages/CreateProject.tsx` | Replace hardcoded color classes with semantic tokens |
| 9 | `pages/DeliverableReview.tsx` | Replace hardcoded color classes with semantic tokens |
| 10 | `pages/Settings.tsx` | Replace hardcoded color classes with semantic tokens |
| 11 | `pages/admin/InquiryDashboard.tsx` | Replace hardcoded color classes with semantic tokens |
| 12 | `pages/admin/InquiryDetail.tsx` | Replace hardcoded color classes with semantic tokens |
| 13 | `pages/admin/ProposalBuilder.tsx` | Replace hardcoded color classes with semantic tokens |
| 14 | `pages/admin/ProposalDetail.tsx` | Replace hardcoded color classes with semantic tokens |
| 15 | `pages/admin/UserManagement.tsx` | Replace hardcoded color classes with semantic tokens |
| 16 | `pages/admin/ActivityLogs.tsx` | Replace hardcoded color classes with semantic tokens |
| 17 | `pages/admin/Payments.tsx` | Replace hardcoded color classes with semantic tokens |
| 18 | `pages/client/Payment.tsx` | Replace hardcoded color classes with semantic tokens |

### Shared UI components — hardcoded color fixes (Phase 2)
| # | File | Change |
|---|------|--------|
| 19 | `components/ui/ConfirmDialog.tsx` | Replace `bg-white`, `text-gray-*`, `bg-gray-50` with semantic tokens |
| 20 | `components/ui/SkeletonLoaders.tsx` | Replace `bg-white`, `bg-zinc-200`, `border-zinc-200` with semantic tokens |
| 21 | `components/ui/design-system.tsx` | Replace `bg-white`, `text-zinc-900`, `text-zinc-500` with semantic tokens |
| 22 | `components/ui/Modal.tsx` | Replace hardcoded overlay/background colors with semantic tokens |
| 23 | `components/ui/EmptyState.tsx` | Replace hardcoded color classes with semantic tokens |
| 24 | `components/ui/ErrorState.tsx` | Replace hardcoded color classes with semantic tokens |
| 25 | `components/ui/VideoPlayer.tsx` | `bg-black` is intentional for video — verify, likely no change needed |
| 26 | `components/KeyboardShortcutsHelp.tsx` | Replace hardcoded color classes with semantic tokens |
| 27 | `components/notifications/NotificationBell.tsx` | Replace hardcoded color classes with semantic tokens |
| 28 | `components/notifications/NotificationDropdown.tsx` | Replace hardcoded color classes with semantic tokens |
| 29 | `components/notifications/NotificationItem.tsx` | Replace hardcoded color classes with semantic tokens |

### Feature-specific components (Phase 2)
| # | File | Change |
|---|------|--------|
| 30 | `components/deliverables/DeliverableCard.tsx` | Replace hardcoded color classes |
| 31 | `components/deliverables/DeliverablesTab.tsx` | Replace hardcoded color classes |
| 32 | `components/deliverables/DeliverableFilesList.tsx` | Replace hardcoded color classes |
| 33 | `components/deliverables/DeliverableListItem.tsx` | Replace hardcoded color classes |
| 34 | `components/deliverables/DeliverableMetadataSidebar.tsx` | Replace hardcoded color classes |
| 35 | `components/deliverables/DeliverablesList.tsx` | Replace hardcoded color classes |
| 36 | `components/deliverables/DeliverableVideoSection.tsx` | Replace hardcoded color classes |
| 37 | `components/deliverables/DeliverableReviewModal.tsx` | Replace hardcoded color classes |
| 38 | `components/deliverables/AddDeliverableModal.tsx` | Replace hardcoded color classes |
| 39 | `components/deliverables/BatchUploadModal.tsx` | Replace hardcoded color classes |
| 40 | `components/deliverables/FileUploadZone.tsx` | Replace hardcoded color classes |
| 41 | `components/deliverables/RevisionRequestForm.tsx` | Replace hardcoded color classes |
| 42 | `components/deliverables/RevisionSubmitConfirmation.tsx` | Replace hardcoded color classes |
| 43 | `components/deliverables/AdditionalRevisionRequestModal.tsx` | Replace hardcoded color classes |
| 44 | `components/deliverables/ApprovalTimeline.tsx` | Replace hardcoded color classes |
| 45 | `components/deliverables/FeedbackSummaryPanel.tsx` | Replace hardcoded color classes |
| 46 | `components/deliverables/InlineFeedbackForm.tsx` | Replace hardcoded color classes |
| 47 | `components/deliverables/IssueCategorySelector.tsx` | Replace hardcoded color classes |
| 48 | `components/deliverables/PrioritySelector.tsx` | Replace hardcoded color classes |
| 49 | `components/deliverables/RevisionQuotaIndicator.tsx` | Replace hardcoded color classes |
| 50 | `components/deliverables/VideoCommentTimeline.tsx` | Replace hardcoded color classes |
| 51 | `components/team/TeamTab.tsx` | Replace hardcoded color classes |
| 52 | `components/team/InviteModal.tsx` | Replace hardcoded color classes |
| 53 | `components/tasks/TaskCreateForm.tsx` | Replace hardcoded color classes |
| 54 | `components/tasks/TaskEditModal.tsx` | Replace hardcoded color classes |
| 55 | `components/tasks/CommentItem.tsx` | Replace hardcoded color classes |
| 56 | `components/tasks/MentionInput.tsx` | Replace hardcoded color classes |
| 57 | `components/proposals/CommentInput.tsx` | Replace hardcoded color classes |
| 58 | `components/proposals/CommentItem.tsx` | Replace hardcoded color classes |
| 59 | `components/proposals/CommentThread.tsx` | Replace hardcoded color classes |
| 60 | `components/admin/AdminRevisionRequestsPanel.tsx` | Replace hardcoded color classes |
| 61 | `components/admin/NewInquiryModal.tsx` | Replace hardcoded color classes |
| 62 | `components/files/FileList.tsx` | Replace hardcoded color classes |
| 63 | `components/files/FileUpload.tsx` | Replace hardcoded color classes |
| 64 | `components/payments/PaymentHistory.tsx` | Replace hardcoded color classes |
| 65 | `components/auth/SessionExpiredModal.tsx` | Replace hardcoded color classes |
| 66 | `components/project/TermsBanner.tsx` | Replace hardcoded color classes |
| 67 | `components/brand/MotionifyLogo.tsx` | May need dark-mode-aware variant |

---

## Step-by-step implementation plan

### Step 1: Add ThemeProvider to App.tsx

Wrap the existing provider stack with `<ThemeProvider>` from `next-themes`:

```tsx
// App.tsx
import { ThemeProvider } from 'next-themes';

// In the render:
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  <QueryProvider>
    {/* ...existing providers... */}
  </QueryProvider>
</ThemeProvider>
```

- `attribute="class"` — matches the existing `darkMode: ["class"]` Tailwind config
- `defaultTheme="system"` — respects OS preference on first visit
- `enableSystem` — reacts to OS-level theme changes

### Step 2: Add theme toggle to Layout header

In `components/Layout.tsx`, add a Sun/Moon toggle button next to the `<NotificationBell />`:

```tsx
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react'; // already imported

const { theme, setTheme } = useTheme();
// Toggle button cycles: light → dark → system → light
```

### Step 3: Swap sidebar logo based on theme

In `components/Layout.tsx`, use `resolvedTheme` from `useTheme()` to conditionally render:
- `/motionify-studio-dark.png` (dark logo on light bg) — current behavior
- `/motionify-studio-light.png` (light logo on dark bg) — for dark mode

**Prerequisite:** A light variant logo file must exist at `/public/motionify-studio-light.png`. If it doesn't exist, use CSS `invert` filter as fallback.

### Step 4: Convert Layout.tsx hardcoded colors

Replace in `components/Layout.tsx`:

| Find | Replace with |
|------|-------------|
| `bg-zinc-50` | `bg-background` |
| `bg-white` | `bg-card` |
| `border-zinc-200` | `border-border` |
| `border-zinc-100` | `border-border` |
| `bg-zinc-100` | `bg-muted` |
| `text-zinc-500` | `text-muted-foreground` |
| `text-zinc-400` | `text-muted-foreground` |
| `text-zinc-300` | `text-muted-foreground` |
| `bg-zinc-100/50` | `bg-accent` |
| `hover:bg-zinc-200` | `hover:bg-accent` |
| `border-zinc-300` | `border-border` |
| `ring-white` | `ring-card` |
| `from-white to-zinc-50` | `from-card to-card` |
| `bg-white/50` | `bg-card/50` |

### Step 5: Convert portal pages (batch work)

For each page file listed above, apply the same token mapping:

**Standard replacements (apply across all files):**

| Hardcoded class | Semantic token |
|----------------|----------------|
| `bg-white` | `bg-card` (for card surfaces) or `bg-background` (for page bg) |
| `bg-gray-50`, `bg-zinc-50` | `bg-muted` |
| `bg-gray-100`, `bg-zinc-100` | `bg-muted` |
| `text-gray-900`, `text-zinc-900` | `text-foreground` |
| `text-gray-700`, `text-zinc-700` | `text-foreground` |
| `text-gray-600`, `text-zinc-600` | `text-muted-foreground` |
| `text-gray-500`, `text-zinc-500` | `text-muted-foreground` |
| `text-gray-400`, `text-zinc-400` | `text-muted-foreground` |
| `border-gray-200`, `border-zinc-200` | `border-border` |
| `border-gray-300`, `border-zinc-300` | `border-border` |
| `ring-gray-200`, `ring-zinc-200` | `ring-border` |
| `divide-gray-200`, `divide-zinc-200` | `divide-border` |
| `bg-black/40`, `bg-black/50` | `bg-black/50` (overlay — keep as-is, works in both themes) |
| `shadow-sm`, `shadow-md` | Keep as-is (shadows are neutral) |

**Contextual replacements (use judgment):**
- `bg-gray-100` used as hover state → `bg-accent`
- `bg-white` in input fields → `bg-input` or `bg-background`
- Status colors (`bg-emerald-*`, `bg-amber-*`, `bg-red-*`) → Keep as-is (semantic status, works in both themes)
- `bg-primary`, `text-primary` → Keep as-is (already token-based)

### Step 6: Convert shared UI components

Apply the same token mapping to all UI components listed in the file table above. Pay special attention to:

- **ConfirmDialog.tsx** — modal backdrop, button colors
- **SkeletonLoaders.tsx** — shimmer gradient colors
- **design-system.tsx** — base component styles affect everything
- **Modal.tsx** — overlay and content background

### Step 7: Visual QA pass

After all replacements, test each page in both light and dark mode:
1. Toggle theme using the new button
2. Verify text contrast is readable
3. Verify borders/dividers are visible
4. Verify status badges, charts, and colored indicators still look correct
5. Verify modals/dialogs have correct backdrop and background
6. Verify skeleton loaders animate correctly

---

## Color token mapping reference

These semantic tokens are already defined in `index.css` and `tailwind.config.js`:

| Token | Light value | Dark value | Use for |
|-------|------------|------------|---------|
| `background` | White `oklch(1 0 0)` | Black `oklch(0 0 0)` | Page background |
| `foreground` | Dark blue-black | Near-white | Primary text |
| `card` | Light gray | Dark gray | Card/panel surfaces |
| `card-foreground` | Dark blue-black | Off-white | Text on cards |
| `muted` | Light gray | Dark gray | Subtle backgrounds |
| `muted-foreground` | Medium gray | Medium gray | Secondary text |
| `accent` | Light blue tint | Dark blue tint | Hover states, highlights |
| `accent-foreground` | Blue | Blue | Text in highlighted areas |
| `border` | Light gray | Dark gray | Borders, dividers |
| `input` | Near-white | Dark blue-gray | Input backgrounds |
| `primary` | Blue | Blue | Buttons, links, active states |
| `destructive` | Red | Red | Error states, delete actions |
| `popover` | White | Black | Dropdown/popover backgrounds |

---

## Assumptions and edge cases

### Assumptions
1. `next-themes` (already installed v0.4.6) is compatible with React 19 — it is, per their docs
2. The `.dark` class CSS variables in `index.css:164-217` are complete and tested — they appear complete
3. A light logo variant exists or can be created at `/public/motionify-studio-light.png` — if not, CSS `filter: invert(1)` will be used as fallback
4. The CDN Tailwind script in `index.html` does not conflict — it's overridden by the local Tailwind build, but the inline `<style>` block has its own color variables that may flash briefly; this should be addressed by syncing the inline styles or removing the CDN script (out of scope per constraints)

### Edge cases
1. **Flash of unstyled content (FOUC):** `next-themes` adds a blocking script to prevent theme flash. This is handled automatically by the library.
2. **Server-side hydration mismatch:** Not applicable — this is a client-side SPA (Vite).
3. **`useTheme()` before mount:** `next-themes` returns `undefined` for `resolvedTheme` on first render. The toggle button should handle this gracefully (show a neutral icon until mounted).
4. **Inline styles with hardcoded colors:** Any `style={{ color: '#xxx' }}` patterns won't respond to CSS variable changes. These need manual conversion or `dark:` class overrides.
5. **Third-party embeds:** Razorpay checkout modal has its own styling — cannot be themed. This is acceptable.
6. **Charts:** If any chart libraries render with hardcoded colors, they won't adapt. The `--chart-*` CSS variables exist for this purpose.
7. **Images/media:** Non-SVG images with white backgrounds may look odd in dark mode. Consider adding `rounded` borders or subtle shadows.
8. **Print styles:** Dark mode should not apply when printing. `next-themes` handles this if `disableTransitionOnChange` is not set.

---

## What will NOT be changed

- **Public/marketing pages:** `LandingPage.tsx`, `Login.tsx`, `InquiryTracking.tsx`
- **Landing components:** `Hero.tsx`, `Header.tsx`, `Footer.tsx`, `BrandLogos.tsx`, `PortfolioGrid.tsx`, `SupportSection.tsx`, `ReadyToTellYourStory.tsx`, `CreativeControlRoom.tsx`
- **Config/build files:** `tailwind.config.js`, `postcss.config.js`, `vite.config.ts`, `tsconfig.json`, `package.json`
- **CSS variable definitions:** `index.css` (the `:root` and `.dark` blocks are already correct)
- **index.html:** No changes to the HTML entry point
- **Contexts:** `AuthContext.tsx`, `NotificationContext.tsx` — no visual changes
- **Hooks/utils:** No logic changes to hooks or utility files
- **API layer:** No backend changes
- **Existing behavior:** No changes to routing, state management, or business logic
- **No new dependencies:** Using only `next-themes` (already installed) and `lucide-react` icons (already installed)

---

## Success criteria

- [x] Theme toggle button visible in portal header, cycles between light/dark/system
- [x] User preference persists across page refreshes (localStorage via next-themes)
- [x] System theme preference is respected on first visit
- [x] All portal pages render correctly in both light and dark mode
- [x] No hardcoded `bg-white`, `text-gray-900`, or `border-zinc-200` classes remain in portal files
- [x] Sonner toasts automatically match the active theme
- [x] No FOUC (flash of incorrect theme) on page load
- [x] Sidebar logo swaps appropriately for each theme
