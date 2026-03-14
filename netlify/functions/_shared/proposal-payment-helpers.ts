/**
 * Shared helper: Accept proposal and create project after successful advance payment.
 *
 * Called from three places:
 *   1. payments.ts `verify` action  — optimistic frontend path
 *   2. payments.ts `manual-complete` action  — admin offline-payment path
 *   3. razorpay-webhook.ts `payment.captured` handler  — server-authoritative fallback
 *
 * Idempotent: safe to call multiple times for the same payment (verify + webhook race).
 * Returns the project ID (existing or newly created), or null if not applicable.
 */

interface DbClient {
  query(queryText: string, values?: any[]): Promise<{ rows: any[] }>;
}

export async function acceptProposalAndCreateProject(
  client: DbClient,
  paymentId: string
): Promise<{ projectId: string | null }> {
  // Fetch payment
  const paymentResult = await client.query(
    `SELECT id, proposal_id, payment_type FROM payments WHERE id = $1`,
    [paymentId]
  );

  if (paymentResult.rows.length === 0) {
    console.error('[acceptProposalAndCreateProject] Payment not found:', paymentId);
    return { projectId: null };
  }

  const payment = paymentResult.rows[0];

  // Only advance payments trigger proposal acceptance and project creation
  if (payment.payment_type !== 'advance') {
    return { projectId: null };
  }

  const proposalId = payment.proposal_id;

  // Fetch proposal
  const proposalResult = await client.query(
    `SELECT * FROM proposals WHERE id = $1`,
    [proposalId]
  );

  if (proposalResult.rows.length === 0) {
    console.error('[acceptProposalAndCreateProject] Proposal not found:', proposalId);
    return { projectId: null };
  }

  const proposal = proposalResult.rows[0];

  // Mark proposal accepted (idempotent — only updates if not already accepted)
  await client.query(
    `UPDATE proposals
     SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status != 'accepted'`,
    [proposalId]
  );

  // Check for existing project — prevents duplicate creation if verify + webhook race
  const existingProject = await client.query(
    `SELECT id FROM projects WHERE proposal_id = $1`,
    [proposalId]
  );

  if (existingProject.rows.length > 0) {
    const projectId = existingProject.rows[0].id;
    // Ensure payment is linked even if it wasn't before
    await client.query(
      `UPDATE payments SET project_id = $1 WHERE id = $2 AND project_id IS NULL`,
      [projectId, paymentId]
    );
    console.log('[acceptProposalAndCreateProject] Project already exists:', projectId);
    return { projectId };
  }

  // Fetch inquiry
  const inquiryResult = await client.query(
    `SELECT * FROM inquiries WHERE proposal_id = $1`,
    [proposalId]
  );

  if (inquiryResult.rows.length === 0) {
    console.error('[acceptProposalAndCreateProject] Inquiry not found for proposal:', proposalId);
    return { projectId: null };
  }

  const inquiry = inquiryResult.rows[0];

  // Get or create client user
  let clientUserId = proposal.client_user_id;
  if (!clientUserId) {
    const userResult = await client.query(
      `SELECT id FROM users WHERE email = $1`,
      [inquiry.contact_email]
    );
    if (userResult.rows.length > 0) {
      clientUserId = userResult.rows[0].id;
    } else {
      const newUserResult = await client.query(
        `INSERT INTO users (email, full_name, role) VALUES ($1, $2, 'client') RETURNING id`,
        [inquiry.contact_email, inquiry.contact_name]
      );
      clientUserId = newUserResult.rows[0].id;
    }
  }

  // Generate project number
  const year = new Date().getFullYear();
  const projectNumResult = await client.query(
    `SELECT project_number FROM projects
     WHERE project_number LIKE $1
     ORDER BY project_number DESC LIMIT 1`,
    [`PROJ-${year}-%`]
  );

  let maxNumber = 0;
  if (projectNumResult.rows.length > 0) {
    const match = projectNumResult.rows[0].project_number.match(/PROJ-\d{4}-(\d+)/);
    if (match) {
      maxNumber = parseInt(match[1], 10);
    }
  }
  const projectNumber = `PROJ-${year}-${String(maxNumber + 1).padStart(3, '0')}`;

  // Create project
  const projectResult = await client.query(
    `INSERT INTO projects (
      project_number, inquiry_id, proposal_id, client_user_id, status, total_revisions_allowed
    ) VALUES ($1, $2, $3, $4, 'active', $5)
    RETURNING *`,
    [projectNumber, inquiry.id, proposal.id, clientUserId, proposal.revisions_included ?? 2]
  );

  const project = projectResult.rows[0];

  // Create deliverables
  const deliverables = typeof proposal.deliverables === 'string'
    ? JSON.parse(proposal.deliverables)
    : (proposal.deliverables ?? []);

  for (const deliverable of deliverables) {
    await client.query(
      `INSERT INTO deliverables (
        id, project_id, name, description, estimated_completion_week, status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      ON CONFLICT (id) DO NOTHING`,
      [
        deliverable.id,
        project.id,
        deliverable.name,
        deliverable.description,
        deliverable.estimatedCompletionWeek,
      ]
    );
  }

  // Mark inquiry converted
  await client.query(
    `UPDATE inquiries SET status = 'converted' WHERE id = $1`,
    [inquiry.id]
  );

  // Link payment to project
  await client.query(
    `UPDATE payments SET project_id = $1 WHERE id = $2`,
    [project.id, paymentId]
  );

  console.log(`[acceptProposalAndCreateProject] Project ${projectNumber} created for proposal ${proposalId}`);

  return { projectId: project.id };
}
