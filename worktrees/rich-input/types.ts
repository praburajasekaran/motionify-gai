
// Database values for user roles (use these for permission checks)
export type UserRole =
  | 'super_admin'       // Motionify Admin (full system access)
  | 'project_manager'   // Motionify Project Manager (manages projects)
  | 'team_member'       // Motionify Team Member (assigned to tasks)
  | 'client';           // Client (check is_primary_contact for permissions)

// Display labels for roles (use these for UI display only)
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  'super_admin': 'Super Admin',
  'project_manager': 'Motionify Support',
  'team_member': 'Team Member',
  'client': 'Client',
} as const;

export type ProjectStatus =
  | 'Draft'             // Only Admin/PM can view
  | 'Active'            // Full permissions as documented
  | 'In Review'         // Deliverables under review
  | 'Awaiting Payment'  // Client PM cannot approve new deliverables
  | 'On Hold'           // No file uploads except Admin
  | 'Completed'         // Read-only except Admin, files accessible 365 days
  | 'Archived';         // Admin read-only only

export type Priority = 'Low' | 'Medium' | 'High';

// Project team membership (for multi-project support)
export interface ProjectTeamMembership {
  projectId: string;
  isPrimaryContact: boolean;  // Only for clients - distinguishes Client PM from Client Team
  joinedAt?: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  email?: string;

  // Permission-related fields
  projectTeamMemberships?: Record<string, ProjectTeamMembership>; // Map of projectId to membership

  // For backwards compatibility during migration
  displayRole?: string; // Optional display label
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'Todo' | 'In Progress' | 'Done' | 'pending' | 'in_progress' | 'awaiting_approval' | 'completed' | 'revision_requested';
  assignee?: User;
  assignees?: User[]; // Support for multiple assignees (team members can upload beta files only to assigned tasks)
  createdBy?: string; // User ID of task creator
  createdAt?: string; // ISO date string
  deadline?: string; // ISO date string
  assigneeId?: string; // Used by backend API
  followers?: string[]; // Array of user IDs following this task
  visibleToClient?: boolean;
}

// Deliverable status workflow
export type DeliverableStatus =
  | 'pending'           // Motionify team can upload, clients CANNOT view
  | 'in_progress'       // Team uploads files, clients still CANNOT view
  | 'beta_ready'        // Clients CAN view beta (watermarked), cannot approve yet
  | 'awaiting_approval' // Client PM can approve/reject, team CANNOT edit (locked)
  | 'approved'          // Awaiting payment, NO final file access until paid
  | 'rejected'          // Team can re-upload, revision count increments
  | 'payment_pending'   // Client PM must pay to proceed, final files withheld
  | 'final_delivered';  // Full access to final files, 365-day expiry countdown starts

export interface Deliverable {
  id: string;
  title: string;
  type: 'Video' | 'Image' | 'Document';
  status: DeliverableStatus;
  progress: number;
  dueDate: string;

  // Additional fields for permission checks
  betaFileUrl?: string;        // Beta version URL (watermarked)
  finalFileUrl?: string;       // Final version URL (only accessible after payment)
  uploadedBy?: string;         // User ID who uploaded
  approvedBy?: string;         // User ID who approved (Client PM)
  approvedAt?: string;         // ISO date string
  rejectedAt?: string;         // ISO date string
  rejectionReason?: string;    // Reason for rejection
  deliveredAt?: string;        // ISO date string when final delivered
  expiresAt?: string;          // ISO date string (365 days after deliveredAt)
}

export interface ActivityLog {
  id: string;
  type: string;
  userId: string;
  userName?: string;
  action: string;
  target: string;
  timestamp: string; // ISO date string
  details?: Record<string, string | number>;
}

export interface ProjectFile {
  id: string;
  projectId: string; // Foreign key
  name: string;
  type: string; // MIME type
  size: number; // Bytes
  key: string; // Storage key (R2)
  uploadedBy: User; // Who uploaded it
  uploadedAt: string; // ISO Date
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
  files: ProjectFile[]; // Added files array
  deliverablesCount: number; // Keep for backwards compatibility if needed, or derive
  revisionCount: number;
  maxRevisions: number;
  activityLog: ActivityLog[];
  // Terms acceptance tracking
  termsAcceptedAt?: string; // ISO date string
  termsAcceptedBy?: string; // User ID
}

export interface Payment {
  id: string;
  project_id?: string;
  proposal_id?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  payment_type: 'advance' | 'balance';
  created_at: string;
  paid_at?: string;
  razorpay_payment_id?: string;
  invoice_url?: string;
}
