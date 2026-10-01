export const canonicalColumns = [
  ['users', 'id', 'uuid', 'uuid', null, 'NO'],
  ['project_requests', 'id', 'uuid', 'uuid', 'gen_random_uuid()', 'NO'],
  ['project_requests', 'request_number', 'character varying', 'varchar', null, 'NO'],
  ['project_requests', 'client_user_id', 'uuid', 'uuid', null, 'NO'],
  ['project_requests', 'title', 'character varying', 'varchar', null, 'NO'],
  ['project_requests', 'description', 'text', 'text', null, 'NO'],
  ['project_requests', 'tentative_deadline', 'date', 'date', null, 'NO'],
  ['project_requests', 'status', 'character varying', 'varchar', "'pending'::character varying", 'NO'],
  ['project_requests', 'created_at', 'timestamp with time zone', 'timestamptz', 'now()', 'NO'],
  ['project_requests', 'updated_at', 'timestamp with time zone', 'timestamptz', 'now()', 'NO'],
  ['project_files', 'id', 'uuid', 'uuid', 'gen_random_uuid()', 'NO'],
  ['project_files', 'project_id', 'uuid', 'uuid', null, 'NO'],
  ['project_files', 'r2_key', 'text', 'text', null, 'NO'],
  ['deliverables', 'id', 'uuid', 'uuid', 'gen_random_uuid()', 'NO'],
  ['projects', 'status', 'character varying', 'varchar', "'active'::character varying", 'NO'],
  ['project_team', 'id', 'uuid', 'uuid', 'gen_random_uuid()', 'NO'],
  ['project_team', 'user_id', 'uuid', 'uuid', null, 'NO'],
  ['project_team', 'project_id', 'uuid', 'uuid', null, 'NO'],
  ['project_team', 'role', 'character varying', 'varchar', null, 'NO'],
  ['project_team', 'is_primary_contact', 'boolean', 'bool', 'false', 'NO'],
  ['project_team', 'added_at', 'timestamp with time zone', 'timestamptz', 'now()', 'NO'],
  ['project_team', 'added_by', 'uuid', 'uuid', null, 'YES'],
  ['project_team', 'invitation_id', 'uuid', 'uuid', null, 'YES'],
  ['project_team', 'removed_at', 'timestamp with time zone', 'timestamptz', null, 'YES'],
  ['project_team', 'removed_by', 'uuid', 'uuid', null, 'YES'],
  ['project_invitations', 'id', 'uuid', 'uuid', 'gen_random_uuid()', 'NO'],
  ['project_invitations', 'token', 'character varying', 'varchar', null, 'NO'],
  ['project_invitations', 'email', 'character varying', 'varchar', null, 'NO'],
  ['project_invitations', 'role', 'character varying', 'varchar', null, 'NO'],
  ['project_invitations', 'status', 'character varying', 'varchar', "'pending'::character varying", 'NO'],
  ['project_invitations', 'project_id', 'uuid', 'uuid', null, 'NO'],
  ['project_invitations', 'invited_by', 'uuid', 'uuid', null, 'NO'],
  ['project_invitations', 'expires_at', 'timestamp with time zone', 'timestamptz', null, 'NO'],
  ['project_invitations', 'accepted_at', 'timestamp with time zone', 'timestamptz', null, 'YES'],
  ['project_invitations', 'accepted_by', 'uuid', 'uuid', null, 'YES'],
  ['project_invitations', 'revoked_at', 'timestamp with time zone', 'timestamptz', null, 'YES'],
  ['project_invitations', 'revoked_by', 'uuid', 'uuid', null, 'YES'],
  ['project_invitations', 'resent_at', 'timestamp with time zone', 'timestamptz', null, 'YES'],
  ['project_invitations', 'resent_count', 'integer', 'int4', '0', 'NO'],
  ['sessions', 'id', 'uuid', 'uuid', 'gen_random_uuid()', 'NO'],
  ['sessions', 'user_id', 'uuid', 'uuid', null, 'YES'],
  ['sessions', 'token', 'character varying', 'varchar', null, 'NO'],
  ['sessions', 'jwt_token_hash', 'character varying', 'varchar', null, 'YES'],
  ['sessions', 'remember_me', 'boolean', 'bool', 'false', 'NO'],
  ['sessions', 'expires_at', 'timestamp with time zone', 'timestamptz', null, 'NO'],
  ['sessions', 'last_active_at', 'timestamp with time zone', 'timestamptz', 'now()', 'NO'],
  ['sessions', 'created_at', 'timestamp with time zone', 'timestamptz', 'now()', 'NO'],
  ['migrations', 'version', 'character varying', 'varchar', null, 'NO'],
  ['migrations', 'name', 'character varying', 'varchar', null, 'NO'],
].map(([table_name, column_name, data_type, udt_name, column_default, is_nullable]) => ({
  table_name,
  column_name,
  data_type,
  udt_name,
  column_default,
  is_nullable,
}));

export const canonicalConstraints = [
  { table_name: 'project_requests', constraint_name: 'project_requests_pkey', constraint_type: 'p', definition: 'PRIMARY KEY (id)' },
  { table_name: 'project_requests', constraint_name: 'project_requests_request_number_key', constraint_type: 'u', definition: 'UNIQUE (request_number)' },
  { table_name: 'project_requests', constraint_name: 'project_requests_client_user_id_fkey', constraint_type: 'f', definition: 'FOREIGN KEY (client_user_id) REFERENCES users(id) ON DELETE CASCADE' },
  { table_name: 'project_requests', constraint_name: 'project_requests_status_check', constraint_type: 'c', definition: "CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'converted', 'cancelled'))" },
  { table_name: 'projects', constraint_name: 'projects_status_check', constraint_type: 'c', definition: "CHECK (status IN ('draft', 'active', 'in_review', 'awaiting_payment', 'on_hold', 'completed', 'archived', 'cancelled'))" },
  { table_name: 'project_invitations', constraint_name: 'project_invitations_role_check', constraint_type: 'c', definition: "CHECK (role IN ('client', 'team_member'))" },
  { table_name: 'project_invitations', constraint_name: 'project_invitations_status_check', constraint_type: 'c', definition: "CHECK (status IN ('pending', 'accepted', 'revoked', 'expired'))" },
  { table_name: 'sessions', constraint_name: 'sessions_user_id_fkey', constraint_type: 'f', definition: 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE' },
];

export const canonicalIndexes = [
  { table_name: 'project_team', index_name: 'idx_project_team_user_project', index_definition: 'CREATE UNIQUE INDEX idx_project_team_user_project ON public.project_team USING btree (user_id, project_id)' },
  { table_name: 'sessions', index_name: 'idx_sessions_jwt_token_hash', index_definition: 'CREATE UNIQUE INDEX idx_sessions_jwt_token_hash ON public.sessions USING btree (jwt_token_hash) WHERE (jwt_token_hash IS NOT NULL)' },
  { table_name: 'project_files', index_name: 'idx_project_files_r2_key', index_definition: 'CREATE UNIQUE INDEX idx_project_files_r2_key ON public.project_files USING btree (r2_key)' },
];

export const canonicalMigrations = [
  { version: '029', name: 'reconcile_membership_nullability' },
];

export function createContractRunner(overrides: {
  columns?: typeof canonicalColumns;
  constraints?: typeof canonicalConstraints;
  indexes?: typeof canonicalIndexes;
  migrations?: typeof canonicalMigrations;
} = {}) {
  const calls: string[] = [];
  const rows = {
    columns: overrides.columns ?? canonicalColumns,
    constraints: overrides.constraints ?? canonicalConstraints,
    indexes: overrides.indexes ?? canonicalIndexes,
    migrations: overrides.migrations ?? canonicalMigrations,
  };

  return {
    calls,
    async query(text: string) {
      calls.push(text);
      if (/information_schema\.columns/.test(text)) return { rows: rows.columns };
      if (/pg_constraint/.test(text)) return { rows: rows.constraints };
      if (/pg_indexes/.test(text)) return { rows: rows.indexes };
      if (/FROM migrations/.test(text)) return { rows: rows.migrations };
      throw new Error(`Unexpected contract query: ${text}`);
    },
  };
}
