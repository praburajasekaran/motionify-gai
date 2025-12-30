import React from 'react';
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import { getInquiryById, type InquiryStatus } from '../../lib/inquiries';
import { ArrowLeft, Mail, User, Building2, Phone, FileText, Calendar, Plus, CheckCircle2, Clock, Send } from 'lucide-react';
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

  // Wait for auth to load before checking permissions
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  // Permission check - Only Super Admin can access
  if (!Permissions.canManageInquiries(user)) {
    return <Navigate to="/" replace />;
  }

  const inquiry = id ? getInquiryById(id) : null;

  if (!inquiry) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-white/40" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Inquiry Not Found</h2>
          <p className="text-white/60 mb-6">The inquiry you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/admin/inquiries')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors"
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
          onClick={() => navigate('/admin/inquiries')}
          className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inquiries
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <code className="text-2xl font-bold text-white font-mono">
                {inquiry.inquiryNumber}
              </code>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ring-1 ${STATUS_COLORS[inquiry.status]}`}>
                {STATUS_LABELS[inquiry.status]}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Calendar className="w-4 h-4" />
              <span>Submitted {formatDate(inquiry.createdAt)}</span>
            </div>
          </div>

          {inquiry.status === 'new' && (
            <button
              onClick={() => navigate(`/admin/inquiries/${inquiry.id}/proposal`)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 text-white font-medium hover:shadow-lg transition-shadow"
            >
              <Plus className="w-4 h-4" />
              Create Proposal
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white/5 rounded-xl p-6 ring-1 ring-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-white/60 mt-0.5" />
                <div>
                  <p className="text-sm text-white/60">Name</p>
                  <p className="text-white font-medium">{inquiry.contactName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-white/60 mt-0.5" />
                <div>
                  <p className="text-sm text-white/60">Email</p>
                  <a href={`mailto:${inquiry.contactEmail}`} className="text-violet-400 hover:text-violet-300 transition-colors">
                    {inquiry.contactEmail}
                  </a>
                </div>
              </div>

              {inquiry.companyName && (
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-white/60 mt-0.5" />
                  <div>
                    <p className="text-sm text-white/60">Company</p>
                    <p className="text-white font-medium">{inquiry.companyName}</p>
                  </div>
                </div>
              )}

              {inquiry.contactPhone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-white/60 mt-0.5" />
                  <div>
                    <p className="text-sm text-white/60">Phone</p>
                    <a href={`tel:${inquiry.contactPhone}`} className="text-white font-medium hover:text-violet-400 transition-colors">
                      {inquiry.contactPhone}
                    </a>
                  </div>
                </div>
              )}

              {inquiry.projectNotes && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-white/60 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-white/60 mb-1">Additional Notes</p>
                    <p className="text-white/80 text-sm leading-relaxed bg-white/5 rounded-lg p-3 border border-white/10">
                      {inquiry.projectNotes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quiz Answers */}
          <div className="bg-white/5 rounded-xl p-6 ring-1 ring-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">Quiz Answers</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Industry/Niche</p>
                <p className="text-white font-medium">{inquiry.quizAnswers.niche}</p>
              </div>

              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Target Audience</p>
                <p className="text-white font-medium">{inquiry.quizAnswers.audience}</p>
              </div>

              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Video Style</p>
                <p className="text-white font-medium">{inquiry.quizAnswers.style}</p>
              </div>

              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Mood/Tone</p>
                <p className="text-white font-medium">{inquiry.quizAnswers.mood}</p>
              </div>

              <div className="bg-white/5 rounded-lg p-4 border border-white/10 sm:col-span-2">
                <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Video Duration</p>
                <p className="text-white font-medium">{inquiry.quizAnswers.duration}</p>
              </div>
            </div>

            {/* Recommendation */}
            <div className="mt-4 p-4 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 rounded-lg border border-violet-500/20">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Recommended Video Type</p>
                  <p className="text-white font-semibold text-lg">{inquiry.recommendedVideoType}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Activity Timeline */}
          <div className="bg-white/5 rounded-xl p-6 ring-1 ring-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">Activity Timeline</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="w-px h-full bg-white/10 mt-2" />
                </div>
                <div className="pb-6">
                  <p className="text-white font-medium mb-1">Inquiry Created</p>
                  <p className="text-xs text-white/60">{formatDate(inquiry.createdAt)}</p>
                </div>
              </div>

              {inquiry.status === 'proposal_sent' && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Send className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="w-px h-full bg-white/10 mt-2" />
                  </div>
                  <div className="pb-6">
                    <p className="text-white font-medium mb-1">Proposal Sent</p>
                    <p className="text-xs text-white/60">{formatDate(inquiry.updatedAt)}</p>
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
                    <p className="text-white font-medium mb-1">Proposal Accepted</p>
                    <p className="text-xs text-white/60">{formatDate(inquiry.updatedAt)}</p>
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
                    <p className="text-white font-medium mb-1">Converted to Project</p>
                    <p className="text-xs text-white/60">{formatDate(inquiry.convertedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/5 rounded-xl p-6 ring-1 ring-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {inquiry.status === 'new' && (
                <button
                  onClick={() => navigate(`/admin/inquiries/${inquiry.id}/proposal`)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 text-white font-medium hover:shadow-lg transition-shadow"
                >
                  <span>Create Proposal</span>
                  <Plus className="w-4 h-4" />
                </button>
              )}

              <a
                href={`mailto:${inquiry.contactEmail}?subject=Re: Your inquiry ${inquiry.inquiryNumber}`}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors border border-white/10"
              >
                <span>Send Email</span>
                <Mail className="w-4 h-4" />
              </a>

              {inquiry.contactPhone && (
                <a
                  href={`tel:${inquiry.contactPhone}`}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors border border-white/10"
                >
                  <span>Call Contact</span>
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
