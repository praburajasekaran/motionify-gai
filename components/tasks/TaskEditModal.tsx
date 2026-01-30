import React, { useState, useEffect } from 'react';
import { User, Task } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button, Input } from '@/components/ui/design-system';

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSave: (taskId: string, updatedTask: Partial<Task>) => void;
  teamMembers: User[];
  userId?: string;
  isLoading?: boolean;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  isOpen,
  onClose,
  task,
  onSave,
  teamMembers,
  userId,
  isLoading = false,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'awaiting_approval' | 'completed' | 'revision_requested'>('pending');
  const [assigneeId, setAssigneeId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [visibleToClient, setVisibleToClient] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status as any);
      setAssigneeId(task.assignee?.id || task.assigneeId || '');
      setDeadline(task.deadline ? task.deadline.split('T')[0] : '');
      setVisibleToClient(task.visibleToClient ?? false);
    }
  }, [task, isOpen]);

  const handleSave = () => {
    if (!task || !title.trim()) return;

    const assignee = assigneeId
      ? teamMembers.find(m => m.id === assigneeId)
      : undefined;

    onSave(task.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      assignee,
      deadline: deadline || undefined,
      visibleToClient,
    });

    onClose();
  };

  const statusOptions = [
    { value: 'pending', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'awaiting_approval', label: 'Awaiting Approval' },
    { value: 'completed', label: 'Completed' },
    { value: 'revision_requested', label: 'Revision Requested' },
  ];

  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat' as const,
    backgroundPosition: 'right 1rem center',
    paddingRight: '2.5rem',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Task" size="md">
      <div className="px-6 py-4">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-zinc-900 mb-2.5">
              Task Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-900 mb-2.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              maxLength={5000}
              className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg bg-white text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-900 mb-2.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-all appearance-none cursor-pointer"
              style={selectStyle}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-zinc-900 mb-2.5">
                Assign To
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-all appearance-none cursor-pointer"
                style={selectStyle}
              >
                <option value="">Unassigned</option>
                {userId && teamMembers.some(m => m.id === userId) && (
                  <option value={userId}>
                    {teamMembers.find(m => m.id === userId)!.name} (me)
                  </option>
                )}
                {teamMembers
                  .filter(m => m.id !== userId)
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-semibold text-zinc-900 mb-2.5">
                Due Date
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg bg-white text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Visible to Client Toggle */}
          <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-200">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-zinc-900">Visible to Client</span>
              <span className="text-xs text-zinc-500">
                {visibleToClient
                  ? 'Clients can see this task'
                  : 'Only internal team can see this task'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setVisibleToClient(!visibleToClient)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${visibleToClient ? 'bg-primary' : 'bg-zinc-300'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${visibleToClient ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>

          {!visibleToClient && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-xs font-medium text-amber-700">This task will be marked as Internal Only</span>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end pt-6 mt-8 border-t border-zinc-100">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !title.trim()}
            className="px-5 py-2"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
