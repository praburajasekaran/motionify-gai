"use client";

import { useState, useEffect, useCallback } from 'react';
import { Mail, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react';

interface VerificationSentProps {
    contactEmail: string | null;
    magicLink?: string | null;
    onReset: () => void;
    onResend?: () => Promise<{ success: boolean; magicLink?: string }>;
}

export default function VerificationSent({ contactEmail, magicLink: initialMagicLink, onReset, onResend }: VerificationSentProps) {
    const [isResending, setIsResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendMessage, setResendMessage] = useState<string | null>(null);
    const [magicLink, setMagicLink] = useState<string | null>(initialMagicLink || null);

    const isDevelopment = process.env.NODE_ENV === 'development';

    // Cooldown timer
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleResend = useCallback(async () => {
        if (!onResend || isResending || resendCooldown > 0) return;

        setIsResending(true);
        setResendMessage(null);

        try {
            const result = await onResend();
            if (result.success) {
                setResendMessage('Verification link sent!');
                setResendCooldown(60); // 60 second cooldown
                if (result.magicLink) {
                    setMagicLink(result.magicLink);
                }
            } else {
                setResendMessage('Failed to resend. Please try again.');
            }
        } catch {
            setResendMessage('Failed to resend. Please try again.');
        } finally {
            setIsResending(false);
        }
    }, [onResend, isResending, resendCooldown]);

    return (
        <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur p-8 sm:p-12">
            {/* Icon */}
            <div className="flex justify-center mb-6">
                <div className="rounded-full bg-violet-500/10 p-4 ring-1 ring-violet-500/20">
                    <Mail className="w-16 h-16 text-violet-400" strokeWidth={1.5} />
                </div>
            </div>

            {/* Title */}
            <h3 className="text-3xl sm:text-4xl font-bold text-center mb-3">
                Verify Your Email
            </h3>

            <p className="text-lg text-white/70 text-center mb-8 max-w-lg mx-auto">
                We've sent a magic link to <strong>{contactEmail}</strong>.<br />
                Please check your inbox and click the link to verify your email and complete your inquiry.
            </p>

            {/* Next Steps */}
            <div className="bg-gradient-to-br from-fuchsia-500/10 via-violet-500/10 to-blue-500/10 rounded-xl p-6 mb-8 border border-violet-500/20">
                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    Why verify?
                </h4>
                <div className="space-y-3">
                    <div className="flex gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <p className="text-sm text-white/80">Ensures we can communicate effectively</p>
                    </div>
                    <div className="flex gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <p className="text-sm text-white/80">Creates your secure client portal account</p>
                    </div>
                    <div className="flex gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <p className="text-sm text-white/80">Prevents spam and unauthorized requests</p>
                    </div>
                </div>
            </div>

            {/* Development Mode: Magic Link */}
            {isDevelopment && magicLink && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
                    <p className="text-xs text-emerald-400 font-medium mb-2">🔧 Development Mode - Magic Link:</p>
                    <a
                        href={magicLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-emerald-300 hover:text-emerald-200 underline break-all"
                    >
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                        Click here to verify
                    </a>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col items-center gap-4">
                {/* Resend Button */}
                {onResend && (
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={handleResend}
                            disabled={isResending || resendCooldown > 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 hover:text-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                            {isResending
                                ? 'Sending...'
                                : resendCooldown > 0
                                    ? `Resend in ${resendCooldown}s`
                                    : 'Resend Link'}
                        </button>
                        {resendMessage && (
                            <p className={`text-sm ${resendMessage.includes('Failed') ? 'text-red-400' : 'text-emerald-400'}`}>
                                {resendMessage}
                            </p>
                        )}
                    </div>
                )}

                {/* Start Over */}
                <button
                    onClick={onReset}
                    className="text-sm text-white/50 hover:text-white transition-colors"
                >
                    Start Over
                </button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-white/40 text-center mt-6">
                Didn't receive the email? Check your spam folder or email us at{' '}
                <a href="mailto:hello@motionify.com" className="text-white/60 hover:text-white underline">
                    hello@motionify.com
                </a>
            </p>
        </div>
    );
}
