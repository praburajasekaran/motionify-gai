---
title: "fix: user icon dropdown menu and remember me 30-day session"
type: fix
date: 2026-02-21
---

# fix: User Icon Dropdown Menu and Remember Me 30-Day Session

## Overview

Two related authentication UX bugs:

1. **Immediate logout on avatar click** — clicking the user icon/avatar in the sidebar footer calls `logout()` directly with no confirmation. Users are being unintentionally logged out.
2. **"Remember me" ignored** — the main portal login page (`pages/Login.tsx`) never passes `rememberMe` to the magic link request, so all sessions expire in 24 hours regardless of user intent. The backend also only grants 7 days even when `rememberMe=true`, while the UI promises 30 days.

## Problem Statement

### Bug 1 — Avatar click triggers immediate logout

`components/Layout.tsx` lines 307–322 wraps the user avatar, name, and role in a plain `div` with `onClick={logout}`. There is no dropdown, no confirmation, no affordance indicating the action. A single accidental tap/click destroys the user's session immediately.

```tsx
// components/Layout.tsx:309 — CURRENT (wrong)
<div onClick={logout} title="Logout" ...>
  <Avatar ... />
  <p>{user?.name}</p>
  <p>{user?.role}</p>
</div>
```

A second standalone `Log Out` nav item also exists at lines 294–303, creating two separate immediate-logout surfaces in the same sidebar.

### Bug 2 — Remember me is never sent; backend duration wrong

**Portal login page never passes `rememberMe`:**
```tsx
// pages/Login.tsx:77 — CURRENT (omits rememberMe)
await requestMagicLink({ email });
// rememberMe is never set → backend stores remember_me = false → 24h session always
```

**Backend grants 7 days even when rememberMe=true (UI says 30 days):**
```ts
// netlify/functions/_shared/jwt.ts:26
const TOKEN_EXPIRY_REMEMBER = '7d';  // ← should be '30d'

// netlify/functions/_shared/jwt.ts:112
rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60  // ← 7d should be 30d
```

**Duplicate `Max-Age` attribute (latent bug):**
```ts
// netlify/functions/_shared/jwt.ts:119-120
`Max-Age=${maxAge}`,
`Max-Age=${maxAge}`,  // ← duplicate
```

## Proposed Solution

### Bug 1 — Replace avatar div with a Radix dropup menu

Replace `onClick={logout}` on the user footer div with a `DropdownMenu` (Radix UI, `side="top"`) so the user must explicitly choose to log out. Remove the redundant standalone logout nav item since logout is now accessible from the avatar dropdown.

**Dropdown contents:**

```
┌──────────────────────────┐
│ [Avatar] Name            │  ← DropdownMenuLabel (non-interactive)
│          role            │
├──────────────────────────┤
│ ⚙  Settings             │  ← Link to /settings
├──────────────────────────┤
│ ↩  Log Out              │  ← calls logout()
└──────────────────────────┘
         ▲ opens upward (side="top")
[Avatar] Name   role        ← trigger (current footer)
```

### Bug 2 — Wire remember me end-to-end with 30-day sessions

1. Add "Remember me for 30 days" checkbox to `pages/Login.tsx`
2. Pass `rememberMe` boolean to `requestMagicLink()`
3. Fix backend to honour 30 days: update `jwt.ts` constants and `auth-verify-magic-link.ts`
4. Fix the duplicate `Max-Age` attribute in `jwt.ts`

## Technical Considerations

- **Radix `DropdownMenu` vs. design-system `DropdownMenu`** — Use `components/ui/dropdown-menu.tsx` (the Radix-based one) directly. It supports `side="top"` for the dropup behaviour needed here. The homegrown design-system `DropdownMenu` only opens downward and has no `side` prop.
- **Mobile sidebar close** — When a dropdown item is selected on mobile, the sidebar overlay (`sidebarOpen`) must be dismissed. Both the Settings link and Log Out item should call `setSidebarOpen(false)`.
- **`setSidebarOpen` prop threading** — The sidebar footer lives inside the `Layout` component which already owns `sidebarOpen` / `setSidebarOpen` state, so no prop drilling is needed.
- **Lucide icons** — Use `Settings` and `LogOut` from `lucide-react` (already imported in `Layout.tsx`). Convention: always use Lucide icons in React components.
- **`MagicLinkRequestBody` already typed** — `lib/auth.ts` line 21–24 already includes `rememberMe?: boolean` in the request body type. No type change required.
- **`auth-verify-magic-link.ts` session duration** — Line 295 independently hard-codes `7 * 24 * 60 * 60`; must be updated to match `jwt.ts`.
- **`landing-page-new` label** — `landing-page-new/src/lib/portal/components/LoginScreen.tsx` line 199 already says "30 days"; no change needed there once the backend is fixed.

## Acceptance Criteria

### Bug 1 — Dropdown

- [x] Clicking the user avatar/name/role area in the sidebar footer opens a dropup menu — it does NOT log the user out
- [x] The dropup menu shows: user name, user role (as label), Settings link, separator, Log Out item
- [x] Clicking **Settings** navigates to `/settings` and closes the dropdown
- [x] Clicking **Log Out** calls `logout()` (POST to `/auth-logout`, clear state, redirect to `/portal/login`)
- [x] Clicking anywhere outside the dropdown closes it without logging out
- [x] On mobile, selecting any dropdown item also closes the sidebar overlay
- [x] The standalone "Log Out" sidebar nav item (formerly at lines 294–303) is removed
- [x] Keyboard navigation works: Tab/Arrow keys move between items, Enter activates, Escape closes
- [x] The footer trigger has a visual affordance (e.g. `ChevronUp` icon or hover ring) indicating interactivity

### Bug 2 — Remember Me

- [x] `pages/Login.tsx` shows a "Remember me for 30 days" checkbox below the email field
- [x] Checking the box and submitting sends `{ email, rememberMe: true }` to `/auth-request-magic-link`
- [x] After verifying the magic link with `rememberMe=true`, the `Set-Cookie` response header shows `Max-Age=2592000` (30 days = 2,592,000 seconds)
- [x] With `rememberMe=false` (unchecked), `Max-Age=86400` (24 hours)
- [x] The duplicate `Max-Age` line in `jwt.ts` is removed
- [x] The JWT expiry constant `TOKEN_EXPIRY_REMEMBER` reads `'30d'`
- [ ] Refreshing the page after login (with remember me checked) keeps the user logged in for up to 30 days

## Success Metrics

- Zero accidental logout reports from clicking the avatar area
- Users who check "Remember me" are not prompted to re-authenticate for 30 days

## Dependencies & Risks

| Item | Notes |
|---|---|
| `@radix-ui/react-dropdown-menu` | Already in `package.json` line 45 — no install needed |
| `components/ui/dropdown-menu.tsx` | Already exists and exports all needed primitives |
| Backend cookie duration change | 7d → 30d affects existing sessions only at next login; no migration needed |
| Supabase `sessions` table | `auth-verify-magic-link.ts` stores `session_duration_seconds` — must be updated too |

## References & Research

### Bug 1 — Files to change

| File | Lines | Change |
|---|---|---|
| [components/Layout.tsx](components/Layout.tsx#L307-L322) | 307–322 | Replace footer `div onClick={logout}` with Radix `DropdownMenu` |
| [components/Layout.tsx](components/Layout.tsx#L294-L304) | 294–304 | Remove standalone "Log Out" nav item |
| [components/ui/dropdown-menu.tsx](components/ui/dropdown-menu.tsx) | — | Import: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuLabel`, `DropdownMenuItem`, `DropdownMenuSeparator` |

### Bug 2 — Files to change

| File | Lines | Change |
|---|---|---|
| [pages/Login.tsx](pages/Login.tsx#L68-L88) | 68–88 | Add `rememberMe` state, checkbox UI, pass to `requestMagicLink` |
| [netlify/functions/_shared/jwt.ts](netlify/functions/_shared/jwt.ts#L26) | 26 | `TOKEN_EXPIRY_REMEMBER = '30d'` |
| [netlify/functions/_shared/jwt.ts](netlify/functions/_shared/jwt.ts#L112) | 112 | `30 * 24 * 60 * 60` for rememberMe=true |
| [netlify/functions/_shared/jwt.ts](netlify/functions/_shared/jwt.ts#L119-L120) | 119–120 | Remove duplicate `Max-Age` line |
| [netlify/functions/auth-verify-magic-link.ts](netlify/functions/auth-verify-magic-link.ts#L295) | 295 | `30 * 24 * 60 * 60` for rememberMe=true |

### Reference components

- Auth context logout: [contexts/AuthContext.tsx:101-118](contexts/AuthContext.tsx#L101-L118)
- Avatar component: [components/ui/design-system.tsx:349-362](components/ui/design-system.tsx#L349-L362)
- Magic link request type: [lib/auth.ts:21-24](lib/auth.ts#L21-L24)
- Landing login checkbox (reference UI): [landing-page-new/src/lib/portal/components/LoginScreen.tsx:190-202](landing-page-new/src/lib/portal/components/LoginScreen.tsx#L190-L202)

### MVP Pseudocode

#### Layout.tsx — new user footer with dropup

```tsx
// components/Layout.tsx (replace lines 307-322)
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Link } from 'react-router-dom';
import { Settings, LogOut, ChevronUp } from 'lucide-react';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <div className="flex items-center gap-2.5 p-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer group">
      <Avatar src={user?.avatar} fallback={user?.name?.[0] || 'U'} className="h-7 w-7" />
      <div className="flex-1 overflow-hidden min-w-0">
        <p className="text-[14px] font-medium truncate text-foreground">{user?.name || 'User'}</p>
        <p className="text-[12px] text-muted-foreground truncate">{user?.role ? getRoleLabel(user.role) : 'User'}</p>
      </div>
      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  </DropdownMenuTrigger>
  <DropdownMenuContent side="top" align="start" className="w-56">
    <DropdownMenuLabel>
      <p className="text-sm font-medium">{user?.name}</p>
      <p className="text-xs text-muted-foreground">{user?.role ? getRoleLabel(user.role) : ''}</p>
    </DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem asChild>
      <Link to="/settings" onClick={() => setSidebarOpen(false)}>
        <Settings className="mr-2 h-4 w-4" />
        Settings
      </Link>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={() => { setSidebarOpen(false); logout(); }} className="text-destructive">
      <LogOut className="mr-2 h-4 w-4" />
      Log Out
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

#### pages/Login.tsx — add remember me checkbox

```tsx
// pages/Login.tsx — add state + checkbox
const [rememberMe, setRememberMe] = React.useState(false);

// In the form, below the email input:
<label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
  <input
    type="checkbox"
    checked={rememberMe}
    onChange={(e) => setRememberMe(e.target.checked)}
    className="rounded border-input"
  />
  Remember me for 30 days
</label>

// Change requestMagicLink call:
await requestMagicLink({ email, rememberMe });
```

#### jwt.ts — fix durations

```ts
// netlify/functions/_shared/jwt.ts
const TOKEN_EXPIRY_REMEMBER = '30d';  // was '7d'

// in createAuthCookie:
const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;  // was 7 * 24 * 60 * 60
// Remove the duplicate Max-Age line
```

#### auth-verify-magic-link.ts — fix session duration

```ts
// netlify/functions/auth-verify-magic-link.ts:295
const sessionDurationSeconds = tokenRecord.remember_me
  ? 30 * 24 * 60 * 60   // was 7 * 24 * 60 * 60
  : 24 * 60 * 60;
```
