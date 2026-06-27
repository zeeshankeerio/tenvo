'use client';

import Link from 'next/link';
import { ArrowRight, Phone, Fuel, Calendar, Gauge, MapPin } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { formatCurrency } from '@/lib/currency';
import { getEffectiveProductImageUrl } from '@/lib/storefront/productImageFallback';
import { estimateVehicleMonthlyPayment, isShowroomVehicleProduct } from '@/lib/storefront/autoDealership';
import { buildVehicleBookingHref } from '@/lib/storefront/dealershipBooking';
import { cn } from '@/lib/utils';
import {
  STORE_VEHICLE_RAIL_TRACK_CLASS,
  STORE_PRODUCT_RAIL_ITEM_CLASS,
} from '@/lib/utils/storefrontProductRail';

function MetaChip({ icon: Icon, children }) {
  if (!children) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
      {Icon ? <Icon className="h-3 w-3 shrink-0" aria-hidden /> : null}
      {children}
    </span>
  );
}

/**
 * Horizontal vehicle carousel cards for dealership inventory sections.
 */
export function DealershipVehicleRail({
  products = [],
  businessDomain,
  businessCategory,
  currency = 'PKR',
  accent = '#111827',
  variant = 'dealership',
  callPhone,
  callLabel = 'Call now',
  storeBase,
  meetingUrl,
}) {
  if (!products.length) return null;

  const isShowroom = variant === 'showroom';

  return (
    <div className={STORE_VEHICLE_RAIL_TRACK_CLASS}>
      {products.map((product) => {
        const href = `/store/${businessDomain}/products/${product.slug || product.id}`;
        const image = getEffectiveProductImageUrl(product, businessCategory);
        const price = Number(product.display_price ?? product.price ?? 0);
        const monthly = estimateVehicleMonthlyPayment(price);
        const dd = product.domain_data || {};
        const isVehicle = isShowroomVehicleProduct(product);
        const showCallCta = isShowroom && isVehicle && price >= 1000000 && callPhone;
        const showBookCta = isVehicle && storeBase;

        return (
          <article
            key={product.id}
            className={cn(
              'group overflow-hidden rounded-lg border border-neutral-100 bg-white shadow-sm transition hover:border-neutral-300 hover:shadow-md',
              STORE_PRODUCT_RAIL_ITEM_CLASS
            )}
          >
            <Link href={href} className="block">
              <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
                {image ? (
                  <SmartProductImage
                    src={image}
                    alt={product.name}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : null}
              </div>
              <div className="p-4">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900">
                  {product.name}
                </h3>

                {isShowroom && isVehicle ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <MetaChip icon={Fuel}>{dd.fueltype}</MetaChip>
                    <MetaChip icon={Calendar}>{dd.modelyear}</MetaChip>
                    {dd.mileage ? <MetaChip icon={Gauge}>{Number(dd.mileage).toLocaleString()} km</MetaChip> : null}
                    {dd.registrationcity ? <MetaChip icon={MapPin}>{dd.registrationcity}</MetaChip> : null}
                    {dd.transmission ? <MetaChip>{dd.transmission}</MetaChip> : null}
                  </div>
                ) : null}

                <p className="mt-2 text-sm text-neutral-600">
                  {isShowroom ? 'Price ' : 'Price from '}
                  <span className="font-semibold tabular-nums text-neutral-900">
                    {formatCurrency(price, currency, { maximumFractionDigits: 0 })}
                  </span>
                </p>
                {!isShowroom && monthly > 0 ? (
                  <p className="mt-1 text-xs text-neutral-500">
                    Monthly from{' '}
                    <span className="font-semibold tabular-nums text-neutral-700">
                      {formatCurrency(monthly, currency, { maximumFractionDigits: 0 })}
                    </span>
                  </p>
                ) : null}
                {!showCallCta && !showBookCta ? (
                  <span
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide"
                    style={{ color: accent }}
                  >
                    View details <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                ) : null}
              </div>
            </Link>
            {showCallCta || showBookCta ? (
              <div className="space-y-2 border-t border-neutral-100 px-4 pb-4 pt-2">
                {showCallCta ? (
                  <a
                    href={`tel:${callPhone}`}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-neutral-800"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    {callLabel}
                  </a>
                ) : null}
                {showBookCta ? (
                  <>
                    <Link
                      href={buildVehicleBookingHref(storeBase, 'testdrive', product.name)}
                      className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-200 py-2 text-xs font-bold uppercase tracking-wide text-neutral-800 transition hover:border-neutral-900"
                    >
                      Book test drive
                    </Link>
                    {meetingUrl ? (
                      <a
                        href={meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-md py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:opacity-90"
                        style={{ backgroundColor: accent }}
                      >
                        <Calendar className="h-3.5 w-3.5" aria-hidden />
                        Book online
                      </a>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
