'use client';

import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '@/lib/portal/AppContext';
import { UserRole } from '@/lib/portal/types';
import { fetchInquiries, fetchInquiriesByClientUserId, Inquiry } from '@/lib/inquiries';
import { fetchProposalsByInquiryId, updateProposalStatus, ProposalStatus } from '@/lib/proposals';
import Button from '@/lib/portal/components/ui/Button';
import Card from '@/lib/portal/components/ui/Card';
import { logProposalAccepted, logProposalRejected, logProposalChangesRequested } from '@/lib/portal/api/activities.api';

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  reviewing: 'bg-yellow-100 text-yellow-800',
  proposal_sent: 'bg-purple-100 text-purple-800',
  negotiating: 'bg-orange-100 text-orange-800',
  accepted: 'bg-green-100 text-green-800',
  project_setup: 'bg-indigo-100 text-indigo-800',
  payment_pending: 'bg-pink-100 text-pink-800',
  paid: 'bg-emerald-100 text-emerald-800',
  converted: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  archived: 'bg-gray-100 text-gray-800',
};

const proposalStatusColors: Record<string, string> = {
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  changes_requested: 'bg-orange-100 text-orange-800',
};

interface InquiryWithProposal extends Inquiry {
  proposalStatus?: ProposalStatus;
  proposalId?: string;
  proposalFeedback?: string;
}

function StatusBadge({ status, colors }: { status: string; colors: Record<string, string> }) {
  const colorClass = colors[status] || 'bg-gray-100 text-gray-800';
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colorClass}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default function InquiriesPage() {
  const { currentUser, isLoading } = useContext(AppContext);
  const [inquiries, setInquiries] = useState<InquiryWithProposal[]>([]);
  const [loadingInquiries, setLoadingInquiries] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [showFeedbackModal, setShowFeedbackModal] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && currentUser) {
      loadInquiries();
    }
  }, [currentUser, isLoading]);

  const loadInquiries = async () => {
    if (!currentUser) return;

    try {
      setLoadingInquiries(true);
      let data: Inquiry[] = [];

      const isAdmin = currentUser.role === UserRole.PROJECT_MANAGER || currentUser.role === UserRole.MOTIONIFY_MEMBER;
      
      if (isAdmin) {
        data = await fetchInquiries();
      } else {
        data = await fetchInquiriesByClientUserId(currentUser.id);
      }

      const inquiriesWithProposals = await Promise.all(
        data.map(async (inquiry) => {
          if (inquiry.proposalId) {
            try {
              const proposals = await fetchProposalsByInquiryId(inquiry.id);
              const proposal = proposals.length > 0 ? proposals[0] : null;
              return {
                ...inquiry,
                proposalStatus: proposal?.status,
                proposalId: proposal?.id,
                proposalFeedback: proposal?.feedback,
              };
            } catch (error) {
              console.error(`Error fetching proposal for inquiry ${inquiry.id}:`, error);
              return inquiry;
            }
          }
          return inquiry;
        })
      );

      setInquiries(inquiriesWithProposals);
    } catch (error) {
      console.error('Error loading inquiries:', error);
    } finally {
      setLoadingInquiries(false);
    }
  };

  const handleProposalAction = async (inquiryId: string, proposalId: string, action: ProposalStatus, feedback?: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [`${inquiryId}-${action}`]: true }));
      await updateProposalStatus(proposalId, action, feedback);

      // Log activity based on action
      const inquiry = inquiries.find(i => i.id === inquiryId);
      if (inquiry && currentUser) {
        const activityParams = {
          inquiryId,
          proposalId,
          proposalName: `Proposal for ${inquiry.inquiryNumber}`,
          senderId: 'motionify-admin',
          senderName: 'Motionify',
        };

        if (action === 'accepted') {
          logProposalAccepted({
            ...activityParams,
            accepterId: currentUser.id,
            accepterName: currentUser.name,
          }).catch((err) => console.error('Failed to log activity:', err));
        } else if (action === 'rejected') {
          logProposalRejected({
            ...activityParams,
            rejecterId: currentUser.id,
            rejecterName: currentUser.name,
            reason: feedback,
          }).catch((err) => console.error('Failed to log activity:', err));
        } else if (action === 'changes_requested') {
          logProposalChangesRequested({
            ...activityParams,
            requesterId: currentUser.id,
            requesterName: currentUser.name,
            feedback,
          }).catch((err) => console.error('Failed to log activity:', err));
        }
      }

      await loadInquiries();
      setShowFeedbackModal(null);
      setFeedbackText({});
    } catch (error) {
      console.error(`Error updating proposal to ${action}:`, error);
    } finally {
      setActionLoading(prev => ({ ...prev, [`${inquiryId}-${action}`]: false }));
    }
  };

  if (isLoading || loadingInquiries) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-[var(--todoist-gray-600)]">Loading inquiries...</div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const isAdmin = currentUser.role === UserRole.PROJECT_MANAGER || currentUser.role === UserRole.MOTIONIFY_MEMBER;

  return (
    <div className="min-h-screen bg-[var(--todoist-gray-50)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--todoist-gray-900)] mb-2">
            {isAdmin ? 'All Inquiries' : 'My Inquiries'}
          </h1>
          <p className="text-[var(--todoist-gray-600)]">
            {isAdmin 
              ? 'Manage all inquiries and their proposals' 
              : 'View your inquiries and proposal statuses'}
          </p>
        </div>

        {inquiries.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-[var(--todoist-gray-600)]">No inquiries found</p>
          </Card>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inquiry #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proposal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inquiries.map((inquiry) => (
                    <tr key={inquiry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {inquiry.inquiryNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div>
                          <p className="font-medium">{inquiry.contactName}</p>
                          <p className="text-xs text-gray-500">{inquiry.contactEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {inquiry.companyName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={inquiry.status} colors={statusColors} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {inquiry.proposalStatus ? (
                          <StatusBadge status={inquiry.proposalStatus} colors={proposalStatusColors} />
                        ) : (
                          <span className="text-sm text-gray-400">No proposal</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {inquiry.proposalId && inquiry.proposalStatus === 'sent' && (
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant="primary"
                              onClick={() => handleProposalAction(inquiry.id, inquiry.proposalId!, 'accepted')}
                              disabled={actionLoading[`${inquiry.id}-accepted`]}
                              className="text-xs px-3 py-1"
                            >
                              Accept
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => setShowFeedbackModal(inquiry.id)}
                              className="text-xs px-3 py-1"
                            >
                              Changes
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => handleProposalAction(inquiry.id, inquiry.proposalId!, 'rejected')}
                              disabled={actionLoading[`${inquiry.id}-rejected`]}
                              className="text-xs px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {inquiry.proposalStatus === 'accepted' && (
                          <span className="text-green-600 font-medium">Accepted</span>
                        )}
                        {inquiry.proposalStatus === 'rejected' && (
                          <span className="text-red-600 font-medium">Rejected</span>
                        )}
                        {inquiry.proposalStatus === 'changes_requested' && (
                          <span className="text-orange-600 font-medium">Pending Review</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Request Changes
            </h3>
            <textarea
              value={feedbackText[showFeedbackModal] || ''}
              onChange={(e) => setFeedbackText(prev => ({ ...prev, [showFeedbackModal]: e.target.value }))}
              placeholder="Describe the changes you'd like..."
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowFeedbackModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const inquiry = inquiries.find(i => i.id === showFeedbackModal);
                  if (inquiry?.proposalId) {
                    handleProposalAction(
                      showFeedbackModal,
                      inquiry.proposalId,
                      'changes_requested',
                      feedbackText[showFeedbackModal]
                    );
                  }
                }}
                disabled={actionLoading[`${showFeedbackModal}-changes_requested`]}
              >
                Submit
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
