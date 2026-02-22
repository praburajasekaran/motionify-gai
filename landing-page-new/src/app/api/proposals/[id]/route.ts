import { NextRequest, NextResponse } from 'next/server';
import { readJSON, writeJSON, STORAGE_FILES } from '@/lib/storage';
import { Proposal } from '../route';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const proposals = await readJSON<Proposal>(STORAGE_FILES.PROPOSALS);
    const proposal = proposals.find(p => p.id === id);
    
    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404, headers: getCorsHeaders(request) }
      );
    }
    
    return NextResponse.json(proposal, { status: 200, headers: getCorsHeaders(request) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching proposal:', message);
    return NextResponse.json(
      { error: 'Failed to fetch proposal', message },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const proposals = await readJSON<Proposal>(STORAGE_FILES.PROPOSALS);
    const index = proposals.findIndex(p => p.id === id);
    
    if (index === -1) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404, headers: getCorsHeaders(request) }
      );
    }
    
    const updatedProposal: Proposal = {
      ...proposals[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    
    proposals[index] = updatedProposal;
    await writeJSON(STORAGE_FILES.PROPOSALS, proposals);
    
    return NextResponse.json(updatedProposal, { status: 200, headers: getCorsHeaders(request) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating proposal:', message);
    return NextResponse.json(
      { error: 'Failed to update proposal', message },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const proposals = await readJSON<Proposal>(STORAGE_FILES.PROPOSALS);
    const filtered = proposals.filter(p => p.id !== id);
    
    if (filtered.length === proposals.length) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404, headers: getCorsHeaders(request) }
      );
    }
    
    await writeJSON(STORAGE_FILES.PROPOSALS, filtered);
    
    return NextResponse.json(
      { success: true, message: 'Proposal deleted' },
      { status: 200, headers: getCorsHeaders(request) }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting proposal:', message);
    return NextResponse.json(
      { error: 'Failed to delete proposal', message },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders(request) });
}
