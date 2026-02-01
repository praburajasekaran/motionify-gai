'use client';

import React, { useContext, useMemo, useState, useRef, useEffect } from 'react';
import { AppContext } from '@/lib/portal/AppContext';
import { UserRole, TaskStatus, Task, Deliverable } from '@/lib/portal/types';
import Card from './ui/Card';
import TaskItem from './TaskItem';
import Button from './ui/Button';
import TaskModal from './CreateTaskModal';
import { parseTaskInput } from '@/lib/portal/utils/taskParser';

interface TaskListProps {
  focusedDeliverableId: string | null;
  setFocusedDeliverableId: (id: string | null) => void;
}

const statusOrder: TaskStatus[] = [
  TaskStatus.AWAITING_APPROVAL,
  TaskStatus.REVISION_REQUESTED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.PENDING,
  TaskStatus.COMPLETED,
];

const TaskList = ({ focusedDeliverableId, setFocusedDeliverableId }: TaskListProps) => {
  const { project, currentUser, addTask, deleteTask } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterMyTasks, setFilterMyTasks] = useState(false);
  const [quickAddInput, setQuickAddInput] = useState('');
  const deliverableRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // Fix Bug #10: Scroll timing race condition
  // Use requestAnimationFrame to retry until element ref is populated
  useEffect(() => {
    if (!focusedDeliverableId) return;

    let animationFrameId: number;
    let retryCount = 0;
    const maxRetries = 60; // Try for ~1 second (60 frames at 60fps)

    const attemptScroll = () => {
      const element = deliverableRefs.current.get(focusedDeliverableId);

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        element.classList.add('highlight-animation');
        const timer = setTimeout(() => {
          element.classList.remove('highlight-animation');
          setFocusedDeliverableId(null);
        }, 1500);
        return () => clearTimeout(timer);
      } else if (retryCount < maxRetries) {
        // Retry on next frame if element not ready yet
        retryCount++;
        animationFrameId = requestAnimationFrame(attemptScroll);
      } else {
        // Give up after max retries - element doesn't exist
        console.warn(`Could not find deliverable element: ${focusedDeliverableId}`);
        setFocusedDeliverableId(null);
      }
    };

    // Start the scroll attempt
    animationFrameId = requestAnimationFrame(attemptScroll);

    // Cleanup on unmount or when focusedDeliverableId changes
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [focusedDeliverableId, setFocusedDeliverableId]);

  // Helper to check if a role is a client role
  const isClientRole = (role: string) => {
    const clientRoleValues = [UserRole.PRIMARY_CONTACT, UserRole.TEAM_MEMBER, 'client', 'client_primary', 'client_team'];
    return clientRoleValues.includes(role as UserRole);
  };

  const visibleTasks = useMemo(() => {
    if (!project || !currentUser) return [];

    const isInternal = currentUser.role && !isClientRole(currentUser.role);

    let tasks = isInternal
      ? project.tasks
      : project.tasks.filter(task => task.visibleToClient);

    if (filterMyTasks) {
      tasks = tasks.filter(task => task.assigneeId === currentUser.id);
    }

    return tasks;
  }, [project, currentUser, filterMyTasks]);

  const tasksByDeliverable = useMemo(() => {
    if (!project) return [];

    const deliverableMap = new Map<string, Deliverable>(
      project.scope.deliverables.map(d => [d.id, d])
    );
    deliverableMap.set('general', { id: 'general', name: 'General Tasks' });

    const grouped = new Map<string, Deliverable & { tasks: Task[] }>();
    for (const task of visibleTasks) {
      const deliverableId = task.deliverableId || 'general';
      if (!grouped.has(deliverableId)) {
        grouped.set(deliverableId, {
          ...deliverableMap.get(deliverableId)!,
          tasks: [],
        });
      }
      grouped.get(deliverableId)!.tasks.push(task);
    }

    return Array.from(grouped.values()).filter(group => group.tasks.length > 0);
  }, [visibleTasks, project]);

  const handleAddTaskClick = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }
    deleteTask(taskId);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const isInternalUser = currentUser?.role && !isClientRole(currentUser.role);
  const isClientUser = currentUser?.role && isClientRole(currentUser.role);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddInput.trim() || !project) return;

    // Clients don't get assignee parsing
    const allMembers = isClientUser ? [] : [...project.clientTeam, ...project.motionifyTeam];
    const parsed = parseTaskInput(quickAddInput, allMembers);

    addTask({
      title: parsed.title,
      description: parsed.title, // Use title as description for quick add
      visibleToClient: true, // Default to visible
      assigneeId: isClientUser ? undefined : parsed.assigneeId,
      deadline: parsed.deadline,
    });

    setQuickAddInput('');
  };

  if (!project) {
    return (
      <Card title="Tasks">
        <p className="text-white/60">No project selected.</p>
      </Card>
    );
  }

  const headerActions = (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center">
        <label htmlFor="my-tasks-toggle" className="text-sm font-medium text-white/70 mr-2 whitespace-nowrap">
          My tasks only
        </label>
        <button
          type="button"
          className={`${filterMyTasks ? 'bg-gradient-to-r from-cyan-500 to-blue-600' : 'bg-white/10 backdrop-blur'
            } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-all ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-cyan-500`}
          role="switch"
          aria-checked={filterMyTasks}
          onClick={() => setFilterMyTasks(!filterMyTasks)}
          id="my-tasks-toggle"
        >
          <span className="sr-only">Show my tasks only</span>
          <span
            aria-hidden="true"
            className={`${filterMyTasks ? 'translate-x-5' : 'translate-x-0'
              } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform ring-0 transition ease-in-out duration-200`}
          />
        </button>
      </div>
      <Button onClick={handleAddTaskClick}>Add Task</Button>
    </div>
  );

  return (
    <>
      <Card title="Tasks" headerActions={headerActions}>
        {/* Quick-add form - visible to all authenticated users */}
        <div className="mb-6">
          <form onSubmit={handleQuickAdd} className="relative">
            <input
              type="text"
              value={quickAddInput}
              onChange={(e) => setQuickAddInput(e.target.value)}
              placeholder={isClientUser ? "Add a task..." : "Quick add task: Fix bug @john tomorrow..."}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-4 pr-12 py-3 text-white placeholder-white/40 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              disabled={!quickAddInput.trim()}
              className="absolute right-2 top-2 p-1.5 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </form>
          {!isClientUser && (
            <p className="text-xs text-white/40 mt-2 ml-1">
              Tip: Use <strong>@name</strong> to assign and words like <strong>tomorrow</strong> for deadlines.
            </p>
          )}
        </div>

        {visibleTasks.length > 0 ? (
          <div className="space-y-8">
            {tasksByDeliverable.map(group => {
              const sortedTasks = [...group.tasks].sort((a, b) => {
                return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
              });

              return (
                <div
                  key={group.id}
                  ref={el => { deliverableRefs.current.set(group.id, el); }}
                  className="rounded-lg p-1"
                >
                  <h3 className="text-xl font-semibold text-white mb-4 px-2">{group.name}</h3>
                  <div className="space-y-4">
                    {sortedTasks.map(task => (
                      <TaskItem key={task.id} task={task} onEdit={handleEditTask} onDelete={handleDeleteTask} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-white/60">
            {filterMyTasks ? "You have no tasks assigned to you." : "No tasks to display at the moment."}
          </p>
        )}
      </Card>
      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        taskToEdit={editingTask}
      />
    </>
  );
};

export default TaskList;

