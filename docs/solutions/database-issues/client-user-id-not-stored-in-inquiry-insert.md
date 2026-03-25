---
title: "Backend Inquiry INSERT Missing client_user_id Column"
date: 2026-03-19
category: database-issues
tags:
  - inquiries
  - client-portal
  - backend
  - data-persistence
  - netlify-functions
  - build-errors
severity: critical
component: "NewInquiryModal / netlify/functions/inquiries.ts"
symptoms:
  - Client users see "No inquiries found" after creating inquiry via NewInquiryModal
  - Newly created inquiries not visible in client's Inquiry Dashboard
  - getInquiriesByClientUserId returns empty results for client-created inquiries
  - Netlify deploy failing due to pre-existing Next.js build errors
root_cause: "Backend INSERT query for admin-payload inquiries omitted client_user_id column, even though frontend sent it and Zod schema validated it"
resolution_time: "30 minutes"
confidence: high
resolved: true
pr: "https://github.com/praburajasekaran/motionify-gai/pull/35"
---

# Backend Inquiry INSERT Missing client_user_id Column

## Problem

After a client creates an inquiry via the `NewInquiryModal`, they immediately see **"No inquiries found"** on the Inquiry Dashboard. The inquiry exists in the database but has no ownership link to the client.

## Root Cause Analysis

The data flow had a gap at the database layer:

1. **Frontend** (`NewInquiryModal.tsx:124`): Sends `clientUserId: user?.id` in the payload
2. **Zod Schema** (`createAdminInquirySchema`): Accepts and validates `clientUserId` as `uuidSchema.optional()`
3. **Backend INSERT** (`netlify/functions/inquiries.ts:~197`): **Missing** `client_user_id` column in the SQL INSERT

The INSERT listed 8 columns but the payload had 9 fields. The `client_user_id` was silently dropped. When the client's dashboard called `getInquiriesByClientUserId(userId)`, the query `WHERE client_user_id = $1` returned zero results because all client-created inquiries had `NULL` for that column.

## Solution

### Fix 1: Add `client_user_id` to INSERT Statement

**File**: `netlify/functions/inquiries.ts`

**Before**:
```sql
INSERT INTO inquiries (
  inquiry_number, contact_name, contact_email, company_name,
  contact_phone, project_notes, quiz_answers, recommended_video_type
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
```

**After**:
```sql
INSERT INTO inquiries (
  inquiry_number, contact_name, contact_email, company_name,
  contact_phone, project_notes, quiz_answers, recommended_video_type, client_user_id
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
```

With `payload.clientUserId || null` added to the values array.

### Fix 2: Resolve Pre-Existing Build Errors

The Netlify deploy was also failing due to accumulated Next.js build errors:

| File | Issue | Fix |
|------|-------|-----|
| `tasks.api.ts` | Import from non-existent `../../api-client` | Replaced with plain `fetch` |
| `activities.api.ts` | Duplicate `Activity`/`ActivityType` types | Consolidated to import from `types.ts` |
| `AppContext.tsx`, `StatusTimeline.tsx` | String literals vs enum values | Changed to `ActivityType.X` |
| `CreateProjectModal.tsx`, `TaskList.tsx` | Missing `status` field on Deliverable | Added default status |

## Investigation Steps

1. Checked existing branches for prior fixes (`fix/inquiry-detail-client-status-labels`, `client-dashboard`)
2. Verified `canManageInquiries` permission already allows clients on this branch
3. Traced data flow: frontend payload -> Zod schema -> SQL INSERT -> query filter
4. Identified the INSERT gap where `client_user_id` was accepted but not stored
5. Built locally to identify all build failures blocking deploy

## Prevention Strategies

1. **Dual Validation**: Validate at API boundary (Zod) AND at database level (NOT NULL constraints for required fields)
2. **Integration Tests**: After INSERT, verify the returned row contains all expected fields including `client_user_id`
3. **Unified Build Pipeline**: Run `tsc --noEmit` across ALL packages (Vite + Next.js) before deploy
4. **Schema-Driven Development**: Consider generating SQL INSERT helpers from Zod schemas to prevent column drift

## Related Documentation

- [Client Dashboard Redirect](../ui-bugs/client-dashboard-redirect-to-projects-or-inquiries.md) - Client routing to inquiries page
- [Activities Not Persisted](../logic-errors/activity-not-persisted-to-database.md) - Similar pattern of data not reaching database
- [API Field Name Mismatch](../integration-issues/api-field-name-mismatch-task-data-loss.md) - Field mapping issues between API and DB
- [PR #35](https://github.com/praburajasekaran/motionify-gai/pull/35) - The fix PR
