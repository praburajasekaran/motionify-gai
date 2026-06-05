export type CanonicalUserRole = 'super_admin' | 'support' | 'team_member' | 'client';

export type UserRoleInput = CanonicalUserRole | 'team' | 'admin' | 'project_manager' | string | null | undefined;

export function normalizeRole(role: UserRoleInput): CanonicalUserRole | 'unknown' {
  if (role === 'team') return 'team_member';
  if (role === 'admin') return 'super_admin';
  if (role === 'project_manager') return 'support';
  if (role === 'super_admin' || role === 'support' || role === 'team_member' || role === 'client') {
    return role;
  }
  return 'unknown';
}

export function isAdminLike(role: UserRoleInput): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'super_admin' || normalized === 'support';
}

export function isSuperAdmin(role: UserRoleInput): boolean {
  return normalizeRole(role) === 'super_admin';
}

export function isClient(role: UserRoleInput): boolean {
  return normalizeRole(role) === 'client';
}

export function isTeamLike(role: UserRoleInput): boolean {
  return normalizeRole(role) === 'team_member';
}

export function isClientLike(role: UserRoleInput): boolean {
  return normalizeRole(role) === 'client';
}

export function isInternalRole(role: UserRoleInput): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'super_admin' || normalized === 'support' || normalized === 'team_member';
}
