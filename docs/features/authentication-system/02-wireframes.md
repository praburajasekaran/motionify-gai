# ASCII Wireframes: Authentication System

This document contains all user interface wireframes for the Authentication System.

## 📋 UI Standards & Conventions

**Routing:** All routes use `portal.motionify.studio` subdomain pattern  
**Modal Close:** `[×]` for all modals  
**Buttons:** Right-aligned with `[Cancel] [Primary]` order  
**Required Fields:** `(required)` text format  
**Loading States:** `[Spinner]` notation  
**Note:** Magic link login is passwordless authentication

_Note: See WIREFRAME_CONFLICT_ANALYSIS.md for complete standardization details_

---

## Table of Contents

### Public Screens
1. [Login Screen](#screen-1-login-screen)
2. [Magic Link Sent Confirmation](#screen-2-magic-link-sent-confirmation)
3. [Auth Verification Loading](#screen-3-auth-verification-loading)
4. [Auth Verification Error](#screen-4-auth-verification-error)

### Authenticated User Screens
5. [User Profile View](#screen-5-user-profile-view)
6. [Edit Profile Modal](#screen-6-edit-profile-modal)
7. [Session Expired Modal](#screen-7-session-expired-modal)

---

## Public Screens

### SCREEN 1: Login Screen

**Purpose:** Entry point for all users to request magic link authentication
**Route:** `portal.motionify.studio/login`
**Authentication:** None (public)
**User Story:** US-001

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                                                                             │
│                        ┌─────────────────────────┐                         │
│                        │    MOTIONIFY LOGO       │                         │
│                        └─────────────────────────┘                         │
│                                                                             │
│                   Welcome to Motionify PM Portal                            │
│                                                                             │
│              Log in with your email - no password needed                    │
│                                                                             │
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────┐    │
│   │ Email Address                                                      │    │
│   │ ┌────────────────────────────────────────────────────────────┐   │    │
│   │ │ your.email@example.com                                      │   │    │
│   │ └────────────────────────────────────────────────────────────┘   │    │
│   │                                                                    │    │
│   │ ┌───┐                                                             │    │
│   │ │   │ Remember me for 30 days                                     │    │
│   │ └───┘                                                             │    │
│   └──────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│                   ┌────────────────────────────────┐                       │
│                   │    Send Magic Link to Email    │                       │
│                   └────────────────────────────────┘                       │
│                                                                             │
│                                                                             │
│         We'll send a secure login link to your email address.              │
│               The link expires in 15 minutes.                               │
│                                                                             │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

**Validation Rules:**
- Email: Required, must be valid email format (regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- Email: Auto-trim whitespace
- Remember Me: Optional, defaults to unchecked (false)

**User Actions:**
- User types email → Frontend validates format in real-time
- User checks "Remember Me" → Session will last 30 days (vs 24 hours)
- User clicks "Send Magic Link" → API call: `POST /api/auth/request-magic-link`
- Button shows loading state: "Sending..." (disabled during API call)
- Success → Navigate to Screen 2 (confirmation)
- Error (rate limit) → Show inline error below button: "Too many attempts. Try again in [X] minutes."

**Error States:**
- Invalid email format: "Please enter a valid email address"
- Rate limit exceeded: "Too many login attempts. Please try again in 45 minutes."
- API error: "Something went wrong. Please try again."

**Responsive Behavior:**
- Mobile: Full-width input fields, larger touch targets (48px min height)
- Desktop: Centered layout, max-width 450px

---

### SCREEN 2: Magic Link Sent Confirmation

**Purpose:** Confirm email has been sent (appears after successful link request)
**Route:** `portal.motionify.studio/login` (same page, success state)
**Authentication:** None
**User Story:** US-001

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                        ┌─────────────────────────┐                         │
│                        │    MOTIONIFY LOGO       │                         │
│                        └─────────────────────────┘                         │
│                                                                             │
│                                                                             │
│                        ┌───────────────────────┐                           │
│                        │     ✉️  Check Your    │                           │
│                        │        Inbox!         │                           │
│                        └───────────────────────┘                           │
│                                                                             │
│                                                                             │
│     If an account exists with this email, a magic link has been sent       │
│                        to your inbox.                                       │
│                                                                             │
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────┐    │
│   │ ℹ️  What to do next:                                              │    │
│   │                                                                    │    │
│   │ 1. Check your email inbox (and spam folder)                       │    │
│   │ 2. Click the "Log In to Motionify Portal" button                  │    │
│   │ 3. You'll be automatically logged in                              │    │
│   │                                                                    │    │
│   │ ⏱️  The magic link expires in 15 minutes.                         │    │
│   └──────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│                                                                             │
│                    Email taking too long? Check spam or                     │
│                   ┌─────────────────────────────┐                          │
│                   │   Request a New Link        │                          │
│                   └─────────────────────────────┘                          │
│                       (Available in 5:00 minutes)                           │
│                                                                             │
│                                                                             │
│                  Didn't receive an email? Contact support:                  │
│                         hello@motionify.studio                              │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

**User Actions:**
- User checks email inbox for magic link email
- User clicks "Request a New Link" (disabled for 5 minutes) → Returns to Screen 1
- Countdown timer decrements every second: "Available in 4:59 minutes"

**Security Note:**
- Same success message shown whether email exists or not (prevents email enumeration)

---

### SCREEN 3: Auth Verification Loading

**Purpose:** Loading state while verifying magic link token
**Route:** `portal.motionify.studio/auth/verify?token=abc123&rememberMe=true`
**Authentication:** None (token in URL)
**User Story:** US-001

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                        ┌─────────────────────────┐                         │
│                        │    MOTIONIFY LOGO       │                         │
│                        └─────────────────────────┘                         │
│                                                                             │
│                                                                             │
│                                                                             │
│                                                                             │
│                                ⏳                                           │
│                        Verifying your magic link...                         │
│                                                                             │
│                                                                             │
│                         [Animated spinner]                                  │
│                                                                             │
│                                                                             │
│                      Please wait, this will only take                       │
│                              a moment.                                      │
│                                                                             │
│                                                                             │
│                                                                             │
│                                                                             │
│                                                                             │
│                                                                             │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

**Backend Process (Automatic):**
1. Extract `token` from URL query parameter
2. API call: `GET /api/auth/verify-magic-link?token=abc123&rememberMe=true`
3. If valid → Set HTTP-only cookie, redirect to `/dashboard`
4. If invalid → Show Screen 4 (error state)

**User Actions:**
- None (automatic process)
- Typical duration: 1-2 seconds

---

### SCREEN 4: Auth Verification Error

**Purpose:** Show errors when magic link verification fails
**Route:** `portal.motionify.studio/auth/verify?token=invalid123`
**Authentication:** None
**User Story:** US-001

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                        ┌─────────────────────────┐                         │
│                        │    MOTIONIFY LOGO       │                         │
│                        └─────────────────────────┘                         │
│                                                                             │
│                                                                             │
│                         ❌ Link Invalid or Expired                          │
│                                                                             │
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────┐    │
│   │ This magic link is no longer valid. This could be because:        │    │
│   │                                                                    │    │
│   │ • The link has already been used                                  │    │
│   │ • The link expired (magic links expire after 15 minutes)          │    │
│   │ • The link was invalid or incomplete                              │    │
│   └──────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│                                                                             │
│                   ┌────────────────────────────────┐                       │
│                   │    Request a New Magic Link    │                       │
│                   └────────────────────────────────┘                       │
│                                                                             │
│                                                                             │
│                   Need help? Contact our support team:                      │
│                         hello@motionify.studio                              │
│                                                                             │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

**Error Variants:**

**Token Expired:**
- Message: "This magic link has expired. Magic links are only valid for 15 minutes."

**Token Already Used:**
- Message: "This magic link has already been used. For security, each link can only be used once."

**Token Not Found:**
- Message: "This magic link is invalid or has been revoked. Please request a new one."

**User Actions:**
- Click "Request a New Magic Link" → Redirect to Screen 1 (login page)
- Click email link → Send email to support

---

## Authenticated User Screens

### SCREEN 5: User Profile View

**Purpose:** Display user's profile information and activity
**Route:** `portal.motionify.studio/profile`
**Authentication:** Required (all roles)
**User Story:** US-003

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ←  Back to Dashboard                              [Logout] [Edit Profile]  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌────────────┐                                                           │
│   │            │                                                           │
│   │  [AVATAR]  │   John Doe                                                │
│   │   IMAGE    │   john.doe@acmecorp.com                                   │
│   │            │   🔵 Client - Primary Contact                             │
│   └────────────┘   Member since: January 15, 2025                          │
│                    Last login: 2 hours ago                                  │
│                                                                             │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ 📧 Email                                                              │  │
│ │ john.doe@acmecorp.com                                       (Read-only) │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ 👤 Role                                                               │  │
│ │ Client - Primary Contact                                   (Read-only) │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ 📁 Assigned Projects (3)                                              │  │
│ │ ┌──────────────────────────────────────────────────────────────────┐ │  │
│ │ │ Brand Video Campaign           Status: In Progress   ✅ Terms OK  │ │  │
│ │ └──────────────────────────────────────────────────────────────────┘ │  │
│ │ ┌──────────────────────────────────────────────────────────────────┐ │  │
│ │ │ Social Media Package           Status: In Progress   ⏳ Pending   │ │  │
│ │ └──────────────────────────────────────────────────────────────────┘ │  │
│ │ ┌──────────────────────────────────────────────────────────────────┐ │  │
│ │ │ Website Explainer Video        Status: Completed     ✅ Approved  │ │  │
│ │ └──────────────────────────────────────────────────────────────────┘ │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ 📊 Recent Activity (Last 10 actions)                                  │  │
│ │ ┌──────────────────────────────────────────────────────────────────┐ │  │
│ │ │ ✅ Approved deliverable "Concept Development" • 2 hours ago       │ │  │
│ │ │ 💬 Commented on task "Create storyboards" • 1 day ago             │ │  │
│ │ │ 📧 Accepted project terms for "Brand Video Campaign" • 3 days ago │ │  │
│ │ │ 🔄 Requested revision on "Script Draft" • 5 days ago             │ │  │
│ │ │ 📥 Downloaded file "final-video.mp4" • 1 week ago                │ │  │
│ │ └──────────────────────────────────────────────────────────────────┘ │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

**User Actions:**
- Click "Edit Profile" → Open Screen 6 (edit modal)
- Click "Logout" → Confirmation modal: "Are you sure?" → Logout and redirect to Screen 1
- Click project name → Navigate to project dashboard
- Click "View All Activity" → Full activity history page

**Read-Only Fields:**
- Email (can only be changed by admin)
- Role (can only be changed by admin)

---

### SCREEN 6: Edit Profile Modal

**Purpose:** Allow users to update their profile information
**Route:** `portal.motionify.studio/profile` (modal overlay)
**Authentication:** Required
**User Story:** US-003

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ╔════════════════════════════════════════════════════════════════════╗    │
│ ║                         Edit Profile                           [X] ║    │
│ ╠════════════════════════════════════════════════════════════════════╣    │
│ ║                                                                     ║    │
│ ║   ┌────────────┐                                                   ║    │
│ ║   │            │                                                   ║    │
│ ║   │  [AVATAR]  │    ┌──────────────────────┐                      ║    │
│ ║   │   IMAGE    │    │  Change Photo        │                      ║    │
│ ║   │            │    └──────────────────────┘                      ║    │
│ ║   └────────────┘    JPG or PNG • Max 5MB                          ║    │
│ ║                                                                     ║    │
│ ║   ┌──────────────────────────────────────────────────────────┐    ║    │
│ ║   │ Full Name *                                               │    ║    │
│ ║   │ ┌──────────────────────────────────────────────────────┐ │    ║    │
│ ║   │ │ John Doe                                              │ │    ║    │
│ ║   │ └──────────────────────────────────────────────────────┘ │    ║    │
│ ║   └──────────────────────────────────────────────────────────┘    ║    │
│ ║                                                                     ║    │
│ ║   ┌──────────────────────────────────────────────────────────┐    ║    │
│ ║   │ Notification Preferences                                  │    ║    │
│ ║   │ ┌───┐ Email me when tasks are assigned to me             │    ║    │
│ ║   │ │ ✓ │                                                     │    ║    │
│ ║   │ └───┘                                                     │    ║    │
│ ║   │ ┌───┐ Email me when someone @mentions me                 │    ║    │
│ ║   │ │ ✓ │                                                     │    ║    │
│ ║   │ └───┘                                                     │    ║    │
│ ║   │ ┌───┐ Email me when deliverables need approval           │    ║    │
│ ║   │ │ ✓ │                                                     │    ║    │
│ ║   │ └───┘                                                     │    ║    │
│ ║   │ ┌───┐ Email me daily activity summary                    │    ║    │
│ ║   │ │   │                                                     │    ║    │
│ ║   │ └───┘                                                     │    ║    │
│ ║   └──────────────────────────────────────────────────────────┘    ║    │
│ ║                                                                     ║    │
│ ║                                                                     ║    │
│ ║   ┌──────────────────┐              ┌──────────────────┐          ║    │
│ ║   │     Cancel       │              │  Save Changes    │          ║    │
│ ║   └──────────────────┘              └──────────────────┘          ║    │
│ ║                                                                     ║    │
│ ╚════════════════════════════════════════════════════════════════════╝    │
└────────────────────────────────────────────────────────────────────────────┘
```

**Validation Rules:**
- Full Name: Required, 2-100 characters, letters/spaces/hyphens only
- Avatar: Optional, jpg/png only, max 5MB, min 100x100px
- Notification Preferences: All optional (checkboxes)

**User Actions:**
- Click "Change Photo" → File picker opens → User selects image
- Image validation (client-side): file type, size, dimensions
- If valid → Preview shown → Upload on "Save Changes"
- User edits name → Real-time validation
- User toggles notification checkboxes → State saved on submit
- Click "Save Changes" → API: `PATCH /api/users/me` → Success message → Close modal
- Click "Cancel" or [X] → Close modal without saving

**Error States:**
- Name too short: "Name must be at least 2 characters"
- Name invalid chars: "Name can only contain letters, spaces, and hyphens"
- Avatar too large: "Image must be smaller than 5MB"
- Avatar wrong format: "Only JPG and PNG images are supported"
- Avatar too small: "Image must be at least 100x100 pixels"

**Success State:**
- Green toast message: "✅ Profile updated successfully"
- Modal closes
- Profile view refreshes with new data

---

### SCREEN 7: Session Expired Modal

**Purpose:** Notify user that session has expired and require re-login
**Route:** Any authenticated page (modal overlay)
**Authentication:** Expired
**User Story:** US-002

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                                                                             │
│                                                                             │
│ ╔════════════════════════════════════════════════════════════════════╗    │
│ ║                                                                     ║    │
│ ║                          ⏱️ Session Expired                         ║    │
│ ║                                                                     ║    │
│ ║                                                                     ║    │
│ ║   Your session has expired for security reasons. Please log in     ║    │
│ ║   again to continue.                                                ║    │
│ ║                                                                     ║    │
│ ║   You'll be redirected back to this page after logging in.         ║    │
│ ║                                                                     ║    │
│ ║                                                                     ║    │
│ ║                     ┌────────────────────────┐                     ║    │
│ ║                     │     Log In Again       │                     ║    │
│ ║                     └────────────────────────┘                     ║    │
│ ║                                                                     ║    │
│ ║                                                                     ║    │
│ ║   💡 Tip: Check "Remember me" to stay logged in for 30 days       ║    │
│ ║                                                                     ║    │
│ ╚════════════════════════════════════════════════════════════════════╝    │
│                                                                             │
│                                                                             │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

**Trigger Conditions:**
- JWT token expiry detected (401 response from API)
- Session expires after 30 days (or 24 hours if rememberMe=false)
- Admin deactivates user account

**User Actions:**
- Click "Log In Again" → Save current URL → Redirect to `/login`
- After successful login → Redirect back to saved URL
- Modal cannot be dismissed (blocking)

**Backend Behavior:**
- All API requests return 401 Unauthorized
- Frontend intercepts 401 globally → Shows this modal

---

## Accessibility Guidelines

**Keyboard Navigation:**
- All interactive elements accessible via Tab key
- Enter key activates buttons
- Escape key closes modals
- Focus indicators visible on all elements

**Screen Reader Support:**
- Proper ARIA labels on all inputs
- Form validation errors announced
- Loading states announced: "Verifying magic link, please wait"
- Success messages announced: "Profile updated successfully"

**Color Contrast:**
- All text meets WCAG AA standards (4.5:1 minimum)
- Error states use both color AND icons
- Focus indicators clearly visible

**Responsive Design:**
- All layouts work 320px to 2560px width
- Touch targets minimum 44x44px (mobile)
- Font sizes scale appropriately (min 16px for body text)

---

## API Calls Summary

| Screen | API Endpoint | Method | Trigger |
|--------|-------------|--------|---------|
| Login Screen | `/api/auth/request-magic-link` | POST | User clicks "Send Magic Link" |
| Auth Verification | `/api/auth/verify-magic-link` | GET | Page loads with token in URL |
| Profile View | `/api/users/me` | GET | Page loads |
| Edit Profile | `/api/users/me` | PATCH | User clicks "Save Changes" |
| Edit Profile (Avatar) | `/api/users/me/avatar` | POST | User uploads avatar |
| Logout | `/api/auth/logout` | POST | User clicks "Logout" |

---

## Component Reusability

**Shared Components:**
- `<Button>` - Primary, secondary, danger variants
- `<Input>` - Text, email, with validation states
- `<Checkbox>` - For "Remember me" and preferences
- `<Modal>` - For edit profile, session expired
- `<Avatar>` - User profile images with fallback initials
- `<Toast>` - Success/error notification messages
- `<Spinner>` - Loading states

**Design Tokens:**
- Primary color: Motionify brand blue (#0066FF)
- Success: Green (#00C853)
- Error: Red (#D32F2F)
- Warning: Orange (#FF9800)
- Gray scale: 50-900 (neutral colors)
- Border radius: 4px (inputs), 8px (cards), 24px (buttons)
- Spacing: 4px base (4, 8, 16, 24, 32, 48, 64)
- Font: Inter (sans-serif)
