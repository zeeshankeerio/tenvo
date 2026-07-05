import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchBusinessByDomain } from '@/lib/storefront/fetchBusinessByDomain';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';

export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const { businessDomain } = await params;
  const result = await fetchBusinessByDomain(businessDomain);
  if (!result.success) return { title: 'Privacy Policy' };
  return { title: `Privacy Policy | ${result.business.business_name}` };
}

export default async function PrivacyPage({ params }) {
  const { businessDomain } = await params;
  const result = await fetchBusinessByDomain(businessDomain);
  if (!result.success) notFound();

  const { business, settings } = result;
  const accent = getStoreAccentColor(settings, business.category);
  const storeName = business.business_name;

  const sections = [
    {
      title: '1. Information We Collect',
      content: `When you shop with ${storeName} we collect information you provide directly, such as your name, email address, phone number, and delivery address, as well as transaction data needed to process your orders. We may also collect usage data (pages visited, products viewed) to improve your experience.`,
    },
    {
      title: '2. How We Use Your Information',
      content: `We use your information to process and fulfil your orders, communicate order updates and shipping notifications, respond to your enquiries, improve our store and product offering, and (with your consent) send you promotional emails about offers and new arrivals.`,
    },
    {
      title: '3. Sharing Your Information',
      content: `We do not sell your personal data. We share information only with trusted service providers who help us operate our store (e.g. payment processors, courier services) and only to the extent necessary to fulfil our services. We may disclose information if required by law.`,
    },
    {
      title: '4. Cookies',
      content: `Our store uses cookies to maintain your cart session, remember your preferences, and analyse site traffic. You can disable cookies in your browser settings, but some store features may not function correctly without them.`,
    },
    {
      title: '5. Data Security',
      content: `We implement industry-standard security measures including SSL encryption to protect your data during transmission. Payment card details are processed securely by our payment providers and are never stored on our servers.`,
    },
    {
      title: '6. Data Retention',
      content: `We retain your personal data for as long as necessary to provide our services and comply with legal obligations. You may request deletion of your account and associated data at any time by contacting us.`,
    },
    {
      title: '7. Your Rights',
      content: `You have the right to access, correct, or delete your personal data. You may also opt out of marketing communications at any time by clicking the unsubscribe link in any email or by contacting us directly.`,
    },
    {
      title: '8. Third-Party Links',
      content: `Our store may contain links to third-party websites. We are not responsible for the privacy practices of those sites and encourage you to review their privacy policies.`,
    },
    {
      title: '9. Children\'s Privacy',
      content: `Our store is not directed to children under 13. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such data, please contact us immediately.`,
    },
    {
      title: '10. Changes to This Policy',
      content: `We may update this Privacy Policy from time to time. Changes will be published on this page with a revised effective date. Continued use of the store after changes constitutes your acceptance of the updated policy.`,
    },
    {
      title: '11. Contact',
      content: `If you have any questions about this Privacy Policy or how we handle your data, please contact us via the Contact page or at ${business.email || 'our support email'}.`,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href={`/store/${businessDomain}`} className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
          ← Back to Store
        </Link>

        <h1 className="text-3xl font-black text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Effective date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {sections.map((section) => (
            <div key={section.title} className="p-6">
              <h2 className="font-bold text-gray-900 mb-2" style={{ color: accent }}>{section.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center text-sm text-gray-500">
          Questions?{' '}
          <Link href={`/store/${businessDomain}/contact`} className="font-semibold" style={{ color: accent }}>
            Contact us
          </Link>
        </div>
      </div>
    </div>
  );
}
