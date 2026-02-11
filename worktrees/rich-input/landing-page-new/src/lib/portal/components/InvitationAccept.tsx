'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Mail, UserPlus, Loader } from 'lucide-react';
import Button from './ui/Button';
import { acceptInvitation } from '../api/invitations.api';

interface InvitationAcceptProps {
  token: string;
}

const InvitationAccept: React.FC<InvitationAcceptProps> = ({ token }) => {
  const [fullName, setFullName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'requires_signup'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [requiresSignup, setRequiresSignup] = useState(false);

  useEffect(() => {
    // Auto-accept if token is provided and we're in idle state
    if (token && status === 'idle') {
      handleAccept();
    }
  }, [token]);

  const handleAccept = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setStatus('loading');
    setError(null);

    const result = await acceptInvitation(token, requiresSignup ? { full_name: fullName } : undefined);

    if (result.success) {
      setStatus('success');
      setProjectName(result.project?.name || null);

      // Redirect to login page after 3 seconds
      setTimeout(() => {
        window.location.href = '/portal';
      }, 3000);
    } else if (result.requires_signup) {
      setStatus('requires_signup');
      setRequiresSignup(true);
      setError('Please provide your full name to continue');
    } else {
      setStatus('error');
      setError(result.error || 'Failed to accept invitation');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[var(--todoist-gray-50)] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <Loader className="h-16 w-16 text-[var(--todoist-red)] mx-auto animate-spin" />
          <h1 className="text-2xl font-semibold text-[var(--todoist-gray-900)] mt-6">
            Processing Invitation
          </h1>
          <p className="text-[var(--todoist-gray-600)] mt-2">
            Please wait while we verify your invitation...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[var(--todoist-gray-50)] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--todoist-gray-900)] mt-6">
            Welcome to the Team!
          </h1>
          <p className="text-[var(--todoist-gray-600)] mt-2">
            You have successfully joined {projectName ? `the project "${projectName}"` : 'the project'}.
          </p>
          <p className="text-sm text-[var(--todoist-gray-500)] mt-4">
            Redirecting you to the portal...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[var(--todoist-gray-50)] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--todoist-gray-900)] mt-6">
            Invitation Error
          </h1>
          <p className="text-[var(--todoist-gray-600)] mt-2">
            {error || 'Unable to accept invitation'}
          </p>
          <div className="mt-6">
            <Button onClick={() => window.location.href = '/portal'}>
              Go to Portal
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'requires_signup' || requiresSignup) {
    return (
      <div className="min-h-screen bg-[var(--todoist-gray-50)] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="h-16 w-16 bg-[var(--todoist-red-light)] rounded-full flex items-center justify-center mx-auto">
              <UserPlus className="h-10 w-10 text-[var(--todoist-red)]" />
            </div>
            <h1 className="text-2xl font-semibold text-[var(--todoist-gray-900)] mt-6">
              Complete Your Profile
            </h1>
            <p className="text-[var(--todoist-gray-600)] mt-2">
              Please provide your name to complete the invitation
            </p>
          </div>

          <form onSubmit={handleAccept} className="mt-6 space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-[var(--todoist-gray-700)] mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-[var(--todoist-gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--todoist-red)] focus:border-transparent"
                placeholder="John Doe"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={!fullName.trim()}>
              Accept Invitation
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--todoist-gray-50)] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="h-16 w-16 bg-[var(--todoist-gray-200)] rounded-full flex items-center justify-center mx-auto">
          <Mail className="h-10 w-10 text-[var(--todoist-gray-600)]" />
        </div>
        <h1 className="text-2xl font-semibold text-[var(--todoist-gray-900)] mt-6">
          Invalid Invitation
        </h1>
        <p className="text-[var(--todoist-gray-600)] mt-2">
          No invitation token provided
        </p>
        <div className="mt-6">
          <Button onClick={() => window.location.href = '/portal'}>
            Go to Portal
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InvitationAccept;
