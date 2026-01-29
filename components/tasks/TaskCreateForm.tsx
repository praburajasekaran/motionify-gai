import React, { useState, useRef, useEffect } from 'react';
import { PlusCircle, X } from 'lucide-react';
import { User, Task } from '@/types';
import { Button, Input } from '@/components/ui/design-system';
import { createTask } from '@/services/taskApi';

interface TaskCreateFormProps {
  projectId: string;
  teamMembers: User[];
  onTaskCreated: (task: Task) => void;
  userId: string;
}

export const TaskCreateForm: React.FC<TaskCreateFormProps> = ({
  projectId,
  teamMembers,
  onTaskCreated,
  userId,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded && titleRef.current) {
      titleRef.current.focus();
    }
  }, [isExpanded]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAssigneeId('');
    setDueDate('');
    setError('');
  };

  const handleCancel = () => {
    resetForm();
    setIsExpanded(false);
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const newTask = await createTask({
        project_id: projectId,
        title: trimmedTitle,
        description: description.trim() || undefined,
        visible_to_client: false,
        status: 'pending',
        assignee_id: assigneeId || undefined,
        deadline: dueDate || undefined,
      });

      onTaskCreated(newTask);
      resetForm();
      // Keep form expanded for rapid multi-task creation
      // Re-focus title for next task
      titleRef.current?.focus();
    } catch (err) {
      console.error('Failed to create task:', err);
      // Error toast is handled by the parent via onTaskCreated callback pattern,
      // but we also surface it here since we own the API call
      setError('Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    handleKeyDown(e);
  };

  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat' as const,
    backgroundPosition: 'right 1rem center',
    paddingRight: '2.5rem',
  };

  if (!isExpanded) {
    return (
      <div className="pt-2">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-primary transition-colors px-1 py-2"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add Task</span>
        </button>
      </div>
    );
  }

  return (
    <div className="pt-2" onKeyDown={handleKeyDown}>
      <div className="border border-zinc-200 rounded-lg bg-white shadow-sm p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-zinc-900 mb-1.5">
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            ref={titleRef}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={handleTitleKeyDown}
            placeholder="Task title..."
            className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-all"
          />
          {error && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-zinc-900 mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Optional description..."
            rows={2}
            maxLength={5000}
            className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg bg-white text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-all resize-none"
          />
        </div>

        {/* Assignee & Due Date row */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-zinc-900 mb-1.5">
              Assignee
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!teamMembers.length}
              className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg bg-white text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={selectStyle}
            >
              <option value="">
                {teamMembers.length ? 'Unassigned' : 'No team members'}
              </option>
              {teamMembers.some(m => m.id === userId) && (
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
            <label className="block text-sm font-semibold text-zinc-900 mb-1.5">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg bg-white text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="default"
            className="px-5 shadow-sm"
          >
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </Button>
          <button
            onClick={handleCancel}
            className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
