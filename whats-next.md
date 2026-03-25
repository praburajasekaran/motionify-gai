# What's Next: Auth-Aware Navigation Handoff

<original_task>
Update the navigation bar on both the portal app (localhost:5173) and landing page app (localhost:5174) so that when a user is logged in:
1. Remove the "Login" button
2. Change the "Get in touch" / "Get Started" CTA button to "Dashboard" (navigating to the dashboard)
3. Show the logged-in user's name in the nav bar area
</original_task>

<work_completed>
## 1. Portal App Header — `components/Header.tsx`

Added auth-aware conditional rendering using `useAuth()` hook (from `@/hooks/useAuth`) and `useNavigate` (react-router-dom):

- **Logged in:** Shows `Welcome, {user.name}` + orange "Dashboard" button → `navigate('/dashboard')`
- **Logged out:** Shows `<a href="/login">Login</a>` + "Get in touch" button
- Wrapped in `{!isLoading && (...)}` to prevent flash during auth check

Auth source: `useAuth()` → `AuthContext` at `/contexts/AuthContext.tsx` which calls `/auth-me` on mount via httpOnly cookie.
User type: `User` from `/types.ts` — name field is `name: string`.

---

## 2. Landing Page Header — `landing-page-new/src/components/Header.tsx`

Same conditional pattern, using `useAuth()` from `@/context/AuthContext` and `useRouter` from `next/navigation`:

- **Logged in:** Shows `Welcome, {user.fullName}` + orange "Dashboard" button → `router.push('/portal/dashboard')`
- **Logged out:** Shows Login link + "Get Started" button (href `/#video-style-quiz`)

Auth source: Landing page's own `AuthContext` at `landing-page-new/src/context/AuthContext.tsx`, also calls `getCurrentUser()` → `/auth-me` on mount.
User type: `AuthUser` from `landing-page-new/src/lib/portal/types/auth.types.ts` — name field is `fullName: string`.

---

## 3. Bug Fix — Empty Name ("Welcome,") — `landing-page-new/src/lib/portal/utils/user-transform.ts`

**Root cause:** `/auth-me` endpoint returns `user.name` (camelCase), but `transformUser()` only looked for `dbUser.full_name` (snake_case) → `undefined` → `fullName` defaulted to `''`.

**Fix:**
- Added `name?: string` to `DatabaseUser` interface (with comment explaining the discrepancy)
- Made `full_name` optional: `full_name?: string`
- Updated mapping: `fullName: dbUser.full_name || dbUser.name || ''`

---

## 4. Git Commits (all on local `main`, rebased into `claude/sleepy-wing`)

| Commit SHA | Message |
|------------|---------|
| `a0c5976`  | refactor: update header navigation |
| `508f31a`  | feat: show user name in header and change CTA based on auth status |
| `c51279e`  | fix: read auth state in landing page Header to reflect login status |
| `b5637b7`  | fix: handle 'name' field from auth-me in user transform |
| `1a65c7c`  | fix: update Start Your Project button to link to quiz section |

Local `main` is **5 commits ahead of `origin/main`**. Worktree branch `claude/sleepy-wing` is rebased on local main.
</work_completed>

<work_remaining>
## Immediate
- **Push to origin:** `cd /Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1 && git push origin main`
- **Create PR** for `claude/sleepy-wing` → `main` if a review is needed

## Testing / Verification
- Login at `localhost:5173/portal/login?token=...&email=...`
- Confirm portal nav (`localhost:5173`) shows: `Welcome, {name}` + Dashboard button
- Confirm landing page nav (`localhost:5174`) shows: `Welcome, {name}` + Dashboard button
- Confirm Dashboard button navigates correctly on each app
- Confirm logout returns both navs to Login + CTA state

## Not Addressed (out of scope)
- **Mobile hamburger menu** — auth-aware nav only wired for desktop (`hidden sm:flex`). The `sm:hidden` mobile button on both Headers is not auth-aware. If there's a mobile drawer/menu, it would still show wrong state when logged in.
- **Loading skeleton** — during `isLoading`, nav items disappear entirely (blank space). A skeleton placeholder could prevent layout shift.
</work_remaining>

<attempted_approaches>
## Serena `replace_symbol_body` corruption
- Used `replace_symbol_body` on the portal Header → tool returned OK but file was corrupted (old + new content concatenated). Git showed clean because it wrote to Serena's project root, not the worktree.
- **Resolution:** Used `create_text_file` to overwrite with clean content, verified via `Read` against main repo path.

## Committing to wrong branch
- First commit attempt (`cd` to main repo + `git add/commit`) wrote to `main` branch instead of `claude/sleepy-wing` worktree branch. `git log` in worktree didn't show the commit.
- **Resolution:** From within the worktree, run `git rebase main` to pull commits from local main into the worktree branch. This is the established pattern for this repo.

## Edit tool without prior Read
- `Edit` tool requires the file to have been `Read` in the same conversation — throws "File has not been read yet" otherwise.
- **Resolution:** Always `Read` first, then `Edit`.
</attempted_approaches>

<critical_context>
## Project Architecture
Two separate apps in the same repo:
| App | Tech | Port | Base Path | Root |
|-----|------|------|-----------|------|
| Portal | Vite + React | 5173 | `/portal/` | repo root |
| Landing page | Next.js | 5174 | `/` | `landing-page-new/` |
| API backend | Netlify Functions | 8888 | `/.netlify/functions/` | `netlify/functions/` |

Both apps proxy `/.netlify/functions/*` → `localhost:8888`. Cookies set by backend are domain `localhost` with no port — shared across both ports.

## Auth Cookie
Set by `netlify/functions/auth-verify-magic-link.ts`:
- Name: `auth_token`
- Attributes: `HttpOnly; Path=/; SameSite=Strict; Max-Age=86400` (or 7 days if rememberMe)
- No `Secure` in dev, added in production
- `SameSite=Strict` is fine here — both apps are same-site (`localhost`)

## User Object Field Differences
| App | Type | Name field |
|-----|------|-----------|
| Portal | `User` (`/types.ts`) | `name: string` |
| Landing page | `AuthUser` (`auth.types.ts`) | `fullName: string` |
| `/auth-me` API response | raw JSON | `user.name` |

## `/auth-me` Response Shape
```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "...",
    "role": "...",
    "name": "...",      ← NOT full_name
    "timezone": "...",
    "projectCount": 1   ← only for client role
  }
}
```

## Dashboard Routing
- Portal app: Dashboard at `/dashboard` (React Router)
- Landing page → `/portal/dashboard` → Next.js redirects `/portal/:path*` to `localhost:5173/portal/:path*` in dev

## Key Files
| File | Purpose |
|------|---------|
| `components/Header.tsx` | Portal nav |
| `hooks/useAuth.ts` | Portal auth hook |
| `contexts/AuthContext.tsx` | Portal auth context |
| `types.ts` | Portal `User` type |
| `landing-page-new/src/components/Header.tsx` | Landing page nav |
| `landing-page-new/src/context/AuthContext.tsx` | Landing page auth context |
| `landing-page-new/src/lib/portal/utils/user-transform.ts` | Maps `/auth-me` response → `AuthUser` |
| `landing-page-new/src/lib/portal/types/auth.types.ts` | `AuthUser` type |
| `landing-page-new/src/lib/portal/api/auth.api.ts` | `getCurrentUser()` and other auth API calls |
| `netlify/functions/auth-me.ts` | `/auth-me` endpoint source |

## Git Worktree Pattern (this repo)
- Commits go to local `main` via: `cd /path/to/motionify-gai-1 && git add <file> && git commit`
- Worktree sync: from worktree dir, run `git rebase main`
- Push: `cd /path/to/motionify-gai-1 && git push origin main`
</critical_context>

<current_state>
## Deliverable Status
| Item | Status |
|------|--------|
| Portal Header (`components/Header.tsx`) | ✅ Complete & committed |
| Landing page Header (`landing-page-new/src/components/Header.tsx`) | ✅ Complete & committed |
| Empty name bug fix (`user-transform.ts`) | ✅ Complete & committed |
| Pushed to `origin/main` | ❌ Pending — 5 commits ahead locally |
| PR created | ❌ Not done |
| Mobile menu auth-awareness | ⬜ Out of scope, not addressed |

## Branch State
- `claude/sleepy-wing` (worktree): rebased on local main, HEAD at `1a65c7c`
- `main` (local): 5 commits ahead of `origin/main`
- `origin/main`: at `7502151` (Merge PR #24 from fix/footer-updates)

## Open Questions
- Should "Pricing" be added to the landing page Header nav? It appears in the portal Header and the original screenshot but was already absent in the landing page's original Header — not changed either way.
- Should `claude/sleepy-wing` be PR'd into main or merged directly?
</current_state>
