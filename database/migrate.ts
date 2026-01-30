/**
 * Database Migration Runner
 *
 * A simple migration system that:
 * - Tracks applied migrations in a migrations table
 * - Runs pending migrations in order
 * - Supports both up and down migrations
 *
 * Usage:
 *   npx tsx database/migrate.ts up      # Run pending migrations
 *   npx tsx database/migrate.ts down    # Rollback last migration
 *   npx tsx database/migrate.ts status  # Show migration status
 */

import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Migration file interface
interface MigrationFile {
    version: string;
    name: string;
    path: string;
}

// Migration record in database
interface MigrationRecord {
    version: string;
    name: string;
    applied_at: Date;
}

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset'): void {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Get database pool
 */
function getPool(): pg.Pool {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is required');
    }

    const isProduction = process.env.NODE_ENV === 'production';

    return new Pool({
        connectionString: DATABASE_URL,
        ssl: isProduction
            ? true // Production: enforce SSL with certificate validation
            : process.env.DATABASE_SSL === 'true'
                ? { rejectUnauthorized: false } // Development: SSL with self-signed support
                : false, // Development: no SSL
    });
}

/**
 * Ensure migrations table exists
 */
async function ensureMigrationsTable(pool: pg.Pool): Promise<void> {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            version VARCHAR(20) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

/**
 * Get all migration files from the migrations directory
 */
function getMigrationFiles(): MigrationFile[] {
    const migrationsDir = path.join(__dirname, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
        return [];
    }

    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));

    return files
        .map((file) => {
            // Expected format: 001_create_users.sql
            const match = file.match(/^(\d{3})_(.+)\.sql$/);
            if (!match) return null;

            return {
                version: match[1],
                name: match[2],
                path: path.join(migrationsDir, file),
            };
        })
        .filter((m): m is MigrationFile => m !== null)
        .sort((a, b) => a.version.localeCompare(b.version));
}

/**
 * Get applied migrations from database
 */
async function getAppliedMigrations(pool: pg.Pool): Promise<MigrationRecord[]> {
    const result = await pool.query<MigrationRecord>(
        'SELECT version, name, applied_at FROM migrations ORDER BY version'
    );
    return result.rows;
}

/**
 * Run a single migration
 */
async function runMigration(pool: pg.Pool, migration: MigrationFile): Promise<void> {
    const sql = fs.readFileSync(migration.path, 'utf-8');

    // Split by -- UP and -- DOWN markers
    const upMatch = sql.match(/--\s*UP\s*\n([\s\S]*?)(?=--\s*DOWN|$)/i);
    const upSql = upMatch ? upMatch[1].trim() : sql.trim();

    if (!upSql) {
        throw new Error(`No UP migration found in ${migration.path}`);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Run the migration
        await client.query(upSql);

        // Record the migration
        await client.query('INSERT INTO migrations (version, name) VALUES ($1, $2)', [
            migration.version,
            migration.name,
        ]);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Rollback a single migration
 */
async function rollbackMigration(pool: pg.Pool, migration: MigrationFile): Promise<void> {
    const sql = fs.readFileSync(migration.path, 'utf-8');

    // Find DOWN migration
    const downMatch = sql.match(/--\s*DOWN\s*\n([\s\S]*?)$/i);
    const downSql = downMatch ? downMatch[1].trim() : null;

    if (!downSql) {
        throw new Error(`No DOWN migration found in ${migration.path}`);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Run the rollback
        await client.query(downSql);

        // Remove the migration record
        await client.query('DELETE FROM migrations WHERE version = $1', [migration.version]);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Run pending migrations
 */
async function up(): Promise<void> {
    const pool = getPool();

    try {
        await ensureMigrationsTable(pool);

        const allMigrations = getMigrationFiles();
        const appliedMigrations = await getAppliedMigrations(pool);
        const appliedVersions = new Set(appliedMigrations.map((m) => m.version));

        const pendingMigrations = allMigrations.filter((m) => !appliedVersions.has(m.version));

        if (pendingMigrations.length === 0) {
            log('No pending migrations', 'green');
            return;
        }

        log(`Found ${pendingMigrations.length} pending migration(s)`, 'cyan');

        for (const migration of pendingMigrations) {
            log(`Running: ${migration.version}_${migration.name}`, 'yellow');
            await runMigration(pool, migration);
            log(`Applied: ${migration.version}_${migration.name}`, 'green');
        }

        log('All migrations completed', 'green');
    } finally {
        await pool.end();
    }
}

/**
 * Rollback the last migration
 */
async function down(): Promise<void> {
    const pool = getPool();

    try {
        await ensureMigrationsTable(pool);

        const allMigrations = getMigrationFiles();
        const appliedMigrations = await getAppliedMigrations(pool);

        if (appliedMigrations.length === 0) {
            log('No migrations to rollback', 'yellow');
            return;
        }

        const lastApplied = appliedMigrations[appliedMigrations.length - 1];
        const migration = allMigrations.find((m) => m.version === lastApplied.version);

        if (!migration) {
            throw new Error(`Migration file not found for version ${lastApplied.version}`);
        }

        log(`Rolling back: ${migration.version}_${migration.name}`, 'yellow');
        await rollbackMigration(pool, migration);
        log(`Rolled back: ${migration.version}_${migration.name}`, 'green');
    } finally {
        await pool.end();
    }
}

/**
 * Show migration status
 */
async function status(): Promise<void> {
    const pool = getPool();

    try {
        await ensureMigrationsTable(pool);

        const allMigrations = getMigrationFiles();
        const appliedMigrations = await getAppliedMigrations(pool);
        const appliedVersions = new Map(appliedMigrations.map((m) => [m.version, m]));

        log('\nMigration Status:', 'cyan');
        log('='.repeat(60));

        if (allMigrations.length === 0) {
            log('No migration files found', 'yellow');
            return;
        }

        for (const migration of allMigrations) {
            const applied = appliedVersions.get(migration.version);
            if (applied) {
                log(`[✓] ${migration.version}_${migration.name} (${applied.applied_at.toISOString()})`, 'green');
            } else {
                log(`[ ] ${migration.version}_${migration.name}`, 'yellow');
            }
        }

        const pending = allMigrations.filter((m) => !appliedVersions.has(m.version));
        log('='.repeat(60));
        log(`Total: ${allMigrations.length} | Applied: ${appliedMigrations.length} | Pending: ${pending.length}`);
    } finally {
        await pool.end();
    }
}

/**
 * Create a new migration file
 */
function create(name: string): void {
    const migrationsDir = path.join(__dirname, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
        fs.mkdirSync(migrationsDir, { recursive: true });
    }

    // Get next version number
    const existing = getMigrationFiles();
    const lastVersion = existing.length > 0 ? parseInt(existing[existing.length - 1].version, 10) : 0;
    const nextVersion = String(lastVersion + 1).padStart(3, '0');

    // Sanitize name
    const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const filename = `${nextVersion}_${safeName}.sql`;
    const filepath = path.join(migrationsDir, filename);

    const template = `-- Migration: ${safeName}
-- Created: ${new Date().toISOString()}

-- UP
-- Add your migration SQL here


-- DOWN
-- Add your rollback SQL here

`;

    fs.writeFileSync(filepath, template);
    log(`Created: ${filepath}`, 'green');
}

// CLI
async function main(): Promise<void> {
    const command = process.argv[2];
    const arg = process.argv[3];

    try {
        switch (command) {
            case 'up':
                await up();
                break;
            case 'down':
                await down();
                break;
            case 'status':
                await status();
                break;
            case 'create':
                if (!arg) {
                    log('Usage: migrate create <name>', 'red');
                    process.exit(1);
                }
                create(arg);
                break;
            default:
                log('Usage: migrate <up|down|status|create> [name]', 'yellow');
                log('  up      - Run pending migrations');
                log('  down    - Rollback last migration');
                log('  status  - Show migration status');
                log('  create  - Create a new migration file');
                process.exit(1);
        }
    } catch (error) {
        log(`Error: ${error instanceof Error ? error.message : error}`, 'red');
        process.exit(1);
    }
}

main();
