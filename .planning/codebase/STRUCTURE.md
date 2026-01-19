# Directory Structure

**Analysis Date:** 2026-01-19

## Root Level Organization

```
motionify-gai-1/
├── .planning/                  # GSD planning documents (new)
├── components/                 # Vite portal UI components
├── contexts/                   # React contexts (Auth, Notifications)
├── database/                   # SQL schemas and migrations
├── docs/                       # Project documentation
├── e2e/                        # Playwright E2E tests
├── landing-page-new/           # Next.js application (separate)
├── lib/                        # Client-side utilities
├── netlify/functions/          # Serverless API functions
├── pages/                      # Vite portal pages/routes
├── scripts/                    # Build and utility scripts
├── services/                   # External service integrations
├── shared/                     # Cross-app shared code
├── utils/                      # Utility functions
├── App.tsx                     # Vite portal root component
├── index.tsx                   # Vite portal entry point
└── vite.config.ts              # Vite build configuration
```

## Key Locations

**Frontend (Vite Portal):**
- Entry: `index.tsx` → `App.tsx`
- Pages: `pages/` - React Router pages
- Components: `components/` - Reusable UI components
- Contexts: `contexts/` - Global state (AuthContext, NotificationContext)
- Types: `types.ts` - TypeScript type definitions

**Frontend (Next.js Landing):**
- Location: `landing-page-new/`
- Entry: `src/app/layout.tsx`
- Pages: `src/app/` - App Router pages
- Components: `src/components/` - Reusable UI components
- Portal lib: `src/lib/portal/` - Embedded portal functionality

**Backend (Netlify Functions):**
- Location: `netlify/functions/`
- Pattern: One file per endpoint
- Count: 30+ serverless functions
- Key files:
  - `auth-*.ts` - Authentication endpoints
  - `deliverables.ts` - File delivery management
  - `payments.ts` - Payment processing
  - `tasks.ts` - Task management
  - `users-*.ts` - User management

**Database:**
- Location: `database/`
- Schema: `schema.sql` - Main database schema
- Migrations: Various `add-*.sql` files
- Scripts: `*.js` files for data migration

**Shared Code:**
- Location: `shared/`
- Providers: `providers/` - React Query provider
- Contracts: `contracts/` - Shared type definitions
- Utils: `utils/` - Cross-app utilities
- Hooks: `hooks/` - Reusable React hooks

## Naming Conventions

**Files:**
- Components: PascalCase - `DeliverableCard.tsx`
- Utilities: camelCase - `deliverablePermissions.ts`
- API functions: kebab-case - `auth-verify-magic-link.ts`
- Contexts: PascalCase + Context suffix - `AuthContext.tsx`

**Directories:**
- lowercase with hyphens - `landing-page-new/`
- camelCase for code - `deliverables/`, `components/`

## Where to Add New Code

**New UI Feature (Portal):**
1. Add page to `pages/`
2. Create components in `components/[feature]/`
3. Add route to `App.tsx`
4. Create API function in `netlify/functions/`

**New UI Feature (Landing Page):**
1. Add page to `landing-page-new/src/app/[route]/page.tsx`
2. Create components in `landing-page-new/src/components/[feature]/`
3. Add API route to `landing-page-new/src/app/api/[endpoint]/route.ts`

**New API Endpoint:**
1. Create `netlify/functions/[endpoint].ts`
2. Follow existing patterns (CORS, auth, error handling)
3. Update types in `types.ts` or `shared/contracts/`

**New Database Table:**
1. Add to `database/schema.sql`
2. Create migration file `database/add-[feature].sql`
3. Run migration script

**New Shared Utility:**
1. Add to `shared/utils/` or `shared/hooks/`
2. Export from barrel file if applicable
3. Import in both apps

---

*Structure analysis: 2026-01-19*
