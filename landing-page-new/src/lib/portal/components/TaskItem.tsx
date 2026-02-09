'use client';

import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { Task, TaskStatus, UserRole, Comment, User } from '@/lib/portal/types';
import { AppContext } from '@/lib/portal/AppContext';
import Badge from './ui/Badge';
import Button from './ui/Button';
import RevisionModal from './RevisionModal';
import CompletionAnimation from './ui/CompletionAnimation';
import { timeAgo, formatDeadline, formatTimestamp, formatDateTime } from '@/lib/portal/utils/dateUtils';
import { filterUsersByMentionQuery, renderMentionedText } from '@/lib/portal/utils/mention-utils';

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete?: (taskId: string) => void;
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

const TaskItem: React.FC<TaskItemProps> = ({ task, onEdit, onDelete }) => {
  const { project, currentUser, updateTaskStatus, addComment, editComment } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');

  // @mention autocomplete state
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const prevStatus = usePrevious(task.status);

  useEffect(() => {
    if (prevStatus && prevStatus !== TaskStatus.COMPLETED && task.status === TaskStatus.COMPLETED) {
      setShowCompletionAnimation(true);
      const timer = setTimeout(() => setShowCompletionAnimation(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [task.status, prevStatus]);


  const isPrimaryContact = currentUser?.role === UserRole.PRIMARY_CONTACT;
  const isInternalUser = currentUser?.role === UserRole.MOTIONIFY_MEMBER || currentUser?.role === UserRole.SUPPORT;

  const deliverable = project?.scope.deliverables.find(d => d.id === task.deliverableId);

  const assignee = useMemo(() => {
    if (!task.assigneeId || !project) return null;
    return [...project.clientTeam, ...project.motionifyTeam].find(u => u.id === task.assigneeId);
  }, [task.assigneeId, project]);

  const creator = useMemo(() => {
    if (!task.createdBy || !project) return null;
    return [...project.clientTeam, ...project.motionifyTeam].find(u => u.id === task.createdBy);
  }, [task.createdBy, project]);

  const canCompletePendingTask = useMemo(() => {
    if (task.status !== TaskStatus.PENDING) {
      return true;
    }
    if (!project) return false;
    const motionifyTeamIds = new Set(project.motionifyTeam.map(u => u.id));
    return task.comments.some(comment => motionifyTeamIds.has(comment.userId));
  }, [task.status, task.comments, project]);

  // All project users for @mention autocomplete
  const projectUsers = useMemo(() => {
    if (!project) return [];
    return [...project.clientTeam, ...project.motionifyTeam];
  }, [project]);

  // Filtered users for mention dropdown
  const filteredMentionUsers = useMemo(() => {
    return filterUsersByMentionQuery(mentionQuery, projectUsers);
  }, [mentionQuery, projectUsers]);


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
      setShowMentionDropdown(false);
    }
  }

  // Handle @mention input detection
  const handleCommentInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setNewComment(value);

    // Look for @ symbol before cursor
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Check if there's a space between @ and cursor (no active mention)
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(' ') || textAfterAt.split(' ').length <= 2) {
        setMentionQuery(textAfterAt);
        setMentionStartIndex(lastAtIndex);
        setShowMentionDropdown(true);
        setSelectedMentionIndex(0);
        return;
      }
    }

    setShowMentionDropdown(false);
  };

  // Handle selecting a user from mention dropdown
  const handleMentionSelect = (user: User) => {
    if (mentionStartIndex === -1) return;

    const beforeMention = newComment.slice(0, mentionStartIndex);
    const afterCursor = newComment.slice(mentionStartIndex + 1 + mentionQuery.length);
    const newValue = `${beforeMention}@${user.name} ${afterCursor}`;

    setNewComment(newValue);
    setShowMentionDropdown(false);
    setMentionQuery('');
    setMentionStartIndex(-1);

    // Focus back on input
    commentInputRef.current?.focus();
  };

  // Handle keyboard navigation in mention dropdown
  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentionDropdown || filteredMentionUsers.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedMentionIndex(prev =>
        prev < filteredMentionUsers.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedMentionIndex(prev =>
        prev > 0 ? prev - 1 : filteredMentionUsers.length - 1
      );
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleMentionSelect(filteredMentionUsers[selectedMentionIndex]);
    } else if (e.key === 'Escape') {
      setShowMentionDropdown(false);
    }
  };

  const handleEditSave = () => {
    if (editingCommentId && editingCommentContent.trim()) {
      editComment(task.id, editingCommentId, editingCommentContent.trim());
      setEditingCommentId(null);
      setEditingCommentContent('');
    }
  };

  const handleEditCancel = () => {
    setEditingCommentId(null);
    setEditingCommentContent('');
  };

  const formattedDeadline = task.deadline
    ? new Date(task.deadline + 'T00:00:00').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : null;

  const renderActions = () => {
    const isTaskCreator = currentUser?.id === task.createdBy;

    if (isPrimaryContact && task.status === TaskStatus.AWAITING_APPROVAL) {
      return (
        <div className="flex space-x-2">
          <Button onClick={handleApprove} variant="primary">Approve</Button>
          <Button onClick={handleRequestRevision} variant="secondary">Request Revision</Button>
          {isTaskCreator && (
            <>
              <Button onClick={() => onEdit(task)} variant="secondary">Edit</Button>
              {onDelete && <Button onClick={() => onDelete(task.id)} variant="destructive">Delete</Button>}
            </>
          )}
        </div>
      );
    }

    if (isInternalUser) {
      return (
        <div className="flex space-x-2">
          <Button onClick={() => onEdit(task)} variant="secondary">Edit</Button>
          {onDelete && <Button onClick={() => onDelete(task.id)} variant="destructive">Delete</Button>}
        </div>
      );
    }

    if (isTaskCreator) {
      return (
        <div className="flex space-x-2">
          <Button onClick={() => onEdit(task)} variant="secondary">Edit</Button>
          {onDelete && <Button onClick={() => onDelete(task.id)} variant="destructive">Delete</Button>}
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
              {creator && (
                <div className="flex items-center font-medium text-[var(--todoist-gray-500)]" title={`Created by ${creator.name}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span className="text-xs">By {creator.name.split(' ')[0]}</span>
                </div>
              )}
              {task.updatedAt && task.updatedAt !== task.createdAt && (
                <div className="flex items-center font-medium text-[var(--todoist-gray-500)]" title={formatDateTime(task.updatedAt) || undefined}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs">Updated {formatTimestamp(task.updatedAt)}</span>
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

        {/* Comments Section - Made Prominent */}
        <div className="mt-3 pt-3 border-t border-[var(--todoist-gray-200)]">
          <button
            onClick={() => setIsCommentsVisible(!isCommentsVisible)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${isCommentsVisible
                ? 'bg-[var(--todoist-blue)] text-white shadow-md'
                : 'bg-[var(--todoist-blue-light)] text-[var(--todoist-blue)] hover:bg-[var(--todoist-blue)] hover:text-white'
              }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>{isCommentsVisible ? 'Hide Comments' : 'Show Comments'}</span>
            {task.comments.length > 0 && (
              <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${isCommentsVisible
                  ? 'bg-white text-[var(--todoist-blue)]'
                  : 'bg-[var(--todoist-blue)] text-white'
                }`}>
                {task.comments.length}
              </span>
            )}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 transition-transform duration-200 ${isCommentsVisible ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isCommentsVisible && (
            <div className="mt-3 space-y-4">
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {task.comments.length > 0 ? task.comments.map(comment => {
                  const isOwnComment = currentUser?.id === comment.userId;
                  const timeSincePosted = Date.now() - comment.timestamp;
                  const oneHourMs = 60 * 60 * 1000;
                  const canEdit = isOwnComment && timeSincePosted < oneHourMs;
                  const isEditing = editingCommentId === comment.id;

                  return (
                    <div key={comment.id} className="text-sm bg-white/5 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-white">{comment.userName}</p>
                          <p className="text-xs text-white/40">{timeAgo(comment.timestamp)}</p>
                          {comment.editedAt && (
                            <span className="text-xs text-white/30 italic">(Edited)</span>
                          )}
                        </div>
                        {canEdit && !isEditing && (
                          <button
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditingCommentContent(comment.content);
                            }}
                            className="text-xs text-white/50 hover:text-white/80 transition-colors"
                          >
                            Edit
                          </button>
                        )}
                        {!canEdit && isOwnComment && !isEditing && (
                          <span
                            className="text-xs text-white/30 cursor-not-allowed"
                            title="Comments can only be edited within 1 hour"
                          >
                            Edit
                          </span>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={editingCommentContent}
                            onChange={(e) => setEditingCommentContent(e.target.value)}
                            className="w-full text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 px-3 py-2"
                            rows={2}
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={handleEditSave}
                              className="text-xs px-3 py-1 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleEditCancel}
                              className="text-xs px-3 py-1 bg-white/10 text-white/70 rounded hover:bg-white/20 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-white/70 whitespace-pre-wrap">{renderMentionedText(comment.content, projectUsers)}</p>
                      )}
                    </div>
                  );
                }) : (
                  <p className="text-sm text-white/60">No comments yet.</p>
                )}
              </div>

              <form onSubmit={handleCommentSubmit} className="relative">
                <div className="flex items-start space-x-2">
                  <div className="relative flex-1">
                    <textarea
                      ref={commentInputRef}
                      value={newComment}
                      onChange={handleCommentInputChange}
                      onKeyDown={handleCommentKeyDown}
                      placeholder="Add a comment... (type @ to mention someone)"
                      rows={2}
                      className="mt-1 block w-full shadow-sm sm:text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 px-3 py-2"
                      required
                    />
                    {showMentionDropdown && filteredMentionUsers.length > 0 && (
                      <div className="absolute left-0 right-0 bottom-full mb-1 bg-gray-800 border border-white/20 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
                        {filteredMentionUsers.slice(0, 5).map((user, index) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleMentionSelect(user)}
                            className={`w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 flex items-center gap-2 ${index === selectedMentionIndex ? 'bg-cyan-500/20' : ''
                              }`}
                          >
                            <span className="w-6 h-6 bg-cyan-500/30 rounded-full flex items-center justify-center text-xs font-semibold">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                            <span>{user.name}</span>
                            <span className="text-white/40 text-xs">({user.role})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button type="submit" className="flex-shrink-0 mt-1">Post</Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {isInternalUser && !task.visibleToClient && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-xs font-semibold text-amber-500">Internal</span>
          </div>
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
