'use client';

import React from 'react';

// Fix: Changed interface to type with intersection to properly inherit button attributes.
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
};

const Button = ({ children, variant = 'primary', className = '', ...props }: ButtonProps) => {
  // Todoist-style button with state ladder: Normal → Hover → Active → Disabled (Heuristic #20)
  // No gradients, no scale animations - just clean color transitions
  const baseClasses = 'px-4 py-2 rounded-lg font-medium text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    // Todoist red primary button - solid color, no gradient
    primary: 'bg-[var(--todoist-red)] text-white hover:bg-[var(--todoist-red-hover)] active:bg-[var(--todoist-red-dark)] focus:ring-[var(--todoist-red)] shadow-[var(--shadow-card)]',
    // Subtle secondary button
    secondary: 'bg-[var(--todoist-gray-100)] text-[var(--todoist-gray-900)] hover:bg-[var(--todoist-gray-200)] active:bg-[var(--todoist-gray-300)] focus:ring-[var(--todoist-gray-300)] border border-[var(--todoist-gray-200)]',
    // Red danger button
    danger: 'bg-[var(--todoist-red)] text-white hover:bg-[var(--todoist-red-hover)] active:bg-[var(--todoist-red-dark)] focus:ring-[var(--todoist-red)] shadow-[var(--shadow-card)]',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;

