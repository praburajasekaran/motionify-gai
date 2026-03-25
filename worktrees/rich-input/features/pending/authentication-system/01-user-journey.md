# User Journey: Authentication System

## Complete Customer Journey

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION SYSTEM WORKFLOW                            │
└──────────────────────────────────────────────────────────────────────────────┘

STEP 1: User Visits Login Page
    ↓
User enters email address: john.doe@example.com
Optionally checks "Remember Me" for extended session (30 days vs 24 hours)
    ↓

STEP 2: Request Magic Link
    ↓
User clicks "Send Magic Link" button
Frontend validates email format
API: POST /api/auth/request-magic-link
    ↓

STEP 3: System Generates Token & Sends Email
    ↓
Backend validates email exists in users table
Generates crypto-secure token (32 bytes, base64-url encoded)
Stores in magic_link_tokens table (expires in 15 minutes)
Constructs magic link URL with token
Sends email via Amazon SES (<30 seconds delivery)
    ↓

STEP 4: User Receives Email
    ↓
User sees success message: "Check your inbox for magic link"
Email arrives with subject: "Your Motionify Portal Login Link"
Email contains branded button: "Log In to Motionify Portal"
    ↓

STEP 5: User Clicks Magic Link
    ↓
Opens URL: portal.motionify.studio/auth/verify?token=abc123&rememberMe=true
Auth verification page shows loading state
API: GET /api/auth/verify-magic-link?token=abc123
    ↓

STEP 6: System Validates Token
    ↓
Checks token exists AND not expired AND not used
Marks token as used (used_at = NOW())
Generates JWT token with payload: {userId, email, role, exp}
Creates session record in sessions table
Sets HTTP-only cookie: authToken (Secure, SameSite=Strict)
    ↓

STEP 7: User Auto-Redirected to Dashboard
    ↓
URL: portal.motionify.studio/dashboard
Session active for 30 days (or 24 hours if remember_me=false)
User can access all portal features
Session auto-refreshes with each API request
    ↓

STEP 8: Session Persistence (Background)
    ↓
User closes browser/tabs → Session persists in cookie
User returns days later → Auto-logged in (no re-authentication)
Each API request → Updates last_active_at, extends expiry
After 30 days inactive → Session expires, user must re-login
    ↓

[User continues working in portal for weeks with seamless access]
```

## State Transition Diagrams

### Authentication Status Flow

```
┌─────────────────┐
│  Logged Out     │  ← Initial state (no valid session)
└────────┬────────┘
         │
         │ [User requests magic link]
         ↓
┌─────────────────────┐
│ Magic Link Sent     │  ← Waiting for email click (15-minute window)
└────────┬────────────┘
         │
         │ [User clicks valid link before expiry]
         ▼
┌─────────────────┐                           ┌─────────────────┐
│  Logged In      │───[User clicks logout]───▶│  Logged Out     │
└────────┬────────┘                           └─────────────────┘
         │
         │ [30 days pass with no activity]
         └────────────────────────────────────▶ Logged Out

Alternative paths:
┌──────────────────────┐
│  Token Expired       │  ← User clicked link after 15 minutes
└──────────────────────┘
         │
         └────────────────────────────────────▶ Logged Out (request new link)

┌──────────────────────┐
│  Token Already Used  │  ← User clicked same link twice
└──────────────────────┘
         │
         └────────────────────────────────────▶ Logged Out (request new link)

┌──────────────────────┐
│  Rate Limited        │  ← User requested >3 links in 1 hour
└──────────────────────┘
         │
         └─────────[Wait 1 hour]───────────────▶ Logged Out
```

### Magic Link Token Lifecycle

```
┌─────────────────┐
│  Generated      │  ← Token created (expires_at = NOW() + 15 min)
└────────┬────────┘     used_at = NULL
         │
         │ [User clicks link within 15 minutes]
         ↓
┌─────────────────┐
│  Used           │  ← Token consumed (used_at = NOW())
└────────┬────────┘     Cannot be reused
         │
         │ [Session created, user logged in]
         ↓
┌─────────────────┐
│  Invalidated    │  ← Token permanently invalid
└─────────────────┘

Alternative path:
┌─────────────────┐
│  Generated      │
└────────┬────────┘
         │
         │ [15 minutes pass without click]
         ↓
┌─────────────────┐
│  Expired        │  ← Token invalid (expires_at < NOW())
└─────────────────┘     Show error: "Link expired, request new one"
```

### Session Lifecycle

```
┌──────────────────┐
│  Created         │  ← JWT issued, cookie set
└────────┬─────────┘     expires_at = NOW() + 30 days
         │
         │ [User makes API requests]
         ↓
┌──────────────────────────┐
│  Active & Auto-Renewed   │  ← Each request extends expiry
└────────┬─────────────────┘     last_active_at updated
         │
         ├───[User clicks logout]──────────────▶ Session Destroyed
         │
         ├───[30 days no activity]─────────────▶ Session Expired
         │
         └───[Admin deactivates user]──────────▶ Session Invalidated

Post-Expiry:
┌──────────────────┐
│  Session Expired │  ← User must re-authenticate
└──────────────────┘     Redirect to login page
```

## Decision Points

### User: Remember Me Checkbox

```
Should user stay logged in for 30 days or 24 hours?

REMEMBER ME = TRUE             REMEMBER ME = FALSE
  │                               │
  ↓                               ↓
JWT expires in 30 days         JWT expires in 24 hours
Session persists long-term     Session short-lived
Good for: trusted devices      Good for: shared computers
```

### System: Email Found in Database?

```
Does user email exist in users table?

EMAIL EXISTS = YES            EMAIL EXISTS = NO
  │                             │
  ↓                             ↓
Generate token & send email    Show success (don't reveal)
User receives magic link       User never receives email
User can log in                Prevents email enumeration
```

### System: Token Valid?

```
Is magic link token valid?

ALL VALID CONDITIONS          ANY INVALID CONDITION
✓ Token exists                 │
✓ Not expired                  ├─ Token not found
✓ Not used                     ├─ Expired (>15 min old)
  │                            └─ Already used
  ↓                               ↓
Create session & log in        Show error message
Redirect to dashboard          Redirect to login
                               User must request new link
```

## Automation Triggers

### Email Notifications (Automatic)

| Trigger Event | Recipients | Email Type | Timing | Template |
|--------------|------------|------------|--------|----------|
| User requests magic link | User | Magic Link Email | <30 seconds | `magic-link.html` |
| New user first login | User | Welcome Email | On first successful login | `welcome.html` |
| Session expires in 24 hours | User (optional) | Session Expiry Warning | 24 hours before expiry | `session-expiry-warning.html` |

### Status Updates (Automatic)

| Trigger Event | Status Change |
|--------------|---------------|
| User clicks magic link | `users.last_login_at` → NOW() |
| User makes any API request | `sessions.last_active_at` → NOW() |
| User clicks logout | `sessions.expires_at` → NOW() (immediate expiry) |
| Token used | `magic_link_tokens.used_at` → NOW() |

### System Actions (Automatic)

| Trigger Event | System Action |
|--------------|---------------|
| Magic link generated | Schedule token cleanup job (delete after 24 hours) |
| Session created | Log activity: "User [email] logged in from [IP]" |
| Session expires | Cleanup expired sessions (batch job, runs daily) |
| Token clicked | Mark token as used (atomic update to prevent race condition) |
| Rate limit exceeded | Block login requests for 1 hour per email |

## Timeline Estimates

### Typical Flow: Magic Link Login

```
Minute 0:00   User enters email, clicks "Send Magic Link"
Minute 0:00   Backend generates token, sends email via SES
              ↓
Minute 0:00   User sees success message: "Check your inbox"
              ↓
Minute 0:01   Email delivered to user's inbox (<30 sec typical)
              ↓
Minute 0:02   User opens email, clicks "Log In" button
              ↓
Minute 0:02   Browser opens verification page, validates token
              ↓
Minute 0:02   User auto-redirected to dashboard
              ↓
Total: ~2 minutes from start to logged-in state
```

### Fastest Possible Flow

```
Minute 0:00   User requests link
Minute 0:00   Email sent (SES)
Minute 0:01   User clicks link (if email client open)
Minute 0:01   Logged in
              ↓
Total: ~1 minute (best case)
```

### Maximum Flow (Before Expiry)

```
Minute 0:00   User requests link
Minute 0:01   Email delivered
Minute 14:59  User clicks link (just before 15-min expiry)
Minute 15:00  Logged in
              ↓
Total: 15 minutes (maximum allowed)
```

### Session Duration

```
Day 0:    User logs in via magic link
Days 1-29: User continues accessing portal (no re-login needed)
Day 30:   Session expires if no activity
          User must log in again via new magic link
          ↓
Maximum session: 30 days (with rememberMe=true)
Minimum session: 24 hours (with rememberMe=false)
```

## Edge Cases & Error Handling

### Edge Case 1: User Email Not in System
- **Description:** User enters email that doesn't exist in `users` table
- **Expected Behavior:** System shows success message (doesn't reveal email is invalid)
- **Resolution:** No email sent, user waits indefinitely (security by design)
- **User Action:** Contact admin if email expected to work
- **Priority:** Low (by design for security)

### Edge Case 2: Magic Link Expired
- **Description:** User clicks link after 15-minute expiry window
- **Expected Behavior:** Verification page shows: "This magic link has expired. Please request a new one."
- **Resolution:** User clicks "Request New Link" button, redirected to login page
- **Recovery Process:** Standard magic link flow from beginning
- **Priority:** High (common scenario)

### Edge Case 3: Magic Link Already Used
- **Description:** User clicks same magic link multiple times
- **Expected Behavior:** Second click shows: "This link has already been used. Request a new one if you need to log in again."
- **Resolution:** User requests new magic link
- **Recovery Process:** Cannot reuse tokens (security feature)
- **Priority:** High (common scenario)

### Edge Case 4: Rate Limit Exceeded (Email)
- **Description:** User requests >3 magic links within 1 hour for same email
- **Expected Behavior:** Button disabled, message: "Too many login attempts. Try again in [X] minutes."
- **Resolution:** Display countdown timer, re-enable button after 1 hour
- **Recovery Process:** Wait 1 hour OR contact support for manual reset
- **Priority:** Medium (abuse prevention)

### Edge Case 5: Rate Limit Exceeded (IP Address)
- **Description:** >10 login requests from same IP in 1 hour (across all emails)
- **Expected Behavior:** 429 error: "Too many requests from this location. Try again later."
- **Resolution:** Block all requests from IP for 1 hour
- **Recovery Process:** Wait 1 hour OR use different network
- **Priority:** Medium (DDoS prevention)

### Edge Case 6: Session Expired While User Active
- **Description:** JWT expires while user is actively using portal
- **Expected Behavior:** API returns 401 Unauthorized
- **Frontend Behavior:** Modal appears: "Your session has expired. Please log in again."
- **Resolution:** User clicks "Log In", redirected to login page
- **Recovery Process:** After re-login, redirect back to previous page
- **Priority:** High (impacts user experience)

### Edge Case 7: Email Delivery Failure (SES Error)
- **Description:** Amazon SES fails (quota exceeded, invalid email, mailbox full)
- **Expected Behavior:** Backend logs error, user still sees success message
- **Admin Alert:** System sends Slack/email alert to dev team
- **Resolution:** Admin investigates SES logs, contacts user if needed
- **User Action:** Contact support after 5 minutes if email not received
- **Priority:** Critical (blocks login)

### Edge Case 8: Email Delivery Delay (>2 minutes)
- **Description:** Email takes longer than usual to arrive (network issues)
- **Expected Behavior:** User sees: "Email taking longer than expected? Check spam folder or request a new link."
- **Resolution:** User checks spam, waits, or requests new link
- **Recovery Process:** Standard flow
- **Priority:** Low (SES typically delivers <30 seconds)

### Edge Case 9: User Has Multiple Browser Tabs Open
- **Description:** User logged in across multiple tabs
- **Expected Behavior:** Session shared via cookie (all tabs authenticated)
- **Logout Behavior:** Logout in one tab invalidates session for all tabs
- **Resolution:** All tabs redirect to login when session invalidated
- **Priority:** Medium (multi-tab support)

### Edge Case 10: User Updates Profile While Session About to Expire
- **Description:** User saves profile changes 1 second before session expiry
- **Expected Behavior:** Request extends session automatically before processing update
- **Resolution:** Session refreshed, profile saved successfully
- **Recovery Process:** N/A (automatic)
- **Priority:** Low (auto-refresh prevents this)

### Error Case 1: Invalid JWT Token (Tampered)
- **Description:** Attacker modifies JWT payload or signature
- **Expected Behavior:** Token validation fails, 401 Unauthorized
- **Resolution:** User redirected to login, activity logged as security event
- **Recovery Process:** User must log in with valid magic link
- **Admin Alert:** Log suspicious activity for review
- **Priority:** Critical (security incident)

### Error Case 2: Database Connection Failure
- **Description:** PostgreSQL database unavailable during login attempt
- **Expected Behavior:** Error page: "Service temporarily unavailable. Please try again."
- **Resolution:** Backend retries connection (3 attempts), shows 503 error if all fail
- **Recovery Process:** Wait for database to recover, retry login
- **Admin Alert:** Immediate alert to DevOps team
- **Priority:** Critical (blocks all authentication)

### Error Case 3: SES Quota Exceeded
- **Description:** Daily SES email quota reached (e.g., 10,000 emails/day limit)
- **Expected Behavior:** User sees success but email never arrives
- **Admin Alert:** Immediate Slack alert: "SES quota exceeded - login emails blocked"
- **Resolution:** Admin requests quota increase with AWS or waits for daily reset
- **Recovery Process:** Users must wait or admin creates manual login link
- **Priority:** Critical (blocks all new logins)

### Error Case 4: Avatar Upload Failure (Cloudflare R2)
- **Description:** R2 upload fails (network error, quota exceeded)
- **Expected Behavior:** Error message: "Failed to upload photo. Please try again."
- **Resolution:** User retries upload, system shows specific error if file too large
- **Recovery Process:** Check file size (<5MB), check format (jpg/png), retry
- **Priority:** Low (doesn't block core functionality)

### Error Case 5: Cookie Not Set (Browser Privacy Mode)
- **Description:** User's browser blocks cookies (Incognito, strict privacy settings)
- **Expected Behavior:** Login succeeds but session doesn't persist across tabs
- **Resolution:** Show warning: "Cookies disabled. Portal may not work properly. Please enable cookies."
- **Fallback:** Use localStorage for JWT token (less secure but functional)
- **Priority:** Medium (affects privacy-conscious users)

## Permission Guards

### Magic Link Request
- **Allowed:** Anyone (public endpoint)
- **Validation:** Email must exist in `users` table to send email
- **Rate Limit:** 3 requests/hour per email, 10 requests/hour per IP

### Magic Link Verification
- **Allowed:** Anyone with valid token (public endpoint)
- **Validation:** Token must exist, not expired (<15 min), not used
- **Rate Limit:** None (tokens are cryptographically secure)

### Dashboard Access
- **Allowed:** All authenticated users (all roles)
- **Validation:** Valid JWT token in Authorization header or authToken cookie
- **Role Check:** None (access granted to all users)

### View Own Profile
- **Allowed:** All authenticated users
- **Validation:** JWT user ID matches profile being viewed
- **Role Check:** None (users can always view own profile)

### Update Own Profile
- **Allowed:** All authenticated users
- **Validation:** JWT user ID matches profile being updated
- **Editable Fields:** full_name, avatar_url, notification preferences
- **Read-Only Fields:** email, role (require admin to change)

### Update Other User's Profile
- **Allowed:** `super_admin` only
- **Validation:** JWT role = 'super_admin'
- **Restriction:** Cannot change own role (prevents accidental lockout)

### Deactivate User
- **Allowed:** `super_admin` only
- **Validation:** JWT role = 'super_admin'
- **Restriction:** Cannot deactivate self (prevents lockout)

### View Activity Logs
- **Allowed:** Project team members (for project logs), `super_admin` (for all logs)
- **Validation:** User assigned to project OR super_admin
- **Scope:** Logs filtered by user's project access

## Success Criteria

✅ **Magic Link Login:**
- User can log in without password
- Magic link delivered within 30 seconds
- Link expires after 15 minutes
- Link can only be used once
- Rate limiting prevents abuse (3/hour per email)

✅ **Session Management:**
- Session persists for 30 days (rememberMe=true) or 24 hours (false)
- Session auto-refreshes with each API request
- Session shared across browser tabs via cookie
- Logout invalidates session immediately
- Expired sessions redirect to login

✅ **User Profile:**
- Users can view own profile
- Users can update name and preferences
- Users can upload avatar (<5MB, jpg/png)
- Email and role are read-only (admin-only changes)
- Profile changes saved immediately

✅ **Security:**
- All tokens cryptographically secure (32 bytes)
- JWTs signed with secret key, validated on every request
- HTTP-only cookies prevent XSS attacks
- Rate limiting prevents brute force attacks
- All auth events logged for audit trail

✅ **Error Handling:**
- Invalid tokens show clear error messages
- Expired sessions handled gracefully
- Email delivery failures logged for admin
- Database errors show user-friendly messages
- All errors logged for debugging
