---
phase: PROD-01-authentication-security
plan: 09
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/auth.ts
autonomous: true
gap_closure: true

must_haves:
  truths:
    - "Magic link verification sets httpOnly cookie in browser"
    - "Session persists after browser refresh"
    - "/auth-me returns user info after login"
  artifacts:
    - path: "lib/auth.ts"
      provides: "Cookie-aware magic link verification"
      contains: "credentials: 'include'"
  key_links:
    - from: "lib/auth.ts verifyMagicLink()"
      to: "/auth-verify-magic-link"
      via: "fetch with credentials: include"
      pattern: "credentials.*include"
---

<objective>
Fix cookie-based authentication by adding credentials: 'include' to verifyMagicLink() fetch call and removing localStorage token storage.

Purpose: The backend correctly sets httpOnly cookies, but the frontend fetch call in verifyMagicLink() lacks credentials: 'include', causing the browser to reject the Set-Cookie header on cross-origin responses. Additionally, the code still tries to store a token that no longer exists in the response body.

Output: Working cookie-based authentication flow where login sets httpOnly cookie and session persists.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/PROD-01-authentication-security/PROD-01-VERIFICATION.md (gap details)
@.planning/debug/cookie-auth-not-working.md (root cause analysis)
@lib/auth.ts (target file)
@lib/api-config.ts (reference - has working credentials: include)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix verifyMagicLink fetch and response handling</name>
  <files>lib/auth.ts</files>
  <action>
Update the verifyMagicLink() function (lines 205-256) with these specific changes:

1. Add credentials: 'include' to the fetch options (line 207-213):
   ```typescript
   const response = await fetch(`${API_BASE}/auth-verify-magic-link`, {
       method: 'POST',
       headers: {
           'Content-Type': 'application/json',
       },
       credentials: 'include',  // Required for browser to accept Set-Cookie
       body: JSON.stringify({ token, email }),
   });
   ```

2. Update storeAuthSession() call (lines 229-234) to NOT store token since it's now in httpOnly cookie. The backend no longer returns token in response body - only user and expiresAt.

   Change from:
   ```typescript
   storeAuthSession({
       user,
       token: responseData.token,
       expiresAt: responseData.expiresAt,
   });
   ```

   To store only user info (we still need expiresAt for session expiry checks):
   ```typescript
   // Store user info in localStorage (token is now in httpOnly cookie)
   localStorage.setItem(USER_KEY, JSON.stringify(user));
   localStorage.setItem(EXPIRES_KEY, responseData.expiresAt);
   ```

3. Update the return value (lines 236-246) to not include token (it's secret, in cookie):
   ```typescript
   return {
       success: true,
       data: {
           user,
           expiresAt: responseData.expiresAt,
           inquiryCreated: responseData.inquiryCreated,
           inquiryId: responseData.inquiryId,
           inquiryNumber: responseData.inquiryNumber,
       },
       message: data.message,
   };
   ```

4. Update MagicLinkVerifyResponse interface (lines 32-44) to make token optional since it's no longer returned:
   ```typescript
   export interface MagicLinkVerifyResponse {
       success: boolean;
       data?: {
           user: User;
           token?: string;  // Optional - only for backwards compatibility
           expiresAt: string;
           inquiryCreated?: boolean;
           inquiryId?: string;
           inquiryNumber?: string;
       };
       message?: string;
       error?: any;
   }
   ```

5. Update AuthSession interface (lines 46-50) to make token optional:
   ```typescript
   export interface AuthSession {
       user: User;
       token?: string;  // Optional - now using httpOnly cookies
       expiresAt: string;
   }
   ```

6. Update storeAuthSession() function (lines 121-129) to handle optional token:
   ```typescript
   export function storeAuthSession(session: AuthSession): void {
       try {
           if (session.token) {
               localStorage.setItem(TOKEN_KEY, session.token);
           }
           localStorage.setItem(USER_KEY, JSON.stringify(session.user));
           localStorage.setItem(EXPIRES_KEY, session.expiresAt);
       } catch (error) {
           console.error('Failed to store auth session:', error);
       }
   }
   ```

Note: Keep getAuthToken() and related localStorage functions for now - they may still be used by other code paths. The key fix is the credentials: 'include' and not expecting token in response.
  </action>
  <verify>
1. Run TypeScript check: `npx tsc --noEmit lib/auth.ts` (no errors)
2. Grep for the fix: `grep -n "credentials.*include" lib/auth.ts` (shows line in verifyMagicLink)
3. Grep for token handling: `grep -n "responseData.token" lib/auth.ts` (should NOT appear in storeAuthSession call)
  </verify>
  <done>
- verifyMagicLink() includes credentials: 'include' in fetch options
- storeAuthSession call no longer expects token from response
- MagicLinkVerifyResponse.data.token is optional
- TypeScript compiles without errors
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Fixed cookie-based authentication in verifyMagicLink()</what-built>
  <how-to-verify>
1. Start dev servers:
   - Backend: `cd netlify && netlify dev` (port 9999)
   - Frontend: `npm run dev` (port 5173)

2. Open browser to http://localhost:5173
3. Open DevTools -> Application -> Cookies -> localhost:5173 (should be empty)
4. Login with magic link:
   - Enter email for a test user
   - Check terminal/email for magic link
   - Click magic link or paste token

5. After login verify:
   - Redirected to dashboard (not login page)
   - DevTools Cookies shows `auth_token` cookie with HttpOnly flag
   - Cookie domain is localhost, path is /

6. Test session persistence:
   - Refresh the page (F5)
   - Should STILL be on dashboard (not redirected to login)
   - Call /auth-me in DevTools console:
     `fetch('http://localhost:9999/.netlify/functions/auth-me', {credentials:'include'}).then(r=>r.json()).then(console.log)`
   - Should return user object, not 401

7. If any step fails, describe the issue.
  </how-to-verify>
  <resume-signal>Type "approved" if login sets cookie and session persists, or describe issues</resume-signal>
</task>

</tasks>

<verification>
- `grep -n "credentials.*include" lib/auth.ts` shows credentials in verifyMagicLink fetch
- TypeScript compiles: `npx tsc --noEmit`
- Cookie appears in browser DevTools after login
- Session persists after page refresh
- /auth-me returns user info (not 401)
</verification>

<success_criteria>
1. Browser receives and stores httpOnly auth_token cookie after magic link verification
2. Page refresh does not log user out
3. /auth-me endpoint returns user info when called with credentials: include
4. No TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-01-authentication-security/PROD-01-09-SUMMARY.md`
</output>
