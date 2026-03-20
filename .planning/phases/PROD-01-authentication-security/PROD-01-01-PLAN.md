# PROD-01-01: Remove Mock Authentication

**Phase:** PROD-01 (Authentication & Security)
**Priority:** Critical
**Estimated Effort:** 30 minutes
**Created:** 2026-01-24

---

## Goal

Eliminate development-only mock authentication code from production builds to prevent unauthorized Super Admin access.

---

## Context

From RESEARCH.md:
- `lib/auth.ts` contains MOCK_USERS dictionary and setMockUser() function (lines 270-322)
- `contexts/AuthContext.tsx` imports and references setMockUser
- This code allows anyone to set themselves as Super Admin in development, which is a critical security risk if shipped to production

**Risk:** Mock auth allows bypassing all authentication - anyone can become Super Admin.

---

## Tasks

### Task 1: Remove Mock Auth from lib/auth.ts

**File:** `lib/auth.ts`

**Changes:**
1. Remove lines 265-323:
   - Remove `// Development Mode Support` section comment
   - Remove `MOCK_USERS` export and object definition
   - Remove `setMockUser` function

**Verification:**
- File compiles without errors
- No exports for MOCK_USERS or setMockUser

### Task 2: Remove Mock Auth Import from Admin AuthContext

**File:** `contexts/AuthContext.tsx`

**Changes:**
1. Line 16: Remove imports `MOCK_USERS` and `setMockUser as setMockUserAuth` from import statement
2. Update import to only include used functions:
   ```typescript
   import {
       getStoredUser,
       getAuthToken,
       clearAuthSession,
       storeAuthSession,
   } from '@/lib/auth';
   ```

**Verification:**
- File compiles without errors
- No references to setMockUser or MOCK_USERS

### Task 3: Remove Mock Auth from Client Portal AuthContext

**File:** `landing-page-new/src/context/AuthContext.tsx`

**Changes:**
1. Check if file imports setMockUser or MOCK_USERS
2. Remove any mock auth imports if present
3. Verify no calls to setMockUser

**Verification:**
- File compiles without errors
- Grep for "MOCK_USER" or "setMockUser" returns zero results in file

### Task 4: Search for Mock Auth Usage in Components

**Search:**
```bash
grep -r "setMockUser\|MOCK_USERS" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" --exclude-dir=node_modules --exclude-dir=.planning
```

**Actions:**
1. Review all files returned by search
2. Remove any development UI components that call setMockUser
3. Update development workflow documentation to use real magic link flow

**Common locations to check:**
- Login pages
- Development mode components
- Test utilities
- Storybook stories

**Verification:**
- Search returns zero results (or only results in .planning/debug docs)

### Task 5: Update Development Workflow

**File:** Create or update development documentation

**Content:**
```markdown
## Development Authentication

In development mode, use the real magic link authentication flow:

1. Start the dev server: `npm run dev`
2. Navigate to the login page
3. Enter your email (must exist in database)
4. Click "Send Magic Link"
5. Check terminal output for magic link URL (logged in development)
6. Click the link or copy to browser
7. You will be logged in with a real JWT session

**Note:** Mock authentication has been removed for security. All environments use the same auth flow.
```

**Verification:**
- Documentation updated
- Development team notified of workflow change

---

## Verification Steps

### Build Verification
```bash
# Admin portal (Vite)
cd /Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1
npm run build

# Client portal (Next.js)
cd landing-page-new
npm run build
```

**Expected:** Both builds succeed without errors

### Code Search Verification
```bash
# From project root
grep -r "setMockUser" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.planning --exclude-dir=dist --exclude-dir=.next
grep -r "MOCK_USERS" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.planning --exclude-dir=dist --exclude-dir=.next
```

**Expected:** Zero results (or only in archived/debug docs)

### Production Bundle Check
```bash
# Check admin portal production bundle
grep -r "setMockUser\|MOCK_USERS" dist/

# Check client portal production bundle
grep -r "setMockUser\|MOCK_USERS" landing-page-new/.next/
```

**Expected:** Zero matches in production bundles

---

## Success Criteria

- [ ] `lib/auth.ts` has no MOCK_USERS or setMockUser exports
- [ ] `contexts/AuthContext.tsx` does not import setMockUser or MOCK_USERS
- [ ] `landing-page-new/src/context/AuthContext.tsx` does not import mock auth
- [ ] Codebase search for "setMockUser" returns zero results (excluding docs)
- [ ] Codebase search for "MOCK_USERS" returns zero results (excluding docs)
- [ ] Admin portal builds successfully
- [ ] Client portal builds successfully
- [ ] Production bundles contain no mock auth code
- [ ] Development workflow documented

---

## Rollback Plan

If this change breaks development workflow:

1. **Temporary:** Revert commits from this plan
2. **Better:** Use database seeding to create test users
3. **Best:** Follow the real magic link flow (terminal logs the URL)

---

## Dependencies

**Blocks:**
- PROD-01-02 (JWT Sessions) - Cannot implement real auth while mock auth exists

**Requires:**
- None - this is the first step

---

## Notes

**Why this is safe:**
- Magic link authentication already works (used in production)
- Only removing development shortcuts, not breaking functionality
- Development team can still test by using real magic links (URL logged to terminal)

**Communication:**
- Notify development team of workflow change
- Update onboarding docs
- Add clear error message if old mock auth flow attempted

---

*Plan ready for execution via /gsd:execute-phase*
