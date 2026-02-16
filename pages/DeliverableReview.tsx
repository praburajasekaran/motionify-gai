/**
 * DeliverableReview Page
 *
 * Dedicated page for reviewing a single deliverable with shareable URL.
 * Replaces the nested modal approach with a clean single-page experience.
 *
 * Features:
 * - Shareable URL: /projects/:id/deliverables/:deliverableId
 * - Single video player (no duplicates)
 * - Collaborative commenting (team members can add comments)
 * - Permission-based commenting (only Primary Contact can submit)
 * - Inline feedback form
 * - Approval history timeline
 *
 * URL Structure:
 * - /projects/5823632/deliverables/del-002
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Badge } from '@/components/ui/design-system';
import { DeliverableProvider, useDeliverables } from '@/components/deliverables/DeliverableContext';
import { DeliverableFilesList } from '@/components/deliverables/DeliverableFilesList';
import { DeliverableVideoSection } from '@/components/deliverables/DeliverableVideoSection';
import { DeliverableMetadataSidebar } from '@/components/deliverables/DeliverableMetadataSidebar';
import { InlineFeedbackForm } from '@/components/deliverables/InlineFeedbackForm';
import { ApprovalTimeline } from '@/components/deliverables/ApprovalTimeline';
import { DeliverableApproval } from '@/types/deliverable.types';
import { Project } from '@/types';
import { dbStatusToDisplay } from '@/utils/projectStatusMapping';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDeliverablePermissions } from '@/hooks/useDeliverablePermissions';
import { storageService } from '@/services/storage';
import { generateThumbnail } from '@/utils/thumbnail';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const DeliverableReviewContent: React.FC = () => {
  const { id: projectId, deliverableId } = useParams<{
    id: string;
    deliverableId: string;
  }>();
  const navigate = useNavigate();
  const { state, dispatch, approveDeliverable, rejectDeliverable, sendForReview, currentProject, currentUser, refreshDeliverables } =
    useDeliverables();

  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSendForReviewDialog, setShowSendForReviewDialog] = useState(false);
  const [isSendingForReview, setIsSendingForReview] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Load deliverable from URL - Re-run when deliverables are loaded
  useEffect(() => {
    if (deliverableId) {
      dispatch({ type: 'LOAD_DELIVERABLE_BY_ID', deliverableId });
    }
  }, [deliverableId, dispatch, state.deliverables.length]); // Depend on list length changes

  const deliverable = state.selectedDeliverable;
  const permissions = useDeliverablePermissions({
    deliverable: deliverable || undefined,
    project: currentProject,
  });

  // Handle back navigation
  const handleBack = () => {
    navigate(`/projects/${projectId}/3`); // Tab 3 = Deliverables
  };

  // Shared helper: refresh deliverables and reload current one
  const refreshCurrentDeliverable = async () => {
    await refreshDeliverables();
    if (deliverableId) {
      dispatch({ type: 'LOAD_DELIVERABLE_BY_ID', deliverableId });
    }
  };

  // Shared helper: show success toast
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 5000);
  };

  // Shared helper: show error toast
  const showError = (error: unknown, fallback: string) => {
    setErrorMessage(error instanceof Error ? error.message : fallback);
    setShowErrorMessage(true);
    setTimeout(() => setShowErrorMessage(false), 5000);
  };

  // Handle send for client review (beta_ready → awaiting_approval)
  const handleSendForReview = async () => {
    if (!deliverable) return;

    setIsSendingForReview(true);
    try {
      await sendForReview(deliverable.id);
      setShowSendForReviewDialog(false);
      showSuccess('Deliverable sent for client review! The client will receive an email notification.');
      await refreshCurrentDeliverable();
    } catch (error) {
      setShowSendForReviewDialog(false);
      showError(error, 'Failed to send for review');
    } finally {
      setIsSendingForReview(false);
    }
  };

  // Handle approve
  const handleApprove = async () => {
    if (!deliverable) return;

    setIsApproving(true);
    try {
      await approveDeliverable(deliverable.id);
      setShowApproveDialog(false);
      showSuccess('Deliverable approved successfully! Payment link will be sent to your email.');
      await refreshCurrentDeliverable();
    } catch (error) {
      setShowApproveDialog(false);
      showError(error, 'Failed to approve deliverable');
    } finally {
      setIsApproving(false);
    }
  };

  // Handle request revision button click
  const handleRequestRevisionClick = () => {
    setShowRevisionForm(true);
  };

  // Handle revision submission
  const handleSubmitRevision = async (approval: DeliverableApproval) => {
    try {
      await rejectDeliverable(approval.deliverableId, approval);
      showSuccess('Revision request submitted successfully! The team will review within 2-3 business days.');
      setShowRevisionForm(false);
      dispatch({ type: 'RESET_REVISION_FORM' });
      await refreshCurrentDeliverable();
    } catch (error) {
      showError(error, 'Failed to submit revision request');
    }
  };

  // Handle video commenting
  const handleAddComment = (timestamp: number, comment: string) => {
    if (!currentUser) return;
    dispatch({
      type: 'ADD_TIMESTAMP_COMMENT',
      timestamp,
      comment,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
    });
  };

  const handleRemoveComment = (commentId: string) => {
    if (!currentUser) return;
    const isPrimaryContact =
      currentUser.projectTeamMemberships?.[currentProject.id]?.isPrimaryContact || false;
    dispatch({
      type: 'DELETE_COMMENT_BY_ID',
      commentId,
      userId: currentUser.id,
      isPrimaryContact,
    });
  };

  const handleUpdateComment = (commentId: string, newText: string) => {
    dispatch({
      type: 'UPDATE_TIMESTAMP_COMMENT',
      commentId,
      newText,
    });
  };

  const handleUpload = async (file: File) => {
    if (!deliverable) return;

    try {
      setShowSuccessMessage(false); // Reset
      setSuccessMessage('Uploading file...');
      setShowSuccessMessage(true);

      const folder = 'beta'; // Default for empty state upload

      // Upload file to R2
      const key = await storageService.uploadFile(
        file,
        deliverable.projectId,
        folder
      );

      // Generate thumbnail if video
      if (file.type.startsWith('video/')) {
        try {
          const thumbnailFile = await generateThumbnail(file);
          if (thumbnailFile) {
            const thumbKey = key.replace(/\.[^/.]+$/, '-thumb.jpg');
            await storageService.uploadFile(thumbnailFile, deliverable.projectId, folder, undefined, thumbKey);
          }
        } catch (err) {
          console.warn("Thumbnail failed", err);
        }
      }

      // Determine file category from mime type
      const getFileCategory = (mimeType: string): string => {
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType === 'application/pdf' || mimeType.includes('document')) return 'document';
        if (mimeType.includes('text')) return 'script';
        return 'asset';
      };

      // Add file to deliverable_files table
      const fileResponse = await fetch('/api/deliverable-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          deliverable_id: deliverable.id,
          file_key: key,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          file_category: getFileCategory(file.type),
          is_final: false,
        }),
      });

      if (!fileResponse.ok) {
        throw new Error('Failed to save file record');
      }

      // If status is 'pending', update to 'beta_ready'
      if (deliverable.status === 'pending') {
        await fetch(`/api/deliverables/${deliverable.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: 'beta_ready' }),
        });
      }

      setSuccessMessage('File uploaded successfully!');

      // Refresh file list
      if ((window as any).__refreshDeliverableFiles) {
        (window as any).__refreshDeliverableFiles();
      }

      // Also refresh deliverables for status update
      await refreshCurrentDeliverable();

      // Allow success message to show for a bit
      setTimeout(() => setShowSuccessMessage(false), 3000);

    } catch (error) {
      console.error('Upload error:', error);
      setShowSuccessMessage(false);
      showError(error, 'Failed to upload file');
    }
  };

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-muted-foreground">Loading deliverable...</p>
        </div>
      </div>
    );
  }

  if (!deliverable) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Deliverable not found</p>
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deliverables
          </Button>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'secondary',
    in_progress: 'info',
    beta_ready: 'warning',
    awaiting_approval: 'info',
    approved: 'success',
    revision_requested: 'destructive',
    payment_pending: 'warning',
    final_delivered: 'success',
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

      {/* Send for Review Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showSendForReviewDialog}
        onClose={() => setShowSendForReviewDialog(false)}
        onConfirm={handleSendForReview}
        title="Send for Client Review?"
        message="This will notify the client that the deliverable is ready for their review. They will be able to approve or request revisions."
        confirmLabel="Send for Review"
        cancelLabel="Cancel"
        variant="warning"
        isLoading={isSendingForReview}
      />

      {/* Approve Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showApproveDialog}
        onClose={() => setShowApproveDialog(false)}
        onConfirm={handleApprove}
        title={`Approve "${deliverable?.title}"?`}
        message="After approval, you'll receive a payment link to complete the balance payment, and final files will be delivered within 24 hours."
        confirmLabel="Approve Deliverable"
        cancelLabel="Cancel"
        variant="warning"
        isLoading={isApproving}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-3 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deliverables
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {deliverable.title}
          </h1>
          <p className="text-sm text-muted-foreground">{deliverable.description}</p>
        </div>
        <Badge
          variant={statusColors[currentUser?.role === 'client' && deliverable.status === 'beta_ready' ? 'in_progress' : deliverable.status] as any}
          className="shrink-0 text-sm px-3 py-1"
        >
          {(currentUser?.role === 'client' && deliverable.status === 'beta_ready' ? 'in_progress' : deliverable.status).replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Video & Feedback Form (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player with Timeline Comments */}
          <DeliverableVideoSection
            deliverable={deliverable}
            canRequestRevision={permissions.canReject}
            canComment={permissions.canComment}
            canUploadBeta={permissions.canUploadBeta}
            comments={state.revisionFeedback.timestampedComments}
            onAddComment={handleAddComment}
            onRemoveComment={handleRemoveComment}
            onUpdateComment={handleUpdateComment}
            onUpload={handleUpload}
          />

          {/* File List Section */}
          <DeliverableFilesList
            deliverable={deliverable}
            canUploadBeta={permissions.canUploadBeta}
            onUpload={handleUpload}
          />

          {/* Inline Feedback Form (shown when "Request Revision" clicked) */}
          {showRevisionForm && permissions.canReject && (
            <InlineFeedbackForm
              deliverable={deliverable}
              onSubmit={handleSubmitRevision}
              quota={state.quota}
              currentUserId={currentUser?.id || ''}
              currentUserName={currentUser?.name || ''}
              currentUserEmail={currentUser?.email || ''}
              allComments={state.revisionFeedback.timestampedComments}
            />
          )}

          {/* Approval History */}
          {deliverable.approvalHistory.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-foreground">Review History</h3>
              <ApprovalTimeline approvalHistory={deliverable.approvalHistory} />
            </div>
          )}
        </div>

        {/* Right Column - Metadata Sidebar (1/3 width) */}
        <div className="lg:col-span-1">
          <DeliverableMetadataSidebar
            deliverable={deliverable}
            project={currentProject}
            onApprove={() => setShowApproveDialog(true)}
            onRequestRevision={handleRequestRevisionClick}
            onSendForReview={() => setShowSendForReviewDialog(true)}
            isSendingForReview={isSendingForReview}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Main Export - wrapped with DeliverableProvider
 */
export const DeliverableReview: React.FC = () => {
  const { user } = useAuthContext();
  const { id: projectId } = useParams<{ id: string }>();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProject = async () => {
      // Fetch project from API
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          // Transform API response to Project type
          const project: Project = {
            id: data.id,
            title: data.name || data.project_number || `Project ${data.id.slice(0, 8)}`,
            client: data.client_name || 'Client',
            thumbnail: '',
            status: dbStatusToDisplay(data.status),
            dueDate: data.due_date || data.created_at || new Date().toISOString(),
            startDate: data.start_date || data.created_at || new Date().toISOString(),
            progress: 0,
            description: '',
            tasks: [],
            team: [],
            budget: 0,
            deliverables: [],
            files: [],
            deliverablesCount: 0,
            revisionCount: data.revisions_used || 0,
            maxRevisions: data.total_revisions_allowed || 2,
            activityLog: [],
            termsAcceptedAt: data.terms_accepted_at,
            termsAcceptedBy: data.terms_accepted_by,
          };
          setCurrentProject(project);
        }
      } catch (error) {
        console.error('Failed to fetch project:', error);
      }
      setIsLoading(false);
    };

    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user || !currentProject) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>Project not found</p>
      </div>
    );
  }

  return (
    <DeliverableProvider currentUser={user} currentProject={currentProject}>
      <DeliverableReviewContent />
    </DeliverableProvider>
  );
};
