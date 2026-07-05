import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchBusinessByDomain } from '@/lib/storefront/fetchBusinessByDomain';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';

export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const { businessDomain } = await params;
  const result = await fetchBusinessByDomain(businessDomain);
  if (!result.success) return { title: 'Terms of Service' };
  return { title: `Terms of Service | ${result.business.business_name}` };
}

export default async function TermsPage({ params }) {
  const { businessDomain } = await params;
  const result = await fetchBusinessByDomain(businessDomain);
  if (!result.success) notFound();

  const { business, settings } = result;
  const accent = getStoreAccentColor(settings, business.category);
  const storeName = business.business_name;

  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: `By accessing and using the ${storeName} online store, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our store.`,
    },
    {
      title: '2. Use of the Store',
      content: `You may use our store only for lawful purposes and in accordance with these Terms. You agree not to use the store in any way that violates applicable law, transmits unsolicited communications, or attempts to gain unauthorised access to any part of the service.`,
    },
    {
      title: '3. Product Information',
      content: `We strive to ensure all product descriptions, images, and pricing are accurate. However, errors may occur. We reserve the right to correct any errors and to cancel orders placed at an incorrect price, with a full refund provided.`,
    },
    {
      title: '4. Orders & Payment',
      content: `By placing an order you are making an offer to purchase. We reserve the right to decline or cancel any order at our discretion. Full payment is required before dispatch (except for Cash on Delivery orders). All prices are inclusive of applicable taxes unless stated otherwise.`,
    },
    {
      title: '5. Shipping & Delivery',
      content: `Delivery times are estimates only. ${storeName} is not liable for delays caused by courier services, customs, or events outside our control. Risk of loss passes to you upon delivery.`,
    },
    {
      title: '6. Returns & Refunds',
      content: `Our return and refund policy is detailed on the Returns & Exchanges page. Returns must comply with the eligibility criteria stated there. Refunds are issued to the original payment method.`,
    },
    {
      title: '7. Intellectual Property',
      content: `All content on this store, including text, images, logos, and graphics, is the property of ${storeName} or its suppliers and is protected by applicable intellectual property laws. You may not reproduce or redistribute content without prior written consent.`,
    },
    {
      title: '8. Limitation of Liability',
      content: `${storeName} shall not be liable for any indirect, incidental, or consequential damages arising from the use of, or inability to use, this store or any products purchased from it. Our total liability shall not exceed the purchase price of the relevant product.`,
    },
    {
      title: '9. Privacy',
      content: `Your use of this store is also governed by our Privacy Policy, which is incorporated into these Terms by reference.`,
    },
    {
      title: '10. Changes to Terms',
      content: `We reserve the right to update these Terms at any time. Changes will be posted on this page with an updated effective date. Continued use of the store after changes constitutes acceptance of the new Terms.`,
    },
    {
      title: '11. Governing Law',
      content: `These Terms are governed by the laws of Pakistan. Any disputes shall be subject to the exclusive jurisdiction of the courts of Pakistan.`,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href={`/store/${businessDomain}`} className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
          ← Back to Store
        </Link>

        <h1 className="text-3xl font-black text-gray-900 mb-2">Terms of Service</h1>
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
          Questions about these terms?{' '}
          <Link href={`/store/${businessDomain}/contact`} className="font-semibold" style={{ color: accent }}>
            Contact us
          </Link>
        </div>
      </div>
    </div>
  );
}
