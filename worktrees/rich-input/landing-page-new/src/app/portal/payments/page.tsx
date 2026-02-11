import PaymentsPage from '@/lib/portal/pages/PaymentsPage';

export const metadata = {
  title: 'Payments - Portal',
  description: 'View your payment history and manage pending payments',
};

export default function PortalPaymentsPage() {
  return <PaymentsPage />;
}
