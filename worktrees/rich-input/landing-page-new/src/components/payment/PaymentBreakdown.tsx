'use client';

import type { Proposal } from '@/lib/proposals';
import { formatCurrencyWithConversion } from '@/lib/proposals';
import { CreditCard, Info } from 'lucide-react';

interface PaymentBreakdownProps {
  proposal: Proposal;
}

export default function PaymentBreakdown({ proposal }: PaymentBreakdownProps) {
  const pricing = formatCurrencyWithConversion(proposal.advanceAmount, proposal.currency);
  const totalPricing = formatCurrencyWithConversion(proposal.totalPrice, proposal.currency);
  const balancePricing = formatCurrencyWithConversion(proposal.balanceAmount, proposal.currency);

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-6 border border-violet-200 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="w-5 h-5 text-violet-600" />
        <h3 className="text-lg font-semibold text-gray-900">Payment Breakdown</h3>
      </div>

      <div className="space-y-3 mb-4 pb-4 border-b border-violet-200">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Total Project Cost</span>
          <span className="font-medium text-gray-900">{totalPricing.primary}</span>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Advance Payment ({proposal.advancePercentage}%)</span>
          <span className="font-semibold text-violet-600">{pricing.primary}</span>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Balance Due ({100 - proposal.advancePercentage}%)</span>
          <span className="font-medium text-gray-600">{balancePricing.primary}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-violet-100 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">Amount Due Now</span>
          <span className="text-2xl font-bold text-violet-600">{pricing.primary}</span>
        </div>
        <p className="text-xs text-gray-500">
          ≈ {pricing.secondary}
        </p>
      </div>

      <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2 border border-blue-200">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">
          After advance payment, your project will be set up and work will begin. Balance payment is due upon project completion.
        </p>
      </div>
    </div>
  );
}
