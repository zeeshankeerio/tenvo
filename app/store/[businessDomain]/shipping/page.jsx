import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchBusinessByDomain } from '@/lib/storefront/fetchBusinessByDomain';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { resolveStorefrontCurrency } from '@/lib/storefront/storefrontRegional';
import { resolveStoreContact } from '@/lib/storefront/businessContact';
import { Truck, Clock, MapPin, Package, AlertCircle } from 'lucide-react';

/** Semi-static policy page — ISR with tenant shell cache invalidation. */
export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const { businessDomain } = await params;
  const result = await fetchBusinessByDomain(businessDomain);
  if (!result.success) return { title: 'Shipping Info' };
  return { title: `Shipping Information | ${result.business.business_name}` };
}

export default async function ShippingPage({ params }) {
  const { businessDomain } = await params;
  const result = await fetchBusinessByDomain(businessDomain);
  if (!result.success) notFound();

  const { business, settings } = result;
  const accent = getStoreAccentColor(settings, business.category);
  const freeShippingThreshold = settings?.freeShippingThreshold || 2000;
  const returnDays = settings?.returnPolicyDays || 7;
  const currency = resolveStorefrontCurrency(settings, business);
  const standardFlat = settings?.shippingStandardFee ?? 150;
  const expressFlat = settings?.shippingExpressFee ?? 300;
  const contact = resolveStoreContact({ business, settings });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href={`/store/${businessDomain}`} className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
          ← Back to Store
        </Link>

        <h1 className="text-3xl font-black text-gray-900 mb-2">Shipping Information</h1>
        <p className="text-gray-500 mb-10">Everything you need to know about delivery at {business.business_name}.</p>

        <div className="space-y-6">
          {/* Free Shipping */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: accent + '20' }}>
                <Truck className="w-5 h-5" style={{ color: accent }} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Free Shipping</h2>
            </div>
            <p className="text-gray-600">
              Enjoy free standard shipping on all orders over{' '}
              <strong>{formatCurrency(freeShippingThreshold, currency)}</strong>. No promo code needed, the discount is applied automatically at checkout.
            </p>
          </div>

          {/* Delivery Options */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: accent + '20' }}>
                <Clock className="w-5 h-5" style={{ color: accent }} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Delivery Options</h2>
            </div>
            <div className="space-y-3">
              {[
                {
                  name: 'Standard Delivery',
                  time: '3-5 business days',
                  price: `Free on orders over ${formatCurrency(freeShippingThreshold, currency)}, otherwise ${formatCurrency(standardFlat, currency)}`,
                },
                {
                  name: 'Express Delivery',
                  time: '1-2 business days',
                  price: formatCurrency(expressFlat, currency),
                },
                { name: 'Store Pickup', time: 'Same day (during business hours)', price: 'Free' },
              ].map((opt) => (
                <div key={opt.name} className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-semibold text-gray-900">{opt.name}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {opt.time}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-700 text-right ml-4">{opt.price}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Coverage */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: accent + '20' }}>
                <MapPin className="w-5 h-5" style={{ color: accent }} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Delivery Coverage</h2>
            </div>
            <p className="text-gray-600">
              We currently deliver across Pakistan. International shipping is not available at this time.
              {business.city && ` ${business.business_name} is based in ${business.city}.`}
            </p>
          </div>

          {/* Tracking */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: accent + '20' }}>
                <Package className="w-5 h-5" style={{ color: accent }} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Order Tracking</h2>
            </div>
            <p className="text-gray-600 mb-3">
              Once your order is dispatched you will receive a confirmation. You can track your order status anytime from the Order History page.
            </p>
            <Link
              href={`/store/${businessDomain}/orders`}
              className="inline-flex items-center gap-2 text-sm font-semibold"
              style={{ color: accent }}
            >
              Track My Order →
            </Link>
          </div>

          {/* Notes */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Important Notes</p>
              <ul className="space-y-1 list-disc list-inside text-amber-700">
                <li>Standard return window: {returnDays} days from delivery (see the Returns page).</li>
                <li>Delivery times are estimates and may vary due to location or high demand.</li>
                <li>Orders placed after 5 PM are processed the next business day.</li>
                <li>We are not responsible for delays caused by courier partners.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-sm text-gray-500">
          Questions?{' '}
          {contact.email ? (
            <a href={`mailto:${contact.email}`} className="font-semibold" style={{ color: accent }}>
              Contact us
            </a>
          ) : (
            <Link href={`/store/${businessDomain}/contact`} className="font-semibold" style={{ color: accent }}>
              Contact us
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
