import type { Inquiry } from '../../lib/inquiries';
import type { Proposal } from '../../lib/proposals';
import { formatCurrency } from '../../utils/format';
import { getStatusConfig } from '../../lib/status-config';
import { sanitizeHtml } from '../../lib/sanitize';
import { Calendar, Clock, FileText, RotateCcw, User } from 'lucide-react';

interface PublicProposalReviewProps {
  inquiry: Inquiry;
  proposal: Proposal;
}

export function PublicProposalReview({ inquiry, proposal }: PublicProposalReviewProps) {
  const status = getStatusConfig(proposal.status);
  const StatusIcon = status.icon;

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-white/10">
      <div className="p-6 sm:p-8 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-950">Proposal</h1>
              <span className="text-sm bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-medium">
                v{proposal.version || 1}
              </span>
            </div>
            <p className="text-gray-600">For {inquiry.companyName || inquiry.contactName}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ring-1 ${status.colorClass}`}>
            <StatusIcon className={`w-4 h-4 ${status.iconColorClass}`} />
            {status.clientLabel}
          </span>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-5">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            <span>Inquiry: <code className="font-mono text-amber-700">{inquiry.inquiryNumber}</code></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>Created: {new Date(proposal.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-gray-950 mb-3">Contact Information</h2>
          <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
            <User className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Contact Person</p>
              <p className="text-gray-950 font-medium">{inquiry.contactName}</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-950 mb-3">Project Description</h2>
          {/<[^>]+>/.test(proposal.description) ? (
            <div
              className="tiptap text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(proposal.description) }}
            />
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{proposal.description}</p>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-950 mb-3">
            Deliverables ({proposal.deliverables.length})
          </h2>
          <div className="space-y-3">
            {proposal.deliverables.map((deliverable, index) => (
              <div key={deliverable.id || deliverable.name} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-semibold text-sm shrink-0">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-950 mb-1">{deliverable.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{deliverable.description}</p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Estimated completion: Week {deliverable.estimatedCompletionWeek}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-950 mb-3">Project Terms</h2>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex items-start gap-3">
            <RotateCcw className="w-5 h-5 text-amber-700 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">Revisions Included</p>
              <p className="text-gray-950 font-semibold">
                {proposal.revisionsIncluded ?? 2} revision{(proposal.revisionsIncluded ?? 2) !== 1 ? 's' : ''}
              </p>
              {proposal.revisionsDescription && (
                <p className="text-sm text-gray-500 mt-1">{proposal.revisionsDescription}</p>
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-950 mb-3">Pricing Breakdown</h2>
          <div className="rounded-xl p-6 border border-amber-200 bg-amber-50">
            <div className="text-center mb-6 pb-6 border-b border-amber-200">
              <p className="text-sm text-gray-600 mb-2">Total Project Cost</p>
              <div className="text-4xl font-bold text-gray-950">
                {formatCurrency(proposal.totalPrice, proposal.currency)}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-950">Advance Payment ({proposal.advancePercentage}%)</p>
                  <p className="text-xs text-gray-600">Due upon acceptance</p>
                </div>
                <p className="font-semibold text-gray-950">{formatCurrency(proposal.advanceAmount, proposal.currency)}</p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-950">Balance Payment ({100 - proposal.advancePercentage}%)</p>
                  <p className="text-xs text-gray-600">Due upon project completion</p>
                </div>
                <p className="font-semibold text-gray-950">{formatCurrency(proposal.balanceAmount, proposal.currency)}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
