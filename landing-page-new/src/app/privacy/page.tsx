import Link from 'next/link';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

export const metadata = {
  title: 'Privacy Policy - Motionify Studio',
  description: 'Privacy policy for Motionify Studio services',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Privacy Policy
        </h1>

        <div className="prose prose-invert prose-lg max-w-none space-y-8">
          <p className="text-gray-300 leading-relaxed">
            At Motionify Studio, we respect your privacy and are committed to protecting your personal information.
            This Privacy Policy explains how we collect, use, and safeguard your data.
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Information We Collect</h2>
            <p className="text-gray-300 leading-relaxed mb-4">We may collect the following types of data:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Personal Information (name, email, phone, company name)</li>
              <li>Payment and billing details (via secure gateways; Motionify does not store card details)</li>
              <li>Project-related content and file uploads</li>
              <li>Portal usage and communication records</li>
              <li>Technical data (IP address, browser type, cookies, and device information)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>To process and manage service orders</li>
              <li>To communicate updates, contracts, and delivery details</li>
              <li>To provide customer support and resolve queries</li>
              <li>To send invoices, payment reminders, and notifications</li>
              <li>To improve our services and enhance user experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. Data Sharing</h2>
            <p className="text-gray-300 leading-relaxed mb-4">We do not sell or rent your data to third parties. We may share data only with:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Authorized team members and freelancers working under NDA</li>
              <li>Legal or regulatory authorities (if required by law)</li>
              <li>Payment and hosting providers for secure transactions and platform operation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Data Retention</h2>
            <p className="text-gray-300 leading-relaxed">
              All project-related files and communications are retained for 365 days after completion.
              After expiration, files are automatically deleted from our servers for security reasons.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Cookies</h2>
            <p className="text-gray-300 leading-relaxed mb-4">We use cookies to:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Keep you signed in</li>
              <li>Remember user preferences</li>
              <li>Improve analytics and portal performance</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              You can disable cookies in your browser, but some features may not function properly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Your Rights</h2>
            <p className="text-gray-300 leading-relaxed mb-4">You may:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Request a copy of your data</li>
              <li>Request correction or deletion of your information</li>
              <li>Withdraw consent for marketing communications at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Data Security</h2>
            <p className="text-gray-300 leading-relaxed">
              All data is protected with SSL encryption, secure cloud storage, and role-based access controls.
              Payment transactions are processed through PCI-DSS-compliant gateways.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Changes to This Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this policy periodically. Changes will be reflected with a new effective date on this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Contact</h2>
            <p className="text-gray-300 leading-relaxed">
              For any questions regarding this Privacy Policy, please contact us at:{' '}
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

