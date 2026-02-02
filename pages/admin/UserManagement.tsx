import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';

interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'super_admin' | 'project_manager' | 'team_member' | 'client';
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
        role: 'project_manager' as 'super_admin' | 'project_manager' | 'team_member' | 'client',
    });

    // Deactivation modal states
    const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
    const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
    const [deactivateReason, setDeactivateReason] = useState('');
    const [deactivating, setDeactivating] = useState(false);

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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include',
            });
            const data = await response.json();

            if (data.success) {
                await loadUsers();
                setIsCreateModalOpen(false);
                setFormData({ email: '', full_name: '', role: 'project_manager' });
                alert(`User created! Magic link sent to ${formData.email} (check server logs)`);
            } else {
                setError(data.error || 'Failed to create user');
            }
        } catch (err) {
            setError('Failed to connect to server');
        }
    };

    const openDeactivateModal = (user: User) => {
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
                alert(`User ${userToDeactivate.full_name} has been deactivated. They have been notified via email.`);
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
            case 'project_manager': return 'bg-blue-100 text-blue-800';
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
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold text-foreground">User Management</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Manage users, roles, and permissions</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add User
                </button>
            </div>

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
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                    >
                        <option value="all">All Roles</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="project_manager">Project Manager</option>
                        <option value="client">Client</option>
                        <option value="team_member">Team Member</option>
                    </select>
                </div>
                <div className="text-sm text-muted-foreground">
                    Showing {users.length} users
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-card rounded-lg border overflow-hidden">
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
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        {new Date(user.created_at).toLocaleDateString()}
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
                                                    className="text-red-600 hover:text-red-800 text-sm"
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
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-semibold mb-4">Add New User</h2>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground">Email Address</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground">Full Name</label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                                    required
                                >
                                    <option value="project_manager">Project Manager</option>
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
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Deactivate User Modal */}
            {isDeactivateModalOpen && userToDeactivate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-semibold mb-2 text-red-700">Deactivate User</h2>
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
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Reason for deactivation <span className="text-red-500">*</span>
                            </label>
                            <textarea
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
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserManagement;
