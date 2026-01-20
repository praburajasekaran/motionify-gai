import { Resend } from 'resend';

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

// From email - use Resend's default domain for development, or your verified domain
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Motionify <onboarding@resend.dev>';

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
  taskUrl: string; // URL to the task (e.g., localhost:5173/projects/123?task=456)
}) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <h2 style="color: #7c3aed;">You were mentioned in a comment</h2>
      <p><strong>${data.mentionedByName}</strong> mentioned you in <strong>${data.taskTitle}</strong>:</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
        "${data.commentContent}"
      </div>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${data.taskUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Comment</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        Motionify Notifier
      </p>
    </div>
  `;

  return sendEmail({
    to: data.to,
    subject: `You were mentioned in "${data.taskTitle}"`,
    html,
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
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <h2 style="color: #7c3aed;">New Task Assignment</h2>
      <p>Hi <strong>${data.assigneeName}</strong>,</p>
      <p>You have been assigned to a new task in project <strong>${data.projectNumber}</strong>:</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
        <h3 style="margin-top: 0; color: #111827;">${data.taskTitle}</h3>
        ${data.dueDate ? `<p style="margin-bottom: 0; color: #6b7280;">Due: ${new Date(data.dueDate).toLocaleDateString()}</p>` : ''}
      </div>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${data.taskUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Task</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        Motionify Notifier
      </p>
    </div>
  `;

  return sendEmail({
    to: data.to,
    subject: `Assigned to task: ${data.taskTitle}`,
    html,
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
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <h2 style="color: #7c3aed;">Deliverable Ready for Review</h2>
      <p>Hi <strong>${data.clientName}</strong>,</p>
      <p>A new deliverable is ready for your review in project <strong>${data.projectNumber}</strong>:</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
        <h3 style="margin-top: 0; color: #111827;">${data.deliverableName}</h3>
        ${data.deliveryNotes ? `<p style="margin-top: 10px; color: #4b5563;"><strong>Note from team:</strong><br>${data.deliveryNotes}</p>` : ''}
      </div>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${data.deliverableUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Review & Approve</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        Motionify Notifier
      </p>
    </div>
  `;

  return sendEmail({
    to: data.to,
    subject: `Ready for Review: ${data.deliverableName} (${data.projectNumber})`,
    html,
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
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <h2 style="color: #7c3aed;">Revision Requested</h2>
      <p>Hi Team,</p>
      <p><strong>${data.requestedBy}</strong> has requested a revision on <strong>${data.taskTitle}</strong> in project <strong>${data.projectName}</strong>.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
        <p style="margin: 0; color: #4b5563;"><strong>Revision Status:</strong> ${data.revisionCount}</p>
      </div>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${data.taskUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Task & Feedback</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        Motionify Notifier
      </p>
    </div>
  `;

  return sendEmail({
    to: data.to,
    subject: `Revision Requested: ${data.taskTitle} (${data.projectName})`,
    html,
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
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <h2 style="color: #7c3aed;">Final Deliverable Ready</h2>
      <p>Hi <strong>${data.clientName}</strong>,</p>
      <p>Thank you for your payment! The final files for <strong>${data.deliverableName}</strong> in project <strong>${data.projectNumber}</strong> are now ready for download.</p>
      
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
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        Motionify Notifier
      </p>
    </div>
  `;

  return sendEmail({
    to: data.to,
    subject: `Final Files Ready: ${data.deliverableName} (${data.projectNumber})`,
    html,
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
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <h2 style="color: #dc2626;">Payment Reminder</h2>
      <p>Hi <strong>${data.clientName}</strong>,</p>
      <p>This is a friendly reminder that your balance payment for project <strong>${data.projectNumber}</strong> is still pending.</p>
      
      <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <h3 style="margin-top: 0; color: #991b1b;">Outstanding Balance</h3>
        <p style="font-size: 24px; font-weight: bold; color: #dc2626; margin: 10px 0;">${data.currency} ${data.amount}</p>
        <p style="margin-bottom: 0; color: #7f1d1d;">Payment has been pending for ${data.daysOverdue} days</p>
      </div>
      
      <p style="color: #4b5563;">Your final deliverables are ready and will be available for download once payment is complete.</p>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${data.paymentUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Pay Now</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        If you have already made this payment, please disregard this email. If you have any questions, please contact us at billing@motionify.studio.
      </p>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        Motionify Billing
      </p>
    </div>
  `;

  return sendEmail({
    to: data.to,
    subject: `Payment Reminder: ${data.projectNumber} - ${data.currency} ${data.amount} Outstanding`,
    html,
  });
}

export async function sendInquiryVerificationEmail(data: {
  to: string;
  contactName: string;
  magicLink: string;
  recommendedVideoType: string;
}) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #D946EF, #8B5CF6, #3B82F6); padding: 12px 20px; border-radius: 12px;">
          <span style="color: white; font-size: 24px; font-weight: bold;">Motionify</span>
        </div>
      </div>
      
      <h2 style="color: #7c3aed; text-align: center;">Verify Your Email</h2>
      <p>Hi <strong>${data.contactName}</strong>,</p>
      <p>Thanks for your interest in working with us! To complete your inquiry for a <strong>${data.recommendedVideoType}</strong> video project, please verify your email address.</p>
      
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
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Motionify Studio<br>
        <a href="https://motionify.com" style="color: #7c3aed;">motionify.com</a>
      </p>
    </div>
  `;

  return sendEmail({
    to: data.to,
    subject: `Verify your email to complete your video project inquiry`,
    html,
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
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #D946EF, #8B5CF6, #3B82F6); padding: 12px 20px; border-radius: 12px;">
          <span style="color: white; font-size: 24px; font-weight: bold;">Motionify</span>
        </div>
      </div>
      
      <h2 style="color: #7c3aed; text-align: center;">Your Proposal is Ready! 🎬</h2>
      <p>Hi <strong>${data.clientName}</strong>,</p>
      <p>Great news! We've reviewed your video project inquiry (<strong>${data.inquiryNumber}</strong>) and prepared a custom proposal for you.</p>
      
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
      
      <p style="color: #6b7280; font-size: 14px;">
        Have questions? Simply reply to this email or reach out at <a href="mailto:hello@motionify.com" style="color: #7c3aed;">hello@motionify.com</a>.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Motionify Studio<br>
        <a href="https://motionify.com" style="color: #7c3aed;">motionify.com</a>
      </p>
    </div>
  `;

  return sendEmail({
    to: data.to,
    subject: `Your video project proposal is ready - ${data.inquiryNumber}`,
    html,
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
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #D946EF, #8B5CF6, #3B82F6); padding: 12px 20px; border-radius: 12px;">
          <span style="color: white; font-size: 24px; font-weight: bold;">Motionify</span>
        </div>
      </div>
      
      <h2 style="color: #16a34a; text-align: center;">🎉 New Inquiry Received!</h2>
      <p>A new project inquiry has been verified and submitted.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 140px;">Inquiry Number:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #111827;">${data.inquiryNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Client Name:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #111827;">${data.clientName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Email:</td>
            <td style="padding: 8px 0; color: #111827;">${data.clientEmail}</td>
          </tr>
          ${data.companyName ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Company:</td>
            <td style="padding: 8px 0; color: #111827;">${data.companyName}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Video Type:</td>
            <td style="padding: 8px 0; color: #111827;">${data.recommendedVideoType}</td>
          </tr>
        </table>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.portalUrl}/#/admin/inquiries" style="background: linear-gradient(135deg, #D946EF, #8B5CF6, #3B82F6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View in Portal</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Log in to the admin portal to review the inquiry and create a proposal.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Motionify Admin Notifications
      </p>
    </div>
  `;

  return sendEmail({
    to: data.to,
    subject: `New Inquiry: ${data.inquiryNumber} - ${data.clientName}`,
    html,
  });
}
