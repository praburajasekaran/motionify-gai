import { NextRequest, NextResponse } from 'next/server';
import { readJSON, writeJSON, STORAGE_FILES } from '@/lib/storage';

export type ProposalStatus = 'sent' | 'accepted' | 'rejected' | 'changes_requested';

export interface ProposalDeliverable {
  id: string;
  name: string;
  description: string;
  estimatedCompletionWeek: number;
}

export interface Proposal {
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

export async function GET() {
  try {
    const proposals = await readJSON<Proposal>(STORAGE_FILES.PROPOSALS);
    
    proposals.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return NextResponse.json(proposals, { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching proposals:', message);
    return NextResponse.json(
      { error: 'Failed to fetch proposals', message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.inquiryId) {
      return NextResponse.json(
        { error: 'Inquiry ID is required' },
        { status: 400 }
      );
    }
    
    if (!body.deliverables || body.deliverables.length === 0) {
      return NextResponse.json(
        { error: 'At least one deliverable is required' },
        { status: 400 }
      );
    }
    
    const proposal: Proposal = {
      id: body.id || crypto.randomUUID(),
      inquiryId: body.inquiryId,
      status: body.status || 'sent',
      version: body.version || 1,
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: body.description?.trim() || '',
      deliverables: body.deliverables,
      currency: body.currency || 'USD',
      totalPrice: body.totalPrice || 0,
      advancePercentage: body.advancePercentage || 50,
      advanceAmount: body.advanceAmount || 0,
      balanceAmount: body.balanceAmount || 0,
    };
    
    const proposals = await readJSON<Proposal>(STORAGE_FILES.PROPOSALS);
    proposals.unshift(proposal);
    await writeJSON(STORAGE_FILES.PROPOSALS, proposals);
    
    return NextResponse.json(proposal, { 
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating proposal:', message);
    return NextResponse.json(
      { error: 'Failed to create proposal', message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
