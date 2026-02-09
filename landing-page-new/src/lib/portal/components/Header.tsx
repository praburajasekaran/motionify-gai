'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User, UserRole, Client } from '@/lib/portal/types';
import Button from './ui/Button';
import NotificationBell from './NotificationBell';
import ClientLogo from './ui/ClientLogo';

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
  isProjectView: boolean;
  onBack: () => void;
  projectName?: string;
  client?: Client;
}

const Header = ({ currentUser, onLogout, isProjectView, onBack, projectName, client }: HeaderProps) => {
  // Todoist-style header: Clean white with red accents
  return (
    <header className="bg-[var(--todoist-white)] border-b border-[var(--todoist-gray-200)] flex-shrink-0 shadow-[var(--shadow-card)]">
      <div className="max-w-full mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4">
              <div className="relative h-8 w-32">
                <Image
                  src="/motionify-light-logo.png"
                  alt="Motionify Studio"
                  fill
                  className="object-contain object-left"
                  style={{ filter: 'invert(1) brightness(0)' }}
                  priority
                />
              </div>
            </div>
            {currentUser?.role === UserRole.SUPPORT && isProjectView && (
              <Button onClick={onBack} variant="secondary" className="hidden sm:block">
                &larr; All Projects
              </Button>
            )}
            {currentUser && (
              <nav className="hidden md:flex items-center space-x-4">
                <Link 
                  href="/portal/dashboard" 
                  className="text-sm font-medium text-[var(--todoist-gray-600)] hover:text-[var(--todoist-gray-900)] transition-colors"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/portal/inquiries" 
                  className="text-sm font-medium text-[var(--todoist-gray-600)] hover:text-[var(--todoist-gray-900)] transition-colors"
                >
                  Inquiries
                </Link>
              </nav>
            )}
          </div>
          {currentUser && (
            <div className="flex items-center space-x-4">
              <Link href="/portal/profile" className="text-right hidden sm:block hover:opacity-80 transition-opacity">
                <p className="font-medium text-[var(--todoist-gray-900)]">{currentUser.name}</p>
                <p className="text-sm text-[var(--todoist-gray-600)]">{currentUser.role}</p>
              </Link>
              <NotificationBell />
              <Button onClick={onLogout} variant="secondary">
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

