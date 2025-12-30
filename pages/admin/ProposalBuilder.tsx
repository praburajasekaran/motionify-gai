import React, { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { getInquiryById, updateInquiryStatus } from '../../lib/inquiries';
import { createProposal } from '../../lib/proposals';
import { ArrowLeft, Plus, Trash2, GripVertical, IndianRupee, Send, Save } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { Permissions } from '../../lib/permissions';

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

  // Wait for auth to load before checking permissions
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  // Permission check - Admin can create proposals
  if (!Permissions.canCreateProposals(user)) {
    return <Navigate to="/" replace />;
  }

  const inquiry = inquiryId ? getInquiryById(inquiryId) : null;

  // Form state
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
  const [advancePercentage, setAdvancePercentage] = useState<40 | 50 | 60>(50);
  const [isSaving, setIsSaving] = useState(false);

  if (!inquiry) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-white mb-2">Inquiry Not Found</h2>
          <p className="text-white/60 mb-6">The inquiry you're trying to create a proposal for doesn't exist.</p>
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

  const formatCurrency = (amountInPaise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amountInPaise / 100);
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
      // Create proposal
      const proposal = createProposal({
        inquiryId: inquiry.id,
        description: description.trim(),
        deliverables: deliverables.map((d) => ({
          id: d.id,
          name: d.name.trim(),
          description: d.description.trim(),
          estimatedCompletionWeek: d.estimatedCompletionWeek,
        })),
        totalPrice: pricing.totalPrice,
        advancePercentage,
        advanceAmount: pricing.advanceAmount,
        balanceAmount: pricing.balanceAmount,
      });

      // Update inquiry status
      updateInquiryStatus(inquiry.id, 'proposal_sent', {
        proposalId: proposal.id,
      });

      // Console log "email sent"
      console.log('📧 EMAIL SENT TO CLIENT:');
      console.log('To:', inquiry.contactEmail);
      console.log('Subject: Proposal for', inquiry.inquiryNumber);
      console.log('Proposal ID:', proposal.id);
      console.log('Total Amount:', formatCurrency(pricing.totalPrice));
      console.log('Advance Payment:', formatCurrency(pricing.advanceAmount));

      alert('Proposal created successfully! Check console for email notification.');
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
          className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inquiry
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Create Proposal</h1>
            <p className="text-white/60">
              For inquiry <code className="text-violet-400 font-mono">{inquiry.inquiryNumber}</code> - {inquiry.contactName}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Project Description */}
        <div className="bg-white/5 rounded-xl p-6 ring-1 ring-white/10">
          <label className="block text-sm font-medium text-white mb-2">
            Project Description <span className="text-red-400">*</span>
          </label>
          <p className="text-xs text-white/60 mb-3">
            Describe the scope of work, objectives, and what the client can expect
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent resize-none"
            placeholder="Enter detailed project description..."
          />
        </div>

        {/* Deliverables */}
        <div className="bg-white/5 rounded-xl p-6 ring-1 ring-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Deliverables</h2>
              <p className="text-xs text-white/60 mt-1">Define what will be delivered to the client</p>
            </div>
            <button
              onClick={handleAddDeliverable}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Deliverable
            </button>
          </div>

          <div className="space-y-4">
            {deliverables.map((deliverable, index) => (
              <div
                key={deliverable.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 mt-2">
                    <GripVertical className="w-5 h-5 text-white/40 cursor-move" />
                    <span className="text-sm font-medium text-white/60">#{index + 1}</span>
                  </div>

                  <div className="flex-1 space-y-3">
                    <input
                      type="text"
                      value={deliverable.name}
                      onChange={(e) =>
                        handleDeliverableChange(deliverable.id, 'name', e.target.value)
                      }
                      placeholder="Deliverable name (e.g., 'Product Demo Video')"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent text-sm"
                    />

                    <textarea
                      value={deliverable.description}
                      onChange={(e) =>
                        handleDeliverableChange(deliverable.id, 'description', e.target.value)
                      }
                      placeholder="Describe what's included in this deliverable..."
                      rows={3}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent resize-none text-sm"
                    />

                    <div className="flex items-center gap-2">
                      <label className="text-xs text-white/60">Estimated completion:</label>
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
                        className="w-20 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent"
                      />
                      <span className="text-xs text-white/60">
                        week{deliverable.estimatedCompletionWeek !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveDeliverable(deliverable.id)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove deliverable"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white/5 rounded-xl p-6 ring-1 ring-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Pricing</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Total Price */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Total Project Cost (INR) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(e.target.value)}
                  placeholder="80000"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent"
                />
              </div>
            </div>

            {/* Advance Percentage */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Advance Payment Percentage
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[40, 50, 60].map((percentage) => (
                  <button
                    key={percentage}
                    onClick={() => setAdvancePercentage(percentage as 40 | 50 | 60)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all ${advancePercentage === percentage
                        ? 'bg-violet-500 text-white ring-2 ring-violet-400'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
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
            <div className="mt-6 p-4 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 rounded-lg border border-violet-500/20">
              <h3 className="text-sm font-medium text-white/80 mb-3">Payment Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Advance Payment ({advancePercentage}%)</span>
                  <span className="text-white font-semibold">{formatCurrency(pricing.advanceAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Balance Payment ({100 - advancePercentage}%)</span>
                  <span className="text-white font-semibold">{formatCurrency(pricing.balanceAmount)}</span>
                </div>
                <div className="h-px bg-white/10 my-2" />
                <div className="flex justify-between">
                  <span className="text-white font-medium">Total Project Cost</span>
                  <span className="text-white font-bold text-lg">{formatCurrency(pricing.totalPrice)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-zinc-50/80 backdrop-blur-sm p-4 -mx-4 border-t border-zinc-200">
          <button
            onClick={() => navigate(`/admin/inquiries/${inquiry.id}`)}
            className="px-4 py-2.5 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors font-medium border border-white/10"
            disabled={isSaving}
          >
            Cancel
          </button>

          <button
            onClick={handleSaveProposal}
            disabled={isSaving || !validateForm()}
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
