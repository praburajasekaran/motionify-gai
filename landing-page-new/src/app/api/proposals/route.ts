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
  revisionsIncluded: number;
  acceptedAt?: string;
  rejectedAt?: string;
  feedback?: string;
  editHistory?: Array<{ version: number; editedAt: string; reason?: string }>;
}

const ALLOWED_ORIGINS = [
  'https://portal.motionify.studio',
  'https://motionify.studio',
  'https://www.motionify.studio',
];

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) ||
    origin.match(/^https:\/\/[a-z0-9-]+--motionify-pm-portal\.netlify\.app$/) ||
    (process.env.NODE_ENV !== 'production' && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')));
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function GET(request: NextRequest) {
  try {
    const proposals = await readJSON<Proposal>(STORAGE_FILES.PROPOSALS);

    proposals.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(proposals, {
      status: 200,
      headers: getCorsHeaders(request),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching proposals:', message);
    return NextResponse.json(
      { error: 'Failed to fetch proposals', message },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.inquiryId) {
      return NextResponse.json(
        { error: 'Inquiry ID is required' },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    if (!body.deliverables || body.deliverables.length === 0) {
      return NextResponse.json(
        { error: 'At least one deliverable is required' },
        { status: 400, headers: getCorsHeaders(request) }
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
      revisionsIncluded: body.revisionsIncluded ?? 2,
    };

    const proposals = await readJSON<Proposal>(STORAGE_FILES.PROPOSALS);
    proposals.unshift(proposal);
    await writeJSON(STORAGE_FILES.PROPOSALS, proposals);

    return NextResponse.json(proposal, {
      status: 201,
      headers: getCorsHeaders(request),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating proposal:', message);
    return NextResponse.json(
      { error: 'Failed to create proposal', message },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    headers: getCorsHeaders(request),
  });
}
