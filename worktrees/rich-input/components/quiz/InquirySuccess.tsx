"use client";

import { CheckCircle2, ArrowRight, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface InquirySuccessProps {
  inquiryNumber: string;
  contactEmail: string;
  onReset: () => void;
}

export default function InquirySuccess({ inquiryNumber, contactEmail, onReset }: InquirySuccessProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(inquiryNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur p-8 sm:p-12">
      {/* Success Icon */}
      <div className="flex justify-center mb-6">
        <div className="rounded-full bg-emerald-500/10 p-4 ring-1 ring-emerald-500/20">
          <CheckCircle2 className="w-16 h-16 text-emerald-400" strokeWidth={1.5} />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-3xl sm:text-4xl font-bold text-center mb-3">
        Inquiry Submitted!
      </h3>

      <p className="text-lg text-white/70 text-center mb-8">
        Thank you for your interest in working with us
      </p>

      {/* Inquiry Number */}
      <div className="bg-white/5 rounded-xl p-6 mb-6 border border-white/10">
        <div className="text-center">
          <p className="text-sm text-white/60 mb-2">Your Inquiry Number</p>
          <div className="flex items-center justify-center gap-3">
            <code className="text-2xl font-bold text-white tracking-wider font-mono">
              {inquiryNumber}
            </code>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Copy inquiry number"
            >
              {copied ? (
                <Check className="w-5 h-5 text-emerald-400" />
              ) : (
                <Copy className="w-5 h-5 text-white/60" />
              )}
            </button>
          </div>
          {copied && (
            <p className="text-xs text-emerald-400 mt-2">Copied to clipboard!</p>
          )}
        </div>
      </div>

      {/* What's Next */}
      <div className="bg-gradient-to-br from-fuchsia-500/10 via-violet-500/10 to-blue-500/10 rounded-xl p-6 mb-8 border border-violet-500/20">
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          What Happens Next?
        </h4>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold flex items-center justify-center mt-0.5">
              1
            </div>
            <p className="text-sm text-white/80">
              <strong>Check your email</strong> – We've sent a confirmation to{' '}
              <span className="text-white">{contactEmail}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold flex items-center justify-center mt-0.5">
              2
            </div>
            <p className="text-sm text-white/80">
              <strong>We'll review</strong> – Our team will analyze your requirements
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold flex items-center justify-center mt-0.5">
              3
            </div>
            <p className="text-sm text-white/80">
              <strong>Get your proposal</strong> – Expect a personalized proposal within 24 hours
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onReset}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-base font-medium bg-white/5 ring-1 ring-white/10 text-white/90 hover:bg-white/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-80"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            <path d="M21 3v9h-9" />
          </svg>
          <span>Submit Another Inquiry</span>
        </button>

        <a
          href={`/#/inquiry-status/${inquiryNumber}`}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 px-6 py-3.5 text-base font-medium text-white shadow-lg hover:brightness-110 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        >
          <span>Track My Inquiry</span>
          <ArrowRight size={18} />
        </a>
      </div>

      {/* Help Text */}
      <p className="text-xs text-white/40 text-center mt-6">
        Questions? Email us at{' '}
        <a href="mailto:hello@motionify.com" className="text-white/60 hover:text-white underline">
          hello@motionify.com
        </a>
      </p>
    </div>
  );
}
