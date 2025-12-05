# Permission System Testing

Interactive test environment for validating the 5-role permission system.

## Quick Start

```bash
# 1. Start dev server
npm run dev

# 2. Navigate to test page
# http://localhost:5173/#/test/permissions

# 3. Use the interactive UI to test all roles and statuses
```

## What's Included

### 📄 Test Page
**Location:** `pages/PermissionTest.tsx`

Interactive UI featuring:
- ✅ 5 role switcher (Admin, PM, Team, Client PM, Client Team)
- ✅ 8 deliverables covering all workflow statuses
- ✅ Real-time permission matrix with visual indicators
- ✅ Permission denial reasons
- ✅ Role info display

### 📚 Documentation

1. **[permission-system-test-guide.md](./permission-system-test-guide.md)**
   - Complete test scenarios (8 scenarios)
   - Permission matrix reference
   - Debugging common issues
   - Step-by-step validation

2. **[QUICK-TEST-CHECKLIST.md](./QUICK-TEST-CHECKLIST.md)**
   - 5-minute validation checklist
   - Critical permission matrix
   - Edge cases to verify
   - Success criteria

## Test Coverage

### ✅ Roles Tested
- Super Admin (full access)
- Motionify Support (manages projects)
- Team Member (task-based uploads)
- Client Primary Contact (approval authority)
- Client Team Member (view-only)

### ✅ Statuses Tested
- `pending` - Hidden from clients
- `in_progress` - Team working, clients blocked
- `beta_ready` - Clients can view, cannot approve
- `awaiting_approval` - Client PM can approve/reject
- `approved` - Awaiting payment
- `rejected` - Team can re-upload
- `payment_pending` - Payment required
- `final_delivered` - Full access, 365-day expiry

### ✅ Permissions Tested
12 permission checks per deliverable:
1. View deliverable
2. View beta files
3. Upload beta files
4. Upload final files
5. Approve deliverable
6. Request revisions
7. View approval history
8. Access final files
9. Edit deliverable
10. Create deliverables
11. Delete deliverables
12. Comment on deliverable

## Visual Indicators

- 🟢 **Green Row** = Permission granted
- 🔴 **Red Row** = Permission denied (with reason)
- 👁️ **Eye Icon** = Deliverable visible
- 👁️‍🗨️ **Eye-Off Icon** = Deliverable hidden

## Permission Matrix Quick Reference

| Permission | Admin | PM | Team | Client PM | Client Team |
|-----------|-------|----|----- |-----------|-------------|
| Approve | ❌ | ❌ | ❌ | ✅ | ❌ |
| Upload Beta | ✅ | ✅ | ✅* | ❌ | ❌ |
| Upload Final | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Pending | ✅ | ✅ | ✅ | ❌ | ❌ |
| View History | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ | ❌ |

*Team members: Only to assigned tasks

## Common Test Scenarios

### Scenario 1: Approval Authority
**Test:** Only Client Primary Contact can approve
- ✅ Client PM + awaiting_approval = Can approve
- ❌ Client Team + awaiting_approval = Cannot approve
- ❌ Motionify Support + awaiting_approval = Cannot approve

### Scenario 2: Visibility Control
**Test:** Clients cannot see early-stage deliverables
- ❌ Client + pending = Cannot view
- ❌ Client + in_progress = Cannot view
- ✅ Client + beta_ready = Can view

### Scenario 3: Upload Permissions
**Test:** Role-based upload restrictions
- ✅ Admin/PM = Can upload beta + final
- ✅ Team = Can upload beta (assigned tasks only)
- ❌ Clients = Cannot upload

### Scenario 4: Payment Gates
**Test:** Final files require payment
- ❌ payment_pending = Cannot access final files
- ✅ final_delivered = Can access final files

## Integration with Real App

The test page uses the same permission functions as the real app:

```typescript
// From: utils/deliverablePermissions.ts
import {
  canViewDeliverable,
  canApproveDeliverable,
  canUploadBetaFiles,
  // ... 12 total permission functions
} from '@/utils/deliverablePermissions';
```

This ensures test results match production behavior.

## Before Production Deployment

**⚠️ IMPORTANT:** Remove or protect test page:

### Option 1: Remove Route (Recommended)
```typescript
// Comment out in App.tsx:
// <Route path="/test/permissions" element={<PermissionTest />} />
```

### Option 2: Admin-Only Access
```typescript
<Route
  path="/test/permissions"
  element={
    user?.role === 'super_admin'
      ? <PermissionTest />
      : <Navigate to="/" />
  }
/>
```

## Next Steps After Testing

1. ✅ Validate all roles work correctly
2. ✅ Verify permission denial messages are clear
3. 🔄 Continue **Phase 2**: Update remaining components
4. 🔄 Write unit tests for permission functions
5. 🔄 Integration tests with real backend

## Related Documentation

- [Audit Report](../../analysis/deliverables-permissions-audit.md) - Full permission gap analysis
- [Permission Documentation](../../docs/user-types-permissions.md) - Official 5-role specification
- [Deliverable Permissions](../../utils/deliverablePermissions.ts) - Implementation

## Support

**Found an issue?**
1. Verify expected behavior in test guide
2. Check implementation in `utils/deliverablePermissions.ts`
3. Review audit report for known gaps
4. File issue with role + status that failed

---

**Last Updated:** December 3, 2025
**Test System Version:** 1.0
**Permission System Version:** 1.0
