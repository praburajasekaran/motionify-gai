/**
 * PrioritySelector Component
 *
 * Radio button group for selecting revision priority:
 * - Critical (blocks approval, must fix)
 * - Important (should fix for quality)
 * - Nice to have (optional improvement)
 */

import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../ui/design-system';
import { Priority } from '../../types/deliverable.types';

export interface PrioritySelectorProps {
  selectedPriority: Priority;
  onSelectPriority: (priority: Priority) => void;
  className?: string;
  layout?: 'vertical' | 'horizontal';
}

const PRIORITIES: Array<{
  value: Priority;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}> = [
    {
      value: 'critical',
      label: 'Critical',
      description: 'Blocks approval, must fix immediately',
      icon: AlertTriangle,
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
    },
    {
      value: 'important',
      label: 'Important',
      description: 'Should fix for quality standards',
      icon: AlertCircle,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-500',
    },
    {
      value: 'nice-to-have',
      label: 'Nice to Have',
      description: 'Optional improvement if possible',
      icon: Info,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500',
    },
  ];

export const PrioritySelector: React.FC<PrioritySelectorProps> = ({
  selectedPriority,
  onSelectPriority,
  className,
  layout = 'vertical',
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      <label className="text-sm font-semibold text-foreground">
        Priority Level <span className="text-red-500">*</span>
      </label>

      {layout === 'vertical' && (
        <p className="text-xs text-muted-foreground">
          How urgently does this need to be addressed?
        </p>
      )}

      <div className={cn(
        layout === 'horizontal' ? 'grid grid-cols-3 gap-3' : 'space-y-3'
      )}>
        {PRIORITIES.map((priority) => {
          const Icon = priority.icon;
          const isSelected = selectedPriority === priority.value;

          return (
            <button
              key={priority.value}
              type="button"
              onClick={() => onSelectPriority(priority.value)}
              className={cn(
                'transition-all text-left border-2',
                layout === 'horizontal'
                  ? 'flex flex-col items-center justify-center p-3 rounded-lg gap-2 text-center h-full'
                  : 'w-full flex items-start gap-4 p-4 rounded-lg',
                isSelected
                  ? `${priority.bgColor} ${priority.borderColor} shadow-sm`
                  : 'bg-card border-border hover:border-border hover:bg-muted'
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  'rounded-lg shrink-0 flex items-center justify-center',
                  layout === 'horizontal' ? 'p-1.5' : 'p-2',
                  isSelected ? 'bg-card' : 'bg-muted'
                )}
              >
                <Icon
                  className={cn(
                    isSelected ? priority.color : 'text-muted-foreground',
                    layout === 'horizontal' ? 'h-4 w-4' : 'h-5 w-5'
                  )}
                />
              </div>

              {/* Content */}
              <div className={cn(
                'min-w-0',
                layout === 'horizontal' ? 'flex-1' : 'flex-1'
              )}>
                <p
                  className={cn(
                    'font-bold',
                    layout === 'horizontal' ? 'text-xs' : 'text-sm mb-1',
                    isSelected ? priority.color : 'text-foreground'
                  )}
                >
                  {priority.label}
                </p>
                {layout === 'vertical' && (
                  <p
                    className={cn(
                      'text-xs',
                      isSelected ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {priority.description}
                  </p>
                )}
              </div>

              {/* Radio Circle (Vertical Only) */}
              {layout === 'vertical' && (
                <div className="shrink-0 mt-0.5">
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                      isSelected
                        ? `${priority.borderColor.replace('border-', 'border-')} bg-white`
                        : 'border-border bg-card'
                    )}
                  >
                    {isSelected && (
                      <div
                        className={cn(
                          'w-2.5 h-2.5 rounded-full',
                          priority.borderColor.replace('border-', 'bg-')
                        )}
                      />
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
