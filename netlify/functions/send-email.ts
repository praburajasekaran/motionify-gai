import { Resend } from 'resend';
import type { Handler } from '@netlify/functions';

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

// From email - use Resend's default domain for development, or your verified domain
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Motionify <onboarding@resend.dev>';

const LOGO_URL = 'https://motionify.studio/motionify-studio-dark.png';

/**
 * Escape HTML special characters to prevent HTML injection in email templates.
 * Must be applied to all user-controlled values interpolated into HTML.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">
    <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
      <div style="text-align: center; padding: 32px 24px 0;">
        <img src="${LOGO_URL}" alt="Motionify Studio" width="180" style="display: inline-block;" />
      </div>
      <div style="padding: 24px 32px 32px;">
        ${content}
      </div>
    </div>
    <div style="text-align: center; padding: 24px 16px;">
      <p style="margin: 0; font-size: 13px; color: #6b7280;">Motionify Studio</p>
      <p style="margin: 4px 0 0; font-size: 13px;">
        <a href="https://motionify.com" style="color: #7c3aed; text-decoration: none;">motionify.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [options.to],
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return null;
    }

    console.log('✅ Email sent via Resend:', data?.id);
    return data;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    // Don't throw to prevent blocking the main request
    return null;
  }
}

export async function sendMentionNotification(data: {
  to: string;
  mentionedByName: string;
  taskTitle: string;
  commentContent: string;
  taskUrl: string;
}) {
  const content = `
    <h2 style="color: #7c3aed; margin: 0 0 16px;">You were mentioned in a comment</h2>
    <p style="margin: 0 0 8px; color: #1a1a1a;"><strong>${escapeHtml(data.mentionedByName)}</strong> mentioned you in <strong>${escapeHtml(data.taskTitle)}</strong>:</p>

    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
      "${escapeHtml(data.commentContent)}"
    </div>

    <div style="margin: 30px 0; text-align: center;">
      <a href="${data.taskUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Comment</a>
    </div>
  `;

  return sendEmail({
    to: data.to,
    subject: `You were mentioned in "${data.taskTitle}"`,
    html: emailWrapper(content),
  });
}

export async function sendTaskAssignmentEmail(data: {
  to: string;
  assigneeName: string;
  taskTitle: string;
  projectNumber: string;
  dueDate?: string;
  taskUrl: string;
}) {
  const content = `
    <h2 style="color: #7c3aed; margin: 0 0 16px;">New Task Assignment</h2>
    <p style="margin: 0 0 8px; color: #1a1a1a;">Hi <strong>${escapeHtml(data.assigneeName)}</strong>,</p>
    <p style="margin: 0 0 16px; color: #1a1a1a;">You have been assigned to a new task in project <strong>${escapeHtml(data.projectNumber)}</strong>:</p>

    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
      <h3 style="margin-top: 0; color: #111827;">${escapeHtml(data.taskTitle)}</h3>
      ${data.dueDate ? `<p style="margin-bottom: 0; color: #6b7280;">Due: ${new Date(data.dueDate).toLocaleDateString()}</p>` : ''}
    </div>

    <div style="margin: 30px 0; text-align: center;">
      <a href="${data.taskUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Task</a>
    </div>
  `;

  return sendEmail({
    to: data.to,
    subject: `Assigned to task: ${data.taskTitle}`,
    html: emailWrapper(content),
  });
}

export async function sendDeliverableReadyEmail(data: {
  to: string;
  clientName: string;
  projectNumber: string;
  deliverableName: string;
  deliverableUrl: string;
  deliveryNotes?: string;
}) {
  const content = `
    <h2 style="color: #7c3aed; margin: 0 0 16px;">Deliverable Ready for Review</h2>
    <p style="margin: 0 0 8px; color: #1a1a1a;">Hi <strong>${escapeHtml(data.clientName)}</strong>,</p>
    <p style="margin: 0 0 16px; color: #1a1a1a;">A new deliverable is ready for your review in project <strong>${escapeHtml(data.projectNumber)}</strong>:</p>

    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
      <h3 style="margin-top: 0; color: #111827;">${escapeHtml(data.deliverableName)}</h3>
      ${data.deliveryNotes ? `<p style="margin-top: 10px; color: #4b5563;"><strong>Note from team:</strong><br>${escapeHtml(data.deliveryNotes)}</p>` : ''}
    </div>

    <div style="margin: 30px 0; text-align: center;">
      <a href="${data.deliverableUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Review & Approve</a>
    </div>
  `;

  return sendEmail({
    to: data.to,
    subject: `Ready for Review: ${data.deliverableName} (${data.projectNumber})`,
    html: emailWrapper(content),
  });
}


export async function sendRevisionRequestEmail(data: {
  to: string;
  projectName: string;
  taskTitle: string;
  taskUrl: string;
  revisionCount: string;
  requestedBy: string;
}) {
  const content = `
    <h2 style="color: #7c3aed; margin: 0 0 16px;">Revision Requested</h2>
    <p style="margin: 0 0 8px; color: #1a1a1a;">Hi Team,</p>
    <p style="margin: 0 0 16px; color: #1a1a1a;"><strong>${escapeHtml(data.requestedBy)}</strong> has requested a revision on <strong>${escapeHtml(data.taskTitle)}</strong> in project <strong>${escapeHtml(data.projectName)}</strong>.</p>

    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
      <p style="margin: 0; color: #4b5563;"><strong>Revision Status:</strong> ${escapeHtml(data.revisionCount)}</p>
    </div>

    <div style="margin: 30px 0; text-align: center;">
      <a href="${data.taskUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Task & Feedback</a>
    </div>
  `;

  return sendEmail({
    to: data.to,
    subject: `Revision Requested: ${data.taskTitle} (${data.projectName})`,
    html: emailWrapper(content),
  });
}

export async function sendFinalDeliverablesEmail(data: {
  to: string;
  clientName: string;
  projectNumber: string;
  deliverableName: string;
  downloadUrl: string;
  expiryDays: number;
}) {
  const content = `
    <h2 style="color: #7c3aed; margin: 0 0 16px;">Final Deliverable Ready</h2>
    <p style="margin: 0 0 8px; color: #1a1a1a;">Hi <strong>${escapeHtml(data.clientName)}</strong>,</p>
    <p style="margin: 0 0 16px; color: #1a1a1a;">Thank you for your payment! The final files for <strong>${escapeHtml(data.deliverableName)}</strong> in project <strong>${escapeHtml(data.projectNumber)}</strong> are now ready for download.</p>

    <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
      <h3 style="margin-top: 0; color: #166534;">Download Ready</h3>
      <p style="margin-bottom: 0; color: #15803d;">These files are unwatermarked and full resolution.</p>
    </div>

    <div style="margin: 30px 0; text-align: center;">
      <a href="${data.downloadUrl}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Download Final Files</a>
    </div>

    <p style="background-color: #fff7ed; padding: 10px; border-radius: 4px; color: #9a3412; font-size: 14px; text-align: center;">
      <strong>Note:</strong> This link will expire in ${data.expiryDays} days. Please download and back up your files.
    </p>
  `;

  return sendEmail({
    to: data.to,
    subject: `Final Files Ready: ${data.deliverableName} (${data.projectNumber})`,
    html: emailWrapper(content),
  });
}

export async function sendPaymentReminderEmail(data: {
  to: string;
  clientName: string;
  projectNumber: string;
  amount: string;
  currency: string;
  paymentUrl: string;
  daysOverdue: number;
}) {
  const content = `
    <h2 style="color: #dc2626; margin: 0 0 16px;">Payment Reminder</h2>
    <p style="margin: 0 0 8px; color: #1a1a1a;">Hi <strong>${escapeHtml(data.clientName)}</strong>,</p>
    <p style="margin: 0 0 16px; color: #1a1a1a;">This is a friendly reminder that your balance payment for project <strong>${escapeHtml(data.projectNumber)}</strong> is still pending.</p>

    <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
      <h3 style="margin-top: 0; color: #991b1b;">Outstanding Balance</h3>
      <p style="font-size: 24px; font-weight: bold; color: #dc2626; margin: 10px 0;">${data.currency} ${data.amount}</p>
      <p style="margin-bottom: 0; color: #7f1d1d;">Payment has been pending for ${data.daysOverdue} days</p>
    </div>

    <p style="color: #4b5563; margin: 0 0 16px;">Your final deliverables are ready and will be available for download once payment is complete.</p>

    <div style="margin: 30px 0; text-align: center;">
      <a href="${data.paymentUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Pay Now</a>
    </div>

    <p style="color: #6b7280; font-size: 14px; margin: 0;">
      If you have already made this payment, please disregard this email. If you have any questions, please contact us at billing@motionify.studio.
    </p>
  `;

  return sendEmail({
    to: data.to,
    subject: `Payment Reminder: ${data.projectNumber} - ${data.currency} ${data.amount} Outstanding`,
    html: emailWrapper(content),
  });
}

export async function sendInquiryVerificationEmail(data: {
  to: string;
  contactName: string;
  magicLink: string;
  recommendedVideoType: string;
}) {
  const content = `
    <h2 style="color: #7c3aed; text-align: center; margin: 0 0 16px;">Verify Your Email</h2>
    <p style="margin: 0 0 8px; color: #1a1a1a;">Hi <strong>${escapeHtml(data.contactName)}</strong>,</p>
    <p style="margin: 0 0 16px; color: #1a1a1a;">Thanks for your interest in working with us! To complete your inquiry for a <strong>${escapeHtml(data.recommendedVideoType)}</strong> video project, please verify your email address.</p>

    <div style="background: linear-gradient(135deg, rgba(217,70,239,0.1), rgba(139,92,246,0.1), rgba(59,130,246,0.1)); padding: 20px; border-radius: 12px; margin: 30px 0; text-align: center;">
      <p style="margin: 0 0 15px 0; color: #4b5563;">Click the button below to verify and create your account:</p>
      <a href="${data.magicLink}" style="background: linear-gradient(135deg, #D946EF, #8B5CF6, #3B82F6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email & Continue</a>
    </div>

    <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;"><strong>What happens next?</strong></p>
      <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #4b5563; font-size: 14px;">
        <li>Your email will be verified</li>
        <li>We'll create your client portal account</li>
        <li>Your inquiry will be sent to our team</li>
        <li>We'll prepare a custom proposal for you</li>
      </ul>
    </div>

    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 30px;">
      This link will expire in 24 hours. If you didn't submit an inquiry, you can safely ignore this email.
    </p>
  `;

  return sendEmail({
    to: data.to,
    subject: `Verify your email to complete your video project inquiry`,
    html: emailWrapper(content),
  });
}

export async function sendProposalNotificationEmail(data: {
  to: string;
  clientName: string;
  inquiryNumber: string;
  proposalUrl: string;
  totalPrice: string;
  currency: string;
  deliverableCount: number;
}) {
  const content = `
    <h2 style="color: #7c3aed; text-align: center; margin: 0 0 16px;">Your Proposal is Ready!</h2>
    <p style="margin: 0 0 8px; color: #1a1a1a;">Hi <strong>${escapeHtml(data.clientName)}</strong>,</p>
    <p style="margin: 0 0 16px; color: #1a1a1a;">Great news! We've reviewed your video project inquiry (<strong>${escapeHtml(data.inquiryNumber)}</strong>) and prepared a custom proposal for you.</p>

    <div style="background: linear-gradient(135deg, rgba(217,70,239,0.1), rgba(139,92,246,0.1), rgba(59,130,246,0.1)); padding: 24px; border-radius: 12px; margin: 30px 0;">
      <div style="text-align: center; margin-bottom: 16px;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">Proposal Summary</p>
        <p style="margin: 8px 0 0 0; font-size: 28px; font-weight: bold; color: #111827;">${data.currency} ${data.totalPrice}</p>
        <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">${data.deliverableCount} deliverable${data.deliverableCount > 1 ? 's' : ''}</p>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.proposalUrl}" style="background: linear-gradient(135deg, #D946EF, #8B5CF6, #3B82F6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Review Your Proposal</a>
    </div>

    <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
      <p style="margin: 0; font-size: 14px; color: #166534;"><strong>You can:</strong></p>
      <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #15803d; font-size: 14px;">
        <li>Accept and proceed to payment</li>
        <li>Request changes to the scope or pricing</li>
        <li>Decline if it's not the right fit</li>
      </ul>
    </div>

    <p style="color: #6b7280; font-size: 14px; margin: 0;">
      Have questions? Simply reply to this email or reach out at <a href="mailto:hello@motionify.com" style="color: #7c3aed;">hello@motionify.com</a>.
    </p>
  `;

  return sendEmail({
    to: data.to,
    subject: `Your video project proposal is ready - ${data.inquiryNumber}`,
    html: emailWrapper(content),
  });
}

export async function sendNewInquiryNotificationEmail(data: {
  to: string;
  inquiryNumber: string;
  clientName: string;
  clientEmail: string;
  companyName?: string;
  recommendedVideoType: string;
  portalUrl: string;
}) {
  const content = `
    <h2 style="color: #16a34a; text-align: center; margin: 0 0 16px;">New Inquiry Received!</h2>
    <p style="margin: 0 0 16px; color: #1a1a1a;">A new project inquiry has been verified and submitted.</p>

    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">Inquiry Number:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #111827;">${escapeHtml(data.inquiryNumber)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Client Name:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #111827;">${escapeHtml(data.clientName)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Email:</td>
          <td style="padding: 8px 0; color: #111827;">${escapeHtml(data.clientEmail)}</td>
        </tr>
        ${data.companyName ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Company:</td>
          <td style="padding: 8px 0; color: #111827;">${escapeHtml(data.companyName)}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Video Type:</td>
          <td style="padding: 8px 0; color: #111827;">${escapeHtml(data.recommendedVideoType)}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.portalUrl}/#/admin/inquiries" style="background: linear-gradient(135deg, #D946EF, #8B5CF6, #3B82F6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View in Portal</a>
    </div>

    <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
      Log in to the admin portal to review the inquiry and create a proposal.
    </p>
  `;

  return sendEmail({
    to: data.to,
    subject: `New Inquiry: ${data.inquiryNumber} - ${data.clientName}`,
    html: emailWrapper(content),
  });
}

export async function sendCommentNotificationEmail(data: {
  to: string;
  commenterName: string;
  commenterRole: 'client' | 'admin';
  commentPreview: string;
  proposalId: string;
  proposalNumber?: string;
}) {
  const roleLabel = data.commenterRole === 'client' ? 'Client' : 'Admin';
  const proposalDisplay = data.proposalNumber ? `Proposal ${data.proposalNumber}` : 'your proposal';
  const proposalUrl = `${process.env.URL || 'http://localhost:3000'}/proposal/${data.proposalId}`;

  const content = `
    <h2 style="color: #7c3aed; text-align: center; margin: 0 0 16px;">New Comment on Your Proposal</h2>
    <p style="margin: 0 0 16px; color: #1a1a1a;">A ${roleLabel.toLowerCase()} has commented on ${proposalDisplay}.</p>

    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;"><strong>${escapeHtml(data.commenterName)}</strong> (${roleLabel}) wrote:</p>
      <p style="margin: 0; color: #111827;">"${escapeHtml(data.commentPreview)}"</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${proposalUrl}" style="background: linear-gradient(135deg, #D946EF, #8B5CF6, #3B82F6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reply on Portal</a>
    </div>
  `;

  return sendEmail({
    to: data.to,
    subject: `[${roleLabel}] New comment on your proposal`,
    html: emailWrapper(content),
  });
}

export async function sendPaymentFailureNotificationEmail(data: {
  to: string;
  orderId: string;
  paymentId?: string;
  errorCode?: string;
  errorDescription?: string;
  proposalId?: string;
}) {
  const portalUrl = process.env.URL || 'http://localhost:5173';
  const actionUrl = data.proposalId
    ? `${portalUrl}/#/admin/proposals/${data.proposalId}`
    : `${portalUrl}/#/admin/payments`;

  const content = `
    <h2 style="color: #dc2626; text-align: center; margin: 0 0 16px;">Payment Verification Failed</h2>
    <p style="margin: 0 0 16px; color: #1a1a1a;">A payment verification has failed and requires attention.</p>

    <div style="background-color: #fef2f2; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #dc2626;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">Order ID:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #111827;">${data.orderId}</td>
        </tr>
        ${data.paymentId ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Payment ID:</td>
          <td style="padding: 8px 0; color: #111827;">${data.paymentId}</td>
        </tr>
        ` : ''}
        ${data.errorCode ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Error Code:</td>
          <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">${data.errorCode}</td>
        </tr>
        ` : ''}
        ${data.errorDescription ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Error:</td>
          <td style="padding: 8px 0; color: #111827;">${data.errorDescription}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Time:</td>
          <td style="padding: 8px 0; color: #111827;">${new Date().toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${actionUrl}" style="background: linear-gradient(135deg, #D946EF, #8B5CF6, #3B82F6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View in Admin Portal</a>
    </div>

    <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
      This is an automated notification. Please investigate the failed payment.
    </p>
  `;

  return sendEmail({
    to: data.to,
    subject: `[ALERT] Payment Failed - Order ${data.orderId}`,
    html: emailWrapper(content),
  });
}

export async function sendPaymentSuccessEmail(data: {
  to: string;
  clientName: string;
  projectNumber: string;
  amount: string;
  currency: string;
  paymentType: 'advance' | 'balance';
  projectUrl: string;
}) {
  const paymentTypeLabel = data.paymentType === 'advance' ? 'Advance Payment' : 'Balance Payment';

  const content = `
    <h2 style="color: #16a34a; text-align: center; margin: 0 0 16px;">Payment Successful!</h2>
    <p style="margin: 0 0 8px; color: #1a1a1a;">Hi <strong>${escapeHtml(data.clientName)}</strong>,</p>
    <p style="margin: 0 0 16px; color: #1a1a1a;">Thank you! Your ${paymentTypeLabel.toLowerCase()} for project <strong>${escapeHtml(data.projectNumber)}</strong> has been received.</p>

    <div style="background-color: #f0fdf4; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #16a34a;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">Amount Paid:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #166534; font-size: 18px;">${data.currency} ${data.amount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Payment Type:</td>
          <td style="padding: 8px 0; color: #111827;">${paymentTypeLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Project:</td>
          <td style="padding: 8px 0; color: #111827;">${data.projectNumber}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.projectUrl}" style="background: linear-gradient(135deg, #D946EF, #8B5CF6, #3B82F6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View Project</a>
    </div>

    <p style="color: #6b7280; font-size: 14px; margin: 0;">
      If you have any questions, please contact us at <a href="mailto:billing@motionify.studio" style="color: #7c3aed;">billing@motionify.studio</a>.
    </p>
  `;

  return sendEmail({
    to: data.to,
    subject: `Payment Confirmed - ${data.projectNumber} (${data.currency} ${data.amount})`,
    html: emailWrapper(content),
  });
}

export async function sendProjectInvitationEmail(data: {
  to: string;
  inviteLink: string;
  projectName: string;
  role: string;
  invitedByName: string;
  expiresInDays?: number;
}) {
  const roleLabels: Record<string, string> = {
    client: 'Client',
    team_member: 'Team Member',
    support: 'Motionify Support',
  };
  const roleLabel = roleLabels[data.role] || data.role;
  const expiryDays = data.expiresInDays || 7;

  const content = `
    <h2 style="color: #7c3aed; text-align: center; margin: 0 0 16px;">You're Invited to a Project</h2>
    <p style="margin: 0 0 8px; color: #1a1a1a;">Hi there,</p>
    <p style="margin: 0 0 16px; color: #1a1a1a;"><strong>${escapeHtml(data.invitedByName)}</strong> has invited you to join the project <strong>${escapeHtml(data.projectName)}</strong> as a <strong>${escapeHtml(roleLabel)}</strong>.</p>

    <div style="background: linear-gradient(135deg, rgba(217,70,239,0.1), rgba(139,92,246,0.1), rgba(59,130,246,0.1)); padding: 24px; border-radius: 12px; margin: 30px 0; text-align: center;">
      <p style="margin: 0 0 15px 0; color: #4b5563;">Click the button below to accept the invitation:</p>
      <a href="${data.inviteLink}" style="background: linear-gradient(135deg, #D946EF, #8B5CF6, #3B82F6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Accept Invitation</a>
    </div>

    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      This invitation will expire in ${expiryDays} days. If you didn't expect this invitation, you can safely ignore this email.
    </p>
  `;

  return sendEmail({
    to: data.to,
    subject: `You're invited to ${data.projectName} on Motionify`,
    html: emailWrapper(content),
  });
}

export async function sendProposalStatusChangeEmail(data: {
  to: string;
  recipientName: string;
  proposalId: string;
  proposalTitle: string;
  newStatus: 'sent' | 'accepted' | 'rejected' | 'changes_requested';
  isClientRecipient: boolean;
  changedBy?: string;
  feedback?: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const proposalUrl = `${appUrl}/proposal/${data.proposalId}`;

  // Map status to user-friendly labels
  const statusLabels = {
    sent: 'Awaiting Review',
    accepted: 'Accepted',
    rejected: 'Declined',
    changes_requested: 'Revision Requested',
  };

  // Define status-specific colors and messages
  const statusInfo = {
    sent: { color: '#f59e0b', bgColor: '#fef3c7', greeting: 'Your proposal has been sent' },
    accepted: { color: '#16a34a', bgColor: '#dcfce7', greeting: 'Great news!' },
    rejected: { color: '#dc2626', bgColor: '#fee2e2', greeting: 'Update on your proposal' },
    changes_requested: { color: '#ea580c', bgColor: '#ffedd5', greeting: 'Feedback received' },
  };

  const info = statusInfo[data.newStatus];
  const statusLabel = statusLabels[data.newStatus];

  // Email subject - prefix with [Client Response] for admin recipients
  const subjectPrefix = data.isClientRecipient ? '' : '[Client Response] ';
  const subject = `${subjectPrefix}Proposal ${statusLabel}: ${data.proposalTitle}`;

  // Dynamic message based on recipient and status
  let message = '';
  if (data.isClientRecipient) {
    if (data.newStatus === 'sent') {
      message = 'Your proposal is ready for review.';
    } else {
      message = `Your proposal status has been updated to <strong>${statusLabel}</strong>.`;
    }
  } else {
    message = `<strong>${escapeHtml(data.changedBy || 'Client')}</strong> has responded to the proposal with status: <strong>${escapeHtml(statusLabel)}</strong>.`;
  }

  const content = `
    <h2 style="color: ${info.color}; text-align: center; margin: 0 0 16px;">${info.greeting}</h2>
    <p style="margin: 0 0 8px; color: #1a1a1a;">Hi <strong>${escapeHtml(data.recipientName)}</strong>,</p>
    <p style="margin: 0 0 16px; color: #1a1a1a;">${message}</p>

    <div style="background-color: ${info.bgColor}; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid ${info.color};">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">Proposal:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #111827;">${escapeHtml(data.proposalTitle)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">New Status:</td>
          <td style="padding: 8px 0; color: ${info.color}; font-weight: bold;">${escapeHtml(statusLabel)}</td>
        </tr>
        ${data.feedback ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">Feedback:</td>
          <td style="padding: 8px 0; color: #111827;">${escapeHtml(data.feedback)}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${proposalUrl}" style="background: linear-gradient(135deg, #D946EF, #8B5CF6, #3B82F6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View Proposal</a>
    </div>

    <p style="color: #6b7280; font-size: 14px; margin: 0;">
      Have questions? Reply to this email or contact us at <a href="mailto:hello@motionify.com" style="color: #7c3aed;">hello@motionify.com</a>.
    </p>
  `;

  return sendEmail({
    to: data.to,
    subject,
    html: emailWrapper(content),
  });
}

/**
 * POST handler for cross-service email sending
 * Called by webhook handlers to send payment emails
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { type, ...data } = body;

    let result;
    switch (type) {
      case 'payment_failure':
        result = await sendPaymentFailureNotificationEmail({
          to: data.to || process.env.ADMIN_NOTIFICATION_EMAIL || '',
          orderId: data.data?.orderId || 'unknown',
          paymentId: data.data?.paymentId,
          errorCode: data.data?.errorCode,
          errorDescription: data.data?.errorDescription,
          proposalId: data.data?.proposalId,
        });
        break;

      case 'payment_success':
        result = await sendPaymentSuccessEmail({
          to: data.to,
          clientName: data.clientName,
          projectNumber: data.projectNumber,
          amount: data.amount,
          currency: data.currency,
          paymentType: data.paymentType,
          projectUrl: data.projectUrl,
        });
        break;

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Unknown email type: ${type}` }),
        };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, emailId: result?.id }),
    };
  } catch (error) {
    console.error('Send email handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email' }),
    };
  }
};
