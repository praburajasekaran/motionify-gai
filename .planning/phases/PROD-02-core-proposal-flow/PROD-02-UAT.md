# Phase 2: Core Proposal Flow - UAT Report

**Tested:** 2026-01-25
**Status:** ✅ Complete (with findings)

---

## Test Results Summary

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| PROP-01 | Proposal Creation | ✅ Pass | Form validation, creation working |
| PROP-02 | Proposal Viewing | ✅ Pass | Client can view proposals |
| PROP-03 | Status Workflow | ✅ Pass | Accept flow works, syncs to admin |
| PROP-04 | Proposal Editing | ✅ Pass | Draft editing works |

---

## Detailed Test Results

### PROP-01: Proposal Creation Flow

**Steps tested:**
1. ✅ Navigate to inquiry detail page from admin portal
2. ✅ Click "Create Proposal" button - form appears
3. ✅ Form validation - submit button disabled until required fields filled
4. ✅ Submit proposal - created successfully in database

**Not verified:**
- Email notification to client (need email access to verify)

---

### PROP-02: Proposal Viewing (Client Side)

**Steps tested:**
1. ✅ Client login via magic link works
2. ✅ Client can see proposals on dashboard
3. ✅ Proposal detail page loads with all information
4. ✅ Accept/Reject action buttons visible

**UX Issue Found:**
- Status label shows "Proposal Sent" (admin parlance) instead of client-friendly "Proposal Received"

---

### PROP-03: Proposal Status Workflow

**Steps tested:**
1. ✅ Accept button shows confirmation dialog
2. ✅ After accepting, Pay button is shown (payment pending state)
3. ✅ Status update syncs correctly to admin portal

**Not tested:**
- Reject flow (no additional proposals available)

---

### PROP-04: Proposal Editing

**Steps tested:**
1. ✅ Edit button found on proposals
2. ✅ Edit form loads correctly
3. ✅ Changes save successfully to database
4. ⚠️ Editing allowed on sent proposals

**Business Logic Review Needed:**
- Editing is allowed even on sent proposals
- Determine if this is intentional (for negotiations) or should be restricted

---

## Infrastructure Fixes Applied During Testing

### 1. Vite Proxy Port Fix
**File:** `vite.config.ts`
**Issue:** Proxy was pointing to port 9999 instead of 8888
**Fix:** Changed target to `http://localhost:8888`

```diff
proxy: {
  '/.netlify/functions': {
-   target: 'http://localhost:9999',
+   target: 'http://localhost:8888',
    changeOrigin: true,
  }
}
```

### 2. API Base URL Fix (Cookie Handling)
**File:** `lib/api-config.ts`
**Issue:** Direct requests to port 8888 bypassed Vite proxy, breaking cookie handling
**Fix:** Changed to relative path so requests go through proxy

```diff
-export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8888/.netlify/functions';
+export const API_BASE = import.meta.env.VITE_API_URL || '/.netlify/functions';
```

---

## Issues to Fix

### Issue 1: Client-Facing Status Labels (UX)
**Priority:** Medium
**Description:** Status labels use admin terminology ("Proposal Sent") instead of client-friendly language ("Proposal Received" or "Awaiting Your Response")
**Location:** Client portal inquiry/proposal listing components
**Action:** Create mapping for client-facing status display

### Issue 2: Sent Proposal Editing (Business Logic)
**Priority:** Low (Review)
**Description:** Admin can edit proposals even after they've been sent to client
**Current Behavior:** Editing allowed on all proposals regardless of status
**Recommended:** Either:
  - Block editing after sent (strict)
  - Allow editing but notify client of changes (flexible)
  - Keep as-is if intentional for negotiation workflow

---

## Next Steps

1. Fix Issue 1 (status label UX)
2. Review Issue 2 with product decision
3. Continue to Phase 4 (Deliverables) or Phase 7 (Payments) testing

---

*UAT completed: 2026-01-25*
