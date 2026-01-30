# Phase 9: Admin Features - Research

**Researched:** 2026-01-29
**Domain:** Admin dashboard UI, activity logging, and metrics aggregation
**Confidence:** HIGH

## Summary

Phase 9 focuses on building administrative oversight tools: a metrics dashboard showing key platform statistics, an activity log for tracking user actions, and project management views. The codebase already has significant infrastructure in place:

1. **Activities API exists** (`netlify/functions/activities.ts`) with full CRUD operations and Zod validation
2. **Activity types are defined** in `services/activityApi.ts` covering proposals, deliverables, payments, tasks, and team actions
3. **Admin page patterns established** in `InquiryDashboard.tsx` and `Payments.tsx` showing metrics cards + filterable tables
4. **No activities table in database** - this is a critical gap that must be addressed first
5. **User decisions from CONTEXT.md** specify: no charts/visualizations, interactive metric cards, simple scrollable activity list, toggle between "all activity" and "my activity"

The implementation requires creating the missing `activities` database table, building aggregation queries for dashboard metrics, and wiring up the activity logging throughout the application's user-facing actions.

**Primary recommendation:** Create activities table migration first, then build dashboard with metric aggregation from existing tables (projects, proposals, payments, deliverables), finally implement activity log UI with real-time data from activities table.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI framework | Already used throughout admin portal |
| TypeScript | 5.x | Type safety | Project standard |
| Lucide React | Latest | Icons | Per user's CLAUDE.md instructions |
| PostgreSQL | Latest | Database | Project database |
| Zod | 3.x | Validation | Already used in _shared/schemas.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Design System Components | N/A | UI components | From `components/ui/design-system` - already used in Payments.tsx |
| ErrorState/EmptyState | N/A | Error/empty handling | From `components/ui/` - already integrated in InquiryDashboard |
| date-fns or native Date | N/A | Date formatting | For activity timestamps and date filtering |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PostgreSQL aggregations | Redis caching | Dashboard loads in real-time from DB, acceptable performance for admin tools |
| Custom activity logger | Generic logging library | Activity schema is domain-specific (inquiries, proposals, projects) |

**Installation:**
No new packages required - all dependencies already present in project.

## Architecture Patterns

### Recommended Project Structure
```
pages/admin/
├── Dashboard.tsx           # NEW: Admin dashboard with metrics
├── ActivityLogs.tsx        # EXISTS: Needs wiring to real API
├── InquiryDashboard.tsx    # EXISTS: Pattern reference
└── Payments.tsx            # EXISTS: Pattern reference

netlify/functions/
├── activities.ts           # EXISTS: Already implemented
├── dashboard-metrics.ts    # NEW: Aggregate metrics endpoint
└── projects.ts             # EXISTS: May need enhancement

database/migrations/
└── 0XX_create_activities_table.sql  # NEW: Critical gap
```

### Pattern 1: Metric Card with Inline Expansion
**What:** Summary cards at top showing key metrics that expand inline on click to show breakdown
**When to use:** Dashboard top row (matches user decision: "clicking expands inline to show breakdown without leaving dashboard")
**Example:**
```typescript
// Established pattern from InquiryDashboard.tsx and Payments.tsx
function StatCard({ label, value, icon: Icon, color, subtitle, onClick, expanded }: StatCardProps) {
  return (
    <div
      className="bg-white rounded-xl p-4 ring-1 ring-gray-200 shadow-sm cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-lg ${bgColors[color]} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${iconColors[color]}`} />
        </div>
      </div>
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {/* Breakdown details */}
        </div>
      )}
    </div>
  );
}
```

### Pattern 2: Activity Log with Context Links
**What:** Each activity entry shows action + related entity name + navigation link
**When to use:** Activity log table (matches user decision: "Each entry shows expanded context: action + related project/proposal name + navigation link")
**Example:**
```typescript
// Similar to ActivityLogs.tsx structure but with real data
interface ActivityWithContext {
  id: string;
  type: ActivityType;
  userName: string;
  timestamp: number;
  projectName?: string;
  projectId?: string;
  proposalId?: string;
  inquiryId?: string;
  details: Record<string, string | number>;
}

// Render with navigation links
<TableCell>
  {activity.projectName && (
    <Link to={`/projects/${activity.projectId}`} className="text-violet-600 hover:underline">
      {activity.projectName}
    </Link>
  )}
</TableCell>
```

### Pattern 3: Toggle Between Views
**What:** "All activity" vs "my activity" toggle for quick context switching
**When to use:** Activity log filter section
**Example:**
```typescript
const [viewMode, setViewMode] = useState<'all' | 'my'>('all');

<div className="flex items-center gap-2">
  <button
    className={viewMode === 'all' ? 'active' : 'inactive'}
    onClick={() => setViewMode('all')}
  >
    All Activity
  </button>
  <button
    className={viewMode === 'my' ? 'active' : 'inactive'}
    onClick={() => setViewMode('my')}
  >
    My Activity
  </button>
</div>
```

### Anti-Patterns to Avoid
- **Don't use filtering UI in activity log** - User decision: "No filtering UI — simple scrollable list with sidebar scrollbar"
- **Don't add charts or visualizations** - User decision: "No charts or data visualizations — numbers and tables only"
- **Don't implement infinite scroll** - User decision: "Pagination via 'Load more' button (not infinite scroll)"

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Activity aggregation across projects | Custom loop fetching | SQL JOIN with aggregation | Database is optimized for this, avoid N+1 queries |
| Date range filtering | Manual date comparison in JS | SQL WHERE with timestamp comparisons | Let database handle filtering |
| Activity type constants | Hardcoded strings | Existing ActivityType enum from services/activityApi.ts | Already defined and typed |
| Permission checks | Custom logic | Existing Permissions utility and withAuth middleware | Already implemented in codebase |

**Key insight:** The activities API and activity types are already defined. The missing piece is the database table to store them. Most activity logging convenience functions already exist in `services/activityApi.ts`.

## Common Pitfalls

### Pitfall 1: Missing Activities Table
**What goes wrong:** Activities API exists and is called throughout codebase, but database table doesn't exist, causing 500 errors
**Why it happens:** Schema file (`database/schema.sql`) doesn't include activities table, likely an oversight during initial setup
**How to avoid:** Create migration `0XX_create_activities_table.sql` matching the API contract from `activities.ts`
**Warning signs:** Activities API calls fail with database errors; no activity data appears in UI

### Pitfall 2: N+1 Query Problem for Dashboard Metrics
**What goes wrong:** Dashboard loads slowly because it fetches projects, then proposals, then payments separately
**Why it happens:** Naive implementation fetches related data in loops instead of JOINs
**How to avoid:** Create dedicated `/dashboard-metrics` endpoint with optimized aggregation queries
**Warning signs:** Dashboard takes >2 seconds to load with production data; database connection pool exhaustion

### Pitfall 3: Activity Context Missing
**What goes wrong:** Activity log shows "Proposal sent" but no project/proposal name to click
**Why it happens:** Activities table only stores IDs, not denormalized names
**How to avoid:** JOIN with projects/proposals/inquiries to get names, or store name snapshots in activity details
**Warning signs:** Activity entries lack navigation context; users can't click through to related entities

### Pitfall 4: Role-Based Activity Visibility
**What goes wrong:** Client users see all platform activity instead of just their projects
**Why it happens:** Activity fetching doesn't filter by user permissions
**How to avoid:** Filter activities by projectId where user has access, use existing permission system
**Warning signs:** Clients see other clients' activities; security/privacy violation

### Pitfall 5: Timestamp Display Inconsistency
**What goes wrong:** Some timestamps show "2 hours ago", others show ISO format
**Why it happens:** Inconsistent date formatting across activity types
**How to avoid:** Centralize date formatting utility (relative for <7 days, absolute for older)
**Warning signs:** UI looks inconsistent; users confused by mixed date formats

## Code Examples

Verified patterns from existing codebase:

### Dashboard Metrics Query
```typescript
// NEW endpoint: netlify/functions/dashboard-metrics.ts
// Efficient aggregation in single query
const metricsQuery = `
  SELECT
    COUNT(DISTINCT p.id) as total_projects,
    COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_projects,
    COUNT(DISTINCT pr.id) as total_proposals,
    COUNT(DISTINCT CASE WHEN pr.status = 'sent' THEN pr.id END) as pending_proposals,
    COUNT(DISTINCT pay.id) FILTER (WHERE pay.status = 'completed') as completed_payments,
    SUM(pay.amount) FILTER (WHERE pay.status = 'completed') as total_revenue,
    COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'awaiting_approval') as pending_approvals
  FROM projects p
  LEFT JOIN proposals pr ON p.proposal_id = pr.id
  LEFT JOIN payments pay ON p.id = pay.project_id
  LEFT JOIN deliverables d ON p.id = d.project_id
`;
```

### Activity Log with Context
```typescript
// Enhanced activities.ts GET handler
// Source: Existing pattern from activities.ts + JOIN for context
const activitiesWithContextQuery = `
  SELECT
    a.id, a.type, a.user_id, a.user_name,
    a.target_user_id, a.target_user_name,
    a.inquiry_id, a.proposal_id, a.project_id,
    a.details, a.created_at,
    p.project_number as project_name,
    pr.id as proposal_number,
    i.inquiry_number
  FROM activities a
  LEFT JOIN projects p ON a.project_id = p.id
  LEFT JOIN proposals pr ON a.proposal_id = pr.id
  LEFT JOIN inquiries i ON a.inquiry_id = i.id
  WHERE 1=1
    ${userId && viewMode === 'my' ? 'AND a.user_id = $1' : ''}
  ORDER BY a.created_at DESC
  LIMIT $2
`;
```

### Activities Table Schema
```sql
-- NEW migration: database/migrations/0XX_create_activities_table.sql
-- Matches API contract from netlify/functions/activities.ts
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  user_name VARCHAR(255) NOT NULL,
  target_user_id UUID REFERENCES users(id),
  target_user_name VARCHAR(255),
  inquiry_id UUID REFERENCES inquiries(id),
  proposal_id UUID REFERENCES proposals(id),
  project_id UUID REFERENCES projects(id),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT activity_context_check
    CHECK (inquiry_id IS NOT NULL OR proposal_id IS NOT NULL OR project_id IS NOT NULL)
);

CREATE INDEX idx_activities_user ON activities(user_id);
CREATE INDEX idx_activities_project ON activities(project_id);
CREATE INDEX idx_activities_proposal ON activities(proposal_id);
CREATE INDEX idx_activities_inquiry ON activities(inquiry_id);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
```

### Metric Card Component (Existing Pattern)
```typescript
// Source: pages/admin/InquiryDashboard.tsx and pages/admin/Payments.tsx
interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className: string }>;
  color: 'blue' | 'amber' | 'purple' | 'green' | 'emerald';
  subtitle?: string;
}

function StatCard({ label, value, icon: Icon, color, subtitle }: StatCardProps) {
  const bgColors = {
    blue: 'bg-blue-500/10',
    amber: 'bg-amber-500/10',
    purple: 'bg-purple-500/10',
    green: 'bg-green-500/10',
    emerald: 'bg-emerald-500/10',
  };
  const iconColors = {
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
    emerald: 'text-emerald-400',
  };

  return (
    <div className="bg-white rounded-xl p-4 ring-1 ring-gray-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-lg ${bgColors[color]} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${iconColors[color]}`} />
        </div>
      </div>
    </div>
  );
}
```

### User-Facing Activity Types Filter
```typescript
// Source: services/activityApi.ts (already defined)
// User decision: "Track user-facing actions only: proposal sent, deliverable approved, payment received, comment posted"
const USER_FACING_ACTIVITIES: ActivityType[] = [
  'PROPOSAL_SENT',
  'PROPOSAL_ACCEPTED',
  'PROPOSAL_REJECTED',
  'DELIVERABLE_APPROVED',
  'DELIVERABLE_REJECTED',
  'PAYMENT_RECEIVED',
  'COMMENT_ADDED',
  'PROJECT_CREATED',
];

// Filter query for activity log
WHERE a.type = ANY($1::varchar[])
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mock activity data in frontend | Real-time activity logging via API | N/A - API exists, table missing | Need to create table first |
| Separate metric queries per card | Single aggregated metrics endpoint | Best practice 2024+ | Reduces database load |
| Client-side date filtering | Server-side SQL filtering | Standard for scalability | Better performance with large datasets |
| Manual permission checks | Composable middleware (withAuth, withSuperAdmin) | Already implemented in project | Consistent security |

**Deprecated/outdated:**
- ActivityLogs.tsx uses MOCK_PROJECTS constant and returns empty array - needs to fetch real data
- ActivityLogs.tsx has extensive filtering UI - contradicts user decision "No filtering UI"

## Open Questions

1. **Activities table missing from schema**
   - What we know: API exists, schema exists, table doesn't
   - What's unclear: Should we add to schema.sql or create migration?
   - Recommendation: Create migration file (0XX_create_activities_table.sql) so it's versioned and can be applied to existing databases

2. **Dashboard metrics refresh frequency**
   - What we know: User wants "Data refreshes properly" (from requirements)
   - What's unclear: Real-time vs manual refresh vs polling interval
   - Recommendation: Manual refresh button (like Payments.tsx) for now, can add auto-refresh later

3. **Activity log pagination limit**
   - What we know: "Load more" button, not infinite scroll
   - What's unclear: How many activities per page?
   - Recommendation: Start with 50 per page (matches activities.ts default limit), make configurable later

4. **"My activity" definition for admins**
   - What we know: Toggle between "all activity" and "my activity"
   - What's unclear: Does "my activity" mean activities I performed, or activities on projects I manage?
   - Recommendation: Filter by user_id (activities I performed) for consistency with activity ownership

## Sources

### Primary (HIGH confidence)
- Existing codebase files:
  - `netlify/functions/activities.ts` - Complete activities API implementation
  - `services/activityApi.ts` - Activity types and convenience functions
  - `pages/admin/InquiryDashboard.tsx` - Metric card pattern reference
  - `pages/admin/Payments.tsx` - Filter and table pattern reference
  - `pages/admin/ActivityLogs.tsx` - Existing scaffold (needs wiring)
  - `netlify/functions/_shared/schemas.ts` - Validation schemas including activities
  - `database/schema.sql` - Database schema (missing activities table)
- Phase context: `.planning/phases/09-admin-features/09-CONTEXT.md` - User decisions

### Secondary (MEDIUM confidence)
- PostgreSQL best practices for aggregation queries (standard SQL patterns)
- React component patterns from existing admin pages

### Tertiary (LOW confidence)
- None - all research based on existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, no new dependencies
- Architecture: HIGH - Existing admin pages provide clear patterns
- Pitfalls: HIGH - Based on actual codebase gaps (missing activities table)

**Research date:** 2026-01-29
**Valid until:** 60 days (stable tech stack, internal codebase patterns)

**Critical finding:** Activities table must be created before any dashboard/activity log work can proceed. The API exists and is functional, but will fail at runtime without the underlying table.
