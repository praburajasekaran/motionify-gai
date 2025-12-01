# ASCII Wireframes: Team Management

This document contains all user interface wireframes for Team Management (US-021, US-022).

## 📋 UI Standards & Conventions

**Routing:** All routes use `portal.motionify.studio` subdomain pattern  
**Parameters:** `:projectId`, `:userId` (consistent naming)  
**Status Badges:** Colors only, hover for full label tooltips  
**Modal Close:** `[×]` for all modals  
**Buttons:** Right-aligned with `[Cancel] [Primary]` order  
**Required Fields:** `(required)` text format  
**Loading States:** `[Spinner]` notation  
**Notification Bell:** 🔔 in all authenticated headers

_Note: See WIREFRAME_CONFLICT_ANALYSIS.md for complete standardization details_

---

## Table of Contents

### Customer-Facing Screens
1. [Team Management Page](#screen-1-team-management-page)
2. [Invite Team Member Modal](#screen-2-invite-team-member-modal)
3. [Invitation Acceptance Page (Public)](#screen-3-invitation-acceptance-page-public)
4. [Remove Team Member Confirmation](#screen-4-remove-team-member-confirmation)

### Project Views
5. [Pending Invitations Section](#screen-5-pending-invitations-section)
6. [Empty State (No Team Members)](#screen-6-empty-state-no-team-members)

### Mobile Responsive
7. [Team Management (Mobile)](#screen-7-team-management-mobile)

---

## Customer-Facing Screens

### SCREEN 1: Team Management Page

**Purpose:** View all team members and manage invitations
**Route:** `portal.motionify.studio/projects/:projectId/team`
**Authentication:** Required (project access)
**Permissions:** View (all team), Invite/Remove (primary contact or PM only)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back to Project          Brand Video Campaign            [Project ▾] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Overview   Deliverables   Tasks   Files   Team   Activity               │
│  ─────────  ────────────   ─────   ─────  ════   ────────               │
│                                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Team Members (5)                       [✉ Invite Team Member]           │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  👤  Sarah Johnson                                    PRIMARY    │   │
│  │      sarah@acmecorp.com                              CONTACT     │   │
│  │      Client Team • Joined Nov 1, 2025                            │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  👤  Michael Chen                                      [Remove]  │   │
│  │      michael@acmecorp.com                                        │   │
│  │      Client Team • Joined Nov 3, 2025                            │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  👤  Emma Rodriguez                                    [Remove]  │   │
│  │      emma@consultant.com                                         │   │
│  │      Client Team • Joined Nov 5, 2025                            │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  👤  Alex Kim                                      PROJECT       │   │
│  │      alex@motionify.studio                         MANAGER       │   │
│  │      Motionify Team • Joined Oct 28, 2025                        │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  👤  Jordan Martinez                              CREATIVE       │   │
│  │      jordan@motionify.studio                      LEAD           │   │
│  │      Motionify Team • Joined Oct 28, 2025                        │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                           │
│  Pending Invitations (2)                                                  │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  ✉  david@acmecorp.com                    [Resend] [Revoke]     │   │
│  │      Invited by Sarah Johnson                                    │   │
│  │      Sent Nov 10, 2025 • Expires in 4 days                       │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  ✉  lisa@contractor.io                    [Resend] [Revoke]     │   │
│  │      Invited by Sarah Johnson                                    │   │
│  │      Sent Nov 12, 2025 • Expires in 6 days                       │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

**Validation Rules:**
- Only primary contact or Motionify PM can see [Invite] button
- Only primary contact or Motionify PM can see [Remove] button
- Cannot remove self, primary contact, or last PM
- Motionify team members show role badge (PROJECT MANAGER, CREATIVE LEAD)

**User Actions:**
- Click "Invite Team Member" → Opens invite modal
- Click "Remove" → Opens removal confirmation dialog
- Click "Resend" → Regenerates invitation token, sends new email
- Click "Revoke" → Cancels pending invitation, marks as revoked
- Hover over team member → Shows tooltip with additional info

**API Call:**
```
GET /api/projects/:projectId/team
Response: {
  members: [...],
  pendingInvitations: [...]
}
```

---

### SCREEN 2: Invite Team Member Modal

**Purpose:** Send email invitation to add new team member
**Route:** Modal overlay on `portal.motionify.studio/projects/:projectId/team`
**Authentication:** Required (primary contact or PM)
**Trigger:** Click "Invite Team Member" button

```
┌─────────────────────────────────────────────────────────────┐
│ Invite Team Member                                      [✕] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Add a team member to this project by sending them an        │
│  email invitation. They'll have 7 days to accept.            │
│                                                               │
│  Email Address *                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ colleague@example.com                                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  Personal Message (Optional)                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Hi! I'd like to invite you to collaborate on this     │  │
│  │ video project. Looking forward to working together!   │  │
│  │                                                        │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│  This message will be included in the invitation email.       │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  Access Level                                                 │
│                                                               │
│  ◉ Client Team Member                                        │
│    Can view project, upload files, and comment               │
│                                                               │
│  ○ View Only (Future)                                        │
│    Can view project but cannot upload or comment             │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  📋 Invitation Preview                                        │
│                                                               │
│  colleague@example.com will receive:                          │
│  • Secure invitation link (expires in 7 days)                │
│  • Project name and description                              │
│  • Your personal message                                     │
│  • Instructions to create account or sign in                 │
│                                                               │
│                                                               │
│               [Cancel]        [Send Invitation]               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Validation Rules:**
- Email: Required, valid email format
- Email: Cannot invite existing team member (show error)
- Email: Cannot have duplicate pending invitation (show error)
- Personal Message: Optional, max 500 characters
- Access Level: "Client Team Member" is default and only option in MVP

**User Actions:**
- Enter email → Real-time validation
- Type message → Character count shown
- Click "Send Invitation" → POST to API, close modal, show success toast
- Click "Cancel" or [✕] → Close modal without changes

**API Call:**
```
POST /api/projects/:projectId/invitations
{
  "email": "colleague@example.com",
  "personalMessage": "Hi! I'd like to invite you...",
  "role": "client"
}

Response: {
  "id": "inv_abc123",
  "email": "colleague@example.com",
  "status": "pending",
  "expiresAt": "2025-11-23T10:00:00Z"
}
```

**Success Toast:**
```
✓ Invitation sent to colleague@example.com
  They have 7 days to accept the invitation.
```

**Error States:**
```
Email already invited:
⚠ colleague@example.com already has a pending invitation.
  You can resend it from the Team page.

User already on team:
⚠ colleague@example.com is already a member of this project.
```

---

### SCREEN 3: Invitation Acceptance Page (Public)

**Purpose:** Public page where invited users accept and join project
**Route:** `/invitations/accept?token=a7f3c9d2...`
**Authentication:** None (public link)
**Variants:** New user (create account) vs. Existing user (sign in)

#### VARIANT A: New User (No Account)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                              MOTIONIFY                                    │
│                                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                           │
│                    You've been invited to collaborate!                    │
│                                                                           │
│  Sarah Johnson invited you to join:                                       │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  📹  Brand Video Campaign                                        │   │
│  │      Acme Corporation                                            │   │
│  │                                                                   │   │
│  │      "Hi! I'd like to invite you to collaborate on this video   │   │
│  │      project. Looking forward to working together!"              │   │
│  │                                                                   │   │
│  │      — Sarah Johnson                                             │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                           │
│  Create your account to get started                                       │
│                                                                           │
│  Email Address                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ colleague@example.com                               [Locked 🔒] │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  This invitation was sent to this email address.                         │
│                                                                           │
│  Full Name *                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  Password *                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                         [Show]    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  At least 8 characters                                                    │
│                                                                           │
│                                                                           │
│                  [Accept Invitation & Create Account]                     │
│                                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                           │
│  Already have an account? [Sign In]                                       │
│                                                                           │
│  This invitation expires in 4 days                                        │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

#### VARIANT B: Existing User (Has Account)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                              MOTIONIFY                                    │
│                                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                           │
│                    You've been invited to collaborate!                    │
│                                                                           │
│  Sarah Johnson invited you to join:                                       │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  📹  Brand Video Campaign                                        │   │
│  │      Acme Corporation                                            │   │
│  │                                                                   │   │
│  │      "Hi! I'd like to invite you to collaborate on this video   │   │
│  │      project. Looking forward to working together!"              │   │
│  │                                                                   │   │
│  │      — Sarah Johnson                                             │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                           │
│  Sign in to accept this invitation                                        │
│                                                                           │
│  Email Address                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ colleague@example.com                               [Locked 🔒] │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  Password *                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                         [Show]    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  [Forgot password?]                                                       │
│                                                                           │
│                                                                           │
│                     [Sign In & Accept Invitation]                         │
│                                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                           │
│  Or sign in with magic link (no password required):                       │
│                                                                           │
│                     [Send Magic Link to Email]                            │
│                                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                           │
│  Don't have an account? [Create Account]                                  │
│                                                                           │
│  This invitation expires in 4 days                                        │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

**Validation Rules:**
- Token: Must be valid, not expired, not already accepted
- Email: Pre-filled, locked (cannot change)
- Name: Required, 2-100 characters (new users only)
- Password: Required, min 8 characters (new users only)
- Password: Required for existing users unless using magic link

**User Actions:**
- **New User Flow:**
  1. Enter name and password
  2. Click "Accept Invitation & Create Account"
  3. POST /api/auth/register → Account created
  4. POST /api/invitations/:token/accept → Auto-added to project
  5. Redirect to project dashboard

- **Existing User Flow:**
  1. Enter password (or click "Send Magic Link")
  2. Click "Sign In & Accept Invitation"
  3. POST /api/auth/login → User authenticated
  4. POST /api/invitations/:token/accept → Auto-added to project
  5. Redirect to project dashboard

**API Calls:**
```
# 1. Load invitation details (on page load)
GET /api/invitations/verify?token=a7f3c9d2...
Response: {
  "valid": true,
  "email": "colleague@example.com",
  "projectName": "Brand Video Campaign",
  "inviterName": "Sarah Johnson",
  "personalMessage": "Hi! I'd like to invite you...",
  "expiresAt": "2025-11-23T10:00:00Z"
}

# 2. Register new user (if no account)
POST /api/auth/register
{
  "email": "colleague@example.com",
  "name": "David Smith",
  "password": "securepass123",
  "invitationToken": "a7f3c9d2..."
}

# 3. Accept invitation (authenticated)
POST /api/invitations/a7f3c9d2.../accept
Response: {
  "projectId": "proj_xyz",
  "redirectUrl": "/projects/proj_xyz"
}
```

**Error States:**
```
Invitation Expired:
┌──────────────────────────────────────────┐
│  ⚠ This invitation has expired          │
│                                          │
│  This invitation was sent more than     │
│  7 days ago. Please contact             │
│  Sarah Johnson to request a new         │
│  invitation.                            │
│                                          │
│  [Contact Sarah Johnson]                │
└──────────────────────────────────────────┘

Invitation Already Accepted:
┌──────────────────────────────────────────┐
│  ✓ You're already a member              │
│                                          │
│  You've already accepted this           │
│  invitation and are part of the         │
│  project team.                          │
│                                          │
│  [Go to Project]                        │
└──────────────────────────────────────────┘

Email Mismatch:
┌──────────────────────────────────────────┐
│  ⚠ Email address doesn't match          │
│                                          │
│  This invitation was sent to            │
│  colleague@example.com.                 │
│                                          │
│  You're signed in as                    │
│  different@email.com.                   │
│                                          │
│  Please sign out and use the correct    │
│  email address.                         │
│                                          │
│  [Sign Out]                             │
└──────────────────────────────────────────┘
```

---

### SCREEN 4: Remove Team Member Confirmation

**Purpose:** Confirm removal of team member with data retention notice
**Route:** Modal overlay on `portal.motionify.studio/projects/:projectId/team`
**Authentication:** Required (primary contact or PM only)
**Trigger:** Click "Remove" button on team member

```
┌─────────────────────────────────────────────────────────────┐
│ Remove Team Member                                      [✕] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ⚠ Are you sure you want to remove Michael Chen from        │
│     this project?                                            │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  What happens when you remove a team member:                  │
│                                                               │
│  ✓ They will lose access to this project immediately         │
│  ✓ They won't be able to view files or deliverables          │
│  ✓ They won't receive project notifications                  │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  What will be preserved:                                      │
│                                                               │
│  📌 Tasks assigned to Michael (3)                            │
│  💬 Comments by Michael (12)                                 │
│  📄 Files uploaded by Michael (5)                            │
│  📊 Activity log entries                                     │
│                                                               │
│  These will remain visible to the team with Michael's name   │
│  and a "removed" status indicator.                           │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  📧 Michael will receive an email notification about         │
│     being removed from the project.                          │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  You can re-invite Michael later if needed.                  │
│                                                               │
│                                                               │
│               [Cancel]        [Remove Member]                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Validation Rules:**
- Cannot remove self (show error)
- Cannot remove primary contact (show error)
- Cannot remove last project manager (show error)
- Only primary contact or PM can remove members

**User Actions:**
- Click "Remove Member" → POST to API, close modal, show success toast, remove from list
- Click "Cancel" or [✕] → Close modal without changes

**API Call:**
```
DELETE /api/projects/:projectId/team/:userId
Response: {
  "success": true,
  "removedUser": {
    "id": "user_123",
    "name": "Michael Chen",
    "removedAt": "2025-11-16T10:00:00Z"
  }
}
```

**Success Toast:**
```
✓ Michael Chen has been removed from the project
  They will no longer have access, but their contributions are preserved.
```

**Error States:**
```
Cannot Remove Self:
┌──────────────────────────────────────────┐
│  ⚠ Cannot remove yourself               │
│                                          │
│  You cannot remove yourself from this   │
│  project. If you want to leave, please  │
│  contact the project manager.           │
│                                          │
│  [OK]                                   │
└──────────────────────────────────────────┘

Cannot Remove Primary Contact:
┌──────────────────────────────────────────┐
│  ⚠ Cannot remove primary contact        │
│                                          │
│  Sarah Johnson is the primary contact   │
│  for this project and cannot be removed.│
│                                          │
│  Transfer ownership first if needed.    │
│                                          │
│  [OK]                                   │
└──────────────────────────────────────────┘

Cannot Remove Last PM:
┌──────────────────────────────────────────┐
│  ⚠ Cannot remove last project manager   │
│                                          │
│  Alex Kim is the only project manager.  │
│  Assign another PM before removing.     │
│                                          │
│  [OK]                                   │
└──────────────────────────────────────────┘
```

---

### SCREEN 5: Pending Invitations Section

**Purpose:** Manage pending invitations (resend/revoke)
**Route:** Part of `portal.motionify.studio/projects/:projectId/team` page
**Authentication:** Required (project access)
**Permissions:** Resend/Revoke (primary contact or PM only)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Pending Invitations (3)                                                  │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  ✉  david@acmecorp.com                    [Resend] [Revoke]     │   │
│  │      Invited by Sarah Johnson                                    │   │
│  │      Sent Nov 10, 2025 • Expires in 4 days                       │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  ✉  lisa@contractor.io                    [Resend] [Revoke]     │   │
│  │      Invited by Sarah Johnson                                    │   │
│  │      Sent Nov 12, 2025 • Expires in 6 days                       │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  ⚠  expired@example.com                          [Resend]        │   │
│  │      Invited by Sarah Johnson                                    │   │
│  │      Sent Nov 2, 2025 • Expired 2 days ago                       │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

**User Actions:**
- Click "Resend" → Generates new token, sends fresh email, resets 7-day timer
- Click "Revoke" → Marks invitation as revoked, cannot be accepted
- Expired invitations show ⚠ icon and "Resend" only (no Revoke)

**Resend Confirmation Toast:**
```
✓ Invitation resent to david@acmecorp.com
  A new invitation link has been sent (expires in 7 days).
```

**Revoke Confirmation:**
```
┌─────────────────────────────────────────────────────────────┐
│ Revoke Invitation                                       [✕] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Are you sure you want to revoke the invitation to          │
│  david@acmecorp.com?                                         │
│                                                               │
│  They won't be able to accept the invitation link.           │
│  You can send a new invitation later if needed.              │
│                                                               │
│                                                               │
│               [Cancel]        [Revoke Invitation]             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**API Calls:**
```
# Resend invitation
POST /api/invitations/:id/resend
Response: {
  "id": "inv_abc123",
  "email": "david@acmecorp.com",
  "status": "pending",
  "expiresAt": "2025-11-23T10:00:00Z",
  "resentAt": "2025-11-16T10:00:00Z"
}

# Revoke invitation
DELETE /api/invitations/:id
Response: {
  "id": "inv_abc123",
  "status": "revoked"
}
```

---

### SCREEN 6: Empty State (No Team Members)

**Purpose:** Encourage inviting first team member
**Route:** `portal.motionify.studio/projects/:projectId/team` (when project has only Motionify team)
**Authentication:** Required (project access)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back to Project          Brand Video Campaign            [Project ▾] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Overview   Deliverables   Tasks   Files   Team   Activity               │
│  ─────────  ────────────   ─────   ─────  ════   ────────               │
│                                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Team Members (2)                                                         │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  👤  Alex Kim                                      PROJECT       │   │
│  │      alex@motionify.studio                         MANAGER       │   │
│  │      Motionify Team • Joined Oct 28, 2025                        │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  👤  Jordan Martinez                              CREATIVE       │   │
│  │      jordan@motionify.studio                      LEAD           │   │
│  │      Motionify Team • Joined Oct 28, 2025                        │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                           │
│                                                                           │
│                         👥                                                │
│                                                                           │
│                  Invite your team to collaborate                          │
│                                                                           │
│  Add team members to this project so they can view deliverables,         │
│  upload files, and stay updated on progress.                             │
│                                                                           │
│                                                                           │
│                    [✉ Invite Team Member]                                │
│                                                                           │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

**User Actions:**
- Click "Invite Team Member" → Opens invite modal
- Shows Motionify team members by default (cannot be removed)

---

## Mobile Responsive

### SCREEN 7: Team Management (Mobile)

**Purpose:** Mobile-optimized team management view
**Route:** `portal.motionify.studio/projects/:projectId/team`
**Viewport:** < 768px width

```
┌───────────────────────────────┐
│ ☰  Brand Video Campaign   🔔 │
├───────────────────────────────┤
│                                │
│ Overview  Deliverables  Tasks │
│ Files     [Team]        More  │
│                                │
├───────────────────────────────┤
│                                │
│ Team Members (5)               │
│                                │
│ [✉ Invite Team Member]        │
│                                │
│ ┌──────────────────────────┐  │
│ │ 👤 Sarah Johnson         │  │
│ │    sarah@acmecorp.com    │  │
│ │    PRIMARY CONTACT       │  │
│ │    Joined Nov 1, 2025    │  │
│ └──────────────────────────┘  │
│                                │
│ ┌──────────────────────────┐  │
│ │ 👤 Michael Chen          │  │
│ │    michael@acmecorp.com  │  │
│ │    Client Team           │  │
│ │    Joined Nov 3, 2025    │  │
│ │    [Remove]              │  │
│ └──────────────────────────┘  │
│                                │
│ ┌──────────────────────────┐  │
│ │ 👤 Emma Rodriguez        │  │
│ │    emma@consultant.com   │  │
│ │    Client Team           │  │
│ │    Joined Nov 5, 2025    │  │
│ │    [Remove]              │  │
│ └──────────────────────────┘  │
│                                │
│ ┌──────────────────────────┐  │
│ │ 👤 Alex Kim              │  │
│ │    alex@motionify.studio │  │
│ │    PROJECT MANAGER       │  │
│ │    Joined Oct 28, 2025   │  │
│ └──────────────────────────┘  │
│                                │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                │
│ Pending Invitations (2)        │
│                                │
│ ┌──────────────────────────┐  │
│ │ ✉ david@acmecorp.com     │  │
│ │   Invited Nov 10         │  │
│ │   Expires in 4 days      │  │
│ │   [Resend] [Revoke]      │  │
│ └──────────────────────────┘  │
│                                │
│ ┌──────────────────────────┐  │
│ │ ✉ lisa@contractor.io     │  │
│ │   Invited Nov 12         │  │
│ │   Expires in 6 days      │  │
│ │   [Resend] [Revoke]      │  │
│ └──────────────────────────┘  │
│                                │
└───────────────────────────────┘
```

**Mobile Optimizations:**
- Stacked layout for team member cards
- Larger tap targets (min 44px)
- Swipe to reveal "Remove" action (iOS style)
- Compact invitation cards
- Bottom sheet for invite modal (full screen)
- Condensed member info (role badges below name)

**Invite Modal (Mobile - Bottom Sheet):**
```
┌───────────────────────────────┐
│                           [✕] │
│ Invite Team Member            │
├───────────────────────────────┤
│                                │
│ Email Address *                │
│ ┌──────────────────────────┐  │
│ │ colleague@example.com    │  │
│ └──────────────────────────┘  │
│                                │
│ Personal Message               │
│ ┌──────────────────────────┐  │
│ │ Hi! I'd like to invite   │  │
│ │ you to collaborate...    │  │
│ └──────────────────────────┘  │
│                                │
│ [Send Invitation]              │
│                                │
└───────────────────────────────┘
```

---

## Design Notes

### Design System Alignment

**Todoist Aesthetic Principles Applied:**
- **Clean Hierarchy**: Clear visual separation between sections using subtle dividers (━━━)
- **Minimal Color**: Neutral grays with blue accents only for primary actions
- **Generous Whitespace**: Breathing room between cards and sections
- **Typography**: System fonts, clear size hierarchy (24px headings, 16px body, 14px secondary)
- **Restrained Icons**: Simple emoji/unicode characters (👤, ✉, 📹, ⚠) for visual scanning

### Responsive Behavior

**Desktop (>1200px):**
- Team members in card layout with full details
- Invite modal: 600px width, centered overlay
- Show all metadata (invited by, dates, role badges)

**Tablet (768px - 1200px):**
- Single column layout
- Slightly condensed cards
- Modal: 90% width, max 600px

**Mobile (<768px):**
- Stacked card layout
- Bottom sheet modals (full screen)
- Swipe gestures for removal
- Condensed metadata (hide secondary info)
- Larger tap targets (min 44px)

### Accessibility

**ARIA Labels:**
- Team member cards: `role="listitem"` with `aria-label="Michael Chen, Client Team, joined Nov 3"`
- Remove buttons: `aria-label="Remove Michael Chen from project"`
- Invitation cards: `aria-label="Pending invitation to david@acmecorp.com, expires in 4 days"`

**Keyboard Navigation:**
- Tab order: Invite button → Team member cards → Pending invitations
- Focus indicators: 2px blue outline on all interactive elements
- Escape key closes modals
- Enter/Space activates buttons

**Screen Reader Support:**
- Status announcements for actions: "Invitation sent to colleague@example.com"
- Role badges announced: "Sarah Johnson, primary contact"
- Expiry warnings announced: "Invitation expires in 4 days"

### Loading States

**Initial Page Load:**
```
┌─────────────────────────────────────────┐
│ Team Members                            │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │  ← Skeleton loader
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Sending Invitation:**
- Disable "Send Invitation" button
- Show loading spinner: `[⏳ Sending...]`
- Prevent modal close during send

**Removing Member:**
- Disable "Remove Member" button
- Show loading spinner: `[⏳ Removing...]`
- Fade out member card on success

### Error Handling

**Inline Validation (Invite Modal):**
```
Email Address *
┌────────────────────────────────┐
│ invalid-email                  │
└────────────────────────────────┘
⚠ Please enter a valid email address
```

**Toast Notifications (System Errors):**
```
┌────────────────────────────────────────┐
│ ⚠ Failed to send invitation           │
│   Please try again or contact support │
│                              [Dismiss] │
└────────────────────────────────────────┘
```

**Network Errors:**
- Retry button on failed actions
- Offline indicator if no connection
- Preserve form data on error

### Animation & Transitions

**Micro-interactions:**
- Modal fade in: 200ms ease-out
- Card hover: Scale 1.01, shadow increase (100ms)
- Button press: Scale 0.98 (50ms)
- Success toast: Slide in from top (300ms)
- List item removal: Fade out + slide up (250ms)

**No Animation Preference:**
- Respect `prefers-reduced-motion` media query
- Instant transitions if motion disabled
- No auto-play animations

### Security Considerations

**Email Display:**
- Show full email for team members (internal use)
- Truncate long emails on mobile: `david@verylongemai...`

**Token Protection:**
- Never display invitation tokens in UI
- Tokens only in email links
- Server-side validation for all token operations

**Permission Enforcement:**
- Hide Remove/Resend/Revoke buttons if no permission
- Backend validates all actions
- Clear error messages for permission denied
