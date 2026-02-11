import Link from 'next/link';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

export const metadata = {
  title: 'Shipping / Delivery Policy - Motionify Studio',
  description: 'Shipping and delivery policy for Motionify Studio services',
};

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Shipping / Delivery Policy
        </h1>

        <div className="prose prose-invert prose-lg max-w-none space-y-8">
          <p className="text-gray-300 leading-relaxed">
            Since Motionify Studio provides digital creative services, there is no physical shipping.
            All deliveries are made electronically through the Motionify Studio Portal.
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Delivery Timeline</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Project timelines are communicated and agreed upon during order confirmation.</li>
              <li>Delivery dates may vary based on service type, feedback cycles, and revisions.</li>
              <li>Delays due to client non-response or additional scope will extend delivery time.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Beta & Final Delivery</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Beta versions (with watermark) are shared for review.</li>
              <li>Final deliverables are shared post-approval and final payment.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. Delivery Access</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>All files are downloadable through your portal account.</li>
              <li>Files remain accessible for 365 days after delivery completion.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. File Expiration</h2>
            <p className="text-gray-300 leading-relaxed">
              After the 365-day period, files will be permanently deleted, and Motionify will not retain any backup copies.
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

