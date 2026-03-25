---
module: ProposalBuilder
date: 2026-02-20
problem_type: performance_issue
component: background_job
symptoms:
  - "Proposal save takes 4–10 seconds after clicking Send Proposal"
  - "UI hangs visibly after form submission before returning success"
root_cause: missing_include
resolution_type: code_fix
severity: high
tags: [performance, async, fire-and-forget, email, proposal, netlify-functions]
---

# Troubleshooting: Proposal Save Slow Due to Blocking Email + Activity Log

## Problem

When an admin clicks "Send Proposal" in ProposalBuilder, the save operation took 4–10 seconds because the Netlify function `POST /proposals` was `await`ing a Resend API email call and a database activity log write before returning the HTTP response.

## Environment

- Module: ProposalBuilder / proposals Netlify function
- Affected Component: `netlify/functions/proposals.ts` (POST handler), `pages/admin/ProposalBuilder.tsx`
- Date: 2026-02-20

## Symptoms

- Admin clicks "Send Proposal" — UI shows spinner for 4–10 seconds
- No error; the proposal was saved correctly, just slowly
- Resend API call (external network) was the dominant bottleneck (~2–5s)
- `logActivity()` DB write added another ~50–100ms

## What Didn't Work

**Direct solution:** The problem was identified and fixed on the first attempt.

## Solution

**1. Make email send and activity log fire-and-forget in `netlify/functions/proposals.ts`:**

```typescript
// Before (blocking):
try {
  await sendProposalNotificationEmail({
    to: contact_email,
    clientName: inquiry_name,
    proposalId: proposal.id,
    totalAmount: total_amount,
    videoCount: line_items.length,
  });
  console.log(`✅ Proposal notification email sent to ${contact_email}`);
} catch (emailError) {
  console.error('❌ Failed to send proposal notification email:', emailError);
  // Don't fail the request if email fails
}

await logActivity(client, {
  type: 'PROPOSAL_SENT',
  userId: user_id,
  details: { proposalId: proposal.id, inquiryId: inquiry_id },
});

// After (fire-and-forget):
sendProposalNotificationEmail({
  to: contact_email,
  clientName: inquiry_name,
  proposalId: proposal.id,
  totalAmount: total_amount,
  videoCount: line_items.length,
}).then(() => {
  console.log(`✅ Proposal notification email sent to ${contact_email}`);
}).catch((emailError) => {
  console.error('❌ Failed to send proposal notification email:', emailError);
});

logActivity(client, {
  type: 'PROPOSAL_SENT',
  userId: user_id,
  details: { proposalId: proposal.id, inquiryId: inquiry_id },
}).catch((err) => {
  console.error('❌ Failed to log activity:', err);
});

// Return response immediately — don't await email or activity log
return { statusCode: 201, ... };
```

**2. Remove duplicate `updateInquiryStatus` call from `pages/admin/ProposalBuilder.tsx`:**

The frontend was firing a second API call to update inquiry status after `createProposal()` returned, but the backend `POST /proposals` handler already executed `UPDATE inquiries SET proposal_id = $1, status = 'proposal_sent'` in the same transaction.

```typescript
// Before (duplicate round-trip):
import { getInquiryById, updateInquiryStatus, type Inquiry } from '../../lib/inquiries';

const proposal = await createProposal({...});
await updateInquiryStatus(inquiry.id, 'proposal_sent', {
  proposalId: proposal.id,
});

// After (removed redundant call):
import { getInquiryById, type Inquiry } from '../../lib/inquiries';

const proposal = await createProposal({...});
// inquiry status already updated server-side in the POST /proposals handler
```

## Why This Works

1. **Root cause**: External Resend API calls (`sendProposalNotificationEmail`) block the HTTP response. The `try/catch` already marked email as non-critical (failure doesn't fail the request), but `await` still blocks the response until the external call completes.
2. **Fire-and-forget**: Removing `await` and using `.then().catch()` lets Node.js continue executing the return statement immediately. The email and activity log proceed asynchronously in the background.
3. **Duplicate call**: The frontend `updateInquiryStatus` call was already handled server-side — removing it saves one full API round-trip (~100–300ms) and eliminates redundant DB writes.

Expected improvement: 4–10s → under 1s for the save operation.

## Prevention

- **Never `await` non-critical side effects** (emails, notifications, analytics, activity logs) in the critical path of an HTTP request. If the caller doesn't need the result, make it fire-and-forget with `.catch()` for error handling.
- **Check for duplicate work**: When a backend handler already updates related records (e.g., inquiry status), the frontend should not repeat the same update after getting the response.
- **Pattern to follow**: Return HTTP response first, then let background work proceed. In serverless functions (Netlify/Vercel), use `waitUntil()` if the platform supports it; otherwise `.catch()` is sufficient.

## Related Issues

No related issues documented yet.
