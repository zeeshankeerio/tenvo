import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getBusinessByDomain } from '@/lib/actions/storefront/business';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { resolveStoreContact } from '@/lib/storefront/businessContact';
import { RotateCcw, CheckCircle, XCircle, Package, Clock } from 'lucide-react';

export async function generateMetadata({ params }) {
  const { businessDomain } = await params;
  const result = await getBusinessByDomain(businessDomain);
  if (!result.success) return { title: 'Returns Policy' };
  return { title: `Returns & Exchanges | ${result.business.business_name}` };
}

export default async function ReturnsPage({ params }) {
  const { businessDomain } = await params;
  const result = await getBusinessByDomain(businessDomain);
  if (!result.success) notFound();

  const { business, settings } = result;
  const accent = getStoreAccentColor(settings, business.category);
  const returnDays = settings?.returnPolicyDays || 7;
  const contact = resolveStoreContact({ business, settings });
  const contactLine = contact.email
    ? `Email us at ${contact.email} or use the Contact page with your order number and reason for return.`
    : 'Use the Contact page with your order number and reason for return.';

  const eligible = [
    'Item is unused and in original condition',
    'Original packaging is intact',
    'Return requested within the return window',
    'Item is not from the non-returnable list',
  ];

  const nonReturnable = [
    'Perishable goods (food, beverages)',
    'Personalised or custom-made items',
    'Intimate or sanitary products',
    'Digital downloads or gift cards',
    'Items marked as Final Sale',
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href={`/store/${businessDomain}`} className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
          ← Back to Store
        </Link>

        <h1 className="text-3xl font-black text-gray-900 mb-2">Returns & Exchanges</h1>
        <p className="text-gray-500 mb-10">We want you to be 100% happy. Here is how our returns process works.</p>

        {/* Return window banner */}
        <div className="rounded-2xl p-6 mb-6 text-white flex items-center gap-4" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
          <Clock className="w-10 h-10 opacity-80 flex-shrink-0" />
          <div>
            <p className="text-2xl font-black">{returnDays}-Day Return Window</p>
            <p className="text-white/80 text-sm mt-0.5">Request a return within {returnDays} days of receiving your order.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Eligible items */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" /> Items Eligible for Return
            </h2>
            <ul className="space-y-2">
              {eligible.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Non-returnable */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" /> Non-Returnable Items
            </h2>
            <ul className="space-y-2">
              {nonReturnable.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                  <XCircle className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Process */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" style={{ color: accent }} /> How to Return
            </h2>
            <ol className="space-y-4">
              {[
                { step: '1', title: 'Contact Us', desc: contactLine },
                { step: '2', title: 'Get Approval', desc: 'Our team will review your request and send a return authorisation within 1-2 business days.' },
                { step: '3', title: 'Ship the Item', desc: 'Pack the item securely and send it to our return address provided in the authorisation email.' },
                { step: '4', title: 'Refund Processed', desc: 'Once we receive and inspect the item, your refund will be processed within 5-7 business days to the original payment method.' },
              ].map((s) => (
                <li key={s.step} className="flex gap-4">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: accent }}>
                    {s.step}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{s.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Exchanges */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5" style={{ color: accent }} /> Exchanges
            </h2>
            <p className="text-gray-600 text-sm">
              Want a different size or colour? We are happy to exchange eligible items. Follow the return process above and mention you would like an exchange. Subject to stock availability.
            </p>
          </div>
        </div>

        <div className="mt-10 text-center text-sm text-gray-500">
          Need help?{' '}
          <Link href={`/store/${businessDomain}/contact`} className="font-semibold" style={{ color: accent }}>
            Contact our support team
          </Link>
        </div>
      </div>
    </div>
  );
}
