import { compose, withCORS, withAuth, withRateLimit, withValidation, type NetlifyEvent, type AuthResult } from './_shared/middleware';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
import { query } from './_shared/db';
import { getCorsHeaders } from './_shared/cors';

export const handler = compose(
  withCORS(['GET', 'PUT']),
  withAuth(),
  withRateLimit(RATE_LIMITS.api, 'user_settings')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  const userId = auth!.user!.userId;

  try {
    if (event.httpMethod === 'GET') {
      // Fetch settings
      const result = await query(
        `SELECT * FROM user_preferences WHERE user_id = $1`,
        [userId]
      );

      // If no settings exist, return defaults
      if (result.rows.length === 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            preferences: {
              user_id: userId,
              email_task_assignment: true,
              email_mention: true,
              email_project_update: true,
              email_marketing: false,
              notification_sound: true,
              notification_desktop: true,
            },
          }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          preferences: result.rows[0],
        }),
      };
    }

    // PUT - Update settings with validation
    if (event.httpMethod === 'PUT') {
      // Validate request body
      const validation = (await import('./_shared/validation')).validateRequest(
        event.body,
        SCHEMAS.userSettings.update,
        origin
      );

      if (!validation.success) {
        return validation.response;
      }

      const updates = validation.data;

      // Build dynamic update query
      const fields = Object.keys(updates);
      if (fields.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: {
              code: 'NO_UPDATES',
              message: 'No fields to update',
            },
          }),
        };
      }

      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      const values = [userId, ...fields.map(field => updates[field as keyof typeof updates])];

      // Upsert settings
      const result = await query(
        `INSERT INTO user_preferences (user_id, ${fields.join(', ')})
         VALUES ($1, ${fields.map((_, i) => `$${i + 2}`).join(', ')})
         ON CONFLICT (user_id)
         DO UPDATE SET ${setClause}, updated_at = NOW()
         RETURNING *`,
        values
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          preferences: result.rows[0],
        }),
      };
    }

    // Should never reach here due to withCORS middleware
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Method not allowed',
        },
      }),
    };
  } catch (error) {
    console.error('User settings error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process user settings',
        },
      }),
    };
  }
});
