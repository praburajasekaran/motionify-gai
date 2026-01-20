'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  ArrowRight,
  Mail,
  Download,
  FileText,
  Sparkles,
  Calendar,
  Clock,
  Users,
  ChevronRight,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface ProjectDetails {
  id: string;
  projectNumber: string;
  companyName: string;
  clientName: string;
  projectName: string;
  startDate: string;
  estimatedCompletion: string;
}

interface PaymentDetails {
  id: string;
  amount: number;
  currency: string;
  paymentType: string;
  razorpayPaymentId: string;
  paidAt: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [showCelebration, setShowCelebration] = useState(true);

  const paymentId = searchParams.get('paymentId') || 'N/A';
  const projectId = searchParams.get('projectId');
  const projectNumber = searchParams.get('projectNumber');

  const formatCurrency = useCallback((amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
    }
    if (paymentId && paymentId !== 'N/A') {
      fetchPaymentDetails();
    }
  }, [projectId, paymentId]);

  const fetchProjectDetails = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProjectDetails(data);
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
    }
  };

  const fetchPaymentDetails = async () => {
    try {
      const response = await fetch(`/api/payments/history?paymentId=${paymentId}`);
      if (response.ok) {
        const data = await response.json();
        const payment = data.payments?.find((p: any) => p.id === paymentId || p.razorpayPaymentId === paymentId);
        if (payment) {
          setPaymentDetails({
            id: payment.id,
            amount: payment.amount,
            currency: payment.currency,
            paymentType: payment.paymentType,
            razorpayPaymentId: payment.razorpayPaymentId,
            paidAt: payment.paidAt || payment.createdAt
          });
        }
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
    }
  };

  const generateAndDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const response = await fetch('/api/payments/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          projectNumber,
          projectDetails
        })
      });

      if (!response.ok) throw new Error('Failed to generate invoice');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${projectNumber || paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const sendReceiptEmail = async () => {
    if (isSendingEmail || emailSent) return;
    setIsSendingEmail(true);
    try {
      const response = await fetch('/api/payments/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          projectId,
          projectNumber,
          paymentDetails,
          projectDetails
        })
      });

      if (!response.ok) throw new Error('Failed to send receipt');

      setEmailSent(true);
    } catch (error) {
      console.error('Error sending receipt:', error);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const clientName = projectDetails?.clientName || 'Valued Client';
  const companyName = projectDetails?.companyName || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 relative overflow-hidden">
      {showCelebration && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <Sparkles
              key={i}
              className="absolute text-violet-400/30 animate-sparkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
              size={Math.random() * 20 + 10}
            />
          ))}
        </div>
      )}

      <div className="relative z-10">
        <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-white hover:text-white/80 transition-colors">
              <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="8" fill="url(#gradient)" />
                <path d="M12 20L20 12L28 20L20 28L12 20Z" fill="white" />
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="40" y2="40">
                    <stop stopColor="#D946EF" />
                    <stop offset="0.5" stopColor="#8B5CF6" />
                    <stop offset="1" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="text-xl font-bold">Motionify</span>
            </Link>
            <button
              onClick={() => setShowCelebration(!showCelebration)}
              className="text-white/60 hover:text-white text-sm transition-colors"
            >
              {showCelebration ? 'Hide' : 'Show'} effects
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8 animate-fadeUp">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30 mb-6 animate-glow">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-fraunces">
              Payment Successful!
            </h1>
            <p className="text-xl text-violet-200/80 max-w-2xl mx-auto">
              Thank you for your payment, {clientName}! We&apos;re excited to start working on your project.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 mb-8">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-fadeUp" style={{ animationDelay: '0.1s' }}>
              <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-8">
                <div className="flex items-center gap-3 text-white mb-2">
                  <FileText className="w-5 h-5" />
                  <h2 className="text-lg font-semibold">Payment Receipt</h2>
                </div>
                <p className="text-violet-100/80 text-sm">Transaction details and confirmation</p>
              </div>

              <div className="p-6 space-y-4">
                {projectNumber && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Project</span>
                    <code className="font-mono text-sm bg-violet-50 text-violet-700 px-3 py-1 rounded-lg border border-violet-200">
                      {projectNumber}
                    </code>
                  </div>
                )}
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Payment ID</span>
                  <code className="font-mono text-sm bg-gray-50 text-gray-700 px-3 py-1 rounded-lg">
                    {paymentId.slice(0, 16)}...
                  </code>
                </div>
                {paymentDetails && (
                  <>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Amount</span>
                      <span className="font-semibold text-violet-600">
                        {formatCurrency(paymentDetails.amount, paymentDetails.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Date</span>
                      <span className="text-gray-900">
                        {new Date(paymentDetails.paidAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600">Status</span>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Completed
                  </span>
                </div>
              </div>

              <div className="px-6 pb-6 space-y-3">
                <button
                  onClick={generateAndDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingPdf ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download Invoice PDF
                    </>
                  )}
                </button>
                <button
                  onClick={sendReceiptEmail}
                  disabled={isSendingEmail || emailSent}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-violet-200 text-violet-700 font-medium hover:bg-violet-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingEmail ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : emailSent ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Email Sent
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send to Email
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-2xl p-6 animate-fadeUp" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-violet-100">
                    <Calendar className="w-5 h-5 text-violet-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">What&apos;s Next?</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center font-semibold text-violet-700 text-sm">
                      1
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Project Setup</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        We&apos;re preparing your project environment. You&apos;ll receive access details shortly.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center font-semibold text-violet-700 text-sm">
                      2
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Team Introduction</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Our creative team will reach out to schedule a kickoff call.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center font-semibold text-violet-700 text-sm">
                      3
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Work Begins</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        We&apos;ll start bringing your vision to life according to the timeline.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {projectDetails && (
                <div className="bg-white rounded-2xl shadow-2xl p-6 animate-fadeUp" style={{ animationDelay: '0.3s' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Project Access</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Project Name</span>
                      <span className="font-medium text-gray-900">{projectDetails.projectName}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Organization</span>
                      <span className="font-medium text-gray-900">{companyName || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">Estimated Completion</span>
                      <span className="font-medium text-gray-900">
                        {new Date(projectDetails.estimatedCompletion).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <Link
                      href="/portal/dashboard"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:from-violet-700 hover:to-purple-700 transition-all group"
                    >
                      Go to Dashboard
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-violet-900/30 backdrop-blur-sm rounded-2xl p-6 border border-violet-500/20 animate-fadeUp" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-violet-500/20">
                <Mail className="w-6 h-6 text-violet-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Confirmation Email Sent</h3>
                <p className="text-violet-200/80 mb-4">
                  A detailed receipt and project setup instructions have been sent to your email address.
                  Please check your inbox (and spam folder) for the confirmation email.
                </p>
                <div className="flex flex-wrap gap-4">
                  <a
                    href="https://mail.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
                  >
                    Open Gmail
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="https://outlook.office.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
                  >
                    Open Outlook
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-white/60 text-sm">
              Questions about your payment or project?{' '}
              <a
                href="mailto:hello@motionify.com"
                className="text-violet-400 hover:text-violet-300 transition-colors"
              >
                Contact us
              </a>
              {' '}or{' '}
              <Link href="/contact" className="text-violet-400 hover:text-violet-300 transition-colors">
                visit our support page
              </Link>
            </p>
          </div>

          <p className="text-center text-white/40 text-xs mt-6">
            Payment ID: <code className="font-mono">{paymentId}</code>
            {projectNumber && <> • Project: <code className="font-mono">{projectNumber}</code></>}
            {' • '}
            <span>{new Date().toLocaleString()}</span>
          </p>
        </main>
      </div>

      <style jsx global>{`
        @keyframes sparkle {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.5) rotate(180deg);
            opacity: 0.8;
          }
        }
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.3), 0 0 40px rgba(16, 185, 129, 0.1);
          }
          50% {
            box-shadow: 0 0 30px rgba(16, 185, 129, 0.5), 0 0 60px rgba(16, 185, 129, 0.2);
          }
        }
        .animate-sparkle {
          animation: sparkle 3s ease-in-out infinite;
        }
        .animate-fadeUp {
          animation: fadeUp 0.6s ease-out forwards;
        }
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/80">Loading success details...</p>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
