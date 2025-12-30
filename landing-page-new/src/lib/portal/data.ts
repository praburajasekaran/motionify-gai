import { Project, UserRole, TaskStatus, ProjectStatus, ActivityType, Notification } from './types';

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-001',
    name: 'Q3 Product Launch Video',
    client: {
      name: 'Cyberdyne Systems',
      logoUrl: 'https://logo.clearbit.com/cyberdyne.com',
    },
    status: ProjectStatus.IN_PROGRESS,
    scope: {
      deliverables: [
        { id: 'del-1-1', name: '90-second animated promotional video' },
        { id: 'del-1-2', name: 'Professional voiceover' },
        { id: 'del-1-3', name: 'Royalty-free background music' },
        { id: 'del-1-4', name: 'Final 4K resolution MP4 file' },
      ],
      nonInclusions: [
        'Raw project files',
        'Social media cutdowns (unless specified)',
        'Media buying and ad placement',
      ],
    },
    totalRevisions: 3,
    usedRevisions: 1,
    clientTeam: [
      { id: 'user-client-1', name: 'Sarah Connor', email: 'sarah.c@cyberdyne.com', role: UserRole.PRIMARY_CONTACT, hasAgreed: true },
      { id: 'user-client-2', name: 'John Connor', email: 'john.c@cyberdyne.com', role: UserRole.TEAM_MEMBER },
    ],
    motionifyTeam: [
      { id: 'user-motion-pm', name: 'Dana Scully', email: 'dana.s@motionify.io', role: UserRole.PROJECT_MANAGER },
      { id: 'user-motion-1', name: 'Kyle Reese', email: 'kyle@motionify.io', role: UserRole.MOTIONIFY_MEMBER },
      { id: 'user-motion-2', name: 'Miles Dyson', email: 'miles@motionify.io', role: UserRole.MOTIONIFY_MEMBER },
    ],
    tasks: [
      {
        id: 'task-1',
        title: 'Scriptwriting & Storyboarding',
        description: 'Develop the script and create a visual storyboard for client review.',
        status: TaskStatus.COMPLETED,
        visibleToClient: true,
        delivery: 'Script_v1.pdf, Storyboard_v1.pdf',
        deliverableId: 'del-1-1',
        deadline: '2024-08-10',
        assigneeId: 'user-motion-1',
        comments: [
          {
            id: 'comment-1',
            userId: 'user-client-1',
            userName: 'Sarah Connor',
            content: 'Looks great! Approved.',
            timestamp: Date.now() - 86400000 * 2, // 2 days ago
          },
        ],
      },
      {
        id: 'task-2',
        title: 'Initial Animation Draft (v1)',
        description: 'Produce the first full draft of the animation based on the approved storyboard.',
        status: TaskStatus.AWAITING_APPROVAL,
        visibleToClient: true,
        delivery: 'Launch_Video_Draft_v1.mp4',
        deliverableId: 'del-1-1',
        deadline: '2024-08-20',
        assigneeId: 'user-motion-1',
        comments: [],
      },
      {
        id: 'task-3',
        title: 'Voiceover Recording',
        description: 'Record the professional voiceover using the approved script.',
        status: TaskStatus.IN_PROGRESS,
        visibleToClient: true,
        deliverableId: 'del-1-2',
        deadline: '2024-08-25',
        assigneeId: 'user-motion-2',
        comments: [],
      },
      {
        id: 'task-4',
        title: 'Sound Design & Mixing',
        description: 'Internal task for sound engineering and mixing.',
        status: TaskStatus.PENDING,
        visibleToClient: false,
        deliverableId: 'del-1-3',
        comments: [],
      },
      {
        id: 'task-5',
        title: 'Final Polish & Render',
        description: 'Final color grading, effects, and rendering of the 4K video file.',
        status: TaskStatus.PENDING,
        visibleToClient: true,
        deliverableId: 'del-1-4',
        deadline: '2024-09-01',
        assigneeId: 'user-motion-2',
        comments: [],
      },
    ],
    files: [
      {
        id: 'file-1',
        name: 'Approved_Script_v2.pdf',
        url: '#',
        size: 1024 * 256, // 256 KB
        type: 'application/pdf',
        uploadedAt: Date.now() - 86400000 * 3,
        uploadedById: 'user-motion-1',
        deliverableId: 'del-1-1',
        comments: [],
      },
      {
        id: 'file-2',
        name: 'Final_Render_4K.mp4',
        url: '#',
        size: 1024 * 1024 * 150, // 150 MB
        type: 'video/mp4',
        uploadedAt: Date.now() - 86400000,
        uploadedById: 'user-motion-2',
        deliverableId: 'del-1-4',
        comments: [],
      },
      {
        id: 'file-3',
        name: 'Project_Brief.pdf',
        url: '#',
        size: 1024 * 1024 * 1.2, // 1.2 MB
        type: 'application/pdf',
        uploadedAt: Date.now() - 86400000 * 5,
        uploadedById: 'user-motion-pm',
        comments: [],
      },
    ],
    activities: [
      {
        id: 'act-1',
        type: ActivityType.TASK_STATUS_CHANGED,
        timestamp: Date.now() - 86400000 * 2,
        userId: 'user-client-1',
        userName: 'Sarah Connor',
        details: {
          taskTitle: 'Scriptwriting & Storyboarding',
          newStatus: 'Completed',
        },
      },
      {
        id: 'act-2',
        type: ActivityType.FILE_UPLOADED,
        timestamp: Date.now() - 86400000,
        userId: 'user-motion-2',
        userName: 'Miles Dyson',
        details: {
          fileName: 'Final_Render_4K.mp4',
        },
      },
      {
        id: 'act-3',
        type: ActivityType.COMMENT_ADDED,
        timestamp: Date.now() - 86400000 * 2 + 60000, // a minute later
        userId: 'user-client-1',
        userName: 'Sarah Connor',
        details: {
          taskTitle: 'Scriptwriting & Storyboarding',
        },
      },
      {
        id: 'act-4',
        type: ActivityType.TASK_CREATED,
        timestamp: Date.now() - 86400000 * 4,
        userId: 'user-motion-pm',
        userName: 'Dana Scully',
        details: {
          taskTitle: 'Final Polish & Render',
        },
      },
    ],
  },
  {
    id: 'proj-002',
    name: 'Annual Report Animation',
    client: {
      name: 'OmniCorp',
      // No logoUrl to test placeholder
    },
    status: ProjectStatus.IN_PROGRESS,
    scope: {
      deliverables: [
        { id: 'del-2-1', name: '3-minute data visualization video' },
        { id: 'del-2-2', name: 'Branded assets and lower thirds' },
      ],
      nonInclusions: [
        'Raw data processing',
        'Live-action filming',
      ],
    },
    totalRevisions: 2,
    usedRevisions: 0,
    clientTeam: [
      { id: 'user-client-3', name: 'Dick Jones', email: 'dick.j@omnicorp.com', role: UserRole.PRIMARY_CONTACT, hasAgreed: true },
    ],
    motionifyTeam: [
      { id: 'user-motion-pm', name: 'Dana Scully', email: 'dana.s@motionify.io', role: UserRole.PROJECT_MANAGER },
      { id: 'user-motion-1', name: 'Kyle Reese', email: 'kyle@motionify.io', role: UserRole.MOTIONIFY_MEMBER },
    ],
    tasks: [
      {
        id: 'task-6',
        title: 'Data Asset Collection',
        description: 'Collect and organize all data points for visualization.',
        status: TaskStatus.IN_PROGRESS,
        visibleToClient: true,
        deliverableId: 'del-2-1',
        deadline: '2024-09-15',
        assigneeId: 'user-motion-1',
        comments: [],
      },
      {
        id: 'task-7',
        title: 'Design Brand Kit',
        description: 'Create branded graphic elements for the video.',
        status: TaskStatus.PENDING,
        visibleToClient: true,
        deliverableId: 'del-2-2',
        deadline: '2024-09-20',
        assigneeId: 'user-motion-1',
        comments: [],
      },
    ],
    files: [],
    activities: [],
  }
];


// Mock Notifications - for testing notification UI components
// Mock Notifications - for testing notification UI components
export const MOCK_NOTIFICATIONS: Notification[] = [
  // UNREAD notifications
  {
    id: 'notif-001',
    type: 'task_assigned',
    category: 'task_updates',
    title: 'Task Assigned',
    message: "You were assigned to 'Initial Animation Draft (v1)' by Dana Scully",
    icon: '🎯',
    userId: 'user-client-1', // Sarah Connor
    projectId: 'proj-001',
    createdAt: new Date(Date.now() - 60000 * 15), // 15 minutes ago
    read: false,
    readAt: null,
    deletedAt: null,
    actionUrl: '/portal/projects/proj-001/tasks/task-2',
    actionLabel: 'View Task',
    metadata: {
      taskId: 'task-2',
      taskTitle: 'Initial Animation Draft (v1)',
      projectName: 'Q3 Product Launch Video'
    },
    actorId: 'user-motion-pm',
    actorName: 'Dana Scully'
  },
  {
    id: 'notif-002',
    type: 'comment_mention',
    category: 'comments_mentions',
    title: 'Mentioned',
    message: "Dana Scully mentioned you in a comment",
    icon: '💬',
    userId: 'user-client-1', // Sarah Connor
    projectId: 'proj-001',
    createdAt: new Date(Date.now() - 60000 * 30), // 30 minutes ago
    read: false,
    readAt: null,
    deletedAt: null,
    actionUrl: '/portal/projects/proj-001/tasks/task-1',
    actionLabel: 'View Comment',
    metadata: {
      taskId: 'task-1',
      taskTitle: 'Scriptwriting & Storyboarding',
      projectName: 'Q3 Product Launch Video',
      mentionedBy: 'Dana Scully'
    },
    actorId: 'user-motion-pm',
    actorName: 'Dana Scully'
  },
  {
    id: 'notif-003',
    type: 'file_uploaded',
    category: 'file_updates',
    title: 'File Uploaded',
    message: "New file uploaded: Final_Render_4K.mp4 by Miles Dyson",
    icon: '📁',
    userId: 'user-client-1', // Sarah Connor
    projectId: 'proj-001',
    createdAt: new Date(Date.now() - 60000 * 45), // 45 minutes ago
    read: false,
    readAt: null,
    deletedAt: null,
    actionUrl: '/portal/projects/proj-001/files/file-2',
    actionLabel: 'View File',
    metadata: {
      fileId: 'file-2',
      fileName: 'Final_Render_4K.mp4',
      projectName: 'Q3 Product Launch Video'
    },
    actorId: 'user-motion-2',
    actorName: 'Miles Dyson'
  },
  {
    id: 'notif-004',
    type: 'approval_request',
    category: 'approvals_revisions',
    title: 'Approval Request',
    message: "Deliverable awaiting your approval: 90-second animated promotional video",
    icon: '👍',
    userId: 'user-client-1', // Sarah Connor
    projectId: 'proj-001',
    createdAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
    read: false,
    readAt: null,
    deletedAt: null,
    actionUrl: '/portal/projects/proj-001/deliverables/del-1-1',
    actionLabel: 'View Deliverable',
    metadata: {
      deliverableId: 'del-1-1',
      deliverableName: '90-second animated promotional video',
      projectName: 'Q3 Product Launch Video'
    },
    actorId: 'system',
    actorName: 'System'
  },
  {
    id: 'notif-005',
    type: 'task_comment_added',
    category: 'comments_mentions',
    title: 'Task Comment',
    message: "Kyle Reese commented on 'Scriptwriting & Storyboarding'",
    icon: '💬',
    userId: 'user-client-1', // Sarah Connor
    projectId: 'proj-001',
    createdAt: new Date(Date.now() - 3600000 * 3), // 3 hours ago
    read: false,
    readAt: null,
    deletedAt: null,
    actionUrl: '/portal/projects/proj-001/tasks/task-1',
    actionLabel: 'View Task',
    metadata: {
      taskId: 'task-1',
      taskTitle: 'Scriptwriting & Storyboarding',
      projectName: 'Q3 Product Launch Video'
    },
    actorId: 'user-motion-1',
    actorName: 'Kyle Reese'
  },
  // READ notifications
  {
    id: 'notif-006',
    type: 'task_status_changed',
    category: 'task_updates',
    title: 'Task Status Changed',
    message: "Task status changed: 'Scriptwriting & Storyboarding' → Completed",
    icon: '✅',
    userId: 'user-client-1', // Sarah Connor
    projectId: 'proj-001',
    createdAt: new Date(Date.now() - 86400000 * 1), // 1 day ago
    read: true,
    readAt: new Date(Date.now() - 86400000 * 0.5),
    deletedAt: null,
    actionUrl: '/portal/projects/proj-001/tasks/task-1',
    actionLabel: 'View Task',
    metadata: {
      taskId: 'task-1',
      taskTitle: 'Scriptwriting & Storyboarding',
      oldStatus: 'In Progress',
      newStatus: 'Completed',
      projectName: 'Q3 Product Launch Video'
    },
    actorId: 'user-motion-pm',
    actorName: 'Dana Scully'
  },
  {
    id: 'notif-007',
    type: 'team_member_added',
    category: 'team_changes',
    title: 'Team Member Added',
    message: "Miles Dyson was added to the team",
    icon: '👥',
    userId: 'user-client-1', // Sarah Connor
    projectId: 'proj-001',
    createdAt: new Date(Date.now() - 86400000 * 2), // 2 days ago
    read: true,
    readAt: new Date(Date.now() - 86400000 * 1.5),
    deletedAt: null,
    actionUrl: '/portal/projects/proj-001/team',
    actionLabel: 'View Team',
    metadata: {
      projectName: 'Q3 Product Launch Video'
    },
    actorId: 'user-motion-pm',
    actorName: 'Dana Scully'
  },
  {
    id: 'notif-008',
    type: 'project_created',
    category: 'project_updates',
    title: 'Project Created',
    message: "New project created: Q3 Product Launch Video",
    icon: '📂',
    userId: 'user-client-1', // Sarah Connor
    projectId: 'proj-001',
    createdAt: new Date(Date.now() - 86400000 * 5), // 5 days ago
    read: true,
    readAt: new Date(Date.now() - 86400000 * 4),
    deletedAt: null,
    actionUrl: '/portal/projects/proj-001',
    actionLabel: 'View Project',
    metadata: {
      projectName: 'Q3 Product Launch Video'
    },
    actorId: 'user-motion-pm',
    actorName: 'Dana Scully'
  },
];
