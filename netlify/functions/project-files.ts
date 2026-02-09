import pg from 'pg';
import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { z } from 'zod';

const { Client } = pg;

async function logActivity(dbClient: pg.Client, params: {
  type: string;
  userId: string;
  userName: string;
  projectId?: string;
  details?: Record<string, string | number>;
}) {
  try {
    await dbClient.query(
      `INSERT INTO activities (type, user_id, user_name, project_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [params.type, params.userId, params.userName,
       params.projectId || null,
       JSON.stringify(params.details || {})]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

const getDbClient = () => {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }

  return new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
};

const createProjectFileSchema = z.object({
  projectId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  fileType: z.string().max(100).optional(),
  fileSize: z.number().optional(),
  r2Key: z.string().min(1),
});

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

  const client = getDbClient();

  try {
    await client.connect();
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

      // Verify user has access to this project
      const projectResult = await client.query(
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

      const filesResult = await client.query(
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

      const result = await client.query(
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

      // Log activity
      await logActivity(client, {
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
      const fileResult = await client.query(
        `SELECT uploaded_by, file_name, project_id FROM project_files WHERE id = $1`,
        [fileId]
      );

      if (fileResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'File not found' }),
        };
      }

      const isOwner = fileResult.rows[0].uploaded_by === userId;
      const isAdminOrPM = userRole === 'super_admin' || userRole === 'support';
      if (!isOwner && !isAdminOrPM) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Access denied' }),
        };
      }

      const deletedFile = fileResult.rows[0];
      await client.query(`DELETE FROM project_files WHERE id = $1`, [fileId]);

      // Log activity
      await logActivity(client, {
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
    console.error('Project files API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  } finally {
    await client.end();
  }
});
