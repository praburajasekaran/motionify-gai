import assert from 'node:assert/strict';
import { before, beforeEach, after, test } from 'node:test';
import { initializeReadinessDatabase, readinessPool, seedReadinessFixture, type ReadinessFixture, type ReadinessActor } from '../../../scripts/readiness-fixture';
import { closePool } from '../_shared/db';
import { handler as acceptTerms } from '../projects-accept-terms';
import { handler as tasks } from '../tasks';
import { handler as deliverables } from '../deliverables';
import { handler as files } from '../deliverable-files';
import { handler as feedback } from '../deliverable-feedback';
import { handler as revisions } from '../revision-requests';
import { handler as presign } from '../r2-presign';
import type { Handler } from '../_shared/middleware';

const pool = readinessPool();
let fixture: ReadinessFixture;
before(async () => { await initializeReadinessDatabase(pool); });
beforeEach(async () => {
  await pool.query('TRUNCATE users, inquiries, projects CASCADE');
  await pool.query('DROP TABLE IF EXISTS rate_limit_entries');
  fixture = await seedReadinessFixture(pool);
});
after(async () => { await closePool(); await pool.end(); });

async function request(handler: Handler, actor: ReadinessActor | null, method: string, endpoint: string,
  payload?: Record<string, unknown>, query?: Record<string, string>) {
  const response = await handler({ httpMethod: method, path: `/.netlify/functions/${endpoint}`,
    headers: { 'x-requested-with': 'fetch', ...(actor ? { cookie: `auth_token=${actor.token}` } : {}) },
    body: payload ? JSON.stringify(payload) : null, queryStringParameters: query });
  return { status: response.statusCode, body: JSON.parse(response.body) };
}

async function uploadFile(name: string, content: Buffer, isFinal = false) {
  const signed = await request(presign, fixture.actors.manager, 'POST', 'r2-presign', {
    fileName: name, fileType: 'application/pdf', fileSize: content.length, projectId: fixture.projectId, folder: isFinal ? 'final' : 'beta',
  });
  assert.equal(signed.status, 200, JSON.stringify(signed.body));
  const transfer = await fetch(signed.body.uploadUrl, { method: 'PUT', body: new Uint8Array(content), headers: { 'Content-Type': 'application/pdf' } });
  assert.equal(transfer.status, 200);
  const saved = await request(files, fixture.actors.manager, 'POST', 'deliverable-files', {
    deliverable_id: fixture.deliverableId, file_key: signed.body.key, file_name: name,
    file_size: content.length, mime_type: 'application/pdf', file_category: 'document', is_final: isFinal,
  });
  assert.equal(saved.status, 201, JSON.stringify(saved.body));
  return saved.body;
}

async function setStatus(status: string) {
  const result = await request(deliverables, fixture.actors.manager, 'PATCH', `deliverables/${fixture.deliverableId}`, { status });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.status, status);
}

test('file discussions persist authoritative authors, timestamps and same-file replies without consuming revisions', async () => {
  const first = await uploadFile('same-name.pdf', Buffer.from('version one'));
  const second = await uploadFile('same-name.pdf', Buffer.from('version two'));
  await setStatus('awaiting_approval');
  const otherId = (await pool.query("INSERT INTO deliverables (project_id, name, status) VALUES ($1, 'Other project file', 'awaiting_approval') RETURNING id", [fixture.otherProjectId])).rows[0].id;
  const payload = { deliverableId: fixture.deliverableId, fileId: first.id, kind: 'comment', timestamp: 12.5,
    body: 'Please change this opening.', author_id: fixture.actors.manager.id, created_at: '2000-01-01' };
  assert.equal((await request(feedback, null, 'POST', 'deliverable-feedback', payload)).status, 401);
  assert.equal((await request(feedback, fixture.actors.unrelated, 'POST', 'deliverable-feedback', payload)).status, 403);
  assert.equal((await request(feedback, fixture.actors.primary, 'POST', 'deliverable-feedback', { ...payload, deliverableId: otherId })).status, 403);
  const saved = await request(feedback, fixture.actors.primary, 'POST', 'deliverable-feedback', payload);
  assert.equal(saved.status, 201, JSON.stringify(saved.body));
  assert.equal(saved.body.author_id, fixture.actors.primary.id);
  assert.equal(saved.body.file_id, first.id);
  assert.equal(saved.body.video_timestamp, 12.5);
  assert.ok(Date.parse(saved.body.created_at) > Date.now() - 60000);
  const reply = { deliverableId: fixture.deliverableId, fileId: first.id, kind: 'reply', parentId: saved.body.id, body: 'We will update it.' };
  assert.equal((await request(feedback, fixture.actors.manager, 'POST', 'deliverable-feedback', { ...reply, fileId: second.id })).status, 400);
  const replied = await request(feedback, fixture.actors.staff, 'POST', 'deliverable-feedback', reply);
  assert.equal(replied.status, 201, JSON.stringify(replied.body));
  assert.equal(replied.body.author_id, fixture.actors.staff.id);
  assert.equal(replied.body.parent_id, saved.body.id);
  assert.equal(replied.body.video_timestamp, null);
  assert.equal((await request(feedback, fixture.actors.manager, 'POST', 'deliverable-feedback', { ...reply, parentId: replied.body.id })).status, 400);
  const query = { deliverableId: fixture.deliverableId, fileId: first.id };
  for (const actor of [fixture.actors.primary, fixture.actors.manager]) {
    const loaded = await request(feedback, actor, 'GET', 'deliverable-feedback', undefined, query);
    assert.equal(loaded.status, 200);
    assert.deepEqual(loaded.body.map((comment: { body: string }) => comment.body), [payload.body, reply.body]);
  }
  assert.deepEqual((await request(feedback, fixture.actors.primary, 'GET', 'deliverable-feedback', undefined,
    { ...query, fileId: second.id })).body, []);
  assert.equal((await request(files, fixture.actors.manager, 'DELETE', `deliverable-files/${first.id}`)).status, 409);
  assert.equal((await pool.query('SELECT revisions_used FROM projects WHERE id = $1', [fixture.projectId])).rows[0].revisions_used, 0);
  await pool.query('UPDATE project_team SET removed_at = NOW() WHERE project_id = $1 AND user_id = $2', [fixture.projectId, fixture.actors.staff.id]);
  assert.equal((await request(feedback, fixture.actors.staff, 'POST', 'deliverable-feedback', reply)).status, 403);
});

test('revision file snapshots reject stale or mismatched files and preserve unknown legacy attribution', async () => {
  await request(acceptTerms, fixture.actors.primary, 'POST', 'projects-accept-terms', { projectId: fixture.projectId, accepted: true });
  const first = await uploadFile('first.pdf', Buffer.from('first'));
  const latest = await uploadFile('latest.pdf', Buffer.from('latest'));
  await setStatus('awaiting_approval');
  const payload = { deliverableId: fixture.deliverableId, feedbackText: 'Please update the opening title and lower the audio.',
    reviewedFileId: first.id, reviewedLatestFileId: first.id };
  assert.equal((await request(revisions, fixture.actors.primary, 'POST', 'revision-requests', payload)).status, 409);
  assert.equal((await request(revisions, fixture.actors.primary, 'POST', 'revision-requests', { ...payload, reviewedFileId: fixture.otherProjectId, reviewedLatestFileId: latest.id })).status, 409);
  assert.equal((await pool.query('SELECT revisions_used FROM projects WHERE id = $1', [fixture.projectId])).rows[0].revisions_used, 0);
  const saved = await request(revisions, fixture.actors.primary, 'POST', 'revision-requests', { ...payload, reviewedLatestFileId: latest.id,
    timestampedComments: [{ id: 'forged', timestamp: 1, comment: 'A draft comment', resolved: true, userId: fixture.actors.manager.id, userName: 'Forged author' }] });
  assert.equal(saved.status, 201, JSON.stringify(saved.body));
  const row = (await pool.query('SELECT * FROM revision_requests WHERE id = $1', [saved.body.id])).rows[0];
  assert.equal(row.reviewed_file_id, first.id);
  assert.equal(row.timestamped_comments[0].userId, fixture.actors.primary.id);
  assert.equal(row.timestamped_comments[0].resolved, false);
  await pool.query('INSERT INTO revision_requests (deliverable_id, project_id, requested_by, feedback_text) VALUES ($1,$2,$3,$4)',
    [fixture.deliverableId, fixture.projectId, fixture.actors.primary.id, 'Historic feedback without a known file version.']);
  const history = await request(deliverables, fixture.actors.manager, 'GET', 'deliverables', undefined, { id: fixture.deliverableId });
  assert.equal(history.status, 200);
  assert.equal(history.body.approval_history.find((entry: { feedback: string }) => entry.feedback.startsWith('Historic')).reviewedFileId, null);
});

test('private thumbnails use their owning file permissions and retain exact bytes', async () => {
  const content = Buffer.from('synthetic private thumbnail');
  const payload = { fileName: 'thumbnail.jpg', fileType: 'image/jpeg', fileSize: content.length,
    projectId: fixture.projectId, deliverableId: fixture.deliverableId, folder: 'beta' };
  const signed = await request(presign, fixture.actors.manager, 'POST', 'r2-presign', payload);
  assert.equal(signed.status, 200);
  assert.equal((await fetch(signed.body.uploadUrl, { method: 'PUT', body: content, headers: { 'Content-Type': 'image/jpeg' } })).status, 200);
  const metadata = { deliverable_id: fixture.deliverableId, file_key: `projects/${fixture.projectId}/beta/video.mp4`,
    file_name: 'video.mp4', file_category: 'video', thumbnail_key: signed.body.key };
  assert.equal((await request(files, fixture.actors.manager, 'POST', 'deliverable-files', { ...metadata,
    thumbnail_key: `projects/${fixture.otherProjectId}/beta/thumbnail.jpg` })).status, 400);
  const saved = await request(files, fixture.actors.manager, 'POST', 'deliverable-files', metadata);
  assert.equal(saved.status, 201, JSON.stringify(saved.body));
  assert.equal(saved.body.thumbnail_key, signed.body.key);
  const query = { key: signed.body.key };
  assert.equal((await request(presign, fixture.actors.primary, 'GET', 'r2-presign', undefined, query)).status, 403);
  await setStatus('awaiting_approval');
  assert.equal((await request(presign, fixture.actors.unrelated, 'GET', 'r2-presign', undefined, query)).status, 403);
  const download = await request(presign, fixture.actors.primary, 'GET', 'r2-presign', undefined, query);
  assert.equal(download.status, 200, JSON.stringify(download.body));
  assert.deepEqual(Buffer.from(await (await fetch(download.body.url)).arrayBuffer()), content);
  const loaded = await request(deliverables, fixture.actors.primary, 'GET', 'deliverables', undefined, { id: fixture.deliverableId });
  assert.equal(loaded.body.thumbnail_key, signed.body.key);
  await pool.query('UPDATE deliverable_files SET is_final = true WHERE id = $1', [saved.body.id]);
  assert.equal((await request(presign, fixture.actors.primary, 'GET', 'r2-presign', undefined, query)).status, 403);
});

test('assignment revocation committed during file registration prevents the staff insert', async () => {
  await request(deliverables, fixture.actors.manager, 'PATCH', `deliverables/${fixture.deliverableId}`, { assigned_to: fixture.actors.staff.id });
  const barrier = await pool.connect();
  let pending: Promise<Awaited<ReturnType<typeof request>>> | undefined;
  try {
    await barrier.query('BEGIN');
    await barrier.query('UPDATE deliverables SET assigned_to = NULL WHERE id = $1', [fixture.deliverableId]);
    pending = request(files, fixture.actors.staff, 'POST', 'deliverable-files', {
      deliverable_id: fixture.deliverableId, file_key: `projects/${fixture.projectId}/deliverables/${fixture.deliverableId}/beta/revoked.pdf`,
      file_name: 'revoked.pdf', file_category: 'document',
    });
    const deadline = Date.now() + 5000;
    let blocked = false;
    while (Date.now() < deadline) {
      const waiting = await pool.query("SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE 'SELECT id FROM deliverables%'");
      if (waiting.rows.length) { blocked = true; break; }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal(blocked, true, 'Registration must reach the held deliverable row lock');
    await barrier.query('COMMIT');
    assert.equal((await pending).status, 403);
    assert.equal((await pool.query('SELECT count(*) FROM deliverable_files WHERE deliverable_id = $1', [fixture.deliverableId])).rows[0].count, '0');
  } finally {
    await barrier.query('ROLLBACK');
    barrier.release();
    if (pending) await pending;
  }
});

test('primary terms acceptance persists its actor and timestamp across retries', async () => {
  const result = await request(acceptTerms, fixture.actors.primary, 'POST', 'projects-accept-terms', { projectId: fixture.projectId, accepted: true });
  assert.equal(result.status, 200);
  assert.equal(result.body.termsAcceptedBy, fixture.actors.primary.id);
  const repeat = await request(acceptTerms, fixture.actors.primary, 'POST', 'projects-accept-terms', { projectId: fixture.projectId, accepted: true });
  assert.equal(repeat.status, 200);
  assert.equal(repeat.body.termsAcceptedAt, result.body.termsAcceptedAt);
  const { rows } = await pool.query('SELECT terms_accepted_by, terms_accepted_at FROM projects WHERE id = $1', [fixture.projectId]);
  assert.equal(rows[0].terms_accepted_by, fixture.actors.primary.id);
  assert.equal(rows[0].terms_accepted_at.toISOString(), result.body.termsAcceptedAt);
});

test('assigned visible tasks and two authors comments persist for manager and client', async () => {
  const created = await request(tasks, fixture.actors.manager, 'POST', 'tasks', {
    projectId: fixture.projectId, title: 'Prepare revised synthetic video', description: 'Verification only',
    assignedTo: fixture.actors.staff.id, visible_to_client: true,
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.assignedTo, fixture.actors.staff.id);
  const id = created.body.id;
  const updated = await request(tasks, fixture.actors.staff, 'PATCH', `tasks/${id}`, { status: 'in_progress' });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  for (const [actor, content] of [[fixture.actors.primary, 'Please review the revised opening.'],
    [fixture.actors.manager, 'The assigned editor will update it.']] as const) {
    const comment = await request(tasks, actor, 'POST', `tasks/${id}/comments`, { content });
    assert.equal(comment.status, 201, JSON.stringify(comment.body));
  }
  for (const actor of [fixture.actors.manager, fixture.actors.primary]) {
    const loaded = await request(tasks, actor, 'GET', `tasks/${id}`);
    assert.equal(loaded.status, 200, JSON.stringify(loaded.body));
    assert.equal(loaded.body.status, 'in_progress');
    assert.equal(loaded.body.assignedTo, fixture.actors.staff.id);
    assert.deepEqual(loaded.body.comments.map((comment: { userId: string; content: string }) => [comment.userId, comment.content]), [
      [fixture.actors.primary.id, 'Please review the revised opening.'],
      [fixture.actors.manager.id, 'The assigned editor will update it.'],
    ]);
  }
});

test('current multi-file beta download returns the exact uploaded 1 MiB content', async () => {
  const content = Buffer.alloc(1024 * 1024, 0x52);
  const file = await uploadFile('synthetic-beta.pdf', content);
  await setStatus('awaiting_approval');
  const loaded = await request(files, fixture.actors.primary, 'GET', 'deliverable-files', undefined, { deliverableId: fixture.deliverableId });
  assert.equal(loaded.status, 200);
  assert.equal(loaded.body[0].file_key, file.file_key);
  const signed = await request(presign, fixture.actors.primary, 'GET', 'r2-presign', undefined, { key: file.file_key });
  assert.equal(signed.status, 200, JSON.stringify(signed.body));
  const downloaded = await fetch(signed.body.url);
  assert.equal(downloaded.status, 200);
  assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), content);
});

test('only assigned active staff can upload beta files and cannot release or reassign a deliverable', async () => {
  const payload = { fileName: 'assigned-beta.pdf', fileType: 'application/pdf', fileSize: 1024 * 1024,
    projectId: fixture.projectId, deliverableId: fixture.deliverableId, folder: 'beta' };
  const endpoint = `deliverables/${fixture.deliverableId}`;
  assert.equal((await request(presign, fixture.actors.staff, 'POST', 'r2-presign', payload)).status, 403);
  assert.equal((await request(deliverables, fixture.actors.manager, 'PATCH', endpoint, { assigned_to: fixture.actors.unrelated.id })).status, 400);
  const assigned = await request(deliverables, fixture.actors.manager, 'PATCH', endpoint, { assigned_to: fixture.actors.staff.id });
  assert.equal(assigned.status, 200);
  assert.equal(assigned.body.assigned_to, fixture.actors.staff.id);
  assert.equal((await request(deliverables, fixture.actors.primary, 'PATCH', endpoint, { status: 'approved', assigned_to: fixture.actors.primary.id })).status, 403);
  assert.equal((await request(deliverables, fixture.actors.staff, 'PATCH', endpoint, { assigned_to: null })).status, 403);
  assert.equal((await request(presign, fixture.actors.staff, 'POST', 'r2-presign', { ...payload, folder: 'final' })).status, 403);
  const { deliverableId, ...legacy } = payload;
  assert.equal((await request(presign, fixture.actors.staff, 'POST', 'r2-presign', legacy)).status, 403);
  assert.equal((await request(presign, fixture.actors.staff, 'POST', 'r2-presign', { ...payload, projectId: fixture.otherProjectId })).status, 400);
  const signed = await request(presign, fixture.actors.staff, 'POST', 'r2-presign', payload);
  assert.equal(signed.status, 200, JSON.stringify(signed.body));
  const content = Buffer.alloc(1024 * 1024, 0x53);
  assert.equal((await fetch(signed.body.uploadUrl, { method: 'PUT', body: content, headers: { 'Content-Type': 'application/pdf' } })).status, 200);
  const metadata = { deliverable_id: fixture.deliverableId, file_key: signed.body.key,
    file_name: payload.fileName, file_size: content.length, mime_type: payload.fileType, file_category: 'document' };
  assert.equal((await request(files, fixture.actors.staff, 'POST', 'deliverable-files', { ...metadata, is_final: true })).status, 403);
  assert.equal((await request(files, fixture.actors.staff, 'POST', 'deliverable-files', { ...metadata, file_key: `projects/${fixture.projectId}/beta/unscoped.pdf` })).status, 400);
  const saved = await request(files, fixture.actors.staff, 'POST', 'deliverable-files', metadata);
  assert.equal(saved.status, 201, JSON.stringify(saved.body));
  assert.equal(saved.body.uploaded_by, fixture.actors.staff.id);
  assert.equal((await request(deliverables, fixture.actors.staff, 'PATCH', endpoint, { status: 'beta_ready' })).status, 200);
  assert.equal((await request(deliverables, fixture.actors.staff, 'PATCH', endpoint, { status: 'awaiting_approval' })).status, 403);
  assert.equal((await request(files, fixture.actors.staff, 'DELETE', `deliverable-files/${saved.body.id}`)).status, 403);
  const download = await request(presign, fixture.actors.staff, 'GET', 'r2-presign', undefined, { key: signed.body.key });
  assert.equal(download.status, 200);
  assert.deepEqual(Buffer.from(await (await fetch(download.body.url)).arrayBuffer()), content);
  await setStatus('awaiting_approval');
  assert.equal((await request(presign, fixture.actors.staff, 'POST', 'r2-presign', payload)).status, 403);
  await setStatus('revision_requested');
  await pool.query('UPDATE project_team SET removed_at = NOW() WHERE project_id = $1 AND user_id = $2', [fixture.projectId, fixture.actors.staff.id]);
  assert.equal((await request(presign, fixture.actors.staff, 'POST', 'r2-presign', payload)).status, 403);
  assert.equal((await request(files, fixture.actors.staff, 'POST', 'deliverable-files', metadata)).status, 403);
});

test('terms, revision feedback, resubmission, approval and final download form a persisted cycle', async () => {
  const accepted = await request(acceptTerms, fixture.actors.primary, 'POST', 'projects-accept-terms', { projectId: fixture.projectId, accepted: true });
  assert.equal(accepted.status, 200);
  const beta = await uploadFile('first-review.pdf', Buffer.from('synthetic beta version one'));
  await setStatus('beta_ready');
  await setStatus('awaiting_approval');
  const comments = [{ id: 'opening-feedback', timestamp: 12, comment: 'Use the new opening shot.', resolved: false,
    userId: fixture.actors.primary.id, userName: fixture.actors.primary.fullName }];
  const revision = await request(revisions, fixture.actors.primary, 'POST', 'revision-requests', {
    deliverableId: fixture.deliverableId, feedbackText: 'Please update the opening shot and lower the audio.',
    reviewedFileId: beta.id, reviewedLatestFileId: beta.id,
    timestampedComments: comments, issueCategories: ['audio', 'editing'],
  });
  assert.equal(revision.status, 201, JSON.stringify(revision.body));
  assert.equal(revision.body.revisionsUsed, 1);
  const retry = await request(revisions, fixture.actors.primary, 'POST', 'revision-requests', {
    deliverableId: fixture.deliverableId, feedbackText: 'Please update the opening shot and lower the audio.',
  });
  assert.equal(retry.status, 400);
  const revised = await uploadFile('second-review.pdf', Buffer.from('synthetic beta version two'));
  assert.notEqual(revised.file_key, beta.file_key);
  await setStatus('awaiting_approval');
  const history = await request(revisions, fixture.actors.manager, 'GET', 'revision-requests', undefined, { deliverableId: fixture.deliverableId });
  assert.equal(history.status, 200);
  assert.equal(history.body.length, 1);
  assert.equal(history.body[0].requested_by, fixture.actors.primary.id);
  assert.equal(history.body[0].reviewed_file_id, beta.id);
  assert.deepEqual(history.body[0].timestamped_comments.map(({ createdAt, ...comment }: { createdAt: string }) => {
    assert.ok(Date.parse(createdAt)); return comment;
  }), comments);
  const approved = await request(deliverables, fixture.actors.primary, 'PATCH', `deliverables/${fixture.deliverableId}`, { status: 'approved' });
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  assert.equal(approved.body.approved_by, fixture.actors.primary.id);
  const finalContent = Buffer.from('synthetic approved final content');
  const finalFile = await uploadFile('approved-final.pdf', finalContent, true);
  await pool.query(`INSERT INTO payments (proposal_id, project_id, payment_type, amount, currency, status)
    VALUES ($1, $2, 'balance', 100, 'INR', 'completed')`, [fixture.proposalId, fixture.projectId]);
  await setStatus('final_delivered');
  const { rows } = await pool.query(`SELECT d.status, d.approved_by, d.approved_at, d.final_delivered_at,
    p.revisions_used, p.terms_accepted_by FROM deliverables d JOIN projects p ON p.id = d.project_id WHERE d.id = $1`, [fixture.deliverableId]);
  assert.equal(rows[0].status, 'final_delivered');
  assert.equal(rows[0].approved_by, fixture.actors.primary.id);
  assert.equal(rows[0].terms_accepted_by, fixture.actors.primary.id);
  assert.equal(rows[0].revisions_used, 1);
  assert(rows[0].approved_at instanceof Date);
  assert(rows[0].final_delivered_at instanceof Date);
  for (const query of [{ id: fixture.deliverableId }, { projectId: fixture.projectId }]) {
    const loaded = await request(deliverables, fixture.actors.primary, 'GET', 'deliverables', undefined, query);
    assert.equal(loaded.status, 200, JSON.stringify(loaded.body));
    const history = Array.isArray(loaded.body) ? loaded.body[0].approval_history : loaded.body.approval_history;
    assert.deepEqual(history.map((entry: { action: string; userId: string }) => [entry.action, entry.userId]), [
      ['rejected', fixture.actors.primary.id], ['approved', fixture.actors.primary.id],
    ]);
    assert.deepEqual(history[0].timestampedComments.map(({ createdAt, ...comment }: { createdAt: string }) => comment), comments);
    assert.equal(history[0].feedback, 'Please update the opening shot and lower the audio.');
  }
  const signed = await request(presign, fixture.actors.primary, 'GET', 'r2-presign', undefined, { key: finalFile.file_key });
  assert.equal(signed.status, 200, JSON.stringify(signed.body));
  assert.deepEqual(Buffer.from(await (await fetch(signed.body.url)).arrayBuffer()), finalContent);
});

test('unrelated client cannot sign a current deliverable file or see its metadata', async () => {
  const file = await uploadFile('private-beta.pdf', Buffer.from('private synthetic file'));
  const denied = await request(presign, fixture.actors.unrelated, 'GET', 'r2-presign', undefined, { key: file.file_key });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.url, undefined);
  const metadata = await request(files, fixture.actors.unrelated, 'GET', 'deliverable-files', undefined, { deliverableId: fixture.deliverableId });
  assert.equal(metadata.status, 403);
});

test('legacy deliverable download continues to authorize the same project', async () => {
  const key = `projects/${fixture.projectId}/deliverables/legacy.pdf`;
  await pool.query("UPDATE deliverables SET beta_file_key = $1, status = 'awaiting_approval' WHERE id = $2", [key, fixture.deliverableId]);
  const allowed = await request(presign, fixture.actors.primary, 'GET', 'r2-presign', undefined, { key });
  assert.equal(allowed.status, 200, JSON.stringify(allowed.body));
  const denied = await request(presign, fixture.actors.unrelated, 'GET', 'r2-presign', undefined, { key });
  assert.equal(denied.status, 403);
});

test('client cannot read or sign an internal beta before it is sent for review', async () => {
  const file = await uploadFile('internal-beta.pdf', Buffer.from('internal beta'));
  await setStatus('beta_ready');
  const metadata = await request(files, fixture.actors.primary, 'GET', 'deliverable-files', undefined, { deliverableId: fixture.deliverableId });
  assert.equal(metadata.status, 200);
  assert.deepEqual(metadata.body, []);
  const signed = await request(presign, fixture.actors.primary, 'GET', 'r2-presign', undefined, { key: file.file_key });
  assert.equal(signed.status, 403);
  const staffSigned = await request(presign, fixture.actors.staff, 'GET', 'r2-presign', undefined, { key: file.file_key });
  assert.equal(staffSigned.status, 200);
});

test('client final download requires both release and full completed payment', async () => {
  const file = await uploadFile('unreleased-final.pdf', Buffer.from('unreleased final'), true);
  await setStatus('approved');
  let signed = await request(presign, fixture.actors.primary, 'GET', 'r2-presign', undefined, { key: file.file_key });
  assert.equal(signed.status, 403);
  await setStatus('final_delivered');
  signed = await request(presign, fixture.actors.primary, 'GET', 'r2-presign', undefined, { key: file.file_key });
  assert.equal(signed.status, 403);
  await pool.query(`INSERT INTO payments (proposal_id, project_id, payment_type, amount, currency, status)
    VALUES ($1, $2, 'balance', 100, 'INR', 'pending')`, [fixture.proposalId, fixture.projectId]);
  signed = await request(presign, fixture.actors.primary, 'GET', 'r2-presign', undefined, { key: file.file_key });
  assert.equal(signed.status, 403);
  await pool.query("UPDATE payments SET status = 'completed' WHERE project_id = $1", [fixture.projectId]);
  signed = await request(presign, fixture.actors.primary, 'GET', 'r2-presign', undefined, { key: file.file_key });
  assert.equal(signed.status, 200, JSON.stringify(signed.body));
});

test('expired final downloads deny clients and support while retaining super-admin recovery', async () => {
  const file = await uploadFile('expired-final.pdf', Buffer.from('expired final'), true);
  await pool.query(`UPDATE deliverables SET status = 'final_delivered',
    final_delivered_at = NOW() - INTERVAL '366 days' WHERE id = $1`, [fixture.deliverableId]);
  for (const actor of [fixture.actors.primary, fixture.actors.manager]) {
    const signed = await request(presign, actor, 'GET', 'r2-presign', undefined, { key: file.file_key });
    assert.equal(signed.status, 403);
  }
  const recovered = await request(presign, fixture.actors.admin, 'GET', 'r2-presign', undefined, { key: file.file_key });
  assert.equal(recovered.status, 200);
});

async function concurrentRequests(table: 'revision_requests' | 'deliverables', operations: Array<() => ReturnType<typeof request>>) {
  const barrier = await pool.connect();
  await barrier.query('BEGIN');
  await barrier.query(`LOCK TABLE ${table} IN SHARE MODE`);
  const pending = Promise.all(operations.map(operation => operation()));
  let blocked = 0;
  try {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline && blocked < operations.length) {
      const state = await pool.query(`SELECT COUNT(*) FROM pg_stat_activity
        WHERE datname = current_database() AND wait_event_type = 'Lock'`);
      blocked = Number(state.rows[0].count);
      if (blocked < operations.length) await new Promise(resolve => setTimeout(resolve, 20));
    }
  } finally {
    await barrier.query('ROLLBACK');
    barrier.release();
  }
  const results = await pending;
  assert.equal(blocked, operations.length, 'Concurrent requests must reach the database barrier');
  return results;
}

test('simultaneous revision submissions consume exactly one revision for one review', async () => {
  await request(acceptTerms, fixture.actors.primary, 'POST', 'projects-accept-terms', { projectId: fixture.projectId, accepted: true });
  await setStatus('awaiting_approval');
  const submit = () => request(revisions, fixture.actors.primary, 'POST', 'revision-requests', {
    deliverableId: fixture.deliverableId, feedbackText: 'Please replace the opening with our approved title.',
  });
  const results = await concurrentRequests('revision_requests', [submit, submit]);
  assert.deepEqual(results.map(result => result.status).sort(), [201, 400]);
  const { rows } = await pool.query(`SELECT revisions_used,
    (SELECT COUNT(*) FROM revision_requests WHERE deliverable_id = $2) AS requests
    FROM projects WHERE id = $1`, [fixture.projectId, fixture.deliverableId]);
  assert.equal(rows[0].revisions_used, 1);
  assert.equal(rows[0].requests, '1');
});

test('approval cannot overwrite a revision submitted from another open review session', async () => {
  await request(acceptTerms, fixture.actors.primary, 'POST', 'projects-accept-terms', { projectId: fixture.projectId, accepted: true });
  await setStatus('awaiting_approval');
  const results = await concurrentRequests('deliverables', [
    () => request(revisions, fixture.actors.primary, 'POST', 'revision-requests', {
      deliverableId: fixture.deliverableId, feedbackText: 'Please replace the opening with our approved title.',
    }),
    () => request(deliverables, fixture.actors.primary, 'PATCH', `deliverables/${fixture.deliverableId}`, { status: 'approved' }),
  ]);
  assert.equal(results[0].status, 201);
  assert.equal(results[1].status, 409);
  const { rows } = await pool.query('SELECT status, approved_by FROM deliverables WHERE id = $1', [fixture.deliverableId]);
  assert.equal(rows[0].status, 'revision_requested');
  assert.equal(rows[0].approved_by, null);
});
