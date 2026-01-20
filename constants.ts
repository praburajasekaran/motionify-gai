
import { Project, User } from './types';

// Tab index mapping for URL routing (Basecamp-style numeric URLs)
export const TAB_INDEX_MAP = {
  overview: 1,
  tasks: 2,
  deliverables: 3,
  files: 4,
  team: 5,
  activity: 6,
  payments: 7
} as const;

export const INDEX_TAB_MAP = {
  1: 'overview',
  2: 'tasks',
  3: 'deliverables',
  4: 'files',
  5: 'team',
  6: 'activity',
  7: 'payments'
} as const;

export type TabIndex = keyof typeof INDEX_TAB_MAP;
export type TabName = typeof INDEX_TAB_MAP[TabIndex];

// Fixed: Using real DB UUID for data persistence compatibility
export const CURRENT_USER: User = {
  id: 'e1e1e3de-fae9-4684-8bab-2fb03826029e', // Mike Ross
  name: 'Mike Ross',
  role: 'client',
  email: 'mike@techcorp.com',
  avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  projectTeamMemberships: {
    'c0d3d714-440a-4578-baee-7dfc0d780436': { projectId: 'c0d3d714-440a-4578-baee-7dfc0d780436', isPrimaryContact: true }
  }
};

export const TEAM_MEMBERS: User[] = [
  CURRENT_USER,
  { id: 'f81e3f1c-218d-4a61-a607-f1e7fb8d1479', name: 'Sarah Chen', role: 'super_admin', email: 'sarah@motionify.com', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
  { id: '442e3138-67c5-426f-a33e-a4ad15a5c964', name: 'Jessica Day', role: 'team_member', email: 'jess@motionify.com', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
  { id: 'a7dd7a23-5d0d-473a-9bd3-a47b859eca66', name: 'David Kim', role: 'team_member', email: 'david@motionify.com', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
  { id: 'alex-client-001', name: 'Alex Client', role: 'client', email: 'alex@acmecorp.com', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
];

const generateActivity = (projectId: string): any[] => [
  { id: 'a1', userId: 'u2', action: 'approved', target: 'Script v2', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: 'a2', userId: 'u1', action: 'uploaded', target: 'Rough Cut v1', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  { id: 'a3', userId: 'u3', action: 'commented on', target: 'Storyboard', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'c0d3d714-440a-4578-baee-7dfc0d780436',  // Using database UUID for terms acceptance testing
    title: 'TechCorp Product Launch Q3',
    client: 'TechCorp Inc.',
    website: 'stripe.com',
    thumbnail: 'https://images.unsplash.com/photo-1535378437327-10f5af994263?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    status: 'Active',
    startDate: '2024-10-01',
    dueDate: '2024-11-15',
    progress: 65,
    description: 'A high-energy product reveal video for the new X1 series. Requires 3D motion graphics and live-action integration.',
    budget: 15000,
    termsAcceptedAt: '2026-01-14T03:33:24.802Z',  // Terms accepted - from database
    termsAcceptedBy: 'e1e1e3de-fae9-4684-8bab-2fb03826029e',  // Mike Ross
    team: [TEAM_MEMBERS[0], TEAM_MEMBERS[1], TEAM_MEMBERS[2], TEAM_MEMBERS[3]],
    deliverablesCount: 4,
    revisionCount: 2,
    maxRevisions: 3,
    tasks: [
      { id: 't1', title: 'Script Approval', status: 'Done', assignee: TEAM_MEMBERS[1] },
      { id: 't2', title: 'Voiceover Recording', status: 'In Progress', assignee: TEAM_MEMBERS[0] },
      { id: 't3', title: 'Initial Rough Cut', status: 'Todo' },
    ],
    deliverables: [
      { id: 'd1', title: 'Main Launch Video (16:9)', type: 'Video', status: 'beta_ready', progress: 80, dueDate: '2024-11-10' },
      { id: 'd2', title: 'Social Teaser (9:16)', type: 'Video', status: 'pending', progress: 30, dueDate: '2024-11-12' },
      { id: 'd3', title: 'Product Stills', type: 'Image', status: 'approved', progress: 100, dueDate: '2024-10-25' },
      { id: 'd4', title: 'Thumbnail Pack', type: 'Image', status: 'pending', progress: 0, dueDate: '2024-11-14' },
    ],
    files: [],
    activityLog: [
      { id: 'terms-1', userId: 'alex-client-001', action: 'accepted', target: 'Project Terms', timestamp: '2026-01-14T03:33:24.802Z' },
      ...generateActivity('p1')
    ],
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  // UUID for GreenEnergy project
    title: 'GreenEnergy Brand Story',
    client: 'GreenEnergy Co.',
    website: 'spotify.com',
    thumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    status: 'Active',
    startDate: '2024-09-15',
    dueDate: '2024-10-30',
    progress: 90,
    description: 'Documentary style brand piece focusing on sustainability efforts in Northern Europe.',
    budget: 22000,
    team: [TEAM_MEMBERS[0], TEAM_MEMBERS[2]],
    deliverablesCount: 2,
    revisionCount: 5,
    maxRevisions: 5,
    tasks: [
      { id: 't4', title: 'Color Grading', status: 'Done', assignee: TEAM_MEMBERS[0] },
      { id: 't5', title: 'Client Feedback Round 1', status: 'In Progress', assignee: TEAM_MEMBERS[2] },
    ],
    deliverables: [
      { id: 'd5', title: 'Brand Story Full Cut', type: 'Video', status: 'beta_ready', progress: 95, dueDate: '2024-10-28' },
      { id: 'd6', title: 'Interview Cutdowns', type: 'Video', status: 'approved', progress: 100, dueDate: '2024-10-20' },
    ],
    files: [],
    activityLog: generateActivity('p2'),
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',  // UUID for Fashion Week project
    title: 'Fashion Week Recap',
    client: 'Vogue Style',
    website: 'vogue.com',
    thumbnail: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    status: 'Completed',
    startDate: '2024-09-01',
    dueDate: '2024-09-15',
    progress: 100,
    description: 'Fast-paced sizzle reel of the fall collection runway.',
    budget: 8500,
    team: [TEAM_MEMBERS[1], TEAM_MEMBERS[3]],
    deliverablesCount: 12,
    revisionCount: 0,
    maxRevisions: 3,
    tasks: [],
    deliverables: [],
    files: [],
    activityLog: generateActivity('p3'),
  },
  {
    id: 'c3d4e5f6-a7b8-9012-cdef-345678901234',  // UUID for EduTech project
    title: 'EduTech Course Series',
    client: 'MasterClassify',
    website: 'masterclass.com',
    thumbnail: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    status: 'On Hold',
    startDate: '2024-11-01',
    dueDate: '2024-12-01',
    progress: 15,
    description: 'Series of 10 educational videos about Python programming.',
    budget: 45000,
    team: [TEAM_MEMBERS[0]],
    deliverablesCount: 10,
    revisionCount: 0,
    maxRevisions: 10,
    tasks: [
      { id: 't6', title: 'Curriculum Outline', status: 'Done' },
      { id: 't7', title: 'Studio Booking', status: 'Todo' },
    ],
    deliverables: [],
    files: [],
    activityLog: generateActivity('p4'),
  },
];
