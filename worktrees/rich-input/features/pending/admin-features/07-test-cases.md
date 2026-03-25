# Test Cases: Admin Features

Comprehensive test scenarios for admin features. Total: 32 test cases.

## Test Case Format

Each test case includes:
- **ID**: Unique identifier (TC-ADM-###)
- **Feature**: Which component is being tested
- **Scenario**: What we're testing
- **Steps**: How to execute the test
- **Expected Result**: What should happen
- **Priority**: High/Medium/Low

---

## 1. User Management Operations (8 test cases)

### TC-ADM-001: Create New User Successfully
**Priority:** High
**Feature:** User Management - Create User

**Steps:**
1. Log in as Super Admin
2. Navigate to User Management dashboard
3. Click "Add User" button
4. Enter valid details:
   - Full Name: "Sarah Mitchell"
   - Email: "sarah.test@motionify.studio"
   - Role: "Project Manager"
5. Click "Send Invitation"

**Expected:**
- ✓ User created with status "pending_activation"
- ✓ Welcome email sent to sarah.test@motionify.studio
- ✓ Magic link generated (15-minute expiry)
- ✓ Success message displayed: "User created successfully"
- ✓ User appears in user list with "Pending Activation" status
- ✓ Activity logged: "user_created"

---

### TC-ADM-002: Prevent Duplicate Email on User Creation
**Priority:** High
**Feature:** User Management - Validation

**Steps:**
1. Log in as Super Admin
2. Navigate to User Management
3. Attempt to create user with existing email: "existing@motionify.studio"
4. Click "Send Invitation"

**Expected:**
- ✓ Error message: "A user with this email already exists"
- ✓ Form validation prevents submission
- ✓ User not created
- ✓ Suggestion shown: "Edit existing user?" or "Reactivate user?" (if deactivated)

---

###TC-ADM-003: Deactivate User with Data Preservation
**Priority:** High
**Feature:** User Management - Deactivate

**Steps:**
1. Log in as Super Admin
2. Navigate to User Management
3. Locate active user "Mike Johnson"
4. Click three-dot menu → "Deactivate User"
5. Review data retention notice
6. Type user name exactly: "Mike Johnson"
7. Optional: Enter reason "Left company"
8. Click "Deactivate User"

**Expected:**
- ✓ User status changed to "deactivated"
- ✓ is_active set to false
- ✓ All user sessions invalidated immediately
- ✓ Deactivation email sent to user
- ✓ Historical data preserved (tasks: 47, comments: 89, files: 23)
- ✓ Activity logged with reason
- ✓ User appears in "Deactivated Users" section
- ✓ User badge shows "Deactivated" on historical items

---

### TC-ADM-004: Prevent Deactivating Last Super Admin
**Priority:** High
**Feature:** User Management - Validation

**Steps:**
1. Log in as Super Admin (only active super admin in system)
2. Navigate to User Management
3. Attempt to deactivate own account
4. Click "Deactivate User"

**Expected:**
- ✓ Error message: "Cannot deactivate the last Super Admin"
- ✓ Deactivate button disabled
- ✓ Suggestion: "Please promote another user to Super Admin first"
- ✓ Operation blocked

---

### TC-ADM-005: Reactivate Deactivated User
**Priority:** Medium
**Feature:** User Management - Reactivate

**Steps:**
1. Log in as Super Admin
2. Navigate to User Management → Deactivated Users
3. Locate deactivated user "Tom Wilson"
4. Click "Reactivate" button
5. Confirm reactivation

**Expected:**
- ✓ User status changed to "active"
- ✓ is_active set to true
- ✓ Deactivation fields cleared
- ✓ Welcome-back email sent with magic link
- ✓ User moves to "Active Users" list
- ✓ Historical data still intact
- ✓ User can log in again

---

### TC-ADM-006: Update User Role
**Priority:** High
**Feature:** User Management - Update

**Steps:**
1. Log in as Super Admin
2. Navigate to User Management
3. Locate user "Sarah Mitchell" (current role: Project Manager)
4. Click Edit → Change role to "Super Admin"
5. Click "Save Changes"

**Expected:**
- ✓ User role updated successfully
- ✓ Role change email sent to user
- ✓ Activity logged: "user_role_changed"
- ✓ User permissions updated immediately
- ✓ Change history tracked (old: PM, new: Super Admin)

---

### TC-ADM-007: Resend Invitation to Pending User
**Priority:** Medium
**Feature:** User Management - Resend Invitation

**Steps:**
1. Log in as Super Admin
2. Navigate to User Management
3. Locate user with "Pending Activation" status
4. Click "Resend Invitation" button

**Expected:**
- ✓ New magic link generated
- ✓ Previous link invalidated
- ✓ Welcome email sent again
- ✓ New 15-minute expiry set
- ✓ Success message: "Invitation email sent to [email]"

---

### TC-ADM-008: Search and Filter Users
**Priority:** Medium
**Feature:** User Management - Search/Filter

**Steps:**
1. Log in as Super Admin
2. Navigate to User Management
3. Enter "sarah" in search box
4. Apply filter: Role = "Project Manager"
5. Apply filter: Status = "Active"

**Expected:**
- ✓ Results update in real-time (< 300ms debounce)
- ✓ Only matching users shown
- ✓ Search is case-insensitive
- ✓ Filters combine with AND logic
- ✓ Result count displayed: "Showing 2 of 15 users"

---

## 2. Activity Log Viewing and Export (6 test cases)

### TC-ADM-009: View Recent Activity Logs
**Priority:** High
**Feature:** Activity Logs - View

**Steps:**
1. Log in as Super Admin or Project Manager
2. Navigate to Project → Activity tab
3. View recent activities

**Expected:**
- ✓ Last 50 activities loaded in < 500ms
- ✓ Activities displayed in reverse chronological order
- ✓ Each entry shows: timestamp, user, action, description, link
- ✓ Relative time displayed: "2 hours ago"
- ✓ User avatars visible
- ✓ Deactivated users shown with "(Deactivated)" badge

---

### TC-ADM-010: Filter Activities by Date Range
**Priority:** High
**Feature:** Activity Logs - Filters

**Steps:**
1. Navigate to Activity Logs
2. Select date filter: "Last 7 days"
3. Verify results
4. Change to custom range: Jan 1-31, 2025

**Expected:**
- ✓ Results filter correctly by date
- ✓ Filter updates in < 200ms
- ✓ Date range displayed in summary
- ✓ Record count updates: "Showing 234 of 2,347 activities"

---

### TC-ADM-011: Filter Activities by User and Action Type
**Priority:** Medium
**Feature:** Activity Logs - Advanced Filters

**Steps:**
1. Navigate to Activity Logs
2. Select user filter: "Sarah Mitchell"
3. Select action type: "Task Status Changed"
4. View filtered results

**Expected:**
- ✓ Only activities by selected user shown
- ✓ Only selected action type shown
- ✓ Filters combine correctly (AND logic)
- ✓ Clear filters button available
- ✓ Results paginated (50 per page)

---

### TC-ADM-012: Export Small Activity Log (< 10K records)
**Priority:** High
**Feature:** Activity Logs - Export

**Steps:**
1. Navigate to Activity Logs
2. Apply filters: Last 30 days
3. Click "Export to CSV"
4. Select format: CSV
5. Select columns: All
6. Click "Generate Export"

**Expected:**
- ✓ CSV generated in 2-5 seconds
- ✓ Download link appears immediately
- ✓ File size displayed: "487 KB"
- ✓ Record count shown: "2,347 records"
- ✓ File downloads successfully
- ✓ CSV contains all selected columns
- ✓ Data formatted correctly (ISO 8601 dates)
- ✓ Opens in Excel/Google Sheets without errors

---

### TC-ADM-013: Export Large Activity Log (> 50K records)
**Priority:** Medium
**Feature:** Activity Logs - Async Export

**Steps:**
1. Navigate to Activity Logs
2. Select date range: All time (73,241 records)
3. Click "Export to CSV"
4. Choose "Email me when ready"
5. Confirm export

**Expected:**
- ✓ Job queued message: "Export is being generated"
- ✓ Estimated time shown: "5-10 minutes"
- ✓ Background job processes export
- ✓ Email received within 10 minutes
- ✓ Email contains download link (24-hour expiry)
- ✓ File downloadable from R2 storage
- ✓ All 73,241 records included

---

### TC-ADM-014: View Activity Log as Project Manager (Scoped Access)
**Priority:** High
**Feature:** Activity Logs - Permissions

**Steps:**
1. Log in as Project Manager (not Super Admin)
2. Navigate to Activity Logs
3. Attempt to view logs

**Expected:**
- ✓ Can view logs for assigned projects only
- ✓ Cannot view logs for unassigned projects
- ✓ Project dropdown shows only assigned projects
- ✓ Permission check enforced by API
- ✓ Error if attempting to access unauthorized project logs

---

## 3. Project Status Management (8 test cases)

### TC-ADM-015: Change Project Status to Completed (All Deliverables Approved)
**Priority:** High
**Feature:** Project Status - Update

**Steps:**
1. Log in as Super Admin
2. Navigate to project with all deliverables approved
3. Click status dropdown
4. Select "Completed"
5. Confirm change

**Expected:**
- ✓ Status updated to "Completed"
- ✓ completed_at timestamp set
- ✓ Status change processed in < 200ms
- ✓ Email sent to all 5 team members
- ✓ Activity logged: "project_status_changed"
- ✓ Project moves to "Completed Projects" filter
- ✓ Project becomes read-only

---

### TC-ADM-016: Change Status with Override (Incomplete Deliverables)
**Priority:** High
**Feature:** Project Status - Override Warning

**Steps:**
1. Log in as Super Admin
2. Navigate to project with 2 unapproved deliverables
3. Change status to "Completed"
4. See warning modal
5. Check "I acknowledge incomplete deliverables"
6. Enter reason: "Client requested early completion"
7. Click "Mark as Completed Anyway"

**Expected:**
- ✓ Warning displayed: "2 deliverables not yet approved"
- ✓ List of incomplete deliverables shown
- ✓ Override requires checkbox + reason
- ✓ Status changed with override flag
- ✓ Activity log notes "Admin Override"
- ✓ Reason stored: "Client requested early completion"

---

### TC-ADM-017: Archive Completed Project
**Priority:** High
**Feature:** Project Status - Archive

**Steps:**
1. Log in as Super Admin
2. Navigate to completed project
3. Change status to "Archived"
4. Type project name to confirm
5. Confirm archival

**Expected:**
- ✓ Status updated to "Archived"
- ✓ archived_at timestamp set
- ✓ Project hidden from main list
- ✓ Email sent to team members
- ✓ Accessible via "View Archived Projects" toggle
- ✓ All data preserved in read-only mode
- ✓ Cannot be modified or reopened

---

### TC-ADM-018: Prevent Invalid Status Transition
**Priority:** High
**Feature:** Project Status - Validation

**Steps:**
1. Log in as Super Admin
2. Navigate to archived project
3. Attempt to change status to "On Hold"

**Expected:**
- ✓ Error message: "Cannot change status from Archived"
- ✓ Status dropdown disabled
- ✓ Message: "Archived projects are read-only"
- ✓ No API call made
- ✓ Status remains "Archived"

---

### TC-ADM-019: Change Status to On Hold
**Priority:** Medium
**Feature:** Project Status - On Hold

**Steps:**
1. Log in as Super Admin
2. Navigate to in-progress project
3. Change status to "On Hold"
4. Enter reason: "Client requested pause"
5. Confirm change

**Expected:**
- ✓ Status updated to "On Hold"
- ✓ Reason stored in activity log
- ✓ Team notified via email
- ✓ Project visible in "On Hold" filter
- ✓ Can resume to "In Progress" later

---

### TC-ADM-020: Resume Project from On Hold
**Priority:** Medium
**Feature:** Project Status - Resume

**Steps:**
1. Log in as Super Admin
2. Navigate to project with status "On Hold"
3. Change status to "In Progress"
4. Confirm change

**Expected:**
- ✓ Status updated to "In Progress"
- ✓ Project moves back to active projects
- ✓ Team notified of resumption
- ✓ All data and tasks still accessible

---

### TC-ADM-021: View Project Status History
**Priority:** Low
**Feature:** Project Status - History

**Steps:**
1. Log in as Super Admin or Project Manager
2. Navigate to project
3. Click "View Status History"

**Expected:**
- ✓ All status changes listed chronologically
- ✓ Each change shows: date, admin, old status, new status, reason
- ✓ Override flags visible
- ✓ Notification count shown
- ✓ History immutable (read-only)

---

### TC-ADM-022: Non-Admin Cannot Change Project Status
**Priority:** High
**Feature:** Project Status - Permissions

**Steps:**
1. Log in as Project Manager (not Super Admin)
2. Navigate to project
3. Attempt to change status

**Expected:**
- ✓ Status dropdown disabled
- ✓ No "Change Status" option visible
- ✓ Error if API called directly: "403 Forbidden"
- ✓ Message: "Only Super Admins can change project status"

---

## 4. Permission Enforcement (5 test cases)

### TC-ADM-023: Super Admin Full Access
**Priority:** High
**Feature:** Permissions - Super Admin

**Steps:**
1. Log in as Super Admin
2. Verify access to all features

**Expected:**
- ✓ Can access User Management
- ✓ Can add/edit/deactivate users
- ✓ Can view all activity logs (all projects)
- ✓ Can change project statuses
- ✓ Can archive projects
- ✓ Can export activity logs

---

### TC-ADM-024: Project Manager Scoped Access
**Priority:** High
**Feature:** Permissions - Project Manager

**Steps:**
1. Log in as Project Manager
2. Attempt to access admin features

**Expected:**
- ✓ Cannot access User Management
- ✓ Can view activity logs for assigned projects only
- ✓ Can export logs for assigned projects
- ✓ Cannot change project statuses
- ✓ Cannot archive projects
- ✓ Error on unauthorized access: "403 Forbidden"

---

### TC-ADM-025: Team Member No Admin Access
**Priority:** High
**Feature:** Permissions - Team Member

**Steps:**
1. Log in as Team Member
2. Attempt to access admin features

**Expected:**
- ✓ No "Admin" menu visible
- ✓ Cannot access User Management
- ✓ Cannot view activity logs
- ✓ Cannot change project statuses
- ✓ 403 error if attempting direct URL access

---

### TC-ADM-026: Client No Admin Access
**Priority:** High
**Feature:** Permissions - Client

**Steps:**
1. Log in as Client
2. Verify no admin access

**Expected:**
- ✓ No admin features visible
- ✓ Cannot view other users
- ✓ Cannot view activity logs
- ✓ Cannot export data
- ✓ Read-only access to assigned project only

---

### TC-ADM-027: Session Invalidation on Deactivation
**Priority:** High
**Feature:** Security - Session Management

**Steps:**
1. User "Mike Johnson" logged in with active session
2. Super Admin deactivates Mike's account
3. Mike attempts to navigate in portal

**Expected:**
- ✓ All Mike's sessions invalidated immediately
- ✓ Mike redirected to login page
- ✓ Error: "Your session is no longer valid"
- ✓ Mike cannot access any pages
- ✓ JWT tokens invalidated in database

---

## 5. Edge Cases and Data Retention (5 test cases)

### TC-ADM-028: View Deactivated User's Historical Activities
**Priority:** Medium
**Feature:** Data Retention - Activity Logs

**Steps:**
1. Log in as Super Admin
2. Deactivate user "Tom Wilson"
3. View activity logs
4. Filter to show Tom's activities

**Expected:**
- ✓ All Tom's activities still visible
- ✓ User name shown as "Tom Wilson (Deactivated)"
- ✓ Avatar grayed out
- ✓ Activity descriptions unchanged
- ✓ Links to tasks/files still work
- ✓ Can filter by Tom's user ID

---

### TC-ADM-029: Deactivated User's Tasks Remain Assigned
**Priority:** High
**Feature:** Data Retention - Tasks

**Steps:**
1. Deactivate user with 10 assigned tasks
2. Navigate to task board
3. View tasks

**Expected:**
- ✓ All 10 tasks still visible
- ✓ Assignee shows: "Tom Wilson (Deactivated)"
- ✓ Tasks can be reassigned to active users
- ✓ Task history preserved
- ✓ Comments by deactivated user still visible

---

### TC-ADM-030: CSV Export Contains Deactivated Users
**Priority:** Low
**Feature:** Data Retention - Export

**Steps:**
1. Export activity logs for project with deactivated users
2. Open CSV file

**Expected:**
- ✓ Deactivated users' activities included
- ✓ User name column shows full name
- ✓ User ID remains constant
- ✓ is_active column shows "false"
- ✓ Complete audit trail maintained

---

### TC-ADM-031: Concurrent Status Changes (Race Condition)
**Priority:** Medium
**Feature:** Data Integrity - Concurrent Updates

**Steps:**
1. Two admins open same project
2. Admin A changes status to "Completed"
3. Simultaneously, Admin B changes status to "On Hold"

**Expected:**
- ✓ Database uses optimistic locking
- ✓ Second admin sees error: "Project was modified by [Admin A]"
- ✓ Suggestion: "Refresh and try again"
- ✓ Only one status change succeeds
- ✓ No data corruption
- ✓ Activity log shows correct sequence

---

### TC-ADM-032: Export Link Expiration (24 Hours)
**Priority:** Low
**Feature:** Security - Export Links

**Steps:**
1. Generate activity log export
2. Note download URL
3. Wait 25 hours
4. Attempt to download from original link

**Expected:**
- ✓ Link expired error: "This download link has expired"
- ✓ 403 Forbidden from R2 storage
- ✓ Message: "Please generate a new export"
- ✓ Expired file removed from R2 storage
- ✓ Security enforced (no access to old exports)

---

## Test Execution Guidelines

### Test Environments

- **Local**: Development with test database
  - Use `localhost:3000`
  - Test data auto-seeded
  - All features enabled

- **Staging**: Pre-production
  - Use `staging.motionify.studio`
  - Separate test database
  - Matches production config

- **Production**: Limited testing
  - Only smoke tests
  - Use dedicated test account
  - Monitor error rates

### Test Data

**User Accounts:**
- `admin.test@motionify.studio` - Super Admin
- `pm.test@motionify.studio` - Project Manager
- `team.test@motionify.studio` - Team Member
- `client.test@motionify.studio` - Client

**Test Projects:**
- "Test Project Alpha" - In Progress
- "Test Project Beta" - Completed
- "Test Project Gamma" - On Hold

**Data Cleanup:**
- Clear test data between runs
- Reset user statuses
- Delete test files from R2
- Truncate activity logs

### Automation

**Unit Tests (Jest/Vitest):**
- All validation logic
- Type guards and utilities
- Status transition functions
- Permission checks

**Integration Tests (Supertest):**
- All API endpoints
- Database operations
- Email sending (mocked)
- Session management

**E2E Tests (Playwright/Cypress):**
- User management workflows
- Activity log viewing/export
- Project status changes
- Permission enforcement

**Test Coverage Goals:**
- Unit tests: > 90%
- Integration tests: > 80%
- E2E tests: Critical paths only

### Regression Testing

Run full test suite after:
- Database schema changes
- API endpoint modifications
- Permission logic updates
- Major feature additions
- Security patches

### Performance Testing

**Load Tests:**
- 100 concurrent users
- Activity log with 100K records
- Multiple simultaneous exports
- Rapid status changes

**Performance Targets:**
- API response: < 200ms (p95)
- Activity log load: < 500ms
- Export generation: < 10s for 10K records
- Status update: < 200ms

### Browser Compatibility

Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

Mobile browsers:
- iOS Safari
- Android Chrome

---

## Test Reporting

**Metrics to Track:**
- Pass rate: Target > 95%
- Execution time: Target < 30 min (full suite)
- Flaky tests: Target < 2%
- Coverage: Target > 85%

**Bug Severity:**
- **Critical**: Blocks feature usage, no workaround
- **High**: Major functionality broken, workaround exists
- **Medium**: Feature degraded but usable
- **Low**: Minor issues, cosmetic problems
