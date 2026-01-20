import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { readJSON, STORAGE_FILES } from '@/lib/storage';

interface CreateProjectRequest {
    proposalId: string;
    paymentId: string;
}

/**
 * Generate a unique project number
 * Format: PRJ-YYYY-NNN (e.g., PRJ-2026-001)
 */
async function generateProjectNumber(): Promise<string> {
    const year = new Date().getFullYear();

    // Get the count of projects created this year
    const result = await query<{ count: string }>(
        `SELECT COUNT(*) as count 
     FROM projects 
     WHERE project_number LIKE $1`,
        [`PRJ-${year}-%`]
    );

    const count = parseInt(result.rows[0]?.count || '0', 10);
    const nextNumber = (count + 1).toString().padStart(3, '0');

    return `PRJ-${year}-${nextNumber}`;
}

export async function POST(request: NextRequest) {
    try {
        const body: CreateProjectRequest = await request.json();
        const { proposalId, paymentId } = body;

        if (!proposalId || !paymentId) {
            return NextResponse.json(
                { error: 'Missing required fields: proposalId, paymentId' },
                { status: 400 }
            );
        }

        // Fetch proposal from JSON storage (will migrate to DB later)
        const proposals = await readJSON<any>(STORAGE_FILES.PROPOSALS);
        const proposal = proposals.find((p: any) => p.id === proposalId && p.status === 'accepted');

        if (!proposal) {
            return NextResponse.json(
                { error: 'Accepted proposal not found' },
                { status: 404 }
            );
        }

        // Fetch inquiry from JSON storage
        const inquiries = await readJSON<any>(STORAGE_FILES.INQUIRIES);
        const inquiry = inquiries.find((i: any) => i.id === proposal.inquiryId);

        if (!inquiry) {
            return NextResponse.json(
                { error: 'Inquiry not found' },
                { status: 404 }
            );
        }

        // Use transaction to ensure all operations succeed or fail together
        const project = await transaction(async (client) => {
            // Generate project number
            const projectNumber = await generateProjectNumber();

            // Insert project
            const projectResult = await client.query(
                `INSERT INTO projects (
          project_number,
          inquiry_id,
          proposal_id,
          status,
          total_revisions_allowed,
          revisions_used
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
                [
                    projectNumber,
                    proposal.inquiryId,
                    proposalId,
                    'active',
                    2, // Default 2 revisions
                    0
                ]
            );

            const newProject = projectResult.rows[0];

            // Insert deliverables
            for (const deliverable of proposal.deliverables) {
                await client.query(
                    `INSERT INTO deliverables (
            id,
            project_id,
            name,
            description,
            estimated_completion_week,
            status
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        deliverable.id,
                        newProject.id,
                        deliverable.name,
                        deliverable.description,
                        deliverable.estimatedCompletionWeek,
                        'pending'
                    ]
                );
            }

            // Update payment with project_id
            await client.query(
                `UPDATE payments 
         SET project_id = $1 
         WHERE id = $2`,
                [newProject.id, paymentId]
            );

            // Note: We'll update inquiry status after user creation
            // to avoid issues with foreign key constraints

            return newProject;
        });

        console.log('✅ Project created successfully:', {
            projectId: project.id,
            projectNumber: project.project_number,
            proposalId,
            inquiryId: proposal.inquiryId,
        });

        return NextResponse.json({
            success: true,
            project: {
                id: project.id,
                projectNumber: project.project_number,
                inquiryId: project.inquiry_id,
                proposalId: project.proposal_id,
                status: project.status,
                createdAt: project.created_at,
            },
            inquiry: {
                contactEmail: inquiry.contactEmail,
                contactName: inquiry.contactName,
                companyName: inquiry.companyName,
            },
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error creating project:', errorMessage);
        console.error('Stack trace:', error instanceof Error ? error.stack : '');

        return NextResponse.json(
            { error: 'Failed to create project', details: errorMessage },
            { status: 500 }
        );
    }
}
