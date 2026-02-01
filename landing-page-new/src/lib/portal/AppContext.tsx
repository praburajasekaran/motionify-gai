import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Project, User, UserRole, TaskStatus, Task, Comment, ProjectFile, ProjectStatus, Client, Deliverable, Notification, Milestone } from './types';
// Mock data removed - using API data only
import {
  generateNotificationId,
  generateUserId,
  generateTaskId,
  generateCommentId,
  generateFileCommentId,
  generateFileId,
  generateProjectId,
} from './utils/idGenerator';
import {
  getValidatedLocalStorageItem,
  isValidUser
} from './utils/validation';
import {
  createTaskStatusChangedActivity,
  createTaskCreatedActivity,
  createTaskUpdatedActivity,
  createFileRenamedActivity,
  createTeamMemberRemovedActivity,
} from './utils/activityLogger';
import { isValidTransition } from './utils/taskStateTransitions';
import { useAuth } from '@/context/AuthContext';
import {
  fetchTasksForProject,
  createTask,
  updateTaskAPI,
  addTaskComment,
  deleteTaskAPI
} from './api/tasks.api';
import { fetchProjects } from './api/projects.api';
import { createActivity } from './api/activities.api';

type AddTaskData = {
  title: string;
  description: string;
  visibleToClient: boolean;
  deliverableId?: string;
  deadline?: string;
  assigneeId?: string;
};

type UpdateTaskData = AddTaskData;

type AddFileData = {
  name: string;
  size: number;
  type: string;
  deliverableId?: string;
  description?: string;
};

export const AppContext = React.createContext<{
  project: Project | null;
  projects: Project[];
  currentUser: User | null;
  notifications: Notification[];
  allMotionifyUsers: User[];
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  requestRevision: (taskId: string, details: string) => void;
  addTeamMember: (name: string, email: string) => void;
  removeClientTeamMember: (userId: string) => void;
  addTask: (taskData: AddTaskData) => void;
  deleteTask: (taskId: string) => void;
  updateTask: (taskId: string, taskData: UpdateTaskData) => void;
  addRevision: (projectId: string) => void;
  markNotificationsAsRead: () => void;
  markNotificationAsRead: (notificationId: string) => void;
  addComment: (taskId: string, content: string) => void;
  editComment: (taskId: string, commentId: string, content: string) => boolean;
  addFile: (fileData: AddFileData) => void;
  updateMotionifyTeam: (memberIds: string[]) => void;
  renameFile: (fileId: string, newName: string) => { success: boolean; error?: string };
  addFileComment: (fileId: string, content: string) => void;
  updateProjectStatus: (projectId: string, status: ProjectStatus) => void;
  addProject: (data: { name: string; client: Client; scope: { deliverables: Deliverable[]; nonInclusions: string[] }; totalRevisions: number }) => void;
  deleteFile: (fileId: string) => void;
  addFiles: (filesData: AddFileData[]) => void;
  isLoading: boolean;
  logout: () => void;
}>({
  project: null,
  projects: [],
  currentUser: null,
  notifications: [],
  allMotionifyUsers: [],
  updateTaskStatus: () => { },
  requestRevision: () => { },
  addTeamMember: () => { },
  removeClientTeamMember: () => { },
  addTask: () => { },
  deleteTask: () => { },
  updateTask: () => { },
  addRevision: () => { },
  markNotificationsAsRead: () => { },
  markNotificationAsRead: () => { },
  addComment: () => { },
  editComment: () => false,
  addFile: () => { },
  updateMotionifyTeam: () => { },
  renameFile: () => ({ success: false }),
  addFileComment: () => { },
  updateProjectStatus: () => { },
  addProject: () => { },
  deleteFile: () => { },
  addFiles: () => { },
  isLoading: true,
  logout: () => { },
});

export function AppProvider({ children, selectedProjectId }: { children: React.ReactNode; selectedProjectId?: string | null }) {
  const [projectsData, setProjectsData] = useState<Project[]>([]);
  const { user: authUser, isLoading: isAuthLoading, logout: authLogout } = useAuth();

  // Map AuthUser to legacy User type
  const currentUser = useMemo(() => {
    console.log('[AppContext] Computing currentUser from authUser:', authUser);
    if (!authUser) return null;

    let role = UserRole.TEAM_MEMBER;
    if (authUser.role === 'client') role = UserRole.PRIMARY_CONTACT;
    else if (authUser.role === 'project_manager') role = UserRole.PROJECT_MANAGER;
    else if (authUser.role === 'admin' || authUser.role === 'super_admin') role = UserRole.MOTIONIFY_MEMBER;

    const user = {
      id: authUser.id,
      name: authUser.fullName || authUser.email || 'User',
      email: authUser.email,
      role,
      hasAgreed: true // Assuming true for now as it's not in AuthUser
    };
    console.log('[AppContext] currentUser computed:', user);
    return user;
  }, [authUser]);

  const [projectId, setProjectId] = useState<string | null>(selectedProjectId || null);
  const [notifications, setNotifications] = useState<Notification[]>([]); // Loaded from API via NotificationContext


  const selectedProject = useMemo(() =>
    projectsData.find(p => p.id === projectId),
    [projectsData, projectId]
  );

  const allMotionifyUsers = useMemo(() => {
    const allUsers = projectsData.flatMap(p => p.motionifyTeam);
    const uniqueUsers: User[] = Array.from(new Map<string, User>(allUsers.map(item => [item.id, item])).values());
    return uniqueUsers.filter(u => u.role === UserRole.MOTIONIFY_MEMBER || u.role === UserRole.PROJECT_MANAGER);
  }, [projectsData]);

  // Load tasks and activities from API when project is selected
  useEffect(() => {
    if (!projectId) return;

    const loadProjectData = async () => {
      try {
        const [tasks, activities] = await Promise.all([
          fetchTasksForProject(projectId, true),
          fetchActivities({ projectId, limit: 50 }),
        ]);

        setProjectsData(prevData =>
          prevData.map(p =>
            p.id === projectId ? { ...p, tasks, activities } : p
          )
        );
      } catch (error) {
        console.error('Failed to load project data:', error);
      }
    };

    loadProjectData();
  }, [projectId]);

  // Fetch projects from API when user is authenticated
  useEffect(() => {
    if (!currentUser) return;

    const loadProjects = async () => {
      console.log('[AppContext] Fetching projects for user:', currentUser.id);
      const result = await fetchProjects(currentUser.id);
      if (result.success && result.projects) {
        console.log('[AppContext] Loaded projects from API:', result.projects.length);
        setProjectsData(result.projects);
      } else {
        console.warn('[AppContext] Failed to load projects:', result.error);
      }
    };

    loadProjects();
  }, [currentUser]);

  // Update projectId when selectedProjectId prop changes or when localStorage changes
  useEffect(() => {
    if (selectedProjectId !== undefined && selectedProjectId !== null) {
      setProjectId(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Also check localStorage for projectId changes (for same-tab navigation)
  useEffect(() => {
    const checkProjectId = () => {
      const storedProjectId = localStorage.getItem('selectedProjectId');
      if (storedProjectId && storedProjectId !== projectId) {
        setProjectId(storedProjectId);
      }
    };

    // Check immediately
    checkProjectId();

    // Listen for storage events (cross-tab)
    window.addEventListener('storage', checkProjectId);

    // Also listen for custom storage events (same-tab)
    window.addEventListener('localStorageChange', checkProjectId);

    return () => {
      window.removeEventListener('storage', checkProjectId);
      window.removeEventListener('localStorageChange', checkProjectId);
    };
  }, [projectId]);

  // Auto-select project for client users when loaded from localStorage
  useEffect(() => {
    if (currentUser && (currentUser.role === UserRole.PRIMARY_CONTACT || currentUser.role === UserRole.TEAM_MEMBER) && !projectId) {
      const projectForUser = projectsData.find(p =>
        p.clientTeam.some(u => u.id === currentUser.id)
      );
      if (projectForUser) {
        setProjectId(projectForUser.id);
      }
    }
  }, [currentUser, projectsData, projectId]);

  const addNotification = (message: string, userId: string, projectId: string) => {
    const newNotification: Notification = {
      id: generateNotificationId(),
      message,
      userId,
      projectId,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const updateTaskStatus = useCallback((taskId: string, status: TaskStatus) => {
    if (!projectId || !currentUser) return;

    let updatedProject: Project | undefined;
    let updatedTask: Task | undefined;
    let oldStatus: TaskStatus | undefined;

    setProjectsData(prevData =>
      prevData.map(p => {
        if (p.id !== projectId) return p;

        const oldTask = p.tasks.find(t => t.id === taskId);
        oldStatus = oldTask?.status;

        if (oldStatus && !isValidTransition(oldStatus, status)) {
          console.warn(`Invalid state transition: ${oldStatus} -> ${status}`);
          return p;
        }

        const tasks = p.tasks.map(task =>
          task.id === taskId ? { ...task, status } : task
        );
        updatedTask = tasks.find(t => t.id === taskId);

        const activities = oldStatus && updatedTask
          ? [...p.activities, createTaskStatusChangedActivity(currentUser, updatedTask, oldStatus, status)]
          : p.activities;

        updatedProject = { ...p, tasks, activities };
        return updatedProject;
      })
    );

    // Persist activity to database
    if (oldStatus && updatedTask) {
      createActivity({
        type: 'TASK_STATUS_CHANGED',
        userId: currentUser.id,
        userName: currentUser.name,
        projectId,
        details: { taskId: updatedTask.id, taskTitle: updatedTask.title, oldStatus, newStatus: status },
      }).catch(err => console.error('Failed to log activity:', err));
    }

    if (updatedProject && updatedTask && status === TaskStatus.AWAITING_APPROVAL) {
      const primaryContact = updatedProject.clientTeam.find(u => u.role === UserRole.PRIMARY_CONTACT);
      if (primaryContact) {
        addNotification(`Task '${updatedTask.title}' is ready for your approval.`, primaryContact.id, updatedProject.id);
      }
    }
  }, [projectId, currentUser]);

  const requestRevision = useCallback((taskId: string, details: string) => {
    if (!projectId) return;

    let updatedProject: Project | undefined;
    let updatedTask: Task | undefined;
    let revisionAllowed = false;

    setProjectsData(prevData =>
      prevData.map(p => {
        if (p.id !== projectId) return p;

        if (p.usedRevisions >= p.totalRevisions) {
          console.warn(`Cannot request revision: ${p.usedRevisions}/${p.totalRevisions} revisions used`);
          return p;
        }

        revisionAllowed = true;
        const tasks = p.tasks.map(task =>
          task.id === taskId ? { ...task, status: TaskStatus.REVISION_REQUESTED } : task
        );
        updatedTask = tasks.find(t => t.id === taskId);
        updatedProject = { ...p, usedRevisions: p.usedRevisions + 1, tasks };
        return updatedProject;
      })
    );

    if (revisionAllowed && updatedProject && updatedTask) {
      const projectManager = updatedProject.motionifyTeam.find(u => u.role === UserRole.PROJECT_MANAGER);
      if (projectManager) {
        addNotification(`A revision was requested for task '${updatedTask.title}'.`, projectManager.id, updatedProject.id);
      }
    }
  }, [projectId]);

  const addTeamMember = useCallback((name: string, email: string) => {
    if (!projectId) return;
    setProjectsData(prevData =>
      prevData.map(p => {
        if (p.id !== projectId) return p;
        const newUser: User = {
          id: generateUserId('client'),
          name,
          email,
          role: UserRole.TEAM_MEMBER,
        };
        return { ...p, clientTeam: [...p.clientTeam, newUser] };
      })
    );
  }, [projectId]);

  const removeClientTeamMember = useCallback((userId: string) => {
    if (!projectId || !currentUser) return;

    setProjectsData(prevData =>
      prevData.map(p => {
        if (p.id !== projectId) return p;

        // Find the user being removed for activity logging
        const removedUser = p.clientTeam.find(u => u.id === userId);
        if (!removedUser) return p;

        // Prevent removing self
        if (removedUser.id === currentUser.id) {
          console.warn('Cannot remove self from project team');
          return p;
        }

        // Filter out the removed user
        const newClientTeam = p.clientTeam.filter(u => u.id !== userId);

        // Log activity
        const activity = createTeamMemberRemovedActivity(
          currentUser,
          removedUser.name,
          removedUser.email
        );

        // Persist activity to database
        createActivity({
          type: 'TEAM_MEMBER_REMOVED',
          userId: currentUser.id,
          userName: currentUser.name,
          projectId,
          details: { removedMemberName: removedUser.name, removedMemberEmail: removedUser.email },
        }).catch(err => console.error('Failed to log activity:', err));

        return {
          ...p,
          clientTeam: newClientTeam,
          activities: [activity, ...p.activities]
        };
      })
    );
  }, [projectId, currentUser]);

  const addTask = useCallback(async (taskData: AddTaskData) => {
    if (!projectId || !currentUser) return;

    try {
      // Call API to create task
      const newTask = await createTask({
        project_id: projectId,
        title: taskData.title,
        description: taskData.description,
        visible_to_client: taskData.visibleToClient,
        deliverable_id: taskData.deliverableId,
        assignee_id: taskData.assigneeId,
        deadline: taskData.deadline
      });

      let projectForNotification: Project | undefined;

      // Update local state with API response
      setProjectsData(prevData => prevData.map(p => {
        if (p.id !== projectId) return p;
        const activity = createTaskCreatedActivity(currentUser, newTask);
        projectForNotification = {
          ...p,
          tasks: [newTask, ...p.tasks],
          activities: [activity, ...p.activities]
        };
        return projectForNotification;
      }));

      // Persist activity to database
      createActivity({
        type: 'TASK_CREATED',
        userId: currentUser.id,
        userName: currentUser.name,
        projectId,
        details: { taskId: newTask.id, taskTitle: newTask.title },
      }).catch(err => console.error('Failed to log activity:', err));

      if (newTask.assigneeId && projectForNotification) {
        const allUsers = [...projectForNotification.clientTeam, ...projectForNotification.motionifyTeam];
        const assignee = allUsers.find(u => u.id === newTask.assigneeId);
        if (assignee) {
          addNotification(`You have been assigned a new task: '${newTask.title}'.`, assignee.id, projectForNotification.id);
        }
      }
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  }, [projectId, currentUser]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!projectId || !currentUser) return;

    try {
      await deleteTaskAPI(taskId);

      setProjectsData(prevData =>
        prevData.map(p => {
          if (p.id !== projectId) return p;
          return { ...p, tasks: p.tasks.filter(t => t.id !== taskId) };
        })
      );
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }, [projectId, currentUser]);

  const updateTask = useCallback(async (taskId: string, taskData: UpdateTaskData) => {
    if (!projectId || !currentUser) return;

    try {
      let originalTask: Task | undefined;

      // Get the original task before updating
      const project = projectsData.find(p => p.id === projectId);
      originalTask = project?.tasks.find(task => task.id === taskId);

      // Call API to update task
      const updatedTask = await updateTaskAPI(taskId, {
        title: taskData.title,
        description: taskData.description,
        visibleToClient: taskData.visibleToClient,
        deliverableId: taskData.deliverableId,
        assigneeId: taskData.assigneeId,
        deadline: taskData.deadline
      });

      let projectForNotification: Project | undefined;

      // Update local state with API response
      setProjectsData(prevData =>
        prevData.map(p => {
          if (p.id !== projectId) return p;

          projectForNotification = p;

          const newTasks = p.tasks.map(task =>
            task.id === taskId ? updatedTask : task
          );

          // Detect changes and log activity
          const changes: string[] = [];
          if (originalTask && updatedTask) {
            if (originalTask.title !== updatedTask.title) changes.push('title');
            if (originalTask.description !== updatedTask.description) changes.push('description');
            if (originalTask.assigneeId !== updatedTask.assigneeId) changes.push('assignee');
            if (originalTask.deadline !== updatedTask.deadline) changes.push('deadline');
            if (originalTask.deliverableId !== updatedTask.deliverableId) changes.push('deliverable');
          }

          const activities = changes.length > 0
            ? [createTaskUpdatedActivity(currentUser, updatedTask, changes), ...p.activities]
            : p.activities;

          return { ...p, tasks: newTasks, activities };
        })
      );

      // Persist activity to database if there were changes
      if (originalTask && updatedTask) {
        const dbChanges: string[] = [];
        if (originalTask.title !== updatedTask.title) dbChanges.push('title');
        if (originalTask.description !== updatedTask.description) dbChanges.push('description');
        if (originalTask.assigneeId !== updatedTask.assigneeId) dbChanges.push('assignee');
        if (originalTask.deadline !== updatedTask.deadline) dbChanges.push('deadline');
        if (originalTask.deliverableId !== updatedTask.deliverableId) dbChanges.push('deliverable');
        if (dbChanges.length > 0) {
          createActivity({
            type: 'TASK_UPDATED',
            userId: currentUser.id,
            userName: currentUser.name,
            projectId,
            details: { taskId: updatedTask.id, taskTitle: updatedTask.title, changes: dbChanges.join(', ') },
          }).catch(err => console.error('Failed to log activity:', err));
        }
      }

      if (originalTask && updatedTask && originalTask.assigneeId !== updatedTask.assigneeId && updatedTask.assigneeId && projectForNotification) {
        const allUsers = [...projectForNotification.clientTeam, ...projectForNotification.motionifyTeam];
        const assignee = allUsers.find(u => u.id === updatedTask.assigneeId);
        if (assignee) {
          addNotification(`You have been assigned to the task: '${updatedTask.title}'.`, assignee.id, projectForNotification.id);
        }
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }, [projectId, currentUser, projectsData]);

  const addComment = useCallback(async (taskId: string, content: string) => {
    if (!projectId || !currentUser) return;

    const newComment: Comment = {
      id: generateCommentId(),
      userId: currentUser.id,
      userName: currentUser.name,
      content,
      timestamp: Date.now(),
    };

    // Get project for mention parsing
    const currentProject = projectsData.find(p => p.id === projectId);
    const allProjectUsers = currentProject
      ? [...currentProject.clientTeam, ...currentProject.motionifyTeam]
      : [];

    // Parse @mentions from content
    const mentionRegex = /@([A-Za-z][A-Za-z\s]*?)(?=\s@|\s|,|\.|\\!|\\?|$)/g;
    const mentionedNames = Array.from(content.matchAll(mentionRegex), m => m[1].trim());

    // Find mentioned users (excluding self)
    const mentionedUsers = mentionedNames
      .map(name => {
        const normalizedMention = name.toLowerCase();
        return allProjectUsers.find(user =>
          user.name.toLowerCase().includes(normalizedMention) ||
          user.name.toLowerCase().startsWith(normalizedMention)
        );
      })
      .filter((user): user is NonNullable<typeof user> =>
        user !== undefined && user.id !== currentUser.id
      );

    // Get the task for notification message
    const task = currentProject?.tasks.find(t => t.id === taskId);

    // Update local state immediately for responsive UI
    setProjectsData(prevData => prevData.map(p => {
      if (p.id !== projectId) return p;
      const newTasks = p.tasks.map(taskItem => {
        if (taskItem.id === taskId) {
          return { ...taskItem, comments: [...taskItem.comments, newComment] };
        }
        return taskItem;
      });
      return { ...p, tasks: newTasks };
    }));

    // Create in-app notifications for mentioned users
    mentionedUsers.forEach(user => {
      const taskName = task?.title || 'a task';
      addNotification(
        `${currentUser.name} mentioned you in a comment on "${taskName}"`,
        user.id,
        projectId
      );
    });

    // Call backend API to persist comment and trigger email notifications
    try {
      await addTaskComment(taskId, {
        user_id: currentUser.id,
        user_name: currentUser.name,
        content,
      });
      console.log('[API] Comment saved and @mention emails triggered');
    } catch (error) {
      console.error('[API] Failed to save comment:', error);
      // Comment is already in local state, so UI remains responsive
      // Could show a toast warning here if needed
    }
  }, [projectId, currentUser, projectsData]);

  const editComment = useCallback((taskId: string, commentId: string, content: string): boolean => {
    if (!projectId || !currentUser) return false;

    let wasEdited = false;
    const oneHourMs = 60 * 60 * 1000;

    setProjectsData(prevData => prevData.map(p => {
      if (p.id !== projectId) return p;
      const newTasks = p.tasks.map(task => {
        if (task.id !== taskId) return task;
        const newComments = task.comments.map(comment => {
          if (comment.id !== commentId) return comment;
          // Only allow edit if within 1 hour and by the same user
          const timeSincePosted = Date.now() - comment.timestamp;
          if (timeSincePosted > oneHourMs || comment.userId !== currentUser.id) {
            return comment;
          }
          wasEdited = true;
          return { ...comment, content, editedAt: Date.now() };
        });
        return { ...task, comments: newComments };
      });
      return { ...p, tasks: newTasks };
    }));

    return wasEdited;
  }, [projectId, currentUser]);

  const addFile = useCallback((fileData: AddFileData) => {
    if (!projectId || !currentUser) return;

    const newFile: ProjectFile = {
      id: generateFileId(),
      url: '#',
      uploadedAt: Date.now(),
      uploadedById: currentUser.id,
      comments: [],
      ...fileData,
    };

    setProjectsData(prevData => prevData.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, files: [newFile, ...p.files] };
    }));
  }, [projectId, currentUser]);

  const addFiles = useCallback((filesData: AddFileData[]) => {
    if (!projectId || !currentUser) return;

    const newFiles: ProjectFile[] = filesData.map(fileData => ({
      id: generateFileId(),
      url: '#',
      uploadedAt: Date.now(),
      uploadedById: currentUser.id,
      comments: [],
      ...fileData,
    }));

    setProjectsData(prevData => prevData.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, files: [...newFiles, ...p.files] };
    }));
  }, [projectId, currentUser]);

  const deleteFile = useCallback((fileId: string) => {
    if (!projectId || !currentUser) return;
    // Check if user has permission (Motionify Member or Project Manager)
    if (currentUser.role !== UserRole.MOTIONIFY_MEMBER && currentUser.role !== UserRole.PROJECT_MANAGER) {
      console.error('Unauthorized: Only admins can delete files.');
      return;
    }

    setProjectsData(prevData => prevData.map(p => {
      if (p.id !== projectId) return p;
      const newFiles = p.files.filter(f => f.id !== fileId);
      return { ...p, files: newFiles };
    }));
  }, [projectId, currentUser]);

  const renameFile = useCallback((fileId: string, newName: string): { success: boolean; error?: string } => {
    if (!projectId || !currentUser) return { success: false, error: 'Not authenticated' };

    const project = projectsData.find(p => p.id === projectId);
    if (!project) return { success: false, error: 'Project not found' };

    const file = project.files.find(f => f.id === fileId);
    if (!file) return { success: false, error: 'File not found' };

    // Extract extension from original filename
    const originalExt = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';

    // Ensure new name doesn't include extension (user only edits basename)
    let baseName = newName.trim();
    if (originalExt && baseName.toLowerCase().endsWith(originalExt.toLowerCase())) {
      baseName = baseName.slice(0, -originalExt.length);
    }

    const finalName = baseName + originalExt;

    // Check for duplicate names (case-insensitive)
    const isDuplicate = project.files.some(
      f => f.id !== fileId && f.name.toLowerCase() === finalName.toLowerCase()
    );
    if (isDuplicate) {
      return { success: false, error: 'A file with this name already exists' };
    }

    // No actual change
    if (finalName === file.name) {
      return { success: true };
    }

    const oldName = file.name;

    setProjectsData(prevData => prevData.map(p => {
      if (p.id !== projectId) return p;
      const newFiles = p.files.map(f =>
        f.id === fileId ? { ...f, name: finalName } : f
      );
      // Add activity log
      const activity = createFileRenamedActivity(currentUser, oldName, finalName);
      return { ...p, files: newFiles, activities: [activity, ...p.activities] };
    }));

    // Persist activity to database
    createActivity({
      type: 'FILE_RENAMED',
      userId: currentUser.id,
      userName: currentUser.name,
      projectId,
      details: { oldName, newName: finalName },
    }).catch(err => console.error('Failed to log activity:', err));

    return { success: true };
  }, [projectId, currentUser, projectsData]);

  const addFileComment = useCallback((fileId: string, content: string) => {
    if (!projectId || !currentUser) return;
    const newComment: Comment = {
      id: generateFileCommentId(),
      userId: currentUser.id,
      userName: currentUser.name,
      content,
      timestamp: Date.now(),
    };
    setProjectsData(prevData => prevData.map(p => {
      if (p.id !== projectId) return p;
      const newFiles = p.files.map(file => {
        if (file.id === fileId) {
          return { ...file, comments: [...file.comments, newComment] };
        }
        return file;
      });
      return { ...p, files: newFiles };
    }));
  }, [projectId, currentUser]);

  const addRevision = useCallback((projectId: string) => {
    setProjectsData(prevData =>
      prevData.map(p =>
        p.id === projectId
          ? { ...p, totalRevisions: p.totalRevisions + 1 }
          : p
      )
    );
  }, []);

  const markNotificationsAsRead = useCallback(() => {
    if (!currentUser) return;
    setNotifications(prev =>
      prev.map(n =>
        n.userId === currentUser.id ? { ...n, read: true } : n
      )
    );
  }, [currentUser]);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }, []);

  const updateMotionifyTeam = useCallback((memberIds: string[]) => {
    if (!projectId) return;

    const newTeam = allMotionifyUsers.filter(u => memberIds.includes(u.id));

    setProjectsData(prevData =>
      prevData.map(p => {
        if (p.id !== projectId) return p;

        const hasPM = newTeam.some(u => u.role === UserRole.PROJECT_MANAGER);
        if (!hasPM) {
          const pmToAdd = allMotionifyUsers.find(u => u.role === UserRole.PROJECT_MANAGER);
          if (pmToAdd && !newTeam.some(u => u.id === pmToAdd.id)) {
            newTeam.push(pmToAdd);
          }
        }

        return { ...p, motionifyTeam: newTeam };
      })
    );
  }, [projectId, allMotionifyUsers]);

  const updateProjectStatus = useCallback((projectId: string, status: ProjectStatus) => {
    setProjectsData(prevData => prevData.map(p =>
      p.id === projectId ? { ...p, status } : p
    ));
  }, []);

  const addProject = useCallback((newProjectData: { name: string; client: Client; scope: { deliverables: Deliverable[]; nonInclusions: string[] }; totalRevisions: number; milestones?: Milestone[] }) => {
    const newProject: Project = {
      id: generateProjectId(),
      status: ProjectStatus.IN_PROGRESS,
      usedRevisions: 0,
      tasks: [],
      files: [],
      clientTeam: [],
      motionifyTeam: currentUser ? [currentUser] : [],
      activities: [],
      milestones: newProjectData.milestones || [],
      ...newProjectData,
    };
    setProjectsData(prevData => [newProject, ...prevData]);
  }, [currentUser]);

  const contextValue = useMemo(() => ({
    project: selectedProject ?? null,
    projects: projectsData,
    currentUser,
    notifications,
    allMotionifyUsers,
    updateTaskStatus,
    requestRevision,
    addTeamMember,
    removeClientTeamMember,
    addTask,
    deleteTask,
    updateTask,
    addRevision,
    markNotificationsAsRead,
    markNotificationAsRead,
    addComment,
    editComment,
    addFile,
    updateMotionifyTeam,
    renameFile,
    addFileComment,
    updateProjectStatus,
    addProject,
    deleteFile,
    addFiles,
    isLoading: isAuthLoading,
    logout: authLogout,
  }), [selectedProject, projectsData, currentUser, notifications, allMotionifyUsers, updateTaskStatus, requestRevision, addTeamMember, removeClientTeamMember, addTask, deleteTask, updateTask, addRevision, markNotificationsAsRead, markNotificationAsRead, addComment, editComment, addFile, updateMotionifyTeam, renameFile, deleteFile, addFiles, addFileComment, updateProjectStatus, addProject, isAuthLoading, authLogout]);


  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

