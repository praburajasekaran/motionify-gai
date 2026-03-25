# Architecture

**Analysis Date:** 2026-01-19

## Pattern Overview

**Overall:** Dual Application Architecture (Vite SPA + Next.js App Router)

**Key Characteristics:**
- Two distinct applications sharing backend infrastructure
- Serverless functions as unified API layer via Netlify Functions
- React Query for data synchronization and caching
- Context-based state management for auth and notifications
- Role-based permission system with project-level membership

## Layers

**Presentation Layer (Vite Portal):**
- Purpose: Admin/project management portal for authenticated users
- Location: `pages/`, `components/`
- Contains: React components using HashRouter for SPA navigation
- Depends on: Contexts, Shared utilities, Netlify Functions API
- Used by: Internal team members and clients with project access
- Entry: `index.tsx` → `App.tsx`

**Presentation Layer (Next.js Landing):**
- Purpose: Public-facing marketing site with embedded client portal
- Location: `landing-page-new/src/app/`, `landing-page-new/src/components/`
- Contains: Next.js 16 App Router pages and server components
- Depends on: Next.js routing, Portal library (`src/lib/portal/`), API routes
- Used by: Public visitors and authenticated portal users via `/portal` route
- Entry: `landing-page-new/src/app/layout.tsx` → `landing-page-new/src/app/page.tsx`

**API Layer:**
- Purpose: Serverless backend functions handling business logic
- Location: `netlify/functions/`
- Contains: Netlify Functions with PostgreSQL database access
- Depends on: PostgreSQL, AWS S3/R2, Email services (Resend/Nodemailer)
- Used by: Both Vite portal and Next.js app via HTTP requests
- Pattern: Handler functions with CORS, request validation, error handling

**Data Access Layer:**
- Purpose: Database queries and data persistence
- Location: `lib/` (client-side helpers), Netlify Functions (server-side)
- Contains: PostgreSQL queries, data transformation utilities
- Depends on: PostgreSQL client (`pg`), Database schema
- Used by: API layer for all data operations

**Shared Layer:**
- Purpose: Cross-cutting utilities and type contracts
- Location: `shared/providers/`, `shared/contracts/`, `shared/utils/`, `shared/hooks/`
- Contains: React Query provider, type definitions, reusable hooks
- Depends on: External libraries (@tanstack/react-query, zod)
- Used by: Both presentation layers for consistency

**Service Layer:**
- Purpose: External integrations and specialized business logic
- Location: `services/`
- Contains: Payment API (`paymentApi.ts`), Storage (`storage.ts`), Task API (`taskApi.ts`), AI services (`geminiService.ts`)
- Depends on: External SDKs (Razorpay, AWS SDK, Google GenAI)
- Used by: Netlify Functions and components

## Data Flow

**Authentication Flow:**

1. User requests magic link via `lib/auth.ts` → `netlify/functions/auth-request-magic-link.ts`
2. Backend generates token, stores in database, sends email via `send-email.ts`
3. User clicks link → redirects to `/auth/verify` or `/#/login?token=xxx`
4. Verification via `netlify/functions/auth-verify-magic-link.ts`
5. Session stored in localStorage, user object populated in AuthContext
6. Protected routes check `useAuthContext()` for authentication

**Project Data Flow:**

1. Component requests data via React Query hook
2. Hook calls Netlify Function (e.g., `/netlify/functions/projects.ts`)
3. Function authenticates request, queries PostgreSQL
4. Returns data with CORS headers
5. React Query caches result, provides to component
6. Component renders with permission checks via `lib/permissions.ts`

**File Upload Flow:**

1. Component requests presigned URL from `netlify/functions/r2-presign.ts`
2. Backend validates permissions, generates AWS S3 presigned URL
3. Client uploads directly to S3/R2 using presigned URL
4. Client notifies backend of upload completion
5. Backend updates database with file metadata
6. React Query invalidates cache, triggers UI refresh

**State Management:**
- AuthContext: User session, authentication state (localStorage-backed)
- NotificationContext: In-app notification queue and delivery
- React Query: Server state caching and synchronization
- Local component state: UI-specific state (modals, forms, filters)

## Key Abstractions

**User & Role System:**
- Purpose: Multi-role permission system with project-based membership
- Examples: `types.ts` (User, UserRole, ProjectTeamMembership)
- Pattern: Role-based + attribute-based access control (RBAC + ABAC)
- Implementation: `contexts/AuthContext.tsx`, `lib/permissions.ts`, `utils/deliverablePermissions.ts`

**Project Entity:**
- Purpose: Central business entity representing client engagements
- Examples: `types.ts` (Project, ProjectStatus), `constants.ts` (MOCK_PROJECTS)
- Pattern: Aggregate root with status-based workflow
- Implementation: State transitions in `utils/projectStateTransitions.ts`

**Deliverable Workflow:**
- Purpose: Content delivery pipeline with approval gates
- Examples: `types/deliverable.types.ts`, `components/deliverables/`
- Pattern: State machine with permission-gated transitions
- States: pending → in_progress → beta_ready → awaiting_approval → approved → payment_pending → final_delivered

**Serverless Function Handler:**
- Purpose: Unified API endpoint pattern
- Examples: All files in `netlify/functions/`
- Pattern: Event-driven handlers with database connection pooling
- Structure: CORS preflight, authentication check, business logic, response formatting

## Entry Points

**Vite Portal Entry:**
- Location: `index.tsx`
- Triggers: User navigates to root domain
- Responsibilities: Mount React app with HashRouter, wrap in providers (QueryProvider → ErrorBoundary → AuthProvider → NotificationProvider → HashRouter)

**Vite App Router:**
- Location: `App.tsx`
- Triggers: After React mount
- Responsibilities: Route configuration, protected route wrapper, layout composition

**Next.js Landing Entry:**
- Location: `landing-page-new/src/app/layout.tsx`
- Triggers: User navigates to Next.js routes
- Responsibilities: HTML structure, font loading, global styles, AuthProvider wrapper

**Next.js Portal Entry:**
- Location: `landing-page-new/src/app/portal/layout.tsx`
- Triggers: Routes under `/portal/*`
- Responsibilities: Portal authentication, AppContext provider, Header component, project state management

**Netlify Function Entry:**
- Location: Each file in `netlify/functions/*.ts`
- Triggers: HTTP requests to `/.netlify/functions/{function-name}`
- Responsibilities: Database connection, request handling, response formatting

## Error Handling

**Strategy:** Multi-layer error handling with boundary fallbacks

**Patterns:**
- React Error Boundaries: `components/ErrorBoundary.tsx` wraps entire app
- React Query error handling: `throwOnError: true` in QueryProvider, caught by ErrorBoundary or QueryErrorResetBoundary
- API error responses: Standardized JSON format with statusCode, error message, optional code
- Database errors: Try-catch in Netlify Functions with connection cleanup
- Authentication errors: Session expiration modal (`components/auth/SessionExpiredModal.tsx`)
- File expiration errors: Specific error codes (FILES_EXPIRED) in deliverables API

## Cross-Cutting Concerns

**Logging:**
- Console.log statements in development
- Activity logs tracked in database via `ActivityLog` type
- Admin activity log viewer at `pages/admin/ActivityLogs.tsx`

**Validation:**
- Zod schemas in `shared/contracts/` for API contracts
- Form validation via react-hook-form with Zod resolvers
- Server-side validation in Netlify Functions before database operations

**Authentication:**
- Magic link authentication (passwordless)
- Token storage in PostgreSQL `magic_link_tokens` table
- Session persistence in localStorage (30-day expiration)
- Context-based auth state via `contexts/AuthContext.tsx`
- Protected route HOC in `App.tsx` (ProtectedRoute component)

---

*Architecture analysis: 2026-01-19*
