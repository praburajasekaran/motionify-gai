/**
 * IssueCategorySelector Component
 *
 * Checkbox grid for selecting issue categories with visual icons.
 * Categories: Color, Audio, Timing, Editing, Content, Other
 */

import React from 'react';
import { Palette, Volume2, Timer, Scissors, FileText, AlertCircle } from 'lucide-react';
import { cn } from '../ui/design-system';
import { IssueCategory } from '../../types/deliverable.types';

export interface IssueCategorySelectorProps {
  selectedCategories: IssueCategory[];
  onToggleCategory: (category: IssueCategory) => void;
  className?: string;
}

const CATEGORIES: Array<{
  value: IssueCategory;
  label: string;
  icon: React.ElementType;
  color: string;
}> = [
  {
    value: 'color',
    label: 'Color/Grading',
    icon: Palette,
    color: 'text-purple-600',
  },
  {
    value: 'audio',
    label: 'Audio',
    icon: Volume2,
    color: 'text-blue-600',
  },
  {
    value: 'timing',
    label: 'Timing/Pacing',
    icon: Timer,
    color: 'text-amber-600',
  },
  {
    value: 'editing',
    label: 'Editing',
    icon: Scissors,
    color: 'text-emerald-600',
  },
  {
    value: 'content',
    label: 'Content/Copy',
    icon: FileText,
    color: 'text-indigo-600',
  },
  {
    value: 'other',
    label: 'Other',
    icon: AlertCircle,
    color: 'text-zinc-600',
  },
];

export const IssueCategorySelector: React.FC<IssueCategorySelectorProps> = ({
  selectedCategories,
  onToggleCategory,
  className,
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      <label className="text-sm font-semibold text-foreground">
        Issue Categories <span className="text-red-500">*</span>
      </label>
      <p className="text-xs text-muted-foreground">
        Select all that apply to help the team understand your feedback
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategories.includes(category.value);

          return (
            <button
              key={category.value}
              type="button"
              onClick={() => onToggleCategory(category.value)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
                isSelected
                  ? 'bg-blue-50 border-blue-500 shadow-sm'
                  : 'bg-card border-border hover:border-border hover:bg-muted'
              )}
            >
              <div
                className={cn(
                  'p-2 rounded-lg',
                  isSelected ? 'bg-card' : 'bg-muted'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5',
                    isSelected ? category.color : 'text-muted-foreground'
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium',
                    isSelected ? 'text-blue-900' : 'text-foreground'
                  )}
                >
                  {category.label}
                </p>
              </div>
              {isSelected && (
                <div className="shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedCategories.length > 0 && (
        <p className="text-xs text-blue-600 font-medium">
          {selectedCategories.length} categor{selectedCategories.length !== 1 ? 'ies' : 'y'}{' '}
          selected
        </p>
      )}
    </div>
  );
};
