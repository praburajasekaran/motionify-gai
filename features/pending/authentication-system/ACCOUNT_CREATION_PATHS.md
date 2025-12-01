# Account Creation Paths - Complete Documentation

**Date:** January 2025  
**Status:** ✅ Complete  
**Purpose:** Document all account creation paths across the system

---

## Overview

User accounts can be created through three distinct paths in the Motionify portal. This document provides a comprehensive guide to each path, their triggers, and the resulting user state.

---

## Account Creation Paths

### Path 1: Inquiry → Payment → Auto-Creation

**Trigger:** Customer completes advance payment after accepting proposal

**Workflow:**
1. Customer accepts proposal (inquiry-to-project workflow)
2. Admin creates project structure and sets payment terms
3. Admin triggers payment request (Razorpay)
4. Customer pays advance payment
5. **Payment webhook received → Account auto-created**

**User Account Properties:**
```typescript
{
  email: string,              // From inquiry.email
  role: 'client',
  is_primary_contact: true,
  hasAgreed: false,           // Must accept project terms on first login
  status: 'active',           // Account is immediately active
  created_via: 'payment_webhook'
}
```

**System Actions:**
- Account created immediately upon payment verification
- Project record created
- Customer added to project team as primary contact
- Magic link token generated
- Welcome email sent with portal access link
- `project_terms` record created with status: `pending_review`

**First Login Flow:**
- User clicks magic link from welcome email
- System authenticates user
- **BLOCKING terms acceptance modal appears** (cannot access project until accepted)
- User accepts terms → `hasAgreed = true`
- Full project access granted

**Related Files:**
- `features/inquiry-to-project/01-user-journey.md` (Step 11-12)
- `features/payment-workflow/01-user-journey.md` (Step 4)
- `features/project-terms-acceptance/01-user-journey.md` (Step 1-2)

---

### Path 2: Team Invitation → Manual Creation

**Trigger:** Primary contact invites team member to project

**Workflow:**
1. Primary contact navigates to project → Team tab
2. Clicks "Invite Team Member"
3. Enters email address
4. System sends invitation email with acceptance link
5. **User clicks acceptance link → Account creation flow**

**User Account Properties:**
```typescript
{
  email: string,              // From invitation.email
  role: 'client',             // Client team member (not primary contact)
  is_primary_contact: false,
  hasAgreed: true,            // Terms already accepted by primary contact
  status: 'active',           // Account is immediately active
  created_via: 'team_invitation'
}
```

**System Actions:**
- User clicks invitation acceptance link
- System checks if email exists in users table
- **IF no account exists:**
  - Show "Create Account" form
  - User enters name, creates password
  - Account created
  - User logged in automatically
- **IF account exists:**
  - Show "Sign In" form
  - User signs in with password or magic link
  - User logged in
- Project access granted automatically
- `project_team` record created
- Invitation status updated to `accepted`
- Welcome email sent

**First Login Flow:**
- User clicks invitation link
- Creates account or signs in
- Immediately redirected to project dashboard
- No terms acceptance required (primary contact already accepted)

**Related Files:**
- `features/team-management/01-user-journey.md` (Step 4-5)
- `features/authentication-system/01-user-journey.md` (Login flow)

---

### Path 3: Admin Creates User → Invitation Sent

**Trigger:** Super admin manually creates user account

**Workflow:**
1. Super admin navigates to User Management
2. Clicks "Add User"
3. Enters: Name, Email, Role (PM or Team Member)
4. System creates user record
5. **Welcome email sent with magic link**

**User Account Properties:**
```typescript
{
  email: string,              // Admin-entered email
  role: 'project_manager' | 'team_member',
  is_primary_contact: false,  // Only for client role
  hasAgreed: N/A,             // Not applicable for internal users
  status: 'pending_activation', // Must click magic link to activate
  created_via: 'admin_creation'
}
```

**System Actions:**
- User record created with status: `pending_activation`
- Magic link token generated (15-minute expiry)
- Welcome email sent with activation link
- Activity logged: "User created by [admin]"

**First Login Flow:**
- User clicks magic link from welcome email
- System validates token
- Account status updated: `pending_activation` → `active`
- User logged in automatically
- Admin notified of activation
- User can now be assigned to projects

**Related Files:**
- `features/admin-features/01-user-journey.md` (Journey 1)
- `features/authentication-system/01-user-journey.md` (Magic link verification)

---

## Comparison Table

| Aspect | Path 1: Payment | Path 2: Team Invitation | Path 3: Admin Creation |
|--------|----------------|------------------------|----------------------|
| **Trigger** | Payment webhook | Invitation acceptance | Admin action |
| **User Role** | `client` | `client` | `project_manager` or `team_member` |
| **Primary Contact** | Yes | No | No |
| **Initial Status** | `active` | `active` | `pending_activation` |
| **hasAgreed** | `false` (must accept terms) | `true` (N/A) | N/A |
| **First Login** | Terms acceptance modal (blocking) | Direct project access | Account activation |
| **Magic Link Expiry** | 15 minutes | 7 days (invitation) | 15 minutes |
| **Email Sent** | Welcome email | Invitation email | Welcome email |
| **Auto-Login** | Yes (after terms) | Yes | Yes (after activation) |

---

## Common Properties

All account creation paths share these common properties:

### Required Fields
- `email` (unique, validated)
- `full_name`
- `role` (enum: `client`, `project_manager`, `team_member`, `super_admin`)
- `created_at` (timestamp)
- `status` (enum: `active`, `pending_activation`, `deactivated`)

### Optional Fields
- `avatar_url`
- `phone_number`
- `notification_preferences` (JSON)
- `last_login_at`
- `deactivated_at`

### Security
- All passwords hashed with bcrypt (if password-based)
- Magic links use crypto-secure tokens (32 bytes)
- Email verification required (implicit via magic link)
- Rate limiting on account creation (prevents abuse)

---

## Edge Cases

### Duplicate Email Handling

**Scenario:** User tries to create account with existing email

**Path 1 (Payment):**
- System checks if email exists
- If exists: Add to project team instead of creating new account
- Send "Added to project" email instead of welcome email

**Path 2 (Team Invitation):**
- System checks if email exists
- If exists: Show "Sign In" form instead of "Create Account"
- User signs in, invitation accepted, added to project

**Path 3 (Admin Creation):**
- System validates email uniqueness
- If duplicate: Show error "User with this email already exists"
- Admin can search for existing user or reactivate if deactivated

---

### Account Status Transitions

```
Path 1 (Payment):
  [No Account] → Payment → [active] (immediate)

Path 2 (Invitation):
  [No Account] → Create Account → [active] (immediate)
  [Existing Account] → Sign In → [active] (immediate)

Path 3 (Admin):
  [No Account] → Admin Creates → [pending_activation] → Magic Link → [active]
```

---

## Integration Points

### With Authentication System
- All paths use magic link authentication for first login
- Magic link tokens stored in `magic_link_tokens` table
- Tokens expire after 15 minutes (Path 1 & 3) or 7 days (Path 2)
- Session created after successful authentication

### With Project Terms Acceptance
- **Path 1:** Terms acceptance required (blocking modal)
- **Path 2:** Terms already accepted by primary contact (no action needed)
- **Path 3:** Not applicable (internal users)

### With Team Management
- **Path 1:** User automatically added as primary contact
- **Path 2:** User added to project team via invitation
- **Path 3:** User can be assigned to projects after activation

### With Notifications System
- All paths trigger welcome/invitation emails
- Email delivery via Amazon SES
- Email templates vary by path:
  - Path 1: `welcome-client.html`
  - Path 2: `team-invitation.html`
  - Path 3: `welcome-team-member.html`

---

## API Endpoints

### Path 1: Payment Webhook
```
POST /api/webhooks/razorpay/payment
- Creates account automatically
- No user interaction required
```

### Path 2: Invitation Acceptance
```
GET /api/invitations/:token/accept
- Checks if account exists
- Returns: { requiresAccountCreation: boolean }
- If true: Show create account form
- If false: Show sign in form

POST /api/auth/register
- Creates account with invitation token
- Auto-accepts invitation
- Logs user in
```

### Path 3: Admin Creation
```
POST /api/admin/users
- Admin-only endpoint
- Creates user with pending_activation status
- Sends welcome email
```

---

## Testing Checklist

### Path 1: Payment Auto-Creation
- [ ] Payment webhook creates account
- [ ] Account has correct role and properties
- [ ] Welcome email sent
- [ ] Terms acceptance modal appears on first login
- [ ] Project access granted after terms acceptance

### Path 2: Team Invitation
- [ ] Invitation email sent
- [ ] New user can create account via invitation
- [ ] Existing user can sign in via invitation
- [ ] User added to project team
- [ ] No terms acceptance required

### Path 3: Admin Creation
- [ ] Admin can create user
- [ ] User receives welcome email
- [ ] Magic link activates account
- [ ] User can log in after activation
- [ ] Admin notified of activation

---

## Related Documentation

- `features/authentication-system/01-user-journey.md` - Login flow
- `features/inquiry-to-project/01-user-journey.md` - Path 1 details
- `features/team-management/01-user-journey.md` - Path 2 details
- `features/admin-features/01-user-journey.md` - Path 3 details
- `features/project-terms-acceptance/01-user-journey.md` - Terms acceptance

---

**Last Updated:** January 2025  
**Status:** ✅ Complete

