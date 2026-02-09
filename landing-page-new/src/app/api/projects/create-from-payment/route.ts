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

        // Fetch proposal from PostgreSQL first, fallback to local JSON
        let proposal: any = null;
        try {
            const dbResult = await query(
                'SELECT * FROM proposals WHERE id = $1 AND status = $2',
                [proposalId, 'accepted']
            );
            if (dbResult.rows.length > 0) {
                const row = dbResult.rows[0];
                proposal = {
                    ...row,
                    inquiryId: row.inquiry_id,
                    revisionsIncluded: row.revisions_included,
                };
            }
        } catch (dbError) {
            console.warn('DB proposal lookup failed, falling back to local JSON:', dbError);
        }

        if (!proposal) {
            const proposals = await readJSON<any>(STORAGE_FILES.PROPOSALS);
            proposal = proposals.find((p: any) => p.id === proposalId && p.status === 'accepted');
        }

        if (!proposal) {
            return NextResponse.json(
                { error: 'Accepted proposal not found' },
                { status: 404 }
            );
        }

        // Fetch inquiry from PostgreSQL first, fallback to local JSON
        let inquiry: any = null;
        try {
            const dbResult = await query(
                'SELECT * FROM inquiries WHERE id = $1',
                [proposal.inquiryId || proposal.inquiry_id]
            );
            if (dbResult.rows.length > 0) {
                const row = dbResult.rows[0];
                inquiry = {
                    ...row,
                    contactEmail: row.contact_email,
                    contactName: row.contact_name,
                    companyName: row.company_name,
                };
            }
        } catch (dbError) {
            console.warn('DB inquiry lookup failed, falling back to local JSON:', dbError);
        }

        if (!inquiry) {
            const inquiries = await readJSON<any>(STORAGE_FILES.INQUIRIES);
            inquiry = inquiries.find((i: any) => i.id === (proposal.inquiryId || proposal.inquiry_id));
        }

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
                    proposal.revisionsIncluded ?? 2,
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
            // paymentId may be a UUID (from DB) or a timestamp-based ID (from JSON storage)
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId);
            if (isUuid) {
                await client.query(
                    `UPDATE payments SET project_id = $1 WHERE id = $2`,
                    [newProject.id, paymentId]
                );
            } else {
                await client.query(
                    `UPDATE payments SET project_id = $1
                     WHERE id = (
                       SELECT id FROM payments
                       WHERE proposal_id = $2 AND project_id IS NULL
                       ORDER BY created_at DESC LIMIT 1
                     )`,
                    [newProject.id, proposalId]
                );
            }

            // Auto-add all active support users to the project team
            const supportUsers = await client.query(
                `SELECT id FROM users WHERE role = 'support' AND is_active = true`
            );

            for (const supportUser of supportUsers.rows) {
                await client.query(
                    `INSERT INTO project_team (user_id, project_id, role, is_primary_contact, added_at)
                     VALUES ($1, $2, 'support', false, NOW())
                     ON CONFLICT (user_id, project_id) DO NOTHING`,
                    [supportUser.id, newProject.id]
                );
            }

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
