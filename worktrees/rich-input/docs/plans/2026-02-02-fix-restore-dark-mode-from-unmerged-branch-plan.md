---
title: "fix: Restore dark mode from unmerged dark-mode branch"
type: fix
date: 2026-02-02
---

# fix: Restore dark mode from unmerged dark-mode branch

## Overview

Dark mode was fully implemented on the `dark-mode` branch (7 commits, 64 files) but was **never merged to `main`**. An attempt to partially bring those changes onto `dark-mode-missing` resulted in an unresolved merge conflict in `pages/ProjectDetail.tsx` (line ~908) and incomplete state. The fix is to merge the `dark-mode` branch into `main` properly.

## Root Cause Analysis

| What | Detail |
|------|--------|
| **Dark mode branch** | `dark-mode` — 7 commits ahead of `main`, diverges at `9418e52` |
| **Current branch** | `dark-mode-missing` — same commit as `main` (`9418e52`) plus uncommitted partial dark-mode changes in `ProjectDetail.tsx` |
| **Merge conflict** | `pages/ProjectDetail.tsx:908` — conflict markers from cherry-pick of `5968dcc` (the semantic token conversion commit) |
| **Conflict area** | Deliverable progress bar section — the `dark-mode` branch added a progress bar widget that doesn't exist on `main` |

### Dark mode commits (on `dark-mode` branch, not merged):

1. `52ffb04` — feat(theme): add ThemeProvider, theme toggle, and logo swap for dark mode
2. `4320707` — feat(theme): convert hardcoded colors to semantic tokens across all portal pages and components
3. `bd051e9` — docs: mark dark mode plan success criteria as complete
4. `0746bc2` — fix(theme): increase dark mode muted-foreground contrast for readability
5. `caa0b8a` — fix(theme): reduce inactive sidebar icon opacity for visual balance
6. `907466f` — fix(theme): separate icon and label colors in sidebar for clear hierarchy
7. `a284588` — fix(theme): lighten sidebar icons to 55% foreground opacity

## Proposed Solution

### Option A: Merge `dark-mode` into `main` (Recommended)

The simplest and cleanest approach — the dark mode work is complete and tested on its branch.

**Steps:**

1. **Discard the broken partial state** on `dark-mode-missing`:
   ```bash
   git checkout -- pages/ProjectDetail.tsx
   ```

2. **Switch to main and merge dark-mode**:
   ```bash
   git checkout main
   git merge dark-mode
   ```

3. **Resolve any merge conflicts** — the only likely conflict is in `pages/ProjectDetail.tsx` around the deliverable progress bar area (added by `deliverable-feedback` PR #14 on main, and also modified by dark-mode token conversion). Resolution: keep both the progress bar feature AND the semantic token classes.

4. **Verify** dark mode works:
   - [ ] Theme toggle appears in Layout header
   - [ ] Clicking toggle switches between light/dark
   - [ ] All portal pages render correctly in dark mode
   - [ ] Sidebar icon opacity is correct
   - [ ] No hardcoded `bg-white`, `text-zinc-*`, `bg-zinc-*` remain in portal pages

5. **Delete cleanup branches**:
   ```bash
   git branch -d dark-mode-missing
   ```

### Option B: Cherry-pick dark-mode commits onto main

If you don't want to merge the branch directly, cherry-pick the 7 commits in order. This is more work and more likely to produce conflicts.

## Acceptance Criteria

- [x] `dark-mode` branch merged into `main` (fast-forward, no conflicts)
- [x] Merge conflict in `ProjectDetail.tsx` resolved (no conflict — fast-forward merge)
- [x] ThemeProvider wraps the app, theme toggle visible in header
- [x] All 64 files from dark-mode branch present with semantic token classes
- [ ] Dark mode renders correctly across all authenticated portal pages
- [x] No merge conflict markers remain in any file
- [x] `dark-mode-missing` branch cleaned up

## Risk Assessment

**Low risk** — the dark mode work is self-contained (CSS token swaps + ThemeProvider + toggle). The only merge conflict will be in `ProjectDetail.tsx` where the deliverable progress bar was added after the dark-mode branch diverged.

## Context

- Dark mode plan: `docs/plans/2026-02-02-feat-dark-mode-portal-pages-plan.md` (on `dark-mode` branch)
- Dark mode CSS variables already defined in `index.css:164-217`
- `next-themes` already installed
- Dark logo asset: `public/motionify-dark-logo.png` (on `dark-mode` branch)
