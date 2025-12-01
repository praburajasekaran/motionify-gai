/**
 * RevisionQuotaIndicator Component
 *
 * Visual indicator showing revision quota usage (e.g., "2 of 3 revisions used")
 * Displays prominently at the top of deliverables list with warning colors when low
 */

import React from 'react';
import { AlertTriangle, Zap } from 'lucide-react';
import { cn } from '../ui/design-system';
import { RevisionQuota } from '../../types/deliverable.types';

export interface RevisionQuotaIndicatorProps {
  quota: RevisionQuota;
  className?: string;
}

export const RevisionQuotaIndicator: React.FC<RevisionQuotaIndicatorProps> = ({
  quota,
  className,
}) => {
  const percentage = quota.total > 0 ? (quota.remaining / quota.total) * 100 : 0;

  // Determine color based on remaining percentage
  let colorClass = 'from-emerald-50 to-emerald-100/50 border-emerald-200';
  let textColorClass = 'text-emerald-700';
  let iconColorClass = 'text-emerald-500';
  let Icon = Zap;

  if (percentage <= 0) {
    colorClass = 'from-red-50 to-red-100/50 border-red-200';
    textColorClass = 'text-red-700';
    iconColorClass = 'text-red-500';
    Icon = AlertTriangle;
  } else if (percentage <= 33) {
    colorClass = 'from-amber-50 to-amber-100/50 border-amber-200';
    textColorClass = 'text-amber-700';
    iconColorClass = 'text-amber-500';
    Icon = AlertTriangle;
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 rounded-xl border bg-gradient-to-br shadow-sm',
        colorClass,
        className
      )}
      role="status"
      aria-label={`${quota.remaining} of ${quota.total} revisions remaining`}
    >
      <div className="flex items-center gap-3">
        <div className={cn('p-2 bg-white/60 rounded-lg', iconColorClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className={cn('text-sm font-bold', textColorClass)}>
            {quota.remaining === 0 ? (
              'Revision Quota Exhausted'
            ) : quota.remaining === 1 ? (
              '1 Revision Remaining'
            ) : (
              `${quota.remaining} Revisions Remaining`
            )}
          </p>
          <p className="text-xs text-zinc-600">
            {quota.used} of {quota.total} included revisions used
          </p>
        </div>
      </div>

      {/* Visual Quota Circles */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: quota.total }).map((_, idx) => (
          <div
            key={idx}
            className={cn(
              'w-3 h-3 rounded-full border-2 transition-all',
              idx < quota.used
                ? 'bg-zinc-400 border-zinc-500'
                : 'bg-white border-zinc-300'
            )}
            title={idx < quota.used ? 'Used' : 'Available'}
          />
        ))}
      </div>
    </div>
  );
};
