---
phase: 03-attachments-and-notifications
plan: 03
type: execute
wave: 1
autonomous: true
gap_closure: true
status: complete
plan_completed: 2026-01-20
---

# Plan 03-03: Client Portal Notification Infrastructure Summary

**Executed:** 2026-01-20
**Duration:** ~5 minutes

## Overview

Closed verification gaps for COMM-05: In-App Notifications in the client portal. The admin portal had working notification infrastructure (NotificationContext, NotificationBell, CommentThread integration) but the client portal lacked this entirely. This plan ported the notification system to the client portal.

## What Was Built

### Task 1: NotificationContext for Client Portal
**File:** `landing-page-new/src/contexts/NotificationContext.tsx`

- Created new contexts directory in client portal
- Adapted admin NotificationContext for Next.js:
  - Added `'use client'` directive
  - Uses `useAuth` from `@/context/AuthContext` instead of `useAuthContext`
  - Uses `NEXT_PUBLIC_API_URL` environment variable for API base URL
- Exports: `NotificationProvider`, `useNotifications`, `NotificationType`, `AppNotification`, `NOTIFICATION_ICONS`
- Features:
  - Fetches notifications from `/notifications` API
  - Polls for new notifications every 30 seconds
  - Optimistic updates for markAsRead/markAllAsRead
  - Local notification creation via `addNotification`

### Task 2: NotificationProvider Integration in Layout
**File:** `landing-page-new/src/app/layout.tsx`

- Added `NotificationProvider` import
- Wrapped children with NotificationProvider INSIDE AuthProvider
- Enables notification context for entire client portal app

### Task 3: CommentThread Notification Integration
**File:** `landing-page-new/src/components/CommentThread.tsx`

- Added `useNotifications` hook import
- In `pollForNewComments`: triggers in-app notification for new comments from other users
- Notification includes:
  - Type: `comment_created`
  - Title: "New Comment"
  - Message: "{userName} commented on the proposal"
  - ActionUrl: `/proposal/{proposalId}`

### Task 4: NotificationBell Context Migration
**File:** `landing-page-new/src/lib/portal/components/NotificationBell.tsx`

- Replaced `AppContext` (mock data) with `NotificationContext` (real data)
- Uses `useNotifications` hook for notifications, unreadCount, markAsRead, markAllAsRead
- Maps `AppNotification` to `Notification` type for dropdown compatibility
- All existing UI preserved (bell icon, badge, dropdown)

## Deliverables

| Artifact | Status | Path |
|----------|--------|------|
| NotificationContext for client portal | Created | `landing-page-new/src/contexts/NotificationContext.tsx` |
| NotificationProvider in layout | Added | `landing-page-new/src/app/layout.tsx` |
| CommentThread notification trigger | Added | `landing-page-new/src/components/CommentThread.tsx` |
| NotificationBell context migration | Updated | `landing-page-new/src/lib/portal/components/NotificationBell.tsx` |

## Verification

- [x] NotificationContext.tsx exists at `landing-page-new/src/contexts/NotificationContext.tsx`
- [x] NotificationContext exports: NotificationProvider, useNotifications, NotificationType, AppNotification
- [x] layout.tsx wraps app with NotificationProvider (inside AuthProvider)
- [x] CommentThread.tsx imports useNotifications and calls addNotification for new comments
- [x] NotificationBell.tsx uses useNotifications instead of AppContext
- [x] `npm run build` passes for admin portal (Vite)
- [x] `npm run build` passes for client portal (Next.js)

## Key Technical Details

### Provider Hierarchy
```
<AuthProvider>
  <NotificationProvider>
    {children}
  </NotificationProvider>
</AuthProvider>
```
NotificationProvider inside AuthProvider because it needs `user.id` from AuthContext.

### Notification Flow (Client Portal)
```
User B posts comment → Comments API POST →
Creates notification record in DB →
User A's pollForNewComments runs → New comment detected →
addNotification called → NotificationBell badge updates
```

### Type Mapping
AppNotification (NotificationContext) mapped to Notification (notification-types) for dropdown compatibility:
- `timestamp` (number) → `createdAt` (Date)
- Added `icon` from NOTIFICATION_ICONS lookup
- Added `category` from type-to-category mapping
- Added placeholder fields for unused properties

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| ad98b6a | feat(03-03): create NotificationContext for client portal |
| 6f45f42 | feat(03-03): integrate NotificationProvider in client portal layout |
| 6622790 | feat(03-03): add notification integration to client CommentThread |
| 8d10f2c | feat(03-03): update client NotificationBell to use NotificationContext |

## Gap Closure Result

This plan closes the verification gaps identified in `03-VERIFICATION.md`:

| Failed Truth | Resolution |
|--------------|------------|
| "In-app notification badge updates when new comments are posted" | NotificationContext + CommentThread integration |
| "Clicking in-app notification navigates to the proposal with the comment" | actionUrl in addNotification calls |

## Next Steps

1. Re-run Phase 3 verification (`03-VERIFICATION.md`)
2. Update STATE.md if all gaps closed
3. Proceed to milestone completion
