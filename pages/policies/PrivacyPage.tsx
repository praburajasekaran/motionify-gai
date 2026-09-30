import { PolicyLayout } from './PolicyLayout';

export default function PrivacyPage() {
  return (
    <PolicyLayout title="Privacy Policy">
    <p className="text-gray-300 leading-relaxed">
      At Motionify Studio, we respect your privacy and are committed to protecting your personal information.
      This Privacy Policy explains how we collect, use, and safeguard your data.
    </p>

    <section>
      <h2 className="text-2xl font-semibold text-white mb-4">1. Information We Collect</h2>
      <p className="text-gray-300 leading-relaxed mb-4">We may collect the following types of data:</p>
      <ul className="list-disc list-inside text-gray-300 space-y-2">
        <li>Personal Information (name, email, phone, company name)</li>
        <li>Payment and billing details (via secure gateways; Motionify Studio does not store card details)</li>
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
    </PolicyLayout>
  );
}
