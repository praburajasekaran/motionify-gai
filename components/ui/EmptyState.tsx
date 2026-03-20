import React from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 text-center ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center">
        <Icon className="w-8 h-8 text-zinc-400" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-900 mt-4">{title}</h3>
      {description && (
        <p className="text-sm text-zinc-500 mt-1 max-w-sm">{description}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
