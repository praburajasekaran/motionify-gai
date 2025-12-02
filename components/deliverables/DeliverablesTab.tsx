/**
 * DeliverablesTab Component
 *
 * Main entry point for the deliverables feature.
 * Integrates all sub-components and manages the workflow.
 */

import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { DeliverableProvider, useDeliverables } from './DeliverableContext';
import { RevisionQuotaIndicator } from './RevisionQuotaIndicator';
import { DeliverablesList } from './DeliverablesList';
import { DeliverableReviewModal } from './DeliverableReviewModal';
import { RevisionRequestForm } from './RevisionRequestForm';
import { Deliverable, DeliverableApproval } from '../../types/deliverable.types';
import { CURRENT_USER } from '../../constants';

const DeliverablesTabContent: React.FC = () => {
  const { state, dispatch, onConvertToTask } = useDeliverables();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
      dispatch({
        type: 'APPROVE_DELIVERABLE',
        id: state.selectedDeliverable.id,
        userId: CURRENT_USER.id,
        userName: CURRENT_USER.name,
        userEmail: CURRENT_USER.email || 'user@example.com',
      });

      // Show success message
      setSuccessMessage('Deliverable approved successfully! Payment link will be sent to your email.');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  };

  const handleRequestRevision = () => {
    dispatch({ type: 'OPEN_REVISION_FORM' });
  };

  const handleSubmitRevision = (approval: DeliverableApproval) => {
    dispatch({ type: 'REJECT_DELIVERABLE', id: approval.deliverableId, approval });

    // Show success message
    setSuccessMessage('Revision request submitted successfully! The team will review within 2-3 business days.');
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 5000);
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

      {/* Revision Quota Indicator */}
      <RevisionQuotaIndicator quota={state.quota} />

      {/* Deliverables List */}
      <DeliverablesList
        deliverables={state.deliverables}
        filter={state.filter}
        sortBy={state.sortBy}
        onFilterChange={(filter) => dispatch({ type: 'SET_FILTER', filter })}
        onSortChange={(sortBy) => dispatch({ type: 'SET_SORT', sortBy })}
        onReviewDeliverable={handleReviewDeliverable}
      />

      {/* Review Modal */}
      <DeliverableReviewModal
        deliverable={state.selectedDeliverable}
        isOpen={state.isReviewModalOpen}
        onClose={handleCloseReviewModal}
        onApprove={handleApprove}
        onRequestRevision={handleRequestRevision}
        onConvertToTask={onConvertToTask}
      />

      {/* Revision Request Form */}
      <RevisionRequestForm
        deliverable={state.selectedDeliverable}
        isOpen={state.isRevisionFormOpen}
        onClose={() => dispatch({ type: 'CLOSE_REVISION_FORM' })}
        onSubmit={handleSubmitRevision}
        quota={state.quota}
        currentUserId={CURRENT_USER.id}
        currentUserName={CURRENT_USER.name}
        currentUserEmail={CURRENT_USER.email || 'user@example.com'}
      />
    </div>
  );
};

/**
 * Main export - wrapped with DeliverableProvider
 */
export const DeliverablesTab: React.FC<{ onConvertToTask?: (commentId: string, taskTitle: string, assigneeId: string) => void }> = ({ onConvertToTask }) => {
  return (
    <DeliverableProvider onConvertToTask={onConvertToTask}>
      <DeliverablesTabContent />
    </DeliverableProvider>
  );
};
