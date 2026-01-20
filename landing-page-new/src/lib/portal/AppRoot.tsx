'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Project, User, UserRole, Task, TaskStatus, ProjectStatus, Deliverable, Client, Notification, Comment, ProjectFile, Milestone } from './types';
import { MOCK_PROJECTS } from './data';
import { AppContext } from './AppContext';
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import OnboardingAgreement from './components/OnboardingAgreement';
import Dashboard from './components/Dashboard';
import ProjectManagerDashboard from './components/ProjectManagerDashboard';
import {
  generateNotificationId,
  generateUserId,
  generateTaskId,
  generateCommentId,
  generateFileCommentId,
  generateFileId,
  generateProjectId
} from './utils/idGenerator';
import {
  getValidatedLocalStorageItem,
  setLocalStorageItem,
  removeLocalStorageItem,
  isValidUser
} from './utils/validation';
import {
  createTaskStatusChangedActivity,
  createTaskCreatedActivity,
  createTaskUpdatedActivity,
  createRevisionRequestedActivity,
  createCommentAddedActivity,
  createFileUploadedActivity,
  createTeamMemberInvitedActivity,
  createTeamUpdatedActivity
} from './utils/activityLogger';
import { isValidTransition } from './utils/taskStateTransitions';
import {
  fetchTasksForProject,
  createTask,
  updateTaskAPI,
  addTaskComment
} from './api/tasks.api';

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

const AppRoot: React.FC = () => {
  const router = useRouter();
  const [projectsData, setProjectsData] = useState<Project[]>(MOCK_PROJECTS);
  // Initialize as null to prevent hydration mismatch - load from localStorage in useEffect
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const selectedProject = useMemo(() =>
    projectsData.find(p => p.id === selectedProjectId),
    [projectsData, selectedProjectId]
  );

  const allMotionifyUsers = useMemo(() => {
    const allUsers = projectsData.flatMap(p => p.motionifyTeam);
    const uniqueUsers: User[] = Array.from(new Map<string, User>(allUsers.map(item => [item.id, item])).values());
    return uniqueUsers.filter(u => u.role === UserRole.MOTIONIFY_MEMBER || u.role === UserRole.PROJECT_MANAGER);
  }, [projectsData]);

  // Load user from localStorage on client mount (after hydration)
  // This prevents hydration mismatch between server and client
  useEffect(() => {
    const savedUser = getValidatedLocalStorageItem('portal_user', isValidUser);
    if (savedUser) {
      setCurrentUser(savedUser);
    }
  }, []);

  // Auto-select project for client users when loaded from localStorage
  useEffect(() => {
    if (currentUser && (currentUser.role === UserRole.PRIMARY_CONTACT || currentUser.role === UserRole.TEAM_MEMBER) && !selectedProjectId) {
      const projectForUser = projectsData.find(p =>
        p.clientTeam.some(u => u.id === currentUser.id)
      );
      if (projectForUser) {
        setSelectedProjectId(projectForUser.id);
      }
    }
  }, [currentUser, projectsData, selectedProjectId]);

  // Load tasks from API when project is selected
  useEffect(() => {
    if (!selectedProjectId) return;

    const loadProjectTasks = async () => {
      try {
        const tasks = await fetchTasksForProject(selectedProjectId, true);

        setProjectsData(prevData =>
          prevData.map(p =>
            p.id === selectedProjectId ? { ...p, tasks } : p
          )
        );
      } catch (error) {
        console.error('Failed to load tasks:', error);
      }
    };

    loadProjectTasks();
  }, [selectedProjectId]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Fix Bug #5: Use safe localStorage setter
    setLocalStorageItem('portal_user', user);
    // Only auto-select a project for client-side users, as Motionify members can be on multiple projects.
    if (user.role === UserRole.PRIMARY_CONTACT || user.role === UserRole.TEAM_MEMBER) {
      // Find the project this user belongs to and select it
      const projectForUser = projectsData.find(p =>
        p.clientTeam.some(u => u.id === user.id)
      );
      if (projectForUser) {
        setSelectedProjectId(projectForUser.id);
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedProjectId(null);
    // Fix Bug #5: Use safe localStorage remover
    removeLocalStorageItem('portal_user');
    // Redirect to login page
    router.push('/login');
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const handleBackToProjects = () => {
    setSelectedProjectId(null);
  }

  const handleAgreement = () => {
    if (currentUser && currentUser.role === UserRole.PRIMARY_CONTACT && selectedProject) {
      const updatedUser = { ...currentUser, hasAgreed: true };
      setCurrentUser(updatedUser);
      setProjectsData(prevData => prevData.map(p => {
        if (p.id !== selectedProject.id) return p;
        return {
          ...p,
          clientTeam: p.clientTeam.map(u => u.id === currentUser.id ? updatedUser : u)
        }
      }));
    }
  };

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
    if (!selectedProjectId || !currentUser) return;

    let updatedProject: Project | undefined;
    let updatedTask: Task | undefined;
    let oldStatus: TaskStatus | undefined;

    // Fix Bug #2: Add activity logging for task status changes
    // Fix Bug #18: Validate task state transitions
    setProjectsData(prevData =>
      prevData.map(p => {
        if (p.id !== selectedProjectId) return p;

        const oldTask = p.tasks.find(t => t.id === taskId);
        oldStatus = oldTask?.status;

        // Validate state transition
        if (oldStatus && !isValidTransition(oldStatus, status)) {
          console.warn(`Invalid state transition: ${oldStatus} -> ${status}`);
          return p; // Don't allow invalid transition
        }

        const tasks = p.tasks.map(task =>
          task.id === taskId ? { ...task, status } : task
        );
        updatedTask = tasks.find(t => t.id === taskId);

        // Log activity
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

  }, [selectedProjectId, currentUser]);

  const requestRevision = useCallback(async (taskId: string, details: string) => {
    if (!selectedProjectId || !currentUser) return;

    let updatedProject: Project | undefined;
    let updatedTask: Task | undefined;
    let revisionAllowed = false;

    // Fix Bug #1: Race condition in revision requests
    // Use atomic check-and-update within the state setter to prevent race conditions
    setProjectsData(prevData =>
      prevData.map(p => {
        if (p.id !== selectedProjectId) return p;

        // Atomic check: only proceed if revisions available
        if (p.usedRevisions >= p.totalRevisions) {
          console.warn(`Cannot request revision: ${p.usedRevisions}/${p.totalRevisions} revisions used`);
          return p; // No update if limit reached
        }

        revisionAllowed = true;
        console.log(`Revision requested for task ${taskId} in project ${p.id}: ${details}`);

        const tasks = p.tasks.map(task =>
          task.id === taskId ? { ...task, status: TaskStatus.REVISION_REQUESTED } : task
        );
        updatedTask = tasks.find(t => t.id === taskId);
        updatedProject = { ...p, usedRevisions: p.usedRevisions + 1, tasks };
        return updatedProject;
      })
    );

    // Only send notification if revision was actually allowed
    if (revisionAllowed && updatedProject && updatedTask) {
      const projectManager = updatedProject.motionifyTeam.find(u => u.role === UserRole.PROJECT_MANAGER);
      if (projectManager) {
        addNotification(`A revision was requested for task '${updatedTask.title}'.`, projectManager.id, updatedProject.id);
      }

      // --- API Integration ---
      try {
        // 1. Add details as a comment
        await addTaskComment(taskId, {
          user_id: currentUser.id,
          user_name: currentUser.name,
          content: `[Revision Request] ${details}`
        });

        // 2. Update task status (Backend triggers email and inc revisions)
        // Note: Backend handles revision count increment, so local state is optimistic.
        await updateTaskAPI(taskId, {
          status: TaskStatus.REVISION_REQUESTED
        });
        console.log('[API] Revision request synced to backend');

      } catch (error) {
        console.error('[API] Failed to sync revision request:', error);
        // In a real app, we might want to revert the optimistic update here.
        // For now, we rely on the error log.
      }
    }

  }, [selectedProjectId, currentUser]);

  const addTeamMember = useCallback((name: string, email: string) => {
    if (!selectedProjectId) return;
    setProjectsData(prevData =>
      prevData.map(p => {
        if (p.id !== selectedProjectId) return p;
        const newUser: User = {
          id: generateUserId('client'),
          name,
          email,
          role: UserRole.TEAM_MEMBER,
        };
        return { ...p, clientTeam: [...p.clientTeam, newUser] };
      })
    );
  }, [selectedProjectId]);

  const addTask = useCallback(async (taskData: AddTaskData) => {
    if (!selectedProjectId || !currentUser) return;

    try {
      // Call API to create task
      const newTask = await createTask({
        project_id: selectedProjectId,
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
        if (p.id !== selectedProjectId) return p;
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
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  }, [selectedProjectId, currentUser]);

  const updateTask = useCallback(async (taskId: string, taskData: UpdateTaskData) => {
    if (!selectedProjectId || !currentUser) return;

    try {
      let originalTask: Task | undefined;

      // Get the original task before updating
      const project = projectsData.find(p => p.id === selectedProjectId);
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
          if (p.id !== selectedProjectId) return p;

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

  }, [selectedProjectId, currentUser, projectsData]);

  const addComment = useCallback((taskId: string, content: string) => {
    if (!selectedProjectId || !currentUser) return;

    const newComment: Comment = {
      id: generateCommentId(),
      userId: currentUser.id,
      userName: currentUser.name,
      content,
      timestamp: Date.now(),
    };

    setProjectsData(prevData => prevData.map(p => {
      if (p.id !== selectedProjectId) return p;
      const newTasks = p.tasks.map(task => {
        if (task.id === taskId) {
          return { ...task, comments: [...task.comments, newComment] };
        }
        return task;
      });
      return { ...p, tasks: newTasks };
    }));
  }, [selectedProjectId, currentUser]);

  const addFile = useCallback((fileData: AddFileData) => {
    if (!selectedProjectId || !currentUser) return;

    const newFile: ProjectFile = {
      id: generateFileId(),
      url: '#', // Placeholder URL for mock data
      uploadedAt: Date.now(),
      uploadedById: currentUser.id,
      comments: [],
      ...fileData,
    };

    setProjectsData(prevData => prevData.map(p => {
      if (p.id !== selectedProjectId) return p;
      return { ...p, files: [newFile, ...p.files] };
    }));
  }, [selectedProjectId, currentUser]);

  const renameFile = useCallback((fileId: string, newName: string) => {
    if (!selectedProjectId) return;
    setProjectsData(prevData => prevData.map(p => {
      if (p.id !== selectedProjectId) return p;
      const newFiles = p.files.map(file =>
        file.id === fileId ? { ...file, name: newName } : file
      );
      return { ...p, files: newFiles };
    }));
  }, [selectedProjectId]);

  const addFileComment = useCallback((fileId: string, content: string) => {
    if (!selectedProjectId || !currentUser) return;
    const newComment: Comment = {
      id: generateFileCommentId(),
      userId: currentUser.id,
      userName: currentUser.name,
      content,
      timestamp: Date.now(),
    };
    setProjectsData(prevData => prevData.map(p => {
      if (p.id !== selectedProjectId) return p;
      const newFiles = p.files.map(file => {
        if (file.id === fileId) {
          return { ...file, comments: [...file.comments, newComment] };
        }
        return file;
      });
      return { ...p, files: newFiles };
    }));
  }, [selectedProjectId, currentUser]);

  const addProject = (newProjectData: { name: string; client: Client; scope: { deliverables: Deliverable[]; nonInclusions: string[] }; totalRevisions: number; milestones?: Milestone[] }) => {
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
  };

  const updateProjectStatus = (projectId: string, status: ProjectStatus) => {
    setProjectsData(prevData => prevData.map(p =>
      p.id === projectId ? { ...p, status } : p
    ));
  };

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

  const updateMotionifyTeam = useCallback((memberIds: string[]) => {
    if (!selectedProjectId) return;

    const newTeam = allMotionifyUsers.filter(u => memberIds.includes(u.id));

    setProjectsData(prevData =>
      prevData.map(p => {
        if (p.id !== selectedProjectId) return p;

        // Ensure the project always has at least one PM
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
  }, [selectedProjectId, allMotionifyUsers]);


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
    addComment,
    addFile,
    updateMotionifyTeam,
    renameFile,
    addFileComment,
    updateProjectStatus,
    addProject,
  }), [selectedProject, projectsData, currentUser, notifications, allMotionifyUsers, updateTaskStatus, requestRevision, addTeamMember, addTask, updateTask, addRevision, markNotificationsAsRead, addComment, addFile, updateMotionifyTeam, renameFile, addFileComment, updateProjectStatus, addProject]);

  const renderContent = () => {
    if (!currentUser) {
      const allUsers = projectsData.flatMap(p => [...p.clientTeam, ...p.motionifyTeam]);
      // FIX: Explicitly providing generic arguments to `new Map` helps TypeScript correctly infer the types through the chain.
      const uniqueUsers: User[] = Array.from(new Map<string, User>(allUsers.map(item => [item.id, item])).values());
      return <LoginScreen users={uniqueUsers} onLogin={handleLogin} />;
    }

    const isMotionifyStaff = currentUser.role === UserRole.PROJECT_MANAGER || currentUser.role === UserRole.MOTIONIFY_MEMBER;

    if (isMotionifyStaff && !selectedProjectId) {
      const projectsForUser = currentUser.role === UserRole.PROJECT_MANAGER
        ? projectsData
        : projectsData.filter(p => p.motionifyTeam.some(u => u.id === currentUser.id));

      return <ProjectManagerDashboard
        projects={projectsForUser}
        currentUser={currentUser}
        onSelectProject={handleSelectProject}
        onUpdateProjectStatus={updateProjectStatus}
        onAddProject={addProject}
      />;
    }

    if (selectedProject) {
      if (currentUser.role === UserRole.PRIMARY_CONTACT && !currentUser.hasAgreed) {
        return <OnboardingAgreement onAgree={handleAgreement} />;
      }
      return <Dashboard />;
    }

    return <div className="text-center p-10">No project selected or found for this user.</div>;
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col h-screen">
        <Header
          currentUser={currentUser}
          onLogout={handleLogout}
          isProjectView={!!selectedProjectId}
          onBack={handleBackToProjects}
          projectName={selectedProject?.name}
          client={selectedProject?.client}
        />
        <div className="flex-grow overflow-y-auto">
          <main className={!currentUser || (currentUser.role === UserRole.PROJECT_MANAGER && !selectedProjectId) ? "p-4 sm:p-6 md:p-8" : ""}>
            {renderContent()}
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
};

export default AppRoot;

