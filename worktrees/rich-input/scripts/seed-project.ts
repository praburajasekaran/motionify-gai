import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Client } = pg;

const seedProject = async () => {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        console.error('DATABASE_URL is missing');
        return;
    }

    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();

        const projectId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
        const userId = 'e1e1e3de-fae9-4684-8bab-2fb03826029e';

        // Check columns
        const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'projects'");
        console.log('Columns:', cols.rows.map(r => r.column_name));

        // Check if project exists
        const res = await client.query('SELECT id FROM projects WHERE id = $1', [projectId]);

        if (res.rows.length > 0) {
            console.log('Project already exists.');
        } else {
            // Get an organization ID
            const orgRes = await client.query('SELECT id FROM organizations LIMIT 1');
            const orgId = orgRes.rows.length > 0 ? orgRes.rows[0].id : null;

            if (!orgId) {
                console.log('No organization found. Cannot seed project.');
                return;
            }

            console.log('Inserting project with org ID:', orgId);
            // Based on observed columns: id, name, status, description, created_at, updated_at
            // Omit start_date, due_date, client_id for now as they might not exist or be named differently
            await client.query(`
                INSERT INTO projects (id, name, status, description, created_at, organization_id, created_by)
                VALUES ($1, 'GreenEnergy Brand Story', 'active', 'Documentary style brand piece', NOW(), $2, $3)
            `, [projectId, orgId, userId]);
            console.log('Project inserted.');
        }

    } catch (err) {
        console.error('Error seeding project:', err);
    } finally {
        await client.end();
    }
};

seedProject();
