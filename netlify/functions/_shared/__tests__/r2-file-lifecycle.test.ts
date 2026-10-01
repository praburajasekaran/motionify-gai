import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.JWT_SECRET ||= 'test-jwt-secret-for-r2-lifecycle-tests';

const [authorization, r2, presign, projectFiles] = await Promise.all([
  import('../authorization'),
  import('../r2'),
  import('../../r2-presign'),
  import('../../project-files'),
]);
const { AuthorizationError } = authorization;
const { deleteFromR2, getR2Config } = r2;
const { authorizeR2DownloadKey } = presign;
const {
  createProjectFileStorageDeleteFailureResponse,
  deleteProjectFileObjectAndMetadata,
  ProjectFileKeyConflictError,
  ProjectFileStorageDeleteError,
} = projectFiles;

const testUser = {
  userId: 'client-1',
  email: 'client@example.com',
  role: 'client',
  fullName: 'Client One',
};

function projectFileDownloadDependencies(
  requireProject: (projectId: string) => Promise<void>
) {
  return {
    async query(text: string) {
      if (text.includes('FROM deliverables')) return { rows: [] };
      if (text.includes('FROM comment_attachments')) return { rows: [] };
      if (text.includes('FROM project_files')) {
        return { rows: [{ id: 'file-1', project_id: 'project-1' }] };
      }
      throw new Error(`Unexpected query: ${text}`);
    },
    requireDeliverable: async () => undefined,
    requireProposal: async () => undefined,
    requireProject: async (_user: unknown, projectId: string) => requireProject(projectId),
  };
}

describe('R2 configuration', () => {
  it('normalizes account ids into the shared R2 endpoint', () => {
    const config = getR2Config({
      R2_ACCOUNT_ID: 'account-123',
      R2_ACCESS_KEY_ID: 'access-key',
      R2_SECRET_ACCESS_KEY: 'secret-key',
      R2_BUCKET_NAME: 'project-files',
    });

    assert.deepEqual(config, {
      accountId: 'account-123',
      accessKeyId: 'access-key',
      secretAccessKey: 'secret-key',
      bucketName: 'project-files',
      endpoint: 'https://account-123.r2.cloudflarestorage.com',
    });
  });
});

describe('R2 download authorization', () => {
  it('resolves a project file key and applies the project access guard', async () => {
    const guardedProjects: string[] = [];

    const authorized = await authorizeR2DownloadKey(
      'projects/project-1/briefs/brief.pdf',
      testUser,
      projectFileDownloadDependencies(async (projectId) => {
        guardedProjects.push(projectId);
      })
    );

    assert.equal(authorized, true);
    assert.deepEqual(guardedProjects, ['project-1']);
  });

  it('propagates a cross-project access denial before signing a download', async () => {
    await assert.rejects(
      () => authorizeR2DownloadKey(
        'projects/project-1/briefs/brief.pdf',
        testUser,
        projectFileDownloadDependencies(async (projectId) => {
          throw new AuthorizationError(403, 'FORBIDDEN', 'Project', projectId);
        })
      ),
      (error) => error instanceof AuthorizationError && error.statusCode === 403
    );
  });
});

describe('project file deletion', () => {
  it('sends the configured bucket and key to R2', async () => {
    const commands: Array<{ input?: { Bucket?: string; Key?: string } }> = [];

    await deleteFromR2('projects/project-1/file.pdf', {
      bucketName: 'project-files',
      client: {
        async send(command) {
          commands.push(command);
          return {};
        },
      },
    });

    assert.equal(commands.length, 1);
    assert.deepEqual(commands[0].input, {
      Bucket: 'project-files',
      Key: 'projects/project-1/file.pdf',
    });
  });

  it('deletes the R2 object before deleting its metadata', async () => {
    const operations: string[] = [];

    await deleteProjectFileObjectAndMetadata('file-1', 'projects/project-1/file.pdf', {
      deleteObject: async () => {
        operations.push('r2');
      },
      query: async (text: string) => {
        operations.push(text.includes('id <>') ? 'ownership-check' : 'database');
        return { rows: [] };
      },
    });

    assert.deepEqual(operations, ['ownership-check', 'r2', 'database']);
  });

  it('refuses to delete an R2 object referenced by another metadata row', async () => {
    let r2DeleteCalled = false;

    await assert.rejects(
      () => deleteProjectFileObjectAndMetadata('file-2', 'projects/project-1/file.pdf', {
        deleteObject: async () => {
          r2DeleteCalled = true;
        },
        query: async () => ({ rows: [{ id: 'file-1' }] }),
      }),
      (error) => error instanceof ProjectFileKeyConflictError
    );

    assert.equal(r2DeleteCalled, false);
  });

  it('preserves metadata when R2 deletion fails', async () => {
    let databaseDeleteCalled = false;

    await assert.rejects(
      () => deleteProjectFileObjectAndMetadata('file-1', 'projects/project-1/file.pdf', {
        deleteObject: async () => {
          throw new Error('R2 unavailable');
        },
        query: async (text: string) => {
          if (text.startsWith('DELETE')) databaseDeleteCalled = true;
          return { rows: [] };
        },
      }),
      (error) => error instanceof ProjectFileStorageDeleteError
    );

    assert.equal(databaseDeleteCalled, false);
  });

  it('returns a retryable gateway response for storage failures', () => {
    const response = createProjectFileStorageDeleteFailureResponse({
      'Access-Control-Allow-Origin': 'https://motionify.studio',
    });
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 502);
    assert.equal(response.headers['Retry-After'], '5');
    assert.deepEqual(body.error, {
      code: 'STORAGE_DELETE_FAILED',
      message: 'File storage is temporarily unavailable. Please retry.',
      retryable: true,
    });
  });

  it('treats object-not-found deletion as success so metadata cleanup can finish', async () => {
    let metadataDeleted = false;

    await deleteProjectFileObjectAndMetadata('file-1', 'projects/project-1/file.pdf', {
      deleteObject: (key) => deleteFromR2(key, {
        bucketName: 'project-files',
        client: {
          async send() {
            throw { name: 'NoSuchKey', $metadata: { httpStatusCode: 404 } };
          },
        },
      }),
      query: async (text: string) => {
        if (text.startsWith('DELETE')) metadataDeleted = true;
        return { rows: [] };
      },
    });

    assert.equal(metadataDeleted, true);
  });
});
