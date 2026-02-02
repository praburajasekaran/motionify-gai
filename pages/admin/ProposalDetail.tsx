import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { getProposalById, updateProposal, type Proposal, type ProposalDeliverable } from '../../lib/proposals';
import { fetchPaymentsForProposal, markPaymentAsPaid } from '../../services/paymentApi';
import { type Payment } from '../../types';
import { getInquiryById, type Inquiry } from '../../lib/inquiries';
import { ArrowLeft, Edit2, Save, X, Plus, Trash2, GripVertical, IndianRupee, DollarSign, CheckCircle2, XCircle, Clock, MessageSquare, Lock, Send } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { Permissions } from '../../lib/permissions';
import { CommentThread } from '../../components/proposals';
import { getStatusConfig } from '../../lib/status-config';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

interface DeliverableInput {
  id: string;
  name: string;
  description: string;
  estimatedCompletionWeek: number;
}

export function ProposalDetail() {
  const { proposalId } = useParams<{ proposalId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuthContext();

  const isAdmin = Permissions.canCreateProposals(user);
  const isClient = user?.role === 'client';

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]); // New state for payments
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [description, setDescription] = useState('');
  const [deliverables, setDeliverables] = useState<DeliverableInput[]>([]);
  const [totalPrice, setTotalPrice] = useState<string>('');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [advancePercentage, setAdvancePercentage] = useState<40 | 50 | 60>(50);
  const [revisionsIncluded, setRevisionsIncluded] = useState<number>(2);

  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);
  const [showForceEditDialog, setShowForceEditDialog] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!proposalId) {
        setIsDataLoading(false);
        return;
      }

      setIsDataLoading(true);
      const fetchedProposal = await getProposalById(proposalId);
      setProposal(fetchedProposal);

      if (fetchedProposal?.inquiryId) {
        const fetchedInquiry = await getInquiryById(fetchedProposal.inquiryId);
        setInquiry(fetchedInquiry);
      }

      // Fetch payments
      const fetchedPayments = await fetchPaymentsForProposal(proposalId);
      setPayments(fetchedPayments);

      setIsDataLoading(false);
    }
    fetchData();
  }, [proposalId]);

  useEffect(() => {
    if (isEditMode && proposal) {
      setDescription(proposal.description);
      setDeliverables(proposal.deliverables.map(d => ({ ...d })));
      setTotalPrice((proposal.totalPrice / 100).toString());
      setCurrency(proposal.currency);
      setAdvancePercentage(proposal.advancePercentage as 40 | 50 | 60);
      setRevisionsIncluded(proposal.revisionsIncluded ?? 2);
    }
  }, [isEditMode, proposal]);

  if (authLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Check if user has permission to view this proposal
  // Admins can view all, clients can only view their own (checked after data loads)
  if (!isAdmin && !isClient) {
    return <Navigate to="/" replace />;
  }

  // For clients, verify they own the inquiry this proposal belongs to
  if (isClient && inquiry) {
    // Note: clientUserId might be undefined if it wasn't set during inquiry creation
    if (inquiry.clientUserId && inquiry.clientUserId !== user?.id) {
      return <Navigate to="/" replace />;
    }
  }

  if (!proposal) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-foreground mb-2">Proposal Not Found</h2>
          <p className="text-muted-foreground mb-6">The proposal you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/admin/inquiries')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Inquiries
          </button>
        </div>
      </div>
    );
  }

  const handleAddDeliverable = () => {
    setDeliverables([
      ...deliverables,
      {
        id: crypto.randomUUID(),
        name: '',
        description: '',
        estimatedCompletionWeek: deliverables.length + 1,
      },
    ]);
  };

  const handleRemoveDeliverable = (id: string) => {
    if (deliverables.length === 1) {
      alert('You must have at least one deliverable');
      return;
    }
    setDeliverables(deliverables.filter((d) => d.id !== id));
  };

  const handleDeliverableChange = (
    id: string,
    field: keyof DeliverableInput,
    value: string | number
  ) => {
    setDeliverables(
      deliverables.map((d) =>
        d.id === id ? { ...d, [field]: value } : d
      )
    );
  };

  const calculatePricing = () => {
    const priceInPaise = parseFloat(totalPrice) * 100;
    if (isNaN(priceInPaise)) return null;

    const advanceAmount = Math.round((priceInPaise * advancePercentage) / 100);
    const balanceAmount = priceInPaise - advanceAmount;

    return {
      totalPrice: priceInPaise,
      advanceAmount,
      balanceAmount,
    };
  };

  const formatCurrency = (amountInSmallestUnit: number, curr: 'INR' | 'USD' = proposal.currency) => {
    const locale = curr === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 0,
    }).format(amountInSmallestUnit / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const validateForm = (): string | null => {
    if (!description.trim()) {
      return 'Please enter a project description';
    }

    for (const deliverable of deliverables) {
      if (!deliverable.name.trim()) {
        return 'All deliverables must have a name';
      }
      if (!deliverable.description.trim()) {
        return 'All deliverables must have a description';
      }
      if (deliverable.estimatedCompletionWeek < 1) {
        return 'Estimated completion week must be at least 1';
      }
    }

    if (!totalPrice.trim() || parseFloat(totalPrice) <= 0) {
      return 'Please enter a valid total price';
    }

    return null;
  };

  const handleSaveChanges = async () => {
    const error = validateForm();
    if (error) {
      alert(error);
      return;
    }

    const pricing = calculatePricing();
    if (!pricing) {
      alert('Invalid pricing');
      return;
    }

    setIsSaving(true);

    try {
      const updatedProposal = await updateProposal(proposal.id, {
        description: description.trim(),
        deliverables: deliverables.map((d) => ({
          id: d.id,
          name: d.name.trim(),
          description: d.description.trim(),
          estimatedCompletionWeek: d.estimatedCompletionWeek,
        })),
        currency,
        totalPrice: pricing.totalPrice,
        advancePercentage,
        advanceAmount: pricing.advanceAmount,
        balanceAmount: pricing.balanceAmount,
        revisionsIncluded,
      });

      setProposal(updatedProposal);
      alert('Proposal updated successfully!');
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating proposal:', error);
      alert('Failed to update proposal. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };



  const handleAcceptProposal = async () => {
    if (!proposal || !inquiry) return;
    if (!confirm('Are you sure you want to accept this proposal? This will move the project to the setup phase.')) return;

    setIsAccepting(true);
    try {
      // 1. Update Proposal Status
      const updatedProposal = await updateProposal(proposal.id, {
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      });
      setProposal(updatedProposal);

      // 2. Update Inquiry Status
      // We need to import updateInquiryStatus or just use updateInquiry if status logic isn't complex there.
      // Looking at imports, updateInquiry is imported.
      // Let's use updateInquiry directly as we want to be explicit.
      // Actually checking lib/inquiries.ts, updateInquiryStatus handles some side effects maybe?
      // updateInquiryStatus(id, status, additionalData)
      // But we haven't imported updateInquiryStatus at the top yet.
      // Let's stick to updateProposal for now and maybe update inquiry manually.

      // We need to update inquiry status to 'accepted'
      await import('../../lib/inquiries').then(({ updateInquiryStatus }) =>
        updateInquiryStatus(inquiry.id, 'accepted')
      );

      // Refresh inquiry data
      const updatedInquiry = await getInquiryById(inquiry.id);
      setInquiry(updatedInquiry);

      alert('Proposal accepted! You can now proceed to payment.');
    } catch (error) {
      console.error('Error accepting proposal:', error);
      alert('Failed to accept proposal. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRejectProposal = async (feedback: string) => {
    if (!proposal || !inquiry) return;

    setIsRejecting(true);
    try {
      const updatedProposal = await updateProposal(proposal.id, {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        feedback,
      });
      setProposal(updatedProposal);

      await import('../../lib/inquiries').then(({ updateInquiryStatus }) =>
        updateInquiryStatus(inquiry.id, 'rejected')
      );

      const updatedInquiry = await getInquiryById(inquiry.id);
      setInquiry(updatedInquiry);

      alert('Proposal rejected. We will review your feedback and get back to you.');
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      alert('Failed to reject proposal. Please try again.');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleRequestChanges = async (feedback: string) => {
    if (!proposal || !inquiry) return;

    setIsRequestingChanges(true);
    try {
      const updatedProposal = await updateProposal(proposal.id, {
        status: 'changes_requested',
        feedback,
      });
      setProposal(updatedProposal);

      await import('../../lib/inquiries').then(({ updateInquiryStatus }) =>
        updateInquiryStatus(inquiry.id, 'negotiating')
      );

      const updatedInquiry = await getInquiryById(inquiry.id);
      setInquiry(updatedInquiry);

      alert('Revision requested. We will review your feedback and send an updated proposal.');
    } catch (error) {
      console.error('Error requesting changes:', error);
      alert('Failed to request changes. Please try again.');
    } finally {
      setIsRequestingChanges(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    if (!confirm('Are you sure you want to mark this payment as paid? This will trigger project creation if applicable.')) return;

    try {
      await markPaymentAsPaid(paymentId);
      alert('Payment marked as paid successfully!');

      // Refresh payments and potentially proposal/inquiry status
      if (proposalId) {
        const updatedPayments = await fetchPaymentsForProposal(proposalId);
        setPayments(updatedPayments);

        // Also refresh proposal as status might have changed implicitly via backend logic if we were listening to it,
        // but explicit refresh is safer if backend modified related entities.
        // Logic in backend: project creation, etc.
      }
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      alert('Failed to mark payment as paid.');
    }
  };

  // Edit permission logic
  const getEditPermission = () => {
    if (!proposal) return { canEdit: false, canForceEdit: false, reason: '' };

    // changes_requested allows normal editing (revision cycle)
    if (proposal.status === 'changes_requested') {
      return { canEdit: true, canForceEdit: true, reason: '' };
    }

    // accepted/rejected = client responded, editing locked
    if (proposal.status === 'accepted' || proposal.status === 'rejected') {
      return {
        canEdit: false,
        canForceEdit: user?.role === 'super_admin',
        reason: 'Editing locked - client has responded to this proposal',
      };
    }

    // sent = waiting for client, editing locked
    if (proposal.status === 'sent') {
      return {
        canEdit: false,
        canForceEdit: user?.role === 'super_admin',
        reason: 'Editing locked - proposal sent to client, awaiting response',
      };
    }

    return { canEdit: true, canForceEdit: true, reason: '' };
  };

  const editPermission = proposal ? getEditPermission() : { canEdit: false, canForceEdit: false, reason: '' };

  const handleForceEdit = async () => {
    setShowForceEditDialog(false);
    setIsEditMode(true);

    // Log force edit action to activities
    try {
      const response = await fetch('/.netlify/functions/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'PROPOSAL_FORCE_EDITED',
          userId: user?.id,
          userName: user?.name,
          proposalId: proposal?.id,
          inquiryId: proposal?.inquiryId,
          details: {
            previousStatus: proposal?.status,
            reason: 'Super admin force edit override',
          },
        }),
      });
      if (!response.ok) console.error('Failed to log force edit activity');
    } catch (error) {
      console.error('Error logging force edit:', error);
    }
  };

  const handleResend = async () => {
    if (!proposal || proposal.status !== 'changes_requested') return;

    setIsResending(true);
    try {
      // Log resend activity
      await fetch('/.netlify/functions/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'PROPOSAL_SENT',
          userId: user?.id,
          userName: user?.name,
          proposalId: proposal.id,
          inquiryId: proposal.inquiryId,
          details: {
            version: (proposal.version || 1) + 1,
            action: 'resent_after_revision',
          },
        }),
      });

      // Update proposal status back to sent and increment version
      const updatedProposal = await updateProposal(proposal.id, {
        status: 'sent',
        version: (proposal.version || 1) + 1,
      });

      setProposal(updatedProposal);
      alert('Proposal resent to client!');
    } catch (error) {
      console.error('Error resending proposal:', error);
      alert('Failed to resend proposal. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const statusInfo = getStatusConfig(proposal.status);
  // Admin uses custom purple-themed colors, keeping original design
  const ADMIN_STATUS_COLORS = {
    sent: { color: 'bg-purple-500/10 text-purple-400 ring-purple-500/20', iconColor: 'text-purple-400' },
    accepted: { color: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20', iconColor: 'text-emerald-400' },
    rejected: { color: 'bg-red-500/10 text-red-400 ring-red-500/20', iconColor: 'text-red-400' },
    changes_requested: { color: 'bg-orange-500/10 text-orange-400 ring-orange-500/20', iconColor: 'text-orange-400' },
  };
  const adminColors = ADMIN_STATUS_COLORS[proposal.status];
  const StatusIcon = statusInfo.icon;

  const pricing = isEditMode ? calculatePricing() : {
    totalPrice: proposal.totalPrice,
    advanceAmount: proposal.advanceAmount,
    balanceAmount: proposal.balanceAmount,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(isClient ? (inquiry ? `/admin/inquiries/${inquiry.id}` : '/') : (inquiry ? `/admin/inquiries/${inquiry.id}` : '/admin/inquiries'))}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inquiry
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">Proposal</h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ring-1 ${adminColors.color}`}>
                <StatusIcon className={`w-4 h-4 ${adminColors.iconColor}`} />
                {statusInfo.adminLabel}
              </span>
            </div>
            {inquiry && (
              <p className="text-muted-foreground">
                For inquiry <code className="text-violet-600 font-mono">{inquiry.inquiryNumber}</code> - {inquiry.contactName}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              Created {formatDate(proposal.createdAt)}
              {proposal.updatedAt !== proposal.createdAt && ` • Updated ${formatDate(proposal.updatedAt)}`}
            </p>
          </div>

          {isAdmin && !isEditMode && (
            <>
              {editPermission.canEdit ? (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Proposal
                </button>
              ) : editPermission.canForceEdit ? (
                <button
                  onClick={() => setShowForceEditDialog(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors font-medium"
                >
                  <Lock className="w-4 h-4" />
                  Force Edit
                </button>
              ) : null}

              {/* Resend button for revision cycle */}
              {proposal.status === 'changes_requested' && (
                <button
                  onClick={handleResend}
                  disabled={isResending}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors font-medium disabled:opacity-50"
                >
                  {isResending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-green-700/30 border-t-green-700 rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Resend to Client
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Restriction Banner */}
      {isAdmin && !isEditMode && !editPermission.canEdit && editPermission.reason && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">{editPermission.reason}</p>
            {editPermission.canForceEdit && (
              <p className="text-xs text-amber-600 mt-1">
                As a super admin, you can use "Force Edit" to override this restriction.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Project Description */}
        <div className="bg-card rounded-xl p-6 ring-1 ring-border shadow-sm">
          <label className="block text-sm font-medium text-foreground mb-2">
            Project Description {isEditMode && <span className="text-red-600">*</span>}
          </label>
          {isEditMode ? (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                Describe the scope of work, objectives, and what the client can expect
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent resize-none"
                placeholder="Enter detailed project description..."
              />
            </>
          ) : (
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{proposal.description}</p>
          )}
        </div>

        {/* Deliverables */}
        <div className="bg-card rounded-xl p-6 ring-1 ring-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Deliverables</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {isEditMode ? 'Define what will be delivered to the client' : `${proposal.deliverables.length} deliverable${proposal.deliverables.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            {isEditMode && (
              <button
                onClick={handleAddDeliverable}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Deliverable
              </button>
            )}
          </div>

          <div className="space-y-4">
            {isEditMode ? (
              deliverables.map((deliverable, index) => (
                <div
                  key={deliverable.id}
                  className="bg-muted border border-border rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 mt-2">
                      <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />
                      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                    </div>

                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={deliverable.name}
                        onChange={(e) =>
                          handleDeliverableChange(deliverable.id, 'name', e.target.value)
                        }
                        placeholder="Deliverable name (e.g., 'Product Demo Video')"
                        className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent text-sm"
                      />

                      <textarea
                        value={deliverable.description}
                        onChange={(e) =>
                          handleDeliverableChange(deliverable.id, 'description', e.target.value)
                        }
                        placeholder="Describe what's included in this deliverable..."
                        rows={3}
                        className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent resize-none text-sm"
                      />

                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">Estimated completion:</label>
                        <input
                          type="number"
                          min="1"
                          value={deliverable.estimatedCompletionWeek}
                          onChange={(e) =>
                            handleDeliverableChange(
                              deliverable.id,
                              'estimatedCompletionWeek',
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-20 px-3 py-1.5 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent"
                        />
                        <span className="text-xs text-muted-foreground">
                          week{deliverable.estimatedCompletionWeek !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveDeliverable(deliverable.id)}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove deliverable"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              proposal.deliverables.map((deliverable, index) => (
                <div
                  key={deliverable.id}
                  className="bg-muted border border-border rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-violet-100 text-violet-700 rounded-full font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">{deliverable.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{deliverable.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Estimated completion: Week {deliverable.estimatedCompletionWeek}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Project Terms */}
        <div className="bg-card rounded-xl p-6 ring-1 ring-border shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Project Terms</h2>
          {isEditMode ? (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Revisions Included
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                Number of revision rounds included in this project
              </p>
              <input
                type="number"
                min="0"
                max="20"
                value={revisionsIncluded}
                onChange={(e) => setRevisionsIncluded(parseInt(e.target.value) || 0)}
                className="w-24 px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-violet-100 text-violet-700 rounded-full">
                <span className="text-sm font-semibold">{proposal.revisionsIncluded ?? 2}</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revisions Included</p>
                <p className="text-foreground font-medium">
                  {proposal.revisionsIncluded ?? 2} revision{(proposal.revisionsIncluded ?? 2) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="bg-card rounded-xl p-6 ring-1 ring-border shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Pricing</h2>

          {isEditMode ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Total Price */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Total Project Cost ({currency}) <span className="text-red-600">*</span>
                  </label>

                  {/* Currency Selector */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setCurrency('INR')}
                      className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${currency === 'INR'
                        ? 'bg-violet-500 text-white ring-2 ring-violet-400'
                        : 'bg-muted text-foreground hover:bg-muted'
                        }`}
                    >
                      INR (₹)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency('USD')}
                      className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${currency === 'USD'
                        ? 'bg-violet-500 text-white ring-2 ring-violet-400'
                        : 'bg-muted text-foreground hover:bg-muted'
                        }`}
                    >
                      USD ($)
                    </button>
                  </div>

                  <div className="relative">
                    {currency === 'INR' ? (
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    ) : (
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    )}
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={totalPrice}
                      onChange={(e) => setTotalPrice(e.target.value)}
                      placeholder="80000"
                      className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Advance Percentage */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Advance Payment Percentage
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[40, 50, 60].map((percentage) => (
                      <button
                        key={percentage}
                        onClick={() => setAdvancePercentage(percentage as 40 | 50 | 60)}
                        className={`px-4 py-3 rounded-lg font-medium transition-all ${advancePercentage === percentage
                          ? 'bg-violet-500 text-white ring-2 ring-violet-400'
                          : 'bg-muted text-foreground hover:bg-muted'
                          }`}
                      >
                        {percentage}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {/* Pricing Breakdown */}
          {pricing && (
            <div className={`${isEditMode ? 'mt-6' : ''} p-4 bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-lg border border-violet-200`}>
              <h3 className="text-sm font-medium text-foreground mb-3">Payment Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Advance Payment ({isEditMode ? advancePercentage : proposal.advancePercentage}%)</span>
                  <span className="text-foreground font-semibold">{formatCurrency(pricing.advanceAmount, isEditMode ? currency : proposal.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Balance Payment ({isEditMode ? 100 - advancePercentage : 100 - proposal.advancePercentage}%)</span>
                  <span className="text-foreground font-semibold">{formatCurrency(pricing.balanceAmount, isEditMode ? currency : proposal.currency)}</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between">
                  <span className="text-foreground font-medium">Total Project Cost</span>
                  <span className="text-foreground font-bold text-lg">{formatCurrency(pricing.totalPrice, isEditMode ? currency : proposal.currency)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Payments Section (Admin Only) */}
        {isAdmin && (
          <div className="bg-card rounded-xl p-6 ring-1 ring-border shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Payments</h2>
            {payments.length === 0 ? (
              <p className="text-muted-foreground text-sm">No payments found for this proposal.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(payment.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground capitalize">
                          {payment.payment_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {formatCurrency(payment.amount, payment.currency as 'INR' | 'USD')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${payment.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {payment.status === 'pending' && (
                            <button
                              onClick={() => handleMarkAsPaid(payment.id)}
                              className="text-violet-600 hover:text-violet-900"
                            >
                              Mark as Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Comments Section */}
        {proposal && user && (
          <CommentThread
            proposalId={proposal.id}
            currentUserId={user.id}
            currentUserName={user.name}
            isAuthenticated={!!user}
          />
        )}

        {/* Response Tracking */}
        {(proposal.acceptedAt || proposal.rejectedAt || proposal.feedback) && (
          <div className="bg-card rounded-xl p-6 ring-1 ring-border shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Client Response</h2>
            <div className="space-y-3">
              {proposal.acceptedAt && (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accepted on {formatDate(proposal.acceptedAt)}</span>
                </div>
              )}
              {proposal.rejectedAt && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <XCircle className="w-4 h-4" />
                  <span>{isClient ? 'Declined' : 'Rejected'} on {formatDate(proposal.rejectedAt)}</span>
                </div>
              )}
              {proposal.feedback && (
                <div className="mt-2 p-3 bg-muted rounded-lg border border-border">
                  <p className="text-sm font-medium text-foreground mb-1">Feedback:</p>
                  <p className="text-sm text-foreground">{proposal.feedback}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {isEditMode && (
          <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-card/80 backdrop-blur-sm p-4 -mx-4 border-t border-border">
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2.5 rounded-lg bg-muted text-foreground hover:bg-muted transition-colors font-medium border border-border"
              disabled={isSaving}
            >
              <X className="w-4 h-4 inline mr-2" />
              Cancel
            </button>

            <button
              onClick={handleSaveChanges}
              disabled={isSaving || validateForm() !== null}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 text-white font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}

        {/* Client Action Buttons */}
        {isClient && proposal.status === 'sent' && (
          <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-card/80 backdrop-blur-sm p-4 -mx-4 border-t border-border">
            <button
              onClick={() => {
                const feedback = prompt('Please provide a reason for rejecting the proposal:');
                if (feedback) handleRejectProposal(feedback);
              }}
              disabled={isRejecting || isAccepting || isRequestingChanges}
              className="px-4 py-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-medium border border-red-200"
            >
              {isRejecting ? 'Rejecting...' : 'Reject Proposal'}
            </button>

            <button
              onClick={() => {
                const feedback = prompt('Please describe the changes you would like to request:');
                if (feedback) handleRequestChanges(feedback);
              }}
              disabled={isRejecting || isAccepting || isRequestingChanges}
              className="px-4 py-2.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors font-medium border border-orange-200"
            >
              {isRequestingChanges ? 'Requesting...' : 'Request Revision'}
            </button>

            <button
              onClick={handleAcceptProposal}
              disabled={isRejecting || isAccepting || isRequestingChanges}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAccepting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Accept Proposal
                </>
              )}
            </button>
          </div>
        )}

        {/* Payment Button for Accepted Proposals */}
        {isClient && proposal.status === 'accepted' && (
          <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-card/80 backdrop-blur-sm p-4 -mx-4 border-t border-border">
            <div className="mr-auto text-sm text-muted-foreground">
              <span className="font-medium text-emerald-600">Proposal Accepted!</span> Please proceed to payment to start the project.
            </div>
            <button
              onClick={() => {
                navigate(`/payment/${proposal.id}`);
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors shadow-lg shadow-violet-500/20"
            >
              <DollarSign className="w-4 h-4" />
              Proceed to Payment
            </button>
          </div>
        )}
      </div>

      {/* Force Edit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showForceEditDialog}
        onClose={() => setShowForceEditDialog(false)}
        onConfirm={handleForceEdit}
        title="Force Edit Proposal?"
        message="This proposal has already received a client response. Editing it may cause confusion or inconsistency. Your action will be logged. Are you sure you want to proceed?"
        confirmLabel="Yes, Force Edit"
        cancelLabel="Cancel"
        variant="warning"
      />
    </div>
  );
}
