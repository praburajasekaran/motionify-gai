'use client';

import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { Task, TaskStatus, UserRole, Comment } from '@/lib/portal/types';
import { AppContext } from '@/lib/portal/AppContext';
import Badge from './ui/Badge';
import Button from './ui/Button';
import RevisionModal from './RevisionModal';
import CompletionAnimation from './ui/CompletionAnimation';
import { timeAgo, formatDeadline } from '@/lib/portal/utils/dateUtils';

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
}

const usePrevious = <T,>(value: T): T | undefined => {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

const getStatusSelectClasses = (status: TaskStatus) => {
    // Todoist-style status selector: flat colors, no transparency
    const baseClasses = "appearance-none text-xs font-medium rounded border px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--todoist-red)] cursor-pointer";
    const statusColors: Record<TaskStatus, string> = {
        [TaskStatus.PENDING]: 'bg-[var(--todoist-gray-100)] text-[var(--todoist-gray-700)] border-[var(--todoist-gray-300)]',
        [TaskStatus.IN_PROGRESS]: 'bg-[var(--todoist-blue-light)] text-[var(--todoist-blue)] border-[var(--todoist-blue)]',
        [TaskStatus.AWAITING_APPROVAL]: 'bg-[var(--todoist-orange-light)] text-[var(--todoist-orange)] border-[var(--todoist-orange)]',
        [TaskStatus.REVISION_REQUESTED]: 'bg-[var(--todoist-red-light)] text-[var(--todoist-red)] border-[var(--todoist-red)]',
        [TaskStatus.COMPLETED]: 'bg-[var(--todoist-green-light)] text-[var(--todoist-green)] border-[var(--todoist-green)]',
    };
    return `${baseClasses} ${statusColors[status]}`;
}

// Todoist uses simple colored left borders for priority/status
const statusBorderColors: Record<TaskStatus, string> = {
    [TaskStatus.PENDING]: 'border-l-[var(--todoist-gray-400)]',
    [TaskStatus.IN_PROGRESS]: 'border-l-[var(--todoist-blue)]',
    [TaskStatus.AWAITING_APPROVAL]: 'border-l-[var(--todoist-orange)]',
    [TaskStatus.REVISION_REQUESTED]: 'border-l-[var(--todoist-red)]',
    [TaskStatus.COMPLETED]: 'border-l-[var(--todoist-green)]',
};

const TaskItem: React.FC<TaskItemProps> = ({ task, onEdit }) => {
  const { project, currentUser, updateTaskStatus, addComment } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);
  const [newComment, setNewComment] = useState('');

  const prevStatus = usePrevious(task.status);
  
  useEffect(() => {
    if (prevStatus && prevStatus !== TaskStatus.COMPLETED && task.status === TaskStatus.COMPLETED) {
      setShowCompletionAnimation(true);
      const timer = setTimeout(() => setShowCompletionAnimation(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [task.status, prevStatus]);

  
  const isPrimaryContact = currentUser?.role === UserRole.PRIMARY_CONTACT;
  const isInternalUser = currentUser?.role === UserRole.MOTIONIFY_MEMBER || currentUser?.role === UserRole.PROJECT_MANAGER;

  const deliverable = project?.scope.deliverables.find(d => d.id === task.deliverableId);
  
  const assignee = useMemo(() => {
    if (!task.assigneeId || !project) return null;
    return [...project.clientTeam, ...project.motionifyTeam].find(u => u.id === task.assigneeId);
  }, [task.assigneeId, project]);
  
  const canCompletePendingTask = useMemo(() => {
    if (task.status !== TaskStatus.PENDING) {
        return true;
    }
    if (!project) return false;
    const motionifyTeamIds = new Set(project.motionifyTeam.map(u => u.id));
    return task.comments.some(comment => motionifyTeamIds.has(comment.userId));
  }, [task.status, task.comments, project]);


  const handleApprove = () => {
    updateTaskStatus(task.id, TaskStatus.COMPLETED);
  };

  const handleRequestRevision = () => {
    setIsModalOpen(true);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      addComment(task.id, newComment.trim());
      setNewComment('');
    }
  }

  const formattedDeadline = task.deadline
    ? new Date(task.deadline + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const renderActions = () => {
    if (isPrimaryContact && task.status === TaskStatus.AWAITING_APPROVAL) {
      return (
        <div className="flex space-x-2">
          <Button onClick={handleApprove} variant="primary">Approve</Button>
          <Button onClick={handleRequestRevision} variant="secondary">Request Revision</Button>
        </div>
      );
    }

    if (isInternalUser) {
      return (
        <div className="flex space-x-2">
            <Button onClick={() => onEdit(task)} variant="secondary">Edit</Button>
        </div>
      );
    }

    return null;
  };
  
  // Todoist-style: white card with colored left border, subtle shadow
  const taskItemBg = task.status === TaskStatus.COMPLETED
    ? 'bg-[var(--todoist-gray-50)] opacity-80'
    : 'bg-[var(--todoist-white)]';

  return (
    <>
      <div className={`relative p-4 border-l-4 rounded-lg border border-[var(--todoist-gray-200)] shadow-[var(--shadow-card)] transition-all duration-200 hover:border-[var(--todoist-gray-300)] ${taskItemBg} ${statusBorderColors[task.status]}`}>
        {showCompletionAnimation && <CompletionAnimation />}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center">
          <div>
            <div className="flex items-center gap-3">
               <h4 className="font-semibold text-[var(--todoist-gray-900)]">{task.title}</h4>
                {isInternalUser ? (
                    <select
                        value={task.status}
                        onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                        className={getStatusSelectClasses(task.status)}
                        aria-label="Task status"
                    >
                        {Object.values(TaskStatus).map(status => {
                            const isDisabled =
                                task.status === TaskStatus.PENDING &&
                                status === TaskStatus.COMPLETED &&
                                !canCompletePendingTask;

                            return (
                                <option
                                    key={status}
                                    value={status}
                                    disabled={isDisabled}
                                    title={isDisabled ? "A comment from a Motionify team member is required to complete a pending task." : ""}
                                >
                                    {status}
                                </option>
                            );
                        })}
                    </select>
                ) : (
                    <Badge status={task.status} />
                )}
            </div>
            <p className="mt-1 text-sm text-[var(--todoist-gray-600)]">{task.description}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs">
              {deliverable && (
                <p className="font-medium text-[var(--todoist-gray-500)]">
                  Relates to: <span className="font-medium text-[var(--todoist-red)]">{deliverable.name}</span>
                </p>
              )}
              {formattedDeadline && (
                <div className="flex items-center font-medium text-[var(--todoist-gray-500)]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{formattedDeadline}</span>
                </div>
              )}
              {assignee && (
                <div className="flex items-center font-medium text-[var(--todoist-gray-500)]">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>{assignee.name}</span>
                </div>
              )}
            </div>
            {task.delivery && (
              <p className="mt-2 text-sm text-[var(--todoist-red)]">
                <strong>Delivery:</strong> {task.delivery}
              </p>
            )}
          </div>
          <div className="mt-4 sm:mt-0 flex-shrink-0">
            {renderActions()}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[var(--todoist-gray-200)]">
          <button onClick={() => setIsCommentsVisible(!isCommentsVisible)} className="flex items-center text-sm font-medium text-[var(--todoist-gray-700)] hover:text-[var(--todoist-red)] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Comments ({task.comments.length})</span>
          </button>

          {isCommentsVisible && (
            <div className="mt-3 space-y-4">
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {task.comments.length > 0 ? task.comments.map(comment => (
                  <div key={comment.id} className="text-sm bg-white/5 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <p className="font-semibold text-white">{comment.userName}</p>
                      <p className="text-xs text-white/40">{timeAgo(comment.timestamp)}</p>
                    </div>
                    <p className="mt-1 text-white/70 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                )) : (
                  <p className="text-sm text-white/60">No comments yet.</p>
                )}
              </div>

              <form onSubmit={handleCommentSubmit} className="flex items-start space-x-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  className="mt-1 block w-full shadow-sm sm:text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 px-3 py-2"
                  required
                />
                <Button type="submit" className="flex-shrink-0 mt-1">Post</Button>
              </form>
            </div>
          )}
        </div>

        {isInternalUser && !task.visibleToClient && (
          <p className="text-xs text-yellow-400 mt-2 font-semibold">Not visible to client</p>
        )}
      </div>
      <RevisionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        taskId={task.id}
      />
    </>
  );
};

export default TaskItem;
