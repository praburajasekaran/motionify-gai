'use client';

import React, { useState, useContext, useEffect, useMemo } from 'react';
import { AppContext } from '@/lib/portal/AppContext';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Task, UserRole } from '@/lib/portal/types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, taskToEdit }) => {
  const { project, currentUser, addTask, updateTask } = useContext(AppContext);

  const isClientUser = useMemo(() => {
    if (!currentUser?.role) return false;
    const clientRoleValues = [UserRole.PRIMARY_CONTACT, UserRole.TEAM_MEMBER, 'client', 'client_primary', 'client_team'];
    return clientRoleValues.includes(currentUser.role as UserRole);
  }, [currentUser]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibleToClient, setVisibleToClient] = useState(false);
  const [deliverableId, setDeliverableId] = useState<string>('');
  const [deadline, setDeadline] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  
  const isEditMode = !!taskToEdit;

  const allTeamMembers = useMemo(() => {
    if (!project) return [];
    return [...project.clientTeam, ...project.motionifyTeam];
  }, [project]);

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        setTitle(taskToEdit.title);
        setDescription(taskToEdit.description);
        setVisibleToClient(taskToEdit.visibleToClient);
        setDeliverableId(taskToEdit.deliverableId || '');
        setDeadline(taskToEdit.deadline || '');
        setAssigneeId(taskToEdit.assigneeId || '');
      } else {
        setTitle('');
        setDescription('');
        setVisibleToClient(false);
        setDeliverableId('');
        setDeadline('');
        setAssigneeId('');
      }
    }
  }, [isOpen, isEditMode, taskToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    
    const taskData = { 
      title, 
      description, 
      visibleToClient, 
      deliverableId: deliverableId || undefined,
      deadline: deadline || undefined,
      assigneeId: assigneeId || undefined,
    };

    if (isEditMode) {
      updateTask(taskToEdit.id, taskData);
    } else {
      addTask(taskData);
    }
    
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? 'Edit Task' : 'Create New Task'}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Task Title
            </label>
            <input
              type="text"
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div>
            <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              id="task-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
           <div>
            <label htmlFor="task-deliverable" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Link to Deliverable (Optional)
            </label>
            <select
              id="task-deliverable"
              value={deliverableId}
              onChange={(e) => setDeliverableId(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">None</option>
              {project?.scope.deliverables.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          {!isClientUser && (
           <div>
            <label htmlFor="task-assignee" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Assign To (Optional)
            </label>
            <select
              id="task-assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Unassigned</option>
              {allTeamMembers.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
          )}
          <div>
            <label htmlFor="task-deadline" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Deadline (Optional)
            </label>
            <input
              type="date"
              id="task-deadline"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          {!isClientUser && (
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="visible"
                name="visible"
                type="checkbox"
                checked={visibleToClient}
                onChange={(e) => setVisibleToClient(e.target.checked)}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="visible" className="font-medium text-gray-700 dark:text-gray-200">
                Visible to Client
              </label>
            </div>
          </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !description.trim()}>
              {isEditMode ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default TaskModal;

