import { Resend } from 'resend';
import type {
  PaymentConfirmationData,
  ProformaInvoiceData,
  PaymentReminderData,
  EmailAttachment,
  ResendEmailOptions
} from './types';
import {
  paymentConfirmationTemplate,
  proformaInvoiceTemplate,
  paymentReminderTemplate
} from './templates';

const resend = new Resend(process.env.RESEND_API_KEY);

const MOTIONIFY_BRANDING = {
  companyName: 'Motionify',
  websiteUrl: 'https://motionify.ai',
  supportEmail: 'support@motionify.ai',
  logoUrl: 'https://motionify.studio/motionify-dark-logo.png',
  primaryColor: '#6366f1',
  secondaryColor: '#8b5cf6'
};

class EmailServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'EmailServiceError';
  }
}

async function sendEmail(options: ResendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: EmailServiceError }> {
  try {
    const { data, error } = await resend.emails.send({
      from: `Motionify <invoices@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: MOTIONIFY_BRANDING.supportEmail
    });

    if (error) {
      console.error('[EmailService] Failed to send email:', {
        to: options.to,
        subject: options.subject,
        error: error.message
      });
      return {
        success: false,
        error: new EmailServiceError(
          error.message,
          'RESEND_API_ERROR',
          error
        )
      };
    }

    console.log('[EmailService] Email sent successfully:', {
      to: options.to,
      subject: options.subject,
      messageId: data?.id
    });

    return {
      success: true,
      messageId: data?.id
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('[EmailService] Exception while sending email:', {
      to: options.to,
      subject: options.subject,
      error: errorMessage
    });

    return {
      success: false,
      error: new EmailServiceError(
        errorMessage,
        'EMAIL_SEND_EXCEPTION',
        err
      )
    };
  }
}

export async function sendPaymentConfirmationEmail(
  data: PaymentConfirmationData
): Promise<{ success: boolean; messageId?: string; error?: EmailServiceError }> {
  const { to, customerName, invoiceNumber, amount, currency, paymentDate, paymentMethod, transactionId, invoicePdf } = data;

  if (!to || !invoiceNumber || !amount) {
    return {
      success: false,
      error: new EmailServiceError(
        'Missing required fields: to, invoiceNumber, and amount are required',
        'VALIDATION_ERROR'
      )
    };
  }

  const attachments: EmailAttachment[] = [];

  if (invoicePdf) {
    attachments.push({
      filename: `invoice-${invoiceNumber}.pdf`,
      content: invoicePdf,
      contentType: 'application/pdf'
    });
  }

  const html = paymentConfirmationTemplate({
    customerName,
    invoiceNumber,
    amount,
    currency,
    paymentDate,
    paymentMethod,
    transactionId,
    companyName: MOTIONIFY_BRANDING.companyName,
    websiteUrl: MOTIONIFY_BRANDING.websiteUrl,
    supportEmail: MOTIONIFY_BRANDING.supportEmail,
    primaryColor: MOTIONIFY_BRANDING.primaryColor
  });

  return sendEmail({
    to,
    subject: `Payment Confirmed - Invoice #${invoiceNumber}`,
    html,
    attachments
  });
}

export async function sendProformaInvoiceEmail(
  data: ProformaInvoiceData
): Promise<{ success: boolean; messageId?: string; error?: EmailServiceError }> {
  const {
    to,
    customerName,
    invoiceNumber,
    items,
    subtotal,
    tax,
    total,
    currency,
    dueDate,
    companyName: companyNameOverride,
    notes,
    proformaPdf
  } = data;

  if (!to || !invoiceNumber || !items || items.length === 0) {
    return {
      success: false,
      error: new EmailServiceError(
        'Missing required fields: to, invoiceNumber, and items are required',
        'VALIDATION_ERROR'
      )
    };
  }

  const attachments: EmailAttachment[] = [];

  if (proformaPdf) {
    attachments.push({
      filename: `proforma-${invoiceNumber}.pdf`,
      content: proformaPdf,
      contentType: 'application/pdf'
    });
  }

  const html = proformaInvoiceTemplate({
    customerName,
    invoiceNumber,
    items,
    subtotal,
    tax,
    total,
    currency,
    dueDate,
    companyName: companyNameOverride || MOTIONIFY_BRANDING.companyName,
    websiteUrl: MOTIONIFY_BRANDING.websiteUrl,
    supportEmail: MOTIONIFY_BRANDING.supportEmail,
    primaryColor: MOTIONIFY_BRANDING.primaryColor,
    notes
  });

  return sendEmail({
    to,
    subject: `Proforma Invoice #${invoiceNumber} - Payment Due ${dueDate || 'Soon'}`,
    html,
    attachments
  });
}

export async function sendPaymentReminderEmail(
  data: PaymentReminderData
): Promise<{ success: boolean; messageId?: string; error?: EmailServiceError }> {
  const {
    to,
    customerName,
    invoiceNumber,
    amount,
    currency,
    dueDate,
    daysOverdue,
    reminderCount,
    invoicePdf,
    customMessage
  } = data;

  if (!to || !invoiceNumber || !amount || !dueDate) {
    return {
      success: false,
      error: new EmailServiceError(
        'Missing required fields: to, invoiceNumber, amount, and dueDate are required',
        'VALIDATION_ERROR'
      )
    };
  }

  const attachments: EmailAttachment[] = [];

  if (invoicePdf) {
    attachments.push({
      filename: `invoice-${invoiceNumber}.pdf`,
      content: invoicePdf,
      contentType: 'application/pdf'
    });
  }

  const html = paymentReminderTemplate({
    customerName,
    invoiceNumber,
    amount,
    currency,
    dueDate,
    daysOverdue,
    reminderCount,
    companyName: MOTIONIFY_BRANDING.companyName,
    websiteUrl: MOTIONIFY_BRANDING.websiteUrl,
    supportEmail: MOTIONIFY_BRANDING.supportEmail,
    primaryColor: MOTIONIFY_BRANDING.primaryColor,
    customMessage
  });

  const subject = daysOverdue && daysOverdue > 0
    ? `URGENT: Invoice #${invoiceNumber} - ${daysOverdue} Days Overdue`
    : reminderCount && reminderCount > 1
    ? `Reminder: Invoice #${invoiceNumber} - Payment Due Soon`
    : `Reminder: Invoice #${invoiceNumber} - Payment Due ${new Date(dueDate).toLocaleDateString()}`;

  return sendEmail({
    to,
    subject,
    html,
    attachments
  });
}

export async function sendBulkPaymentReminders(
  recipients: PaymentReminderData[]
): Promise<{ sent: number; failed: number; errors: Array<{ email: string; error: EmailServiceError }> }> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as Array<{ email: string; error: EmailServiceError }>
  };

  for (const recipient of recipients) {
    const result = await sendPaymentReminderEmail(recipient);
    if (result.success) {
      results.sent++;
    } else if (result.error) {
      results.failed++;
      results.errors.push({
        email: recipient.to,
        error: result.error
      });
    }
  }

  console.log('[EmailService] Bulk reminder results:', results);

  return results;
}

export function verifyResendConnection(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[EmailService] RESEND_API_KEY is not set');
      resolve(false);
      return;
    }

    resend.emails.list()
      .then(() => {
        console.log('[EmailService] Resend connection verified');
        resolve(true);
      })
      .catch((err) => {
        console.error('[EmailService] Resend connection failed:', err);
        resolve(false);
      });
  });
}
