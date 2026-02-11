'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { XCircle, AlertTriangle, ArrowLeft, Mail, RefreshCw } from 'lucide-react';

function FailureContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Payment processing failed';
  const orderId = searchParams.get('orderId');
  const proposalId = searchParams.get('proposalId');
  const errorCode = searchParams.get('errorCode');

  // Determine retry URL - go back to payment page if proposalId available
  const retryUrl = proposalId ? `/payment/${proposalId}` : null;

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
              Unfortunately, we couldn&apos;t process your payment
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
                {errorCode && (
                  <p className="text-xs text-red-600 mt-2">
                    Error Code: <code className="font-mono bg-red-100 px-1 rounded">{errorCode}</code>
                  </p>
                )}
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-6 mb-8 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-4">What you can do:</h3>
              <ul className="space-y-2 text-sm text-blue-900">
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">1.</span>
                  <span>Check that your card details are correct</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">2.</span>
                  <span>Ensure your card has sufficient balance</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">3.</span>
                  <span>Try a different payment method if available</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">4.</span>
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
                  <a href="mailto:support@motionify.com" className="font-semibold underline">
                    support@motionify.com
                  </a>
                  {orderId && (
                    <span className="block mt-1 text-xs text-purple-600">
                      Reference: {orderId}
                    </span>
                  )}
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
              {retryUrl ? (
                <Link
                  href={retryUrl}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Link>
              ) : (
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.history.length > 1) {
                      window.history.back();
                    } else {
                      window.location.href = '/';
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              )}
            </div>

            <div className="text-xs text-gray-500 text-center mt-6 space-y-1">
              {orderId && (
                <p>
                  Order Reference: <code className="font-mono bg-gray-100 px-1 rounded">{orderId}</code>
                </p>
              )}
              <p>
                Time: {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-white/60 text-sm">
            Still having trouble?{' '}
            <a
              href="mailto:support@motionify.com"
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
