export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface ResendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  cc?: string[];
  bcc?: string[];
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface PaymentConfirmationData {
  to: string;
  customerName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: string;
  transactionId: string;
  invoicePdf?: string | Buffer;
  cc?: string[];
}

export interface ProformaInvoiceData {
  to: string;
  customerName: string;
  invoiceNumber: string;
  items: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  dueDate: string;
  companyName?: string;
  notes?: string;
  proformaPdf?: string | Buffer;
  cc?: string[];
}

export interface PaymentReminderData {
  to: string;
  customerName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysOverdue?: number;
  reminderCount?: number;
  invoicePdf?: string | Buffer;
  customMessage?: string;
  cc?: string[];
}

export interface EmailTemplateBase {
  customerName: string;
  companyName: string;
  websiteUrl: string;
  supportEmail: string;
  primaryColor: string;
}

export interface PaymentConfirmationTemplateData extends EmailTemplateBase {
  invoiceNumber: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: string;
  transactionId: string;
}

export interface ProformaInvoiceTemplateData extends EmailTemplateBase {
  invoiceNumber: string;
  items: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  dueDate: string;
  notes?: string;
}

export interface PaymentReminderTemplateData extends EmailTemplateBase {
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysOverdue?: number;
  reminderCount?: number;
  customMessage?: string;
}

export interface EmailConfig {
  resendApiKey?: string;
  resendDomain?: string;
  fromEmail?: string;
  fromName?: string;
  replyToEmail?: string;
  ccEmail?: string;
  bccEmail?: string;
}
