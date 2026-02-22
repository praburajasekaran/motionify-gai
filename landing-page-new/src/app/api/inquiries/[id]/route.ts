import { NextRequest, NextResponse } from 'next/server';
import { readJSON, writeJSON, STORAGE_FILES } from '@/lib/storage';
import { Inquiry } from '../route';

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
    const inquiries = await readJSON<Inquiry>(STORAGE_FILES.INQUIRIES);
    const inquiry = inquiries.find(i => i.id === id || i.inquiryNumber === id);
    
    if (!inquiry) {
      return NextResponse.json(
        { error: 'Inquiry not found' },
        { status: 404, headers: getCorsHeaders(request) }
      );
    }

    return NextResponse.json(inquiry, { status: 200, headers: getCorsHeaders(request) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching inquiry:', message);
    return NextResponse.json(
      { error: 'Failed to fetch inquiry', message },
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
    const inquiries = await readJSON<Inquiry>(STORAGE_FILES.INQUIRIES);
    const index = inquiries.findIndex(i => i.id === id);
    
    if (index === -1) {
      return NextResponse.json(
        { error: 'Inquiry not found' },
        { status: 404, headers: getCorsHeaders(request) }
      );
    }

    const updatedInquiry: Inquiry = {
      ...inquiries[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };

    inquiries[index] = updatedInquiry;
    await writeJSON(STORAGE_FILES.INQUIRIES, inquiries);

    return NextResponse.json(updatedInquiry, { status: 200, headers: getCorsHeaders(request) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating inquiry:', message);
    return NextResponse.json(
      { error: 'Failed to update inquiry', message },
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
    const inquiries = await readJSON<Inquiry>(STORAGE_FILES.INQUIRIES);
    const filtered = inquiries.filter(i => i.id !== id);
    
    if (filtered.length === inquiries.length) {
      return NextResponse.json(
        { error: 'Inquiry not found' },
        { status: 404, headers: getCorsHeaders(request) }
      );
    }

    await writeJSON(STORAGE_FILES.INQUIRIES, filtered);

    return NextResponse.json(
      { success: true, message: 'Inquiry deleted' },
      { status: 200, headers: getCorsHeaders(request) }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting inquiry:', message);
    return NextResponse.json(
      { error: 'Failed to delete inquiry', message },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders(request) });
}
