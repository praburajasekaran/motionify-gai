---
module: Authentication
date: 2026-02-21
problem_type: ui_bug
component: authentication
symptoms:
  - "Clicking the user avatar/icon in sidebar footer immediately logs the user out"
  - "No dropdown menu appears on user icon click — logout happens with no confirmation"
root_cause: logic_error
resolution_type: code_fix
severity: high
tags: [dropdown, logout, sidebar, radix-ui, ux, user-avatar, dropup]
---

# Troubleshooting: User Icon Click Immediately Logs Out Instead of Opening Dropdown

## Problem

Clicking the user profile area (avatar + name) at the bottom of the sidebar footer immediately
logs the user out with no confirmation or menu shown. Logout should only trigger from an explicit
"Log Out" menu item inside a dropdown.

## Environment

- Module: Authentication
- Affected Component: `components/Layout.tsx` — sidebar footer user section
- Date: 2026-02-21

## Symptoms

- Any click on the user avatar/name/role text in the sidebar footer logs out immediately
- No dropdown or confirmation dialog is shown
- User has to log back in via magic link email every time they accidentally click the area

## What Didn't Work

**Direct solution:** The problem was identified on first inspection — the user footer div had
`onClick={logout}` directly on the container.

## Solution

Replace the plain `onClick={logout}` div with a Radix UI `DropdownMenu` using `side="top"` (dropup,
since the trigger is at the bottom of the sidebar).

**Code change in `components/Layout.tsx`:**

```tsx
// Before (broken) — entire footer div triggers logout on any click:
<div
  className="flex items-center gap-2.5 p-2 rounded-md hover:bg-accent/50 cursor-pointer"
  onClick={logout}
>
  <Avatar ... />
  <div>
    <p>{user?.name}</p>
    <p>{user?.role}</p>
  </div>
</div>

// After (fixed) — Radix DropdownMenu with dropup (side="top"):
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator
} from './ui/dropdown-menu';
import { ChevronUp, Settings, LogOut } from 'lucide-react';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <div className="flex items-center gap-2.5 p-2 rounded-md hover:bg-accent/50 cursor-pointer group"
         aria-label="User menu">
      <Avatar ... />
      <div className="flex-1 overflow-hidden min-w-0">
        <p className="text-[14px] font-medium truncate">{user?.name}</p>
        <p className="text-[12px] text-muted-foreground truncate">{getRoleLabel(user.role)}</p>
      </div>
      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </div>
  </DropdownMenuTrigger>
  <DropdownMenuContent side="top" align="start" className="w-56">
    <DropdownMenuLabel className="font-normal">
      <p className="text-sm font-medium">{user?.name}</p>
      <p className="text-xs text-muted-foreground">{getRoleLabel(user.role)}</p>
    </DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem asChild>
      <Link to="/settings" onClick={() => setSidebarOpen(false)}>
        <Settings className="mr-2 h-4 w-4" />Settings
      </Link>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem
      onSelect={() => { setSidebarOpen(false); logout(); }}
      className="text-destructive focus:text-destructive"
    >
      <LogOut className="mr-2 h-4 w-4" />Log Out
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

Also remove the standalone "Log Out" nav item that was previously in the sidebar nav list.

## Why This Works

`DropdownMenuContent` with `side="top"` opens the menu **above** the trigger (dropup), which is
the correct UX for an element anchored to the bottom of the viewport. The `ChevronUp` icon signals
to users that clicking will open an upward menu.

Using `onSelect` (not `onClick`) on `DropdownMenuItem` for logout ensures the Radix menu properly
closes before the logout side effect runs, preventing any race condition with menu state.

## Prevention

- User profile areas (avatar, name, role) at the bottom of sidebars should **always** open a
  dropdown/popover — never trigger destructive actions directly on click.
- For elements at the bottom of the screen, use `side="top"` on `DropdownMenuContent` so the
  menu opens upward and is visible.
- Use `onSelect` (not `onClick`) on Radix `DropdownMenuItem` when the handler has side effects,
  to ensure the menu closes first.
- The standalone "Log Out" nav item in the sidebar becomes redundant once logout lives in the
  user dropdown — remove it to avoid duplication.

## Related Issues

No related issues documented yet.
