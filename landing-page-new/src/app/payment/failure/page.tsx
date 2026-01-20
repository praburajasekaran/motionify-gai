'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { XCircle, AlertTriangle, ArrowLeft, Mail } from 'lucide-react';

function FailureContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Payment processing failed';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-rose-500 px-6 py-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-white/20 p-4">
                <XCircle className="w-16 h-16 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Payment Failed
            </h1>
            <p className="text-red-50 text-lg">
              Unfortunately, we couldn't process your payment
            </p>
          </div>

          <div className="p-8">
            <div className="bg-red-50 rounded-xl p-6 mb-8 border border-red-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-2">Error Details</h3>
                <p className="text-sm text-red-800">
                  {error}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-6 mb-8 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-4">What you can do:</h3>
              <ul className="space-y-2 text-sm text-blue-900">
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Check that your card details are correct</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Ensure your card has sufficient balance</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Try a different payment method if available</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Contact your bank if the issue persists</span>
                </li>
              </ul>
            </div>

            <div className="bg-purple-50 rounded-xl p-6 mb-8 border border-purple-200 flex items-start gap-3">
              <Mail className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-purple-900 mb-1">Need Help?</h3>
                <p className="text-sm text-purple-800">
                  If you continue to experience issues, our support team is here to help. Contact us at{' '}
                  <a href="mailto:hello@motionify.com" className="font-semibold underline">
                    hello@motionify.com
                  </a>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
              <a
                href={typeof window !== 'undefined' ? window.history.length > 1 ? '#' : '/' : '/'}
                onClick={(e) => {
                  if (typeof window !== 'undefined' && window.history.length > 1) {
                    e.preventDefault();
                    window.history.back();
                  }
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors font-medium"
              >
                Try Again
              </a>
            </div>

            <p className="text-xs text-gray-500 text-center mt-6">
              Error: <code className="font-mono">{error}</code>
              {' • '}
              <span>Time: {new Date().toLocaleString()}</span>
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-white/60 text-sm">
            Still having trouble?{' '}
            <a
              href="mailto:hello@motionify.com"
              className="text-white hover:text-white/80 underline"
            >
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/80">Loading failure details...</p>
        </div>
      </div>
    }>
      <FailureContent />
    </Suspense>
  );
}
