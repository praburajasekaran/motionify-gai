import { PolicyLayout } from './PolicyLayout';

export default function ShippingPage() {
  return (
    <PolicyLayout title="Shipping / Delivery Policy">
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
        After the 365-day period, files will be permanently deleted, and Motionify Studio will not retain any backup copies.
      </p>
    </section>
    </PolicyLayout>
  );
}
