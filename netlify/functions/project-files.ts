import { query as dbQuery } from './_shared/db';
import { logActivity } from './_shared/logActivity';
import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { z } from 'zod';
import {
  AuthorizationError,
  createAuthorizationResponse,
  requireProjectAccess,
} from './_shared/authorization';
import { isAdminLike } from './_shared/roles';
import { deleteFromR2 } from './_shared/r2';

const createProjectFileSchema = z.object({
  projectId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  fileType: z.string().max(100).optional(),
  fileSize: z.number().optional(),
  r2Key: z.string().min(1),
});

type QueryFunction = (text: string, params?: any[]) => Promise<{ rows: any[] }>;

export interface DeleteProjectFileDependencies {
  deleteObject: (key: string) => Promise<void>;
  query: QueryFunction;
}

const defaultDeleteProjectFileDependencies: DeleteProjectFileDependencies = {
  deleteObject: deleteFromR2,
  query: dbQuery,
};

export class ProjectFileStorageDeleteError extends Error {
  constructor(public readonly cause: unknown) {
    super('Project file storage deletion failed');
    this.name = 'ProjectFileStorageDeleteError';
  }
}

export class ProjectFileKeyConflictError extends Error {
  constructor() {
    super('Project file key is referenced by another metadata row');
    this.name = 'ProjectFileKeyConflictError';
  }
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: string }).code === '23505');
}

function createProjectFileKeyConflictResponse(headers: Record<string, string>) {
  return {
    statusCode: 409,
    headers,
    body: JSON.stringify({
      error: {
        code: 'FILE_KEY_ALREADY_REGISTERED',
        message: 'This uploaded file is already registered.',
      },
    }),
  };
}

/**
 * Remove storage before metadata so an R2 failure leaves a retriable database
 * record. R2 deletion is idempotent, allowing a retry to finish metadata
 * cleanup after a later database failure.
 */
export async function deleteProjectFileObjectAndMetadata(
  fileId: string,
  r2Key: string,
  dependencies: DeleteProjectFileDependencies = defaultDeleteProjectFileDependencies
): Promise<void> {
  const aliases = await dependencies.query(
    `SELECT id FROM project_files WHERE r2_key = $1 AND id <> $2 LIMIT 1`,
    [r2Key, fileId]
  );
  if (aliases.rows.length > 0) {
    throw new ProjectFileKeyConflictError();
  }

  try {
    await dependencies.deleteObject(r2Key);
  } catch (error) {
    throw new ProjectFileStorageDeleteError(error);
  }
  await dependencies.query(`DELETE FROM project_files WHERE id = $1`, [fileId]);
}

export function createProjectFileStorageDeleteFailureResponse(headers: Record<string, string>) {
  return {
    statusCode: 502,
    headers: {
      ...headers,
      'Retry-After': '5',
    },
    body: JSON.stringify({
      error: {
        code: 'STORAGE_DELETE_FAILED',
        message: 'File storage is temporarily unavailable. Please retry.',
        retryable: true,
      },
    }),
  };
}

function mapFileFromDB(row: any) {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.file_name,
    type: row.file_type,
    size: row.file_size ? Number(row.file_size) : 0,
    key: row.r2_key,
    uploadedBy: row.uploaded_by,
    uploadedByName: row.uploaded_by_name || null,
    uploadedAt: row.created_at,
  };
}

export const handler = compose(
  withCORS(['GET', 'POST', 'DELETE']),
  withAuth(),
  withRateLimit(RATE_LIMITS.api, 'project-files')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  try {
    const userRole = auth?.user?.role;
    const userId = auth?.user?.userId;

    // ========================================================================
    // GET /project-files?projectId={id}
    // ========================================================================
    if (event.httpMethod === 'GET') {
      const { projectId } = event.queryStringParameters || {};

      if (!projectId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'projectId parameter is required' }),
        };
      }

      await requireProjectAccess(auth?.user, projectId, { operation: 'project-files.list' });

      // Verify user has access to this project
      const projectResult = await dbQuery(
        `SELECT id FROM projects WHERE id = $1`,
        [projectId]
      );

      if (projectResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Project not found' }),
        };
      }

      const filesResult = await dbQuery(
        `SELECT pf.*, u.full_name as uploaded_by_name
         FROM project_files pf
         LEFT JOIN users u ON pf.uploaded_by = u.id
         WHERE pf.project_id = $1
         ORDER BY pf.created_at DESC`,
        [projectId]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(filesResult.rows.map(mapFileFromDB)),
      };
    }

    // ========================================================================
    // POST /project-files
    // ========================================================================
    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid JSON body' }),
        };
      }

      const validation = createProjectFileSchema.safeParse(body);
      if (!validation.success) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Validation failed',
            details: validation.error.errors,
          }),
        };
      }

      const data = validation.data;
      await requireProjectAccess(auth?.user, data.projectId, { operation: 'project-files.create' });
      if (!data.r2Key.startsWith(`projects/${data.projectId}/`)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'File key does not match the authorized project' }),
        };
      }

      let result;
      try {
        result = await dbQuery(
          `INSERT INTO project_files (project_id, file_name, file_type, file_size, r2_key, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            data.projectId,
            data.fileName,
            data.fileType || null,
            data.fileSize || null,
            data.r2Key,
            userId,
          ]
        );
      } catch (error) {
        if (isUniqueViolation(error)) {
          return createProjectFileKeyConflictResponse(headers);
        }
        throw error;
      }

      // Log activity
      await logActivity({
        type: 'FILE_UPLOADED',
        userId: userId || '',
        userName: auth?.user?.fullName || 'Unknown',
        projectId: data.projectId,
        details: { fileName: data.fileName, fileType: data.fileType || '', fileSize: data.fileSize || 0 },
      });

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(mapFileFromDB(result.rows[0])),
      };
    }

    // ========================================================================
    // DELETE /project-files/{fileId}
    // ========================================================================
    if (event.httpMethod === 'DELETE') {
      const pathParts = event.path.split('/');
      const fileId = pathParts[pathParts.length - 1];

      if (!fileId || fileId === 'project-files') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'File ID is required' }),
        };
      }

      // Only allow the uploader, admins, or PMs to delete
      const fileResult = await dbQuery(
        `SELECT uploaded_by, file_name, project_id, r2_key FROM project_files WHERE id = $1`,
        [fileId]
      );

      if (fileResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'File not found' }),
        };
      }

      await requireProjectAccess(auth?.user, fileResult.rows[0].project_id, { operation: 'project-files.delete' });

      const isOwner = fileResult.rows[0].uploaded_by === userId;
      const isAdminOrPM = isAdminLike(userRole);
      if (!isOwner && !isAdminOrPM) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Access denied' }),
        };
      }

      const deletedFile = fileResult.rows[0];
      try {
        await deleteProjectFileObjectAndMetadata(fileId, deletedFile.r2_key);
      } catch (error) {
        if (error instanceof ProjectFileKeyConflictError) {
          return createProjectFileKeyConflictResponse(headers);
        }
        if (!(error instanceof ProjectFileStorageDeleteError)) throw error;
        console.error('Project file storage deletion failed', {
          fileId,
          message: error.message,
        });
        return createProjectFileStorageDeleteFailureResponse(headers);
      }

      // Log activity
      await logActivity({
        type: 'FILE_DELETED',
        userId: userId || '',
        userName: auth?.user?.fullName || 'Unknown',
        projectId: deletedFile.project_id,
        details: { fileName: deletedFile.file_name },
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, deleted: fileId }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };

  } catch (error) {
    if (error instanceof AuthorizationError) {
      return createAuthorizationResponse(error, origin);
    }
    console.error('Project files API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
});
