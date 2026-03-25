import Link from 'next/link';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

export const metadata = {
  title: 'Cancellation & Refund Policy - Motionify Studio',
  description: 'Cancellation and refund policy for Motionify Studio services',
};

export default function CancellationRefundPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Cancellation & Refund Policy
        </h1>

        <div className="prose prose-invert prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Project Cancellation</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Clients may request cancellation before production begins.</li>
              <li>If production has started, cancellation requests will be subject to review based on progress and costs incurred.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Refund Eligibility</h2>
            <p className="text-gray-300 leading-relaxed mb-4">Refunds are processed as per the following structure:</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-white/10 rounded-lg">
                <thead>
                  <tr className="bg-white/5">
                    <th className="border border-white/10 px-4 py-3 text-left text-white font-semibold">Stage</th>
                    <th className="border border-white/10 px-4 py-3 text-left text-white font-semibold">Refund Eligibility</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-white/10 px-4 py-3 text-gray-300">Before contract acceptance</td>
                    <td className="border border-white/10 px-4 py-3 text-gray-300">100% refund</td>
                  </tr>
                  <tr className="bg-white/5">
                    <td className="border border-white/10 px-4 py-3 text-gray-300">After contract acceptance but before production</td>
                    <td className="border border-white/10 px-4 py-3 text-gray-300">90% refund</td>
                  </tr>
                  <tr>
                    <td className="border border-white/10 px-4 py-3 text-gray-300">During production phase</td>
                    <td className="border border-white/10 px-4 py-3 text-gray-300">Partial refund based on completed work</td>
                  </tr>
                  <tr className="bg-white/5">
                    <td className="border border-white/10 px-4 py-3 text-gray-300">After Beta delivery</td>
                    <td className="border border-white/10 px-4 py-3 text-gray-300">No refund applicable</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. Non-Refundable Items</h2>
            <p className="text-gray-300 leading-relaxed">
              Payments made for add-ons like source files, additional revisions, or express delivery fees are non-refundable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Refund Process</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Approved refunds are processed within 7–10 business days via the original payment method.</li>
              <li>Payment gateway or transaction charges may be deducted.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Motionify's Right to Cancel</h2>
            <p className="text-gray-300 leading-relaxed">
              Motionify reserves the right to cancel any order due to unforeseen operational or technical reasons.
              In such cases, the client will receive a full refund of any payments made.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            Back to Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

