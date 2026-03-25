import { NextRequest, NextResponse } from 'next/server';
import { readJSON, writeJSON, STORAGE_FILES } from '@/lib/storage';

export type InquiryStatus =
  | 'new'
  | 'reviewing'
  | 'proposal_sent'
  | 'negotiating'
  | 'accepted'
  | 'project_setup'
  | 'payment_pending'
  | 'paid'
  | 'converted'
  | 'rejected'
  | 'archived';

export interface QuizSelections {
  niche?: string;
  audience?: string;
  style?: string;
  mood?: string;
  duration?: string;
}

export interface Inquiry {
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function generateInquiryNumber(inquiries: Inquiry[]): string {
  const year = new Date().getFullYear();
  const currentYearInquiries = inquiries.filter(inq =>
    inq.inquiryNumber.startsWith(`INQ-${year}`)
  );

  let maxNumber = 0;
  currentYearInquiries.forEach(inq => {
    const match = inq.inquiryNumber.match(/INQ-\d{4}-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    }
  });

  const nextNumber = maxNumber + 1;
  return `INQ-${year}-${String(nextNumber).padStart(3, '0')}`;
}

export async function GET() {
  try {
    const inquiries = await readJSON<Inquiry>(STORAGE_FILES.INQUIRIES);
    
    inquiries.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return NextResponse.json(inquiries, { status: 200, headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching inquiries:', message);
    return NextResponse.json(
      { error: 'Failed to fetch inquiries', message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.contactName || body.contactName.trim() === '') {
      return NextResponse.json(
        { error: 'Contact name is required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    if (!body.contactEmail || body.contactEmail.trim() === '') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.contactEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const inquiries = await readJSON<Inquiry>(STORAGE_FILES.INQUIRIES);
    
    const inquiry: Inquiry = {
      id: body.id || crypto.randomUUID(),
      inquiryNumber: body.inquiryNumber || generateInquiryNumber(inquiries),
      status: body.status || 'new',
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      contactName: body.contactName.trim(),
      contactEmail: body.contactEmail.trim().toLowerCase(),
      companyName: body.companyName?.trim(),
      contactPhone: body.contactPhone?.trim(),
      projectNotes: body.projectNotes?.trim(),
      quizAnswers: body.quizAnswers || {},
      recommendedVideoType: body.recommendedVideoType || '',
    };
    
    inquiries.unshift(inquiry);
    await writeJSON(STORAGE_FILES.INQUIRIES, inquiries);
    
    return NextResponse.json(inquiry, { status: 201, headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating inquiry:', message);
    return NextResponse.json(
      { error: 'Failed to create inquiry', message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
