---
title: "Shared Portal Page Sections Prevent Layout Drift"
date: 2026-06-07
category: ui-bugs
module: Portal
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - "Projects, inquiries, detail, and creation routes rendered different page heading sizes and vertical spacing"
  - "Breadcrumbs showed generic labels such as Workspace and Page, and implied links that were not clickable"
  - "Single project and inquiry pages lost the same summary context shown on list pages"
  - "The top search and utility controls did not align to the main content container"
  - "The command palette did not close on Escape or support up/down keyboard navigation"
root_cause: logic_error
resolution_type: code_fix
severity: medium
tags: [portal-layout, page-header, breadcrumbs, command-palette, alignment, react]
---

# Shared Portal Page Sections Prevent Layout Drift

## Problem

Portal pages had accumulated page-specific header, breadcrumb, stats, and toolbar implementations. As the UI expanded across admin and client routes, related pages drifted apart: headings had different sizes, breadcrumbs showed low-value placeholder labels, single-detail pages lacked the list-page context, and `/portal/projects/new` used a narrower centered layout that no longer aligned with the Projects section.

## Symptoms

- `Projects`, `Inquiries`, `Dashboard`, and form/detail pages used inconsistent heading sizes and spacing.
- Breadcrumbs showed generic labels such as `Workspace > Page`; `Workspace` looked clickable even when it was not useful navigation.
- Client-facing inquiry URLs and sidebar labels still exposed admin-oriented route or system language in places.
- Inquiries and projects single pages had back buttons and persistent sidebar navigation, but did not always preserve their section heading and summary cards.
- `/portal/projects/new` initially showed the shared Projects cards, but the creation form stayed centered in its own `max-w-3xl` column instead of aligning to the shared page container.
- The top search field and notification/theme controls were visually detached from the main content width.
- The command palette displayed an `ESC` hint, but Escape did not close it and arrow keys did not move through filtered results.

## What Didn't Work

- Renaming text on individual pages fixed wording such as "production" versus "project", but did not prevent other pages from keeping older copy or spacing.
- Adding summary cards only to list pages preserved context on `/projects` or `/admin/inquiries`, but made detail and creation routes feel like separate surfaces.
- Keeping breadcrumbs after adding sidebar navigation and back buttons added clutter without improving wayfinding. It also produced misleading fallback labels when route-specific labels were not configured.
- Centering the new-project form in a narrow wrapper made the form readable, but broke alignment once the shared Projects header and card row were added above it.
- Showing a command-palette keyboard hint without wiring global key handling created a false affordance.

Session history was requested, but the `ce-sessions` skill was not installed in this Codex session, so no prior-session findings were incorporated.

## Solution

Replace one-off page headers and stats blocks with shared section components, remove the breadcrumb bar, and align the top navigation controls and route content to the same layout model.

### Shared Page Header

Create one small page-title component and use it across top-level pages and nested flows:

```tsx
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3', className)}>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <div className="text-sm text-muted-foreground mt-1">{description}</div>
        )}
      </div>
      {actions}
    </div>
  );
}
```

The `pb-3` is part of the shared contract, so title and description spacing is not hand-tuned page by page.

### Shared Section Headers

Move repeated Projects and Inquiries section context into reusable section headers:

```tsx
export function ProjectSectionHeader({ actions }: ProjectSectionHeaderProps) {
  const { user } = useAuthContext();
  const projectsQuery = useProjects(user?.id);
  const projects = projectsQuery.data ?? [];
  const visibleProjects = projects.filter(project => project.status !== 'Archived');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description={`${visibleProjects.length} project${visibleProjects.length !== 1 ? 's' : ''}`}
        actions={actions}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Projects" value={visibleProjects.length} icon={LayoutGrid} color="blue" />
        <SummaryCard label="Active" value={visibleProjects.filter(project => project.status === 'Active').length} icon={FolderKanban} color="green" />
        <SummaryCard label="In Review" value={visibleProjects.filter(project => project.status === 'In Review').length} icon={Clock} color="amber" />
        <SummaryCard label="Completed" value={visibleProjects.filter(project => project.status === 'Completed').length} icon={CheckCircle} color="purple" />
      </div>
    </div>
  );
}
```

Apply the same pattern for inquiries with role-aware text and stats:

```tsx
<PageHeader
  title="Inquiries"
  description={userIsClient ? 'View your inquiries and track proposals' : 'Manage customer inquiries and create proposals'}
  actions={userIsClient && onNewInquiry ? (
    <Button onClick={onNewInquiry} className="gap-2 px-4 py-2 shadow-sm">
      <Plus className="w-5 h-5" />
      New Inquiry
    </Button>
  ) : undefined}
/>
```

Then render the section header on list, detail, settings, review, and creation routes, not only on the list route:

```tsx
return (
  <div className="space-y-8 pb-20">
    <ProjectSectionHeader />

    <div className="mb-8">
      <Button variant="ghost" className="pl-0 gap-2 mb-4" onClick={() => navigate('/projects')}>
        <ChevronLeft className="h-4 w-4" /> Back to Projects
      </Button>
      <PageHeader
        title="Create New Project"
        description="Configure project details, deliverables, and team assignments."
      />
    </div>

    <Card className="min-h-[500px] flex flex-col">
      ...
    </Card>
  </div>
);
```

The important detail is that the route root owns the width. Avoid wrapping the whole nested section in a second `max-w-* mx-auto` container after adding the shared section header; otherwise the lower section will drift away from the cards above it.

### Remove Breadcrumbs Once Navigation Is Redundant

Remove the breadcrumb provider/parser and the header breadcrumb nav when the sidebar plus route-local back buttons already provide orientation. This avoids placeholder labels like `Workspace > Page` and removes fake affordances from non-clickable crumb labels.

For client inquiry routes, add client-friendly paths instead of exposing admin paths:

```tsx
<Route path="/inquiries" element={<ProtectedRoute><InquiryDashboard /></ProtectedRoute>} />
<Route path="/inquiries/:id" element={<ProtectedRoute><InquiryDetail /></ProtectedRoute>} />
<Route path="/proposals/:proposalId" element={<ProtectedRoute><ProposalDetail /></ProtectedRoute>} />
```

### Align Header Controls To The Page Container

Put the top search and utility controls in the same maximum-width wrapper used by the page body:

```tsx
<header className="h-14 border-b border-border z-[60] shrink-0 sticky top-0 bg-background">
  <div className="h-full max-w-6xl mx-auto px-6 flex items-center justify-between">
    <div className="flex items-center flex-1 min-w-0">
      <button
        onClick={() => setCommandOpen(true)}
        className="hidden md:flex items-center gap-2 h-9 w-full max-w-xl px-3 rounded-lg border border-border bg-card text-[14px] text-muted-foreground"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">Search projects, inquiries, tasks, files...</span>
        <div className="flex items-center gap-0.5">
          <kbd>⌘</kbd>
          <kbd>K</kbd>
        </div>
      </button>
    </div>

    <div className="flex items-center gap-1">
      <NotificationBell />
      ...
    </div>
  </div>
</header>
```

### Wire Command Palette Keyboard Behavior

When the palette advertises keyboard controls, keep selected state and handle keys while it is open:

```tsx
const [selectedIndex, setSelectedIndex] = useState(0);
const filteredItems = items.filter(item => item.label.toLowerCase().includes(search.toLowerCase()));

useEffect(() => {
  if (!open) return;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onOpenChange(false);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex(index => Math.min(index + 1, filteredItems.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex(index => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter' && filteredItems[selectedIndex]) {
      event.preventDefault();
      filteredItems[selectedIndex].action();
      onOpenChange(false);
    }
  };

  window.addEventListener('keydown', handleKeyDown, true);
  return () => window.removeEventListener('keydown', handleKeyDown, true);
}, [filteredItems, onOpenChange, open, selectedIndex]);
```

Reset `selectedIndex` when opening or filtering, clamp it when the filtered list shrinks, and update it on row hover so mouse and keyboard selection stay synchronized.

## Why This Works

The root cause was not a single CSS value. It was duplicated page structure: each route owned its own title, stats, actions, width, breadcrumb assumptions, and keyboard affordances. Any per-page fix solved one screenshot while leaving adjacent routes free to drift again.

`PageHeader`, `ProjectSectionHeader`, and `InquirySectionHeader` turn those repeated visual contracts into reusable components. Once the list, detail, settings, review, and creation pages share the same section header, adding or resizing the page title happens once. Removing breadcrumbs also removes a source of route-label drift; route-local back buttons provide the only extra navigation detail where it matters.

Aligning the top bar with `max-w-6xl mx-auto px-6` makes search and utility controls obey the same visual grid as the page content. Removing the nested `max-w-3xl mx-auto` wrapper from `CreateProject` lets the creation flow align with the Projects section above it, while the card still provides readable internal spacing.

The command palette fix closes the interaction gap between visible affordance and actual behavior: Escape, arrows, and Enter now match the UI hints users see.

## Prevention

- Prefer shared section components for repeated page families. If a section appears on both list and detail pages, make it a component before tuning spacing on individual routes.
- Treat the route root as the page-width owner. Nested forms can control internal padding, but avoid second full-section `max-w-* mx-auto` wrappers under a shared section header unless the visual hierarchy explicitly calls for a narrower tool.
- Do not keep breadcrumbs by default when the app already has persistent sidebar navigation and route-local back buttons. Breadcrumbs need route-specific labels and real link affordances to earn their space.
- When changing terminology, update empty states, button labels, command-palette items, keyboard shortcut descriptions, and route-local copy together.
- If a modal or command palette displays keyboard hints, test Escape, arrows, and Enter before shipping.
- Verify list, detail, creation, and settings routes together after a page-header or container-width change. Those pages form one navigation family and should not be QA'd in isolation.

## Related Issues

- [Sidebar and Header Dividers Misaligned Due to Height Mismatch](./sidebar-header-height-mismatch-divider-misaligned-20260221.md) — earlier single-value header alignment issue.
- [Slider Imprecise for Small Discrete Integer Range](./slider-replaced-with-number-chips-CreateProject-20260221.md) — earlier CreateProject-specific form-control fix.
- [Remove Client Dashboard and Redirect to Projects or Inquiries](./client-dashboard-redirect-to-projects-or-inquiries.md) — related client portal navigation cleanup.
