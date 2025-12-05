# Permission System Test Guide

This guide explains how to test the 5-role permission system using the interactive test page.

## Quick Start

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to the test page:**
   ```
   http://localhost:5173/#/test/permissions
   ```

3. **Switch between roles** using the role selector at the top
4. **Select different deliverables** with various statuses
5. **Observe permission changes** in the permission matrix

---

## Test Page Features

### 1. Role Switcher
Switch between 5 different user roles to test permissions:

- **Super Admin** - Full system access
- **Motionify Support** - Manages projects, uploads final files
- **Team Member** - Uploads beta files to assigned tasks only
- **Client Primary Contact** - Approves deliverables, requests revisions
- **Client Team Member** - View-only access, limited visibility

### 2. Deliverable Status Showcase
8 test deliverables covering all workflow statuses:

| Deliverable | Status | Test Scenario |
|------------|--------|---------------|
| Intro Animation | `pending` | Hidden from clients, team can work |
| Product Demo | `in_progress` | Hidden from clients, team uploads |
| Brand Story | `beta_ready` | Clients can view, cannot approve yet |
| Customer Testimonial | `awaiting_approval` | Client PM can approve/reject |
| Social Media Clips | `approved` | Awaiting payment |
| Explainer Video | `rejected` | Team can re-upload |
| Tutorial Series | `payment_pending` | Payment required for final files |
| Corporate Presentation | `final_delivered` | Files downloadable, 365-day expiry |

### 3. Permission Matrix
Real-time permission display showing:
- ✅ **Green** - Permission granted
- ❌ **Red** - Permission denied (with reason)

### 4. Permission Denial Reasons
Hover over denied permissions to see user-friendly explanations:
- "Only the Primary Contact can approve deliverables"
- "Deliverable is not yet ready for client review"
- "Payment required to access final files"
- "You can only upload to tasks you are assigned to"

---

## Test Scenarios

### Scenario 1: Client Primary Contact Approval Flow

**Goal:** Test the approval workflow from the client's perspective

**Steps:**
1. Select role: **Client Primary Contact (Alex)**
2. Select deliverable: **Customer Testimonial** (awaiting_approval)
3. Verify permissions:
   - ✅ Can view deliverable
   - ✅ Can approve deliverable
   - ✅ Can request revisions
   - ✅ Can view approval history
   - ❌ Cannot upload files
   - ❌ Cannot edit deliverable

**Expected Result:**
Client PM should be able to approve or reject, but not upload or edit.

---

### Scenario 2: Client Team Member Restrictions

**Goal:** Verify Client Team Members have limited access

**Steps:**
1. Select role: **Client Team Member (Bob)**
2. Select deliverable: **Brand Story** (beta_ready)
3. Verify permissions:
   - ✅ Can view deliverable (beta_ready or later)
   - ✅ Can comment
   - ❌ Cannot approve
   - ❌ Cannot request revisions
   - ❌ Cannot view approval history
   - ❌ Cannot upload files

4. Select deliverable: **Intro Animation** (pending)
5. Verify:
   - ❌ Cannot view (deliverable hidden)
   - Eye icon should show "EyeOff"

**Expected Result:**
Client Team Members can only view beta-ready+ deliverables and comment. No approval or upload permissions.

---

### Scenario 3: Team Member Task Assignment

**Goal:** Test team member upload restrictions

**Steps:**
1. Select role: **Team Member (Sarah)**
2. Check permission: **Upload Beta Files**
3. Verify:
   - ❌ Shows "You can only upload to tasks you are assigned to"

**Expected Result:**
Team members should see they need task assignment to upload.

---

### Scenario 4: Admin vs PM Permissions

**Goal:** Compare Admin and Motionify Support access levels

**Steps:**
1. Select role: **Super Admin**
2. Select deliverable: **Corporate Presentation** (final_delivered)
3. Note permissions (should have full access)

4. Switch role: **Motionify Support**
5. Verify differences:
   - Admin: Can delete deliverables ✅
   - PM: Cannot delete deliverables ❌

**Expected Result:**
Both should have most permissions, but only Admin can delete.

---

### Scenario 5: Payment-Gated Final Files

**Goal:** Test final file access restrictions

**Steps:**
1. Select role: **Client Primary Contact**
2. Select deliverable: **Tutorial Series** (payment_pending)
3. Check permission: **Access Final Files**
4. Verify:
   - ❌ Denied with reason: "Payment required to access final files"

5. Select deliverable: **Corporate Presentation** (final_delivered)
6. Check permission: **Access Final Files**
7. Verify:
   - ✅ Granted (payment completed)

**Expected Result:**
Final files only accessible after payment.

---

### Scenario 6: Deliverable Locked During Approval

**Goal:** Test that deliverables are locked during approval

**Steps:**
1. Select role: **Motionify Support**
2. Select deliverable: **Customer Testimonial** (awaiting_approval)
3. Check permission: **Edit Deliverable**
4. Verify:
   - ❌ Denied with reason: "Deliverable is locked during approval"

5. Select deliverable: **Brand Story** (beta_ready)
6. Check permission: **Edit Deliverable**
7. Verify:
   - ✅ Granted (not locked)

**Expected Result:**
Team cannot edit deliverables in `awaiting_approval` status.

---

### Scenario 7: State-Based Visibility

**Goal:** Verify clients cannot see pending/in_progress deliverables

**Steps:**
1. Select role: **Client Primary Contact**
2. Count visible deliverables (should see 6/8)
3. Verify hidden deliverables:
   - ❌ Intro Animation (pending)
   - ❌ Product Demo (in_progress)

4. Switch role: **Motionify Support**
5. Count visible deliverables (should see 8/8)

**Expected Result:**
Clients see 6/8, team sees all 8.

---

### Scenario 8: File Expiry (365 Days)

**Goal:** Test 365-day expiry enforcement

**Steps:**
1. Select role: **Client Primary Contact**
2. Select deliverable: **Corporate Presentation** (final_delivered)
3. Check deliverable details:
   - Delivered At: 2025-01-20
   - Expires At: 2026-01-20
   - Days Remaining: ~365 days

4. Note: After expiry, only Admin can access

**Expected Result:**
Files expire 365 days after delivery. Only Admin can access expired files.

---

## Permission Matrix Reference

Use this matrix to verify expected permissions for each role:

| Permission | Admin | PM | Team | Client PM | Client Team |
|-----------|-------|----|----- |-----------|-------------|
| View deliverable* | ✅ | ✅ | ✅ | ✅** | ✅** |
| Upload beta files | ✅ | ✅ | ✅† | ❌ | ❌ |
| Upload final files | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve deliverable | ❌ | ❌ | ❌ | ✅‡ | ❌ |
| Request revisions | ❌ | ❌ | ❌ | ✅‡ | ❌ |
| View approval history | ✅ | ✅ | ✅ | ✅ | ❌ |
| Access final files | ✅ | ✅ | ✅ | ✅§ | ✅§ |
| Edit deliverable | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create deliverable | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete deliverable | ✅ | ❌ | ❌ | ❌ | ❌ |
| Comment | ✅ | ✅ | ✅ | ✅ | ✅** |

**Conditions:**
- *Depends on project status (Draft, Archived)
- **Only when deliverable status is `beta_ready` or later
- †Only to tasks they're assigned to
- ‡Only when deliverable status is `awaiting_approval`
- §Only after 50% balance payment received

---

## Verifying Permission Logic

### Helper Functions Tested

The test page uses these functions from `utils/deliverablePermissions.ts`:

```typescript
// View permissions
canViewDeliverable(user, deliverable, project)
canViewBetaFiles(user, deliverable, project)

// Upload permissions
canUploadBetaFiles(user, project, task?)
canUploadFinalFiles(user, project)

// Approval permissions
canApproveDeliverable(user, deliverable, project)
canRequestRevisions(user, deliverable, project)

// Access permissions
canAccessFinalFiles(user, deliverable, project)
canViewApprovalHistory(user, project)

// Edit permissions
canEditDeliverable(user, deliverable, project)
canCreateDeliverable(user, project)
canDeleteDeliverable(user, project)

// Comment permissions
canCommentOnDeliverable(user, deliverable, project)

// Role checks
isClientPrimaryContact(user, projectId)
isMotionifyTeam(user)

// Error messages
getPermissionDeniedReason(action, user, deliverable?, project?)
```

---

## Common Issues & Debugging

### Issue 1: All Permissions Denied
**Cause:** AuthContext not initialized
**Fix:** Ensure `<AuthProvider>` wraps the app in `App.tsx`

### Issue 2: Role Selector Not Working
**Cause:** State not updating
**Fix:** Check browser console for React errors

### Issue 3: Deliverables Not Visible
**Cause:** Visibility rules working correctly
**Verify:** Client roles should not see pending/in_progress deliverables

### Issue 4: Permission Matrix Shows Wrong Results
**Cause:** Deliverable status or project status incorrect
**Fix:** Check test data in `PermissionTest.tsx`

---

## Adding New Test Cases

To add new test scenarios:

1. **Update `TEST_DELIVERABLES`** in `PermissionTest.tsx`
2. **Add new deliverable status** if needed
3. **Update this documentation** with new test scenario
4. **Verify permission matrix** for new status

Example:
```typescript
{
  id: 'del-9',
  title: 'New Test Deliverable',
  status: 'your_new_status' as DeliverableStatus,
  // ... other fields
}
```

---

## Production Deployment

**IMPORTANT:** Remove or protect the test page before deploying to production:

### Option 1: Remove Route (Recommended)
```typescript
// In App.tsx - Comment out or remove:
// <Route path="/test/permissions" element={<PermissionTest />} />
```

### Option 2: Add Authentication Gate
```typescript
<Route
  path="/test/permissions"
  element={user?.role === 'super_admin' ? <PermissionTest /> : <Navigate to="/" />}
/>
```

### Option 3: Environment Check
```typescript
{process.env.NODE_ENV === 'development' && (
  <Route path="/test/permissions" element={<PermissionTest />} />
)}
```

---

## Next Steps

After validating permissions with this test page:

1. ✅ Verify all 5 roles work correctly
2. ✅ Test all 8 deliverable statuses
3. ✅ Confirm permission denial messages are clear
4. 🔄 Continue with **Phase 2**: Update remaining components
5. 🔄 Write unit tests for permission functions
6. 🔄 Integration test with real backend

---

## Support

If you find issues with the permission system:

1. Check this test page first
2. Review `analysis/deliverables-permissions-audit.md`
3. Check permission function implementations in `utils/deliverablePermissions.ts`
4. Verify user data structure matches expected format

**Last Updated:** December 3, 2025
**Test Page Version:** 1.0
**Permission System Version:** 1.0
