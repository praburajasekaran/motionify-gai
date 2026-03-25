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
  status: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
  editedAt?: number; // Timestamp when the comment was last edited
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
  createdBy?: string;
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
  // Task activities
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_DELETED = 'TASK_DELETED',
  REVISION_REQUESTED = 'REVISION_REQUESTED',
  COMMENT_ADDED = 'COMMENT_ADDED',

  // File activities
  FILE_UPLOADED = 'FILE_UPLOADED',
  FILE_DELETED = 'FILE_DELETED',
  FILE_RENAMED = 'FILE_RENAMED',
  FILE_DOWNLOADED = 'FILE_DOWNLOADED',

  // Team activities
  TEAM_MEMBER_INVITED = 'TEAM_MEMBER_INVITED',
  TEAM_MEMBER_REMOVED = 'TEAM_MEMBER_REMOVED',
  TEAM_UPDATED = 'TEAM_UPDATED',

  // Proposal activities
  PROPOSAL_SENT = 'PROPOSAL_SENT',
  PROPOSAL_ACCEPTED = 'PROPOSAL_ACCEPTED',
  PROPOSAL_REJECTED = 'PROPOSAL_REJECTED',
  PROPOSAL_CHANGES_REQUESTED = 'PROPOSAL_CHANGES_REQUESTED',

  // Deliverable activities
  DELIVERABLE_CREATED = 'DELIVERABLE_CREATED',
  DELIVERABLE_APPROVED = 'DELIVERABLE_APPROVED',
  DELIVERABLE_REJECTED = 'DELIVERABLE_REJECTED',
  DELIVERABLE_UPLOADED = 'DELIVERABLE_UPLOADED',
  DELIVERABLE_DELETED = 'DELIVERABLE_DELETED',
  DELIVERABLE_STATUS_CHANGED = 'DELIVERABLE_STATUS_CHANGED',

  // Inquiry activities
  INQUIRY_CREATED = 'INQUIRY_CREATED',
  INQUIRY_STATUS_CHANGED = 'INQUIRY_STATUS_CHANGED',

  // Payment activities
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_REMINDER_SENT = 'PAYMENT_REMINDER_SENT',

  // Project activities
  PROJECT_CREATED = 'PROJECT_CREATED',
  TERMS_ACCEPTED = 'TERMS_ACCEPTED',
}

export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: number;
  userId: string;      // Who performed the action
  userName: string;    // Display name of actor
  targetUserId?: string;   // Recipient of the action (for role-aware phrasing)
  targetUserName?: string; // Display name of recipient
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
  userId: string;
  projectId: string;
  timestamp?: number;
  read: boolean;
  type?: string;
  category?: string;
  title?: string;
  icon?: string;
  createdAt?: Date;
  readAt?: Date | null;
  deletedAt?: Date | null;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, string>;
  actorId?: string;
  actorName?: string;
}

