import React, { useState, useEffect, useCallback } from 'react';
import { Users, Mail, MoreVertical, Crown, Clock, UserPlus, RefreshCw, X, AlertTriangle } from 'lucide-react';
import {
    Button, Card, CardContent, Badge, Avatar,
    DropdownMenu, DropdownMenuItem, EmptyState
} from '../ui/design-system';
import { InviteModal } from './InviteModal';
import { USER_ROLE_LABELS } from '../../types';
import type { Project, User } from '../../types';

interface PendingInvitation {
    id: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
    expiresAt: string;
    invitedByName?: string;
}

interface TeamTabProps {
    project: Project;
    user: User | null;
    isPrimaryContact: boolean | null;
    isInviteModalOpen: boolean;
    setIsInviteModalOpen: (open: boolean) => void;
    onTeamUpdated: (team: User[]) => void;
    addToast: (toast: { title: string; description: string; variant: string }) => void;
}

export const TeamTab: React.FC<TeamTabProps> = ({
    project,
    user,
    isPrimaryContact,
    isInviteModalOpen,
    setIsInviteModalOpen,
    onTeamUpdated,
    addToast,
}) => {
    const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
    const [removingUserId, setRemovingUserId] = useState<string | null>(null);
    const [confirmRemove, setConfirmRemove] = useState<{ userId: string; name: string } | null>(null);

    const canManageTeam = isPrimaryContact || user?.role === 'project_manager' || user?.role === 'super_admin';

    // Fetch pending invitations
    const fetchInvitations = useCallback(async () => {
        try {
            const response = await fetch(`/.netlify/functions/invitations-list/${project.id}?status=pending`, {
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setPendingInvitations(data.invitations || []);
            }
        } catch (error) {
            console.error('Failed to fetch invitations:', error);
        }
    }, [project.id]);

    useEffect(() => {
        fetchInvitations();
    }, [fetchInvitations]);

    // Refresh team data after invite sent
    const handleInviteSent = () => {
        fetchInvitations();
        addToast({
            title: 'Invitation Sent',
            description: 'Team member has been invited to the project.',
            variant: 'success',
        });
    };

    // Remove member
    const handleRemoveMember = async (userId: string) => {
        setRemovingUserId(userId);
        try {
            const response = await fetch(`/.netlify/functions/project-team/${project.id}/${userId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (response.ok) {
                const updatedTeam = project.team.filter(m => m.id !== userId);
                onTeamUpdated(updatedTeam);
                addToast({
                    title: 'Member Removed',
                    description: 'Team member has been removed from the project.',
                    variant: 'default',
                });
            } else {
                const data = await response.json();
                const errorMsg = data.error?.message || data.error || 'Failed to remove member';
                addToast({
                    title: 'Cannot Remove',
                    description: errorMsg,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Failed to remove member:', error);
            addToast({
                title: 'Error',
                description: 'Failed to remove member. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setRemovingUserId(null);
            setConfirmRemove(null);
        }
    };

    // Revoke invitation
    const handleRevokeInvitation = async (invitationId: string) => {
        try {
            const response = await fetch(`/.netlify/functions/invitations-revoke/${invitationId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (response.ok) {
                setPendingInvitations(prev => prev.filter(i => i.id !== invitationId));
                addToast({
                    title: 'Invitation Revoked',
                    description: 'The invitation has been cancelled.',
                    variant: 'default',
                });
            } else {
                addToast({
                    title: 'Error',
                    description: 'Failed to revoke invitation.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Failed to revoke invitation:', error);
        }
    };

    // Resend invitation
    const handleResendInvitation = async (invitationId: string) => {
        try {
            const response = await fetch(`/.netlify/functions/invitations-resend/${invitationId}/resend`, {
                method: 'POST',
                credentials: 'include',
            });

            if (response.ok) {
                addToast({
                    title: 'Invitation Resent',
                    description: 'The invitation email has been resent.',
                    variant: 'success',
                });
            } else {
                addToast({
                    title: 'Error',
                    description: 'Failed to resend invitation.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Failed to resend invitation:', error);
        }
    };

    // Split team into Motionify and Client groups
    const motionifyTeam = project.team.filter(m =>
        m.role === 'super_admin' || m.role === 'project_manager' || m.role === 'team_member'
    );
    const clientTeam = project.team.filter(m => m.role === 'client');

    const canRemoveMember = (member: User): boolean => {
        if (!canManageTeam) return false;
        if (member.id === user?.id) return false; // Can't remove self
        // Client primary contact can only remove other clients
        if (user?.role === 'client' && member.role !== 'client') return false;
        return true;
    };

    const getRoleLabel = (role: string): string => {
        return USER_ROLE_LABELS[role as keyof typeof USER_ROLE_LABELS] || role;
    };

    const renderMemberCard = (member: User & { isPrimaryContact?: boolean }) => (
        <Card key={member.id} hoverable className="group relative border-border">
            {member.isPrimaryContact && (
                <div className="absolute top-3 right-3 text-amber-600 bg-amber-50 border border-amber-100 p-1.5 rounded-full shadow-sm" title="Primary Contact">
                    <Crown className="h-3.5 w-3.5" />
                </div>
            )}
            <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="relative mb-5">
                    <Avatar src={member.avatar} fallback={member.name?.[0] || '?'} className="h-20 w-20 ring-4 ring-muted shadow-md group-hover:ring-primary/10 transition-all" />
                    <div className="absolute bottom-0 right-0 h-5 w-5 bg-green-500 border-4 border-card rounded-full"></div>
                </div>
                <h4 className="font-bold text-lg text-foreground">
                    {member.name}
                    {member.id === user?.id && (
                        <span className="text-xs font-normal text-muted-foreground ml-2">(You)</span>
                    )}
                </h4>
                <p className="text-sm text-muted-foreground font-medium mb-1">
                    {getRoleLabel(member.role)}
                    {member.isPrimaryContact && (
                        <Badge variant="outline" className="ml-2 text-amber-600 border-amber-200 text-[10px]">Primary</Badge>
                    )}
                </p>
                <p className="text-xs text-muted-foreground mb-6 font-mono">{member.email}</p>

                <div className="flex gap-2 w-full">
                    {member.email && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent"
                            onClick={() => window.open(`mailto:${member.email}`, '_blank')}
                        >
                            <Mail className="h-4 w-4" />
                        </Button>
                    )}
                    {canRemoveMember(member) && (
                        <DropdownMenu trigger={
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        }>
                            <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setConfirmRemove({ userId: member.id, name: member.name })}
                            >
                                Remove from project
                            </DropdownMenuItem>
                        </DropdownMenu>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground">Project Team</h3>
                    <p className="text-sm text-muted-foreground">
                        {project.team.length} member{project.team.length !== 1 ? 's' : ''}
                        {pendingInvitations.length > 0 && ` · ${pendingInvitations.length} pending`}
                    </p>
                </div>
                {canManageTeam && (
                    <Button
                        className="gap-2 shadow-sm"
                        aria-label="Add Member"
                        onClick={() => setIsInviteModalOpen(true)}
                    >
                        <UserPlus className="h-4 w-4" /> Add Member
                    </Button>
                )}
            </div>

            {project.team.length === 0 && pendingInvitations.length === 0 ? (
                <EmptyState
                    title="No team members yet"
                    description={canManageTeam
                        ? "Invite team members to start collaborating on this project."
                        : "Team members will appear here once they are added to the project."
                    }
                    icon={Users}
                    className="py-16 bg-muted/50 border-dashed border rounded-lg"
                    action={canManageTeam ? {
                        label: 'Invite First Member',
                        onClick: () => setIsInviteModalOpen(true),
                    } : undefined}
                />
            ) : (
                <div className="space-y-8">
                    {/* Motionify Team */}
                    {motionifyTeam.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                                Motionify Team ({motionifyTeam.length})
                            </h4>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {motionifyTeam.map(renderMemberCard)}
                            </div>
                        </div>
                    )}

                    {/* Client Team */}
                    {clientTeam.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                                Client Team ({clientTeam.length})
                            </h4>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {clientTeam.map(renderMemberCard)}
                            </div>
                        </div>
                    )}

                    {/* Pending Invitations */}
                    {pendingInvitations.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                                Pending Invitations ({pendingInvitations.length})
                            </h4>
                            <div className="space-y-3">
                                {pendingInvitations.map((inv) => (
                                    <div key={inv.id} className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                                <Mail className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{inv.email}</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Expires {new Date(inv.expiresAt).toLocaleDateString()}
                                                    <span className="mx-1">·</span>
                                                    {getRoleLabel(inv.role)}
                                                </p>
                                            </div>
                                        </div>
                                        {canManageTeam && (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-xs text-muted-foreground hover:text-foreground gap-1"
                                                    onClick={() => handleResendInvitation(inv.id)}
                                                >
                                                    <RefreshCw className="h-3 w-3" /> Resend
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-xs text-red-500 hover:text-red-700 gap-1"
                                                    onClick={() => handleRevokeInvitation(inv.id)}
                                                >
                                                    <X className="h-3 w-3" /> Revoke
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Remove Confirmation Dialog */}
            {confirmRemove && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmRemove(null)} />
                    <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">Remove Member</h3>
                                <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6">
                            Are you sure you want to remove <strong>{confirmRemove.name}</strong> from this project?
                            Their existing contributions will be preserved.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setConfirmRemove(null)}>Cancel</Button>
                            <Button
                                variant="destructive"
                                onClick={() => handleRemoveMember(confirmRemove.userId)}
                                disabled={removingUserId === confirmRemove.userId}
                            >
                                {removingUserId === confirmRemove.userId ? 'Removing...' : 'Remove'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            <InviteModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                projectId={project.id}
                currentUserRole={user?.role}
                onInviteSent={handleInviteSent}
            />
        </>
    );
};
