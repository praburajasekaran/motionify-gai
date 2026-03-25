---
phase: PROD-12-extended-testing
plan: 04
type: execute
wave: 2
depends_on: ["PROD-12-03"]
files_modified:
  - pages/admin/Proposals.tsx
  - pages/admin/Projects.tsx
  - pages/admin/Payments.tsx
  - pages/admin/UserManagement.tsx
  - landing-page-new/src/app/portal/projects/page.tsx
  - landing-page-new/src/app/portal/proposals/page.tsx
autonomous: true

must_haves:
  truths:
    - "All major list pages use ErrorState component for error display"
    - "All major list pages use EmptyState component when no data exists"
    - "Loading states use existing SkeletonLoader components consistently"
    - "Error states include retry functionality"
    - "Empty states have contextual messages and icons"
  artifacts:
    - path: "pages/admin/Proposals.tsx"
      provides: "Proposals page with ErrorState and EmptyState"
      contains: "ErrorState"
    - path: "pages/admin/Projects.tsx"
      provides: "Projects page with ErrorState and EmptyState"
      contains: "ErrorState"
    - path: "pages/admin/Payments.tsx"
      provides: "Payments page with ErrorState and EmptyState"
      contains: "ErrorState"
  key_links:
    - from: "pages/admin/Proposals.tsx"
      to: "components/ui/ErrorState.tsx"
      via: "import"
      pattern: "import.*ErrorState"
    - from: "pages/admin/Projects.tsx"
      to: "components/ui/EmptyState.tsx"
      via: "import"
      pattern: "import.*EmptyState"
---

<objective>
Integrate ErrorState and EmptyState components into all major list pages across both admin and client portals for consistent user feedback.

Purpose: Replace ad-hoc error messages ("Something went wrong", console.error only) and empty data displays ("No items found" text) with the standardized components from Plan 03, creating a polished, professional UX.
Output: All major list pages updated with consistent loading, error, and empty state patterns.
</objective>

<execution_context>
@/Users/praburajasekaran/.claude/get-shit-done/workflows/execute-plan.md
@/Users/praburajasekaran/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/PROD-12-extended-testing/PROD-12-03-SUMMARY.md
@components/ui/ErrorState.tsx
@components/ui/EmptyState.tsx
@components/ui/SkeletonLoaders.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Apply ErrorState and EmptyState to admin portal pages</name>
  <files>
    pages/admin/Proposals.tsx
    pages/admin/Projects.tsx
    pages/admin/Payments.tsx
    pages/admin/UserManagement.tsx
  </files>
  <action>
    For each of the 4 admin pages listed, audit the current error handling and empty state patterns, then update:

    1. **Audit each page** for:
       - How errors are currently displayed (look for `catch` blocks, error state variables, "error" or "failed" strings)
       - How empty data is shown (look for `.length === 0` checks, "No items" text, conditional rendering)
       - Current loading states (look for isLoading/loading boolean, skeleton usage)

    2. **For error states** in each page:
       - Import `ErrorState` from `@/components/ui/ErrorState`
       - Replace inline error rendering (alert text, red error messages) with `<ErrorState error={error} onRetry={fetchData} />`
       - Ensure the error variable is stored as `Error | string` type
       - Wire the retry function to re-fetch data

    3. **For empty states** in each page:
       - Import `EmptyState` from `@/components/ui/EmptyState`
       - Import appropriate Lucide icons for each context:
         - Proposals: `FileText` icon, "No proposals yet", "Create your first proposal to get started"
         - Projects: `FolderOpen` icon, "No projects yet", "Projects will appear here once proposals are accepted"
         - Payments: `CreditCard` icon, "No payments found", "Payment records will appear here"
         - Users: `Users` icon, "No team members yet", "Invite team members to get started"
       - Add action button where appropriate (e.g., "Create Proposal" on Proposals page)

    4. **For loading states** - verify existing skeleton loaders are being used. If any page uses a simple "Loading..." text or spinner, replace with appropriate skeleton from SkeletonLoaders.tsx:
       - Use `CardGridSkeleton` for card-based layouts
       - Use `TableRowSkeleton` for table-based layouts
       - Use `StatCardSkeleton` for dashboard stat cards

    Keep changes minimal - only replace the rendering of error/empty/loading states, don't refactor data fetching logic.
  </action>
  <verify>
    Run `npm run build` to verify admin portal builds without errors.
    Grep for `ErrorState` in modified files to confirm integration.
    Grep for `EmptyState` in modified files to confirm integration.
  </verify>
  <done>
    All 4 admin portal list pages use standardized ErrorState (with retry), EmptyState (with contextual icons and messages), and consistent skeleton loading states.
  </done>
</task>

<task type="auto">
  <name>Task 2: Apply ErrorState and EmptyState to client portal pages</name>
  <files>
    landing-page-new/src/app/portal/projects/page.tsx
    landing-page-new/src/app/portal/proposals/page.tsx
  </files>
  <action>
    Apply the same pattern to the 2 main client portal list pages:

    1. **Client portal projects page** (`landing-page-new/src/app/portal/projects/page.tsx`):
       - Import `ErrorState` from client portal's UI components
       - Import `EmptyState` from client portal's UI components
       - Replace error display with `<ErrorState error={error} onRetry={fetchProjects} />`
       - Replace empty state with `<EmptyState icon={FolderOpen} title="No projects yet" description="Your projects will appear here once a proposal is accepted." />`
       - Verify loading skeleton is appropriate

    2. **Client portal proposals page** (find the correct path - may be different):
       - Same pattern: ErrorState for errors, EmptyState for no data
       - EmptyState: `icon={FileText}`, "No proposals yet", "You'll see proposals here when they're sent to you."

    Note: Client portal uses Next.js so components are in `landing-page-new/src/components/ui/`. Adjust import paths accordingly. The client portal may use "use client" directive for these interactive pages.

    Keep changes minimal - only the rendering of error/empty/loading states.
  </action>
  <verify>
    Run `cd landing-page-new && npm run build` to verify client portal builds.
    Grep for `ErrorState` in modified client files.
    Grep for `EmptyState` in modified client files.
  </verify>
  <done>
    Client portal list pages use standardized ErrorState and EmptyState components with client-appropriate messaging and blue theme buttons.
  </done>
</task>

</tasks>

<verification>
1. `npm run build` passes for admin portal
2. `cd landing-page-new && npm run build` passes for client portal
3. All 6 pages import and use ErrorState and EmptyState
4. Error states have retry functionality wired
5. Empty states have contextual icons and messages
6. No regression in existing page functionality
</verification>

<success_criteria>
All major list pages across both portals consistently use ErrorState (with retry), EmptyState (with contextual messaging), and skeleton loading states. User sees professional, actionable feedback at every data state (loading, error, empty, loaded).
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-12-extended-testing/PROD-12-04-SUMMARY.md`
</output>
