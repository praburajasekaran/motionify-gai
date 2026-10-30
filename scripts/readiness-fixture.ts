import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { bootstrapDatabase } from '../database/bootstrap';

export type ReadinessActorName = 'primary' | 'secondary' | 'unrelated' | 'manager' | 'staff' | 'admin';
export type ReadinessActor = {
  id: string;
  email: string;
  fullName: string;
  role: 'client' | 'support' | 'team_member' | 'super_admin';
  token: string;
};
export type ReadinessFixture = {
  actors: Record<ReadinessActorName, ReadinessActor>;
  projectId: string;
  otherProjectId: string;
  deliverableId: string;
  proposalId: string;
};

export function readinessPool() {
  const url = new URL(process.env.DATABASE_URL || '');
  assert.equal(url.hostname, '127.0.0.1');
  assert.match(url.pathname, /^\/motionify_readiness_test_[a-f0-9]+$/);
  assert.equal(process.env.DATABASE_SSL, 'false');
  return new pg.Pool({ connectionString: url.toString(), ssl: false });
}

export async function initializeReadinessDatabase(pool: pg.Pool) {
  await bootstrapDatabase(pool);
}

export async function seedReadinessFixture(pool: pg.Pool): Promise<ReadinessFixture> {
  const { generateJWT, hashJWT } = await import('../netlify/functions/_shared/jwt');
  const roles = {
    primary: 'client', secondary: 'client', unrelated: 'client',
    manager: 'support', staff: 'team_member', admin: 'super_admin',
  } as const;
  const actors = {} as Record<ReadinessActorName, ReadinessActor>;
  for (const name of Object.keys(roles) as ReadinessActorName[]) {
    const id = randomUUID();
    const actor = { id, email: `${name}-${id}@example.test`, fullName: `Readiness ${name}`, role: roles[name], token: '' };
    await pool.query('INSERT INTO users (id, email, full_name, role) VALUES ($1, $2, $3, $4)',
      [id, actor.email, actor.fullName, actor.role]);
    actor.token = generateJWT(actor);
    await pool.query(`INSERT INTO sessions (user_id, token, jwt_token_hash, expires_at)
      VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour')`, [id, randomUUID(), hashJWT(actor.token)]);
    actors[name] = actor;
  }
  const inquiryId = randomUUID();
  const proposalId = randomUUID();
  const projectId = randomUUID();
  const otherProjectId = randomUUID();
  const deliverableId = randomUUID();
  await pool.query(`INSERT INTO inquiries (id, inquiry_number, contact_name, contact_email, quiz_answers)
    VALUES ($1, $2, $3, $4, '{}')`, [inquiryId, `INQ-TEST-${inquiryId}`, actors.primary.fullName, actors.primary.email]);
  await pool.query(`INSERT INTO proposals (id, inquiry_id, description, deliverables, currency,
    total_price, advance_percentage, advance_amount, balance_amount, status)
    VALUES ($1, $2, 'Nonbinding synthetic delivery verification', $3, 'INR', 200, 50, 100, 100, 'accepted')`,
    [proposalId, inquiryId, JSON.stringify([{ id: deliverableId, name: 'Readiness video', estimatedCompletionWeek: 1 }])]);
  await pool.query(`INSERT INTO projects (id, project_number, name, description, client_user_id, proposal_id, inquiry_id)
    VALUES ($1, $2, 'Synthetic delivery project', 'Nonbinding local verification only', $3, $4, $5),
           ($6, $7, 'Unrelated synthetic project', 'Nonbinding local verification only', $8, NULL, NULL)`,
    [projectId, `PROJ-TEST-${projectId}`, actors.primary.id, proposalId, inquiryId,
      otherProjectId, `PROJ-TEST-${otherProjectId}`, actors.unrelated.id]);
  for (const name of Object.keys(actors) as ReadinessActorName[]) {
    const actor = actors[name];
    await pool.query(`INSERT INTO project_team (user_id, project_id, role, is_primary_contact)
      VALUES ($1, $2, $3, $4)`, [actor.id, name === 'unrelated' ? otherProjectId : projectId,
      actor.role, name === 'primary' || name === 'unrelated']);
  }
  await pool.query(`INSERT INTO deliverables (id, project_id, name, description, status)
    VALUES ($1, $2, 'Readiness video', 'Synthetic content only', 'pending')`, [deliverableId, projectId]);
  await pool.query(`INSERT INTO payments (proposal_id, project_id, payment_type, amount, currency, status)
    VALUES ($1, $2, 'advance', 100, 'INR', 'completed')`, [proposalId, projectId]);
  return { actors, projectId, otherProjectId, deliverableId, proposalId };
}
