'use client';

import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '@/lib/portal/AppContext';
import { UserRole } from '@/lib/portal/types';
import { Clock, Mail, XCircle, RefreshCw, UserMinus } from 'lucide-react';
import { formatTimestamp } from '@/lib/portal/utils/dateUtils';
import Card from './ui/Card';
import Button from './ui/Button';
import InviteModal from './InviteModal';
import ManageTeamModal from './ManageTeamModal';
import { listInvitations, revokeInvitation, resendInvitation, type ProjectInvitation } from '../api/invitations.api';

const TeamManagement = () => {
  const { project, currentUser, removeClientTeamMember } = useContext(AppContext);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  const isPrimaryContact = currentUser?.role === UserRole.PRIMARY_CONTACT;
  const isProjectManager = currentUser?.role === UserRole.PROJECT_MANAGER;

  useEffect(() => {
    if (project?.id) {
      loadInvitations();
    }
  }, [project?.id]);

  const loadInvitations = async () => {
    if (!project?.id) return;

    setLoadingInvitations(true);
    const result = await listInvitations(project.id, 'pending');

    if (result.success && result.invitations) {
      setInvitations(result.invitations);
    }
    setLoadingInvitations(false);
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) {
      return;
    }

    const result = await revokeInvitation(invitationId);

    if (result.success) {
      await loadInvitations();
    } else {
      alert(result.error || 'Failed to revoke invitation');
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    const result = await resendInvitation(invitationId);

    if (result.success) {
      alert('Invitation email resent successfully');
    } else {
      alert(result.error || 'Failed to resend invitation');
    }
  };

  const handleRemoveTeamMember = () => {
    if (memberToRemove) {
      removeClientTeamMember(memberToRemove.id);
      setMemberToRemove(null);
    }
  };

  if (!project) {
    return <Card title="Project Team" />;
  }

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

  return (
    <>
      <Card title="Project Team">
        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="mb-6 p-4 bg-[var(--todoist-yellow-light)] border border-[var(--todoist-yellow)] rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-[var(--todoist-yellow-dark)]" />
              <h4 className="font-semibold text-[var(--todoist-yellow-dark)]">Pending Invitations ({pendingInvitations.length})</h4>
            </div>
            <div className="space-y-2">
              {pendingInvitations.map(invitation => (
                <div key={invitation.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-[var(--todoist-gray-900)]">{invitation.email}</p>
                    <p className="text-sm text-[var(--todoist-gray-500)]">
                      Role: {invitation.role === 'client' ? 'Client' : 'Team Member'}
                      {invitation.invited_by_name && ` • Invited by ${invitation.invited_by_name}`}
                    </p>
                    <p className="text-xs text-[var(--todoist-gray-400)] mt-1">
                      Invited {formatTimestamp(invitation.created_at) || new Date(invitation.created_at).toLocaleDateString()}
                      {' · '}Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResendInvitation(invitation.id)}
                      className="p-2 text-[var(--todoist-blue)] hover:bg-[var(--todoist-blue-light)] rounded transition-colors"
                      title="Resend invitation"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRevokeInvitation(invitation.id)}
                      className="p-2 text-[var(--todoist-red)] hover:bg-[var(--todoist-red-light)] rounded transition-colors"
                      title="Revoke invitation"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-[var(--todoist-gray-900)]">Client Team</h4>
          {isPrimaryContact && (
            <Button variant="secondary" onClick={() => setIsInviteModalOpen(true)} className="text-xs px-2.5 py-1.5">
              Invite
            </Button>
          )}
        </div>
        <div className="mt-3 space-y-3">
          {project.clientTeam.map(user => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-[var(--todoist-gray-50)] rounded-lg border border-[var(--todoist-gray-200)] hover:bg-[var(--todoist-gray-100)] transition-colors">
              <div>
                <p className="font-medium text-[var(--todoist-gray-900)]">{user.name}</p>
                <p className="text-sm text-[var(--todoist-gray-500)]">{user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[var(--todoist-blue)]">{user.role}</span>
                {/* Remove button: Only show for Primary Contact */}
                {isPrimaryContact && (
                  <button
                    onClick={() => user.id !== currentUser?.id && setMemberToRemove({ id: user.id, name: user.name })}
                    disabled={user.id === currentUser?.id}
                    className={`p-1.5 rounded transition-colors ${user.id === currentUser?.id
                      ? 'text-[var(--todoist-gray-300)] cursor-not-allowed'
                      : 'text-[var(--todoist-red)] hover:text-[var(--todoist-red-dark)] hover:bg-[var(--todoist-red-light)]'
                      }`}
                    title={user.id === currentUser?.id ? "Transfer primary contact role first" : "Remove team member"}
                  >
                    <UserMinus className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t pt-4 border-[var(--todoist-gray-200)]">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-[var(--todoist-gray-900)]">Motionify Team</h4>
            {isProjectManager && (
              <Button variant="secondary" onClick={() => setIsManageModalOpen(true)} className="text-xs px-2.5 py-1.5">
                Manage
              </Button>
            )}
          </div>
          <div className="mt-3 space-y-3">
            {project.motionifyTeam.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-[var(--todoist-gray-50)] rounded-lg border border-[var(--todoist-gray-200)] hover:bg-[var(--todoist-gray-100)] transition-colors">
                <div>
                  <p className="font-medium text-[var(--todoist-gray-900)]">{user.name}</p>
                  <p className="text-sm text-[var(--todoist-gray-500)]">{user.email}</p>
                </div>
                <span className="text-sm font-semibold text-[var(--todoist-blue)]">{user.role}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        projectId={project.id}
        onInviteSent={loadInvitations}
        currentUserRole={currentUser?.role}
      />
      <ManageTeamModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
      />

      {/* Remove Team Member Confirmation Dialog */}
      {memberToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">Remove Team Member</h3>
            <p className="text-gray-300 mb-4">
              Are you sure you want to remove <span className="font-semibold text-white">{memberToRemove.name}</span> from this project?
            </p>
            <p className="text-sm text-gray-400 mb-6">
              Their access will be revoked immediately. Historical data (comments, activities) will be preserved.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setMemberToRemove(null)}>
                Cancel
              </Button>
              <button
                onClick={handleRemoveTeamMember}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TeamManagement;

