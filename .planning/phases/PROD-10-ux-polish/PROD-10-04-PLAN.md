---
phase: PROD-10-ux-polish
plan: 04
type: execute
wave: 2
depends_on:
  - PROD-10-01
files_modified:
  - netlify/functions/proposals.ts
  - netlify/functions/send-email.ts
  - netlify/functions/notifications.ts
autonomous: true

must_haves:
  truths:
    - "Clients receive email notification when proposal status changes"
    - "Clients receive in-app notification (bell badge) when proposal status changes"
    - "Admins receive email when client responds to proposal (accept/reject/revision)"
    - "Email includes: new status, proposal title, and link to view"
  artifacts:
    - path: "netlify/functions/send-email.ts"
      provides: "sendProposalStatusChangeEmail function"
      exports: ["sendProposalStatusChangeEmail"]
    - path: "netlify/functions/proposals.ts"
      provides: "Notification dispatch on status change"
      contains: "sendProposalStatusChangeEmail|createNotification"
  key_links:
    - from: "netlify/functions/proposals.ts"
      to: "netlify/functions/send-email.ts"
      via: "import sendProposalStatusChangeEmail"
      pattern: "sendProposalStatusChangeEmail"
    - from: "netlify/functions/proposals.ts"
      to: "notifications table"
      via: "INSERT INTO notifications"
      pattern: "INSERT INTO notifications"
---

<objective>
Wire status change notifications for both email and in-app delivery.

Purpose: Ensure clients and admins are notified promptly when proposal status changes, using both email (via Resend) and in-app notifications (via notifications table + NotificationContext polling).

Output: Updated proposals.ts API with notification dispatch, new sendProposalStatusChangeEmail in send-email.ts.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/PROD-10-ux-polish/PROD-10-CONTEXT.md
@.planning/phases/PROD-10-ux-polish/PROD-10-RESEARCH.md
@.planning/phases/PROD-10-ux-polish/PROD-10-01-SUMMARY.md
@netlify/functions/proposals.ts
@netlify/functions/send-email.ts
@netlify/functions/notifications.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add sendProposalStatusChangeEmail to send-email.ts</name>
  <files>netlify/functions/send-email.ts</files>
  <action>
Add a new email template function to `netlify/functions/send-email.ts`.

Add this function before the handler (after the existing email functions, around line ~570):

```typescript
export async function sendProposalStatusChangeEmail(data: {
  to: string;
  recipientName: string;
  proposalTitle: string;
  newStatus: string;
  statusDescription: string;
  viewUrl: string;
  recipientType: 'client' | 'admin';
}) {
  const isClient = data.recipientType === 'client';

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #D946EF, #8B5CF6, #3B82F6); padding: 12px 20px; border-radius: 12px;">
          <span style="color: white; font-size: 24px; font-weight: bold;">Motionify</span>
        </div>
      </div>

      <h2 style="color: #7c3aed; text-align: center;">Proposal Update</h2>
      <p>Hi <strong>${data.recipientName}</strong>,</p>
      <p>${data.statusDescription}</p>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">New Status</p>
        <p style="margin: 8px 0 0 0; font-size: 20px; font-weight: bold; color: #111827;">${data.newStatus}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.viewUrl}" style="background: linear-gradient(135deg, #D946EF, #8B5CF6, #3B82F6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          ${isClient ? 'View Proposal' : 'View in Portal'}
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Motionify Studio<br>
        <a href="https://motionify.studio" style="color: #7c3aed;">motionify.studio</a>
      </p>
    </div>
  `;

  const subjectPrefix = isClient ? '' : '[Client Response] ';
  const subject = `${subjectPrefix}Proposal Update: ${data.proposalTitle} - ${data.newStatus}`;

  return sendEmail({
    to: data.to,
    subject,
    html,
  });
}
```

This email template:
- Works for both client and admin notifications
- Includes professional Motionify branding
- Shows the new status prominently
- Provides CTA button to view the proposal
- Different subject line prefix for admin notifications
  </action>
  <verify>
Run `npm run typecheck` - no TypeScript errors.
Function sendProposalStatusChangeEmail exported from send-email.ts.
  </verify>
  <done>
sendProposalStatusChangeEmail function added to send-email.ts.
Function accepts recipientType to differentiate client vs admin notifications.
Email includes status, description, and view link.
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire notifications into proposals.ts status updates</name>
  <files>netlify/functions/proposals.ts</files>
  <action>
Update `netlify/functions/proposals.ts` to dispatch notifications on status changes.

1. Add import at top:
```typescript
import { sendProposalStatusChangeEmail } from './send-email';
```

2. Add notification helper function after the imports:
```typescript
// Status labels for notifications
const STATUS_LABELS: Record<string, { clientLabel: string; adminLabel: string; description: string }> = {
  sent: {
    clientLabel: 'Awaiting Your Review',
    adminLabel: 'Sent',
    description: 'A new proposal has been sent for your review.',
  },
  accepted: {
    clientLabel: 'Accepted',
    adminLabel: 'Accepted',
    description: 'The proposal has been accepted.',
  },
  rejected: {
    clientLabel: 'Declined',
    adminLabel: 'Rejected',
    description: 'The proposal has been declined.',
  },
  changes_requested: {
    clientLabel: 'Revision Requested',
    adminLabel: 'Revision Requested',
    description: 'Changes have been requested for this proposal.',
  },
};

async function notifyStatusChange(
  client: pg.Client,
  proposalId: string,
  newStatus: string,
  changedByRole: 'client' | 'admin'
) {
  try {
    // Get proposal with client and inquiry info
    const proposalResult = await client.query(`
      SELECT p.*, i.inquiry_number, i.contact_email, i.contact_name, u.id as client_user_id
      FROM proposals p
      JOIN inquiries i ON p.inquiry_id = i.id
      LEFT JOIN users u ON u.email = i.contact_email
      WHERE p.id = $1
    `, [proposalId]);

    if (proposalResult.rows.length === 0) return;

    const proposal = proposalResult.rows[0];
    const statusConfig = STATUS_LABELS[newStatus] || { clientLabel: newStatus, adminLabel: newStatus, description: 'Proposal status has been updated.' };
    const appUrl = process.env.URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Determine notification targets
    if (changedByRole === 'admin') {
      // Admin changed status -> notify client
      if (proposal.contact_email) {
        // Email notification
        await sendProposalStatusChangeEmail({
          to: proposal.contact_email,
          recipientName: proposal.contact_name,
          proposalTitle: `Inquiry ${proposal.inquiry_number}`,
          newStatus: statusConfig.clientLabel,
          statusDescription: statusConfig.description,
          viewUrl: `${appUrl}/proposal/${proposalId}`,
          recipientType: 'client',
        });

        // In-app notification (if client user exists)
        if (proposal.client_user_id) {
          await client.query(`
            INSERT INTO notifications (user_id, type, title, message, action_url)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            proposal.client_user_id,
            'project_status_changed',
            `Proposal ${statusConfig.clientLabel}`,
            statusConfig.description,
            `/proposal/${proposalId}`,
          ]);
        }
      }
    } else {
      // Client changed status -> notify admins
      const adminResult = await client.query(`
        SELECT id, email, full_name FROM users WHERE role IN ('super_admin', 'project_manager')
      `);

      const adminNotificationEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@motionify.com';

      // Send single admin email notification
      await sendProposalStatusChangeEmail({
        to: adminNotificationEmail,
        recipientName: 'Motionify Team',
        proposalTitle: `Inquiry ${proposal.inquiry_number} (${proposal.contact_name})`,
        newStatus: statusConfig.adminLabel,
        statusDescription: `${proposal.contact_name} has ${newStatus === 'accepted' ? 'accepted' : newStatus === 'rejected' ? 'declined' : 'requested changes to'} the proposal.`,
        viewUrl: `${appUrl}/#/admin/proposals/${proposalId}`,
        recipientType: 'admin',
      });

      // In-app notifications for all admins
      for (const admin of adminResult.rows) {
        await client.query(`
          INSERT INTO notifications (user_id, type, title, message, action_url)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          admin.id,
          'project_status_changed',
          `Client ${statusConfig.adminLabel} Proposal`,
          `${proposal.contact_name} has responded to proposal for ${proposal.inquiry_number}`,
          `/admin/proposals/${proposalId}`,
        ]);
      }
    }

    console.log(`Notifications sent for proposal ${proposalId} status change to ${newStatus}`);
  } catch (error) {
    console.error('Error sending status change notifications:', error);
    // Don't throw - notifications shouldn't block the main request
  }
}
```

3. Call notifyStatusChange in the PUT handler after successful status update (around line ~143, after `return { statusCode: 200...`):

Find where `updates.status` is processed and add notification call. After the proposal update succeeds and before the return statement, add:

```typescript
// Notify on status change
if (updates.status) {
  // Determine who made the change based on auth
  const changedByRole = auth?.user?.role === 'client' ? 'client' : 'admin';
  await notifyStatusChange(client, proposalId, updates.status, changedByRole);
}
```

4. Similarly, add to the PATCH handler (around line ~200):

After the status update succeeds and before the return:
```typescript
// Notify on status change
if (status) {
  const changedByRole = auth?.user?.role === 'client' ? 'client' : 'admin';
  await notifyStatusChange(client, proposalId, status, changedByRole);
}
```

Note: The notification function handles both email (via Resend) and in-app (via notifications table insert). The NotificationContext in both portals polls this table, so notifications will appear in the bell icon.
  </action>
  <verify>
Run `npm run typecheck` - no TypeScript errors.
Test by updating a proposal status via admin portal.
Check server logs for "Notifications sent for proposal..." message.
Verify client receives email (check Resend dashboard or test email inbox).
Verify notification appears in client portal bell icon (may need to wait for poll interval).
  </verify>
  <done>
sendProposalStatusChangeEmail imported and used in proposals.ts.
notifyStatusChange helper sends both email and in-app notifications.
Admin status changes notify client (email + in-app).
Client status changes notify admins (email + in-app).
Notifications don't block main request on failure.
  </done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors
2. Admin changes proposal status -> client receives email
3. Admin changes proposal status -> client sees notification in bell icon
4. Client responds to proposal -> admin receives email
5. Client responds to proposal -> admin sees notification in bell icon
6. Email includes new status, proposal title, and view link
7. Notification failures don't block the status update request
</verification>

<success_criteria>
- sendProposalStatusChangeEmail function exists in send-email.ts
- proposals.ts calls notifyStatusChange on PUT and PATCH status updates
- Clients notified via both email AND in-app on admin status changes
- Admins notified via both email AND in-app on client responses
- Email subject indicates recipient type ([Client Response] prefix for admins)
- Errors in notification dispatch are logged but don't fail the request
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-10-ux-polish/PROD-10-04-SUMMARY.md`
</output>
