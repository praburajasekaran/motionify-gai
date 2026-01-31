import React, { useState, useRef, useEffect } from 'react';
import { PlusCircle, X } from 'lucide-react';
import { User, Task, UserRole } from '@/types';
import { Button, Input, Textarea } from '@/components/ui/design-system';
import { createTask } from '@/services/taskApi';

interface TaskCreateFormProps {
  projectId: string;
  teamMembers: User[];
  onTaskCreated: (task: Task) => void;
  userId: string;
  userName: string;
  userRole: UserRole;
}

interface TaskEditFormProps {
  task: Task;
  teamMembers: User[];
  onSave: (taskId: string, updates: Partial<Task>) => void;
  onCancel: () => void;
  userId: string;
  userName: string;
  userRole: UserRole;
}

// Shared form fields rendered by both create and edit
function TaskFormFields({
  title,
  setTitle,
  description,
  setDescription,
  assigneeId,
  setAssigneeId,
  dueDate,
  setDueDate,
  status,
  setStatus,
  visibleToClient,
  setVisibleToClient,
  teamMembers,
  userId,
  userName,
  userRole,
  error,
  setError,
  titleRef,
  handleKeyDown,
  handleTitleKeyDown,
  showStatusField,
  showVisibilityField,
  showAssigneeField = true,
}: {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  assigneeId: string;
  setAssigneeId: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  status?: string;
  setStatus?: (v: string) => void;
  visibleToClient?: boolean;
  setVisibleToClient?: (v: boolean) => void;
  teamMembers: User[];
  userId: string;
  userName: string;
  userRole: UserRole;
  error: string;
  setError: (v: string) => void;
  titleRef: React.RefObject<HTMLInputElement | null>;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleTitleKeyDown: (e: React.KeyboardEvent) => void;
  showStatusField: boolean;
  showVisibilityField: boolean;
  showAssigneeField?: boolean;
}) {
  const isClientRole = userRole === 'client';
  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat' as const,
    backgroundPosition: 'right 1rem center',
    paddingRight: '2.5rem',
  };

  const statusOptions = [
    { value: 'pending', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'awaiting_approval', label: 'Awaiting Approval' },
    { value: 'completed', label: 'Completed' },
    { value: 'revision_requested', label: 'Revision Requested' },
  ];

  return (
    <>
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
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Optional description..."
          rows={2}
          maxLength={5000}
          className="resize-none"
        />
      </div>

      {/* Status (edit mode only) */}
      {showStatusField && status !== undefined && setStatus && (
        <div>
          <label className="block text-sm font-semibold text-zinc-900 mb-1.5">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg bg-white text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-all appearance-none cursor-pointer"
            style={selectStyle}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Assignee & Due Date row */}
      <div className="flex gap-4">
        {showAssigneeField && (
          <div className="flex-1">
            <label className="block text-sm font-semibold text-zinc-900 mb-1.5">
              Assignee
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg bg-white text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-all appearance-none cursor-pointer"
              style={selectStyle}
            >
              <option value="">Unassigned</option>
              <option value={userId}>
                {teamMembers.find(m => m.id === userId)?.name || userName} (me)
              </option>
              {!isClientRole && teamMembers
                .filter(m => m.id !== userId)
                .map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
            </select>
          </div>
        )}

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

      {/* Visible to Client (edit mode only) */}
      {showVisibilityField && visibleToClient !== undefined && setVisibleToClient && (
        <>
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
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${visibleToClient ? 'bg-primary' : 'bg-zinc-300'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${visibleToClient ? 'translate-x-6' : 'translate-x-1'}`}
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
        </>
      )}
    </>
  );
}

// --- Create Form ---
export const TaskCreateForm: React.FC<TaskCreateFormProps> = ({
  projectId,
  teamMembers,
  onTaskCreated,
  userId,
  userName,
  userRole,
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
      titleRef.current?.focus();
    } catch (err) {
      console.error('Failed to create task:', err);
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
        <TaskFormFields
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          assigneeId={assigneeId}
          setAssigneeId={setAssigneeId}
          dueDate={dueDate}
          setDueDate={setDueDate}
          teamMembers={teamMembers}
          userId={userId}
          userName={userName}
          userRole={userRole}
          error={error}
          setError={setError}
          titleRef={titleRef}
          handleKeyDown={handleKeyDown}
          handleTitleKeyDown={handleTitleKeyDown}
          showStatusField={false}
          showVisibilityField={false}
        />

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

// --- Edit Form (inline, replaces the task row) ---
export const TaskEditForm: React.FC<TaskEditFormProps> = ({
  task,
  teamMembers,
  onSave,
  onCancel,
  userId,
  userName,
  userRole,
}) => {
  const isClientEditor = userRole === 'client';
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status as string);
  const [assigneeId, setAssigneeId] = useState(task.assignee?.id || task.assigneeId || '');
  const [dueDate, setDueDate] = useState(task.deadline ? task.deadline.split('T')[0] : '');
  const [visibleToClient, setVisibleToClient] = useState(task.visibleToClient ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await onSave(task.id, {
        title: trimmedTitle,
        description: description.trim() || undefined,
        status: status as Task['status'],
        assigneeId: assigneeId || undefined,
        assignee: assigneeId ? teamMembers.find(m => m.id === assigneeId) : undefined,
        deadline: dueDate || undefined,
        visibleToClient,
      });
    } catch (err) {
      console.error('Failed to update task:', err);
      setError('Failed to update task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    handleKeyDown(e);
  };

  return (
    <div onKeyDown={handleKeyDown}>
      <div className="border border-primary/30 rounded-lg bg-white shadow-md ring-1 ring-primary/10 p-4 space-y-4">
        <TaskFormFields
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          assigneeId={assigneeId}
          setAssigneeId={setAssigneeId}
          dueDate={dueDate}
          setDueDate={setDueDate}
          status={status}
          setStatus={setStatus}
          visibleToClient={visibleToClient}
          setVisibleToClient={setVisibleToClient}
          teamMembers={teamMembers}
          userId={userId}
          userName={userName}
          userRole={userRole}
          error={error}
          setError={setError}
          titleRef={titleRef}
          handleKeyDown={handleKeyDown}
          handleTitleKeyDown={handleTitleKeyDown}
          showStatusField={true}
          showVisibilityField={!isClientEditor}
          showAssigneeField={!isClientEditor}
        />

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="default"
            className="px-5 shadow-sm"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
          <button
            onClick={onCancel}
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
