# Manual Testing Guide - Motionify Admin Portal

## Overview

This guide provides comprehensive manual testing procedures for the Motionify admin portal. Since the project uses **Playwright for E2E testing** but has **no unit testing framework**, manual testing is essential for validating functionality that isn't covered by automated tests.

**Project Stack:**
- React + Vite frontend
- Netlify Functions (backend)
- PostgreSQL database
- Playwright E2E tests (6 test files in `./e2e`)

---

## Prerequisites

### Development Environment Setup
```bash
# Start the development server
npm run dev

# Verify server is running at http://localhost:5173
# Login page should be accessible at http://localhost:5173/#/login

# For full-stack testing, start all services
npm run dev:all
```

### Test Accounts
- **Admin Account**: Use "Super Admin" login button (auto-authenticates)
- **Client Accounts**: Created via admin portal or seeded data

---

## Core Testing Areas

### 1. Authentication & Authorization

#### 1.1 Admin Login Flow
**Steps:**
1. Navigate to `http://localhost:5173/#/login`
2. Click "Super Admin" button
3. Verify redirect to dashboard
4. Check URL contains `/#/` or `/#/dashboard`

**Expected Results:**
- ✅ Welcome page displays before login
- ✅ Auto-login works without credentials
- ✅ Dashboard loads with "Dashboard" heading
- ✅ URL changes to dashboard path

#### 1.2 Session Persistence
**Steps:**
1. Login as admin
2. Refresh the browser page
3. Close and reopen browser
4. Navigate to the app

**Expected Results:**
- ✅ Session persists across refresh
- ✅ No re-login required after browser restart
- ✅ User remains authenticated

#### 1.3 Role-Based Access
**Steps:**
1. Login as admin
2. Navigate to different sections (Dashboard, Inquiries, Team, etc.)
3. Attempt actions restricted to admin role

**Expected Results:**
- ✅ Admin can access all admin features
- ✅ Protected routes are not accessible to unauthenticated users
- ✅ Proper error messages for unauthorized access

---

### 2. Dashboard & Navigation

#### 2.1 Dashboard Loading
**Steps:**
1. Login as admin
2. Observe dashboard load time
3. Check all dashboard widgets render

**Expected Results:**
- ✅ Dashboard loads within 3 seconds
- ✅ All widgets display correctly
- ✅ No console errors in DevTools

#### 2.2 Navigation Menu
**Steps:**
1. Access dashboard
2. Click through all navigation links
3. Verify each section loads

**Sections to Test:**
- Dashboard (home)
- Inquiries
- Projects
- Deliverables
- Team/Users
- Proposals
- Settings (if available)

**Expected Results:**
- ✅ All navigation links work
- ✅ URL updates correctly for each section
- ✅ Active tab is highlighted
- ✅ No broken links or 404 errors

---

### 3. Inquiry Management

#### 3.1 View Inquiries List
**Steps:**
1. Navigate to Inquiries section
2. Observe the list of inquiries
3. Check filtering and sorting options

**Expected Results:**
- ✅ Inquiries display in a table or grid
- ✅ Pagination works correctly
- ✅ Filters (by status, date, etc.) function
- ✅ Column sorting works

#### 3.2 Create New Inquiry
**Steps:**
1. Click "Create Inquiry" or "Add" button
2. Fill in required fields
3. Submit the form

**Required Fields to Test:**
- Client name/email
- Project type
- Description
- Budget range
- Timeline

**Expected Results:**
- ✅ Form validates required fields
- ✅ Success notification appears
- ✅ New inquiry appears in list
- ✅ Can navigate to new inquiry detail

#### 3.3 Inquiry Detail View
**Steps:**
1. Click on an inquiry to view details
2. Check all sections render correctly
3. Test action buttons

**Actions to Test:**
- Edit inquiry
- Delete inquiry
- Convert to project
- Create proposal

**Expected Results:**
- ✅ All inquiry details display
- ✅ Edit form pre-fills correctly
- ✅ Delete confirmation appears
- ✅ Actions complete successfully

---

### 4. Proposal Management

#### 4.1 Create Proposal
**Steps:**
1. Navigate to an inquiry or project
2. Click "Create Proposal"
3. Fill in proposal details
4. Add deliverables
5. Set pricing
6. Submit proposal

**Fields to Test:**
- Proposal description
- Deliverables (add/remove/edit)
- Pricing (currency, total, advance percentage)
- Timeline/weeks

**Expected Results:**
- ✅ Form validation works
- ✅ Deliverables can be added dynamically
- ✅ Currency display updates correctly
- ✅ Price calculations are accurate (50% advance)
- ✅ Success message appears with shareable link

#### 4.2 Proposal Link Sharing
**Steps:**
1. Create or view a proposal
2. Find the "Share Link" or "Copy Link" button
3. Copy the link
4. Verify link format

**Expected Results:**
- ✅ Link copied to clipboard
- ✅ Link format: `http://localhost:5174/proposal/[uuid]`
- ✅ Version number displayed if applicable

#### 4.3 Client Proposal Review (Manual Browser Test)
**Steps:**
1. Open a new incognito/private browser window
2. Navigate to the proposal link
3. Review proposal as client would

**Client Actions to Test:**
- View proposal details
- Accept proposal
- Reject proposal
- Request changes
- Currency display (USD and INR conversion 1:83)

**Expected Results:**
- ✅ Client sees proposal without admin login
- ✅ All proposal details display correctly
- ✅ Currency conversion shows USD and INR
- ✅ Action buttons work and provide feedback

---

### 5. Project Management

#### 5.1 Create Project
**Steps:**
1. Navigate to Projects section
2. Click "New Project"
3. Fill in project details
4. Add team members
5. Set project timeline

**Expected Results:**
- ✅ Project creates successfully
- ✅ Team members assigned correctly
- ✅ Timeline set properly
- ✅ Project appears in project list

#### 5.2 Project Workflow
**Steps:**
1. Open an existing project
2. Test project status transitions
3. Add deliverables
4. Track progress

**Status Transitions to Test:**
- New → In Progress
- In Progress → Review
- Review → Approved
- Any status → On Hold

**Expected Results:**
- ✅ Status changes reflect immediately
- ✅ Progress tracking updates
- ✅ Deliverables add correctly
- ✅ Notifications sent (check console logs)

---

### 6. Deliverables & Review

#### 6.1 Deliverable Creation
**Steps:**
1. Navigate to a project
2. Click "Add Deliverable"
3. Fill in deliverable details
4. Upload file (if applicable)
5. Submit

**Expected Results:**
- ✅ Deliverable creates successfully
- ✅ File uploads work
- ✅ Thumbnail/preview displays
- ✅ Deliverable appears in project list

#### 6.2 Video Comment Timeline Feature
**Steps:**
1. Find a rejected video deliverable
2. Click "Review" to open deliverable
3. Click "Request Revision"
4. Test the video comment timeline

**Test Scenarios:**
- View existing comments (amber markers on timeline)
- Add new comment at specific timestamp
- Delete a comment
- Navigate between comments
- Close/open tooltip
- Verify video seeks to correct timestamp

**Expected Results:**
- ✅ Markers appear at comment timestamps
- ✅ Tooltips show comment details
- ✅ New comments add successfully
- ✅ Video seeks accurately
- ✅ Delete removes comment from timeline

**Edge Cases:**
- Long comments (500+ chars)
- Multiple comments close together
- Mobile viewport (375px width)
- Fullscreen mode
- Video loading states

---

### 7. Payment Flow

#### 7.1 Payment Initiation
**Steps:**
1. Client accepts proposal with advance payment
2. Navigate to payment page
3. Verify payment details display

**Expected Results:**
- ✅ Payment page loads correctly
- ✅ Amounts display in USD and INR
- ✅ Advance amount calculated correctly
- ✅ Client can initiate payment

#### 7.2 Payment Processing (Manual Test)
**Steps:**
1. On payment page, enter test payment details
2. Submit payment
3. Verify success/error handling

**Test Cards (Stripe Test Mode):**
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- 3D Secure: 4000 0000 0000 3220

**Expected Results:**
- ✅ Payment succeeds with test card
- ✅ Error handling works for declined cards
- ✅ Success page displays
- ✅ Admin notified (check console)
- ✅ Proposal status updates

---

### 8. Team Management

#### 8.1 View Team Members
**Steps:**
1. Navigate to Team section
2. View list of team members
3. Check roles and permissions

**Expected Results:**
- ✅ All team members display
- ✅ Roles assigned correctly
- ✅ Active/inactive status visible

#### 8.2 Add/Edit Team Member
**Steps:**
1. Click "Add Team Member"
2. Fill in details (name, email, role)
3. Save
4. Edit an existing member

**Expected Results:**
- ✅ New member added successfully
- ✅ Email notification sent (check console)
- ✅ Edit changes save correctly
- ✅ Role permissions update

---

## Testing Checklists

### Pre-Release Checklist

#### Functionality
- [ ] All admin login flows work
- [ ] Session persistence tested
- [ ] All navigation links functional
- [ ] Inquiry CRUD operations complete
- [ ] Proposal creation and sharing works
- [ ] Client proposal acceptance flow tested
- [ ] Project creation and management works
- [ ] Deliverable upload and review tested
- [ ] Video comment timeline feature works
- [ ] Payment flow tested with test cards
- [ ] Team management operations complete

#### Forms & Validation
- [ ] All required field validations work
- [ ] Email format validation
- [ ] Number range validation (prices, dates)
- [ ] Character limits enforced
- [ ] File upload validation

#### Edge Cases
- [ ] Empty states handled gracefully
- [ ] Long text inputs don't break layout
- [ ] Special characters handled correctly
- [ ] Concurrent edits don't cause conflicts
- [ ] Network failures show appropriate errors

#### Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

#### Performance
- [ ] Page load times under 3 seconds
- [ ] No memory leaks on long sessions
- [ ] Smooth animations (no jank)
- [ ] Lazy loading works for images/lists

### Regression Checklist

After any code changes, verify:
- [ ] Login/logout still works
- [ ] Dashboard loads without errors
- [ ] All existing features still function
- [ ] No console errors on key pages
- [ ] API calls still succeed
- [ ] User permissions still enforced
- [ ] Mobile responsive design intact

---

## Bug Reporting Template

When reporting bugs found during manual testing, include:

```markdown
## Bug Report

### Description
Brief description of the issue

### Steps to Reproduce
1. Navigate to [page/section]
2. Click on [element]
3. Perform [action]
4. Observe [result]

### Expected Behavior
What should happen

### Actual Behavior
What actually happens

### Environment
- Browser: [Chrome/Firefox/Safari]
- OS: [macOS/Windows/Linux]
- Screen size: [desktop/mobile/tablet]
- Date: [today's date]

### Screenshots
[Attach screenshots or screen recordings]

### Console Errors
[Any errors from browser DevTools console]

### Severity
- [ ] Critical (blocks entire app)
- [ ] High (blocks major feature)
- [ ] Medium (partial impact)
- [ ] Low (minor inconvenience)
- [ ] Cosmetic (visual issue only)
```

---

## Quick Test Scripts

### Smoke Test (5 minutes)
```bash
# 1. Login test
npm run dev
# Open http://localhost:5173/#/login
# Click "Super Admin" → should see dashboard

# 2. Navigate to Inquiries
# Click "Inquiries" → should see inquiry list

# 3. Quick project check
# Open a project → should load without errors

# 4. Logout/login
# Refresh page → should stay logged in
```

### Full Manual Test Suite (30-45 minutes)
```bash
# Run through ALL sections in this guide
# Track time for each section
# Document any issues found
```

---

## Known Limitations & Areas Needing Manual Testing

Since the project lacks unit tests, these areas require extra manual attention:

1. **Form Validation** - No unit tests for validation logic
2. **State Management** - React Query cache updates need manual verification
3. **Component Interactions** - Cross-component communication not tested
4. **Error Boundaries** - Error handling needs manual testing
5. **Accessibility** - Keyboard navigation and screen readers
6. **Responsive Design** - Mobile/tablet layouts
7. **File Uploads** - Large files, various formats
8. **Real-time Features** - If any (WebSocket/polling)
9. **Third-party Integrations** - Payment, email, storage

---

## Testing Tools & Resources

### Browser DevTools
- **Console**: Check for errors and API logs
- **Network**: Verify API calls and responses
- **Application**: Check localStorage/sessionStorage
- **Elements**: Inspect rendered HTML

### Testing Extensions
- React Developer Tools
- Redux DevTools (if using Redux)
- React Query DevTools

### Performance Testing
- Lighthouse (Chrome DevTools → Lighthouse tab)
- Network throttling (DevTools → Network → presets)

---

## Next Steps

After completing manual testing:

1. **Document Results**: Record pass/fail for each test
2. **Report Bugs**: Use bug reporting template
3. **Update Documentation**: Note any process changes
4. **Automate**: Add E2E tests for frequently tested flows
5. **Plan**: Identify areas needing unit test coverage

---

## Related Documentation

- [TESTING-GUIDE.md](TESTING-GUIDE.md) - Feature-specific testing for video comments
- [PHASE_2_TESTING_GUIDE.md](PHASE_2_TESTING_GUIDE.md) - Proposal acceptance flow testing
- [E2E Tests](e2e/) - Automated test files for reference
- [playwright.config.ts](playwright.config.ts) - Test configuration

---

*Last Updated: January 2025*
*Maintained by: Development Team*
