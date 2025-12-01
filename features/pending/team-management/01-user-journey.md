# User Journey: Team Management

## Complete Customer Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TEAM INVITATION & MANAGEMENT WORKFLOW                 │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1: Primary Contact Invites Team Member
    ↓
Navigate to project → Team tab → Click "Invite Team Member"
    ↓
Enter email address: colleague@example.com
Add optional personal message
Select role: "Client Team Member" (auto-selected)
    ↓

STEP 2: System Generates Secure Invitation
    ↓
POST /api/projects/:id/invitations
Backend generates unique token (crypto.randomBytes)
    ↓
Creates invitation record:
{
  email: "colleague@example.com",
  token: "a7f3c9d2...",
  expires_at: now + 7 days,
  status: "pending"
}
    ↓

STEP 3: Email Invitation Sent (Amazon SES)
    ↓
Email sent to colleague@example.com
Subject: "You've been invited to join [Project Name] on Motionify"
    ↓
Email contains:
- Personal message from primary contact
- Project name and description
- Secure acceptance link: https://motionify.studio/invitations/accept?token=a7f3c9d2...
- Expiration notice: "This invitation expires in 7 days"
    ↓

STEP 4: Team Member Accepts Invitation
    ↓
Clicks acceptance link → Redirected to public page
    ↓
IF user has no account:
  ├─ Show "Create Account" form
  ├─ Enter name, create password
  ├─ POST /api/auth/register { email, name, password, invitationToken }
  └─ Account created, user logged in
    ↓
IF user already has account:
  ├─ Show "Sign In" form
  ├─ Enter password or use magic link
  ├─ POST /api/auth/login { email, password }
  └─ User logged in
    ↓

STEP 5: Automatic Project Access Grant
    ↓
POST /api/invitations/:token/accept
Backend validates:
  ✓ Token exists and matches
  ✓ Token not expired (<7 days)
  ✓ Invitation status = "pending"
  ✓ User email matches invitation email
    ↓
Creates project_team record:
{
  user_id: [new user id],
  project_id: [project id],
  role: "client",
  is_primary_contact: false,
  added_at: now
}
    ↓
Updates invitation status: "pending" → "accepted"
    ↓

STEP 6: Notifications Sent
    ↓
Activity logged: "[Name] joined the project team"
    ↓
Email sent to primary contact:
"[Name] has accepted your invitation to [Project Name]"
    ↓
Email sent to new team member:
"Welcome to [Project Name]! You now have access to all project files and updates."
    ↓

STEP 7: Team Member Collaborates
    ↓
New team member can now:
- View all project deliverables and files
- Upload files to any deliverable
- Comment on tasks and deliverables
- Receive project notifications
- Follow tasks (US-011)
    ↓
Restrictions:
- Cannot invite other team members (only primary contact)
- Cannot remove team members
- Cannot change project settings
    ↓

STEP 8 (Optional): Team Member Removal
    ↓
Primary contact or PM navigates to Team tab
Clicks "Remove" next to team member
    ↓
Confirmation dialog:
"Remove [Name] from this project?
They will lose access immediately, but their contributions will be preserved."
    ↓
POST /api/projects/:id/team/:userId (soft delete)
    ↓
Backend validation:
  ✓ Cannot remove self
  ✓ Cannot remove last project manager
  ✓ Cannot remove primary contact
  ✓ Requester has permission (is_primary_contact OR super_admin/PM)
    ↓
Soft delete: project_team.removed_at = now
Immediate access revocation
    ↓
Historical data preserved:
- Tasks assigned to removed member (shows "[Name] (removed)")
- Comments by removed member (visible, shows removed status)
- Files uploaded by removed member (accessible to remaining team)
- Activity log entries (preserved for audit trail)
    ↓
Notifications sent:
- Email to removed member: "You've been removed from [Project Name]"
- Email to primary contact: "[Name] has been removed from [Project Name]"
- Activity logged: "[Name] was removed from the project by [Remover Name]"
    ↓

Data Retention (90 days):
After 90 days, soft-deleted team member records purged
Historical contributions remain visible but attributed to "[Removed User]"
```

---

## Automatic Motionify SPOC Assignment

Every project automatically includes a Motionify support contact as the primary Single Point of Contact (SPOC) for the client.

### Auto-Invite Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│           AUTOMATIC MOTIONIFY SUPPORT CONTACT ASSIGNMENT                 │
└─────────────────────────────────────────────────────────────────────────┘

TRIGGER: Project Created (after payment received)
    ↓
System automatically adds support@motionify.studio to project team
    ↓
IF support@motionify.studio user account does NOT exist:
  ├─ System creates system user account:
  │    - email: support@motionify.studio
  │    - fullName: "Motionify Support"
  │    - role: 'project_manager'
  │    - isActive: true
  │    - status: 'active'
  │    - accountType: 'system' (not a real login account)
  └─ Account created (one-time setup)
    ↓
System adds support@motionify.studio to project:
{
  user_id: [support user id],
  project_id: [new project id],
  role: 'project_manager',
  is_primary_contact: false,
  added_at: now,
  added_by: 'system'
}
    ↓
NO invitation email sent (system account)
NO acceptance required (auto-added)
    ↓
Result:
✓ support@motionify.studio appears in Motionify Team section
✓ All project notifications sent to this email address
✓ Client can see "Motionify Support" as their primary contact
✓ Cannot be removed from project (system-protected)
```

### Implementation Details

**System User Properties:**
- **Email:** `support@motionify.studio`
- **Display Name:** `Motionify Support`
- **Role:** `project_manager` (full project access)
- **Account Type:** System account (no password, cannot login to portal)
- **Purpose:** Centralized support email for all project communications
- **Protection:** Cannot be removed from projects (system validation prevents removal)

**When It's Added:**
- Automatically during project creation (after payment webhook)
- Added to `motionifyTeam` array in Project model
- No manual intervention required

**Notifications Routed to This Email:**
- Client approval requests
- Revision requests
- Payment confirmations
- Project milestone updates
- Any notifications sent to "Motionify Team"

**Business Logic:**
```typescript
// During project creation (in payment webhook handler)
async function createProject(inquiry: Inquiry, proposal: Proposal, customer: User) {
  // Get or create system support user
  const supportUser = await getOrCreateSupportUser();

  const project = {
    // ... other project fields
    motionifyTeam: [
      supportUser, // Auto-added to every project
      // Additional team members added by admin later
    ],
  };

  // Create project team record
  await createProjectTeamMember({
    userId: supportUser.id,
    projectId: project.id,
    role: 'project_manager',
    isPrimaryContact: false,
    addedBy: 'system',
  });

  return project;
}

async function getOrCreateSupportUser(): Promise<User> {
  const existingUser = await findUserByEmail('support@motionify.studio');

  if (existingUser) {
    return existingUser;
  }

  // Create system user (one-time)
  return await createUser({
    email: 'support@motionify.studio',
    fullName: 'Motionify Support',
    role: 'project_manager',
    isActive: true,
    status: 'active',
    accountType: 'system',
  });
}
```

**Validation Rules:**
- System validates that support@motionify.studio cannot be removed from projects
- Removal attempts return error: `Cannot remove system support contact`
- This user is excluded from "Invite Team Member" dropdowns (already on project)

---

## State Transition Diagrams

### Invitation Status Flow

```
┌─────────┐
│ PENDING │  ← Initial state (invitation sent, awaiting acceptance)
└────┬────┘
     │
     ├─────→ [User clicks acceptance link within 7 days]
     │
     ↓
┌──────────┐
│ ACCEPTED │  ← User accepted, team member created
└──────────┘

Alternative paths:

┌─────────┐
│ EXPIRED │  ← 7 days passed without acceptance
└────┬────┘
     │
     ├─────→ [Primary contact can resend invitation]
     │
     ↓
┌─────────┐
│ PENDING │  ← New token generated, fresh 7-day window
└─────────┘

┌─────────┐
│ REVOKED │  ← Primary contact canceled invitation before acceptance
└─────────┘
```

### Team Member Status Flow

```
┌────────┐
│ ACTIVE │  ← Initial state (invitation accepted, full access)
└───┬────┘
    │
    ├─────→ [Admin/Primary contact removes member]
    │
    ↓
┌─────────┐
│ REMOVED │  ← Access revoked, removed_at timestamp set
└────┬────┘
    │
    ├─────→ [90 days pass]
    │
    ↓
┌────────┐
│ PURGED │  ← Record soft-deleted, contributions show "[Removed User]"
└────────┘

Alternative path:

┌─────────┐
│ REMOVED │
└────┬────┘
    │
    ├─────→ [Admin re-invites removed member]
    │
    ↓
┌────────┐
│ ACTIVE │  ← New invitation creates fresh team member record
└────────┘
```

## Decision Points

### System: Invitation Expiry Check
```
Has 7 days passed since invitation sent?

NO (within 7 days)              YES (>7 days)
  │                                │
  ↓                                ↓
Allow acceptance                 Show error message
Create team member              "Invitation has expired"
                                Offer to request new invite
```

### System: Email Match Validation
```
Does user's email match invitation email?

YES                              NO
  │                                │
  ↓                                ↓
Proceed with acceptance         Show error message
Grant project access            "This invitation was sent to
                                 a different email address"
```

### User: Removal Permission Check
```
Does requester have permission to remove team member?

ALLOWED                          DENIED
  │                                │
  ↓                                ↓
• Is primary contact            • Regular team member
• Is super_admin                • Trying to remove self
• Is project_manager            • Trying to remove last PM
                                • Trying to remove primary
  ↓                                ↓
Proceed with removal            Return 403 Forbidden
Send notifications              Show error message
```

## Automation Triggers

### Email Notifications (Automatic)

| Trigger Event | Recipients | Email Type |
|--------------|------------|------------|
| Invitation sent | Invitee | `team-invitation.tsx` |
| Invitation accepted | Primary contact, project managers | `team-member-joined.tsx` |
| Team member removed | Removed member, primary contact | `team-member-removed.tsx` |
| Invitation expired (7 days) | Primary contact | `invitation-expired-reminder.tsx` |
| Invitation revoked | Invitee (if sent) | `invitation-revoked.tsx` |

### Status Updates (Automatic)

| Trigger Event | Status Change |
|--------------|---------------|
| Invitation sent | Invitation → `pending` |
| Acceptance link clicked | Invitation → `accepted` |
| 7 days pass without acceptance | Invitation → `expired` |
| Primary contact cancels | Invitation → `revoked` |
| Team member removed | ProjectTeamMember.removed_at → timestamp |
| 90 days after removal | ProjectTeamMember → soft deleted |

### System Actions (Automatic)

| Trigger Event | System Action |
|--------------|---------------|
| Invitation sent | Generate unique token, log activity |
| Invitation accepted | Create team member record, grant access |
| Team member removed | Revoke access, preserve historical data |
| Invitation expires | Mark as expired, allow resend |
| Bulk invitations | Queue emails (5/minute rate limit) |

## Timeline Estimates

### Typical Flow
```
Hour 0:   Primary contact sends invitation
          → Email delivered in <1 minute
          → Invitation status: pending

Hour 2:   Team member receives email, clicks link
          → Creates account (if needed) - 2 minutes
          → Auto-added to project - instant
          → Invitation status: accepted
          → Welcome email sent

Day 1:    New team member uploads first file
          → Collaborates with team
          → Receives project notifications

Day 30:   Project completed
          → All team members retain access
          → (Optional: Remove temporary consultants)

Total: ~2 hours from invitation to active collaboration
```

### Expiration Flow
```
Day 0:    Invitation sent

Day 7:    Invitation expires (no acceptance)
          → Status: pending → expired
          → Primary contact notified

Day 8:    Primary contact resends invitation
          → New token generated
          → Fresh 7-day window

Day 9:    Team member accepts
          → Access granted

Total: 9 days if initial invitation missed
```

## Edge Cases & Error Handling

### Invitation Already Accepted
- **Description**: User clicks acceptance link after already accepting
- **Expected behavior**: Redirect to project dashboard
- **Resolution**: Show message "You're already a member of this project"

### Email Mismatch
- **Description**: User signs in with different email than invitation
- **Expected behavior**: Block acceptance, show error
- **Resolution**: "This invitation was sent to [original@email.com]. Please sign in with that email."
- **Workaround**: Primary contact can revoke and send new invitation to correct email

### Invitation Token Invalid/Missing
- **Description**: Malformed or missing token in URL
- **Expected behavior**: Show 404 page
- **Resolution**: User must request new invitation from primary contact

### User Already on Project Team
- **Description**: Primary contact invites someone already on team
- **Expected behavior**: Backend prevents duplicate invitation
- **Resolution**: Show message "This user is already a member of this project"

### Removed Member Re-Invited
- **Description**: Primary contact re-invites previously removed member
- **Expected behavior**: Allow new invitation, create fresh team member record
- **Resolution**: New invitation creates new project_team entry with removed_at = null
- **Historical data**: Previous contributions still show (different team member ID)

### Invitation Sent to Non-Existent Email
- **Description**: Email address typo or invalid
- **Expected behavior**: Email bounces (Amazon SES bounce notification)
- **Resolution**: SES webhook marks invitation as "bounced", notifies primary contact
- **UI**: Show "Email delivery failed. Please check the email address."

### Primary Contact Removal Attempt
- **Description**: Someone tries to remove the primary contact
- **Expected behavior**: Backend blocks with 403 Forbidden
- **Resolution**: "Cannot remove primary contact. Transfer ownership first."
- **Future**: Implement primary contact transfer feature (US-023 extension)

### Self-Removal Attempt
- **Description**: User tries to remove themselves from project
- **Expected behavior**: Backend allows (user can leave project)
- **Resolution**: Soft delete with confirmation dialog
- **Special case**: If user is primary contact, prevent unless ownership transferred

### Last Project Manager Removal
- **Description**: Attempt to remove last PM from project
- **Expected behavior**: Backend blocks with 403 Forbidden
- **Resolution**: "Cannot remove last project manager. Assign another PM first."
- **Validation**: Count active PMs before allowing removal

### Concurrent Invitation Acceptance
- **Description**: Two users try to accept same invitation simultaneously
- **Expected behavior**: First acceptance succeeds, second fails
- **Resolution**: Database constraint (unique index on token + status)
- **UI**: Second user sees "This invitation has already been accepted"

### Bulk Invitation Rate Limiting
- **Description**: Primary contact invites 50 team members at once
- **Expected behavior**: Queue invitations, send emails at controlled rate
- **Resolution**: Process 5 emails/minute (Amazon SES limit)
- **UI**: Show "Sending X of Y invitations..." progress indicator
- **Timeline**: 50 invitations = ~10 minutes to send all emails

### Token Expiry Edge Case (Exactly 7 Days)
- **Description**: User clicks link exactly 168 hours after invitation
- **Expected behavior**: Use strict timestamp comparison (expires_at < now)
- **Resolution**: If exactly at boundary, allow acceptance (inclusive)
- **Database**: Use TIMESTAMPTZ for accurate timezone handling

### Invitation Resend Limit
- **Description**: Primary contact resends invitation 10 times
- **Expected behavior**: Allow unlimited resends (generates new token each time)
- **Spam prevention**: Rate limit to 3 resends per hour per invitation
- **Resolution**: Show "Too many resend attempts. Please wait 1 hour."

### Project Deleted with Pending Invitations
- **Description**: Project deleted while invitations pending
- **Expected behavior**: Cascade delete invitations (database constraint)
- **Resolution**: Invitation acceptance link shows "Project no longer exists"
- **Cleanup**: Scheduled job removes orphaned expired invitations (90 days)
