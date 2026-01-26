/**
 * Deliverable Permission Service
 *
 * Centralizes all permission logic for deliverable-related actions.
 * Implements the 5-role permission system with state-based rules.
 */

import { User, UserRole, Deliverable, DeliverableStatus, Project, ProjectStatus, Task } from '@/types';

/**
 * Helper: Check if user is a Motionify team member (Admin, PM, or Team Member)
 */
export function isMotionifyTeam(user: User): boolean {
  return ['super_admin', 'project_manager', 'team_member'].includes(user.role);
}

/**
 * Helper: Check if user is a client (either Primary Contact or Team Member)
 */
export function isClient(user: User): boolean {
  return user.role === 'client';
}

/**
 * Helper: Check if user is Client Primary Contact for a specific project
 *
 * For MVP: If projectTeamMemberships is not populated (e.g., auth-me doesn't
 * return it), default all clients to primary contact status. This matches
 * the client portal behavior where all clients are treated as PRIMARY_CONTACT.
 */
export function isClientPrimaryContact(user: User, projectId: string): boolean {
  if (user.role !== 'client') return false;

  // If projectTeamMemberships is not populated, default to true for all clients
  // This allows MVP approval flow to work before team membership API is built
  if (!user.projectTeamMemberships || Object.keys(user.projectTeamMemberships).length === 0) {
    return true;
  }

  const membership = user.projectTeamMemberships[projectId];
  return membership?.isPrimaryContact === true;
}

/**
 * Helper: Check if team member is assigned to a task
 */
export function isAssignedToTask(user: User, task?: Task): boolean {
  if (!task) return false;

  // Check both single assignee and multiple assignees
  if (task.assignee?.id === user.id) return true;
  if (task.assignees?.some(assignee => assignee.id === user.id)) return true;

  return false;
}

/**
 * Check if user can view a deliverable
 */
export function canViewDeliverable(
  user: User,
  deliverable: Deliverable,
  project: Project
): boolean {
  // Project must not be archived
  if (project.status === 'Archived') {
    return user.role === 'super_admin';
  }

  // Draft projects: Only Admin/PM can view
  if (project.status === 'Draft') {
    return user.role === 'super_admin' || user.role === 'project_manager';
  }

  // Motionify team can always view (except archived)
  if (isMotionifyTeam(user)) {
    return true;
  }

  // Clients can only view when status is beta_ready or later
  if (isClient(user)) {
    const viewableStatuses: DeliverableStatus[] = [
      'beta_ready',
      'awaiting_approval',
      'approved',
      'payment_pending',
      'final_delivered',
    ];
    return viewableStatuses.includes(deliverable.status);
  }

  return false;
}

/**
 * Check if user can upload beta files
 * Team members can upload beta files ONLY to tasks they're assigned to
 */
export function canUploadBetaFiles(
  user: User,
  project: Project,
  task?: Task
): boolean {
  // Project must not be on hold or archived
  if (project.status === 'On Hold' || project.status === 'Archived') {
    return user.role === 'super_admin';
  }

  // Admin and PM always can
  if (user.role === 'super_admin' || user.role === 'project_manager') {
    return true;
  }

  // Team member only if assigned to task
  if (user.role === 'team_member') {
    return isAssignedToTask(user, task);
  }

  // Clients cannot upload
  return false;
}

/**
 * Check if user can upload final files
 * Only Admin and PM can upload final files
 */
export function canUploadFinalFiles(
  user: User,
  project: Project
): boolean {
  // Project must not be on hold or archived
  if (project.status === 'On Hold' || project.status === 'Archived') {
    return user.role === 'super_admin';
  }

  // Only Admin and PM can upload final files
  return user.role === 'super_admin' || user.role === 'project_manager';
}

/**
 * Check if user can approve a deliverable
 * Only Client Primary Contact can approve, and only when status is awaiting_approval
 */
export function canApproveDeliverable(
  user: User,
  deliverable: Deliverable,
  project: Project
): boolean {
  // Must be client primary contact
  if (!isClientPrimaryContact(user, project.id)) {
    return false;
  }

  // Deliverable must be awaiting approval
  if (deliverable.status !== 'awaiting_approval') {
    return false;
  }

  // Project must not be on hold or archived
  if (project.status === 'On Hold' || project.status === 'Archived') {
    return false;
  }

  // Cannot approve new deliverables if project is awaiting payment
  if (project.status === 'Awaiting Payment') {
    return false;
  }

  // Terms must be accepted
  if (!project.termsAcceptedAt) {
    return false;
  }

  return true;
}

/**
 * Check if user can request revisions / reject a deliverable
 * Only Client Primary Contact can request revisions
 */
export function canRequestRevisions(
  user: User,
  deliverable: Deliverable,
  project: Project
): boolean {
  // Must be client primary contact
  if (!isClientPrimaryContact(user, project.id)) {
    return false;
  }

  // Deliverable must be awaiting approval
  if (deliverable.status !== 'awaiting_approval') {
    return false;
  }

  // Project must not be on hold or archived
  if (project.status === 'On Hold' || project.status === 'Archived') {
    return false;
  }

  // Terms must be accepted
  if (!project.termsAcceptedAt) {
    return false;
  }

  return true;
}

/**
 * Check if user can view approval history
 * Admin, PM, Team Member, and Client PM can view
 * Client Team Members CANNOT view approval history
 */
export function canViewApprovalHistory(
  user: User,
  project: Project
): boolean {
  // Motionify team can always view
  if (isMotionifyTeam(user)) {
    return true;
  }

  // Client Primary Contact can view
  if (isClientPrimaryContact(user, project.id)) {
    return true;
  }

  // Client Team Members cannot view
  return false;
}

/**
 * Check if user can access final files
 * Final files are only accessible after 50% balance payment is received
 */
export function canAccessFinalFiles(
  user: User,
  deliverable: Deliverable,
  project: Project
): boolean {
  // Deliverable must be in final_delivered status
  if (deliverable.status !== 'final_delivered') {
    return false;
  }

  // Check if files have expired (365 days after delivery)
  if (deliverable.expiresAt) {
    const expiryDate = new Date(deliverable.expiresAt);
    const now = new Date();
    if (now > expiryDate) {
      // Only admin can access expired files
      return user.role === 'super_admin';
    }
  }

  // Project must be completed or active
  if (project.status !== 'Completed' && project.status !== 'Active') {
    return user.role === 'super_admin';
  }

  // All roles can access final files after payment
  return canViewDeliverable(user, deliverable, project);
}

/**
 * Check if user can edit a deliverable (change status, upload, etc.)
 * Deliverables are LOCKED during awaiting_approval status
 */
export function canEditDeliverable(
  user: User,
  deliverable: Deliverable,
  project: Project
): boolean {
  // Deliverable is locked during approval
  if (deliverable.status === 'awaiting_approval') {
    return false;
  }

  // Project must not be completed or archived
  if (project.status === 'Completed' || project.status === 'Archived') {
    return user.role === 'super_admin';
  }

  // Only Motionify team can edit
  if (isMotionifyTeam(user)) {
    return true;
  }

  return false;
}

/**
 * Check if user can create new deliverables
 * Only Admin and PM can create deliverables
 */
export function canCreateDeliverable(
  user: User,
  project: Project
): boolean {
  // Project must be active
  if (project.status !== 'Active' && project.status !== 'Draft') {
    return user.role === 'super_admin';
  }

  // Only Admin and PM can create
  return user.role === 'super_admin' || user.role === 'project_manager';
}

/**
 * Check if user can delete a deliverable
 * Only Admin can delete deliverables
 */
export function canDeleteDeliverable(
  user: User,
  project: Project
): boolean {
  // Only super admin can delete
  return user.role === 'super_admin';
}

/**
 * Check if user can view beta files
 * Beta files are watermarked versions shown to clients for approval
 */
export function canViewBetaFiles(
  user: User,
  deliverable: Deliverable,
  project: Project
): boolean {
  // Must be able to view the deliverable first
  if (!canViewDeliverable(user, deliverable, project)) {
    return false;
  }

  // Beta files are only available in certain statuses
  const betaViewableStatuses: DeliverableStatus[] = [
    'beta_ready',
    'awaiting_approval',
    'approved',
  ];

  return betaViewableStatuses.includes(deliverable.status);
}

/**
 * Check if user can submit feedback/comments on a deliverable
 * All users who can view can comment
 */
export function canCommentOnDeliverable(
  user: User,
  deliverable: Deliverable,
  project: Project
): boolean {
  return canViewDeliverable(user, deliverable, project);
}

/**
 * Check if user can edit a task
 * Super Admin and Project Manager can edit any task
 * Team Member can only edit tasks assigned to them
 * Client cannot edit tasks
 */
export function canEditTask(user: User, task?: Task): boolean {
  // Admin and PM can always edit
  if (user.role === 'super_admin' || user.role === 'project_manager') {
    return true;
  }

  // Team member can only edit if assigned
  if (user.role === 'team_member') {
    if (!task) return false;
    // Check single assignee
    if (task.assignee?.id === user.id) return true;
    // Check multiple assignees
    if (task.assignees?.some(assignee => assignee.id === user.id)) return true;
    return false;
  }

  // Clients cannot edit tasks
  return false;
}


/**
 * Get user-friendly reason why action is not permitted
 */
export function getPermissionDeniedReason(
  action: 'view' | 'upload_beta' | 'upload_final' | 'approve' | 'reject' | 'view_history' | 'access_final' | 'edit' | 'create' | 'delete' | 'edit_task',
  user: User,
  deliverable?: Deliverable,
  project?: Project
): string {
  if (!project) return 'Project information not available';

  switch (action) {
    case 'view':
      if (project.status === 'Archived') return 'Project is archived';
      if (project.status === 'Draft') return 'Project is in draft status';
      if (deliverable && isClient(user)) {
        if (deliverable.status === 'pending' || deliverable.status === 'in_progress') {
          return 'Deliverable is not yet ready for client review';
        }
      }
      return 'You do not have permission to view this deliverable';

    case 'approve':
      if (!isClient(user)) return 'Only clients can approve deliverables';
      if (!isClientPrimaryContact(user, project.id)) return 'Only the Primary Contact can approve deliverables';
      if (deliverable?.status !== 'awaiting_approval') return 'Deliverable must be awaiting approval';
      if (project.status === 'Awaiting Payment') return 'Payment is required before approving new deliverables';
      if (!project.termsAcceptedAt) return 'Project terms must be accepted before work can be approved';
      return 'Cannot approve deliverable';

    case 'reject':
      if (!isClient(user)) return 'Only clients can request revisions';
      if (!isClientPrimaryContact(user, project.id)) return 'Only the Primary Contact can request revisions';
      if (deliverable?.status !== 'awaiting_approval') return 'Deliverable must be awaiting approval';
      if (!project.termsAcceptedAt) return 'Project terms must be accepted before requesting revisions';
      return 'Cannot request revisions';

    case 'upload_beta':
      if (user.role === 'team_member') return 'You can only upload to tasks you are assigned to';
      if (isClient(user)) return 'Clients cannot upload files';
      if (project.status === 'On Hold') return 'Project is on hold';
      return 'You do not have permission to upload beta files';

    case 'upload_final':
      if (user.role === 'team_member') return 'Only Motionify Support and Admins can upload final files';
      if (isClient(user)) return 'Clients cannot upload files';
      if (project.status === 'On Hold') return 'Project is on hold';
      return 'You do not have permission to upload final files';

    case 'access_final':
      if (deliverable?.status !== 'final_delivered') return 'Final files not yet delivered';
      if (deliverable.expiresAt && new Date() > new Date(deliverable.expiresAt)) {
        return 'Files have expired (365 days after delivery)';
      }
      return 'Payment required to access final files';

    case 'edit':
      if (deliverable?.status === 'awaiting_approval') return 'Deliverable is locked during approval';
      if (project.status === 'Completed') return 'Project is completed';
      if (isClient(user)) return 'Clients cannot edit deliverables';
      return 'You do not have permission to edit this deliverable';

    case 'create':
      if (project.status !== 'Active' && project.status !== 'Draft') return 'Project must be active';
      if (user.role === 'team_member' || isClient(user)) return 'Only Motionify Support and Admins can create deliverables';
      return 'You do not have permission to create deliverables';

    case 'view_history':
      if (!isClientPrimaryContact(user, project.id) && !isMotionifyTeam(user)) {
        return 'Only Primary Contact and team can view approval history';
      }
      return 'You do not have permission to view approval history';

    case 'edit_task':
      if (user.role === 'super_admin' || user.role === 'project_manager') {
        return 'You have permission to edit this task';
      }
      if (user.role === 'team_member') {
        return 'You can only edit tasks assigned to you';
      }
      return 'Clients cannot edit tasks';

    default:
      return 'Permission denied';
  }
}

/**
 * Check if user can upload project files
 * All roles can upload files to active projects
 */
export function canUploadProjectFile(
  user: User,
  project: Project
): boolean {
  // Project must not be archived
  if (project.status === 'Archived') {
    return user.role === 'super_admin';
  }

  // Everyone can upload to active projects
  return true;
}

/**
 * Check if user can delete project files
 * Clients cannot delete files
 */
export function canDeleteProjectFile(
  user: User,
  project: Project
): boolean {
  // Project must not be archived
  if (project.status === 'Archived') {
    return user.role === 'super_admin';
  }

  // Clients cannot delete
  if (isClient(user)) {
    return false;
  }

  // Motionify team can delete
  return true;
}
