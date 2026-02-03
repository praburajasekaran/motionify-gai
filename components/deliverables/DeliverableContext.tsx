/**
 * Deliverable Context - State Management
 *
 * Provides centralized state management for the deliverable approval workflow.
 * Handles deliverable list, approvals, rejections, revision tracking, and modal states.
 *
 * PERMISSION ENFORCEMENT:
 * - Approve/Reject actions now validate user permissions before execution
 * - Only Client Primary Contact can approve/reject when deliverable is awaiting_approval
 * - Permission violations throw errors with user-friendly messages
 */

import React, { createContext, useContext, useReducer, ReactNode, useEffect, useState } from 'react';
import {
  Deliverable,
  DeliverableApproval,
  DeliverableStatus,
  RevisionQuota,
  TimestampedComment,
  IssueCategory,
  FeedbackAttachment,
} from '../../types/deliverable.types';
import { Project, User } from '@/types';
import {
  canApproveDeliverable,
  canRequestRevisions,
  canSendForReview,
  getPermissionDeniedReason,
} from '@/utils/deliverablePermissions';

// Default revision quota - will be overwritten by project data from API
const DEFAULT_REVISION_QUOTA: RevisionQuota = {
  total: 3,
  used: 0,
  remaining: 3,
};

// Map deliverable status to progress percentage
const STATUS_PROGRESS_MAP: Record<DeliverableStatus, number> = {
  pending: 0,
  in_progress: 25,
  beta_ready: 50,
  awaiting_approval: 60,
  revision_requested: 40,
  approved: 75,
  payment_pending: 85,
  final_delivered: 100,
};

// Derive deliverable type from dominant file category
function deriveTypeFromFileCategory(category: string | null | undefined): 'Video' | 'Image' | 'Document' | null {
  if (category === 'video') return 'Video';
  if (category === 'image') return 'Image';
  if (category === 'document' || category === 'script') return 'Document';
  return null;
}

// Raw API response shape for deliverables
interface RawDeliverableResponse {
  id: string;
  project_id: string;
  name?: string;
  title?: string;
  description?: string;
  dominant_file_category?: string | null;
  status?: string;
  estimated_completion_week?: number;
  beta_file_key?: string;
  final_file_key?: string;
  revision_count?: number;
  approval_history?: DeliverableApproval[];
  delivery_notes?: string;
  version?: number;
}

// Transform API response to match Deliverable type
function transformApiDeliverable(d: RawDeliverableResponse): Deliverable {
  const status = (d.status || 'pending') as DeliverableStatus;
  return {
    id: d.id,
    projectId: d.project_id,
    title: d.name || d.title || 'Untitled',
    description: d.description || '',
    type: deriveTypeFromFileCategory(d.dominant_file_category),
    status,
    progress: STATUS_PROGRESS_MAP[status] ?? 0,
    dueDate: d.estimated_completion_week
      ? new Date(Date.now() + d.estimated_completion_week * 7 * 24 * 60 * 60 * 1000).toISOString()
      : new Date().toISOString(),
    betaFileUrl: d.beta_file_key ? `/api/deliverables/${d.id}/download?type=beta` : undefined,
    betaFileKey: d.beta_file_key,
    watermarked: !!d.beta_file_key && !d.final_file_key,
    finalFileUrl: d.final_file_key ? `/api/deliverables/${d.id}/download?type=final` : undefined,
    finalFileKey: d.final_file_key,
    finalDeliveredAt: d.final_delivered_at ? new Date(d.final_delivered_at) : undefined,
    approvalHistory: d.approval_history || [],
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface DeliverableState {
  deliverables: Deliverable[];
  quota: RevisionQuota;
  selectedDeliverable: Deliverable | null;
  isReviewModalOpen: boolean;
  isRevisionFormOpen: boolean;
  filter: DeliverableStatus | 'all';
  sortBy: 'dueDate' | 'status' | 'updated';

  // Revision form state
  revisionFeedback: {
    text: string;
    timestampedComments: TimestampedComment[];
    issueCategories: IssueCategory[];
    attachments: FeedbackAttachment[];
  };
}

// ============================================================================
// ACTIONS
// ============================================================================

type DeliverableAction =
  | { type: 'SET_DELIVERABLES'; deliverables: Deliverable[] }
  | { type: 'SET_QUOTA'; quota: RevisionQuota }
  | { type: 'DELETE_DELIVERABLE'; payload: string }
  | { type: 'APPROVE_DELIVERABLE'; id: string; userId: string; userName: string; userEmail: string }
  | { type: 'REJECT_DELIVERABLE'; id: string; approval: DeliverableApproval }
  | { type: 'OPEN_REVIEW_MODAL'; deliverable: Deliverable }
  | { type: 'CLOSE_REVIEW_MODAL' }
  | { type: 'OPEN_REVISION_FORM' }
  | { type: 'CLOSE_REVISION_FORM' }
  | { type: 'SET_FILTER'; filter: DeliverableStatus | 'all' }
  | { type: 'SET_SORT'; sortBy: 'dueDate' | 'status' | 'updated' }
  | { type: 'LOAD_DELIVERABLE_BY_ID'; deliverableId: string }
  | { type: 'ADD_TIMESTAMP_COMMENT'; timestamp: number; comment: string; userId: string; userName: string; userAvatar?: string }
  | { type: 'REMOVE_TIMESTAMP_COMMENT'; commentId: string }
  | { type: 'DELETE_COMMENT_BY_ID'; commentId: string; userId: string; isPrimaryContact: boolean }
  | { type: 'UPDATE_TIMESTAMP_COMMENT'; commentId: string; newText: string }
  | { type: 'UPDATE_FEEDBACK_TEXT'; text: string }
  | { type: 'TOGGLE_ISSUE_CATEGORY'; category: IssueCategory }
  | { type: 'ADD_ATTACHMENT'; file: FeedbackAttachment }
  | { type: 'REMOVE_ATTACHMENT'; fileId: string }
  | { type: 'RESET_REVISION_FORM' };

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: DeliverableState = {
  deliverables: [], // Will be loaded from API
  quota: DEFAULT_REVISION_QUOTA, // Will be loaded from project data
  selectedDeliverable: null,
  isReviewModalOpen: false,
  isRevisionFormOpen: false,
  filter: 'all',
  sortBy: 'dueDate',
  revisionFeedback: {
    text: '',
    timestampedComments: [],
    issueCategories: [],
    attachments: [],
  },
};

// ============================================================================
// REDUCER
// ============================================================================

function deliverableReducer(state: DeliverableState, action: DeliverableAction): DeliverableState {
  switch (action.type) {
    case 'SET_DELIVERABLES':
      return {
        ...state,
        deliverables: action.deliverables,
      };

    case 'SET_QUOTA':
      return {
        ...state,
        quota: action.quota,
      };

    case 'DELETE_DELIVERABLE':
      return {
        ...state,
        deliverables: state.deliverables.filter((d) => d.id !== action.payload),
      };

    case 'APPROVE_DELIVERABLE': {
      const approval: DeliverableApproval = {
        id: `appr-${Date.now()}`,
        deliverableId: action.id,
        action: 'approved',
        timestamp: new Date(),
        userId: action.userId,
        userName: action.userName,
        userEmail: action.userEmail,
      };

      return {
        ...state,
        deliverables: state.deliverables.map(d =>
          d.id === action.id
            ? {
              ...d,
              status: 'approved' as DeliverableStatus,
              approvalHistory: [...d.approvalHistory, approval],
            }
            : d
        ),
        isReviewModalOpen: false,
        selectedDeliverable: null,
      };
    }

    case 'REJECT_DELIVERABLE': {
      // Consume 1 revision from quota
      const newQuota: RevisionQuota = {
        ...state.quota,
        used: state.quota.used + 1,
        remaining: state.quota.remaining - 1,
      };

      return {
        ...state,
        deliverables: state.deliverables.map(d =>
          d.id === action.approval.deliverableId
            ? {
              ...d,
              status: 'revision_requested' as DeliverableStatus,
              approvalHistory: [...d.approvalHistory, action.approval],
            }
            : d
        ),
        quota: newQuota,
        isRevisionFormOpen: false,
        isReviewModalOpen: false,
        selectedDeliverable: null,
        revisionFeedback: initialState.revisionFeedback, // Reset form
      };
    }

    case 'OPEN_REVIEW_MODAL':
      return {
        ...state,
        selectedDeliverable: action.deliverable,
        isReviewModalOpen: true,
      };

    case 'CLOSE_REVIEW_MODAL':
      return {
        ...state,
        isReviewModalOpen: false,
        selectedDeliverable: null,
      };

    case 'OPEN_REVISION_FORM':
      return {
        ...state,
        isRevisionFormOpen: true,
      };

    case 'CLOSE_REVISION_FORM':
      return {
        ...state,
        isRevisionFormOpen: false,
        revisionFeedback: initialState.revisionFeedback, // Reset form on close
      };

    case 'SET_FILTER':
      return {
        ...state,
        filter: action.filter,
      };

    case 'SET_SORT':
      return {
        ...state,
        sortBy: action.sortBy,
      };

    case 'LOAD_DELIVERABLE_BY_ID': {
      const deliverable = state.deliverables.find(d => d.id === action.deliverableId);
      return {
        ...state,
        selectedDeliverable: deliverable || null,
      };
    }

    case 'ADD_TIMESTAMP_COMMENT': {
      const newComment: TimestampedComment = {
        id: `comment-${Date.now()}`,
        timestamp: action.timestamp,
        comment: action.comment,
        resolved: false,
        userId: action.userId,
        userName: action.userName,
        userAvatar: action.userAvatar,
        createdAt: new Date(),
      };

      return {
        ...state,
        revisionFeedback: {
          ...state.revisionFeedback,
          timestampedComments: [
            ...state.revisionFeedback.timestampedComments,
            newComment,
          ].sort((a, b) => a.timestamp - b.timestamp), // Keep sorted by timestamp
        },
      };
    }

    case 'REMOVE_TIMESTAMP_COMMENT':
      return {
        ...state,
        revisionFeedback: {
          ...state.revisionFeedback,
          timestampedComments: state.revisionFeedback.timestampedComments.filter(
            c => c.id !== action.commentId
          ),
        },
      };

    case 'DELETE_COMMENT_BY_ID': {
      // Permission check: Can delete if own comment OR is primary contact
      const canDelete = action.isPrimaryContact ||
        state.revisionFeedback.timestampedComments.find(c =>
          c.id === action.commentId && c.userId === action.userId
        );

      if (!canDelete) {
        throw new Error('You can only delete your own comments');
      }

      return {
        ...state,
        revisionFeedback: {
          ...state.revisionFeedback,
          timestampedComments: state.revisionFeedback.timestampedComments.filter(
            c => c.id !== action.commentId
          ),
        },
      };
    }

    case 'UPDATE_TIMESTAMP_COMMENT':
      return {
        ...state,
        revisionFeedback: {
          ...state.revisionFeedback,
          timestampedComments: state.revisionFeedback.timestampedComments.map(c =>
            c.id === action.commentId
              ? { ...c, comment: action.newText }
              : c
          ),
        },
      };

    case 'UPDATE_FEEDBACK_TEXT':
      return {
        ...state,
        revisionFeedback: {
          ...state.revisionFeedback,
          text: action.text,
        },
      };

    case 'TOGGLE_ISSUE_CATEGORY': {
      const categories = state.revisionFeedback.issueCategories;
      const exists = categories.includes(action.category);

      return {
        ...state,
        revisionFeedback: {
          ...state.revisionFeedback,
          issueCategories: exists
            ? categories.filter(c => c !== action.category)
            : [...categories, action.category],
        },
      };
    }

    case 'ADD_ATTACHMENT':
      return {
        ...state,
        revisionFeedback: {
          ...state.revisionFeedback,
          attachments: [...state.revisionFeedback.attachments, action.file],
        },
      };

    case 'REMOVE_ATTACHMENT':
      return {
        ...state,
        revisionFeedback: {
          ...state.revisionFeedback,
          attachments: state.revisionFeedback.attachments.filter(
            a => a.id !== action.fileId
          ),
        },
      };

    case 'RESET_REVISION_FORM':
      return {
        ...state,
        revisionFeedback: initialState.revisionFeedback,
      };

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface DeliverableContextType {
  state: DeliverableState;
  dispatch: React.Dispatch<DeliverableAction>;
  onConvertToTask?: (commentId: string, taskTitle: string, assigneeId: string) => void;

  // Permission-aware action helpers
  approveDeliverable: (deliverableId: string) => Promise<void>;
  rejectDeliverable: (deliverableId: string, approval: DeliverableApproval) => Promise<void>;
  deleteDeliverable: (deliverableId: string) => Promise<void>;
  sendForReview: (deliverableId: string) => Promise<void>;

  // Loading state
  isLoading: boolean;
  error: string | null;
  refreshDeliverables: () => Promise<void>;

  // Context data
  currentProject: Project;
  currentUser: User | null;
}

const DeliverableContext = createContext<DeliverableContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface DeliverableProviderProps {
  children: ReactNode;
  currentUser: User | null;
  currentProject: Project;
  onConvertToTask?: (commentId: string, taskTitle: string, assigneeId: string) => void;
}

export const DeliverableProvider: React.FC<DeliverableProviderProps> = ({
  children,
  currentUser,
  currentProject,
  onConvertToTask,
}) => {
  const [state, dispatch] = useReducer(deliverableReducer, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch deliverables from API when project changes
  useEffect(() => {
    const fetchDeliverables = async () => {
      if (!currentProject?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/deliverables?projectId=${currentProject.id}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || 'Failed to load deliverables');
        }

        const deliverables = await response.json();
        const transformedDeliverables = (deliverables || []).map(transformApiDeliverable);

        dispatch({ type: 'SET_DELIVERABLES', deliverables: transformedDeliverables });
      } catch (err) {
        console.error('[DeliverableContext] Failed to fetch deliverables:', err);
        setError(err instanceof Error ? err.message : 'Failed to load deliverables');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeliverables();
  }, [currentProject?.id]);

  // Sync revision quota from project data
  useEffect(() => {
    if (currentProject) {
      const total = currentProject.maxRevisions ?? 2;
      const used = currentProject.revisionCount ?? 0;
      dispatch({
        type: 'SET_QUOTA',
        quota: { total, used, remaining: total - used },
      });
    }
  }, [currentProject?.maxRevisions, currentProject?.revisionCount]);

  /**
   * Permission-aware approve action
   * Validates user permissions before calling API and dispatching APPROVE_DELIVERABLE
   */
  const approveDeliverable = async (deliverableId: string) => {
    if (!currentUser) {
      throw new Error('You must be logged in to approve deliverables');
    }

    const deliverable = state.deliverables.find(d => d.id === deliverableId);
    if (!deliverable) {
      throw new Error('Deliverable not found');
    }

    // Check permission
    if (!canApproveDeliverable(currentUser, deliverable, currentProject)) {
      const reason = getPermissionDeniedReason('approve', currentUser, deliverable, currentProject);
      throw new Error(reason);
    }

    // Call backend API to persist the status change
    const response = await fetch(`/api/deliverables/${deliverableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        status: 'approved',
        approved_by: currentUser.id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || errorData.message || 'Failed to approve deliverable');
    }

    // API success - dispatch local state update
    dispatch({
      type: 'APPROVE_DELIVERABLE',
      id: deliverableId,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email || '',
    });
  };

  /**
   * Permission-aware reject action
   * Validates user permissions before calling API and dispatching REJECT_DELIVERABLE
   * Uploads attachments to R2 and creates revision request with full feedback
   */
  const rejectDeliverable = async (deliverableId: string, approval: DeliverableApproval) => {
    if (!currentUser) {
      throw new Error('You must be logged in to request revisions');
    }

    const deliverable = state.deliverables.find(d => d.id === deliverableId);
    if (!deliverable) {
      throw new Error('Deliverable not found');
    }

    // Check permission
    if (!canRequestRevisions(currentUser, deliverable, currentProject)) {
      const reason = getPermissionDeniedReason('reject', currentUser, deliverable, currentProject);
      throw new Error(reason);
    }

    // Check revision quota
    if (state.quota.remaining <= 0) {
      throw new Error('No revision quota remaining. Please contact support to request additional revisions.');
    }

    // Step 1: Upload attachments to R2
    const uploadedAttachments: Array<{
      fileName: string;
      fileSize: number;
      fileType: string;
      r2Key: string;
    }> = [];

    for (const attachment of approval.attachments || []) {
      if (!attachment.file) continue;

      try {
        // Get presigned URL
        const presignRes = await fetch('/api/r2-presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            fileName: attachment.fileName,
            fileType: attachment.fileType,
            fileSize: attachment.fileSize,
          }),
        });

        if (!presignRes.ok) {
          const error = await presignRes.json().catch(() => ({}));
          throw new Error(error.error?.message || 'Failed to get upload URL');
        }

        const { uploadUrl, key } = await presignRes.json();

        // Upload to R2
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: attachment.file,
          headers: { 'Content-Type': attachment.fileType },
        });

        if (!uploadRes.ok) {
          throw new Error(`Failed to upload ${attachment.fileName}`);
        }

        uploadedAttachments.push({
          fileName: attachment.fileName,
          fileSize: attachment.fileSize,
          fileType: attachment.fileType,
          r2Key: key,
        });
      } catch (uploadError) {
        console.error(`Failed to upload attachment ${attachment.fileName}:`, uploadError);
        // Continue with other attachments even if one fails
      }
    }

    // Step 2: Create revision request via API
    const response = await fetch('/api/revision-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        deliverableId,
        feedbackText: approval.feedback || '',
        timestampedComments: approval.timestampedComments?.map(c => ({
          id: c.id,
          timestamp: c.timestamp,
          comment: c.comment,
          resolved: c.resolved,
          userId: c.userId,
          userName: c.userName,
        })),
        issueCategories: approval.issueCategories,
        attachments: uploadedAttachments,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || errorData.message || 'Failed to request revision');
    }

    // API success - dispatch local state update
    dispatch({
      type: 'REJECT_DELIVERABLE',
      id: deliverableId,
      approval,
    });
  };

  /**
   * Delete a deliverable (admin/PM only)
   * Calls backend API to delete deliverable and all associated files
   */
  const deleteDeliverable = async (deliverableId: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('You must be logged in to delete deliverables');
    }

    // Permission check: only super_admin and project_manager can delete
    if (currentUser.role !== 'super_admin' && currentUser.role !== 'project_manager') {
      throw new Error('Only administrators and project managers can delete deliverables');
    }

    const response = await fetch(`/api/deliverables/${deliverableId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.error || 'Failed to delete deliverable');
    }

    dispatch({ type: 'DELETE_DELIVERABLE', payload: deliverableId });
  };

  /**
   * Permission-aware send for review action
   * Transitions deliverable from beta_ready → awaiting_approval
   * Only Admin and PM can perform this action
   */
  const sendForReview = async (deliverableId: string) => {
    if (!currentUser) {
      throw new Error('You must be logged in to send deliverables for review');
    }

    const deliverable = state.deliverables.find(d => d.id === deliverableId);
    if (!deliverable) {
      throw new Error('Deliverable not found');
    }

    // Check permission
    if (!canSendForReview(currentUser, deliverable, currentProject)) {
      const reason = getPermissionDeniedReason('send_for_review', currentUser, deliverable, currentProject);
      throw new Error(reason);
    }

    // Call backend API to transition status
    const response = await fetch(`/api/deliverables/${deliverableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: 'awaiting_approval' }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || errorData.message || 'Failed to send for review');
    }
  };

  // Refresh function to reload deliverables
  const refreshDeliverables = async (): Promise<void> => {
    if (!currentProject?.id) return;

    dispatch({ type: 'SET_DELIVERABLES', deliverables: [] });
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/deliverables?projectId=${currentProject.id}`, {
        credentials: 'include',
      });
      const deliverables = await res.json();
      const transformedDeliverables = (deliverables || []).map(transformApiDeliverable);
      dispatch({ type: 'SET_DELIVERABLES', deliverables: transformedDeliverables });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deliverables');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DeliverableContext.Provider
      value={{
        state,
        dispatch,
        onConvertToTask,
        approveDeliverable,
        rejectDeliverable,
        deleteDeliverable,
        sendForReview,
        isLoading,
        error,
        refreshDeliverables,
        currentProject,
        currentUser,
      }}
    >
      {children}
    </DeliverableContext.Provider>
  );
};

// ============================================================================
// HOOK
// ============================================================================

export const useDeliverables = () => {
  const context = useContext(DeliverableContext);
  if (!context) {
    throw new Error('useDeliverables must be used within a DeliverableProvider');
  }
  return context;
};
