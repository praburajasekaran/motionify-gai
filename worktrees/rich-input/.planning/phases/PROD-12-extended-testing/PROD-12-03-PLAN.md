---
phase: PROD-12-extended-testing
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - components/ui/ErrorState.tsx
  - components/ui/EmptyState.tsx
  - landing-page-new/src/components/ui/ErrorState.tsx
  - landing-page-new/src/components/ui/EmptyState.tsx
autonomous: true

must_haves:
  truths:
    - "Standardized ErrorState component exists with retry button and user-friendly messages"
    - "Standardized EmptyState component exists with customizable icon, title, and action"
    - "Both components available in admin portal and client portal"
    - "Error messages are contextual (network, auth, permission, server) not generic"
    - "Components use Lucide React icons"
  artifacts:
    - path: "components/ui/ErrorState.tsx"
      provides: "Admin portal error state component with retry support"
      exports: ["ErrorState"]
    - path: "components/ui/EmptyState.tsx"
      provides: "Admin portal empty state component with customizable content"
      exports: ["EmptyState"]
    - path: "landing-page-new/src/components/ui/ErrorState.tsx"
      provides: "Client portal error state component"
      exports: ["ErrorState"]
    - path: "landing-page-new/src/components/ui/EmptyState.tsx"
      provides: "Client portal empty state component"
      exports: ["EmptyState"]
  key_links:
    - from: "components/ui/ErrorState.tsx"
      to: "lucide-react"
      via: "import icons"
      pattern: "import.*lucide-react"
    - from: "components/ui/EmptyState.tsx"
      to: "lucide-react"
      via: "import icons"
      pattern: "import.*lucide-react"
---

<objective>
Create standardized ErrorState and EmptyState UI components for both admin and client portals, establishing consistent feedback patterns across the application.

Purpose: Replace inconsistent error handling and empty state displays with professional, reusable components that provide clear user feedback and actionable recovery options.
Output: 4 component files (ErrorState + EmptyState for each portal) ready for integration.
</objective>

<execution_context>
@/Users/praburajasekaran/.claude/get-shit-done/workflows/execute-plan.md
@/Users/praburajasekaran/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/PROD-12-extended-testing/PROD-12-RESEARCH.md
@components/ui/SkeletonLoaders.tsx
@components/ui/design-system.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ErrorState component for both portals</name>
  <files>
    components/ui/ErrorState.tsx
    landing-page-new/src/components/ui/ErrorState.tsx
  </files>
  <action>
    1. Create `components/ui/ErrorState.tsx` (admin portal):
       - Import `AlertCircle, RefreshCcw, WifiOff, ShieldOff, Lock, ServerCrash` from `lucide-react`
       - Props interface `ErrorStateProps`:
         - `error: Error | string` - the error to display
         - `onRetry?: () => void` - optional retry callback
         - `title?: string` - custom title (default: "Something went wrong")
         - `className?: string` - additional CSS classes
       - Parse error for contextual user-friendly messages:
         - Network errors (message includes 'fetch' or 'network' or 'Failed to fetch'): "Unable to connect to the server. Please check your internet connection." Use WifiOff icon.
         - Auth errors (401/Unauthorized): "Your session has expired. Please log in again." Use Lock icon.
         - Permission errors (403/Forbidden): "You don't have permission to access this resource." Use ShieldOff icon.
         - Server errors (500): "The server encountered an error. Our team has been notified." Use ServerCrash icon.
         - Default: sanitize error message (redact Bearer tokens, API keys). Use AlertCircle icon.
       - Render centered layout with icon (w-12 h-12, colored appropriately), title, message, and retry button
       - Retry button: inline-flex with RefreshCcw icon, bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2
       - In development only (import.meta.env.DEV), show expandable technical details with error.stack in a `<details>` element
       - Style with Tailwind: centered flex-col, p-8, text-center, max-w-md for message text

    2. Create `landing-page-new/src/components/ui/ErrorState.tsx` (client portal):
       - Same interface and logic as admin version
       - Adjust button color to match client portal theme: bg-blue-600 hover:bg-blue-700
       - Use `process.env.NODE_ENV === 'development'` instead of `import.meta.env.DEV` (Next.js)
       - Same icon logic and error parsing

    Both components should be self-contained with no external dependencies beyond lucide-react and React.
  </action>
  <verify>
    Run `npm run build` from project root to verify admin portal builds.
    Run `cd landing-page-new && npm run build` to verify client portal builds.
    Verify both files export `ErrorState` component.
  </verify>
  <done>
    ErrorState component created for both portals with contextual error messages (network, auth, permission, server), retry button support, Lucide icons, and development-only technical details.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create EmptyState component for both portals</name>
  <files>
    components/ui/EmptyState.tsx
    landing-page-new/src/components/ui/EmptyState.tsx
  </files>
  <action>
    1. Create `components/ui/EmptyState.tsx` (admin portal):
       - Import `LucideIcon` type from `lucide-react` and `Inbox` as default icon
       - Props interface `EmptyStateProps`:
         - `icon?: LucideIcon` - custom Lucide icon (default: Inbox)
         - `title: string` - main heading text
         - `description?: string` - supporting text
         - `action?: { label: string; onClick: () => void }` - optional action button
         - `className?: string` - additional CSS classes
       - Render centered layout:
         - Icon container: w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center, icon is w-8 h-8 text-zinc-400
         - Title: text-lg font-semibold text-zinc-900 mt-4
         - Description: text-sm text-zinc-500 mt-1 max-w-sm
         - Action button (if provided): mt-4, bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2 text-sm font-medium
       - Wrap in `flex flex-col items-center justify-center py-12 text-center`

    2. Create `landing-page-new/src/components/ui/EmptyState.tsx` (client portal):
       - Same interface and logic
       - Action button color: bg-blue-600 hover:bg-blue-700 (client theme)
       - Same layout and styling otherwise

    These components replace ad-hoc "No items found" text scattered across pages with a consistent, professional empty state.
  </action>
  <verify>
    Run `npm run build` from project root to verify admin portal builds.
    Run `cd landing-page-new && npm run build` to verify client portal builds.
    Verify both files export `EmptyState` component.
  </verify>
  <done>
    EmptyState component created for both portals with customizable icon, title, description, and optional action button. Professional centered layout with Lucide icons.
  </done>
</task>

</tasks>

<verification>
1. `components/ui/ErrorState.tsx` exists and exports ErrorState
2. `components/ui/EmptyState.tsx` exists and exports EmptyState
3. `landing-page-new/src/components/ui/ErrorState.tsx` exists and exports ErrorState
4. `landing-page-new/src/components/ui/EmptyState.tsx` exists and exports EmptyState
5. Both portals build successfully: `npm run build` and `cd landing-page-new && npm run build`
6. ErrorState has retry button support and contextual error messages
7. EmptyState has customizable icon, title, description, and action
</verification>

<success_criteria>
Four new UI components created (ErrorState + EmptyState for each portal). Error messages are contextual based on error type. Empty states have professional layout with customizable content. Both portals build without errors.
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-12-extended-testing/PROD-12-03-SUMMARY.md`
</output>
