# User Journey: Admin Features

## Complete Customer Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ADMIN FEATURES WORKFLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

JOURNEY 1: ADD NEW USER
STEP 1: Super Admin clicks "Add User"
    ↓
Admin enters: Name, Email, Role (PM or Team Member)
    ↓
STEP 2: System validates and creates user record
    ↓
Status set to 'pending_activation', magic link generated
Activity logged: "User created by [admin]"
    ↓
STEP 3: Welcome email sent with magic link (15-min expiry)
    ↓
New user clicks link → Auto-login → Status changes to 'active'
    ↓
STEP 4: Admin notified of activation
    ↓
User can be assigned to projects
    ↓
Total time: 2-5 min (admin) + 5-30 min (user activation)


JOURNEY 2: DEACTIVATE USER
STEP 1: Admin finds user in User Management
    ↓
Click "Deactivate User" → Confirmation dialog
    ↓
STEP 2: Admin reviews data retention notice
    ↓
Type user name to confirm
Checkbox: "I understand historical data will be preserved"
    ↓
STEP 3: System sets is_active = false
    ↓
All sessions invalidated (immediate logout)
Activity logged: "User deactivated by [admin]"
    ↓
STEP 4: Notification email sent to deactivated user
    ↓
User appears in "Deactivated Users" with badge
Historical data preserved: tasks, comments, files, logs
    ↓
Total time: 2-3 min


JOURNEY 3: VIEW & EXPORT ACTIVITY LOGS
STEP 1: User navigates to Activity Logs
    ↓
Super Admin: Admin Dashboard → Activity Logs
Project Manager: Project Overview → Activity Tab
    ↓
STEP 2: System loads recent 50 activities (< 500ms)
    ↓
Activities shown: timestamp, user, action, description, link
    ↓
STEP 3: User applies filters (optional)
    ↓
Date range, user, action type, project element
Filters update in real-time (< 200ms)
    ↓
STEP 4: User clicks "Export to CSV"
    ↓
Select: Current view / All activity
Choose date range
    ↓
STEP 5: System generates CSV file
    ↓
Shows progress: "Preparing export... 2,347 records"
Generates file server-side (2-5 sec for 10K records)
    ↓
STEP 6: Download link appears
    ↓
User downloads: activity-log-[project]-[date].csv
File includes: timestamp, user, action, details, element
    ↓
Total time: 30 sec - 2 min


JOURNEY 4: UPDATE PROJECT STATUS
STEP 1: Admin opens project overview
    ↓
Current status badge visible: "In Progress"
    ↓
STEP 2: Admin clicks status dropdown
    ↓
Options: In Progress, Completed, On Hold, Archived
Selects: "Completed"
    ↓
STEP 3: System validates transition
    ↓
Checks: Are all deliverables approved?
If NO → Warning: "Not all deliverables approved. Override?"
    ↓
STEP 4: Admin confirms status change
    ↓
Checkbox: "All deliverables reviewed and approved"
Click "Confirm Status Change"
    ↓
STEP 5: System updates project status
    ↓
Sets status = 'completed', completed_at = NOW()
Activity logged: "Project status changed to Completed"
    ↓
STEP 6: Notifications sent to all team members
    ↓
Email + in-app notifications (30-60 sec delivery)
    ↓
STEP 7: Project status updated everywhere
    ↓
Badge updates, moves to "Completed Projects" filter
Project accessible in read-only mode
    ↓
Total time: 1-2 min
```

## State Transition Diagrams

### User Lifecycle Status Flow

```
┌─────────────────────┐
│ pending_activation  │  ← User created, invitation sent
└──────────┬──────────┘
           │
           ├─────→ User clicks magic link
           │       ↓
           │   ┌────────┐
           │   │ active │  ← User can log in and use system
           │   └───┬────┘
           │       │
           │       ├─────→ Admin deactivates
           │       │       ↓
           │       │   ┌──────────────┐
           │       │   │ deactivated  │  ← No login, data preserved
           │       │   └──────┬───────┘
           │       │          │
           │       │          └─────→ Admin reactivates
           │       │                  ↓
           │       └──────────────────┘ (back to active)
           │
           └─────→ Magic link expires (15 min)
                   ↓
               ┌───────────┐
               │ expired   │  ← Admin must resend invitation
               └───────────┘
```

### Project Status Flow

```
┌──────────────┐
│ in_progress  │  ← Default state when project created
└──────┬───────┘
       │
       ├─────→ Admin marks complete
       │       ↓
       │   ┌───────────┐
       │   │ completed │
       │   └─────┬─────┘
       │         │
       │         ├─────→ Admin archives
       │         │       ↓
       │         │   ┌──────────┐
       │         │   │ archived │  ← Hidden from main views
       │         │   └──────────┘
       │         │
       │         └─────→ Admin reopens
       │                 ↓
       ├─────────────────┘ (back to in_progress)
       │
       └─────→ Admin sets to On Hold
               ↓
           ┌──────────┐
           │ on_hold  │  ← Paused, can resume to in_progress
           └──────────┘

Cannot transition FROM archived (must delete project instead)
```

## Decision Points

### User Management: Add vs Reactivate

```
Admin wants to add user with email sarah@motionify.studio

Does user already exist?
       │
       ├─── NO ──→ Create new user
       │            └→ Send welcome email
       │                └→ User activates account
       │
       └─── YES ──→ Is user active?
                      │
                      ├─── YES ──→ Show error: "User already exists"
                      │             └→ Option: "Edit user details?"
                      │
                      └─── NO ──→ User is deactivated
                                   └→ Show: "Reactivate existing user?"
                                      └→ Admin reactivates
                                         └→ User can log in again
```

### Activity Log: Export Size Decision

```
User requests activity log export

How many records?
       │
       ├─── < 10,000 records ──→ Generate CSV immediately (2-5 sec)
       │                          └→ Download link appears
       │                             └→ User downloads file
       │
       ├─── 10,000 - 50,000 records ──→ Show progress bar
       │                                 └→ Generate in 5-10 sec
       │                                    └→ Download link appears
       │
       └─── > 50,000 records ──→ Show warning: "Large export"
                                  └→ Options:
                                     ├─ Narrow date range
                                     └─ Email me when ready (async)
                                        └→ Process in background
                                           └→ Email sent with download link (valid 24hrs)
```

### Project Status: Override Validation

```
Admin changes project status to "Completed"

Are all deliverables approved?
       │
       ├─── YES ──→ Proceed with status change
       │             └→ No warning needed
       │                └→ Notify team
       │
       └─── NO ──→ Show warning modal
                    └→ "3 deliverables not yet approved"
                       └→ List incomplete deliverables
                          └→ Admin chooses:
                             ├─ Cancel (recommended)
                             │  └→ Complete deliverables first
                             │
                             └─ Override (admin only)
                                └→ Checkbox: "I acknowledge incomplete deliverables"
                                   └→ Activity log notes: "Completed with overrides"
```

## Automation Triggers

### Email Notifications (Automatic)

| Trigger Event | Recipients | Email Template | Timing |
|--------------|------------|----------------|--------|
| User created | New user | Welcome email with magic link | < 1 min |
| User activated | Admin who created | Activation confirmation | On activation |
| User deactivated | Deactivated user | Access removal notice | < 1 min |
| User role changed | Affected user | Role update notification | < 1 min |
| Project status → Completed | All team members | Completion notification | < 2 min |
| Project status → Archived | All team members | Archival notice | < 2 min |
| Project status → On Hold | All team members | Project paused notice | < 2 min |

### Status Updates (Automatic)

| Trigger Event | Status Change | Additional Actions |
|--------------|---------------|-------------------|
| User clicks magic link | user.status → 'active' | Create first session, send admin notification |
| Admin deactivates user | user.is_active → false | Invalidate all sessions, set deactivated_at |
| Admin reactivates user | user.is_active → true | Clear deactivated_at, send welcome-back email |
| Admin archives project | project.status → 'archived' | Set archived_at, hide from default views |

### System Actions (Automatic)

| Trigger Event | System Action | Purpose |
|--------------|---------------|---------|
| User deactivated | Invalidate all JWT tokens | Immediate logout from all devices |
| Status change | Log activity with details | Audit trail for compliance |
| CSV export requested | Generate presigned R2 URL | Secure file download |
| Magic link expires | Delete token record | Security cleanup |
| Project archived | Update project list filters | Hide from main views |

## Timeline Estimates

### User Management Timeline

```
Add New User:
Day 0, 09:00 AM:  Admin creates user (2 min)
Day 0, 09:01 AM:  Welcome email sent
Day 0, 09:15 AM:  User clicks magic link (typical)
Day 0, 09:16 AM:  User activated, admin notified
                  ↓
Total: 2 min (admin) + 15 min (user)
Fastest possible: 5 min total
```

```
Deactivate User:
Day 0, 10:00 AM:  Admin initiates deactivation (1 min)
Day 0, 10:01 AM:  Admin confirms with name typed (1 min)
Day 0, 10:02 AM:  System processes (< 5 sec)
Day 0, 10:02 AM:  All sessions invalidated immediately
Day 0, 10:03 AM:  Deactivation email sent
                  ↓
Total: 2-3 min
```

### Activity Log Timeline

```
View & Filter Logs:
Load initial view (50 entries):    < 500ms
Apply filters (update view):       < 200ms
Search by keyword:                 < 300ms
                                   ↓
Total for viewing: < 1 sec
```

```
Export Activity Logs:
1,000 records:     1-2 sec generation    + download
10,000 records:    3-5 sec generation    + download
50,000 records:    Async (email in 5-10 min)
                   ↓
Total: Instant to 10 min (for very large exports)
```

### Project Status Timeline

```
Update Project Status:
Day 0, 14:00:  Admin selects new status (30 sec)
Day 0, 14:01:  Admin confirms (30 sec)
Day 0, 14:01:  System updates status (< 200ms)
Day 0, 14:02:  Notifications sent (30-60 sec)
Day 0, 14:03:  All team members receive email
               ↓
Total: 1-2 min (visible in < 1 sec to admin)
```

## Edge Cases & Error Handling

### Edge Case: Email Already Exists

**Description:** Admin tries to add user with email that already exists

**Expected Behavior:**
- System detects duplicate on form submission
- Error message: "A user with this email already exists"
- Shows user status: "sarah@motionify.studio - Active" or "Deactivated"

**Resolution:**
- If active: Suggest "Edit user details instead?"
- If deactivated: Offer "Reactivate this user?" button
- Admin can cancel and search for existing user

---

### Edge Case: Last Super Admin Deactivation

**Description:** Admin tries to deactivate the last remaining super admin

**Expected Behavior:**
- System counts active super admins before allowing deactivation
- If count === 1 and target is super admin: Block operation
- Error: "Cannot deactivate the last Super Admin"
- Suggestion: "Please promote another user to Super Admin first"

**Resolution:**
- Admin must first promote another user to super_admin role
- Then can deactivate the original admin
- Ensures platform always has at least one super admin

---

### Edge Case: Self-Deactivation Attempt

**Description:** Admin tries to deactivate their own account

**Expected Behavior:**
- System detects currentUser.id === targetUser.id
- Block operation immediately
- Error: "Cannot deactivate your own account"
- Suggestion: "Ask another admin to deactivate your account"

**Resolution:**
- Admin must request another super admin to perform deactivation
- Prevents accidental lockout
- Maintains accountability (one admin cannot disappear without trace)

---

### Edge Case: Magic Link Expired

**Description:** New user clicks magic link > 15 minutes after creation

**Expected Behavior:**
- System checks token expiry on verification attempt
- Error page: "This invitation link has expired"
- Shows "Request New Link" button

**Resolution:**
- User clicks "Request New Link"
- Triggers email to admin: "Sarah Mitchell's invitation expired. Resend?"
- Admin resends invitation (generates new token)
- User receives fresh magic link (15-minute expiry)

---

### Edge Case: Viewing Deactivated User's Activity

**Description:** Activity log includes actions by users who are now deactivated

**Expected Behavior:**
- Deactivated users' activities remain visible in logs
- User name shown with "(Deactivated)" badge
- Avatar grayed out but still visible
- Links to affected items (tasks, files) still functional

**Resolution:**
- No action needed - this is correct behavior
- Historical data integrity maintained
- Audit trail complete and accurate
- Deactivated users filterable in activity log

---

### Edge Case: Large Export (50,000+ Records)

**Description:** Admin requests export of 2 years of activity logs

**Expected Behavior:**
- System detects export > 50,000 records
- Shows warning: "This export contains 73,241 records and may take several minutes"
- Options:
  - "Narrow date range" (recommended)
  - "Generate and email me" (async processing)

**Resolution:**
- If async chosen:
  - Job queued in background
  - Admin receives email in 5-10 minutes
  - Email contains download link (valid 24 hours)
  - CSV stored temporarily in R2
- If narrowed date range: Reduce to < 50K records, generate normally

---

### Edge Case: Invalid Status Transition

**Description:** Admin tries to change archived project to "On Hold"

**Expected Behavior:**
- System validates transition against allowed state changes
- Archived projects cannot transition to any other status
- Error: "Cannot change status from Archived"
- Message: "Archived projects are read-only. To reopen, create a new project."

**Resolution:**
- Admin cancels operation
- If project truly needs to continue, admin creates new project
- Links old project in description
- Historical archived project preserved

---

### Edge Case: Status Change During Client Approval

**Description:** Admin marks project complete while client is reviewing deliverable

**Expected Behavior:**
- Warning shown: "Client is currently reviewing a deliverable"
- Admin can:
  - Wait for client approval (recommended)
  - Override and complete anyway

**Resolution:**
- If overridden: Activity log notes "Completed during active client review"
- Client can still complete their review
- Client approval updates deliverable but doesn't change project status

---

### Edge Case: Concurrent Admin Actions (Race Condition)

**Description:** Two admins try to change same user/project simultaneously

**Expected Behavior:**
- Database uses optimistic locking with updated_at checks
- Second admin's action fails with clear message
- Error: "This [user/project] was modified by [admin name] just now"
- Suggestion: "Refresh and try again"

**Resolution:**
- Admin refreshes page to see latest changes
- Reviews new state
- Retries action if still necessary
- Prevents conflicting concurrent modifications

---

### Error Case: Email Delivery Failure (SES)

**Description:** Welcome email fails to send due to SES issue

**Expected Behavior:**
- User record created with status: 'pending_activation'
- Admin sees warning: "User created but email failed to send"
- Email error logged for debugging

**Recovery Process:**
1. Admin sees "Resend Invitation" button next to user
2. Admin clicks button
3. System generates new magic link token
4. Retries email send via SES
5. Success message: "Invitation email sent to sarah@motionify.studio"
6. If retry fails again: Escalate to system admin (check SES credentials)

---

### Error Case: Database Connection Lost During Deactivation

**Description:** Network issue causes DB connection to drop mid-deactivation

**Expected Behavior:**
- Database transaction rolls back automatically
- User status remains 'active'
- Admin sees error: "Failed to deactivate user. Please try again."
- No partial state (user either fully active or fully deactivated)

**Recovery Process:**
1. Admin retries deactivation
2. If persistent: Check database connection health
3. System admin reviews network/DB logs
4. Once resolved, admin can retry operation
5. Transaction ensures all-or-nothing: no data corruption

---

### Error Case: CSV Export Generation Timeout

**Description:** Export job runs longer than timeout limit (2 minutes)

**Expected Behavior:**
- Job times out with error
- User sees: "Export generation timed out"
- Suggestion: "Try narrowing your date range or use async export"

**Recovery Process:**
1. User selects smaller date range (e.g., 3 months instead of 2 years)
2. Retry export with reduced dataset
3. If still too large: Use "Email me when ready" option
4. Background job has longer timeout (10 minutes)
5. File delivered via email link

---

## Success Indicators

### User Management Success Criteria

✅ **Add User:**
- User record created in < 5 seconds
- Welcome email delivered in < 1 minute
- User can activate account via magic link
- Admin notified when user activates
- User visible in "Active Users" list

✅ **Deactivate User:**
- User cannot log in immediately (< 1 second)
- All sessions invalidated instantly
- Historical data 100% preserved (tasks, comments, files)
- Deactivation email sent in < 1 minute
- Activity logged for audit

✅ **Edit User:**
- Changes saved in < 2 seconds
- User notified if role changed
- Activity logged with before/after values

---

### Activity Log Success Criteria

✅ **View Logs:**
- Initial load < 500ms
- Filters update in < 200ms
- All actions logged with complete details
- Deactivated users' actions visible

✅ **Export Logs:**
- CSV generates in < 10 seconds for 10K records
- File contains accurate, complete data
- Columns: timestamp, user, action, details, element, item ID
- ISO 8601 date format for compatibility
- Opens correctly in Excel/Sheets

---

### Project Status Success Criteria

✅ **Change Status:**
- Update completes in < 200ms
- Invalid transitions blocked with clear errors
- Validation warnings shown when appropriate
- All team members notified in < 2 minutes
- Activity logged with admin name and reason

✅ **Archive Project:**
- Project hidden from main list immediately
- Accessible via "View Archived" toggle
- All data preserved and readable
- Cannot be modified (read-only)
- Team members notified of archival
