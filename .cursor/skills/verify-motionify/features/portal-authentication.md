# Portal authentication

Users open the portal from the public site, request an email magic link, sign in to their workspace, return to the originally requested protected page, and log out.

## Sub-features

- `login-header`, `login-mobile`, and `login-direct` reach `/portal/login`; public Login opens a new tab.
- `login-alias` redirects `/login` to the canonical portal route.
- `login-protected-next` preserves a signed-out user's protected destination.
- `login-magic-link` covers delivery, verification, session identity, and remember-me choice.
- `logout` removes the usable session and returns to login.

## How to get to it (user POV)

- Choose `Login` in the desktop header or mobile menu; visit `/portal/login` or legacy `/login` directly.
- Visit `/portal/projects` while signed out to be sent to login with a return destination.
- Enter `Email address`, optionally check `Remember me for 30 days`, and choose `Send magic link`. Open the received link from the controlled inbox.
- Once signed in, open the portal's `User menu` and choose `Log Out`. The public header then offers `Portal` in place of `Login`.

## Driving it with Playwright

Preconditions: a fresh baseline context for signed-out checks; a disposable full-stack instance, real user account, and controlled inbox for magic-link/logout checks.

- **Automated entry checks.** Run `rtk node .cursor/skills/verify-motionify/scripts/control.mjs drive "$VERIFY_RUN" portal-entry`. It clicks desktop Login and asserts a real popup at `/portal/login`, checks the protected Projects redirect with `next=%2Fprojects`, and follows `/login` to the canonical login route. It does not request or verify a magic link.
- **Mobile entry.** Set a 390px viewport, open `/`, click `page.getByRole('button', { name: 'Open menu', exact: true })`, start `const nextPage = context.waitForEvent('page')`, and click header `Login`. Require the new page's `Welcome back` heading and `Email address` label; capture both the menu action and popup.
- **Magic-link request.** On the owned full-stack login page, fill `page.getByLabel('Email address', { exact: true })` with the controlled account email, optionally check `page.getByRole('checkbox', { name: 'Remember me for 30 days', exact: true })`, and click `page.getByRole('button', { name: 'Send magic link', exact: true })`. Require `Check your inbox`, the matching address, the actual controlled email, and the real `auth-request-magic-link` response.
- **Verification.** Navigate the same test context to the received login URL after confirming its origin is the owned dev instance. Require an `auth-verify-magic-link` success response, then a real `auth-me` response with the expected email/role. If the initial entry was `/portal/projects`, require Projects after verification. Capture the requested destination and resulting authenticated view. Keep private tokens out of shareable logs.
- **Different email.** On the inbox success screen, click `page.getByRole('button', { name: 'Use a different email', exact: true })`; require the email form to return.
- **Logout.** Click `page.getByRole('button', { name: 'User menu', exact: true })`, then `page.getByRole('menuitem', { name: 'Log Out', exact: true })`. Observe the `auth-logout` response and return to `/portal/login`, then try `/portal/projects` again. Require login instead of an authenticated view. A cleared localStorage key alone is insufficient.

## Gotchas

- The account dropdown contains Settings and Log Out. Historical solution notes about direct logout describe an older implementation.
- Public Login is a real popup with `target="_blank"`; navigating directly does not prove that entry point.
- `e2e/helpers/auth.ts` injects `auth_user`/`auth_expires` and fulfills auth responses. It does not prove real login, role assignment, cookies, or logout.
- Older docs mention `mockUser` and demo role buttons. Current login is email magic-link auth.
- Baseline requests are blocked. A magic-link request in that profile is a blocked path, never a valid authentication pass.
