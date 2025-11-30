# Test Cases: Project Terms & Acceptance

Comprehensive test scenarios for the Project Terms & Acceptance feature. **Total: 22 test cases**.

## Test Case Format

Each test case includes:
- **ID**: Unique identifier (TC-PT-XXX)
- **Feature**: Which component is being tested
- **Scenario**: What we're testing
- **Priority**: High/Medium/Low
- **Steps**: How to execute the test
- **Expected Result**: What should happen

---

## 1. Terms Acceptance Flow (5 test cases)

### TC-PT-001: Client Primary Contact Views Terms on First Login
**Priority:** High
**Feature:** Terms Review Modal

**Steps:**
1. Create project with terms (version 1, status: pending_review)
2. Assign client primary contact to project
3. Log in as client primary contact
4. Navigate to project URL

**Expected:**
- ✓ Blocking terms modal appears immediately
- ✓ Modal displays all term sections (scope, deliverables, timeline, pricing)
- ✓ "Accept Terms" button is disabled until checkbox checked
- ✓ "Request Changes" link is visible
- ✓ Cannot close modal (X button non-functional)
- ✓ Cannot access project content behind modal

---

### TC-PT-002: Client Accepts Terms Successfully
**Priority:** High
**Feature:** Terms Acceptance

**Steps:**
1. Follow TC-PT-001 steps to show terms modal
2. Check "I have read and agree" checkbox
3. Click "Accept Terms" button
4. Confirm in confirmation dialog

**Expected:**
- ✓ Confirmation dialog appears with summary
- ✓ On confirm, API call to `/api/projects/:id/terms/accept` succeeds
- ✓ Success toast: "Terms accepted! You now have full access."
- ✓ Modal closes
- ✓ Project dashboard renders
- ✓ All project features accessible (tasks, files, comments)
- ✓ Database: `project_terms.status` → `accepted`
- ✓ Database: `project_terms.accepted_at` → current timestamp
- ✓ Database: New record in `project_terms_acceptance` table
- ✓ Email sent to Motionify admin: "Terms Accepted"

---

### TC-PT-003: Terms Already Accepted - No Modal Shown
**Priority:** High
**Feature:** Terms Guard

**Steps:**
1. Complete TC-PT-002 (accept terms)
2. Log out
3. Log back in as same client primary contact
4. Navigate to project

**Expected:**
- ✓ No terms modal shown
- ✓ Project dashboard renders immediately
- ✓ Full project access granted

---

### TC-PT-004: Non-Primary Client Tries to Accept Terms
**Priority:** High
**Feature:** Permission Validation

**Steps:**
1. Create project with pending terms
2. Add non-primary client team member to project
3. Log in as non-primary client
4. Navigate to project

**Expected:**
- ✓ Message shown: "Waiting for [Primary Contact Name] to accept project terms"
- ✓ No "Accept Terms" or "Request Changes" buttons
- ✓ Contact info for primary contact displayed
- ✓ No access to project content

---

### TC-PT-005: Accept Terms with Version Mismatch
**Priority:** High
**Feature:** Optimistic Locking

**Steps:**
1. Client opens terms modal (version 1)
2. Keep modal open, don't submit yet
3. In admin panel, update terms (increment to version 2)
4. In client modal (still showing version 1), check checkbox and click "Accept"

**Expected:**
- ✓ API returns 409 Conflict
- ✓ Error message: "Terms have been updated. Please review the latest version."
- ✓ Modal reloads with version 2
- ✓ Highlights what changed
- ✓ Client must review and accept version 2

---

## 2. Change Request Workflow (5 test cases)

### TC-PT-006: Client Requests Changes to Terms
**Priority:** High
**Feature:** Change Request

**Steps:**
1. Follow TC-PT-001 to show terms modal
2. Click "Request Changes" link
3. Fill in "Requested changes": "Extend timeline by 2 weeks"
4. Fill in "Additional context": "Holiday schedule conflict"
5. Click "Submit Request"

**Expected:**
- ✓ API call to `/api/projects/:id/terms/request-revision` succeeds
- ✓ Success message: "Change request submitted. We'll review within 24 hours."
- ✓ Database: New record in `project_terms_revisions` table
- ✓ Database: `project_terms.status` → `revision_requested`
- ✓ Email sent to admin: "Client Requested Term Changes"
- ✓ Client returned to login screen with waiting message
- ✓ Project access still blocked

---

### TC-PT-007: Request Changes with Missing Required Field
**Priority:** Medium
**Feature:** Validation

**Steps:**
1. Follow TC-PT-001 to show terms modal
2. Click "Request Changes"
3. Leave "Requested changes" empty
4. Click "Submit Request"

**Expected:**
- ✓ Frontend validation prevents submission
- ✓ Error message: "Please describe what you'd like to change (minimum 10 characters)"
- ✓ Submit button remains disabled
- ✓ No API call made

---

### TC-PT-008: Admin Views Change Requests
**Priority:** High
**Feature:** Admin Change Request Management

**Steps:**
1. Complete TC-PT-006 (client submits change request)
2. Log in as admin
3. Navigate to project admin panel
4. Click "Manage Terms"

**Expected:**
- ✓ Change requests section shows 1 pending request
- ✓ Request displays: Client name, requested changes, additional context, timestamp
- ✓ "Mark as Resolved" and "Send Message" buttons visible
- ✓ Terms editor shows current terms (version 1)

---

### TC-PT-009: Admin Updates Terms in Response to Request
**Priority:** High
**Feature:** Admin Terms Update

**Steps:**
1. Complete TC-PT-008 (view change request)
2. Edit terms in admin panel (extend timeline by 2 weeks)
3. Add changes summary: "Extended Deliverable 2 timeline as requested"
4. Click "Save Changes"

**Expected:**
- ✓ API call to `/api/projects/:id/terms` succeeds
- ✓ Database: `project_terms.version` → 2
- ✓ Database: `project_terms.status` → `pending_review`
- ✓ Database: `project_terms.accepted_at` → null (invalidated)
- ✓ Database: `project_terms.changes_summary` → "Extended Deliverable 2..."
- ✓ Email sent to client: "Terms Updated - Re-acceptance Required"
- ✓ Success message: "Terms updated. Client notified."

---

### TC-PT-010: Client Re-reviews Updated Terms
**Priority:** High
**Feature:** Re-acceptance Flow

**Steps:**
1. Complete TC-PT-009 (admin updates terms)
2. Client receives email notification
3. Client logs in
4. Navigate to project

**Expected:**
- ✓ Terms modal appears with "UPDATED PROJECT TERMS" header
- ✓ "What Changed" section highlights modifications
- ✓ Full updated terms shown below (version 2)
- ✓ Checkbox text includes "version 2"
- ✓ Client can accept or request more changes
- ✓ On accept, project access granted

---

## 3. Admin Updates & Versioning (5 test cases)

### TC-PT-011: Admin Creates Initial Terms for New Project
**Priority:** High
**Feature:** Terms Creation

**Steps:**
1. Create new project
2. Log in as admin
3. Navigate to project admin panel
4. Click "Manage Terms"
5. Fill in all terms fields (scope, deliverables, pricing, etc.)
6. Click "Save"

**Expected:**
- ✓ Database: New record in `project_terms` table
- ✓ Version set to 1
- ✓ Status set to `pending_review`
- ✓ `accepted_at` is null
- ✓ All content stored in JSONB `content` field
- ✓ Success message: "Terms created successfully"

---

### TC-PT-012: Admin Updates Terms Multiple Times
**Priority:** Medium
**Feature:** Version Incrementing

**Steps:**
1. Complete TC-PT-011 (create initial terms)
2. Update terms (change scope)
3. Save (version should be 2)
4. Update terms again (change pricing)
5. Save (version should be 3)

**Expected:**
- ✓ Version increments correctly: 1 → 2 → 3
- ✓ Each update creates new `changes_summary`
- ✓ Status resets to `pending_review` after each update
- ✓ `accepted_at` cleared on each update
- ✓ Client notified after each update

---

### TC-PT-013: View Version History
**Priority:** Low
**Feature:** Version History

**Steps:**
1. Complete TC-PT-012 (multiple version updates)
2. In admin panel, scroll to "Version History" section

**Expected:**
- ✓ All 3 versions listed in reverse chronological order
- ✓ Each version shows: Version number, created date, created by, status
- ✓ "View Version" button for each historical version
- ✓ Current version marked as "Current"

---

### TC-PT-014: Admin Marks Revision Request as Resolved
**Priority:** Medium
**Feature:** Revision Resolution

**Steps:**
1. Complete TC-PT-009 (admin updates terms in response to request)
2. Navigate to change requests section
3. Click "Mark as Resolved" on the change request
4. Add admin response: "We've updated the timeline as requested"

**Expected:**
- ✓ API call to `/api/projects/:id/terms/revisions/:id` succeeds
- ✓ Database: `project_terms_revisions.status` → `addressed`
- ✓ Database: `project_terms_revisions.resolved` → true
- ✓ Database: `project_terms_revisions.admin_response` saved
- ✓ Database: `project_terms_revisions.responded_at` → current timestamp
- ✓ Email sent to client with admin response (optional)

---

### TC-PT-015: Admin Cannot Update Terms Without Permission
**Priority:** High
**Feature:** Authorization

**Steps:**
1. Create project with terms
2. Log in as non-admin user (e.g., client or project_manager without super_admin role)
3. Attempt to access `/admin/projects/:id/terms` URL directly

**Expected:**
- ✓ 403 Forbidden error
- ✓ Redirect to unauthorized page
- ✓ Error message: "You do not have permission to manage terms"
- ✓ No access to terms editor

---

## 4. Access Control & Blocking (5 test cases)

### TC-PT-016: Project Access Blocked Until Terms Accepted
**Priority:** High
**Feature:** Access Guard

**Steps:**
1. Create project with pending terms
2. Log in as client primary contact
3. Attempt to access project routes:
   - `/projects/:id`
   - `/projects/:id/tasks`
   - `/projects/:id/files`

**Expected:**
- ✓ All routes show blocking terms modal
- ✓ Cannot access any project content
- ✓ API calls to project endpoints return 403 or redirect
- ✓ Browser back button doesn't bypass modal

---

### TC-PT-017: Non-Primary Client Team Member Access
**Priority:** High
**Feature:** Team Member Guard

**Steps:**
1. Create project with pending terms
2. Add non-primary client team member
3. Log in as non-primary client
4. Navigate to project

**Expected:**
- ✓ Informational message: "Waiting for [Primary Contact] to accept terms"
- ✓ Primary contact name and email shown
- ✓ No access to project content
- ✓ No ability to accept or request changes
- ✓ Clear instruction to contact primary contact

---

### TC-PT-018: Access Granted After Acceptance
**Priority:** High
**Feature:** Access Unlock

**Steps:**
1. Create project with pending terms
2. Client primary contact accepts terms
3. Non-primary client team member logs in
4. Navigate to project

**Expected:**
- ✓ No blocking modal or message
- ✓ Full project access granted to all team members
- ✓ Tasks, files, comments all accessible
- ✓ Normal project workflow enabled

---

### TC-PT-019: Motionify Team Member Bypasses Terms
**Priority:** Medium
**Feature:** Internal User Access

**Steps:**
1. Create project with pending terms (not accepted by client)
2. Log in as Motionify PM or admin
3. Navigate to project

**Expected:**
- ✓ No terms modal shown
- ✓ Full project access (Motionify team doesn't need client approval)
- ✓ Can view all project content
- ✓ Can manage project settings

---

### TC-PT-020: Session Timeout During Terms Review
**Priority:** Medium
**Feature:** Session Management

**Steps:**
1. Client opens terms modal
2. Read terms for 20 minutes (JWT expires after 15 min)
3. Check checkbox and click "Accept Terms"

**Expected:**
- ✓ API returns 401 Unauthorized
- ✓ Frontend catches error
- ✓ Prompt to log in again (magic link or re-auth)
- ✓ After re-auth, terms modal shows again
- ✓ Client can continue acceptance

---

## 5. Edge Cases (2 test cases)

### TC-PT-021: Concurrent Term Acceptance Attempts
**Priority:** Low
**Feature:** Race Condition Handling

**Steps:**
1. Open project in two browser windows as client primary contact
2. In both windows, navigate to project (both show terms modal)
3. In Window 1, accept terms
4. In Window 2, also click accept terms

**Expected:**
- ✓ Window 1 accepts successfully
- ✓ Window 2 receives 400 Bad Request: "Terms already accepted"
- ✓ Window 2 shows message: "Terms already accepted"
- ✓ Window 2 refreshes to show project dashboard
- ✓ Only one acceptance record in database

---

### TC-PT-022: Terms Updated While Client Has Modal Open
**Priority:** Medium
**Feature:** Stale Data Handling

**Steps:**
1. Client opens terms modal (version 1)
2. Admin updates terms (version 2) while client is reading
3. Client checks checkbox and clicks "Accept Terms"

**Expected:**
- ✓ API checks version on submission
- ✓ Returns 409 Conflict: "Terms have been updated"
- ✓ Frontend reloads modal with version 2
- ✓ Highlights changes at top
- ✓ Client must review new version
- ✓ Old acceptance attempt discarded

---

## Test Execution Guidelines

### Test Environments

- **Local**: Development with test database and Mailtrap email testing
- **Staging**: Pre-production with real database and SES sandbox
- **Production**: Limited smoke testing only (critical paths)

### Test Data

- Use `@test.motionify.studio` emails for all test users
- Create test projects with "TEST-" prefix
- Clear test data after each test run
- Use consistent UUIDs for repeatability

### Automation Strategy

**Unit Tests** (100% coverage target):
- Validation functions (Zod schemas)
- Permission checks (`can_accept_terms`, `isProjectPrimaryContact`)
- Version increment logic
- Email template variable substitution

**Integration Tests** (All API endpoints):
- GET `/api/projects/:id/terms`
- POST `/api/projects/:id/terms/accept`
- POST `/api/projects/:id/terms/request-revision`
- PATCH `/api/projects/:id/terms`
- GET `/api/projects/:id/terms/revisions`
- PATCH `/api/projects/:id/terms/revisions/:id`

**E2E Tests** (Critical user flows):
- TC-PT-001 through TC-PT-005 (acceptance flow)
- TC-PT-006, TC-PT-009, TC-PT-010 (change request flow)
- TC-PT-016, TC-PT-017, TC-PT-018 (access control)

### Regression Testing

Run full test suite after:
- Database schema changes
- API endpoint modifications
- Terms modal UI updates
- Email template changes
- Permission logic changes

### Performance Testing

Test scalability:
- 100 concurrent clients viewing terms
- 50 concurrent acceptance submissions
- Large terms content (10,000+ words)
- Terms with 50 deliverables (max)
- Projects with 100+ historical versions

### Browser Compatibility

Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

### Accessibility Testing

- Keyboard navigation (no mouse)
- Screen reader compatibility (NVDA, JAWS)
- High contrast mode
- Zoom to 200%
- Focus indicators visible

---

## Bug Reporting Template

When a test fails, report using this template:

```
**Test Case:** TC-PT-XXX
**Priority:** High/Medium/Low
**Environment:** Local/Staging/Production
**Browser:** Chrome 120.0
**OS:** macOS 14.0

**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected Result:**
What should happen

**Actual Result:**
What actually happened

**Screenshots:**
[Attach screenshots]

**Logs:**
[Console errors, API responses]

**Impact:**
Blocker / Feature broken / UI glitch

**Suggested Fix:**
[Optional: If you have ideas]
```

---

## Test Coverage Summary

| Feature Area | Test Cases | Priority High | Priority Medium | Priority Low |
|--------------|------------|---------------|-----------------|--------------|
| Terms Acceptance | 5 | 4 | 0 | 1 |
| Change Requests | 5 | 3 | 2 | 0 |
| Admin Management | 5 | 2 | 2 | 1 |
| Access Control | 5 | 4 | 1 | 0 |
| Edge Cases | 2 | 0 | 2 | 0 |
| **TOTAL** | **22** | **13** | **7** | **2** |

---

## Test Execution Checklist

Before release:
- [ ] All 22 test cases executed
- [ ] All high priority tests pass (13/13)
- [ ] Unit tests: 100% coverage
- [ ] Integration tests: All endpoints pass
- [ ] E2E tests: Critical flows pass
- [ ] Email templates tested in Mailtrap
- [ ] Database migrations run successfully
- [ ] Staging deployment smoke tested
- [ ] Browser compatibility verified
- [ ] Accessibility audit passed
- [ ] Performance benchmarks met
- [ ] Security review completed
