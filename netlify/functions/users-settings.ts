import { compose, withCORS, withAuth, withRateLimit, type NetlifyEvent, type AuthResult } from './_shared/middleware';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
import { query } from './_shared/db';
import { getCorsHeaders } from './_shared/cors';

type UserPreferences = {
  user_id: string;
  timezone: string | null;
};

type AccountSettings = {
  email: string;
  name: string;
  role: string;
  organizationName: string | null;
  timezone: string | null;
};

function defaultPreferences(userId: string): UserPreferences {
  return {
    user_id: userId,
    timezone: null,
  };
}

async function fetchOrganizationName(userId: string): Promise<string | null> {
  try {
    const result = await query(
      `SELECT i.company_name
       FROM projects p
       LEFT JOIN inquiries i ON i.id = p.inquiry_id
       LEFT JOIN project_team pt
         ON pt.project_id = p.id
        AND pt.user_id = $1
        AND pt.removed_at IS NULL
       WHERE (p.client_user_id = $1 OR pt.user_id = $1)
         AND NULLIF(TRIM(i.company_name), '') IS NOT NULL
       ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC NULLS LAST
       LIMIT 1`,
      [userId]
    );

    return result.rows[0]?.company_name ?? null;
  } catch (error) {
    console.error('Failed to fetch organization name for settings:', error);
    return null;
  }
}

async function fetchAccountSettings(userId: string): Promise<{
  account: AccountSettings;
  preferences: UserPreferences;
}> {
  const [userResult, preferencesResult, organizationName] = await Promise.all([
    query(
      `SELECT id, email, full_name, role
       FROM users
       WHERE id = $1`,
      [userId]
    ),
    query(
      `SELECT user_id, timezone
       FROM user_preferences
       WHERE user_id = $1`,
      [userId]
    ),
    fetchOrganizationName(userId),
  ]);

  if (userResult.rows.length === 0) {
    throw new Error('Authenticated user not found');
  }

  const user = userResult.rows[0];
  const preferences = preferencesResult.rows[0] ?? defaultPreferences(userId);

  return {
    account: {
      email: user.email,
      name: user.full_name,
      role: user.role,
      organizationName,
      timezone: preferences.timezone ?? null,
    },
    preferences,
  };
}

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
      const settings = await fetchAccountSettings(userId);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          ...settings,
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

      if (!('full_name' in updates) && !('timezone' in updates)) {
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

      if ('full_name' in updates && updates.full_name) {
        await query(
          `UPDATE users
           SET full_name = $2, updated_at = NOW()
           WHERE id = $1`,
          [userId, updates.full_name]
        );
      }

      if ('timezone' in updates) {
        await query(
          `INSERT INTO user_preferences (user_id, timezone)
           VALUES ($1, $2)
           ON CONFLICT (user_id)
           DO UPDATE SET timezone = $2, updated_at = NOW()`,
          [userId, updates.timezone ?? null]
        );
      }

      const settings = await fetchAccountSettings(userId);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          ...settings,
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
