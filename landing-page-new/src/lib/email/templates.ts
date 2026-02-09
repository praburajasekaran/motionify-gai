import type {
  PaymentConfirmationTemplateData,
  ProformaInvoiceTemplateData,
  PaymentReminderTemplateData
} from './types';

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getTemplateStyles(primaryColor: string): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f3f4f6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .email-wrapper {
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, ${primaryColor}, #8b5cf6);
      padding: 32px 24px;
      text-align: center;
    }
    .header-subtitle {
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      margin-top: 8px;
    }
    .content {
      padding: 32px 24px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 16px;
    }
    .text {
      font-size: 15px;
      color: #4b5563;
      margin-bottom: 16px;
    }
    .highlight-box {
      background-color: #f8fafc;
      border-left: 4px solid ${primaryColor};
      padding: 20px;
      margin: 24px 0;
      border-radius: 0 8px 8px 0;
    }
    .highlight-title {
      font-size: 14px;
      font-weight: 600;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #6b7280;
      font-size: 14px;
    }
    .detail-value {
      font-weight: 600;
      color: #1f2937;
      font-size: 14px;
    }
    .total-box {
      background: linear-gradient(135deg, ${primaryColor}15, ${primaryColor}08);
      padding: 20px;
      margin-top: 24px;
      border-radius: 8px;
      text-align: center;
    }
    .total-label {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .total-amount {
      font-size: 32px;
      font-weight: 700;
      color: ${primaryColor};
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, ${primaryColor}, #8b5cf6);
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      margin: 24px 0;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px ${primaryColor}40;
    }
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
    }
    .invoice-table th {
      background-color: ${primaryColor};
      color: #ffffff;
      padding: 12px 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .invoice-table th:first-child {
      border-radius: 8px 0 0 0;
    }
    .invoice-table th:last-child {
      border-radius: 0 8px 0 0;
      text-align: right;
    }
    .invoice-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
      color: #4b5563;
    }
    .invoice-table td:last-child {
      text-align: right;
      font-weight: 600;
      color: #1f2937;
    }
    .invoice-table tr:last-child td {
      border-bottom: none;
    }
    .invoice-table .description {
      color: #1f2937;
      font-weight: 500;
    }
    .invoice-table .quantity {
      color: #6b7280;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer-text {
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .footer-link {
      color: ${primaryColor};
      text-decoration: none;
      font-weight: 500;
    }
    .footer-link:hover {
      text-decoration: underline;
    }
    .social-links {
      margin-top: 16px;
    }
    .social-link {
      display: inline-block;
      margin: 0 8px;
      color: #9ca3af;
      text-decoration: none;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-success {
      background-color: #dcfce7;
      color: #166534;
    }
    .badge-warning {
      background-color: #fef3c7;
      color: #92400e;
    }
    .badge-danger {
      background-color: #fee2e2;
      color: #991b1b;
    }
    .status-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .status-icon-success {
      background-color: #dcfce7;
      color: #22c55e;
    }
    .status-icon-warning {
      background-color: #fef3c7;
      color: #f59e0b;
    }
    .status-icon-danger {
      background-color: #fee2e2;
      color: #ef4444;
    }
    @media only screen and (max-width: 600px) {
      .container {
        padding: 12px;
      }
      .content {
        padding: 24px 16px;
      }
      .detail-row {
        flex-direction: column;
        gap: 4px;
      }
      .invoice-table th,
      .invoice-table td {
        padding: 10px 12px;
      }
      .total-amount {
        font-size: 24px;
      }
    }
  `;
}

export function paymentConfirmationTemplate(data: PaymentConfirmationTemplateData): string {
  const {
    customerName,
    invoiceNumber,
    amount,
    currency,
    paymentDate,
    paymentMethod,
    transactionId,
    companyName,
    websiteUrl,
    supportEmail,
    primaryColor
  } = data;

  const styles = getTemplateStyles(primaryColor);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmation</title>
  <style>${styles}</style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <div class="header">
        <img src="https://motionify.studio/motionify-light-logo.png" alt="${companyName}" width="180" style="display: inline-block;" />
        <div class="header-subtitle">Payment Confirmation</div>
      </div>
      
      <div class="content">
        <div class="status-icon status-icon-success">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        
        <h1 style="text-align: center; font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 8px;">
          Payment Received!
        </h1>
        <p style="text-align: center; color: #6b7280; margin-bottom: 24px;">
          Your payment has been successfully processed
        </p>
        
        <p class="greeting">Dear ${customerName},</p>
        
        <p class="text">
          Thank you for your payment. We're pleased to confirm that we've received your payment successfully. 
          This serves as your official receipt for the transaction.
        </p>
        
        <div class="highlight-box">
          <div class="highlight-title">Payment Details</div>
          <div class="detail-row">
            <span class="detail-label">Invoice Number</span>
            <span class="detail-value">#${invoiceNumber}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Amount Paid</span>
            <span class="detail-value">${formatCurrency(amount, currency)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Payment Date</span>
            <span class="detail-value">${formatDate(paymentDate)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Payment Method</span>
            <span class="detail-value">${paymentMethod}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Transaction ID</span>
            <span class="detail-value">${transactionId}</span>
          </div>
        </div>
        
        <p class="text">
          A detailed invoice has been attached to this email for your records. 
          If you have any questions about this transaction, please don't hesitate to reach out.
        </p>
        
        <div style="text-align: center;">
          <a href="${websiteUrl}" class="cta-button">View Your Account</a>
        </div>
      </div>
      
      <div class="footer">
        <p class="footer-text">
          Questions about this invoice? We're here to help.
        </p>
        <p class="footer-text">
          <a href="mailto:${supportEmail}" class="footer-link">${supportEmail}</a>
        </p>
        <div class="social-links">
          <a href="${websiteUrl}" class="social-link">Website</a>
          <span style="color: #d1d5db;">|</span>
          <a href="${websiteUrl}/support" class="social-link">Support</a>
        </div>
        <p class="footer-text" style="margin-top: 16px; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} ${companyName}. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function proformaInvoiceTemplate(data: ProformaInvoiceTemplateData): string {
  const {
    customerName,
    invoiceNumber,
    items,
    subtotal,
    tax,
    total,
    currency,
    dueDate,
    companyName,
    websiteUrl,
    supportEmail,
    primaryColor,
    notes
  } = data;

  const styles = getTemplateStyles(primaryColor);

  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td class="description">${item.description}</td>
      <td class="quantity">${item.quantity}</td>
      <td>${formatCurrency(item.unitPrice, currency)}</td>
      <td>${formatCurrency(item.amount, currency)}</td>
    </tr>
  `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proforma Invoice</title>
  <style>${styles}</style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <div class="header">
        <img src="https://motionify.studio/motionify-light-logo.png" alt="${companyName}" width="180" style="display: inline-block;" />
        <div class="header-subtitle">Proforma Invoice</div>
      </div>
      
      <div class="content">
        <p class="greeting">Dear ${customerName},</p>
        
        <p class="text">
          Please find below the proforma invoice for your recent order. This is a preliminary invoice 
          sent before payment processing.
        </p>
        
        <div class="highlight-box">
          <div class="highlight-title">Invoice Details</div>
          <div class="detail-row">
            <span class="detail-label">Invoice Number</span>
            <span class="detail-value">#${invoiceNumber}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Due Date</span>
            <span class="detail-value">${formatDate(dueDate)}</span>
          </div>
        </div>
        
        <table class="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="total-box">
          <div class="detail-row" style="border: none; padding: 4px 0;">
            <span class="detail-label">Subtotal</span>
            <span class="detail-value">${formatCurrency(subtotal, currency)}</span>
          </div>
          <div class="detail-row" style="border: none; padding: 4px 0;">
            <span class="detail-label">Tax</span>
            <span class="detail-value">${formatCurrency(tax, currency)}</span>
          </div>
          <div style="border-top: 2px solid ${primaryColor}; margin: 12px 0;"></div>
          <div class="total-label">Total Amount Due</div>
          <div class="total-amount">${formatCurrency(total, currency)}</div>
        </div>
        
        ${notes ? `<p class="text" style="margin-top: 16px;"><strong>Notes:</strong> ${notes}</p>` : ''}
        
        <p class="text" style="margin-top: 24px;">
          To proceed with this order, please complete the payment using the link provided in your account 
          or contact us for payment instructions.
        </p>
        
        <div style="text-align: center;">
          <a href="${websiteUrl}" class="cta-button">Complete Payment</a>
        </div>
        
        <p class="text" style="font-size: 13px; color: #9ca3af; margin-top: 16px;">
          This proforma invoice is valid until ${formatDate(dueDate)}. After this date, prices and availability may change.
        </p>
      </div>
      
      <div class="footer">
        <p class="footer-text">
          Ready to pay or have questions?
        </p>
        <p class="footer-text">
          <a href="mailto:${supportEmail}" class="footer-link">${supportEmail}</a>
        </p>
        <div class="social-links">
          <a href="${websiteUrl}" class="social-link">Website</a>
          <span style="color: #d1d5db;">|</span>
          <a href="${websiteUrl}/support" class="social-link">Support</a>
        </div>
        <p class="footer-text" style="margin-top: 16px; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} ${companyName}. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function paymentReminderTemplate(data: PaymentReminderTemplateData): string {
  const {
    customerName,
    invoiceNumber,
    amount,
    currency,
    dueDate,
    daysOverdue,
    reminderCount,
    companyName,
    websiteUrl,
    supportEmail,
    primaryColor,
    customMessage
  } = data;

  const styles = getTemplateStyles(primaryColor);
  
  const isOverdue = daysOverdue && daysOverdue > 0;
  const isFirstReminder = !reminderCount || reminderCount === 1;
  
  let statusBadge = '';
  let statusIcon = '';
  let statusTitle = '';
  let statusMessage = '';
  
  if (isOverdue) {
    statusBadge = '<span class="badge badge-danger">Payment Overdue</span>';
    statusIcon = `
      <div class="status-icon status-icon-danger">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
    `;
    statusTitle = 'Payment Overdue';
    statusMessage = `This invoice is now ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} past due.`;
  } else {
    statusBadge = '<span class="badge badge-warning">Payment Pending</span>';
    statusIcon = `
      <div class="status-icon status-icon-warning">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </div>
    `;
    statusTitle = isFirstReminder ? 'Payment Reminder' : 'Follow-up Reminder';
    statusMessage = isFirstReminder
      ? 'This is a friendly reminder that your payment is coming due.'
      : 'This is a follow-up reminder regarding your pending payment.';
  }

  const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder</title>
  <style>${styles}</style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <div class="header">
        <img src="https://motionify.studio/motionify-light-logo.png" alt="${companyName}" width="180" style="display: inline-block;" />
        <div class="header-subtitle">Payment Reminder</div>
      </div>
      
      <div class="content">
        ${statusIcon}
        
        <div style="text-align: center; margin-bottom: 24px;">
          ${statusBadge}
        </div>
        
        <h1 style="text-align: center; font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 8px;">
          ${statusTitle}
        </h1>
        <p style="text-align: center; color: #6b7280; margin-bottom: 24px;">
          ${statusMessage}
        </p>
        
        <p class="greeting">Dear ${customerName},</p>
        
        ${customMessage ? `<p class="text">${customMessage}</p>` : ''}
        
        <p class="text">
          ${isOverdue
            ? 'We kindly ask that you process this payment as soon as possible to avoid any service interruption.'
            : `This is a${isFirstReminder ? '' : 'nother'} reminder that payment for invoice #${invoiceNumber} is ${daysUntilDue > 0 ? `due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}` : 'due today'}.`
          }
        </p>
        
        <div class="highlight-box">
          <div class="highlight-title">Invoice Summary</div>
          <div class="detail-row">
            <span class="detail-label">Invoice Number</span>
            <span class="detail-value">#${invoiceNumber}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Amount Due</span>
            <span class="detail-value" style="color: ${isOverdue ? '#ef4444' : primaryColor}; font-size: 18px;">
              ${formatCurrency(amount, currency)}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">${isOverdue ? 'Days Overdue' : 'Due Date'}</span>
            <span class="detail-value">${formatDate(dueDate)}</span>
          </div>
          ${reminderCount && reminderCount > 1 ? `
          <div class="detail-row">
            <span class="detail-label">Reminder</span>
            <span class="detail-value">Reminder #${reminderCount}</span>
          </div>
          ` : ''}
        </div>
        
        <p class="text">
          Please find the detailed invoice attached to this email. If you have already made this payment, 
          please disregard this notice.
        </p>
        
        <div style="text-align: center;">
          <a href="${websiteUrl}" class="cta-button">${isOverdue ? 'Pay Now' : 'Complete Payment'}</a>
        </div>
        
        <p class="text" style="font-size: 13px; color: #9ca3af; margin-top: 16px;">
          If you have any questions or need to discuss payment arrangements, please don't hesitate to contact us.
        </p>
      </div>
      
      <div class="footer">
        <p class="footer-text">
          Need assistance with payment?
        </p>
        <p class="footer-text">
          <a href="mailto:${supportEmail}" class="footer-link">${supportEmail}</a>
        </p>
        <div class="social-links">
          <a href="${websiteUrl}" class="social-link">Website</a>
          <span style="color: #d1d5db;">|</span>
          <a href="${websiteUrl}/support" class="social-link">Support</a>
        </div>
        <p class="footer-text" style="margin-top: 16px; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} ${companyName}. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
