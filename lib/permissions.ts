/**
 * Permission Helper Functions
 * Centralized permission checks for role-based access control
 */

export type UserRole = 'super_admin' | 'project_manager' | 'team_member' | 'client';

interface User {
  id: string;
  role: UserRole;
  [key: string]: any;
}

/**
 * Check if user is a Motionify admin (super admin or project manager)
 */
export function isMotionifyAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'super_admin' || user.role === 'project_manager';
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'super_admin';
}

/**
 * Check if user is project manager
 */
export function isProjectManager(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'project_manager';
}

/**
 * Check if user is Motionify team member (any internal role)
 */
export function isMotionifyTeam(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'super_admin' ||
         user.role === 'project_manager' ||
         user.role === 'team_member';
}

/**
 * Check if user is a client
 */
export function isClient(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'client';
}

/**
 * Get human-readable role label
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    project_manager: 'Project Manager',
    team_member: 'Team Member',
    client: 'Client',
  };
  return labels[role] || role;
}

/**
 * Permission checks for specific features
 */
export const Permissions = {
  /**
   * Can access inquiry management dashboard
   * Super Admins see all inquiries, Clients see only their own
   */
  canManageInquiries(user: User | null): boolean {
    if (!user) return false;
    return isSuperAdmin(user) || isClient(user);
  },

  /**
   * Can create proposals from inquiries
   * Only super_admin can create proposals
   */
  canCreateProposals(user: User | null): boolean {
    return isSuperAdmin(user);
  },

  /**
   * Can view all projects (not just assigned ones)
   */
  canViewAllProjects(user: User | null): boolean {
    return isMotionifyTeam(user);
  },

  /**
   * Can manage team members
   */
  canManageTeam(user: User | null): boolean {
    return isMotionifyAdmin(user);
  },

  /**
   * Can access system settings
   */
  canAccessSettings(user: User | null): boolean {
    return isSuperAdmin(user);
  },
};
