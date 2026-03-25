import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReceiptRequest {
  paymentId: string;
  projectId?: string;
  projectNumber?: string;
  paymentDetails?: {
    id: string;
    amount: number;
    currency: string;
    paymentType: string;
    razorpayPaymentId: string;
    paidAt: string;
  };
  projectDetails?: {
    id: string;
    projectNumber: string;
    companyName: string;
    clientName: string;
    projectName: string;
    startDate: string;
    estimatedCompletion: string;
  };
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(amount / 100);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

async function generateInvoicePdf(
  paymentDetails: ReceiptRequest['paymentDetails'],
  projectDetails: ReceiptRequest['projectDetails']
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new jsPDF();
      const primaryColor: [number, number, number] = [124, 58, 237];

      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 45, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('Motionify', 20, 25);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Premium Video Production', 20, 35);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT RECEIPT', 150, 28);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Receipt Date: ${formatDate(paymentDetails?.paidAt || new Date().toISOString())}`, 150, 38);

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Confirmed!', 20, 65);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Thank you for your payment. This is your official receipt.', 20, 73);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Bill To', 20, 95);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(projectDetails?.clientName || 'Valued Client', 20, 103);
      if (projectDetails?.companyName) {
        doc.text(projectDetails.companyName, 20, 110);
      }

      const invoiceNumber = `${(paymentDetails?.id || 'INV').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      doc.text(`Invoice #: ${invoiceNumber}`, 130, 95);
      doc.text(`Project #: ${projectDetails?.projectNumber || 'N/A'}`, 130, 103);
      doc.text(`Transaction ID: ${paymentDetails?.razorpayPaymentId || 'N/A'}`, 130, 111);

      const lineItems: InvoiceItem[] = [
        {
          description: `${projectDetails?.projectName || 'Video Production Project'} - Advance Payment`,
          quantity: 1,
          unitPrice: paymentDetails?.amount || 0,
          amount: paymentDetails?.amount || 0
        }
      ];

      autoTable(doc, {
        startY: 130,
        head: [['Description', 'Qty', 'Unit Price', 'Amount']],
        body: lineItems.map(item => [
          item.description,
          item.quantity.toString(),
          formatCurrency(item.unitPrice, paymentDetails?.currency || 'USD'),
          formatCurrency(item.amount, paymentDetails?.currency || 'USD')
        ]),
        theme: 'striped',
        headStyles: {
          fillColor: [124, 58, 237] as [number, number, number],
          textColor: [255, 255, 255] as [number, number, number],
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 5
        },
        columnStyles: {
          0: { cellWidth: 90 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 35, halign: 'right' }
        }
      });

      const docWithTable = doc as unknown as { lastAutoTable: { finalY: number } };
      const finalY = docWithTable.lastAutoTable?.finalY || 180;

      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const tax = 0;
      const total = subtotal + tax;

      const summaryX = 130;
      let summaryY = finalY + 10;

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Subtotal:', summaryX, summaryY);
      doc.text(formatCurrency(subtotal, paymentDetails?.currency || 'USD'), 190, summaryY, { align: 'right' });

      summaryY += 7;
      doc.text('Tax:', summaryX, summaryY);
      doc.text(formatCurrency(tax, paymentDetails?.currency || 'USD'), 190, summaryY, { align: 'right' });

      summaryY += 10;
      doc.setFillColor(124, 58, 237);
      doc.roundedRect(summaryX - 5, summaryY - 5, 65, 12, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Total Paid:', summaryX + 2, summaryY + 3);
      doc.text(formatCurrency(total, paymentDetails?.currency || 'USD'), 190, summaryY + 3, { align: 'right' });

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Payment Method: Razorpay (Online Transfer)', 20, 250);
      doc.text(`Payment Status: Completed`, 20, 257);

      doc.setDrawColor(200, 200, 200);
      doc.line(20, 265, 190, 265);

      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Thank you for choosing Motionify for your video production needs!', 105, 275, { align: 'center' });
      doc.text('This is a computer-generated receipt. No signature required.', 105, 282, { align: 'center' });
      doc.text(`Generated on ${formatDate(new Date().toISOString())} | Motionify | hello@motionify.com`, 105, 289, { align: 'center' });

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      resolve(pdfBuffer);
    } catch (error) {
      reject(error);
    }
  });
}

async function sendPaymentReceiptEmail(
  to: string,
  customerName: string,
  invoiceNumber: string,
  amount: number,
  currency: string,
  pdfBuffer: Buffer
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Confirmation - Motionify</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <div style="background: linear-gradient(135deg, #7c3aed, #8b5cf6); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">Motionify</h1>
            <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin: 8px 0 0 0;">Payment Confirmation</p>
          </div>

          <div style="padding: 32px 24px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">Payment Received!</h2>
              <p style="color: #6b7280; margin: 0;">Your payment has been successfully processed</p>
            </div>

            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
              Dear ${customerName},
            </p>

            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
              Thank you for your payment. We're excited to confirm that we've received your payment successfully. 
              A detailed invoice has been attached to this email for your records.
            </p>

            <div style="background-color: #f8fafc; border-left: 4px solid #7c3aed; padding: 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
              <p style="color: #7c3aed; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;">Payment Details</p>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-size: 14px;">Invoice Number</span>
                <span style="color: #1f2937; font-size: 14px; font-weight: 600;">#${invoiceNumber}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-size: 14px;">Amount Paid</span>
                <span style="color: #1f2937; font-size: 14px; font-weight: 600;">${formatCurrency(amount, currency)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span style="color: #6b7280; font-size: 14px;">Status</span>
                <span style="color: #22c55e; font-size: 14px; font-weight: 600;">✓ Completed</span>
              </div>
            </div>

            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 32px;">
              If you have any questions about this transaction or your project, please don't hesitate to reach out to us.
            </p>

            <div style="text-align: center;">
              <a href="https://motionify.ai/portal/dashboard" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #8b5cf6); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; transition: transform 0.2s, box-shadow 0.2s;">
                View Your Dashboard
              </a>
            </div>
          </div>

          <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0;">
              Questions about this invoice? We're here to help.
            </p>
            <p style="color: #7c3aed; font-size: 13px; margin: 0;">
              <a href="mailto:hello@motionify.com" style="color: #7c3aed; text-decoration: none; font-weight: 500;">hello@motionify.com</a>
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0 0;">
              © ${new Date().getFullYear()} Motionify. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: `Motionify <invoices@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
      to: [to],
      subject: `Payment Confirmed - Invoice #${invoiceNumber}`,
      html: htmlContent,
      attachments: [
        {
          filename: `invoice-${invoiceNumber}.pdf`,
          content: pdfBuffer.toString('base64'),
          contentType: 'application/pdf'
        }
      ]
    });

    if (error) {
      console.error('[SendReceipt] Resend API error:', error);
      return { success: false, error: error.message };
    }

    console.log('[SendReceipt] Email sent successfully:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SendReceipt] Error sending email:', error);
    return { success: false, error: errorMessage };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ReceiptRequest = await request.json();
    const { paymentId, paymentDetails, projectDetails } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('[SendReceipt] RESEND_API_KEY not configured, skipping email send');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const customerEmail = body.paymentDetails?.razorpayPaymentId ? 
      `${paymentId}@placeholder.com` : 'hello@motionify.com';

    const customerName = projectDetails?.clientName || 'Valued Client';
    const invoiceNumber = `${paymentId.substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const amount = paymentDetails?.amount || 0;
    const currency = paymentDetails?.currency || 'USD';

    const pdfBuffer = await generateInvoicePdf(paymentDetails, projectDetails);

    const result = await sendPaymentReceiptEmail(
      customerEmail,
      customerName,
      invoiceNumber,
      amount,
      currency,
      pdfBuffer
    );

    if (!result.success) {
      console.error('[SendReceipt] Failed to send receipt email:', result.error);
      return NextResponse.json(
        { error: 'Failed to send receipt email', details: result.error },
        { status: 500 }
      );
    }

    console.log('[SendReceipt] Receipt sent successfully for payment:', paymentId);

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      invoiceNumber,
      pdfSize: pdfBuffer.length
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SendReceipt] Error processing receipt request:', error);

    return NextResponse.json(
      { error: 'Failed to process receipt request', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Payment receipt API - Use POST to send receipts',
    endpoints: {
      POST: 'Send payment receipt email with PDF attachment'
    }
  });
}
