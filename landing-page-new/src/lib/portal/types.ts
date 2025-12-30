// Fix: Removed self-import of `UserRole` which was causing a circular dependency and declaration conflict.
// Fix: Removed circular dependency by defining UserRole enum in this file.
export enum UserRole {
  PRIMARY_CONTACT = 'Primary Contact',
  TEAM_MEMBER = 'Team Member',
  PROJECT_MANAGER = 'Project Manager',
  MOTIONIFY_MEMBER = 'Motionify Member',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hasAgreed?: boolean; // For primary contact
}

export enum TaskStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  AWAITING_APPROVAL = 'Awaiting Approval',
  COMPLETED = 'Completed',
  REVISION_REQUESTED = 'Revision Requested',
}

export enum ProjectStatus {
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  ARCHIVED = 'Archived',
}

export interface Deliverable {
  id: string;
  name: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  visibleToClient: boolean;
  delivery?: string; // Link or description of the delivered work
  deliverableId?: string; // Link to a specific deliverable
  deadline?: string; // e.g., '2024-12-31'
  assigneeId?: string; // ID of the user assigned to this task
  comments: Comment[];
}

export interface Client {
  name: string;
  logoUrl?: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  url: string; // In a real app, this would be a CDN link
  size: number; // in bytes
  type: string; // e.g., 'video/mp4' or 'application/pdf'
  uploadedAt: number;
  uploadedById: string;
  deliverableId?: string;
  description?: string;
  comments: Comment[];
}

export enum ActivityType {
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  FILE_UPLOADED = 'FILE_UPLOADED',
  TEAM_MEMBER_INVITED = 'TEAM_MEMBER_INVITED',
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  REVISION_REQUESTED = 'REVISION_REQUESTED',
  TEAM_UPDATED = 'TEAM_UPDATED',
}

export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: number;
  userId: string;
  userName: string;
  details: {
    [key: string]: string | number;
  };
}


export interface Milestone {
  id: string;
  name: string;
  description: string;
  deliverableIds: string[];
  estimatedDate?: string;
  order: number;
}

export interface Project {
  id: string;
  name: string;
  client: Client;
  scope: {
    deliverables: Deliverable[];
    nonInclusions: string[];
  };
  milestones: Milestone[];  // Project milestones copied from proposal
  totalRevisions: number;
  usedRevisions: number;
  tasks: Task[];
  clientTeam: User[];
  motionifyTeam: User[];
  status: ProjectStatus;
  files: ProjectFile[];
  activities: Activity[];
}

export interface Notification {
  id: string;
  message: string;
  userId: string; // The user who should receive the notification
  projectId: string;
  timestamp: number;
  read: boolean;
}

