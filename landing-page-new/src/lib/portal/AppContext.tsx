import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Project, User, UserRole, TaskStatus, Task, Comment, ProjectFile, ProjectStatus, Client, Deliverable, Notification } from './types';
import { MOCK_PROJECTS, MOCK_NOTIFICATIONS } from './data';
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
} from './utils/activityLogger';
import { isValidTransition } from './utils/taskStateTransitions';
import { useAuth } from '@/context/AuthContext';

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
  addTask: (taskData: AddTaskData) => void;
  updateTask: (taskId: string, taskData: UpdateTaskData) => void;
  addRevision: (projectId: string) => void;
  markNotificationsAsRead: () => void;
  markNotificationAsRead: (notificationId: string) => void;
  addComment: (taskId: string, content: string) => void;
  addFile: (fileData: AddFileData) => void;
  updateMotionifyTeam: (memberIds: string[]) => void;
  renameFile: (fileId: string, newName: string) => void;
  addFileComment: (fileId: string, content: string) => void;
  updateProjectStatus: (projectId: string, status: ProjectStatus) => void;
  addProject: (data: { name: string; client: Client; scope: { deliverables: Deliverable[]; nonInclusions: string[] }; totalRevisions: number }) => void;
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
  addTask: () => { },
  updateTask: () => { },
  addRevision: () => { },
  markNotificationsAsRead: () => { },
  markNotificationAsRead: () => { },
  addComment: () => { },
  addFile: () => { },
  updateMotionifyTeam: () => { },
  renameFile: () => { },
  addFileComment: () => { },
  updateProjectStatus: () => { },
  addProject: () => { },
  isLoading: true,
  logout: () => { },
});

export function AppProvider({ children, selectedProjectId }: { children: React.ReactNode; selectedProjectId?: string | null }) {
  const [projectsData, setProjectsData] = useState<Project[]>(MOCK_PROJECTS);
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
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);


  const selectedProject = useMemo(() =>
    projectsData.find(p => p.id === projectId),
    [projectsData, projectId]
  );

  const allMotionifyUsers = useMemo(() => {
    const allUsers = projectsData.flatMap(p => p.motionifyTeam);
    const uniqueUsers: User[] = Array.from(new Map<string, User>(allUsers.map(item => [item.id, item])).values());
    return uniqueUsers.filter(u => u.role === UserRole.MOTIONIFY_MEMBER || u.role === UserRole.PROJECT_MANAGER);
  }, [projectsData]);

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

  const addTask = useCallback((taskData: AddTaskData) => {
    if (!projectId || !currentUser) return;

    const newTask: Task = {
      id: generateTaskId(),
      status: TaskStatus.PENDING,
      comments: [],
      ...taskData
    };

    let projectForNotification: Project | undefined;

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

    if (newTask.assigneeId && projectForNotification) {
      const allUsers = [...projectForNotification.clientTeam, ...projectForNotification.motionifyTeam];
      const assignee = allUsers.find(u => u.id === newTask.assigneeId);
      if (assignee) {
        addNotification(`You have been assigned a new task: '${newTask.title}'.`, assignee.id, projectForNotification.id);
      }
    }
  }, [projectId, currentUser]);

  const updateTask = useCallback((taskId: string, taskData: UpdateTaskData) => {
    if (!projectId || !currentUser) return;

    let originalTask: Task | undefined;
    let updatedTask: Task | undefined;
    let projectForNotification: Project | undefined;

    setProjectsData(prevData =>
      prevData.map(p => {
        if (p.id !== projectId) return p;

        projectForNotification = p;
        originalTask = p.tasks.find(task => task.id === taskId);

        const newTasks = p.tasks.map(task => {
          if (task.id === taskId) {
            updatedTask = { ...task, ...taskData };
            return updatedTask;
          }
          return task;
        });

        const changes: string[] = [];
        if (originalTask && updatedTask) {
          if (originalTask.title !== updatedTask.title) changes.push('title');
          if (originalTask.description !== updatedTask.description) changes.push('description');
          if (originalTask.assigneeId !== updatedTask.assigneeId) changes.push('assignee');
          if (originalTask.deadline !== updatedTask.deadline) changes.push('deadline');
          if (originalTask.deliverableId !== updatedTask.deliverableId) changes.push('deliverable');
        }

        const activities = changes.length > 0 && updatedTask
          ? [createTaskUpdatedActivity(currentUser, updatedTask, changes), ...p.activities]
          : p.activities;

        return { ...p, tasks: newTasks, activities };
      })
    );

    if (originalTask && updatedTask && originalTask.assigneeId !== updatedTask.assigneeId && updatedTask.assigneeId && projectForNotification) {
      const allUsers = [...projectForNotification.clientTeam, ...projectForNotification.motionifyTeam];
      const assignee = allUsers.find(u => u.id === updatedTask!.assigneeId);
      if (assignee) {
        addNotification(`You have been assigned to the task: '${updatedTask.title}'.`, assignee.id, projectForNotification.id);
      }
    }
  }, [projectId, currentUser]);

  const addComment = useCallback((taskId: string, content: string) => {
    if (!projectId || !currentUser) return;

    const newComment: Comment = {
      id: generateCommentId(),
      userId: currentUser.id,
      userName: currentUser.name,
      content,
      timestamp: Date.now(),
    };

    setProjectsData(prevData => prevData.map(p => {
      if (p.id !== projectId) return p;
      const newTasks = p.tasks.map(task => {
        if (task.id === taskId) {
          return { ...task, comments: [...task.comments, newComment] };
        }
        return task;
      });
      return { ...p, tasks: newTasks };
    }));
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

  const renameFile = useCallback((fileId: string, newName: string) => {
    if (!projectId) return;
    setProjectsData(prevData => prevData.map(p => {
      if (p.id !== projectId) return p;
      const newFiles = p.files.map(file =>
        file.id === fileId ? { ...file, name: newName } : file
      );
      return { ...p, files: newFiles };
    }));
  }, [projectId]);

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

  const addProject = useCallback((newProjectData: { name: string; client: Client; scope: { deliverables: Deliverable[]; nonInclusions: string[] }; totalRevisions: number }) => {
    const newProject: Project = {
      id: generateProjectId(),
      status: ProjectStatus.IN_PROGRESS,
      usedRevisions: 0,
      tasks: [],
      files: [],
      clientTeam: [],
      motionifyTeam: currentUser ? [currentUser] : [],
      activities: [],
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
    addTask,
    updateTask,
    addRevision,
    markNotificationsAsRead,
    markNotificationAsRead,
    addComment,
    addFile,
    updateMotionifyTeam,
    renameFile,
    addFileComment,
    updateProjectStatus,
    addProject,
    isLoading: isAuthLoading,
    logout: authLogout,
  }), [selectedProject, projectsData, currentUser, notifications, allMotionifyUsers, updateTaskStatus, requestRevision, addTeamMember, addTask, updateTask, addRevision, markNotificationsAsRead, markNotificationAsRead, addComment, addFile, updateMotionifyTeam, renameFile, addFileComment, updateProjectStatus, addProject, isAuthLoading, authLogout]);


  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

