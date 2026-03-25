
import 'dotenv/config';
import { handler as settingsHandler } from '../netlify/functions/users-settings';
import { handler as tasksHandler } from '../netlify/functions/tasks';
import { handler as deliverableHandler } from '../netlify/functions/deliverables';
import pg from 'pg';

// Mock context/event
const createEvent = (method: string, path: string, body: any = null, query: any = null) => ({
    httpMethod: method,
    headers: {},
    body: body ? JSON.stringify(body) : null,
    path,
    queryStringParameters: query
});

async function runVerification() {
    console.log('Starting verification...');

    // We need a real DB connection to verify side effects if we want to be thorough,
    // but we can just invoke the handlers and check responses.

    // 1. Test GET Settings (should fail without userId)
    let resp = await settingsHandler(createEvent('GET', '/users-settings'));
    console.log('GET /users-settings (no user):', resp.statusCode);
    if (resp.statusCode !== 400) throw new Error('Should return 400 for missing userId');

    // 2. We need a valid user ID from the DB to test properly.
    // Let's assume we can query one.
    const { Client } = pg;
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });
    await client.connect();

    // Execute migration
    console.log('Running migration...');
    const migrationSql = `
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_task_assignment BOOLEAN DEFAULT true,
  email_mention BOOLEAN DEFAULT true,
  email_project_update BOOLEAN DEFAULT true,
  email_marketing BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at (assuming function exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_preferences_updated_at') THEN
        CREATE TRIGGER update_user_preferences_updated_at 
          BEFORE UPDATE ON user_preferences
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

INSERT INTO user_preferences (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;
    `;
    await client.query(migrationSql);

    let userId;
    try {
        const userRes = await client.query('SELECT id FROM users LIMIT 1');
        if (userRes.rows.length === 0) {
            console.log('No users found, skipping detailed verification.');
            return;
        }
        userId = userRes.rows[0].id;
        console.log('Using userId:', userId);
    } finally {
        await client.end();
    }

    // 3. Test GET Settings for user
    resp = await settingsHandler(createEvent('GET', '/users-settings', null, { userId }));
    console.log('GET /users-settings:', resp.statusCode);
    if (resp.statusCode !== 200) throw new Error('Failed to get settings');

    // 4. Test PUT Settings (Turn OFF everything)
    const prefsOff = {
        email_task_assignment: false,
        email_mention: false,
        email_project_update: false,
        email_marketing: false
    };
    resp = await settingsHandler(createEvent('PUT', '/users-settings', prefsOff, { userId }));
    console.log('PUT /users-settings (OFF):', resp.statusCode);
    if (resp.statusCode !== 200) throw new Error('Failed to update settings (OFF)');

    // Verify it stuck
    resp = await settingsHandler(createEvent('GET', '/users-settings', null, { userId }));
    const dataOff = JSON.parse(resp.body);
    if (dataOff.preferences.email_task_assignment !== false) throw new Error('Preferences not saved correctly (expected false)');

    // 5. Test PUT Settings (Turn ON everything)
    const prefsOn = {
        email_task_assignment: true,
        email_mention: true,
        email_project_update: true,
        email_marketing: true
    };
    resp = await settingsHandler(createEvent('PUT', '/users-settings', prefsOn, { userId }));
    console.log('PUT /users-settings (ON):', resp.statusCode);

    // Verify
    resp = await settingsHandler(createEvent('GET', '/users-settings', null, { userId }));
    const dataOn = JSON.parse(resp.body);
    if (dataOn.preferences.email_task_assignment !== true) throw new Error('Preferences not saved correctly (expected true)');

    console.log('Verification Success!');
}

runVerification().catch(e => {
    console.error('Verification Failed:', e);
    process.exit(1);
});
