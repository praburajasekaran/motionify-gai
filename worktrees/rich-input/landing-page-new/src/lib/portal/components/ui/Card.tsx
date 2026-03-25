'use client';

import React from 'react';

interface CardProps {
  // Fix: Made children optional to resolve incorrect "missing prop" errors.
  children?: React.ReactNode;
  className?: string;
  title?: string;
  headerActions?: React.ReactNode;
}

const Card = ({ children, className = '', title, headerActions }: CardProps) => {
  // Todoist-style card: Clean white with subtle border, no glassmorphism (Heuristic #26)
  return (
    <div className={`bg-[var(--todoist-white)] border border-[var(--todoist-gray-200)] rounded-lg overflow-hidden shadow-[var(--shadow-card)] ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-[var(--todoist-gray-200)] flex justify-between items-center">
          <h3 className="text-lg font-semibold text-[var(--todoist-gray-900)]">{title}</h3>
          {headerActions && <div>{headerActions}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;

