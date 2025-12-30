import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getInquiryByNumber, type Inquiry, type InquiryStatus } from '../lib/inquiries';
import { ArrowLeft, Mail, User, Building2, Phone, FileText, Calendar, CheckCircle2, Clock, Send, Package } from 'lucide-react';

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
  reviewing: 'Under Review',
  proposal_sent: 'Proposal Sent',
  negotiating: 'In Discussion',
  accepted: 'Accepted',
  project_setup: 'Setting Up Your Project',
  payment_pending: 'Payment Pending',
  paid: 'Payment Received',
  converted: 'Project Created',
  rejected: 'Declined',
  archived: 'Archived',
};

const STATUS_DESCRIPTIONS: Record<InquiryStatus, string> = {
  new: 'Your inquiry has been received and is awaiting review by our team.',
  reviewing: 'Our team is currently reviewing your requirements and preparing a proposal.',
  proposal_sent: 'We\'ve sent you a detailed proposal. Please check your email.',
  negotiating: 'We\'re discussing the details of your project to ensure everything meets your needs.',
  accepted: 'Great! You\'ve accepted our proposal. We\'re preparing to start your project.',
  project_setup: 'Your project is being set up. You\'ll receive access to the project portal soon.',
  payment_pending: 'Awaiting payment to begin production.',
  paid: 'Payment received! Your project is now in active production.',
  converted: 'Your inquiry has been converted to a live project. Check your email for portal access.',
  rejected: 'This proposal was declined. Feel free to submit a new inquiry anytime.',
  archived: 'This inquiry has been archived.',
};

export function InquiryTracking() {
  const { inquiryNumber } = useParams<{ inquiryNumber: string }>();
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (inquiryNumber) {
      const foundInquiry = getInquiryByNumber(inquiryNumber);
      setInquiry(foundInquiry);
      setLoading(false);
    }
  }, [inquiryNumber]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="min-h-screen bg-gray-950">
        {/* Header */}
        <header className="border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link to="/landing" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </header>

        {/* Not Found */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white/5 rounded-2xl p-12 ring-1 ring-white/10 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-red-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Inquiry Not Found</h1>
            <p className="text-white/60 mb-6">
              We couldn't find an inquiry with number <code className="px-2 py-1 bg-white/10 rounded text-white font-mono text-sm">{inquiryNumber}</code>
            </p>
            <Link
              to="/landing"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 px-6 py-3 text-sm font-medium text-white shadow-lg hover:brightness-110 transition"
            >
              Submit New Inquiry
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/landing" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <code className="text-2xl font-bold text-white font-mono">
              {inquiry.inquiryNumber}
            </code>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ring-1 ${STATUS_COLORS[inquiry.status]}`}>
              {STATUS_LABELS[inquiry.status]}
            </span>
          </div>
          <p className="text-white/60">
            Track your video production inquiry status
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-gradient-to-br from-fuchsia-500/10 via-violet-500/10 to-blue-500/10 rounded-2xl p-6 mb-6 ring-1 ring-violet-500/20">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center">
              {inquiry.status === 'converted' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : inquiry.status === 'rejected' || inquiry.status === 'archived' ? (
                <Clock className="w-6 h-6 text-red-400" />
              ) : (
                <Clock className="w-6 h-6 text-violet-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">{STATUS_LABELS[inquiry.status]}</h3>
              <p className="text-white/70 text-sm">{STATUS_DESCRIPTIONS[inquiry.status]}</p>
              <p className="text-white/40 text-xs mt-2">
                Last updated: {formatDate(inquiry.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white/5 rounded-2xl p-6 mb-6 ring-1 ring-white/10">
          <h3 className="text-lg font-semibold mb-4">Your Information</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <User className="w-4 h-4 text-white/40" />
              <span className="text-white/80">{inquiry.contactName}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-white/40" />
              <span className="text-white/80">{inquiry.contactEmail}</span>
            </div>
            {inquiry.companyName && (
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="w-4 h-4 text-white/40" />
                <span className="text-white/80">{inquiry.companyName}</span>
              </div>
            )}
            {inquiry.contactPhone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-white/40" />
                <span className="text-white/80">{inquiry.contactPhone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Project Details */}
        <div className="bg-white/5 rounded-2xl p-6 mb-6 ring-1 ring-white/10">
          <h3 className="text-lg font-semibold mb-4">Project Details</h3>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-white/40 mb-1">Recommended Video Type</div>
              <div className="text-white font-medium">{inquiry.recommendedVideoType}</div>
            </div>
            {inquiry.projectNotes && (
              <div>
                <div className="text-xs text-white/40 mb-1">Additional Notes</div>
                <div className="text-white/80 text-sm">{inquiry.projectNotes}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-white/40 mb-1">Submitted</div>
              <div className="text-white/80 text-sm">{formatDate(inquiry.createdAt)}</div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white/5 rounded-2xl p-6 ring-1 ring-white/10">
          <h3 className="text-lg font-semibold mb-4">What's Next?</h3>
          <div className="space-y-3 text-sm text-white/70">
            {inquiry.status === 'new' && (
              <p>Our team will review your inquiry and send you a personalized proposal within 24 hours.</p>
            )}
            {inquiry.status === 'reviewing' && (
              <p>We're preparing a detailed proposal tailored to your needs. You'll receive it via email soon.</p>
            )}
            {inquiry.status === 'proposal_sent' && (
              <p>Please check your email for the proposal. If you have any questions, feel free to reply to that email.</p>
            )}
            {inquiry.status === 'converted' && (
              <p>Your project has been created! Check your email for login credentials to access the project portal.</p>
            )}
            <p className="text-white/40 text-xs pt-2">
              Questions? Contact us at{' '}
              <a href="mailto:hello@motionify.com" className="text-violet-400 hover:text-violet-300 underline">
                hello@motionify.com
              </a>
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 text-center">
          <Link
            to="/landing"
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium bg-white/5 ring-1 ring-white/10 text-white/90 hover:bg-white/10 transition"
          >
            Submit Another Inquiry
          </Link>
        </div>
      </div>
    </div>
  );
}
