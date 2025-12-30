'use client';

import React, { useState } from 'react';
import { Mail, UserPlus, Shield } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { validateEmail } from '@/lib/portal/utils/validation';
import { createInvitation } from '../api/invitations.api';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  onInviteSent?: () => void;
}

const InviteModal = ({ isOpen, onClose, projectId, onInviteSent }: InviteModalProps) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'client' | 'team'>('team');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    // Clear previous messages
    setEmailError(null);
    setGeneralError(null);
    setSuccess(null);

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setEmailError(emailValidation.error || 'Invalid email');
      return;
    }

    // Check if projectId is provided
    if (!projectId) {
      setGeneralError('No project selected. Please select a project first.');
      return;
    }

    setIsSending(true);

    // Send invitation via API
    const result = await createInvitation(projectId, {
      email: email.trim(),
      role,
    });

    setIsSending(false);

    if (result.success) {
      setSuccess(`Invitation sent to ${email}!`);

      // Call callback if provided
      if (onInviteSent) {
        onInviteSent();
      }

      // Close modal after short delay
      setTimeout(() => {
        onClose();
        setEmail('');
        setRole('team');
        setSuccess(null);
      }, 1500);
    } else {
      setGeneralError(result.error || 'Failed to send invitation');
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear errors when user types
    if (emailError) setEmailError(null);
    if (generalError) setGeneralError(null);
  };

  const handleClose = () => {
    onClose();
    // Reset form after modal closes
    setTimeout(() => {
      setEmail('');
      setRole('team');
      setEmailError(null);
      setGeneralError(null);
      setSuccess(null);
    }, 300);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Invite Team Member">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <p className="text-sm text-[var(--todoist-gray-600)]">
            Send an email invitation to add a new member to this project. They will receive a link to accept the invitation.
          </p>

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              {success}
            </div>
          )}

          {/* General Error Message */}
          {generalError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {generalError}
            </div>
          )}

          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--todoist-gray-700)] mb-2">
              <Mail className="h-4 w-4 inline mr-2" />
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleEmailChange}
              disabled={isSending}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--todoist-red)] focus:border-transparent ${
                emailError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-[var(--todoist-gray-300)]'
              }`}
              placeholder="colleague@example.com"
              required
            />
            {emailError && (
              <p className="mt-1 text-sm text-red-600">{emailError}</p>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-[var(--todoist-gray-700)] mb-2">
              <Shield className="h-4 w-4 inline mr-2" />
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'client' | 'team')}
              disabled={isSending}
              className="w-full px-4 py-2 border border-[var(--todoist-gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--todoist-red)] focus:border-transparent"
            >
              <option value="team">Team Member</option>
              <option value="client">Client</option>
            </select>
            <p className="mt-1 text-xs text-[var(--todoist-gray-500)]">
              {role === 'client'
                ? 'Clients can view deliverables, provide feedback, and track project progress'
                : 'Team members can manage tasks, upload files, and collaborate on the project'
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              onClick={handleClose}
              disabled={isSending}
              className="bg-[var(--todoist-gray-100)] text-[var(--todoist-gray-700)] hover:bg-[var(--todoist-gray-200)]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!email.trim() || isSending}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              {isSending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default InviteModal;

