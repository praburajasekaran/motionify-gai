'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { CreditCard, Printer, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PaymentDetails {
    id: string;
    amount: number;
    currency: string;
    paymentType: string;
    status: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    paidAt: string | null;
    createdAt: string;
    project: {
        projectNumber: string;
        companyName: string;
        clientName: string;
    } | null;
    proposalDescription: string;
}

export default function ReceiptPage() {
    const params = useParams();
    const paymentId = params.paymentId as string;
    const [payment, setPayment] = useState<PaymentDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchPaymentDetails() {
            try {
                setLoading(true);
                // We'll use the history API but filter for this ID
                const response = await fetch(`/api/payments/history?paymentId=${paymentId}`);
                if (!response.ok) throw new Error('Failed to fetch payment details');

                const data = await response.json();
                const found = data.payments.find((p: any) => p.id === paymentId || p.razorpayPaymentId === paymentId);

                if (!found) throw new Error('Payment not found');
                setPayment(found);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load receipt');
            } finally {
                setLoading(false);
            }
        }

        if (paymentId) fetchPaymentDetails();
    }, [paymentId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-8 text-center mt-20">Loading receipt...</div>;
    if (error || !payment) return <div className="p-8 text-center text-red-500 mt-20">{error || 'Receipt not found'}</div>;

    const amountFormatted = (payment.amount / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: payment.currency,
    });

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 print:bg-white print:p-0">
            <div className="max-w-3xl mx-auto">
                {/* Navigation - Hidden on Print */}
                <div className="mb-8 flex justify-between items-center print:hidden">
                    <Link href="/payments/history" className="flex items-center text-gray-600 hover:text-gray-900">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to History
                    </Link>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                        Print Receipt
                    </button>
                </div>

                {/* Receipt Container */}
                <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-200 print:shadow-none print:border-none">
                    {/* Header */}
                    <div className="bg-slate-900 p-8 text-white flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Motionify</h1>
                            <p className="text-slate-400">Premium Video Production</p>
                        </div>
                        <div className="text-right">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium border border-emerald-500/30">
                                <CheckCircle2 className="w-4 h-4" />
                                Paid
                            </div>
                        </div>
                    </div>

                    <div className="p-8">
                        <div className="grid grid-cols-2 gap-8 mb-12">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Billed To</h3>
                                <p className="text-gray-900 font-medium">{payment.project?.clientName || 'Valued Client'}</p>
                                {payment.project?.companyName && <p className="text-gray-600">{payment.project.companyName}</p>}
                            </div>
                            <div className="text-right">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Receipt Details</h3>
                                <p className="text-gray-600">Date: {new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}</p>
                                <p className="text-gray-600">Receipt #: {payment.id.split('_')[0]}</p>
                                <p className="text-gray-600">Project: {payment.project?.projectNumber || 'N/A'}</p>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="border-t border-b border-gray-100 py-6 mb-8">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                        <th className="pb-4">Description</th>
                                        <th className="pb-4 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-900">
                                    <tr>
                                        <td className="py-4">
                                            {payment.paymentType === 'advance' ? 'Advance Payment' : 'Balance Payment'}
                                            <p className="text-sm text-gray-500 mt-1">{payment.proposalDescription}</p>
                                        </td>
                                        <td className="py-4 text-right font-medium">
                                            {amountFormatted}
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr className="border-t border-gray-100">
                                        <td className="pt-6 font-bold text-lg">Total Paid</td>
                                        <td className="pt-6 text-right font-bold text-lg text-violet-600">
                                            {amountFormatted}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Footer Details */}
                        <div className="grid grid-cols-2 gap-8 pt-4">
                            <div>
                                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Transaction Info</h3>
                                <div className="space-y-1 text-xs text-gray-600">
                                    <p>Payment ID: {payment.razorpayPaymentId}</p>
                                    <p>Order ID: {payment.razorpayOrderId}</p>
                                </div>
                            </div>
                            <div className="text-right flex flex-col justify-end">
                                <p className="text-xs text-gray-400">Thank you for your business!</p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Branding */}
                    <div className="bg-gray-50 p-6 text-center border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                            Motionify | hello@motionify.com | motionify.com
                        </p>
                    </div>
                </div>

                <p className="text-center text-xs text-gray-400 mt-8 print:mt-4">
                    This is a computer-generated receipt. No signature required.
                </p>
            </div>

            <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .min-h-screen {
            min-height: auto !important;
            padding: 0 !important;
          }
        }
      `}</style>
        </div>
    );
}
