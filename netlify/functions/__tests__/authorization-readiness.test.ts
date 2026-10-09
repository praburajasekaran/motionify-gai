import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, after, test, type TestContext } from 'node:test';
import { initializeReadinessDatabase, readinessPool, seedReadinessFixture, type ReadinessFixture, type ReadinessActorName, type ReadinessActor } from '../../../scripts/readiness-fixture';
import { closePool } from '../_shared/db';
import type { Handler } from '../_shared/middleware';
import { handler as projects } from '../projects';
import { handler as tasks } from '../tasks';
import { handler as deliverables } from '../deliverables';
import { handler as files } from '../deliverable-files';
import { handler as feedback } from '../deliverable-feedback';
import { handler as revisions } from '../revision-requests';
import { handler as terms } from '../projects-accept-terms';
import { handler as presign } from '../r2-presign';
import { handler as proposals } from '../proposals';
import { handler as inquiries } from '../inquiries';
import { handler as comments } from '../comments';
import { handler as payments } from '../payments';
import { handler as team } from '../project-team';
import { handler as invite } from '../project-invitations-create';
import { handler as invitations } from '../invitations-list';
import { handler as revoke } from '../invitations-revoke';
import { handler as users } from '../users-list';
import { handler as updateUser } from '../users-update';
import { handler as deleteUser } from '../users-delete';
import { handler as globalInvite } from '../invitations-create';
import { handler as verifyLink } from '../auth-verify-magic-link';

type Scenario = {
  name: string; handler: Handler; method: string; endpoint: string;
  data?: Record<string, unknown>; query?: Record<string, string>;
  allowed: ReadinessActorName[]; success: number;
};
const pool = readinessPool();
let fixture: ReadinessFixture;
let inquiryId: string;
let taskId: string;
let hiddenId: string;
let fileId: string;
let invitationId: string;
let commentId: string;
let paymentId: string;
const members: ReadinessActorName[] = ['primary', 'secondary', 'staff', 'manager', 'admin'];
const internal: ReadinessActorName[] = ['staff', 'manager', 'admin'];
const managers: ReadinessActorName[] = ['manager', 'admin'];

before(async () => { await initializeReadinessDatabase(pool); });
async function resetFixture() {
  await pool.query('TRUNCATE users, inquiries, projects CASCADE');
  await pool.query('DROP TABLE IF EXISTS rate_limit_entries');
  fixture = await seedReadinessFixture(pool);
  inquiryId = (await pool.query('SELECT inquiry_id FROM proposals WHERE id = $1', [fixture.proposalId])).rows[0].inquiry_id;
  taskId = (await pool.query(`INSERT INTO tasks (project_id, title, created_by, assigned_to, is_client_visible)
    VALUES ($1, 'Shared task', $2, $3, true) RETURNING id`, [fixture.projectId, fixture.actors.manager.id, fixture.actors.staff.id])).rows[0].id;
  hiddenId = (await pool.query(`INSERT INTO tasks (project_id, title, created_by, is_client_visible)
    VALUES ($1, 'Private internal task', $2, false) RETURNING id`, [fixture.projectId, fixture.actors.manager.id])).rows[0].id;
  await pool.query("UPDATE deliverables SET status = 'awaiting_approval', assigned_to = $1 WHERE id = $2", [fixture.actors.staff.id, fixture.deliverableId]);
  fileId = (await pool.query(`INSERT INTO deliverable_files (deliverable_id, file_key, file_name, file_category, uploaded_by)
    VALUES ($1, $2, 'private-review.pdf', 'document', $3) RETURNING id`,
    [fixture.deliverableId, `projects/${fixture.projectId}/deliverables/${fixture.deliverableId}/beta/review.pdf`, fixture.actors.manager.id])).rows[0].id;
  commentId = (await pool.query(`INSERT INTO proposal_comments (proposal_id, author_id, author_type, user_name, content)
    VALUES ($1, $2, 'ADMIN', 'Readiness manager', 'Private proposal discussion') RETURNING id`, [fixture.proposalId, fixture.actors.manager.id])).rows[0].id;
  invitationId = (await pool.query(`INSERT INTO project_invitations (project_id, email, role, invited_by, token, expires_at)
    VALUES ($1, 'synthetic-invitee@example.test', 'client', $2, $3, NOW() + INTERVAL '1 day') RETURNING id`,
    [fixture.projectId, fixture.actors.manager.id, randomUUID()])).rows[0].id;
  paymentId = (await pool.query('SELECT id FROM payments WHERE project_id = $1', [fixture.projectId])).rows[0].id;
}
function isolatedTest(name: string, run: (context: TestContext) => Promise<void>) {
  test(name, async context => { await resetFixture(); await run(context); });
}
after(async () => { await closePool(); await pool.end(); });

async function request(scenario: Pick<Scenario, 'handler' | 'method' | 'endpoint' | 'data' | 'query'>, actor: ReadinessActor | null) {
  const result = await scenario.handler({ httpMethod: scenario.method, path: `/.netlify/functions/${scenario.endpoint}`,
    headers: { 'x-requested-with': 'fetch', ...(actor ? { cookie: `auth_token=${actor.token}` } : {}) },
    body: scenario.data ? JSON.stringify(scenario.data) : null, queryStringParameters: scenario.query });
  return { status: result.statusCode, body: JSON.parse(result.body), headers: result.headers };
}

async function snapshot() {
  const tables = ['users', 'sessions', 'projects', 'project_team', 'inquiries', 'proposals', 'tasks', 'task_comments',
    'task_followers', 'deliverables', 'deliverable_files', 'deliverable_feedback', 'revision_requests',
    'proposal_comments', 'payments', 'project_invitations', 'user_invitations', 'activities', 'notifications'];
  const result: Record<string, unknown> = {};
  for (const table of tables) result[table] = (await pool.query(`SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) AS rows FROM ${table} t`)).rows[0].rows;
  return result;
}

function readScenarios(): Scenario[] {
  const scenarios: Omit<Scenario, 'method' | 'success'>[] = [
    { name: 'project detail', handler: projects, endpoint: `projects/${fixture.projectId}`, allowed: members },
    { name: 'task list', handler: tasks, endpoint: 'tasks', query: { projectId: fixture.projectId }, allowed: members },
    { name: 'visible task detail', handler: tasks, endpoint: `tasks/${taskId}`, allowed: members },
    { name: 'deliverable detail', handler: deliverables, endpoint: 'deliverables', query: { id: fixture.deliverableId }, allowed: members },
    { name: 'file list', handler: files, endpoint: 'deliverable-files', query: { deliverableId: fixture.deliverableId }, allowed: members },
    { name: 'file discussion', handler: feedback, endpoint: 'deliverable-feedback', query: { deliverableId: fixture.deliverableId, fileId }, allowed: members },
    { name: 'revision history', handler: revisions, endpoint: 'revision-requests', query: { deliverableId: fixture.deliverableId }, allowed: members },
    { name: 'proposal detail', handler: proposals, endpoint: `proposals/${fixture.proposalId}`, allowed: ['primary', ...internal] },
    { name: 'inquiry detail', handler: inquiries, endpoint: `inquiries/${inquiryId}`, allowed: ['primary', ...internal] },
    { name: 'proposal comments', handler: comments, endpoint: 'comments', query: { proposalId: fixture.proposalId }, allowed: ['primary', ...internal] },
    { name: 'project payments', handler: payments, endpoint: 'payments', query: { projectId: fixture.projectId }, allowed: members },
    { name: 'project team', handler: team, endpoint: `project-team/${fixture.projectId}`, allowed: members },
    { name: 'project invitations', handler: invitations, endpoint: `invitations-list/${fixture.projectId}`, allowed: members },
    { name: 'user directory', handler: users, endpoint: 'users-list', allowed: managers },
  ];
  return scenarios.map(item => ({ ...item, method: 'GET', success: 200 }));
}

isolatedTest('allowed-role read matrix covers ten resource families through persisted sessions', async t => {
  for (const scenario of readScenarios()) for (const name of Object.keys(fixture.actors) as ReadinessActorName[]) {
    await t.test(`${scenario.name} as ${name}`, async () => {
      const beforeState = await snapshot();
      const result = await request(scenario, fixture.actors[name]);
      assert.equal(result.status, scenario.allowed.includes(name) ? 200 : 403, `${scenario.name}: ${JSON.stringify(result.body)}`);
      if (result.status === 403) {
        assert.equal(result.body.url, undefined);
        assert.deepEqual(await snapshot(), beforeState);
        assert(!JSON.stringify(result.body).includes('Private proposal discussion'));
      }
    });
  }
});

isolatedTest('absent and expired sessions deny every protected read before private data is returned', async t => {
  await pool.query("UPDATE sessions SET expires_at = NOW() - INTERVAL '1 second' WHERE user_id = $1", [fixture.actors.primary.id]);
  for (const scenario of readScenarios()) for (const actor of [null, fixture.actors.primary]) {
    await t.test(`${scenario.name} with ${actor ? 'expired' : 'absent'} session`, async () => {
      const state = await snapshot();
      const result = await request(scenario, actor);
      assert.equal(result.status, 401);
      assert(result.body.error);
      assert.deepEqual(await snapshot(), state);
    });
  }
});

function deniedMutations(): Omit<Scenario, 'allowed' | 'success'>[] {
  return [
    { name: 'task create body', handler: tasks, method: 'POST', endpoint: 'tasks', data: { projectId: fixture.projectId, title: 'Forbidden task' } },
    { name: 'task update path', handler: tasks, method: 'PATCH', endpoint: `tasks/${taskId}`, data: { title: 'Forbidden rename' } },
    { name: 'task delete path', handler: tasks, method: 'DELETE', endpoint: `tasks/${taskId}` },
    { name: 'task comment path', handler: tasks, method: 'POST', endpoint: `tasks/${taskId}/comments`, data: { content: 'Forbidden comment' } },
    { name: 'task follow path', handler: tasks, method: 'POST', endpoint: `tasks/${taskId}/follow` },
    { name: 'proposal comment body', handler: comments, method: 'POST', endpoint: 'comments', data: { proposalId: fixture.proposalId, content: 'Forbidden comment' } },
    { name: 'proposal comment update body', handler: comments, method: 'PUT', endpoint: 'comments', data: { id: commentId, content: 'Forbidden edit' } },
    { name: 'deliverable update path', handler: deliverables, method: 'PATCH', endpoint: `deliverables/${fixture.deliverableId}`, data: { name: 'Forbidden name' } },
    { name: 'deliverable create body', handler: deliverables, method: 'POST', endpoint: 'deliverables', data: { project_id: fixture.projectId, name: 'Forbidden output' } },
    { name: 'file registration body', handler: files, method: 'POST', endpoint: 'deliverable-files', data: { deliverable_id: fixture.deliverableId, file_key: `projects/${fixture.projectId}/beta/forbidden.pdf`, file_name: 'forbidden.pdf', file_category: 'document' } },
    { name: 'file deletion path', handler: files, method: 'DELETE', endpoint: `deliverable-files/${fileId}` },
    { name: 'file feedback body', handler: feedback, method: 'POST', endpoint: 'deliverable-feedback', data: { deliverableId: fixture.deliverableId, fileId, kind: 'comment', timestamp: 1, body: 'Forbidden feedback' } },
    { name: 'revision body', handler: revisions, method: 'POST', endpoint: 'revision-requests', data: { deliverableId: fixture.deliverableId, feedbackText: 'Forbidden revision request for another project.' } },
    { name: 'terms body', handler: terms, method: 'POST', endpoint: 'projects-accept-terms', data: { projectId: fixture.projectId, accepted: true } },
    { name: 'project update path', handler: projects, method: 'PATCH', endpoint: `projects/${fixture.projectId}`, data: { name: 'Forbidden project name' } },
    { name: 'proposal update path', handler: proposals, method: 'PUT', endpoint: `proposals/${fixture.proposalId}`, data: { description: 'Forbidden proposal' } },
    { name: 'inquiry update path', handler: inquiries, method: 'PUT', endpoint: `inquiries/${inquiryId}`, data: { status: 'qualified' } },
    { name: 'payment order body', handler: payments, method: 'POST', endpoint: 'payments/create-order', data: { proposalId: fixture.proposalId, paymentType: 'balance' } },
    { name: 'payment link body', handler: payments, method: 'POST', endpoint: 'payments/link-project', data: { paymentId, projectId: fixture.otherProjectId } },
    { name: 'project invitation path', handler: invite, method: 'POST', endpoint: `project-invitations-create/${fixture.projectId}`, data: { email: 'unauthorized@example.test', role: 'client' } },
    { name: 'project invitation revoke path', handler: revoke, method: 'DELETE', endpoint: `invitations-revoke/${invitationId}` },
    { name: 'member removal path', handler: team, method: 'DELETE', endpoint: `project-team/${fixture.projectId}/${fixture.actors.staff.id}` },
    { name: 'user update path', handler: updateUser, method: 'PATCH', endpoint: `users-update/${fixture.actors.primary.id}`, data: { role: 'super_admin' } },
    { name: 'account deactivate path', handler: deleteUser, method: 'DELETE', endpoint: `users-delete/${fixture.actors.primary.id}` },
    { name: 'global invitation body', handler: globalInvite, method: 'POST', endpoint: 'invitations-create', data: { email: 'unauthorized-global@example.test', fullName: 'Synthetic user', role: 'super_admin' } },
    { name: 'upload signing body', handler: presign, method: 'POST', endpoint: 'r2-presign', data: { projectId: fixture.projectId, deliverableId: fixture.deliverableId, folder: 'beta', fileName: 'forbidden.pdf', fileType: 'application/pdf', fileSize: 10 } },
  ];
}

isolatedTest('cross-project mutations deny unrelated and signed-out users without changing persisted data', async t => {
  for (const scenario of deniedMutations()) for (const actor of [null, fixture.actors.unrelated]) {
    await t.test(`${scenario.name} as ${actor ? 'unrelated client' : 'signed out'}`, async () => {
      const state = await snapshot();
      const result = await request(scenario, actor);
      assert.equal(result.status, actor ? 403 : 401, JSON.stringify(result.body));
      assert.equal(result.body.uploadUrl, undefined);
      assert.deepEqual(await snapshot(), state);
    });
  }
});

isolatedTest('project lists cannot be broadened by forged user identifiers', async () => {
  for (const actor of [fixture.actors.primary, fixture.actors.staff, fixture.actors.secondary]) {
    const list = await request({ handler: projects, method: 'GET', endpoint: 'projects' }, actor);
    assert.equal(list.status, 200);
    assert.deepEqual(list.body.map((row: { id: string }) => row.id), [fixture.projectId]);
    for (const query of [{ userId: fixture.actors.unrelated.id }, { clientUserId: fixture.actors.unrelated.id }]) {
      const denied = await request({ handler: projects, method: 'GET', endpoint: 'projects', query }, actor);
      assert.equal(denied.status, 403);
    }
  }
  for (const handler of [proposals, inquiries, payments]) {
    const result = await request({ handler, method: 'GET', endpoint: handler === proposals ? 'proposals' : handler === inquiries ? 'inquiries' : 'payments' }, fixture.actors.unrelated);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, []);
  }
  for (const [handler, endpoint] of [[proposals, 'proposals'], [inquiries, 'inquiries']] as const) {
    const secondary = await request({ handler, method: 'GET', endpoint }, fixture.actors.secondary);
    assert.equal(secondary.status, 200);
    assert.deepEqual(secondary.body, []);
    const staff = await request({ handler, method: 'GET', endpoint }, fixture.actors.staff);
    assert.equal(staff.status, 200);
    assert.equal(staff.body.length, 1);
  }
});

isolatedTest('hidden tasks deny client reads, comments and follows without disclosing their title', async () => {
  for (const name of ['primary', 'secondary', 'unrelated'] as const) {
    for (const operation of [
      { method: 'GET', endpoint: `tasks/${hiddenId}` },
      { method: 'POST', endpoint: `tasks/${hiddenId}/comments`, data: { content: 'Guessing hidden task' } },
      { method: 'POST', endpoint: `tasks/${hiddenId}/follow` },
    ]) {
      const state = await snapshot();
      const result = await request({ handler: tasks, ...operation }, fixture.actors[name]);
      assert.equal(result.status, name === 'unrelated' ? 403 : 404);
      assert(!JSON.stringify(result.body).includes('Private internal task'));
      assert.deepEqual(await snapshot(), state);
    }
    if (name !== 'unrelated') {
      const list = await request({ handler: tasks, method: 'GET', endpoint: 'tasks', query: { projectId: fixture.projectId } }, fixture.actors[name]);
      assert(!list.body.some((row: { id: string }) => row.id === hiddenId));
    }
  }
});

isolatedTest('clients create and edit only their own tasks with authoritative creator and restricted assignment', async () => {
  for (const name of ['primary', 'secondary'] as const) {
    const actor = fixture.actors[name];
    const created = await request({ handler: tasks, method: 'POST', endpoint: 'tasks', data: {
      projectId: fixture.projectId, title: `${name} request`, createdBy: fixture.actors.admin.id, visible_to_client: false,
    } }, actor);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const row = (await pool.query('SELECT * FROM tasks WHERE id = $1', [created.body.id])).rows[0];
    assert.equal(row.created_by, actor.id);
    assert.equal(row.is_client_visible, true);
    assert.equal(row.assigned_to, null);
    const own = { handler: tasks, method: 'PATCH', endpoint: `tasks/${row.id}`, data: { title: 'Own edited request' } };
    assert.equal((await request(own, actor)).status, 200);
    const other = fixture.actors[name === 'primary' ? 'secondary' : 'primary'];
    const state = await snapshot();
    assert.equal((await request(own, other)).status, 403);
    assert.equal((await request({ ...own, method: 'DELETE', data: undefined }, other)).status, 403);
    assert.deepEqual(await snapshot(), state);
    assert.equal((await request({ ...own, method: 'DELETE', data: undefined }, actor)).status, 200);
  }
});

isolatedTest('primary contact alone can accept terms and approve client review', async () => {
  for (const name of ['secondary', 'unrelated', 'staff'] as const) {
    const state = await snapshot();
    assert.equal((await request({ handler: terms, method: 'POST', endpoint: 'projects-accept-terms', data: { projectId: fixture.projectId, accepted: true } }, fixture.actors[name])).status, 403);
    assert.equal((await request({ handler: deliverables, method: 'PATCH', endpoint: `deliverables/${fixture.deliverableId}`, data: { status: 'approved' } }, fixture.actors[name])).status, 403);
    assert.deepEqual(await snapshot(), state);
  }
  for (const name of ['manager', 'admin'] as const) {
    assert.equal((await request({ handler: terms, method: 'POST', endpoint: 'projects-accept-terms', data: { projectId: fixture.projectId, accepted: true } }, fixture.actors[name])).status, 403);
  }
  assert.equal((await request({ handler: terms, method: 'POST', endpoint: 'projects-accept-terms', data: { projectId: fixture.projectId, accepted: true } }, fixture.actors.primary)).status, 200);
  assert.equal((await request({ handler: deliverables, method: 'PATCH', endpoint: `deliverables/${fixture.deliverableId}`, data: { status: 'approved' } }, fixture.actors.primary)).status, 200);
  assert.equal((await pool.query('SELECT approved_by FROM deliverables WHERE id = $1', [fixture.deliverableId])).rows[0].approved_by, fixture.actors.primary.id);
});

isolatedTest('internal members retain task edits while manager and super-admin privileges stay separate', async () => {
  for (const name of Object.keys(fixture.actors) as ReadinessActorName[]) {
    const actor = fixture.actors[name];
    const task = await request({ handler: tasks, method: 'PATCH', endpoint: `tasks/${taskId}`, data: { title: `${name} task edit` } }, actor);
    assert.equal(task.status, internal.includes(name) ? 200 : 403);
    const project = await request({ handler: projects, method: 'PATCH', endpoint: `projects/${fixture.projectId}`, data: { name: `${name} project edit` } }, actor);
    assert.equal(project.status, managers.includes(name) ? 200 : 403, JSON.stringify(project.body));
    const user = await request({ handler: updateUser, method: 'PATCH', endpoint: `users-update/${fixture.actors.secondary.id}`, data: { full_name: 'Synthetic updated name' } }, actor);
    assert.equal(user.status, name === 'admin' ? 200 : 403);
  }
});

isolatedTest('assignment controls beta uploads without granting final or manager actions', async () => {
  await pool.query("UPDATE deliverables SET status = 'pending' WHERE id = $1", [fixture.deliverableId]);
  const data = { projectId: fixture.projectId, deliverableId: fixture.deliverableId, folder: 'beta', fileName: 'assigned.pdf', fileType: 'application/pdf', fileSize: 10 };
  assert.equal((await request({ handler: presign, method: 'POST', endpoint: 'r2-presign', data }, fixture.actors.staff)).status, 200);
  for (const name of ['primary', 'secondary', 'unrelated'] as const) {
    assert.equal((await request({ handler: presign, method: 'POST', endpoint: 'r2-presign', data }, fixture.actors[name])).status, 403);
  }
  assert.equal((await request({ handler: presign, method: 'POST', endpoint: 'r2-presign', data: { ...data, folder: 'final' } }, fixture.actors.staff)).status, 403);
  assert.equal((await request({ handler: deliverables, method: 'PATCH', endpoint: `deliverables/${fixture.deliverableId}`, data: { assigned_to: fixture.actors.manager.id } }, fixture.actors.staff)).status, 403);
  await pool.query('UPDATE deliverables SET assigned_to = NULL WHERE id = $1', [fixture.deliverableId]);
  assert.equal((await request({ handler: presign, method: 'POST', endpoint: 'r2-presign', data }, fixture.actors.staff)).status, 403);
  assert.equal((await request({ handler: deliverables, method: 'GET', endpoint: 'deliverables', query: { id: fixture.deliverableId } }, fixture.actors.staff)).status, 200);
});

isolatedTest('mismatched object identities never issue a signed URL', async () => {
  const key = (await pool.query('SELECT file_key FROM deliverable_files WHERE id = $1', [fileId])).rows[0].file_key;
  const denied = await request({ handler: presign, method: 'GET', endpoint: 'r2-presign', query: { key } }, fixture.actors.unrelated);
  assert.equal(denied.status, 403);
  assert.equal(denied.body.url, undefined);
  const wrongScope = { projectId: fixture.otherProjectId, deliverableId: fixture.deliverableId, folder: 'beta', fileName: 'wrong.pdf', fileType: 'application/pdf', fileSize: 10 };
  const result = await request({ handler: presign, method: 'POST', endpoint: 'r2-presign', data: wrongScope }, fixture.actors.staff);
  assert.equal(result.status, 403);
  assert.equal(result.body.uploadUrl, undefined);
  const state = await snapshot();
  const registered = await request({ handler: files, method: 'POST', endpoint: 'deliverable-files', data: {
    deliverable_id: fixture.deliverableId, file_key: `projects/${fixture.otherProjectId}/beta/wrong.pdf`, file_name: 'wrong.pdf', file_category: 'document',
  } }, fixture.actors.manager);
  assert.equal(registered.status, 400);
  assert.deepEqual(await snapshot(), state);
});

isolatedTest('removed staff and secondary memberships lose access with their existing persisted session', async () => {
  for (const name of ['staff', 'secondary'] as const) {
    const actor = fixture.actors[name];
    assert.equal((await request({ handler: projects, method: 'GET', endpoint: `projects/${fixture.projectId}` }, actor)).status, 200);
    assert.equal((await request({ handler: team, method: 'DELETE', endpoint: `project-team/${fixture.projectId}/${actor.id}` }, fixture.actors.manager)).status, 200);
    for (const scenario of readScenarios().filter(row => row.allowed.includes(name))) {
      const result = await request(scenario, actor);
      assert.equal(result.status, 403, `${scenario.name}: ${JSON.stringify(result.body)}`);
    }
    assert.equal((await pool.query('SELECT count(*) FROM sessions WHERE user_id = $1', [actor.id])).rows[0].count, '1');
  }
});

isolatedTest('deactivation revokes the existing session and prevents an old unused magic link from restoring access', async () => {
  const actor = fixture.actors.staff;
  const token = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
  await pool.query("INSERT INTO magic_link_tokens (email, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour')", [actor.email, token]);
  assert.equal((await request({ handler: deleteUser, method: 'DELETE', endpoint: `users-delete/${actor.id}` }, fixture.actors.admin)).status, 200);
  assert.equal((await pool.query('SELECT is_active FROM users WHERE id = $1', [actor.id])).rows[0].is_active, false);
  assert.equal((await pool.query('SELECT count(*) FROM sessions WHERE user_id = $1', [actor.id])).rows[0].count, '0');
  for (const scenario of readScenarios()) assert.equal((await request(scenario, actor)).status, 401);
  const result = await verifyLink({ httpMethod: 'POST', headers: { 'x-forwarded-for': '127.0.0.3' }, body: JSON.stringify({ token, email: actor.email }), queryStringParameters: null });
  assert.equal(result.statusCode, 401, result.body);
  assert.equal(JSON.parse(result.body).error.code, 'TOKEN_NOT_FOUND');
  assert.equal((await pool.query('SELECT count(*) FROM sessions WHERE user_id = $1', [actor.id])).rows[0].count, '0');
});

isolatedTest('role changes revoke stale privileged sessions and clients cannot edit another author discussion', async () => {
  const result = await request({ handler: updateUser, method: 'PATCH', endpoint: `users-update/${fixture.actors.manager.id}`, data: { role: 'team_member' } }, fixture.actors.admin);
  assert.equal(result.status, 200);
  assert.equal((await request({ handler: projects, method: 'GET', endpoint: `projects/${fixture.projectId}` }, fixture.actors.manager)).status, 401);
  const state = await snapshot();
  const edit = await request({ handler: comments, method: 'PUT', endpoint: 'comments', data: { id: commentId, content: 'Forged replacement' } }, fixture.actors.primary);
  assert.equal(edit.status, 403);
  assert.deepEqual(await snapshot(), state);
});

isolatedTest('primary project invitations persist without granting internal or global role escalation', async () => {
  for (const name of ['secondary', 'staff', 'unrelated'] as const) {
    const state = await snapshot();
    assert.equal((await request({ handler: invite, method: 'POST', endpoint: `project-invitations-create/${fixture.projectId}`, data: { email: `${name}-guest@example.test`, role: 'client' } }, fixture.actors[name])).status, 403);
    assert.deepEqual(await snapshot(), state);
  }
  const primary = fixture.actors.primary;
  for (const role of ['team_member', 'support', 'super_admin']) {
    const state = await snapshot();
    const denied = await request({ handler: invite, method: 'POST', endpoint: `project-invitations-create/${fixture.projectId}`, data: { email: 'escalation@example.test', role } }, primary);
    assert.equal(denied.status, role === 'team_member' ? 403 : 400);
    assert.deepEqual(await snapshot(), state);
  }
  const created = await request({ handler: invite, method: 'POST', endpoint: `project-invitations-create/${fixture.projectId}`, data: { email: 'primary-guest@example.test', role: 'client' } }, primary);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const row = (await pool.query("SELECT * FROM project_invitations WHERE email = 'primary-guest@example.test'")).rows[0];
  assert.equal(row.role, 'client');
  assert.equal(row.invited_by, primary.id);
  assert.equal((await request({ handler: revoke, method: 'DELETE', endpoint: `invitations-revoke/${row.id}` }, primary)).status, 200);
  assert.equal((await pool.query('SELECT status FROM project_invitations WHERE id = $1', [row.id])).rows[0].status, 'revoked');
});

isolatedTest('active login link creates a persisted session once and inactive accounts cannot use an unused link', async () => {
  const actor = fixture.actors.primary;
  const token = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
  await pool.query("INSERT INTO magic_link_tokens (email, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour')", [actor.email, token]);
  const event = { httpMethod: 'POST', headers: { 'x-forwarded-for': '127.0.0.4' }, body: JSON.stringify({ token, email: actor.email }), queryStringParameters: null };
  const result = await verifyLink(event);
  assert.equal(result.statusCode, 200, result.body);
  assert.equal(JSON.parse(result.body).data.user.id, actor.id);
  assert.equal((await pool.query('SELECT count(*) FROM sessions WHERE user_id = $1', [actor.id])).rows[0].count, '2');
  assert.equal((await verifyLink(event)).statusCode, 401);
  const inactive = fixture.actors.staff;
  const inactiveToken = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
  await pool.query("INSERT INTO magic_link_tokens (email, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour')", [inactive.email, inactiveToken]);
  await pool.query('UPDATE users SET is_active = false WHERE id = $1', [inactive.id]);
  const denied = await verifyLink({ ...event, body: JSON.stringify({ token: inactiveToken, email: inactive.email }) });
  assert.equal(denied.statusCode, 401, denied.body);
  assert.equal(JSON.parse(denied.body).error.code, 'USER_NOT_FOUND');
  assert.equal((await pool.query('SELECT count(*) FROM sessions WHERE user_id = $1', [inactive.id])).rows[0].count, '1');
});

isolatedTest('manager and super-admin overrides retain the authenticated approval actor', async () => {
  for (const name of ['manager', 'admin'] as const) {
    await pool.query("UPDATE deliverables SET status = 'awaiting_approval', approved_by = NULL, approved_at = NULL WHERE id = $1", [fixture.deliverableId]);
    const actor = fixture.actors[name];
    const approved = await request({ handler: deliverables, method: 'PATCH', endpoint: `deliverables/${fixture.deliverableId}`,
      data: { status: 'approved', approved_by: fixture.actors.secondary.id } }, actor);
    assert.equal(approved.status, 200, JSON.stringify(approved.body));
    assert.equal(approved.body.approved_by, actor.id);
    const history = (await pool.query('SELECT approved_by FROM deliverables WHERE id = $1', [fixture.deliverableId])).rows[0];
    const edit = await request({ handler: deliverables, method: 'PATCH', endpoint: `deliverables/${fixture.deliverableId}`,
      data: { status: 'final_delivered', approved_by: fixture.actors.secondary.id } }, actor);
    assert.equal(edit.status, 200, JSON.stringify(edit.body));
    assert.equal((await pool.query('SELECT approved_by FROM deliverables WHERE id = $1', [fixture.deliverableId])).rows[0].approved_by, history.approved_by);
  }
});

isolatedTest('permitted proposal discussions preserve their authors and support own edits', async () => {
  for (const name of ['primary', 'staff', 'manager', 'admin'] as const) {
    const actor = fixture.actors[name];
    const created = await request({ handler: comments, method: 'POST', endpoint: 'comments', data: {
      proposalId: fixture.proposalId, content: `Synthetic ${name} discussion`, userId: fixture.actors.unrelated.id,
    } }, actor);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const comment = created.body.comment;
    assert.equal(comment.userId, actor.id);
    const edited = await request({ handler: comments, method: 'PUT', endpoint: 'comments', data: { id: comment.id, content: 'Author edited discussion' } }, actor);
    assert.equal(edited.status, 200, JSON.stringify(edited.body));
    assert.equal((await pool.query('SELECT content FROM proposal_comments WHERE id = $1', [comment.id])).rows[0].content, 'Author edited discussion');
  }
});

isolatedTest('manager project creation and proposal edits preserve client access while project deletion remains super-admin only', async () => {
  for (const name of ['manager', 'admin'] as const) {
    const actor = fixture.actors[name];
    const proposal = await request({ handler: proposals, method: 'PUT', endpoint: `proposals/${fixture.proposalId}`, data: { description: `${name} updated commercial description` } }, actor);
    assert.equal(proposal.status, 200, JSON.stringify(proposal.body));
    assert.equal((await pool.query('SELECT description FROM proposals WHERE id = $1', [fixture.proposalId])).rows[0].description, `${name} updated commercial description`);
    const inquiry = await request({ handler: inquiries, method: 'PUT', endpoint: `inquiries/${inquiryId}`, data: { status: 'reviewing' } }, actor);
    assert.equal(inquiry.status, 200, JSON.stringify(inquiry.body));
    const project = await request({ handler: projects, method: 'POST', endpoint: 'projects', data: {
      name: 'Synthetic administrative project', clientUserId: fixture.actors.primary.id, deliverables: ['Synthetic output'],
    } }, actor);
    assert.equal(project.status, 201, JSON.stringify(project.body));
    const id = project.body.id;
    assert.equal((await request({ handler: projects, method: 'GET', endpoint: `projects/${id}` }, fixture.actors.primary)).status, 200);
    const denied = await request({ handler: projects, method: 'DELETE', endpoint: `projects/${id}` }, fixture.actors.manager);
    assert.equal(denied.status, 403);
    await pool.query("UPDATE projects SET status = 'archived' WHERE id = $1", [id]);
    assert.equal((await request({ handler: projects, method: 'DELETE', endpoint: `projects/${id}` }, fixture.actors.admin)).status, 200);
    assert.equal((await pool.query('SELECT count(*) FROM projects WHERE id = $1', [id])).rows[0].count, '0');
  }
});

isolatedTest('persisted inquiry ownership grants the same proposal and inquiry access after contact details change', async () => {
  await pool.query('UPDATE projects SET proposal_id = NULL, inquiry_id = NULL WHERE id = $1', [fixture.projectId]);
  await pool.query("UPDATE inquiries SET client_user_id = $1, contact_email = 'previous-contact@example.test' WHERE id = $2", [fixture.actors.primary.id, inquiryId]);
  for (const [handler, endpoint, id] of [[inquiries, 'inquiries', inquiryId], [proposals, 'proposals', fixture.proposalId]] as const) {
    const listed = await request({ handler, method: 'GET', endpoint }, fixture.actors.primary);
    assert.equal(listed.status, 200);
    assert.deepEqual(listed.body.map((row: { id: string }) => row.id), [id]);
    assert.equal((await request({ handler, method: 'GET', endpoint: `${endpoint}/${id}` }, fixture.actors.primary)).status, 200);
    assert.equal((await request({ handler, method: 'GET', endpoint: `${endpoint}/${id}` }, fixture.actors.unrelated)).status, 403);
  }
});
