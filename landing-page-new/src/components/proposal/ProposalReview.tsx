'use client';

import { formatCurrencyWithConversion, formatDate } from '@/lib/proposals';
import type { Proposal } from '@/lib/proposals';
import type { Inquiry } from '@/lib/inquiries';
import { Building2, Calendar, CheckCircle2, Clock, FileText, User } from 'lucide-react';
import { StatusTimeline } from './StatusTimeline';
import { getStatusConfig } from '@/lib/status-config';

interface ProposalReviewProps {
  proposal: Proposal;
  inquiry: Inquiry;
}

export default function ProposalReview({ proposal, inquiry }: ProposalReviewProps) {
  const statusConfig = getStatusConfig(proposal.status);
  const StatusIcon = statusConfig.icon;

  const pricing = {
    total: formatCurrencyWithConversion(proposal.totalPrice, proposal.currency),
    advance: formatCurrencyWithConversion(proposal.advanceAmount, proposal.currency),
    balance: formatCurrencyWithConversion(proposal.balanceAmount, proposal.currency),
  };

  return (
    <div className="p-6 sm:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Proposal
              </h1>
              <span className="text-sm bg-violet-100 text-violet-700 px-3 py-1 rounded-full font-medium">
                v{proposal.version || 1}
              </span>
            </div>
            <p className="text-gray-600">
              For {inquiry.companyName || inquiry.contactName}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ring-1 ${statusConfig.colorClass}`}>
            <StatusIcon className={`w-4 h-4 ${statusConfig.iconColorClass}`} />
            {statusConfig.label}
          </span>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            <span>Inquiry: <code className="font-mono text-violet-600">{inquiry.inquiryNumber}</code></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>Created: {formatDate(proposal.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Contact Person</p>
              <p className="text-gray-900 font-medium">{inquiry.contactName}</p>
            </div>
          </div>
          {inquiry.companyName && (
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Company</p>
                <p className="text-gray-900 font-medium">{inquiry.companyName}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Project Description */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Description</h2>
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {proposal.description}
          </p>
        </div>
      </div>

      {/* Deliverables */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Deliverables ({proposal.deliverables.length})
        </h2>
        <div className="space-y-3">
          {proposal.deliverables.map((deliverable, index) => (
            <div
              key={deliverable.id}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {deliverable.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {deliverable.description}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Estimated completion: Week {deliverable.estimatedCompletionWeek}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing Breakdown</h2>
        <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl p-6 border border-violet-200">
          {/* Total */}
          <div className="text-center mb-6 pb-6 border-b border-violet-200">
            <p className="text-sm text-gray-600 mb-2">Total Project Cost</p>
            <div className="text-4xl font-bold text-gray-900 mb-1">
              {pricing.total.primary}
            </div>
            <div className="text-lg text-gray-600">
              (≈ {pricing.total.secondary})
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Advance Payment ({proposal.advancePercentage}%)
                </p>
                <p className="text-xs text-gray-600">Due upon acceptance</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{pricing.advance.primary}</p>
                <p className="text-xs text-gray-600">(≈ {pricing.advance.secondary})</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Balance Payment ({100 - proposal.advancePercentage}%)
                </p>
                <p className="text-xs text-gray-600">Due upon project completion</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{pricing.balance.primary}</p>
                <p className="text-xs text-gray-600">(≈ {pricing.balance.secondary})</p>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="mt-6 pt-4 border-t border-violet-200">
            <p className="text-xs text-gray-600 text-center">
              * Currency conversion is approximate. Final amount will be calculated by Razorpay at checkout.
            </p>
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="mt-8">
        <StatusTimeline proposalId={proposal.id} />
      </div>

      {/* Response Information (if already responded) */}
      {proposal.status !== 'sent' && (
        <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                You responded to this proposal on {formatDate(proposal.updatedAt)}
              </p>
              {proposal.feedback && (
                <div className="mt-2">
                  <p className="text-xs text-blue-700 font-medium mb-1">Your feedback:</p>
                  <p className="text-sm text-blue-800 bg-white/50 rounded p-2">
                    {proposal.feedback}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
