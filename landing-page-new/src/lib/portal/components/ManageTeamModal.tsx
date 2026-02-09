'use client';

import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '@/lib/portal/AppContext';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { User, UserRole } from '@/lib/portal/types';

interface ManageTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManageTeamModal: React.FC<ManageTeamModalProps> = ({ isOpen, onClose }) => {
  const { project, updateMotionifyTeam, allMotionifyUsers } = useContext(AppContext);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project && isOpen) {
      setSelectedMemberIds(project.motionifyTeam.map(u => u.id));
      setError(null);
    }
  }, [project, isOpen]);

  // Support users are auto-assigned to all projects and cannot be removed
  const supportUserIds = allMotionifyUsers
    .filter(u => u.role === UserRole.SUPPORT)
    .map(u => u.id);

  const handleCheckboxChange = (memberId: string, userRole: UserRole) => {
    // Support users cannot be toggled — they're always assigned
    if (userRole === UserRole.SUPPORT) return;

    const newSelection = selectedMemberIds.includes(memberId)
      ? selectedMemberIds.filter(id => id !== memberId)
      : [...selectedMemberIds, memberId];

    setSelectedMemberIds(newSelection);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Always include support users (they're auto-assigned to all projects)
    const finalMemberIds = [...new Set([...selectedMemberIds, ...supportUserIds])];

    // Prevent empty team (at minimum, support users will be included)
    if (finalMemberIds.length === 0) {
      setError('At least one team member must be assigned to the project');
      return;
    }

    if (project) {
        updateMotionifyTeam(finalMemberIds);
    }
    onClose();
  };

  if (!project) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage Team for ${project.name}`}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select the team members to assign to this project. Motionify Support is automatically assigned to all projects.
          </p>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          <div className="max-h-60 overflow-y-auto space-y-3 border p-3 rounded-md dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
            {allMotionifyUsers.map(user => {
              const isSupportUser = user.role === UserRole.SUPPORT;
              return (
                <div key={user.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`user-${user.id}`}
                    checked={selectedMemberIds.includes(user.id) || isSupportUser}
                    disabled={isSupportUser}
                    onChange={() => handleCheckboxChange(user.id, user.role)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <label htmlFor={`user-${user.id}`} className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user.name} <span className="text-gray-500">({user.role})</span>
                    {isSupportUser && <span className="text-xs text-gray-400 ml-1">(auto-assigned)</span>}
                  </label>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ManageTeamModal;

