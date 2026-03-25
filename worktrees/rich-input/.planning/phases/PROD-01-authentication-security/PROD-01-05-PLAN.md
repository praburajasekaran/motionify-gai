---
phase: PROD-01-authentication-security
plan: 05
type: execute
wave: 1
depends_on: []
files_modified:
  - contexts/AuthContext.tsx
  - lib/auth.ts
  - landing-page-new/src/context/AuthContext.tsx
  - landing-page-new/src/lib/portal/api/auth.api.ts
autonomous: true
gap_closure: true

must_haves:
  truths:
    - "Admin portal AuthContext calls /auth-me on mount instead of reading localStorage"
    - "Admin portal logout calls /auth-logout endpoint to clear httpOnly cookie"
    - "Client portal AuthContext prioritizes cookie-based session check over localStorage"
    - "Sessions persist across browser restarts via httpOnly cookies"
  artifacts:
    - path: "contexts/AuthContext.tsx"
      provides: "Cookie-based session management for admin portal"
      contains: "/auth-me"
    - path: "lib/auth.ts"
      provides: "Updated auth utilities without localStorage for session"
      exports: ["clearAuthSession", "storeAuthSession"]
    - path: "landing-page-new/src/context/AuthContext.tsx"
      provides: "Cookie-first session management for client portal"
      contains: "getCurrentUser"
  key_links:
    - from: "contexts/AuthContext.tsx"
      to: "/auth-me"
      via: "fetch with credentials: 'include'"
      pattern: "auth-me.*credentials.*include"
    - from: "contexts/AuthContext.tsx"
      to: "/auth-logout"
      via: "fetch on logout"
      pattern: "auth-logout"
---

<objective>
Migrate frontend authentication from localStorage to httpOnly cookie-based sessions.

Purpose: The backend correctly sets httpOnly cookies with JWT tokens, but the frontend ignores them and reads from localStorage. This defeats the security enhancement and leaves tokens vulnerable to XSS attacks.

Output: Both admin and client portals use cookie-based authentication, calling /auth-me to verify sessions instead of reading localStorage.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

@contexts/AuthContext.tsx
@lib/auth.ts
@lib/api-config.ts
@landing-page-new/src/context/AuthContext.tsx
@landing-page-new/src/lib/portal/api/auth.api.ts
@netlify/functions/auth-me.ts
@netlify/functions/auth-logout.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update Admin Portal AuthContext to Use Cookie-Based Sessions</name>
  <files>
    - contexts/AuthContext.tsx
    - lib/auth.ts
  </files>
  <action>
    Update contexts/AuthContext.tsx to use cookie-based authentication:

    1. Remove imports of getStoredUser and getAuthToken from lib/auth
    2. Update loadUser() function:
       - Instead of reading from localStorage, call the /auth-me endpoint
       - Use fetch with credentials: 'include' to send the httpOnly cookie
       - Parse the response to get the user object
       - Handle 401 responses by setting user to null (not logged in)

    3. Update logout() function:
       - Call the /auth-logout endpoint with credentials: 'include'
       - Then call clearAuthSession() to clean up any legacy localStorage data
       - Redirect to login page after logout

    4. Update refreshSession() function:
       - Call /auth-me endpoint instead of reading from localStorage
       - If 401, clear session and set user to null

    5. Remove the storage event listener for 'auth_token' and 'auth_user' since we no longer use localStorage for session state

    6. Keep the token state for backward compatibility with any components that check it, but derive it from user existence

    Example loadUser implementation:
    ```typescript
    const loadUser = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/auth-me`, {
                method: 'GET',
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data?.user) {
                    setUserState(data.data.user);
                    setToken('cookie'); // Indicate we have a session
                    return;
                }
            }

            // No valid session
            setToken(null);
            setUserState(null);
        } catch (error) {
            console.error('Failed to load user session:', error);
            setToken(null);
            setUserState(null);
        } finally {
            setIsLoading(false);
        }
    }, []);
    ```

    Update lib/auth.ts:
    - Keep clearAuthSession() for cleaning up legacy localStorage data
    - Keep storeAuthSession() for the magic link verification flow (which stores user temporarily)
    - Mark getStoredUser() and getAuthToken() as deprecated with a console warning
  </action>
  <verify>
    1. Run `npm run build` in root directory - should pass
    2. Verify: `grep -n "getStoredUser\|getAuthToken" contexts/AuthContext.tsx` returns zero results
    3. Verify: `grep -n "auth-me" contexts/AuthContext.tsx` returns results
    4. Verify: `grep -n "auth-logout" contexts/AuthContext.tsx` returns results
  </verify>
  <done>
    - Admin portal AuthContext calls /auth-me endpoint on mount
    - Admin portal logout calls /auth-logout endpoint
    - No direct localStorage reads for session state in AuthContext
    - Build passes without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Update Client Portal AuthContext to Prioritize Cookies</name>
  <files>
    - landing-page-new/src/context/AuthContext.tsx
    - landing-page-new/src/lib/portal/api/auth.api.ts
  </files>
  <action>
    Update landing-page-new/src/context/AuthContext.tsx to prioritize cookie-based auth:

    1. Reorder the session loading logic in loadUser():
       - FIRST: Call authApi.getCurrentUser() (which hits /auth-me with credentials: 'include')
       - If that returns a valid user, use it and optionally cache to localStorage
       - ONLY if the API call fails AND we have localStorage data, use localStorage as fallback
       - This reverses the current order which checks localStorage first

    2. Update the useEffect that calls loadUser():
       ```typescript
       useEffect(() => {
           const loadUser = async () => {
               if (user) {
                   setIsLoading(false);
                   return;
               }

               // Try API first (cookie-based session)
               try {
                   const response = await authApi.getCurrentUser();
                   if (response.success && 'data' in response) {
                       setUser(response.data.user);
                       // Optionally cache for faster subsequent loads
                       localStorage.setItem('portal_user', JSON.stringify(response.data.user));
                       setIsLoading(false);
                       return;
                   }
               } catch (error) {
                   console.log('[AuthContext] API session check failed, checking localStorage fallback');
               }

               // Fallback to localStorage only for edge cases (offline, etc.)
               const savedUser = localStorage.getItem('portal_user');
               if (savedUser) {
                   try {
                       setUser(JSON.parse(savedUser));
                   } catch {
                       localStorage.removeItem('portal_user');
                   }
               }

               setIsLoading(false);
           };

           loadUser();
       }, []);
       ```

    3. Ensure logout() clears both the cookie (via API) AND localStorage:
       - Already calls authApi.logout() which hits /auth-logout
       - Already clears localStorage and cookie - this is good

    4. Verify that authApi.getCurrentUser() uses credentials: 'include':
       - Check landing-page-new/src/lib/portal/api/auth.api.ts
       - The getCurrentUser function should call /auth-me with credentials: 'include'
       - If not, update it to include credentials: 'include' in the fetch options
  </action>
  <verify>
    1. Run `cd landing-page-new && npm run build` - should pass
    2. Verify the order of checks: API first, then localStorage
    3. Verify: `grep -n "getCurrentUser" landing-page-new/src/context/AuthContext.tsx` shows it's called before localStorage check
  </verify>
  <done>
    - Client portal AuthContext checks /auth-me endpoint first
    - localStorage only used as fallback/cache
    - Both admin and client portals use cookie-based sessions
    - Client portal build passes
  </done>
</task>

<task type="auto">
  <name>Task 3: Ensure credentials: 'include' on All Fetch Calls</name>
  <files>
    - lib/api-config.ts (verify)
    - landing-page-new/src/lib/portal/api/*.ts
  </files>
  <action>
    Verify and ensure all API calls include credentials: 'include':

    1. Admin Portal (lib/api-config.ts):
       - Already has credentials: 'include' on line 73 - VERIFIED
       - No changes needed for admin portal API config

    2. Client Portal API files - check each file in landing-page-new/src/lib/portal/api/:
       - auth.api.ts - verify all fetch calls have credentials: 'include'
       - proposals.ts - add credentials: 'include' if missing
       - inquiries.ts - add credentials: 'include' if missing
       - Any other API files - add credentials: 'include' if missing

    The pattern to look for and add if missing:
    ```typescript
    fetch(url, {
        method: 'GET/POST/etc',
        headers: { ... },
        credentials: 'include',  // <-- This must be present
        body: ...
    })
    ```

    If the client portal uses a centralized fetch wrapper, update that instead.
  </action>
  <verify>
    1. Run `grep -r "credentials.*include" landing-page-new/src/lib/portal/api/` - should show results
    2. Run `grep -rL "credentials.*include" landing-page-new/src/lib/portal/api/*.ts` - should be empty (all files have it)
    3. Run both builds: `npm run build && cd landing-page-new && npm run build`
  </verify>
  <done>
    - All fetch calls in both portals include credentials: 'include'
    - httpOnly cookies are sent with every API request
    - Both builds pass
  </done>
</task>

</tasks>

<verification>
After completing all tasks:

1. Build verification:
   - `npm run build` passes for admin portal
   - `cd landing-page-new && npm run build` passes for client portal

2. Code verification:
   - `grep "getStoredUser\|getAuthToken" contexts/AuthContext.tsx` returns zero results
   - `grep "auth-me" contexts/AuthContext.tsx` returns results
   - `grep "auth-logout" contexts/AuthContext.tsx` returns results
   - `grep -r "credentials.*include" lib/api-config.ts` returns results

3. Functional verification (manual):
   - Login via magic link sets httpOnly cookie (visible in DevTools)
   - Session persists after browser restart
   - localStorage does NOT contain auth_token or auth_user after login
   - Logout clears the cookie
</verification>

<success_criteria>
1. Admin portal AuthContext uses /auth-me endpoint instead of localStorage
2. Client portal AuthContext prioritizes /auth-me over localStorage
3. All API calls include credentials: 'include'
4. Both portals build successfully
5. No direct localStorage reads for auth_token or auth_user in AuthContext
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-01-authentication-security/PROD-01-05-SUMMARY.md`
</output>
