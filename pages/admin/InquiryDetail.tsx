import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import { getInquiryById, updateInquiry, type InquiryStatus, type Inquiry } from '../../lib/inquiries';
import { getProposalById, type Proposal } from '../../lib/proposals';
import { ArrowLeft, Mail, User, Building2, Phone, FileText, Calendar, Plus, CheckCircle2, Clock, Send, Eye, Copy, Edit2, X } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { Permissions } from '../../lib/permissions';

const STATUS_COLORS: Record<InquiryStatus, string> = {
  new: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
  reviewing: 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20',
  proposal_sent: 'bg-purple-500/10 text-purple-400 ring-purple-500/20',
  negotiating: 'bg-orange-500/10 text-orange-400 ring-orange-500/20',
  accepted: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  project_setup: 'bg-cyan-500/10 text-cyan-400 ring-cyan-500/20',
  payment_pending: 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20',
  paid: 'bg-green-500/10 text-green-400 ring-green-500/20',
  converted: 'bg-emerald-600/10 text-emerald-600 ring-emerald-600/20',
  rejected: 'bg-red-500/10 text-red-400 ring-red-500/20',
  archived: 'bg-gray-500/10 text-gray-400 ring-gray-500/20',
};

const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  proposal_sent: 'Proposal Sent',
  negotiating: 'Negotiating',
  accepted: 'Accepted',
  project_setup: 'Setting Up',
  payment_pending: 'Payment Pending',
  paid: 'Paid',
  converted: 'Converted',
  rejected: 'Rejected',
  archived: 'Archived',
};

export function InquiryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading } = useAuthContext();
  const [copied, setCopied] = useState(false);

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editFormData, setEditFormData] = useState({
    contactName: '',
    contactEmail: '',
    companyName: '',
    contactPhone: '',
    projectNotes: '',
  });

  useEffect(() => {
    async function fetchData() {
      if (!id) {
        setDataLoading(false);
        return;
      }
      try {
        const inquiryData = await getInquiryById(id);
        setInquiry(inquiryData);

        if (inquiryData?.proposalId) {
          const proposalData = await getProposalById(inquiryData.proposalId);
          setProposal(proposalData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setDataLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (isLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const isAdmin = Permissions.canCreateProposals(user);
  const isClient = user?.role === 'client';

  if (!isAdmin && !isClient) {
    return <Navigate to="/" replace />;
  }

  const handleCopyProposalLink = () => {
    if (!inquiry?.proposalId || !proposal) return;

    const proposalData = {
      proposal: {
        id: proposal.id,
        inquiryId: proposal.inquiryId,
        status: proposal.status,
        version: proposal.version,
        createdAt: proposal.createdAt,
        updatedAt: proposal.updatedAt,
        description: proposal.description,
        deliverables: proposal.deliverables,
        currency: proposal.currency,
        totalPrice: proposal.totalPrice,
        advancePercentage: proposal.advancePercentage,
        advanceAmount: proposal.advanceAmount,
        balanceAmount: proposal.balanceAmount,
      },
      inquiry: {
        id: inquiry.id,
        inquiryNumber: inquiry.inquiryNumber,
        contactName: inquiry.contactName,
        contactEmail: inquiry.contactEmail,
        companyName: inquiry.companyName,
      }
    };

    const encodedData = btoa(JSON.stringify(proposalData));
    const link = `http://localhost:5174/proposal/${inquiry.proposalId}?data=${encodedData}`;

    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenEditModal = () => {
    if (!inquiry) return;
    setEditFormData({
      contactName: inquiry.contactName,
      contactEmail: inquiry.contactEmail,
      companyName: inquiry.companyName || '',
      contactPhone: inquiry.contactPhone || '',
      projectNotes: inquiry.projectNotes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!inquiry?.id) return;

    setIsSaving(true);
    try {
      const updated = await updateInquiry(inquiry.id, {
        contactName: editFormData.contactName,
        contactEmail: editFormData.contactEmail,
        companyName: editFormData.companyName || undefined,
        contactPhone: editFormData.contactPhone || undefined,
        projectNotes: editFormData.projectNotes || undefined,
      });

      setInquiry(updated);
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating inquiry:', error);
      alert('Failed to update inquiry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!inquiry) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Inquiry Not Found</h2>
          <p className="text-muted-foreground mb-6">The inquiry you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/admin/inquiries')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Inquiries
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(isClient ? '/' : '/admin/inquiries')}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {isClient ? 'Back to Dashboard' : 'Back to Inquiries'}
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <code className="text-2xl font-bold text-foreground font-mono">
                {inquiry.inquiryNumber}
              </code>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ring-1 ${STATUS_COLORS[inquiry.status]}`}>
                {STATUS_LABELS[inquiry.status]}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Submitted {formatDate(inquiry.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isClient && inquiry.status === 'new' && (
              <button
                onClick={handleOpenEditModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors border border-border"
              >
                <Edit2 className="w-4 h-4" />
                Edit Inquiry
              </button>
            )}

            {isAdmin && inquiry.status === 'new' ? (
              <button
                onClick={() => navigate(`/admin/inquiries/${inquiry.id}/proposal`)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 text-white font-medium hover:shadow-lg transition-shadow"
              >
                <Plus className="w-4 h-4" />
                Create Proposal
              </button>
            ) : inquiry.proposalId ? (
              <button
                onClick={() => navigate(`/admin/proposals/${inquiry.proposalId}`)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors"
              >
                <Eye className="w-4 h-4" />
                View Proposal
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-card rounded-xl p-6 ring-1 ring-border">
            <h2 className="text-lg font-semibold text-card-foreground mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="text-card-foreground font-medium">{inquiry.contactName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a href={`mailto:${inquiry.contactEmail}`} className="text-primary hover:text-primary/80 transition-colors">
                    {inquiry.contactEmail}
                  </a>
                </div>
              </div>

              {inquiry.companyName && (
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="text-card-foreground font-medium">{inquiry.companyName}</p>
                  </div>
                </div>
              )}

              {inquiry.contactPhone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <a href={`tel:${inquiry.contactPhone}`} className="text-card-foreground font-medium hover:text-primary transition-colors">
                      {inquiry.contactPhone}
                    </a>
                  </div>
                </div>
              )}

              {inquiry.projectNotes && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">Additional Notes</p>
                    <p className="text-card-foreground text-sm leading-relaxed bg-muted rounded-lg p-3 border border-border">
                      {inquiry.projectNotes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quiz Answers */}
          <div className="bg-card rounded-xl p-6 ring-1 ring-border">
            <h2 className="text-lg font-semibold text-card-foreground mb-4">Quiz Answers</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-4 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Industry/Niche</p>
                <p className="text-foreground font-medium">{inquiry.quizAnswers.niche}</p>
              </div>

              <div className="bg-muted rounded-lg p-4 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Target Audience</p>
                <p className="text-foreground font-medium">{inquiry.quizAnswers.audience}</p>
              </div>

              <div className="bg-muted rounded-lg p-4 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Video Style</p>
                <p className="text-foreground font-medium">{inquiry.quizAnswers.style}</p>
              </div>

              <div className="bg-muted rounded-lg p-4 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Mood/Tone</p>
                <p className="text-foreground font-medium">{inquiry.quizAnswers.mood}</p>
              </div>

              <div className="bg-muted rounded-lg p-4 border border-border sm:col-span-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Video Duration</p>
                <p className="text-foreground font-medium">{inquiry.quizAnswers.duration}</p>
              </div>
            </div>

            {/* Recommendation */}
            <div className="mt-4 p-4 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 rounded-lg border border-violet-500/20">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Recommended Video Type</p>
                  <p className="text-foreground font-semibold text-lg">{inquiry.recommendedVideoType}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Activity Timeline */}
          <div className="bg-card rounded-xl p-6 ring-1 ring-border">
            <h2 className="text-lg font-semibold text-card-foreground mb-4">Activity Timeline</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="w-px h-full bg-border mt-2" />
                </div>
                <div className="pb-6">
                  <p className="text-card-foreground font-medium mb-1">Inquiry Created</p>
                  <p className="text-xs text-muted-foreground">{formatDate(inquiry.createdAt)}</p>
                </div>
              </div>

              {inquiry.status === 'proposal_sent' && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Send className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="w-px h-full bg-border mt-2" />
                  </div>
                  <div className="pb-6">
                    <p className="text-card-foreground font-medium mb-1">Proposal Sent</p>
                    <p className="text-xs text-muted-foreground">{formatDate(inquiry.updatedAt)}</p>
                  </div>
                </div>
              )}

              {inquiry.status === 'accepted' && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-card-foreground font-medium mb-1">Proposal Accepted</p>
                    <p className="text-xs text-muted-foreground">{formatDate(inquiry.updatedAt)}</p>
                  </div>
                </div>
              )}

              {inquiry.status === 'converted' && inquiry.convertedAt && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-card-foreground font-medium mb-1">Converted to Project</p>
                    <p className="text-xs text-muted-foreground">{formatDate(inquiry.convertedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-xl p-6 ring-1 ring-border">
            <h2 className="text-lg font-semibold text-card-foreground mb-4">
              {isClient ? 'Status & Actions' : 'Quick Actions'}
            </h2>
            <div className="space-y-2">
              {isClient && inquiry.status === 'new' && (
                <>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Inquiry Received
                    </p>
                    <p className="text-xs text-blue-700">
                      We're reviewing your inquiry and will send you a proposal soon.
                    </p>
                  </div>

                  <button
                    onClick={handleOpenEditModal}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors"
                  >
                    <span>Edit Inquiry</span>
                    <Edit2 className="w-4 h-4" />
                  </button>
                </>
              )}

              {isClient && inquiry.status === 'proposal_sent' && (
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm font-medium text-purple-900 mb-1">
                    Proposal Ready
                  </p>
                  <p className="text-xs text-purple-700">
                    Your proposal is ready for review. Check your email for the link.
                  </p>
                </div>
              )}

              {isAdmin && inquiry.status === 'new' && (
                <button
                  onClick={() => navigate(`/admin/inquiries/${inquiry.id}/proposal`)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 text-white font-medium hover:shadow-lg transition-shadow"
                >
                  <span>Create Proposal</span>
                  <Plus className="w-4 h-4" />
                </button>
              )}

              {isAdmin && inquiry.proposalId && (
                <>
                  <button
                    onClick={handleCopyProposalLink}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors"
                  >
                    <span>
                      {copied ? 'Link Copied!' : 'Copy Proposal Link'}
                      {proposal && proposal.version > 1 && (
                        <span className="ml-2 text-xs opacity-75">(v{proposal.version})</span>
                      )}
                    </span>
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  {inquiry.status === 'negotiating' && proposal?.feedback && (
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <p className="text-xs font-medium text-orange-800 mb-1">
                        Client Feedback:
                      </p>
                      <p className="text-sm text-orange-700">
                        {proposal.feedback}
                      </p>
                    </div>
                  )}
                </>
              )}

              {inquiry.proposalId && (
                <button
                  onClick={() => navigate(`/admin/proposals/${inquiry.proposalId}`)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors"
                >
                  <span>View Proposal</span>
                  <Eye className="w-4 h-4" />
                </button>
              )}

              {isAdmin && (
                <>
                  <a
                    href={`mailto:${inquiry.contactEmail}?subject=Re: Your inquiry ${inquiry.inquiryNumber}`}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors border border-border"
                  >
                    <span>Send Email</span>
                    <Mail className="w-4 h-4" />
                  </a>

                  {inquiry.contactPhone && (
                    <a
                      href={`tel:${inquiry.contactPhone}`}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors border border-border"
                    >
                      <span>Call Contact</span>
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-card-foreground">Edit Inquiry</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={editFormData.contactName}
                  onChange={(e) => setEditFormData({ ...editFormData, contactName: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={editFormData.contactEmail}
                  onChange={(e) => setEditFormData({ ...editFormData, contactEmail: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Company Name (Optional)
                </label>
                <input
                  type="text"
                  value={editFormData.companyName}
                  onChange={(e) => setEditFormData({ ...editFormData, companyName: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={editFormData.contactPhone}
                  onChange={(e) => setEditFormData({ ...editFormData, contactPhone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={editFormData.projectNotes}
                  onChange={(e) => setEditFormData({ ...editFormData, projectNotes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Any additional information about your project..."
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <button
                  onClick={() => setShowEditModal(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editFormData.contactName || !editFormData.contactEmail}
                  className="px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
