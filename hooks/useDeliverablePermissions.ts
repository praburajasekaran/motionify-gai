/**
 * useDeliverablePermissions Hook
 *
 * Custom hook that provides permission checks for a specific deliverable.
 * Automatically uses the current user and project context.
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Deliverable, Project, Task } from '@/types';
import {
  canViewDeliverable,
  canUploadBetaFiles,
  canUploadFinalFiles,
  canApproveDeliverable,
  canRequestRevisions,
  canViewApprovalHistory,
  canAccessFinalFiles,
  canEditDeliverable,
  canCreateDeliverable,
  canDeleteDeliverable,
  canViewBetaFiles,
  canCommentOnDeliverable,
  getPermissionDeniedReason,
  isClientPrimaryContact,
  isMotionifyTeam,
} from '@/utils/deliverablePermissions';

interface UseDeliverablePermissionsProps {
  deliverable?: Deliverable;
  project: Project;
  task?: Task;
}

export function useDeliverablePermissions({
  deliverable,
  project,
  task,
}: UseDeliverablePermissionsProps) {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    if (!user) {
      // No user logged in - deny all permissions
      return {
        canView: false,
        canUploadBeta: false,
        canUploadFinal: false,
        canApprove: false,
        canReject: false,
        canViewHistory: false,
        canAccessFinal: false,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canViewBeta: false,
        canComment: false,
        isClientPM: false,
        isTeamMember: false,
        getDeniedReason: (action: string) => 'You must be logged in',
      };
    }

    return {
      // View permissions
      canView: deliverable ? canViewDeliverable(user, deliverable, project) : true,
      canViewBeta: deliverable ? canViewBetaFiles(user, deliverable, project) : false,
      canViewHistory: canViewApprovalHistory(user, project),

      // Upload permissions
      canUploadBeta: canUploadBetaFiles(user, project, task),
      canUploadFinal: canUploadFinalFiles(user, project),

      // Approval permissions
      canApprove: deliverable ? canApproveDeliverable(user, deliverable, project) : false,
      canReject: deliverable ? canRequestRevisions(user, deliverable, project) : false,

      // Access permissions
      canAccessFinal: deliverable ? canAccessFinalFiles(user, deliverable, project) : false,

      // Edit permissions
      canEdit: deliverable ? canEditDeliverable(user, deliverable, project) : false,
      canCreate: canCreateDeliverable(user, project),
      canDelete: canDeleteDeliverable(user, project),

      // Comment permissions
      canComment: deliverable ? canCommentOnDeliverable(user, deliverable, project) : false,

      // Role checks
      isClientPM: isClientPrimaryContact(user, project.id),
      isTeamMember: isMotionifyTeam(user),

      // Get reason for denied action
      getDeniedReason: (
        action: 'view' | 'upload_beta' | 'upload_final' | 'approve' | 'reject' | 'view_history' | 'access_final' | 'edit' | 'create' | 'delete'
      ) => getPermissionDeniedReason(action, user, deliverable, project),
    };
  }, [user, deliverable, project, task]);

  return permissions;
}
