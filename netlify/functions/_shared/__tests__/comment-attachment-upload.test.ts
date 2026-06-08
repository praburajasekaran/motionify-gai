import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SCHEMAS } from '../schemas';
import { isAuthorizedCommentAttachmentKey } from '../attachment-keys';

describe('comment attachment uploads', () => {
  it('accepts pending user uploads for presign without a project folder', () => {
    const result = SCHEMAS.r2.presignDeliverable.safeParse({
      fileName: 'brief.pdf',
      fileType: 'application/pdf',
      fileSize: 42_000,
    });

    assert.equal(result.success, true);
  });

  it('rejects the previous comment attachment presign payload', () => {
    const result = SCHEMAS.r2.presignDeliverable.safeParse({
      fileName: 'brief.pdf',
      fileType: 'application/pdf',
      projectId: 'proposal-1',
      folder: 'comment-attachments',
    });

    assert.equal(result.success, false);
  });

  it('allows a user-owned pending upload to be attached to a new comment', () => {
    assert.equal(
      isAuthorizedCommentAttachmentKey(
        'uploads/user-1/1700000000000-brief.pdf',
        'comment-1',
        'user-1'
      ),
      true
    );
  });

  it('rejects another user pending upload key', () => {
    assert.equal(
      isAuthorizedCommentAttachmentKey(
        'uploads/user-2/1700000000000-brief.pdf',
        'comment-1',
        'user-1'
      ),
      false
    );
  });
});
