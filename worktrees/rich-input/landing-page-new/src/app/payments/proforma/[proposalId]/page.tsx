'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Download, 
  Send, 
  CreditCard, 
  Calendar, 
  Building2, 
  User, 
  FileText,
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { createRazorpayOrder, openRazorpayCheckout, loadRazorpayScript } from '@/lib/razorpay-client';
import { generateInvoicePDF, downloadPDF, InvoiceData } from '@/lib/invoice/pdfGenerator';

interface ProformaInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  proposalId: string;
  proposalDescription: string;
  companyDetails: {
    name: string;
    address: string;
    email: string;
    phone: string;
    gstin?: string;
    website?: string;
  };
  clientDetails: {
    name: string;
    companyName?: string;
    email: string;
    phone?: string;
    billingAddress?: string;
  };
  lineItems: {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
  pricing: {
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    advancePercentage: number;
    advanceAmount: number;
    balanceAmount: number;
    currency: 'INR' | 'USD';
  };
  paymentTerms?: string;
  notes?: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifscCode?: string;
    accountHolderName: string;
  };
  razorpayDetails: {
    keyId: string;
    paymentLink?: string;
  };
  paymentUrl: string;
}

function formatCurrency(amount: number, currency: 'INR' | 'USD'): string {
  const formatter = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ProformaInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const proposalId = params.proposalId as string;

  const [invoiceData, setInvoiceData] = useState<ProformaInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    fetchInvoiceData();
  }, [proposalId]);

  const fetchInvoiceData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/payments/proforma/${proposalId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch invoice data');
      }

      const data = await response.json();
      setInvoiceData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoiceData) return;

    try {
      setPdfGenerating(true);
      const response = await fetch(`/api/payments/proforma/${proposalId}?format=pdf`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      downloadPDF(blob, `proforma-${invoiceData.invoiceNumber}.pdf}`);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!invoiceData) return;

    try {
      setSendingEmail(true);
      setEmailSent(false);
      
      const response = await fetch('/api/payments/send-proforma-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: invoiceData.clientDetails.email,
          customerName: invoiceData.clientDetails.name,
          invoiceNumber: invoiceData.invoiceNumber,
          proposalId: invoiceData.proposalId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 5000);
    } catch (err) {
      console.error('Error sending email:', err);
      alert('Failed to send email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePayNow = async () => {
    if (!invoiceData) return;

    try {
      setPaymentLoading(true);
      
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment system');
      }

      const order = await createRazorpayOrder(
        proposalId,
        invoiceData.pricing.advanceAmount,
        invoiceData.pricing.currency
      );

      const options = {
        key: invoiceData.razorpayDetails.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Motionify',
        description: `Advance Payment - Proforma ${invoiceData.invoiceNumber}`,
        order_id: order.id,
        prefill: {
          name: invoiceData.clientDetails.name,
          email: invoiceData.clientDetails.email,
          contact: invoiceData.clientDetails.phone || '',
        },
        handler: (response: any) => {
          router.push(`/payment/success?razorpay_payment_id=${response.razorpay_payment_id}&razorpay_order_id=${response.razorpay_order_id}&proposalId=${proposalId}`);
        },
        theme: {
          color: '#7C3AED',
        },
      };

      await openRazorpayCheckout(options);
    } catch (err) {
      console.error('Payment error:', err);
      alert(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoiceData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Invoice Not Found</h1>
          <p className="mt-2 text-gray-600">{error || 'The requested invoice could not be found.'}</p>
          <button
            onClick={() => router.back()}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm text-violet-600 hover:text-violet-700"
          >
            <ChevronLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <div className="bg-white shadow-lg rounded-xl overflow-hidden print:shadow-none">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Proforma Invoice</h1>
                <p className="text-violet-100 text-sm mt-1">Advance Payment Request</p>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">{invoiceData.invoiceNumber}</p>
                <p className="text-violet-100 text-sm">Date: {formatDate(invoiceData.invoiceDate)}</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                  <Building2 className="w-4 h-4 text-violet-600" />
                  From
                </h3>
                <div className="text-gray-700">
                  <p className="font-semibold">{invoiceData.companyDetails.name}</p>
                  <p className="text-sm mt-1">{invoiceData.companyDetails.address}</p>
                  <p className="text-sm">{invoiceData.companyDetails.email}</p>
                  <p className="text-sm">{invoiceData.companyDetails.phone}</p>
                  {invoiceData.companyDetails.gstin && (
                    <p className="text-sm mt-1">GSTIN: {invoiceData.companyDetails.gstin}</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                  <User className="w-4 h-4 text-violet-600" />
                  Bill To
                </h3>
                <div className="text-gray-700">
                  <p className="font-semibold">{invoiceData.clientDetails.name}</p>
                  {invoiceData.clientDetails.companyName && (
                    <p className="text-sm mt-1">{invoiceData.clientDetails.companyName}</p>
                  )}
                  <p className="text-sm">{invoiceData.clientDetails.email}</p>
                  {invoiceData.clientDetails.phone && (
                    <p className="text-sm">{invoiceData.clientDetails.phone}</p>
                  )}
                  {invoiceData.clientDetails.billingAddress && (
                    <p className="text-sm mt-1">{invoiceData.clientDetails.billingAddress}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-8">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-violet-600" />
                <span className="text-gray-600">Payment Due Date:</span>
                <span className="font-semibold text-gray-900">{formatDate(invoiceData.dueDate)}</span>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                <FileText className="w-4 h-4 text-violet-600" />
                Project Details
              </h3>
              <p className="text-gray-700">{invoiceData.proposalDescription}</p>
            </div>

            <div className="overflow-x-auto mb-8">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left text-sm font-semibold text-gray-700 px-4 py-3">Description</th>
                    <th className="text-center text-sm font-semibold text-gray-700 px-4 py-3 w-20">Qty</th>
                    <th className="text-right text-sm font-semibold text-gray-700 px-4 py-3 w-28">Rate</th>
                    <th className="text-right text-sm font-semibold text-gray-700 px-4 py-3 w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.lineItems.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-gray-700">
                        <div className="whitespace-pre-wrap">{item.description}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatCurrency(item.rate, invoiceData.pricing.currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 font-medium">
                        {formatCurrency(item.amount, invoiceData.pricing.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-end mb-8">
              <div className="w-full sm:w-64 space-y-2">
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(invoiceData.pricing.subtotal, invoiceData.pricing.currency)}</span>
                </div>
                {invoiceData.pricing.taxAmount > 0 && (
                  <div className="flex justify-between text-gray-600 text-sm">
                    <span>Tax ({invoiceData.pricing.taxRate}%)</span>
                    <span>{formatCurrency(invoiceData.pricing.taxAmount, invoiceData.pricing.currency)}</span>
                  </div>
                )}
                <div className="border-t-2 border-violet-100 pt-2 mt-2">
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span>{formatCurrency(invoiceData.pricing.total, invoiceData.pricing.currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-violet-50 rounded-lg p-6 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-violet-600" />
                <h3 className="font-semibold text-gray-900">Advance Payment ({invoiceData.pricing.advancePercentage}%)</h3>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-600">Amount Due Now</p>
                  <p className="text-2xl font-bold text-violet-600">
                    {formatCurrency(invoiceData.pricing.advanceAmount, invoiceData.pricing.currency)}
                  </p>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Balance After Advance: {formatCurrency(invoiceData.pricing.balanceAmount, invoiceData.pricing.currency)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {invoiceData.bankDetails && (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                    <Building2 className="w-4 h-4 text-violet-600" />
                    Bank Details
                  </h3>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><span className="font-medium">Bank:</span> {invoiceData.bankDetails.bankName}</p>
                    <p><span className="font-medium">A/C No:</span> {invoiceData.bankDetails.accountNumber}</p>
                    {invoiceData.bankDetails.ifscCode && (
                      <p><span className="font-medium">IFSC:</span> {invoiceData.bankDetails.ifscCode}</p>
                    )}
                    <p><span className="font-medium">Name:</span> {invoiceData.bankDetails.accountHolderName}</p>
                  </div>
                </div>
              )}

              {invoiceData.paymentTerms && (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                    <FileText className="w-4 h-4 text-violet-600" />
                    Payment Terms
                  </h3>
                  <p className="text-sm text-gray-700">{invoiceData.paymentTerms}</p>
                </div>
              )}
            </div>

            {invoiceData.notes && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Notes</h3>
                <p className="text-sm text-gray-700">{invoiceData.notes}</p>
              </div>
            )}

            <div className="border-t border-gray-200 pt-8">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleDownloadPDF}
                  disabled={pdfGenerating}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {pdfGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download PDF
                </button>

                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {sendingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : emailSent ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {emailSent ? 'Email Sent!' : 'Send to Email'}
                </button>

                <button
                  onClick={handlePayNow}
                  disabled={paymentLoading}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-semibold hover:from-violet-700 hover:to-purple-700 transition-colors disabled:opacity-50"
                >
                  {paymentLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Pay {formatCurrency(invoiceData.pricing.advanceAmount, invoiceData.pricing.currency)} Now
                    </>
                  )}
                </button>
              </div>

              {emailSent && (
                <p className="mt-3 text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Proforma invoice has been sent to {invoiceData.clientDetails.email}
                </p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
            <p className="text-center text-sm text-gray-500">
              This is a proforma invoice. Payment confirms acceptance of terms and conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
