import { NextRequest, NextResponse } from 'next/server';
import { readJSON, STORAGE_FILES } from '@/lib/storage';
import { generateInvoicePDF, InvoiceData } from '@/lib/invoice/pdfGenerator';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
  acceptedAt?: string;
  rejectedAt?: string;
  feedback?: string;
  editHistory?: Array<{ version: number; editedAt: string; reason?: string }>;
}

type InquiryStatus = 'new' | 'reviewing' | 'proposal_sent' | 'negotiating' | 'accepted' | 'project_setup' | 'payment_pending' | 'paid' | 'converted' | 'rejected' | 'archived';

interface QuizSelections {
  niche?: string | null;
  audience?: string | null;
  style?: string | null;
  mood?: string | null;
  duration?: string | null;
}

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
  quizAnswers: QuizSelections;
  recommendedVideoType: string;
  proposalId?: string;
  convertedToProjectId?: string;
  convertedAt?: string;
  assignedToAdminId?: string;
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

async function getProposalWithInquiry(proposalId: string): Promise<{
  proposal: Proposal;
  inquiry: Inquiry;
} | null> {
  const proposals = await readJSON<Proposal>(STORAGE_FILES.PROPOSALS);
  const proposal = proposals.find(p => p.id === proposalId);

  if (!proposal) {
    return null;
  }

  const inquiries = await readJSON<Inquiry>(STORAGE_FILES.INQUIRIES);
  const inquiry = inquiries.find(i => i.id === proposal.inquiryId);

  if (!inquiry) {
    return null;
  }

  return { proposal, inquiry };
}

function buildProformaInvoiceData(
  proposal: Proposal,
  inquiry: Inquiry,
  invoiceNumber: string
): InvoiceData {
  const subtotal = proposal.totalPrice;
  const taxRate = 0;
  const taxAmount = 0;

  const lineItems = proposal.deliverables.map((deliverable) => ({
    description: `${deliverable.name}${deliverable.description ? `\n${deliverable.description}` : ''}`,
    quantity: 1,
    rate: Math.round(subtotal / proposal.deliverables.length),
    amount: Math.round(subtotal / proposal.deliverables.length),
  }));

  return {
    invoiceNumber,
    invoiceDate: new Date().toISOString(),
    dueDate: calculateDueDate(15).toISOString(),
    companyDetails: MOTIONIFY_COMPANY_DETAILS,
    clientDetails: {
      name: inquiry.contactName,
      companyName: inquiry.companyName,
      email: inquiry.contactEmail,
      phone: inquiry.contactPhone,
      billingAddress: inquiry.projectNotes || undefined,
    },
    lineItems,
    subtotal,
    taxRate,
    taxAmount,
    total: subtotal + taxAmount,
    currency: proposal.currency,
    paymentTerms: `50% advance payment required to start the project. Balance due upon completion.`,
    notes: 'This is a proforma invoice for advance payment. Payment confirms acceptance of terms.',
    bankDetails: BANK_DETAILS,
    razorpayDetails: {
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_xxxxxxxx',
      paymentLink: `${process.env.NEXT_PUBLIC_APP_URL || 'https://motionify.ai'}/payments/proforma/${proposal.id}`,
    },
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    const { proposalId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    const data = await getProposalWithInquiry(proposalId);

    if (!data) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const { proposal, inquiry } = data;
    const invoiceNumber = generateProformaNumber();

    if (format === 'pdf') {
      const invoiceData = buildProformaInvoiceData(proposal, inquiry, invoiceNumber);
      const pdfBlob = await generateInvoicePDF(invoiceData);
      
      return new NextResponse(pdfBlob, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="proforma-${invoiceNumber}.pdf"`,
        },
      });
    }

    const invoiceData = buildProformaInvoiceData(proposal, inquiry, invoiceNumber);

    return NextResponse.json({
      invoiceNumber,
      invoiceDate: invoiceData.invoiceDate,
      dueDate: invoiceData.dueDate,
      proposalId: proposal.id,
      proposalDescription: proposal.description,
      companyDetails: invoiceData.companyDetails,
      clientDetails: invoiceData.clientDetails,
      lineItems: invoiceData.lineItems,
      pricing: {
        subtotal: invoiceData.subtotal,
        taxRate: invoiceData.taxRate,
        taxAmount: invoiceData.taxAmount,
        total: invoiceData.total,
        advancePercentage: proposal.advancePercentage,
        advanceAmount: proposal.advanceAmount,
        balanceAmount: proposal.balanceAmount,
        currency: proposal.currency,
      },
      paymentTerms: invoiceData.paymentTerms,
      notes: invoiceData.notes,
      bankDetails: invoiceData.bankDetails,
      razorpayDetails: invoiceData.razorpayDetails,
      paymentUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payments/proforma/${proposalId}`,
    }, { status: 200, headers: corsHeaders });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating proforma invoice:', message);
    return NextResponse.json(
      { error: 'Failed to generate proforma invoice', message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
