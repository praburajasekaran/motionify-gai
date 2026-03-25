'use client';

import { Clock } from 'lucide-react';
import Link from 'next/link';

export default function PaymentPendingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-blue-100 p-4">
            <Clock className="w-16 h-16 text-blue-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Payment Integration Coming Soon
        </h1>
        
        <p className="text-gray-600 mb-8">
          We're currently setting up our payment system with Razorpay. 
          Please check back soon or contact our team for manual payment options.
        </p>
        
        <div className="space-y-3">
          <a
            href="mailto:hello@motionify.com?subject=Payment Inquiry"
            className="block w-full px-6 py-3 rounded-lg bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 text-white font-medium hover:shadow-lg transition-shadow"
          >
            Contact Support
          </a>
          
          <Link
            href="/"
            className="block w-full px-6 py-3 rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
