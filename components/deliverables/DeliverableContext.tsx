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

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import {
  Deliverable,
  DeliverableApproval,
  DeliverableStatus,
  RevisionQuota,
  TimestampedComment,
  IssueCategory,
  FeedbackAttachment,
} from '../../types/deliverable.types';
import { MOCK_DELIVERABLES, MOCK_REVISION_QUOTA } from './mockDeliverables';
import { Project, User } from '@/types';
import {
  canApproveDeliverable,
  canRequestRevisions,
  getPermissionDeniedReason,
} from '@/utils/deliverablePermissions';

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
  deliverables: MOCK_DELIVERABLES,
  quota: MOCK_REVISION_QUOTA,
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
              status: 'rejected' as DeliverableStatus,
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
  approveDeliverable: (deliverableId: string) => void;
  rejectDeliverable: (deliverableId: string, approval: DeliverableApproval) => void;

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

  /**
   * Permission-aware approve action
   * Validates user permissions before dispatching APPROVE_DELIVERABLE
   */
  const approveDeliverable = (deliverableId: string) => {
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

    // Permission granted - dispatch action
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
   * Validates user permissions before dispatching REJECT_DELIVERABLE
   */
  const rejectDeliverable = (deliverableId: string, approval: DeliverableApproval) => {
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

    // Permission granted - dispatch action
    dispatch({
      type: 'REJECT_DELIVERABLE',
      id: deliverableId,
      approval,
    });
  };

  return (
    <DeliverableContext.Provider
      value={{
        state,
        dispatch,
        onConvertToTask,
        approveDeliverable,
        rejectDeliverable,
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
