# Coding Conventions

**Analysis Date:** 2026-01-19

## Naming Patterns

**Files:**
- React components: PascalCase with `.tsx` extension - `DeliverableCard.tsx`, `TaskEditModal.tsx`
- Utility modules: camelCase with `.ts` extension - `deliverablePermissions.ts`, `taskParser.ts`
- API functions: kebab-case with `.ts` - `auth-verify-magic-link.ts`, `project-members-remove.ts`
- Context files: PascalCase ending in `Context.tsx` - `AuthContext.tsx`, `NotificationContext.tsx`

**Functions:**
- Components: PascalCase - `DeliverableCard`, `TaskEditModal`, `NotificationBell`
- Utility functions: camelCase - `canViewDeliverable`, `isMotionifyTeam`, `mapTaskFromDB`
- Handler functions: camelCase prefixed with `handle` - `handleNavigate`, `handleUploadClick`, `handleSave`
- Event handlers: camelCase starting with `on` - `onClose`, `onSave`, `onChange`

**Variables:**
- Local state: camelCase - `isUploading`, `uploadProgress`, `thumbnailUrl`
- Constants: UPPER_SNAKE_CASE - `MAX_FILE_SIZE`, `ALLOWED_FILE_TYPES`, `STATUS_CONFIG`
- Component props: camelCase - `deliverable`, `className`, `isOpen`
- Database fields: snake_case - `project_id`, `user_id`, `created_at`, `beta_file_key`

**Types:**
- Interfaces: PascalCase - `User`, `Task`, `Deliverable`, `NetlifyEvent`
- Type unions: PascalCase - `UserRole`, `DeliverableStatus`, `ProjectStatus`
- Enum-like objects: UPPER_SNAKE_CASE keys - `USER_ROLE_LABELS`, `NOTIFICATION_ICONS`

## Code Style

**Formatting:**
- No explicit formatter detected (no `.prettierrc` or similar)
- Indentation: 2 spaces (consistent across codebase)
- Line length: Typically under 100 characters, but not strictly enforced
- Semicolons: Used consistently
- Quotes: Single quotes for strings, double quotes in JSX attributes
- Trailing commas: Used in multi-line objects and arrays

**Linting:**
- No ESLint configuration detected
- TypeScript strict mode enabled in both main and landing-page projects
- `skipLibCheck: true` used to speed up compilation

## Import Organization

**Order:**
1. External library imports (React, third-party packages)
2. Component imports from UI libraries
3. Local component imports
4. Utility/service imports
5. Type imports
6. Asset imports

**Path Aliases:**
- Main app: `@/` maps to project root - `@/components`, `@/lib`, `@/types`
- Landing page: `@/` maps to `src/` - `@/components`, `@/lib/portal`
- Consistent use of aliases instead of relative paths for cleaner imports

## Error Handling

**Patterns:**
- Try-catch blocks for async operations with console error logging
- User-facing alerts for critical errors: `alert('Upload failed. Check console for details.')`
- Non-blocking error handling: Log and continue for non-critical failures (e.g., email notifications)
- Graceful degradation: Thumbnail generation failures don't block upload completion

**API Error Responses:**
- Structured JSON error responses with `error` and optional `message` fields
- Appropriate HTTP status codes: 400 (bad request), 403 (forbidden), 404 (not found), 500 (server error)
- Permission errors include `code` field: `{ error: '...', code: 'PERMISSION_DENIED' }`

## Logging

**Framework:** Console (native)

**Patterns:**
- Informational logs: `console.log('✅ Email sent to:', email)`
- Warnings: `console.warn('Could not log activity:', error)`
- Errors: `console.error('API error:', error)`
- Success indicators: Prefix with ✅ emoji
- Failure indicators: Prefix with ❌ emoji
- Conditional logging: Skip messages when features disabled

**Where to Log:**
- API functions: All database operations, email sends, permission checks
- Components: Upload progress, file operations, state transitions
- Error boundaries: Component errors and stack traces

## Comments

**When to Comment:**
- File-level docstrings: Purpose and key characteristics of components
- Function-level JSDoc: For complex permission logic and utility functions
- Inline comments: Complex business logic, permission rules, state transitions
- TODO comments: Mark incomplete implementations with context

**JSDoc/TSDoc:**
- Used extensively in permission utilities: `utils/deliverablePermissions.ts`
- Describes parameters, return types, and business rules
- Not used for simple getters/setters

## Function Design

**Size:**
- Components: 100-600 lines typical for complex UI components
- Functions: 10-50 lines for utilities, longer for API handlers with multiple HTTP methods
- Extract complex logic into separate functions (e.g., `getActionButton()`, `getAdminActions()`)

**Parameters:**
- Use interfaces for component props
- Destructure parameters in function signatures
- Optional parameters marked with `?` in TypeScript
- Default values provided in destructuring: `{ isLoading = false }`

**Return Values:**
- API handlers return `NetlifyResponse` with `statusCode`, `headers`, `body`
- Permission checks return boolean
- Getters return nullable JSX: `JSX.Element | null`
- Async functions explicitly typed: `Promise<NetlifyResponse>`

## Module Design

**Exports:**
- Named exports preferred: `export function handler()`, `export const DeliverableCard`
- Default exports for page components: `export default defineConfig()`
- Utility modules export multiple functions
- Type modules export multiple interfaces and types

**Barrel Files:**
- Not heavily used
- `components/ui/design-system.tsx` acts as a barrel for UI primitives
- Individual imports preferred for clarity

## React Patterns

**Component Structure:**
1. Imports
2. Type/interface definitions
3. Constants (icons, config objects)
4. Component function
5. Internal state with `useState`
6. Side effects with `useEffect`
7. Handler functions
8. Helper functions (rendering)
9. Return JSX

**State Management:**
- Local state with `useState` for component-specific data
- Context for cross-cutting concerns: `AuthContext`, `NotificationContext`
- No Redux or other global state library detected

**Hooks Usage:**
- React hooks: `useState`, `useEffect`, `useRef`, `useContext`
- React Router hooks: `useNavigate`
- Custom hooks: `useAuthContext()`, `useNotifications()`

## TypeScript Conventions

**Strict Mode:**
- Enabled in both `tsconfig.json` files
- `noEmit: true` for type checking only (Vite handles compilation)
- `skipLibCheck: true` to improve performance

**Type Safety:**
- All parameters typed explicitly
- Return types inferred or explicitly typed for complex functions
- Interfaces over types for object shapes
- Type unions for enums: `type UserRole = 'super_admin' | 'project_manager' | ...`
- Use `any` sparingly, typically for database row transformations

**Type Imports:**
- Import types from centralized `types.ts` files
- Use `import type` when only importing types (not consistently applied)

## Database Conventions

**Query Patterns:**
- Parameterized queries exclusively: `client.query('SELECT * FROM users WHERE id = $1', [userId])`
- Never string interpolation for SQL (prevents injection)
- Dynamic UPDATE queries built with array of field expressions
- Snake_case for all database column names

**Connection Management:**
- Create new client per request in serverless functions
- Always close client in `finally` block
- SSL enabled with `rejectUnauthorized: false`

---

*Convention analysis: 2026-01-19*
