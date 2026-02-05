'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Edit2, UserX, Mail, Shield } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { listUsers, createUser, updateUser, deactivateUser, type User } from '../api/users.api';
import { formatTimestamp, formatDateTime } from '../utils/dateUtils';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'client' as 'super_admin' | 'project_manager' | 'client' | 'team',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, statusFilter, roleFilter, searchQuery]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    const result = await listUsers();

    if (result.success && result.users) {
      setUsers(result.users);
    } else {
      setError(result.error || 'Failed to load users');
    }
    setLoading(false);
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Filter by status
    if (statusFilter === 'active') {
      filtered = filtered.filter(u => u.is_active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(u => !u.is_active);
    }

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.full_name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = await createUser(formData);

    if (result.success) {
      await loadUsers();
      setIsCreateModalOpen(false);
      setFormData({ email: '', full_name: '', role: 'client' });
    } else {
      setError(result.error || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setError(null);

    const result = await updateUser(selectedUser.id, {
      full_name: formData.full_name,
      role: formData.role,
    });

    if (result.success) {
      await loadUsers();
      setIsEditModalOpen(false);
      setSelectedUser(null);
      setFormData({ email: '', full_name: '', role: 'client' });
    } else {
      setError(result.error || 'Failed to update user');
    }
  };

  const handleDeactivateUser = async (user: User) => {
    if (!confirm(`Are you sure you want to deactivate ${user.full_name}? Their data will be retained for audit purposes.`)) {
      return;
    }

    setError(null);
    const result = await deactivateUser(user.id);

    if (result.success) {
      await loadUsers();
    } else {
      setError(result.error || 'Failed to deactivate user');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    });
    setIsEditModalOpen(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'project_manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'client':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'team':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--todoist-gray-500)]">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--todoist-gray-900)]">User Management</h1>
          <p className="mt-2 text-sm text-[var(--todoist-gray-600)]">
            Manage users, roles, and permissions
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-[var(--todoist-gray-200)] p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--todoist-gray-400)]" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--todoist-gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--todoist-red)] focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-[var(--todoist-gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--todoist-red)] focus:border-transparent"
            >
              <option value="all">All Users</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-4 py-2 border border-[var(--todoist-gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--todoist-red)] focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="project_manager">Project Manager</option>
              <option value="client">Client</option>
              <option value="team">Team</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-[var(--todoist-gray-600)]">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-[var(--todoist-gray-200)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--todoist-gray-200)]">
            <thead className="bg-[var(--todoist-gray-50)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--todoist-gray-500)] uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--todoist-gray-500)] uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--todoist-gray-500)] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--todoist-gray-500)] uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--todoist-gray-500)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[var(--todoist-gray-200)]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[var(--todoist-gray-50)] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {user.avatar_url ? (
                          <img className="h-10 w-10 rounded-full" src={user.avatar_url} alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-[var(--todoist-gray-200)] flex items-center justify-center">
                            <span className="text-[var(--todoist-gray-600)] font-medium">
                              {user.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-[var(--todoist-gray-900)]">
                          {user.full_name}
                        </div>
                        <div className="text-sm text-[var(--todoist-gray-500)] flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                      <Shield className="h-3 w-3 mr-1" />
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.is_active ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--todoist-gray-500)]" title={formatDateTime(user.created_at) || undefined}>
                    {formatTimestamp(user.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-[var(--todoist-red)] hover:text-[var(--todoist-red-dark)] transition-colors"
                        title="Edit user"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {user.is_active && (
                        <button
                          onClick={() => handleDeactivateUser(user)}
                          className="text-[var(--todoist-gray-500)] hover:text-red-600 transition-colors"
                          title="Deactivate user"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--todoist-gray-500)]">No users found matching your filters.</p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Add New User">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--todoist-gray-700)]">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-[var(--todoist-gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--todoist-red)] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-[var(--todoist-gray-700)]">
              Full Name
            </label>
            <input
              type="text"
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-[var(--todoist-gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--todoist-red)] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-[var(--todoist-gray-700)]">
              Role
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="mt-1 block w-full px-3 py-2 border border-[var(--todoist-gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--todoist-red)] focus:border-transparent"
              required
            >
              <option value="client">Client</option>
              <option value="team">Team</option>
              <option value="project_manager">Project Manager</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="bg-[var(--todoist-gray-100)] text-[var(--todoist-gray-700)] hover:bg-[var(--todoist-gray-200)]"
            >
              Cancel
            </Button>
            <Button type="submit">
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit User">
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--todoist-gray-700)]">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              disabled
              className="mt-1 block w-full px-3 py-2 border border-[var(--todoist-gray-300)] rounded-lg bg-[var(--todoist-gray-100)] text-[var(--todoist-gray-500)] cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-[var(--todoist-gray-500)]">Email cannot be changed</p>
          </div>

          <div>
            <label htmlFor="edit_full_name" className="block text-sm font-medium text-[var(--todoist-gray-700)]">
              Full Name
            </label>
            <input
              type="text"
              id="edit_full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-[var(--todoist-gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--todoist-red)] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="edit_role" className="block text-sm font-medium text-[var(--todoist-gray-700)]">
              Role
            </label>
            <select
              id="edit_role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="mt-1 block w-full px-3 py-2 border border-[var(--todoist-gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--todoist-red)] focus:border-transparent"
              required
            >
              <option value="client">Client</option>
              <option value="team">Team</option>
              <option value="project_manager">Project Manager</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="bg-[var(--todoist-gray-100)] text-[var(--todoist-gray-700)] hover:bg-[var(--todoist-gray-200)]"
            >
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagement;
