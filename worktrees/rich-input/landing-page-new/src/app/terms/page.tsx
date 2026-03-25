import Link from 'next/link';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

export const metadata = {
  title: 'Terms and Conditions - Motionify Studio',
  description: 'Terms and conditions for using Motionify Studio services',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Terms and Conditions
        </h1>

        <div className="prose prose-invert prose-lg max-w-none space-y-8">
          <p className="text-gray-300 leading-relaxed">
            Welcome to Motionify Studio, owned and operated by Motionify ("we," "our," or "us").
            By accessing or using the Motionify Studio website and portal ("Platform"), you agree to comply with and be bound by these Terms and Conditions. Please read them carefully before using our services.
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Service Overview</h2>
            <p className="text-gray-300 leading-relaxed">
              Motionify Studio acts as a creative service provider offering various video production, animation, and digital design solutions through a structured online ordering system. All services, durations, formats, and styles are pre-defined and available for clients to select directly through the Motionify Studio portal.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Account & Registration</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Clients must register an account to place an order.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials and for all activities conducted under your account.</li>
              <li>Motionify reserves the right to suspend or terminate any account found in violation of our policies.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. Order Process</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Browse and select desired services listed on Motionify Studio.</li>
              <li>Review the proposal, contract, NDA, and scope of work.</li>
              <li>Accept the terms and proceed to make a 50% advance payment to initiate the project.</li>
              <li>Track project progress, revisions, and final delivery through your account.</li>
              <li>All contracts, NDAs, and revision rules are digitally generated and accepted before payment.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Payment Terms</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>50% advance payment is mandatory to start production.</li>
              <li>Remaining 50% balance is payable before the release of the final delivery files.</li>
              <li>All payments are accepted through secure online payment gateways integrated within the platform.</li>
              <li>Any applicable taxes or payment gateway fees will be displayed at checkout.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Delivery Policy</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Beta delivery is shared with Motionify watermark and limited resolution.</li>
              <li>Final delivery is provided upon approval and settlement of full payment.</li>
              <li>Source files delivery will not come with actual final delivery and it's addons scope from client and it's optional.</li>
              <li>Delivery files remain accessible in your portal account for 365 days after completion. After that, files are permanently deleted from our servers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Revisions & Feedback</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Revision terms are defined within each project's scope and contract.</li>
              <li>Additional changes outside the approved scope may incur extra charges.</li>
              <li>All feedback and revisions must be shared through the portal to maintain project logs.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Intellectual Property</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>All works are white-label and delivered under client branding.</li>
              <li>Motionify retains full copyright ownership of project files and source files unless otherwise specified in the contract.</li>
              <li>If source files are required, they must be explicitly added as a paid add-on in the agreement.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Cancellations & Refunds</h2>
            <p className="text-gray-300 leading-relaxed">
              Refer to our <Link href="/cancellation-refund" className="text-orange-400 hover:text-orange-300 transition-colors">Cancellation and Refund Policy</Link> for detailed terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Confidentiality</h2>
            <p className="text-gray-300 leading-relaxed">
              All projects, client information, and creative materials are treated as confidential. Both parties are bound by a Non-Disclosure Agreement (NDA) prior to project commencement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Limitation of Liability</h2>
            <p className="text-gray-300 leading-relaxed mb-4">Motionify is not responsible for:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Delays caused by client feedback delays or third-party dependencies.</li>
              <li>Loss of files after the 365-day retention period.</li>
              <li>Misuse of delivered materials by third parties.</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              Our total liability shall not exceed the total amount paid by the client for that specific project.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Governing Law</h2>
            <p className="text-gray-300 leading-relaxed">
              These Terms are governed by the laws of India, and any disputes shall be subject to the jurisdiction of the Chennai courts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. Contact</h2>
            <p className="text-gray-300 leading-relaxed">
              For any questions regarding these Terms, please contact us at:{' '}
              <a href="mailto:support@motionify.studio" className="text-orange-400 hover:text-orange-300 transition-colors">
                support@motionify.studio
              </a>
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
