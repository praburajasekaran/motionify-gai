
export type ProjectStatus = 'Active' | 'In Review' | 'Completed' | 'On Hold';
export type Priority = 'Low' | 'Medium' | 'High';

export interface User {
  id: string;
  name: string;
  role: 'Admin' | 'Project Manager' | 'Client' | 'Editor' | 'Designer';
  avatar: string;
  email?: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'Todo' | 'In Progress' | 'Done';
  assignee?: User;
}

export interface Deliverable {
  id: string;
  title: string;
  type: 'Video' | 'Image' | 'Document';
  status: 'Draft' | 'In Review' | 'Approved';
  progress: number;
  dueDate: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  target: string;
  timestamp: string; // ISO date string
}

export interface Project {
  id: string;
  title: string;
  client: string;
  website?: string; // Domain for logo fetching
  thumbnail: string;
  status: ProjectStatus;
  dueDate: string;
  startDate: string;
  progress: number;
  description: string;
  tasks: Task[];
  team: User[];
  budget: number;
  deliverables: Deliverable[];
  deliverablesCount: number; // Keep for backwards compatibility if needed, or derive
  revisionCount: number;
  maxRevisions: number;
  activityLog: ActivityLog[];
}
