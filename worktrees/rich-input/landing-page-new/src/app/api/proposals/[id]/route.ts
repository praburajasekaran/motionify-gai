import { NextRequest, NextResponse } from 'next/server';
import { readJSON, writeJSON, STORAGE_FILES } from '@/lib/storage';
import { Proposal } from '../route';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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
        { status: 404, headers: corsHeaders }
      );
    }
    
    return NextResponse.json(proposal, { status: 200, headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching proposal:', message);
    return NextResponse.json(
      { error: 'Failed to fetch proposal', message },
      { status: 500, headers: corsHeaders }
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
        { status: 404, headers: corsHeaders }
      );
    }
    
    const updatedProposal: Proposal = {
      ...proposals[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    
    proposals[index] = updatedProposal;
    await writeJSON(STORAGE_FILES.PROPOSALS, proposals);
    
    return NextResponse.json(updatedProposal, { status: 200, headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating proposal:', message);
    return NextResponse.json(
      { error: 'Failed to update proposal', message },
      { status: 500, headers: corsHeaders }
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
        { status: 404, headers: corsHeaders }
      );
    }
    
    await writeJSON(STORAGE_FILES.PROPOSALS, filtered);
    
    return NextResponse.json(
      { success: true, message: 'Proposal deleted' },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting proposal:', message);
    return NextResponse.json(
      { error: 'Failed to delete proposal', message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
