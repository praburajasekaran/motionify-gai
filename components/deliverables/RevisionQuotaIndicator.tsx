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
  let colorClass = 'bg-teal-50/60 border-teal-200/50';
  let textColorClass = 'text-teal-700';
  let iconColorClass = 'text-teal-600';
  let Icon = Zap;

  if (percentage <= 0) {
    colorClass = 'bg-red-50/60 border-red-200/50';
    textColorClass = 'text-red-700';
    iconColorClass = 'text-red-600';
    Icon = AlertTriangle;
  } else if (percentage <= 33) {
    colorClass = 'bg-amber-50/60 border-amber-200/50';
    textColorClass = 'text-amber-700';
    iconColorClass = 'text-amber-600';
    Icon = AlertTriangle;
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border',
        colorClass,
        className
      )}
      role="status"
      aria-label={`${quota.remaining} of ${quota.total} revisions remaining`}
    >
      <div className="flex items-center gap-3">
        <div className={cn('p-1.5 rounded-md', iconColorClass)}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className={cn('text-[14px] font-semibold', textColorClass)}>
            {quota.remaining === 0 ? (
              'Revision Quota Exhausted'
            ) : quota.remaining === 1 ? (
              '1 Revision Remaining'
            ) : (
              `${quota.remaining} Revisions Remaining`
            )}
          </p>
          <p className="text-xs text-muted-foreground">
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
