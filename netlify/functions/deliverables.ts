import pg from 'pg';
import { sendDeliverableReadyEmail, sendFinalDeliverablesEmail } from './send-email';
import { compose, withCORS, withAuth, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';

const { Client } = pg;

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

export const handler = compose(
  withCORS(['GET', 'PATCH']),
  withAuth()
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  const client = getDbClient();

  try {
    await client.connect();

    if (event.httpMethod === 'GET') {
      const { projectId, id } = event.queryStringParameters || {};

      if (id) {
        const result = await client.query(
          `SELECT * FROM deliverables WHERE id = $1`,
          [id]
        );

        if (result.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Deliverable not found' }),
          };
        }

        const deliverable = result.rows[0];

        // Check if files have expired (365+ days after final delivery)
        if (deliverable.files_expired) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({
              error: 'Files have expired',
              message: 'Download links for this deliverable have expired after 365 days. Contact support to restore access.',
              code: 'FILES_EXPIRED'
            }),
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(deliverable),
        };
      }

      if (projectId) {
        const result = await client.query(
          `SELECT * FROM deliverables WHERE project_id = $1 ORDER BY estimated_completion_week`,
          [projectId]
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result.rows),
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'projectId or id parameter is required' }),
      };
    }

    if (event.httpMethod === 'PATCH') {
      const pathParts = event.path.split('/');
      const id = pathParts[pathParts.length - 1];

      if (!id || id === 'deliverables') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Deliverable ID is required' }),
        };
      }

      const updates = JSON.parse(event.body || '{}');

      const allowedFields = [
        'status',
        'beta_file_url', 'beta_file_key',
        'final_file_url', 'final_file_key',
        'approved_by'
      ];

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      Object.keys(updates).forEach((key) => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramIndex}`);
          updateValues.push(updates[key]);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No valid fields to update' }),
        };
      }

      updateFields.push(`updated_at = NOW()`);

      if (updates.status === 'approved') {
        updateFields.push(`approved_at = NOW()`);
      }

      // Track when final delivery occurs for expiry calculation
      if (updates.status === 'final_delivered') {
        updateFields.push(`final_delivered_at = NOW()`);
      }

      const query = `
        UPDATE deliverables 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      updateValues.push(id);

      const result = await client.query(query, updateValues);

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Deliverable not found' }),
        };
      }

      const updatedDeliverable = result.rows[0];

      if (updates.status === 'awaiting_approval') {
        try {
          const projectQuery = `
             SELECT p.project_number, u.email, u.full_name
             FROM projects p
             JOIN users u ON p.client_user_id = u.id
             WHERE p.id = $1
           `;
          const projectResult = await client.query(projectQuery, [updatedDeliverable.project_id]);

          if (projectResult.rows.length > 0) {
            const { project_number, email, full_name } = projectResult.rows[0];
            // Check preferences (using email_project_update)
            const userIdResult = await client.query('SELECT id FROM users WHERE email = $1', [email]);
            let emailEnabled = true;
            if (userIdResult.rows.length > 0) {
              const prefResult = await client.query(
                `SELECT email_project_update FROM user_preferences WHERE user_id = $1`,
                [userIdResult.rows[0].id]
              );
              emailEnabled = prefResult.rows.length === 0 || prefResult.rows[0].email_project_update;
            }

            if (emailEnabled) {
              await sendDeliverableReadyEmail({
                to: email,
                clientName: full_name,
                projectNumber: project_number,
                deliverableName: updatedDeliverable.name,
                deliverableUrl: `${process.env.URL}/projects/${project_number}?tab=deliverables`,
                deliveryNotes: updatedDeliverable.description
              });
              console.log('✅ Deliverable ready email sent to:', email);
            } else {
              console.log('Skipped deliverable ready email to:', email, '(disabled in preferences)');
            }
          }
        } catch (emailError) {
          console.error('❌ Failed to send deliverable ready email:', emailError);
        }
      }

      if (updates.status === 'final_delivered') {
        try {
          const projectQuery = `
             SELECT p.project_number, u.email, u.full_name
             FROM projects p
             JOIN users u ON p.client_user_id = u.id
             WHERE p.id = $1
           `;
          const projectResult = await client.query(projectQuery, [updatedDeliverable.project_id]);

          if (projectResult.rows.length > 0) {
            const { project_number, email, full_name } = projectResult.rows[0];
            // Check preferences (using email_project_update)
            const userIdResult = await client.query('SELECT id FROM users WHERE email = $1', [email]);
            // If user not found (unlikely), default to send
            let emailEnabled = true;
            if (userIdResult.rows.length > 0) {
              const prefResult = await client.query(
                `SELECT email_project_update FROM user_preferences WHERE user_id = $1`,
                [userIdResult.rows[0].id]
              );
              emailEnabled = prefResult.rows.length === 0 || prefResult.rows[0].email_project_update;
            }

            if (emailEnabled) {
              await sendFinalDeliverablesEmail({
                to: email,
                clientName: full_name,
                projectNumber: project_number,
                deliverableName: updatedDeliverable.name,
                downloadUrl: `${process.env.URL}/projects/${project_number}?tab=deliverables`,
                expiryDays: 365
              });
              console.log('✅ Final deliverables email sent to:', email);
            } else {
              console.log('Skipped final deliverables email to:', email, '(disabled in preferences)');
            }
          }
        } catch (emailError) {
          console.error('❌ Failed to send final deliverables email:', emailError);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedDeliverable),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };

  } catch (error) {
    console.error('Deliverables API error:', error);
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
