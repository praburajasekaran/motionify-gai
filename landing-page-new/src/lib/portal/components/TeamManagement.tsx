'use client';

import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '@/lib/portal/AppContext';
import { UserRole } from '@/lib/portal/types';
import { Clock, Mail, XCircle, RefreshCw } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import InviteModal from './InviteModal';
import ManageTeamModal from './ManageTeamModal';
import { listInvitations, revokeInvitation, resendInvitation, type ProjectInvitation } from '../api/invitations.api';

const TeamManagement = () => {
  const { project, currentUser } = useContext(AppContext);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

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
                      Expires: {new Date(invitation.expires_at).toLocaleDateString()}
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
            <h4 className="font-semibold text-white">Client Team</h4>
            {isPrimaryContact && (
                <Button variant="secondary" onClick={() => setIsInviteModalOpen(true)} className="text-xs px-2.5 py-1.5">
                    Invite
                </Button>
            )}
        </div>
        <div className="mt-3 space-y-3">
          {project.clientTeam.map(user => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
              <div>
                <p className="font-medium text-white">{user.name}</p>
                <p className="text-sm text-white/60">{user.email}</p>
              </div>
              <span className="text-sm font-semibold text-cyan-400">{user.role}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t pt-4 border-white/10">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold text-white">Motionify Team</h4>
                {isProjectManager && (
                    <Button variant="secondary" onClick={() => setIsManageModalOpen(true)} className="text-xs px-2.5 py-1.5">
                        Manage
                    </Button>
                )}
            </div>
            <div className="mt-3 space-y-3">
            {project.motionifyTeam.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <div>
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="text-sm text-white/60">{user.email}</p>
                </div>
                <span className="text-sm font-semibold text-cyan-400">{user.role}</span>
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
      />
      <ManageTeamModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
      />
    </>
  );
};

export default TeamManagement;

