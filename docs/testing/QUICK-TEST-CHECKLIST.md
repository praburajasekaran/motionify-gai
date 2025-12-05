# Permission System - Quick Test Checklist

⚡ **Fast validation checklist for the role-based permission system**

## Access Test Page

```bash
npm run dev
# Navigate to: http://localhost:5173/#/test/permissions
```

---

## ✅ Quick Tests (5 minutes)

### Test 1: Client PM Can Approve ✓
- [x] Switch to **Client Primary Contact**
- [x] Select **Customer Testimonial** (awaiting_approval)
- [x] Verify: ✅ Can Approve, ✅ Can Request Revisions

### Test 2: Client Team Cannot Approve ✓
- [x] Switch to **Client Team Member**
- [x] Select **Customer Testimonial** (awaiting_approval)
- [x] Verify: ❌ Cannot Approve, ❌ Cannot Request Revisions

### Test 3: Clients Cannot See Pending ✓
- [x] As **Client Primary Contact**
- [x] Verify: **Intro Animation** (pending) shows EyeOff icon
- [x] Verify: **Product Demo** (in_progress) shows EyeOff icon

### Test 4: Team Cannot Approve ✓
- [x] Switch to **Motionify Support**
- [x] Select **Customer Testimonial** (awaiting_approval)
- [x] Verify: ❌ Cannot Approve (only clients can)

### Test 5: Only Admin Can Delete ✓
- [x] As **Super Admin**: ✅ Can Delete Deliverables
- [x] As **Motionify Support**: ❌ Cannot Delete Deliverables

---

## 🎯 Critical Permission Matrix

**Quick reference - verify these work:**

| Action | Admin | PM | Team | Client PM | Client Team |
|--------|-------|----|----- |-----------|-------------|
| Approve | ❌ | ❌ | ❌ | ✅ | ❌ |
| Upload Beta | ✅ | ✅ | ✅* | ❌ | ❌ |
| Upload Final | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Pending | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ | ❌ |

*= Only to assigned tasks

---

## 🔍 Status Visibility Check

**As Client Primary Contact, count visible deliverables:**

Expected: **6 out of 8 visible**

- ❌ Intro Animation (pending) - HIDDEN
- ❌ Product Demo (in_progress) - HIDDEN
- ✅ Brand Story (beta_ready) - VISIBLE
- ✅ Customer Testimonial (awaiting_approval) - VISIBLE
- ✅ Social Media Clips (approved) - VISIBLE
- ✅ Explainer Video (rejected) - VISIBLE
- ✅ Tutorial Series (payment_pending) - VISIBLE
- ✅ Corporate Presentation (final_delivered) - VISIBLE

---

## 🚨 Edge Cases to Verify

### 1. Locked During Approval
- [x] As **PM**, select **Customer Testimonial** (awaiting_approval)
- [x] Check: ❌ Cannot Edit Deliverable
- [x] Reason: "Deliverable is locked during approval"

### 2. Payment Required
- [x] As **Client PM**, select **Tutorial Series** (payment_pending)
- [x] Check: ❌ Cannot Access Final Files
- [x] Reason: "Payment required to access final files"

### 3. Team Member Task Assignment
- [x] As **Team Member**, check **Upload Beta Files**
- [x] Verify reason: "You can only upload to tasks you are assigned to"

### 4. Approval History Visibility
- [x] As **Client Team Member**: ❌ Cannot View Approval History
- [x] As **Client Primary Contact**: ✅ Can View Approval History

---

## 📊 Role Info Verification

For each role, verify these flags:

| Role | Is Client PM | Is Motionify Team |
|------|-------------|-------------------|
| Super Admin | ❌ | ✅ |
| Motionify Support | ❌ | ✅ |
| Team Member | ❌ | ✅ |
| Client Primary | ✅ | ❌ |
| Client Team | ❌ | ❌ |

---

## ⚠️ Common Mistakes

### ❌ Wrong: Using Display Names
```typescript
if (user.role === 'Admin') // DON'T DO THIS
```

### ✅ Correct: Using Database Values
```typescript
if (user.role === 'super_admin') // DO THIS
```

### ❌ Wrong: Not Checking Primary Contact
```typescript
if (user.role === 'client') // INCOMPLETE
```

### ✅ Correct: Check Primary Contact Flag
```typescript
if (user.role === 'client' && user.projectTeamMemberships?.[projectId]?.isPrimaryContact)
```

---

## 🎉 Success Criteria

All tests pass when:
- ✅ Client PM can approve awaiting_approval deliverables
- ✅ Client Team cannot approve or view history
- ✅ Clients cannot see pending/in_progress deliverables
- ✅ Team members see task assignment requirement
- ✅ Only Admin can delete deliverables
- ✅ Deliverables locked during approval
- ✅ Payment gates work correctly
- ✅ Permission denial messages are clear

---

## 📝 Found a Bug?

1. Note which role + deliverable status failed
2. Check expected permission in `permission-system-test-guide.md`
3. Review function in `utils/deliverablePermissions.ts`
4. Update function and re-test

---

**Quick Reference:** See full test guide at `docs/testing/permission-system-test-guide.md`
