export * from './auth.types';

export enum ActivityType {
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_DELETED = 'TASK_DELETED',
  REVISION_REQUESTED = 'REVISION_REQUESTED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  FILE_UPLOADED = 'FILE_UPLOADED',
  FILE_DELETED = 'FILE_DELETED',
  FILE_RENAMED = 'FILE_RENAMED',
  FILE_DOWNLOADED = 'FILE_DOWNLOADED',
  TEAM_MEMBER_INVITED = 'TEAM_MEMBER_INVITED',
  TEAM_MEMBER_REMOVED = 'TEAM_MEMBER_REMOVED',
  TEAM_UPDATED = 'TEAM_UPDATED',
  PROPOSAL_SENT = 'PROPOSAL_SENT',
  PROPOSAL_ACCEPTED = 'PROPOSAL_ACCEPTED',
  PROPOSAL_REJECTED = 'PROPOSAL_REJECTED',
  PROPOSAL_CHANGES_REQUESTED = 'PROPOSAL_CHANGES_REQUESTED',
}

export interface Activity {
  id: string;
  type: ActivityType;
  userId: string;
  userName: string;
  targetUserId?: string;
  targetUserName?: string;
  inquiryId?: string;
  proposalId?: string;
  projectId?: string;
  details: Record<string, string | number>;
  timestamp: number;
}
