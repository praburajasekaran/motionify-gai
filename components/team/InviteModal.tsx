import React, { useState } from 'react';
import { Mail, UserPlus, Shield, X } from 'lucide-react';
import { Button, cn } from '../ui/design-system';

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onInviteSent?: () => void;
    currentUserRole?: string;
}

// Simple email validation
const validateEmail = (email: string): { valid: boolean; error?: string } => {
    if (!email.trim()) {
        return { valid: false, error: 'Email is required' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, error: 'Please enter a valid email address' };
    }
    return { valid: true };
};

export const InviteModal: React.FC<InviteModalProps> = ({
    isOpen,
    onClose,
    projectId,
    onInviteSent,
    currentUserRole
}) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'client' | 'team'>('client');
    const [emailError, setEmailError] = useState<string | null>(null);
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    // Determine if user can invite team members
    const canInviteTeam = currentUserRole !== 'client';

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

        setIsSending(true);

        try {
            // Call the project-level invitation API
            const response = await fetch(`/.netlify/functions/project-invitations-create/${projectId}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.trim(),
                    role,
                }),
            });

            const result = await response.json();

            if (result.success) {
                setSuccess(`Invitation sent to ${email}!`);
                if (onInviteSent) {
                    onInviteSent();
                }
                // Close modal after short delay
                setTimeout(() => {
                    handleClose();
                }, 1500);
            } else {
                setGeneralError(result.error || 'Failed to send invitation');
            }
        } catch (error) {
            console.error('Failed to send invitation:', error);
            setGeneralError('Failed to send invitation. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        if (emailError) setEmailError(null);
        if (generalError) setGeneralError(null);
    };

    const handleClose = () => {
        onClose();
        // Reset form after modal closes
        setTimeout(() => {
            setEmail('');
            setRole('client');
            setEmailError(null);
            setGeneralError(null);
            setSuccess(null);
        }, 300);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white">
                            <UserPlus className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-bold text-zinc-900">Invite Team Member</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <p className="text-sm text-zinc-600">
                        Send an email invitation to add a new member to this project.
                        They will receive a link to accept the invitation.
                    </p>

                    {/* Success Message */}
                    {success && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
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
                        <label htmlFor="invite-email" className="block text-sm font-medium text-zinc-700 mb-2">
                            <Mail className="h-4 w-4 inline mr-2" />
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="invite-email"
                            value={email}
                            onChange={handleEmailChange}
                            disabled={isSending}
                            className={cn(
                                "w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors",
                                emailError
                                    ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                                    : "border-zinc-300 focus:ring-primary focus:border-primary"
                            )}
                            placeholder="colleague@example.com"
                            required
                        />
                        {emailError && (
                            <p className="mt-1.5 text-sm text-red-600">{emailError}</p>
                        )}
                    </div>

                    {/* Role Selection */}
                    <div>
                        <label htmlFor="invite-role" className="block text-sm font-medium text-zinc-700 mb-2">
                            <Shield className="h-4 w-4 inline mr-2" />
                            Role
                        </label>
                        <select
                            id="invite-role"
                            value={role}
                            onChange={(e) => setRole(e.target.value as 'client' | 'team')}
                            disabled={isSending}
                            className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white"
                        >
                            <option value="client">Client Team Member</option>
                            {canInviteTeam && <option value="team">Motionify Team</option>}
                        </select>
                        <p className="mt-1.5 text-xs text-zinc-500">
                            {role === 'client'
                                ? 'Clients can view deliverables, provide feedback, and track project progress'
                                : 'Team members can manage tasks, upload files, and collaborate on the project'
                            }
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isSending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!email.trim() || isSending}
                            className="gap-2"
                        >
                            <Mail className="h-4 w-4" />
                            {isSending ? 'Sending...' : 'Send Invitation'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
