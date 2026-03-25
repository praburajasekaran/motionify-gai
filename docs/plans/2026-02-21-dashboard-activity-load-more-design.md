# Dashboard Recent Activity — Load More

**Date:** 2026-02-21
**Status:** Approved

## Context

The Dashboard's Recent Activity table currently shows a fixed 10 items. Clients want to browse older activity without navigating away. A "Load More" button is the simplest solution — it fetches 10 additional items per click and appends them to the list, disappearing when all records are exhausted.

## Design

### What changes

Single file: `pages/Dashboard.tsx`

### New state

| State | Type | Initial | Purpose |
|---|---|---|---|
| `activityOffset` | `number` | `0` | Tracks how many items have been loaded so far |
| `hasMoreActivities` | `boolean` | `false` | Controls Load More button visibility |
| `isLoadingMore` | `boolean` | `false` | Spinner state for the button only |

### Logic

**Initial fetch** (`fetchData` / mount):
- URL stays `?limit=10` (no offset needed at 0)
- After resolving: `setHasMoreActivities(data.length === 10)`

**Load More handler** (`handleLoadMoreActivities`):
1. Set `isLoadingMore = true`
2. Fetch `/.netlify/functions/activities?limit=10&offset=<activityOffset + 10>`
3. Append results: `setActivities(prev => [...prev, ...newItems])`
4. Update offset: `setActivityOffset(prev => prev + 10)`
5. Update `hasMoreActivities = newItems.length === 10`
6. Set `isLoadingMore = false`

### UI

Below the activity table, conditionally render:

```tsx
{hasMoreActivities && (
  <div className="flex justify-center pt-4 pb-2">
    <button
      onClick={handleLoadMoreActivities}
      disabled={isLoadingMore}
      className="..."
    >
      {isLoadingMore ? <Loader2 className="animate-spin" /> : <ChevronDown />}
      {isLoadingMore ? 'Loading...' : 'Load More'}
    </button>
  </div>
)}
```

Button disappears entirely when `hasMoreActivities` is `false` (no more data).

### Icons used (Lucide React)

- `Loader2` — spinning loader while fetching
- `ChevronDown` — default button icon

## No backend changes needed

The `activities.ts` Netlify function already supports `offset` and `limit` query params.

## Verification

1. Load dashboard — confirm 10 activities appear, Load More button is visible
2. Click Load More — confirm 10 more rows append, offset increments correctly
3. Keep clicking until all items are loaded — confirm button disappears
4. Check network tab — each Load More call uses the correct `offset` value
