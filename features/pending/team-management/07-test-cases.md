# Test Cases: Team Management

Comprehensive test scenarios for Team Management (US-021, US-022). Total: 38 test cases.

## Test Case Format

Each test case includes:
- **ID**: Unique identifier (TC-TM-###)
- **Feature**: Component being tested
- **Priority**: High/Medium/Low
- **Steps**: Execution steps
- **Expected Result**: Expected outcome

---

## 1. Invitation Creation (8 test cases)

### TC-TM-001: Create Valid Invitation
**Priority:** High
**Feature:** Invitation Creation

**Steps:**
1. Sign in as primary contact
2. Navigate to project team page
3. Click "Invite Team Member"
4. Enter valid email: `colleague@example.com`
5. Add personal message: "Join our project!"
6. Click "Send Invitation"

**Expected:**
- ✓ Invitation created with status 'pending'
- ✓ Token generated (64-char hex)
- ✓ Expiry set to 7 days from now
- ✓ Email sent to colleague@example.com
- ✓ Success toast displayed
- ✓ Invitation appears in pending list

---

### TC-TM-002: Prevent Duplicate Invitation
**Priority:** High
**Feature:** Invitation Creation

**Steps:**
1. Sign in as primary contact
2. Send invitation to `david@example.com`
3. Try to send another invitation to `david@example.com`

**Expected:**
- ✓ Error message: "A pending invitation already exists"
- ✓ Second invitation blocked
- ✓ Only one invitation in database

---

### TC-TM-003: Prevent Inviting Existing Team Member
**Priority:** High
**Feature:** Invitation Creation

**Steps:**
1. Sign in as primary contact
2. Try to invite email of existing team member

**Expected:**
- ✓ Error: "User is already a member of this project"
- ✓ Invitation blocked
- ✓ No invitation created

---

### TC-TM-004: Invitation Without Permission
**Priority:** High
**Feature:** Permission Check

**Steps:**
1. Sign in as regular client team member (not primary contact)
2. Try to access "Invite Team Member" button

**Expected:**
- ✓ Button hidden or disabled
- ✓ API call returns 403 Forbidden
- ✓ Error: "You don't have permission to invite members"

---

### TC-TM-005: Validate Email Format
**Priority:** Medium
**Feature:** Form Validation

**Steps:**
1. Sign in as primary contact
2. Open invite modal
3. Enter invalid email: `not-an-email`
4. Try to submit

**Expected:**
- ✓ Inline error: "Please enter a valid email address"
- ✓ Submit button disabled
- ✓ No API call made

---

### TC-TM-006: Personal Message Character Limit
**Priority:** Low
**Feature:** Form Validation

**Steps:**
1. Open invite modal
2. Enter personal message >500 characters
3. Try to submit

**Expected:**
- ✓ Error: "Message must be 500 characters or less"
- ✓ Character count shown
- ✓ Submit blocked

---

### TC-TM-007: Multiple Simultaneous Invitations
**Priority:** Medium
**Feature:** Invitation Creation

**Steps:**
1. Send invitation to email1@example.com
2. Immediately send invitation to email2@example.com
3. Send invitation to email3@example.com

**Expected:**
- ✓ All 3 invitations created successfully
- ✓ Unique tokens for each
- ✓ All 3 emails sent
- ✓ All appear in pending list

---

### TC-TM-008: Invitation Rate Limiting
**Priority:** Medium
**Feature:** Rate Limiting

**Steps:**
1. Send 11 invitations rapidly (exceeds 10/hour limit)

**Expected:**
- ✓ First 10 succeed
- ✓ 11th returns error: "Rate limit exceeded"
- ✓ Headers show rate limit info

---

## 2. Invitation Acceptance (10 test cases)

### TC-TM-009: Accept Valid Invitation (New User)
**Priority:** High
**Feature:** Invitation Acceptance

**Steps:**
1. Receive invitation email
2. Click acceptance link
3. Create account with name and password
4. Submit

**Expected:**
- ✓ Account created
- ✓ Team member record created
- ✓ Invitation status → 'accepted'
- ✓ Redirected to project dashboard
- ✓ Welcome email sent
- ✓ Primary contact notified

---

### TC-TM-010: Accept Valid Invitation (Existing User)
**Priority:** High
**Feature:** Invitation Acceptance

**Steps:**
1. Receive invitation email
2. Click acceptance link
3. Sign in with existing account
4. Confirm acceptance

**Expected:**
- ✓ User authenticated
- ✓ Team member record created
- ✓ Invitation status → 'accepted'
- ✓ Redirected to project
- ✓ Notifications sent

---

### TC-TM-011: Expired Invitation
**Priority:** High
**Feature:** Invitation Expiry

**Steps:**
1. Create invitation
2. Wait 8 days (or set expires_at to past)
3. Try to accept invitation

**Expected:**
- ✓ Error page: "This invitation has expired"
- ✓ Acceptance blocked
- ✓ Invitation status: 'expired'
- ✓ Option to request new invitation

---

### TC-TM-012: Revoked Invitation
**Priority:** High
**Feature:** Invitation Revocation

**Steps:**
1. Primary contact sends invitation
2. Primary contact revokes invitation
3. Invitee tries to accept link

**Expected:**
- ✓ Error: "This invitation has been revoked"
- ✓ Acceptance blocked
- ✓ Invitation status: 'revoked'

---

### TC-TM-013: Already Accepted Invitation
**Priority:** Medium
**Feature:** Duplicate Acceptance Prevention

**Steps:**
1. Accept invitation successfully
2. Try to use same link again

**Expected:**
- ✓ Message: "You're already a member of this project"
- ✓ Redirected to project dashboard
- ✓ No duplicate team member created

---

### TC-TM-014: Email Mismatch
**Priority:** High
**Feature:** Email Validation

**Steps:**
1. Invitation sent to alice@example.com
2. User signs in as bob@example.com
3. Tries to accept invitation

**Expected:**
- ✓ Error: "This invitation was sent to a different email"
- ✓ Acceptance blocked
- ✓ Show correct email address

---

### TC-TM-015: Invalid Token
**Priority:** Medium
**Feature:** Security

**Steps:**
1. Navigate to `/invitations/accept?token=invalidtoken123`

**Expected:**
- ✓ 404 or error page
- ✓ Message: "Invalid invitation link"
- ✓ No database changes

---

### TC-TM-016: Token Length Validation
**Priority:** Low
**Feature:** Security

**Steps:**
1. Try token with wrong length (not 64 chars)

**Expected:**
- ✓ Error: "Invalid token format"
- ✓ Blocked before database query

---

### TC-TM-017: Verify Invitation (Public API)
**Priority:** High
**Feature:** Invitation Verification

**Steps:**
1. Call `GET /api/invitations/verify?token={valid_token}`

**Expected:**
- ✓ Returns: valid=true, email, projectName, inviterName
- ✓ No authentication required
- ✓ Doesn't mark as accepted

---

### TC-TM-018: Concurrent Invitation Acceptance
**Priority:** Low
**Feature:** Race Condition

**Steps:**
1. Two users try to accept same invitation simultaneously
2. Both submit at exact same time

**Expected:**
- ✓ Only first request succeeds
- ✓ Second gets error: "Already accepted"
- ✓ Only one team member created
- ✓ Database constraint prevents duplicate

---

## 3. Team Member Removal (10 test cases)

### TC-TM-019: Remove Team Member Successfully
**Priority:** High
**Feature:** Team Member Removal

**Steps:**
1. Sign in as primary contact
2. Navigate to team page
3. Click "Remove" on team member
4. Confirm removal in dialog

**Expected:**
- ✓ removed_at timestamp set
- ✓ removed_by set to current user
- ✓ Member no longer in active list
- ✓ Email sent to removed member
- ✓ Email sent to primary contact
- ✓ Activity logged

---

### TC-TM-020: Prevent Self-Removal
**Priority:** High
**Feature:** Permission Validation

**Steps:**
1. Sign in as team member
2. Try to remove yourself

**Expected:**
- ✓ Error: "Cannot remove yourself"
- ✓ Removal blocked
- ✓ No changes to database

---

### TC-TM-021: Prevent Primary Contact Removal
**Priority:** High
**Feature:** Permission Validation

**Steps:**
1. Sign in as PM
2. Try to remove primary contact

**Expected:**
- ✓ Error: "Cannot remove primary contact"
- ✓ Removal blocked
- ✓ Message: "Transfer ownership first"

---

### TC-TM-022: Prevent Last PM Removal
**Priority:** High
**Feature:** Permission Validation

**Steps:**
1. Project has only 1 project manager
2. Try to remove that PM

**Expected:**
- ✓ Error: "Cannot remove last project manager"
- ✓ Removal blocked
- ✓ Database validation prevents

---

### TC-TM-023: Data Retention After Removal
**Priority:** High
**Feature:** Soft Delete

**Steps:**
1. Remove team member who has:
   - 5 tasks assigned
   - 12 comments
   - 3 files uploaded
2. Check data persistence

**Expected:**
- ✓ Tasks still assigned (show "removed" status)
- ✓ Comments still visible
- ✓ Files still accessible
- ✓ Activity log preserved
- ✓ removed_at timestamp set

---

### TC-TM-024: Access Revocation After Removal
**Priority:** High
**Feature:** Access Control

**Steps:**
1. Remove team member
2. Removed member tries to:
   - View project
   - Upload file
   - Comment on task

**Expected:**
- ✓ All actions return 403 Forbidden
- ✓ No access to project
- ✓ Immediate revocation

---

### TC-TM-025: Re-Invite Removed Member
**Priority:** Medium
**Feature:** Re-Invitation

**Steps:**
1. Remove team member
2. Send new invitation to same email
3. Member accepts

**Expected:**
- ✓ New invitation created successfully
- ✓ New team member record created
- ✓ Old removed record preserved
- ✓ Member regains access

---

### TC-TM-026: Removal Without Permission
**Priority:** High
**Feature:** Authorization

**Steps:**
1. Sign in as regular client (not PM/primary)
2. Try to remove another team member

**Expected:**
- ✓ Remove button hidden
- ✓ API returns 403 Forbidden
- ✓ Removal blocked

---

### TC-TM-027: Bulk Removal
**Priority:** Low
**Feature:** Multiple Removal (Future)

**Steps:**
1. Select 3 team members
2. Click "Remove Selected"
3. Confirm

**Expected:**
- ✓ All 3 removed successfully
- ✓ All get removed_at timestamp
- ✓ All receive emails
- ✓ Single activity log entry

---

### TC-TM-028: Cleanup Old Removed Members (90 days)
**Priority:** Medium
**Feature:** Data Retention

**Steps:**
1. Create removed member with removed_at = 91 days ago
2. Run cleanup job: `SELECT cleanup_removed_team_members()`

**Expected:**
- ✓ Record deleted from database
- ✓ Contributions still visible (attributed to "[Removed User]")
- ✓ Cleanup count returned

---

## 4. Invitation Management (5 test cases)

### TC-TM-029: Resend Invitation
**Priority:** High
**Feature:** Invitation Resend

**Steps:**
1. Sign in as primary contact
2. Navigate to pending invitations
3. Click "Resend" on invitation

**Expected:**
- ✓ New token generated
- ✓ Expiry reset to 7 days from now
- ✓ Email sent to invitee
- ✓ resent_count incremented
- ✓ resent_at timestamp updated

---

### TC-TM-030: Resend Rate Limit
**Priority:** Medium
**Feature:** Rate Limiting

**Steps:**
1. Resend invitation 3 times within 1 hour
2. Try to resend 4th time

**Expected:**
- ✓ First 3 succeed
- ✓ 4th returns error: "Too many resend attempts"
- ✓ Must wait 1 hour

---

### TC-TM-031: Revoke Pending Invitation
**Priority:** High
**Feature:** Invitation Revocation

**Steps:**
1. Sign in as primary contact
2. Click "Revoke" on pending invitation
3. Confirm

**Expected:**
- ✓ Invitation status → 'revoked'
- ✓ revoked_at timestamp set
- ✓ Removed from pending list
- ✓ Token becomes invalid

---

### TC-TM-032: Mark Expired Invitations (Scheduled Job)
**Priority:** Medium
**Feature:** Auto-Expiration

**Steps:**
1. Create invitations with expires_at in past
2. Run: `SELECT mark_expired_invitations()`

**Expected:**
- ✓ Status changed to 'expired'
- ✓ Count returned (number marked expired)
- ✓ Primary contact notified (optional)

---

### TC-TM-033: Cleanup Expired Invitations (90 days)
**Priority:** Medium
**Feature:** Data Cleanup

**Steps:**
1. Create expired invitation (expired 91 days ago)
2. Run: `SELECT cleanup_expired_invitations()`

**Expected:**
- ✓ Expired invitations deleted
- ✓ Count returned
- ✓ Active invitations preserved

---

## 5. Edge Cases & Error Handling (5 test cases)

### TC-TM-034: Network Failure During Invitation Send
**Priority:** Medium
**Feature:** Error Handling

**Steps:**
1. Create invitation
2. Email service (SES) fails
3. Check error handling

**Expected:**
- ✓ Error logged to database
- ✓ Retry attempted (3 times)
- ✓ User notified of failure
- ✓ Invitation remains in "sending" state

---

### TC-TM-035: Database Transaction Rollback
**Priority:** High
**Feature:** Data Integrity

**Steps:**
1. Accept invitation
2. Simulate database failure after team member created but before invitation marked accepted

**Expected:**
- ✓ Transaction rolled back
- ✓ No partial data
- ✓ User can retry acceptance

---

### TC-TM-036: Invitation Link in Different Browser
**Priority:** Medium
**Feature:** Cross-Device

**Steps:**
1. Receive invitation on mobile
2. Click link on desktop
3. Complete acceptance

**Expected:**
- ✓ Token works across devices
- ✓ Account created/signed in
- ✓ Access granted

---

### TC-TM-037: Unicode Characters in Personal Message
**Priority:** Low
**Feature:** Internationalization

**Steps:**
1. Create invitation with message: "欢迎! Bienvenido! 🎉"
2. Send invitation

**Expected:**
- ✓ Message saved correctly
- ✓ Email displays unicode properly
- ✓ No encoding issues

---

### TC-TM-038: SQL Injection Prevention
**Priority:** High
**Feature:** Security

**Steps:**
1. Try email: `test@example.com'; DROP TABLE project_invitations; --`
2. Submit invitation

**Expected:**
- ✓ Input sanitized
- ✓ No SQL executed
- ✓ Validation error or safe storage

---

## Test Coverage Summary

### By Priority
- **High Priority:** 24 test cases (63%)
- **Medium Priority:** 11 test cases (29%)
- **Low Priority:** 3 test cases (8%)

### By Feature Area
- **Invitation Creation:** 8 test cases
- **Invitation Acceptance:** 10 test cases
- **Team Member Removal:** 10 test cases
- **Invitation Management:** 5 test cases
- **Edge Cases & Security:** 5 test cases

### Automated vs Manual
- **Automated (API):** 30 test cases
- **Manual (UI):** 8 test cases

---

## Test Execution Checklist

### Prerequisites
- [ ] Development database seeded with test data
- [ ] Email service configured (use Mailtrap for dev)
- [ ] Test users created (primary contact, PM, regular client)
- [ ] Test projects created

### Test Data Setup
```sql
-- Create test project
INSERT INTO projects (id, name) VALUES ('test_proj_1', 'Test Project');

-- Create test users
INSERT INTO users (id, email, name) VALUES
  ('user_1', 'primary@test.com', 'Primary Contact'),
  ('user_2', 'pm@test.com', 'Project Manager'),
  ('user_3', 'client@test.com', 'Client Member');

-- Create test team
INSERT INTO project_team (user_id, project_id, role, is_primary_contact) VALUES
  ('user_1', 'test_proj_1', 'client', true),
  ('user_2', 'test_proj_1', 'project_manager', false);
```

### Regression Testing
Run after any changes to:
- Invitation creation/acceptance logic
- Team member removal logic
- Permission checks
- Database schema changes

### Performance Testing
- **Load:** 100 concurrent invitation creations
- **Stress:** 1000 invitations in 1 minute
- **Volume:** Database with 10,000 invitations

---

## Bug Reporting Template

```markdown
**Test Case ID:** TC-TM-XXX
**Environment:** Development/Staging/Production
**Browser/Device:** Chrome 120 / iPhone 15

**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshots:**
[Attach if applicable]

**Logs:**
[Relevant error messages]

**Severity:** Critical/High/Medium/Low
```

## Automation Strategy

### Priority for Automation
1. **High Priority (24 tests)**: Invitation flow, removal logic, and permissions. Automate with API tests.
2. **Medium Priority (11 tests)**: Validation and edge cases.
3. **Low Priority (3 tests)**: Manual UI testing.

### Recommended Tools
- **API Tests**: Jest + Supertest for invitation/removal endpoints.
- **E2E Tests**: Playwright for invitation acceptance flow (email link -> registration).
