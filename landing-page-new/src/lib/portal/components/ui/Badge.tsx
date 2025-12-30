'use client';

import React from 'react';
import { TaskStatus } from '@/lib/portal/types';

interface BadgeProps {
  status: TaskStatus;
}

const Badge = ({ status }: BadgeProps) => {
  // Todoist-style badges: Simple, flat, no transparency or blur (Heuristic #2)
  const statusColors: Record<TaskStatus, { bg: string; text: string; dot: string }> = {
    [TaskStatus.PENDING]: {
      bg: 'bg-[var(--todoist-gray-100)]',
      text: 'text-[var(--todoist-gray-700)]',
      dot: 'bg-[var(--todoist-gray-400)]'
    },
    [TaskStatus.IN_PROGRESS]: {
      bg: 'bg-[var(--todoist-blue-light)]',
      text: 'text-[var(--todoist-blue)]',
      dot: 'bg-[var(--todoist-blue)]'
    },
    [TaskStatus.AWAITING_APPROVAL]: {
      bg: 'bg-[var(--todoist-orange-light)]',
      text: 'text-[var(--todoist-orange)]',
      dot: 'bg-[var(--todoist-orange)]'
    },
    [TaskStatus.REVISION_REQUESTED]: {
      bg: 'bg-[var(--todoist-red-light)]',
      text: 'text-[var(--todoist-red)]',
      dot: 'bg-[var(--todoist-red)]'
    },
    [TaskStatus.COMPLETED]: {
      bg: 'bg-[var(--todoist-green-light)]',
      text: 'text-[var(--todoist-green)]',
      dot: 'bg-[var(--todoist-green)]'
    },
  };

  const colors = statusColors[status];

  return (
    <span className={`inline-flex items-center gap-2 rounded ${colors.bg} px-2.5 py-1 text-xs font-medium ${colors.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
      {status}
    </span>
  );
};

export default Badge;

