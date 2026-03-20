
import { User } from './types';

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

// Mock projects removed - now using API data only
