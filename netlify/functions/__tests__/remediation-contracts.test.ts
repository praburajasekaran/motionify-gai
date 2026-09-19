import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { CANONICAL_PROJECT_STATUSES } from '../../../database/contract';
import { dbStatusToDisplay, displayStatusToDb } from '../../../utils/projectStatusMapping';
import { createProjectSchema, updateProjectSchema } from '../_shared/schemas';
import { validateStatusTransition } from '../_shared/projectStatusTransitions';

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

describe('email caller policies', () => {
  it('removes an inquiry token and returns the delivery failure contract', () => {
    const code = source('../inquiry-request-verification.ts');
    assert.match(code, /DELETE FROM pending_inquiry_verifications WHERE token/);
    assert.match(code, /statusCode:\s*503/);
    assert.match(code, /EMAIL_DELIVERY_FAILED/);
    assert.match(code, /getAppEnvironment\(process\.env\) === 'development'/);
  });

  it('keeps magic-login responses generic while removing unusable tokens', () => {
    const code = source('../auth-request-magic-link.ts');
    assert.match(code, /DELETE FROM magic_link_tokens WHERE token/);
    assert.match(code, /If this email exists in our system/);
    assert.match(code, /statusCode:\s*200/);
  });

  it('reports additive delivery status for successful business mutations', () => {
    for (const file of [
      '../users-create.ts',
      '../invitations-create.ts',
      '../project-invitations-create.ts',
      '../invitations-resend.ts',
      '../proposals.ts',
      '../deliverables.ts',
      '../tasks.ts',
      '../comments.ts',
      '../revision-requests.ts',
    ]) {
      assert.match(source(file), /emailDelivery/);
    }
  });

  it('uses the global invitation template for account invitations', () => {
    assert.match(source('../send-email.ts'), /sendUserInvitationEmail/);
    assert.match(source('../users-create.ts'), /sendUserInvitationEmail/);
    assert.match(source('../invitations-create.ts'), /sendUserInvitationEmail/);
  });
});

describe('transactional invitation and session contracts', () => {
  it('uses the canonical project name and one transaction for acceptance', () => {
    const code = source('../invitations-accept.ts');
    assert.match(code, /p\.name AS project_name/i);
    assert.doesNotMatch(code, /p\.title AS project_name/i);
    assert.match(code, /transaction\(\(client\) => acceptProjectInvitation\(client, token\)\)/);
    assert.match(code, /UPDATE project_invitations/);
    assert.match(code, /INSERT INTO project_team/);
    assert.match(code, /INSERT INTO activities/);
  });

  it('revokes the current session on logout and all sessions on role change', () => {
    assert.match(source('../auth-logout.ts'), /DELETE FROM sessions WHERE id = \$1 AND user_id = \$2/);
    assert.match(source('../users-update.ts'), /DELETE FROM sessions WHERE user_id = \$1/);
    assert.match(source('../users-delete.ts'), /DELETE FROM sessions WHERE user_id = \$1/);
    assert.match(source('../../../contexts/AuthContext.tsx'), /X-Requested-With/);
    assert.match(source('../_shared/jwt.ts'), /jwtid:\s*crypto\.randomUUID\(\)/);
  });
});

describe('canonical project lifecycle', () => {
  it('keeps API validation and frontend mappings on the database value set', () => {
    for (const status of CANONICAL_PROJECT_STATUSES) {
      assert.equal(updateProjectSchema.shape.status.safeParse(status).success, true);
      assert.equal(createProjectSchema.shape.status.safeParse(status).success, true);
      assert.equal(displayStatusToDb(dbStatusToDisplay(status)), status);
    }

    assert.equal(updateProjectSchema.shape.status.safeParse('review').success, false);
    assert.equal(updateProjectSchema.shape.status.safeParse('in_progress').success, false);
  });

  it('supports the in_review lifecycle and terminal cancellation', () => {
    assert.equal(validateStatusTransition('active', 'in_review').valid, true);
    assert.equal(validateStatusTransition('in_review', 'completed').valid, true);
    assert.equal(validateStatusTransition('active', 'cancelled').valid, true);
    assert.equal(validateStatusTransition('cancelled', 'active').valid, false);
  });
});

describe('project creation contracts', () => {
  it('keeps direct project creation and generated deliverables in one transaction', () => {
    const code = source('../projects.ts');
    assert.match(code, /transaction\(async \(client\)/);
    assert.match(code, /INSERT INTO projects/);
    assert.match(code, /INSERT INTO deliverables \(project_id, name, description, status\)/);
    assert.doesNotMatch(code, /INSERT INTO deliverables \(id, project_id, name, description, status\)/);
  });

  it('persists client project requests with the pending canonical default', () => {
    const code = source('../client-project-request.ts');
    assert.match(code, /INSERT INTO project_requests/);
    assert.match(code, /targetUserId/);
    assert.match(code, /'pending'/);
  });
});
