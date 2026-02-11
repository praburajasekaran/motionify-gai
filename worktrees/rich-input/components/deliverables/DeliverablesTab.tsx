/**
 * DeliverablesTab Component
 *
 * Main entry point for the deliverables feature.
 * Integrates all sub-components and manages the workflow.
 *
 * PERMISSION ENFORCEMENT:
 * - Now uses real authentication instead of mock CURRENT_USER
 * - Approval/rejection actions validated through DeliverableContext
 * - Requires currentProject prop for permission checks
 */

import React, { useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { DeliverableProvider, useDeliverables } from './DeliverableContext';
import { RevisionQuotaIndicator } from './RevisionQuotaIndicator';
import { DeliverablesList } from './DeliverablesList';
import { DeliverableReviewModal } from './DeliverableReviewModal';
import { RevisionRequestForm } from './RevisionRequestForm';
import { Deliverable, DeliverableApproval } from '../../types/deliverable.types';
import { Project } from '@/types';
import { useAuth } from '@/hooks/useAuth';

const DeliverablesTabContent: React.FC = () => {
  const { state, dispatch, onConvertToTask, approveDeliverable, rejectDeliverable, currentProject, currentUser } = useDeliverables();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleReviewDeliverable = (deliverable: Deliverable) => {
    dispatch({ type: 'OPEN_REVIEW_MODAL', deliverable });
  };

  const handleCloseReviewModal = () => {
    dispatch({ type: 'CLOSE_REVIEW_MODAL' });
    dispatch({ type: 'CLOSE_REVISION_FORM' });
  };

  const handleApprove = () => {
    if (!state.selectedDeliverable) return;

    // Show confirmation and approve
    const confirmed = window.confirm(
      `Are you sure you want to approve "${state.selectedDeliverable.title}"?\n\nAfter approval, you'll receive a payment link to complete the balance payment, and final files will be delivered within 24 hours.`
    );

    if (confirmed) {
      try {
        // Use permission-aware approve method
        approveDeliverable(state.selectedDeliverable.id);

        // Show success message
        setSuccessMessage('Deliverable approved successfully! Payment link will be sent to your email.');
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 5000);
      } catch (error) {
        // Show error message if permission denied
        setErrorMessage(error instanceof Error ? error.message : 'Failed to approve deliverable');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
      }
    }
  };

  const handleRequestRevision = () => {
    dispatch({ type: 'OPEN_REVISION_FORM' });
  };

  const handleSubmitRevision = (approval: DeliverableApproval) => {
    try {
      // Use permission-aware reject method
      rejectDeliverable(approval.deliverableId, approval);

      // Show success message
      setSuccessMessage('Revision request submitted successfully! The team will review within 2-3 business days.');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    } catch (error) {
      // Show error message if permission denied
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit revision request');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Message Toast */}
      {showSuccessMessage && (
        <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message Toast */}
      {showErrorMessage && (
        <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Revision Quota Indicator */}
      <RevisionQuotaIndicator quota={state.quota} />

      {/* Deliverables List */}
      <DeliverablesList
        deliverables={state.deliverables}
        filter={state.filter}
        sortBy={state.sortBy}
        onFilterChange={(filter) => dispatch({ type: 'SET_FILTER', filter })}
        onSortChange={(sortBy) => dispatch({ type: 'SET_SORT', sortBy })}
      />

      {/* Review Modal */}
      <DeliverableReviewModal
        deliverable={state.selectedDeliverable}
        project={currentProject}
        isOpen={state.isReviewModalOpen}
        onClose={handleCloseReviewModal}
        onApprove={handleApprove}
        onRequestRevision={handleRequestRevision}
        onConvertToTask={onConvertToTask}
        quota={state.quota}
      />

      {/* Revision Request Form */}
      <RevisionRequestForm
        deliverable={state.selectedDeliverable}
        isOpen={state.isRevisionFormOpen}
        onClose={() => dispatch({ type: 'CLOSE_REVISION_FORM' })}
        onSubmit={handleSubmitRevision}
        quota={state.quota}
        currentUserId={currentUser?.id || ''}
        currentUserName={currentUser?.name || ''}
        currentUserEmail={currentUser?.email || ''}
        currentUserAvatar={currentUser?.avatar}
      />
    </div>
  );
};

/**
 * Main export - wrapped with DeliverableProvider
 *
 * @param project - Current project (required for permission checks)
 * @param onConvertToTask - Optional callback for converting comments to tasks
 */
interface DeliverablesTabProps {
  project: Project;
  onConvertToTask?: (commentId: string, taskTitle: string, assigneeId: string) => void;
}

export const DeliverablesTab: React.FC<DeliverablesTabProps> = ({ project, onConvertToTask }) => {
  const { user } = useAuth();

  if (!user || !project) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>Loading deliverables...</p>
      </div>
    );
  }

  return (
    <DeliverableProvider
      currentUser={user}
      currentProject={project}
      onConvertToTask={onConvertToTask}
    >
      <DeliverablesTabContent />
    </DeliverableProvider>
  );
};
