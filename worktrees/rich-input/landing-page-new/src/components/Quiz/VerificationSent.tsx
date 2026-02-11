"use client";

import { Mail, CheckCircle2 } from 'lucide-react';

interface VerificationSentProps {
    contactEmail: string | null;
    onReset: () => void;
}

export default function VerificationSent({ contactEmail, onReset }: VerificationSentProps) {
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

            {/* Action Button */}
            <div className="flex justify-center">
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
