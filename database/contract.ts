export const LATEST_SCHEMA_MIGRATION = {
  version: '028',
  name: 'reconcile_runtime_contracts',
} as const;

export interface DatabaseContractQueryRunner {
  query(text: string, params?: unknown[]): Promise<{ rows: any[] }>;
}

export type DatabaseContractIssueCode =
  | 'missing_table'
  | 'missing_column'
  | 'invalid_type'
  | 'invalid_default'
  | 'invalid_nullability'
  | 'missing_constraint'
  | 'invalid_constraint'
  | 'missing_index'
  | 'missing_migration'
  | 'verification_error';

export interface DatabaseContractIssue {
  code: DatabaseContractIssueCode;
  object: string;
}

export interface DatabaseContractResult {
  ready: boolean;
  latestMigration: string;
  issues: DatabaseContractIssue[];
}

interface ColumnRow {
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
  column_default: string | null;
  is_nullable: 'YES' | 'NO';
}

interface ConstraintRow {
  table_name: string;
  constraint_name: string;
  constraint_type: 'p' | 'u' | 'f' | 'c' | string;
  definition: string;
}

interface IndexRow {
  table_name: string;
  index_name: string;
  index_definition: string;
}

interface MigrationRow {
  version: string;
  name: string;
}

interface ColumnRequirement {
  type: string | readonly string[];
  nullable?: boolean;
  defaultPattern?: RegExp;
}

const REQUIRED_COLUMNS: Record<string, Record<string, ColumnRequirement>> = {
  users: {
    id: { type: 'uuid', nullable: false },
  },
  project_requests: {
    id: { type: 'uuid', nullable: false, defaultPattern: /gen_random_uuid\s*\(\s*\)/i },
    request_number: { type: 'character varying', nullable: false },
    client_user_id: { type: 'uuid', nullable: false },
    title: { type: 'character varying', nullable: false },
    description: { type: 'text', nullable: false },
    tentative_deadline: { type: 'date', nullable: false },
    status: { type: 'character varying', nullable: false, defaultPattern: /'pending'/i },
    created_at: { type: 'timestamp with time zone', nullable: false, defaultPattern: /now\s*\(\s*\)|current_timestamp/i },
    updated_at: { type: 'timestamp with time zone', nullable: false, defaultPattern: /now\s*\(\s*\)|current_timestamp/i },
  },
  project_files: {
    id: { type: 'uuid', nullable: false, defaultPattern: /gen_random_uuid\s*\(\s*\)/i },
    project_id: { type: 'uuid', nullable: false },
    r2_key: { type: 'text', nullable: false },
  },
  deliverables: {
    id: { type: 'uuid', nullable: false, defaultPattern: /gen_random_uuid\s*\(\s*\)/i },
  },
  projects: {
    status: { type: 'character varying', nullable: false, defaultPattern: /'active'/i },
  },
  project_team: {
    id: { type: 'uuid', nullable: false, defaultPattern: /gen_random_uuid\s*\(\s*\)/i },
    user_id: { type: 'uuid', nullable: false },
    project_id: { type: 'uuid', nullable: false },
    role: { type: 'character varying', nullable: false },
    is_primary_contact: { type: 'boolean', nullable: false, defaultPattern: /false/i },
    added_at: { type: 'timestamp with time zone', nullable: false, defaultPattern: /now\s*\(\s*\)|current_timestamp/i },
    added_by: { type: 'uuid' },
    invitation_id: { type: 'uuid' },
    removed_at: { type: 'timestamp with time zone' },
    removed_by: { type: 'uuid' },
  },
  project_invitations: {
    id: { type: 'uuid', nullable: false, defaultPattern: /gen_random_uuid\s*\(\s*\)/i },
    token: { type: 'character varying', nullable: false },
    email: { type: 'character varying', nullable: false },
    role: { type: 'character varying', nullable: false },
    status: { type: 'character varying', nullable: false, defaultPattern: /'pending'/i },
    project_id: { type: 'uuid', nullable: false },
    invited_by: { type: 'uuid', nullable: false },
    expires_at: { type: 'timestamp with time zone', nullable: false },
    accepted_at: { type: 'timestamp with time zone' },
    accepted_by: { type: 'uuid' },
    revoked_at: { type: 'timestamp with time zone' },
    revoked_by: { type: 'uuid' },
    resent_at: { type: 'timestamp with time zone' },
    resent_count: { type: 'integer', nullable: false, defaultPattern: /0/ },
  },
  sessions: {
    id: { type: 'uuid', nullable: false, defaultPattern: /gen_random_uuid\s*\(\s*\)/i },
    user_id: { type: 'uuid' },
    token: { type: ['character varying', 'text'], nullable: false },
    jwt_token_hash: { type: ['character varying', 'text'] },
    remember_me: { type: 'boolean', nullable: false, defaultPattern: /false/i },
    expires_at: { type: 'timestamp with time zone', nullable: false },
    last_active_at: { type: 'timestamp with time zone', nullable: false, defaultPattern: /now\s*\(\s*\)|current_timestamp/i },
    created_at: { type: 'timestamp with time zone', nullable: false, defaultPattern: /now\s*\(\s*\)|current_timestamp/i },
  },
  migrations: {
    version: { type: 'character varying', nullable: false },
    name: { type: 'character varying', nullable: false },
  },
};

export const CANONICAL_PROJECT_STATUSES = [
  'draft',
  'active',
  'in_review',
  'awaiting_payment',
  'on_hold',
  'completed',
  'archived',
  'cancelled',
] as const;

const PROJECT_REQUEST_STATUSES = [
  'pending',
  'reviewing',
  'approved',
  'rejected',
  'converted',
  'cancelled',
] as const;

const PROJECT_INVITATION_ROLES = ['client', 'team_member'] as const;
const INVITATION_STATUSES = ['pending', 'accepted', 'revoked', 'expired'] as const;

function normalizeSql(value: string): string {
  return value.toLowerCase().replace(/["\s]+/g, ' ').trim();
}

function quotedValues(definition: string): string[] {
  return [...definition.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function hasExactValues(definition: string, expected: readonly string[]): boolean {
  const actual = new Set(quotedValues(definition));
  return actual.size === expected.length && expected.every((value) => actual.has(value));
}

function addColumnIssues(columns: ColumnRow[], issues: DatabaseContractIssue[]): void {
  const tables = new Map<string, Map<string, ColumnRow>>();
  for (const column of columns) {
    const table = tables.get(column.table_name) ?? new Map<string, ColumnRow>();
    table.set(column.column_name, column);
    tables.set(column.table_name, table);
  }

  for (const [tableName, requirements] of Object.entries(REQUIRED_COLUMNS)) {
    const table = tables.get(tableName);
    if (!table) {
      issues.push({ code: 'missing_table', object: tableName });
      continue;
    }

    for (const [columnName, requirement] of Object.entries(requirements)) {
      const column = table.get(columnName);
      const object = `${tableName}.${columnName}`;
      if (!column) {
        issues.push({ code: 'missing_column', object });
        continue;
      }
      const acceptedTypes = typeof requirement.type === 'string'
        ? [requirement.type]
        : requirement.type;
      if (!acceptedTypes.includes(column.data_type.toLowerCase())) {
        issues.push({ code: 'invalid_type', object });
      }
      if (requirement.nullable !== undefined) {
        const isNullable = column.is_nullable === 'YES';
        if (isNullable !== requirement.nullable) {
          issues.push({ code: 'invalid_nullability', object });
        }
      }
      if (requirement.defaultPattern && !requirement.defaultPattern.test(column.column_default ?? '')) {
        issues.push({ code: 'invalid_default', object });
      }
    }
  }
}

function addConstraintIssues(constraints: ConstraintRow[], issues: DatabaseContractIssue[]): void {
  const find = (table: string, type: string, fragment: string) => constraints.find((constraint) =>
    constraint.table_name === table
    && constraint.constraint_type === type
    && normalizeSql(constraint.definition).includes(fragment)
  );

  if (!find('project_requests', 'p', 'primary key (id)')) {
    issues.push({ code: 'missing_constraint', object: 'project_requests.primary_key' });
  }
  if (!find('project_requests', 'u', 'unique (request_number)')) {
    issues.push({ code: 'missing_constraint', object: 'project_requests.request_number_unique' });
  }
  const projectRequestForeignKey = find('project_requests', 'f', 'foreign key (client_user_id)');
  if (!projectRequestForeignKey || !normalizeSql(projectRequestForeignKey.definition).includes('references users(id)')) {
    issues.push({ code: 'missing_constraint', object: 'project_requests.client_user_id_fkey' });
  }

  const projectRequestStatus = constraints.find((constraint) =>
    constraint.table_name === 'project_requests'
    && constraint.constraint_type === 'c'
    && normalizeSql(constraint.definition).includes('status')
  );
  if (!projectRequestStatus) {
    issues.push({ code: 'missing_constraint', object: 'project_requests.status_check' });
  } else if (!hasExactValues(projectRequestStatus.definition, PROJECT_REQUEST_STATUSES)) {
    issues.push({ code: 'invalid_constraint', object: 'project_requests.status_check' });
  }

  const projectStatus = constraints.find((constraint) =>
    constraint.table_name === 'projects'
    && constraint.constraint_type === 'c'
    && normalizeSql(constraint.definition).includes('status')
  );
  if (!projectStatus) {
    issues.push({ code: 'missing_constraint', object: 'projects.status_check' });
  } else if (!hasExactValues(projectStatus.definition, CANONICAL_PROJECT_STATUSES)) {
    issues.push({ code: 'invalid_constraint', object: 'projects.status_check' });
  }

  const projectInvitationRole = constraints.find((constraint) =>
    constraint.table_name === 'project_invitations'
    && constraint.constraint_type === 'c'
    && normalizeSql(constraint.definition).includes('role')
  );
  if (!projectInvitationRole) {
    issues.push({ code: 'missing_constraint', object: 'project_invitations.role_check' });
  } else if (!hasExactValues(projectInvitationRole.definition, PROJECT_INVITATION_ROLES)) {
    issues.push({ code: 'invalid_constraint', object: 'project_invitations.role_check' });
  }

  const projectInvitationStatus = constraints.find((constraint) =>
    constraint.table_name === 'project_invitations'
    && constraint.constraint_type === 'c'
    && normalizeSql(constraint.definition).includes('status')
  );
  if (!projectInvitationStatus) {
    issues.push({ code: 'missing_constraint', object: 'project_invitations.status_check' });
  } else if (!hasExactValues(projectInvitationStatus.definition, INVITATION_STATUSES)) {
    issues.push({ code: 'invalid_constraint', object: 'project_invitations.status_check' });
  }

}

function addIndexIssues(indexes: IndexRow[], issues: DatabaseContractIssue[]): void {
  const projectTeamUniqueIndex = indexes.find((index) =>
    index.table_name === 'project_team'
    && normalizeSql(index.index_definition).includes('unique')
    && normalizeSql(index.index_definition).includes('(user_id, project_id)')
  );
  if (!projectTeamUniqueIndex) {
    issues.push({ code: 'missing_index', object: 'project_team.user_id_project_id' });
  }

  const jwtHashIndex = indexes.find((index) =>
    index.table_name === 'sessions'
    && normalizeSql(index.index_definition).includes('unique')
    && normalizeSql(index.index_definition).includes('jwt_token_hash')
  );
  if (!jwtHashIndex) {
    issues.push({ code: 'missing_index', object: 'sessions.jwt_token_hash' });
  }

  const projectFileKeyIndex = indexes.find((index) =>
    index.table_name === 'project_files'
    && normalizeSql(index.index_definition).includes('unique')
    && normalizeSql(index.index_definition).includes('(r2_key)')
  );
  if (!projectFileKeyIndex) {
    issues.push({ code: 'missing_index', object: 'project_files.r2_key' });
  }
}

/**
 * Verify the live schema with catalog-only SELECT statements. The function is
 * safe to use as a deployment gate and from the health endpoint.
 */
export async function verifyDatabaseContract(
  runner: DatabaseContractQueryRunner
): Promise<DatabaseContractResult> {
  const latestMigration = `${LATEST_SCHEMA_MIGRATION.version}_${LATEST_SCHEMA_MIGRATION.name}`;
  const issues: DatabaseContractIssue[] = [];

  try {
    const tableNames = Object.keys(REQUIRED_COLUMNS);
    const [columnsResult, constraintsResult, indexesResult] = await Promise.all([
      runner.query(
        `SELECT table_name, column_name, data_type, udt_name, column_default, is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = ANY($1::text[])
         ORDER BY table_name, ordinal_position`,
        [tableNames]
      ),
      runner.query(
        `SELECT rel.relname AS table_name,
                con.conname AS constraint_name,
                con.contype AS constraint_type,
                pg_get_constraintdef(con.oid) AS definition
         FROM pg_constraint con
         JOIN pg_class rel ON rel.oid = con.conrelid
         JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
         WHERE nsp.nspname = 'public' AND rel.relname = ANY($1::text[])
         ORDER BY rel.relname, con.conname`,
        [tableNames]
      ),
      runner.query(
        `SELECT tablename AS table_name,
                indexname AS index_name,
                indexdef AS index_definition
         FROM pg_indexes
         WHERE schemaname = 'public' AND tablename = ANY($1::text[])
         ORDER BY tablename, indexname`,
        [tableNames]
      ),
    ]);

    addColumnIssues(columnsResult.rows as ColumnRow[], issues);
    addConstraintIssues(constraintsResult.rows as ConstraintRow[], issues);
    addIndexIssues(indexesResult.rows as IndexRow[], issues);

    const hasMigrationsTable = (columnsResult.rows as ColumnRow[]).some(
      (column) => column.table_name === 'migrations'
    );
    let migrationRows: MigrationRow[] = [];
    if (hasMigrationsTable) {
      const migrationResult = await runner.query(
        `SELECT version, name
         FROM migrations
         WHERE version = $1`,
        [LATEST_SCHEMA_MIGRATION.version]
      );
      migrationRows = migrationResult.rows as MigrationRow[];
    }

    if (!migrationRows.some((migration) =>
      migration.version === LATEST_SCHEMA_MIGRATION.version
      && migration.name === LATEST_SCHEMA_MIGRATION.name
    )) {
      issues.push({ code: 'missing_migration', object: latestMigration });
    }

    return { ready: issues.length === 0, latestMigration, issues };
  } catch {
    return {
      ready: false,
      latestMigration,
      issues: [{ code: 'verification_error', object: 'database_catalog' }],
    };
  }
}
