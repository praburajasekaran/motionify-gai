"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User, ArrowRight } from 'lucide-react';

// Mock users for development - matches the root portal
const MOCK_USERS = {
  superAdmin: {
    id: 'user-1',
    email: 'admin@motionify.studio',
    fullName: 'Super Admin',
    role: 'super_admin' as const,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
  },
  motionifySupport: {
    id: 'user-2',
    email: 'john@motionify.studio',
    fullName: 'John Support',
    role: 'project_manager' as const,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
  },
  teamMember: {
    id: 'user-3',
    email: 'sarah@motionify.studio',
    fullName: 'Sarah Designer',
    role: 'team_member' as const,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
  },
  clientPrimary: {
    id: 'user-4',
    email: 'alex@acmecorp.com',
    fullName: 'Alex Client',
    role: 'client' as const,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
  },
  clientTeam: {
    id: 'user-5',
    email: 'bob@acmecorp.com',
    fullName: 'Bob Viewer',
    role: 'client' as const,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
  },
};

const userOptions = [
  { key: 'superAdmin', label: 'Super Admin', description: 'Full system access' },
  { key: 'motionifySupport', label: 'Project Manager', description: 'Manage projects and teams' },
  { key: 'teamMember', label: 'Team Member', description: 'Work on assigned tasks' },
  { key: 'clientPrimary', label: 'Client (Primary Contact)', description: 'Approve deliverables' },
  { key: 'clientTeam', label: 'Client (Team Member)', description: 'View-only access' },
];

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('portal_user');
    if (savedUser) {
      router.push('/portal/dashboard');
    } else {
      setIsLoading(false);
    }
  }, [router]);

  const handleLogin = (userKey: string) => {
    const user = MOCK_USERS[userKey as keyof typeof MOCK_USERS];
    if (user) {
      localStorage.setItem('portal_user', JSON.stringify(user));
      document.cookie = `sb-session=mock-session-${user.id}; path=/; max-age=86400`;
      router.push('/portal/dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50/50 flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative h-10 w-40">
              <Image
                src="/motionify-light-logo.png"
                alt="Motionify Studio"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2 font-[family-name:var(--font-fraunces)]">
            Welcome Back
          </h1>
          <p className="text-zinc-500">Select a user to login (Development Mode)</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-zinc-200 p-6 space-y-4">
          {userOptions.map((option) => (
            <button
              key={option.key}
              onClick={() => handleLogin(option.key)}
              className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-zinc-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center group-hover:from-blue-200 group-hover:to-blue-100 transition-colors">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-zinc-900">{option.label}</p>
                  <p className="text-sm text-zinc-500">{option.description}</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-zinc-400">
            Development Mode - Authentication will be implemented in production
          </p>
        </div>
      </div>
    </div>
  );
}
