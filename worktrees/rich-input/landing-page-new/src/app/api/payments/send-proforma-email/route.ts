import { NextRequest, NextResponse } from 'next/server';
import { readJSON, STORAGE_FILES } from '@/lib/storage';
import { generateInvoicePDF } from '@/lib/invoice/pdfGenerator';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const MOTIONIFY_COMPANY_DETAILS = {
  name: 'Motionify',
  address: '123 Business Park, Tech City, India',
  email: 'invoices@motionify.ai',
  phone: '+91 98765 43210',
  gstin: '22AAAAA0000A1Z5',
  website: 'https://motionify.ai',
};

const BANK_DETAILS = {
  bankName: 'HDFC Bank',
  accountNumber: '50200012345678',
  ifscCode: 'HDFC0001234',
  accountHolderName: 'Motionify Technologies Pvt Ltd',
};

type ProposalStatus = 'sent' | 'accepted' | 'rejected' | 'changes_requested';

interface ProposalDeliverable {
  id: string;
  name: string;
  description: string;
  estimatedCompletionWeek: number;
}

interface Proposal {
  id: string;
  inquiryId: string;
  status: ProposalStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  description: string;
  deliverables: ProposalDeliverable[];
  currency: 'INR' | 'USD';
  totalPrice: number;
  advancePercentage: number;
  advanceAmount: number;
  balanceAmount: number;
}

type InquiryStatus = 'new' | 'reviewing' | 'proposal_sent' | 'negotiating' | 'accepted' | 'project_setup' | 'payment_pending' | 'paid' | 'converted' | 'rejected' | 'archived';

interface Inquiry {
  id: string;
  inquiryNumber: string;
  status: InquiryStatus;
  createdAt: string;
  updatedAt: string;
  contactName: string;
  contactEmail: string;
  companyName?: string;
  contactPhone?: string;
  projectNotes?: string;
}

function generateProformaNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PROF-${year}-${random}`;
}

function calculateDueDate(daysFromNow: number = 15): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}

async function sendEmailWithResend(
  to: string,
  invoiceNumber: string,
  customerName: string,
  pdfBase64?: string
): Promise<{ success: boolean; messageId?: string; error?: Error }> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  if (!RESEND_API_KEY) {
    console.log('[EmailService] RESEND_API_KEY not configured, skipping email send');
    return { 
      success: true, 
      messageId: `mock-${Date.now()}`,
      error: undefined
    };
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_API_KEY);

    const attachments = pdfBase64 ? [
      {
        filename: `proforma-${invoiceNumber}.pdf`,
        content: pdfBase64,
        contentType: 'application/pdf',
      },
    ] : undefined;

    const result = await resend.emails.send({
      from: `Motionify <invoices@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
      to: [to],
      subject: `Proforma Invoice #${invoiceNumber} - Motionify`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7C3AED, #8B5CF6); padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Motionify</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Proforma Invoice</p>
          </div>
          <div style="background: #ffffff; padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #1f2937; font-size: 16px; margin-bottom: 24px;">Dear ${customerName},</p>
            <p style="color: #4b5563; margin-bottom: 24px;">Please find attached the proforma invoice #${invoiceNumber} for your review.</p>
            <p style="color: #4b5563; margin-bottom: 32px;">This proforma invoice is valid for 15 days from the date of issue. After this date, prices and availability may change.</p>
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://motionify.ai'}" 
                 style="display: inline-block; background: linear-gradient(135deg, #7C3AED, #8B5CF6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
                Complete Payment
              </a>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 13px;">
            <p>Questions? Contact us at invoices@motionify.ai</p>
            <p>&copy; ${new Date().getFullYear()} Motionify. All rights reserved.</p>
          </div>
        </div>
      `,
      attachments,
    });

    if (result.error) {
      return { success: false, error: new Error(result.error.message) };
    }

    return { success: true, messageId: result.data?.id };
  } catch (err) {
    console.error('[EmailService] Error sending email:', err);
    return { success: false, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, customerName, invoiceNumber: providedInvoiceNumber, proposalId } = body;

    if (!to || !proposalId) {
      return NextResponse.json(
        { error: 'Missing required fields: to and proposalId are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const proposals = await readJSON<Proposal>(STORAGE_FILES.PROPOSALS);
    const proposal = proposals.find(p => p.id === proposalId);

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const inquiries = await readJSON<Inquiry>(STORAGE_FILES.INQUIRIES);
    const inquiry = inquiries.find(i => i.id === proposal.inquiryId);

    if (!inquiry) {
      return NextResponse.json(
        { error: 'Inquiry not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const invoiceNumber = providedInvoiceNumber || generateProformaNumber();
    const dueDate = calculateDueDate(15);

    const subtotal = proposal.totalPrice;
    const lineItems = proposal.deliverables.map((deliverable) => ({
      description: deliverable.name,
      quantity: 1,
      unitPrice: Math.round(subtotal / proposal.deliverables.length),
      amount: Math.round(subtotal / proposal.deliverables.length),
    }));

    let pdfBase64 = undefined;
    try {
      const pdfBlob = await generateInvoicePDF({
        invoiceNumber,
        invoiceDate: new Date().toISOString(),
        dueDate: dueDate.toISOString(),
        companyDetails: MOTIONIFY_COMPANY_DETAILS,
        clientDetails: {
          name: inquiry.contactName,
          companyName: inquiry.companyName,
          email: inquiry.contactEmail,
          phone: inquiry.contactPhone,
        },
        lineItems: lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          rate: item.unitPrice,
          amount: item.amount,
        })),
        subtotal,
        taxRate: 0,
        taxAmount: 0,
        total: subtotal,
        currency: proposal.currency,
        paymentTerms: '50% advance payment required to start the project.',
        notes: 'This is a proforma invoice for advance payment.',
        bankDetails: BANK_DETAILS,
        razorpayDetails: {
          keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_xxxxxxxx',
        },
      });

      const buffer = await pdfBlob.arrayBuffer();
      pdfBase64 = Buffer.from(buffer).toString('base64');
    } catch (pdfError) {
      console.error('Error generating PDF for email:', pdfError);
    }

    const result = await sendEmailWithResend(
      to,
      invoiceNumber,
      customerName || inquiry.contactName,
      pdfBase64
    );

    if (!result.success) {
      console.error('Failed to send proforma email:', result.error);
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error?.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('Proforma invoice email sent:', {
      to,
      invoiceNumber,
      messageId: result.messageId,
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      invoiceNumber,
    }, { status: 200, headers: corsHeaders });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending proforma email:', message);
    return NextResponse.json(
      { error: 'Failed to send proforma email', message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
