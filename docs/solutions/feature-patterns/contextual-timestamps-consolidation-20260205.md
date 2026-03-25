---
title: "Contextual Timestamps - Consolidating Duplicated Time Formatting"
module: UI Components
date: 2026-02-05
problem_type: code_duplication
component: utils
symptoms:
  - "Multiple components had their own timeAgo/formatRelativeTime implementations"
  - "Inconsistent timestamp display across the app (some showed 'yesterday', others '1 day ago')"
  - "~90 lines of duplicated date formatting logic across 10 files"
root_cause: missing_shared_utility
severity: medium
tags: [code-duplication, date-formatting, DRY, utility-functions]
related_files:
  - utils/dateFormatting.ts
  - landing-page-new/src/lib/portal/utils/dateUtils.ts
---

# Contextual Timestamps - Consolidating Duplicated Time Formatting

## Problem

Multiple components across the codebase had their own implementations of relative time formatting functions (`timeAgo`, `formatRelativeTime`, `formatDistanceToNow`, `formatTimeAgo`). This led to:

1. **Inconsistent user experience**: Some components showed "yesterday", others showed "1 day ago"
2. **Code duplication**: ~90 lines of nearly identical logic spread across 10 files
3. **Maintenance burden**: Fixing a bug or adding features required changes in multiple places

## Symptoms Observed

- Dashboard Recent Activity showing "yesterday" and "2 days ago" without time context
- ActivityLogs, NotificationItem, CommentItem each had their own time formatting
- No hover tooltips showing full date+time

## Investigation

### Files with duplicated implementations found:

| File | Function Name | Lines |
|------|---------------|-------|
| `pages/Dashboard.tsx` | `formatRelativeTime` | 15 |
| `pages/admin/ActivityLogs.tsx` | `getRelativeTime` | 15 |
| `components/notifications/NotificationItem.tsx` | `formatTimeAgo` | 8 |
| `components/proposals/CommentItem.tsx` | `formatDistanceToNow` | 14 |
| `components/deliverables/ApprovalTimeline.tsx` | `formatTimestamp` | 11 |
| `landing-page-new/.../CommentItem.tsx` | `formatDistanceToNow` | 14 |

### Root Cause

A shared `formatTimestamp` utility already existed in two places:
- `utils/dateFormatting.ts` (for admin app)
- `landing-page-new/src/lib/portal/utils/dateUtils.ts` (for portal app)

But individual components weren't using them - they had been written before the utility existed or developers weren't aware of it.

## Solution

### 1. Use existing shared utilities

Both utility files already had a well-designed `formatTimestamp` function that:
- Shows "just now" for < 1 minute
- Shows "X minutes ago at 3:45 PM" for today
- Shows "Yesterday at 3:45 PM" for yesterday
- Shows "Monday at 2:30 PM" for this week
- Shows "Jan 15 at 4:00 PM" for older dates within 7 days
- Shows "Jan 15, 2026" for dates older than 7 days

### 2. Replace local implementations

For each file with a local implementation:

```typescript
// BEFORE - local implementation
function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    // ... more logic
}

// AFTER - use shared utility
import { formatTimestamp } from '../../utils/dateFormatting';

// Then use directly:
{formatTimestamp(notification.timestamp)}
```

### 3. Add tooltips for full date+time

```tsx
// Add tooltip with formatDateTime for hover
<span title={formatDateTime(activity.timestamp) || undefined}>
  {formatTimestamp(activity.timestamp)}
</span>
```

## Files Changed

| File | Change |
|------|--------|
| `pages/Dashboard.tsx` | Removed `formatRelativeTime`, imported `formatTimestamp` |
| `pages/admin/ActivityLogs.tsx` | Removed `getRelativeTime`, imported `formatTimestamp` |
| `pages/admin/UserManagement.tsx` | Added import, updated "Joined" column |
| `components/notifications/NotificationItem.tsx` | Removed `formatTimeAgo`, imported `formatTimestamp` |
| `components/proposals/CommentItem.tsx` | Removed `formatDistanceToNow`, imported `formatTimestamp` |
| `components/deliverables/ApprovalTimeline.tsx` | Removed local `formatTimestamp`, imported from utils |
| `landing-page-new/.../CommentItem.tsx` | Removed `formatDistanceToNow`, imported from dateUtils |
| `landing-page-new/.../UserManagement.tsx` | Added import, updated "Joined" column |
| `landing-page-new/.../UserProfile.tsx` | Added import, updated "Member Since" |
| `landing-page-new/.../profile/page.tsx` | Added import, updated "Member since" badge |

**Result**: 10 files changed, 24 insertions, 113 deletions (~90 lines of duplication removed)

## Prevention

### Guidelines for date/time formatting:

1. **Always use shared utilities**:
   - Admin app: `import { formatTimestamp, formatDateTime } from '@/utils/dateFormatting'`
   - Portal app: `import { formatTimestamp, formatDateTime } from '@/lib/portal/utils/dateUtils'`

2. **Choose the right format**:
   - `formatTimestamp()` - Contextual: relative for recent, absolute for older (use for activity/events)
   - `formatDateTime()` - Full date+time string (use for tooltips)
   - `formatDate()` - Just the date (use for due dates, expiration dates)

3. **Don't create local time formatting functions** - If the shared utility doesn't meet your needs, extend it rather than creating a new local implementation.

## Testing

Verify timestamps display correctly:
- [ ] Dashboard Recent Activity shows "Yesterday at 3:45 PM" format
- [ ] ActivityLogs shows contextual timestamps with hover tooltips
- [ ] Comments show "X minutes ago at TIME" for recent comments
- [ ] User management "Joined" column shows contextual dates

## Related

- [Original feature plan](../../plans/2026-02-03-feat-contextual-timestamp-display-all-entities-plan.md)
- Commit: `2323387` feat(ui): extend contextual timestamps to remaining components
