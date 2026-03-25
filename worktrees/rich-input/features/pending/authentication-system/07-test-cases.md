# Test Cases: Authentication System

Comprehensive test scenarios for the Authentication System, focusing on Magic Link authentication, session management, and security.

## 1. Magic Link Generation (5 test cases)

### TC-AUTH-001: Request Magic Link - Valid Email
**Priority:** High
**Feature:** Magic Link Generation
**Description:** Verify that a user can request a magic link with a valid, registered email address.
**Pre-conditions:** User exists in the database.
**Steps:**
1. Navigate to the Login page.
2. Enter a valid registered email address (e.g., `client.test@motionify.studio`).
3. Click "Send Magic Link".
**Expected Result:**
- ✓ Success message displayed: "Check your email for the login link".
- ✓ Magic link token generated in database.
- ✓ Email dispatched to the user.

### TC-AUTH-002: Request Magic Link - Unregistered Email
**Priority:** Medium
**Feature:** Magic Link Generation
**Description:** Verify system behavior when requesting a link for an email that doesn't exist.
**Steps:**
1. Navigate to the Login page.
2. Enter an unregistered email address (e.g., `unknown@example.com`).
3. Click "Send Magic Link".
**Expected Result:**
- ✓ Generic success message displayed (to prevent user enumeration).
- ✓ NO magic link token generated.
- ✓ NO email sent (or generic "account not found" email if security policy requires).

### TC-AUTH-003: Request Magic Link - Invalid Email Format
**Priority:** Low
**Feature:** Magic Link Generation
**Description:** Verify validation for invalid email formats.
**Steps:**
1. Navigate to the Login page.
2. Enter an invalid email format (e.g., `user@`, `user.com`, `user@domain`).
3. Click "Send Magic Link".
**Expected Result:**
- ✓ Client-side validation error displayed.
- ✓ Form not submitted.

### TC-AUTH-004: Request Magic Link - Rate Limiting
**Priority:** Medium
**Feature:** Magic Link Generation
**Description:** Verify that a user cannot spam magic link requests.
**Steps:**
1. Request a magic link for `client.test@motionify.studio`.
2. Immediately request another link for the same email.
3. Repeat 3-5 times in rapid succession.
**Expected Result:**
- ✓ First few requests succeed.
- ✓ Subsequent requests blocked with "Too many requests, please try again later".

### TC-AUTH-005: Request Magic Link - Case Insensitivity
**Priority:** Low
**Feature:** Magic Link Generation
**Description:** Verify email is treated case-insensitively.
**Steps:**
1. User registered as `client.test@motionify.studio`.
2. Enter `CLIENT.TEST@MOTIONIFY.STUDIO` in login form.
3. Click "Send Magic Link".
**Expected Result:**
- ✓ System recognizes the email.
- ✓ Magic link sent successfully.

## 2. Magic Link Consumption (8 test cases)

### TC-AUTH-006: Login with Valid Token
**Priority:** High
**Feature:** Magic Link Consumption
**Description:** Verify successful login with a valid, unexpired token.
**Pre-conditions:** Valid magic link generated.
**Steps:**
1. Click the magic link from the email (e.g., `/auth/verify?token=xyz...`).
**Expected Result:**
- ✓ User redirected to dashboard/portal.
- ✓ Session cookie/JWT set.
- ✓ User is authenticated.

### TC-AUTH-007: Login with Expired Token
**Priority:** High
**Feature:** Magic Link Consumption
**Description:** Verify login fails with an expired token.
**Pre-conditions:** Magic link generated > 15 minutes ago (or configured expiry).
**Steps:**
1. Click the expired magic link.
**Expected Result:**
- ✓ Error message displayed: "This link has expired".
- ✓ User redirected to login page.
- ✓ User NOT authenticated.

### TC-AUTH-008: Login with Invalid Token
**Priority:** High
**Feature:** Magic Link Consumption
**Description:** Verify login fails with a tampered token.
**Steps:**
1. Navigate to `/auth/verify?token=invalid_token_string`.
**Expected Result:**
- ✓ Error message displayed: "Invalid login link".
- ✓ User redirected to login page.

### TC-AUTH-009: Login with Used Token
**Priority:** High
**Feature:** Magic Link Consumption
**Description:** Verify a token cannot be used twice (One-time use).
**Steps:**
1. Generate magic link.
2. Click link and successfully login.
3. Logout.
4. Click the SAME link again.
**Expected Result:**
- ✓ Error message displayed: "This link has already been used" or "Invalid link".
- ✓ User NOT authenticated.

### TC-AUTH-010: Login Redirect Logic - Admin
**Priority:** Medium
**Feature:** Magic Link Consumption
**Description:** Verify Admin users are redirected to the Admin Dashboard.
**Pre-conditions:** User has `super_admin` role.
**Steps:**
1. Login via magic link.
**Expected Result:**
- ✓ Redirected to `/admin/dashboard`.

### TC-AUTH-011: Login Redirect Logic - Client
**Priority:** Medium
**Feature:** Magic Link Consumption
**Description:** Verify Client users are redirected to the Client Portal.
**Pre-conditions:** User has `client` role.
**Steps:**
1. Login via magic link.
**Expected Result:**
- ✓ Redirected to `/portal/dashboard` (or specific project if deep linked).

### TC-AUTH-012: Deep Linking Support
**Priority:** Medium
**Feature:** Magic Link Consumption
**Description:** Verify user is redirected to the intended page after login.
**Steps:**
1. User attempts to access protected route `/portal/projects/123`.
2. Redirected to login.
3. Request magic link.
4. Click magic link.
**Expected Result:**
- ✓ User authenticated.
- ✓ Redirected back to `/portal/projects/123`, NOT default dashboard.

### TC-AUTH-013: Cross-Browser Login
**Priority:** Low
**Feature:** Magic Link Consumption
**Description:** Verify link requested on Desktop can be opened on Mobile.
**Steps:**
1. Request link on Desktop Chrome.
2. Open email and click link on Mobile Safari.
**Expected Result:**
- ✓ Login successful on Mobile Safari.
- ✓ (Note: Desktop session remains unauthenticated unless using websockets to sync, which is optional).

## 3. Session Management (5 test cases)

### TC-AUTH-014: Successful Logout
**Priority:** High
**Feature:** Session Management
**Description:** Verify user can logout effectively.
**Steps:**
1. Logged in user clicks "Logout".
**Expected Result:**
- ✓ Session cookie cleared/invalidated.
- ✓ Redirected to home/login page.
- ✓ Clicking "Back" button does not restore session.

### TC-AUTH-015: Session Persistence
**Priority:** Medium
**Feature:** Session Management
**Description:** Verify session persists across page reloads.
**Steps:**
1. Logged in user refreshes the page.
2. Opens new tab to same domain.
**Expected Result:**
- ✓ User remains logged in.

### TC-AUTH-016: Session Expiry
**Priority:** Medium
**Feature:** Session Management
**Description:** Verify user is logged out after session timeout.
**Pre-conditions:** Session duration set to X (mocked or waited).
**Steps:**
1. Wait for session timeout.
2. Refresh page or perform action.
**Expected Result:**
- ✓ User redirected to login page.
- ✓ API calls return 401 Unauthorized.

### TC-AUTH-017: Concurrent Sessions
**Priority:** Low
**Feature:** Session Management
**Description:** Verify behavior with multiple active sessions (if allowed).
**Steps:**
1. Login on Browser A.
2. Login on Browser B.
**Expected Result:**
- ✓ Both sessions active (unless policy restricts to single session).

### TC-AUTH-018: Role-Based Access Control (RBAC)
**Priority:** High
**Feature:** Authorization
**Description:** Verify clients cannot access admin routes.
**Pre-conditions:** Logged in as `client`.
**Steps:**
1. Attempt to navigate to `/admin/users`.
**Expected Result:**
- ✓ Access Denied / 403 Forbidden / Redirect to 404.

## 4. Security & Edge Cases (4 test cases)

### TC-AUTH-019: SQL Injection on Email Field
**Priority:** High
**Feature:** Security
**Description:** Verify resistance to SQL injection.
**Steps:**
1. Enter `' OR '1'='1` in email field.
2. Click Send.
**Expected Result:**
- ✓ System treats it as invalid email string or sanitizes it.
- ✓ No database error exposed.
- ✓ No unauthorized access.

### TC-AUTH-020: Brute Force Token Guessing
**Priority:** High
**Feature:** Security
**Description:** Verify tokens are sufficiently random and long.
**Note:** This is more of a code review/static analysis test, but functional test can try guessing.
**Steps:**
1. Attempt to access `/auth/verify?token=123456`.
**Expected Result:**
- ✓ Invalid token error.

### TC-AUTH-021: Revoke Magic Link
**Priority:** Medium
**Feature:** Security
**Description:** Verify a new magic link request invalidates previous unused ones (optional security feature).
**Steps:**
1. Request Link A.
2. Request Link B immediately.
3. Try to use Link A.
**Expected Result:**
- ✓ Link A invalid (if policy is "invalidate old").
- ✓ Link B valid.

### TC-AUTH-022: Account Deactivation
**Priority:** High
**Feature:** Authorization
**Description:** Verify deactivated user cannot login even with valid email.
**Pre-conditions:** User account status = `inactive`.
**Steps:**
1. Request magic link for inactive user.
**Expected Result:**
- ✓ Error message "Account deactivated" OR generic success but no email sent.
- ✓ If email sent, clicking link results in "Account deactivated" error.

## Test Execution Guidelines

### Test Data
- **Valid Client:** `client.test@motionify.studio`
- **Valid Admin:** `admin.test@motionify.studio`
- **Inactive User:** `inactive.test@motionify.studio`

### Environment
- **Local:** Use Mailtrap or console logs to capture magic links.
- **Staging:** Use real email or team inbox aliases.

### Automation Strategy
- **E2E (Playwright):**
  - Use `mailslurp` or similar service to programmatically retrieve magic link emails.
  - Test full flow: Login Page -> Request -> Email -> Click Link -> Dashboard.
- **Integration:**
  - Test API endpoints `/api/auth/magic-link` and `/api/auth/verify` directly.
