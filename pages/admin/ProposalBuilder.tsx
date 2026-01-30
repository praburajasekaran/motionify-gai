import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { getInquiryById, updateInquiryStatus, type Inquiry } from '../../lib/inquiries';
import { createProposal } from '../../lib/proposals';
import { ArrowLeft, Plus, Trash2, GripVertical, IndianRupee, DollarSign, Send, Save } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { Permissions } from '../../lib/permissions';
import { logProposalSent } from '../../services/activityApi';
import { encodeBase64 } from '../../utils/encoding';

interface DeliverableInput {
  id: string;
  name: string;
  description: string;
  estimatedCompletionWeek: number;
}

export function ProposalBuilder() {
  const { inquiryId } = useParams<{ inquiryId: string }>();
  const navigate = useNavigate();
  const { user, isLoading } = useAuthContext();

  // Form state - MUST be declared before any conditional returns
  const [description, setDescription] = useState('');
  const [deliverables, setDeliverables] = useState<DeliverableInput[]>([
    {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      estimatedCompletionWeek: 1,
    },
  ]);
  const [totalPrice, setTotalPrice] = useState<string>('');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [advancePercentage, setAdvancePercentage] = useState<40 | 50 | 60>(50);
  const [revisionsIncluded, setRevisionsIncluded] = useState<number>(2);
  const [isSaving, setIsSaving] = useState(false);

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [inquiryLoading, setInquiryLoading] = useState(true);

  useEffect(() => {
    async function fetchInquiry() {
      if (!inquiryId) {
        setInquiryLoading(false);
        return;
      }
      try {
        const data = await getInquiryById(inquiryId);
        setInquiry(data);
      } catch (error) {
        console.error('Error fetching inquiry:', error);
      } finally {
        setInquiryLoading(false);
      }
    }
    fetchInquiry();
  }, [inquiryId]);

  // Wait for auth and inquiry to load before checking permissions
  if (isLoading || inquiryLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Permission check - Admin can create proposals
  if (!Permissions.canCreateProposals(user)) {
    return <Navigate to="/" replace />;
  }

  if (!inquiry) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Inquiry Not Found</h2>
          <p className="text-gray-600 mb-6">The inquiry you're trying to create a proposal for doesn't exist.</p>
          <button
            onClick={() => navigate('/admin/inquiries')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
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

  const formatCurrency = (amountInSmallestUnit: number) => {
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(amountInSmallestUnit / 100);
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

  const handleSaveProposal = async () => {
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
      const proposal = await createProposal({
        inquiryId: inquiry.id,
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

      await updateInquiryStatus(inquiry.id, 'proposal_sent', {
        proposalId: proposal.id,
      });

      // Generate proposal link with data parameter
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
          revisionsIncluded: proposal.revisionsIncluded,
        },
        inquiry: {
          id: inquiry.id,
          inquiryNumber: inquiry.inquiryNumber,
          contactName: inquiry.contactName,
          contactEmail: inquiry.contactEmail,
          companyName: inquiry.companyName,
        }
      };
      
      // Encode data for URL
      const encodedData = encodeBase64(JSON.stringify(proposalData));
      const proposalLink = `http://localhost:5174/proposal/${proposal.id}?data=${encodedData}`;

      // Console log "email sent" with proposal link
      console.log('📧 EMAIL SENT TO CLIENT:');
      console.log('========================================');
      console.log('To:', inquiry.contactEmail);
      console.log('Subject: Proposal for', inquiry.inquiryNumber);
      console.log('');
      console.log('Proposal Link:', proposalLink);
      console.log('Total Amount:', formatCurrency(pricing.totalPrice));
      console.log('Advance Payment:', formatCurrency(pricing.advanceAmount));
      console.log('========================================');

      // Log activity: Proposal Sent
      if (user) {
        logProposalSent({
          senderId: user.id,
          senderName: user.fullName || user.email || 'Admin',
          ...(inquiry.clientUserId && { recipientId: inquiry.clientUserId }),
          recipientName: inquiry.contactName,
          inquiryId: inquiry.id,
          proposalId: proposal.id,
          proposalName: `Proposal for ${inquiry.inquiryNumber}`,
        }).catch((err) => console.error('Failed to log activity:', err));
      }

      alert(`Proposal created successfully!

Share this link with client:
${proposalLink}

✅ Email notification logged to console.`);
      navigate(`/admin/inquiries/${inquiry.id}`);
    } catch (error) {
      console.error('Error creating proposal:', error);
      alert('Failed to create proposal. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const pricing = calculatePricing();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/admin/inquiries/${inquiry.id}`)}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inquiry
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Proposal</h1>
            <p className="text-gray-600">
              For inquiry <code className="text-violet-600 font-mono">{inquiry.inquiryNumber}</code> - {inquiry.contactName}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Project Description */}
        <div className="bg-white rounded-xl p-6 ring-1 ring-gray-200 shadow-sm">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Project Description <span className="text-red-600">*</span>
          </label>
          <p className="text-xs text-gray-600 mb-3">
            Describe the scope of work, objectives, and what the client can expect
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent resize-none"
            placeholder="Enter detailed project description..."
          />
        </div>

        {/* Deliverables */}
        <div className="bg-white rounded-xl p-6 ring-1 ring-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Deliverables</h2>
              <p className="text-xs text-gray-600 mt-1">Define what will be delivered to the client</p>
            </div>
            <button
              onClick={handleAddDeliverable}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Deliverable
            </button>
          </div>

          <div className="space-y-4">
            {deliverables.map((deliverable, index) => (
              <div
                key={deliverable.id}
                className="bg-gray-50 border border-gray-300 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 mt-2">
                    <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                    <span className="text-sm font-medium text-gray-600">#{index + 1}</span>
                  </div>

                  <div className="flex-1 space-y-3">
                    <input
                      type="text"
                      value={deliverable.name}
                      onChange={(e) =>
                        handleDeliverableChange(deliverable.id, 'name', e.target.value)
                      }
                      placeholder="Deliverable name (e.g., 'Product Demo Video')"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent text-sm"
                    />

                    <textarea
                      value={deliverable.description}
                      onChange={(e) =>
                        handleDeliverableChange(deliverable.id, 'description', e.target.value)
                      }
                      placeholder="Describe what's included in this deliverable..."
                      rows={3}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent resize-none text-sm"
                    />

                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600">Estimated completion:</label>
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
                        className="w-20 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent"
                      />
                      <span className="text-xs text-gray-600">
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
            ))}
          </div>
        </div>

        {/* Project Terms */}
        <div className="bg-white rounded-xl p-6 ring-1 ring-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Terms</h2>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Revisions Included
            </label>
            <p className="text-xs text-gray-600 mb-3">
              Number of revision rounds included in this project
            </p>
            <input
              type="number"
              min="0"
              max="20"
              value={revisionsIncluded}
              onChange={(e) => setRevisionsIncluded(parseInt(e.target.value) || 0)}
              className="w-24 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent"
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl p-6 ring-1 ring-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Total Price */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Total Project Cost ({currency}) <span className="text-red-600">*</span>
              </label>

              {/* Currency Selector */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setCurrency('INR')}
                  className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${currency === 'INR'
                      ? 'bg-violet-500 text-white ring-2 ring-violet-400'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  INR (₹)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${currency === 'USD'
                      ? 'bg-violet-500 text-white ring-2 ring-violet-400'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  USD ($)
                </button>
              </div>

              <div className="relative">
                {currency === 'INR' ? (
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                ) : (
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                )}
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(e.target.value)}
                  placeholder="80000"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent"
                />
              </div>
            </div>

            {/* Advance Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Advance Payment Percentage
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[40, 50, 60].map((percentage) => (
                  <button
                    key={percentage}
                    onClick={() => setAdvancePercentage(percentage as 40 | 50 | 60)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all ${advancePercentage === percentage
                      ? 'bg-violet-500 text-white ring-2 ring-violet-400'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {percentage}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          {pricing && (
            <div className="mt-6 p-4 bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-lg border border-violet-200">
              <h3 className="text-sm font-medium text-gray-800 mb-3">Payment Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Advance Payment ({advancePercentage}%)</span>
                  <span className="text-gray-900 font-semibold">{formatCurrency(pricing.advanceAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Balance Payment ({100 - advancePercentage}%)</span>
                  <span className="text-gray-900 font-semibold">{formatCurrency(pricing.balanceAmount)}</span>
                </div>
                <div className="h-px bg-gray-300 my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-900 font-medium">Total Project Cost</span>
                  <span className="text-gray-900 font-bold text-lg">{formatCurrency(pricing.totalPrice)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-white/80 backdrop-blur-sm p-4 -mx-4 border-t border-gray-200">
          <button
            onClick={() => navigate(`/admin/inquiries/${inquiry.id}`)}
            className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors font-medium border border-gray-300"
            disabled={isSaving}
          >
            Cancel
          </button>

          <button
            onClick={handleSaveProposal}
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
                <Send className="w-4 h-4" />
                Send Proposal
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
