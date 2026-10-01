import React, { useState, useEffect, useRef } from 'react';
import { Users } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { formatTimestamp, formatDateTime } from '../../utils/dateFormatting';
import { toast } from 'sonner';

interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'super_admin' | 'support' | 'team_member' | 'client';
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

/**
 * User Management page - Super Admin only
 * 
 * Allows Super Admins to:
 * - View all users
 * - Create new users (sends invitation)
 * - Edit user details
 * - Deactivate users
 */
export function UserManagement() {
    const { user: currentUser } = useAuthContext();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
    const [roleFilter, setRoleFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        role: 'support' as 'super_admin' | 'support' | 'team_member' | 'client',
    });

    // Deactivation modal states
    const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
    const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
    const [deactivateReason, setDeactivateReason] = useState('');
    const [deactivating, setDeactivating] = useState(false);
    const deactivateTriggerRef = useRef<HTMLElement | null>(null);

    // Check if user is Super Admin
    const isSuperAdmin = currentUser?.role === 'super_admin';

    useEffect(() => {
        if (isSuperAdmin) {
            loadUsers();
        }
    }, [isSuperAdmin, statusFilter, roleFilter, searchQuery]);

    const loadUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (roleFilter !== 'all') params.set('role', roleFilter);
            if (searchQuery.trim()) params.set('search', searchQuery);

            const response = await fetch(`/.netlify/functions/users-list?${params.toString()}`, { credentials: 'include' });
            const data = await response.json();

            if (data.success) {
                setUsers(data.users || []);
            } else {
                setError(data.error || 'Failed to load users');
            }
        } catch (err) {
            setError('Failed to connect to server');
        }
        setLoading(false);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const response = await fetch('/.netlify/functions/users-create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
                credentials: 'include',
            });
            const data = await response.json();

            if (data.success) {
                await loadUsers();
                setIsCreateModalOpen(false);
                setFormData({ email: '', full_name: '', role: 'support' });
                if (data.emailDelivery?.status === 'failed') {
                    toast.warning(`User created, but the invitation email could not be delivered to ${formData.email}.`);
                } else {
                    toast.success(`User created. Magic link sent to ${formData.email}.`);
                }
            } else {
                setError(data.error || 'Failed to create user');
            }
        } catch (err) {
            setError('Failed to connect to server');
        }
    };

    const openDeactivateModal = (user: User) => {
        deactivateTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setUserToDeactivate(user);
        setDeactivateReason('');
        setIsDeactivateModalOpen(true);
    };

    const closeDeactivateModal = () => {
        setIsDeactivateModalOpen(false);
        setUserToDeactivate(null);
        setDeactivateReason('');
        setDeactivating(false);
    };

    const handleDeactivateUser = async () => {
        if (!userToDeactivate) return;
        if (deactivateReason.trim().length < 10) {
            setError('Please provide a reason with at least 10 characters');
            return;
        }

        setDeactivating(true);
        setError(null);

        try {
            const response = await fetch(`/.netlify/functions/users-delete/${userToDeactivate.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: deactivateReason.trim() }),
                credentials: 'include',
            });
            const data = await response.json();

            if (data.success) {
                await loadUsers();
                closeDeactivateModal();
                toast.success(`User ${userToDeactivate.full_name} has been deactivated. They have been notified via email.`);
            } else {
                setError(data.error || 'Failed to deactivate user');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setDeactivating(false);
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'super_admin': return 'bg-purple-100 text-purple-800';
            case 'support': return 'bg-blue-100 text-blue-800';
            case 'client': return 'bg-green-100 text-green-800';
            case 'team_member': return 'bg-muted text-foreground';
            default: return 'bg-muted text-foreground';
        }
    };

    const getRoleLabel = (role: string) => {
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    if (!isSuperAdmin) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
                    <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
                    <p className="text-red-600">
                        You don't have permission to access User Management.
                        Only Super Admins can manage users.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <div className="space-y-6 pb-20">
            {/* Header */}
            <PageHeader
                title="User Management"
                description="Manage users, roles, and permissions"
                actions={
                <DialogTrigger asChild>
                <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add User
                </button>
                </DialogTrigger>
                }
            />

            {/* Error Display */}
            {error && !loading && users.length === 0 && (
                <ErrorState error={error} onRetry={loadUsers} />
            )}
            {error && (loading || users.length > 0) && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="bg-card rounded-lg border p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {/* Status Filter */}
                    <select
                        aria-label="Filter users by account status"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                        className="w-full px-4 py-2 border rounded-lg"
                    >
                        <option value="all">All Users</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                    </select>

                    {/* Role Filter */}
                    <select
                        aria-label="Filter users by role"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                    >
                        <option value="all">All Roles</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="support">Motionify Studio Support</option>
                        <option value="client">Client</option>
                        <option value="team_member">Team Member</option>
                    </select>
                </div>
                <div className="text-sm text-muted-foreground">
                    Showing {users.length} users
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-card rounded-lg border overflow-x-auto" role="region" aria-label="Team members" tabIndex={0}>
                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                        Loading users...
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Joined</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-muted">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                                <span className="text-muted-foreground font-medium">
                                                    {user.full_name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-foreground">{user.full_name}</div>
                                                <div className="text-sm text-muted-foreground">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                                            {getRoleLabel(user.role)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.is_active ? (
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                                Inactive
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground" title={formatDateTime(user.created_at) || undefined}>
                                        {formatTimestamp(user.created_at)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {user.is_active && (() => {
                                            const isOwnAccount = user.id === currentUser?.id;

                                            if (isOwnAccount) {
                                                return (
                                                    <span className="text-muted-foreground text-sm font-medium">
                                                        You
                                                    </span>
                                                );
                                            }

                                            const activeSuperAdmins = users.filter(u => u.role === 'super_admin' && u.is_active).length;
                                            const isLastSuperAdmin = user.role === 'super_admin' && activeSuperAdmins <= 1;

                                            if (isLastSuperAdmin) {
                                                return (
                                                    <span
                                                        className="text-muted-foreground text-sm cursor-not-allowed"
                                                        title="Cannot deactivate the last Super Admin"
                                                    >
                                                        Deactivate
                                                    </span>
                                                );
                                            }

                                            return (
                                                <button
                                                    onClick={() => openDeactivateModal(user)}
                                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                                                    title="Deactivate user"
                                                >
                                                    Deactivate
                                                </button>
                                            );
                                        })()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {!loading && users.length === 0 && !error && (
                    <EmptyState
                        icon={Users}
                        title="No team members yet"
                        description="Invite team members to get started"
                    />
                )}
            </div>

            {/* Create User Modal */}
            <DialogContent aria-describedby={undefined} className="portal-shell w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto rounded-lg">
                        <DialogTitle className="text-xl font-semibold">Add New User</DialogTitle>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label htmlFor="new-user-email" className="block text-sm font-medium text-foreground">Email Address</label>
                                <input
                                    id="new-user-email"
                                    type="email"
                                    autoComplete="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="new-user-name" className="block text-sm font-medium text-foreground">Full Name</label>
                                <input
                                    id="new-user-name"
                                    type="text"
                                    autoComplete="name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="new-user-role" className="block text-sm font-medium text-foreground">Role</label>
                                <select
                                    id="new-user-role"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                                    required
                                >
                                    <option value="support">Motionify Studio Support</option>
                                    <option value="team_member">Team Member</option>
                                    <option value="client">Client</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 text-foreground border rounded-lg hover:bg-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-[var(--studio-amber-hover)]"
                                >
                                    Create User
                                </button>
                            </div>
                        </form>
            </DialogContent>

            {/* Deactivate User Modal */}
            {isDeactivateModalOpen && userToDeactivate && (
                <Dialog open={isDeactivateModalOpen} onOpenChange={(open) => { if (!open && !deactivating) closeDeactivateModal(); }}>
                    <DialogContent aria-describedby={undefined} className="portal-shell w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto rounded-lg"
                        onCloseAutoFocus={(event) => { event.preventDefault(); deactivateTriggerRef.current?.focus(); }}>
                        <DialogTitle className="text-xl font-semibold text-red-700 dark:text-red-400">Deactivate User</DialogTitle>
                        <p className="text-muted-foreground mb-4">
                            Are you sure you want to deactivate <strong>{userToDeactivate.full_name}</strong>?
                            This will:
                        </p>
                        <ul className="text-sm text-muted-foreground mb-4 list-disc list-inside space-y-1">
                            <li>Immediately revoke their access</li>
                            <li>Invalidate all active sessions</li>
                            <li>Send them a notification email</li>
                            <li>Preserve historical data</li>
                        </ul>
                        <div className="mb-4">
                            <label htmlFor="deactivation-reason" className="block text-sm font-medium text-foreground mb-1">
                                Reason for deactivation <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="deactivation-reason"
                                value={deactivateReason}
                                onChange={(e) => setDeactivateReason(e.target.value)}
                                placeholder="Enter reason for deactivating this user (min 10 characters)..."
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                rows={3}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                {deactivateReason.length}/10 characters minimum
                            </p>
                        </div>
                        {error && (
                            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeDeactivateModal}
                                className="px-4 py-2 text-foreground border rounded-lg hover:bg-muted"
                                disabled={deactivating}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeactivateUser}
                                disabled={deactivating || deactivateReason.trim().length < 10}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {deactivating ? 'Deactivating...' : 'Deactivate User'}
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
        </Dialog>
    );
}

export default UserManagement;
