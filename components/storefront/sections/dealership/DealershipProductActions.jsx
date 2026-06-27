'use client';

import Link from 'next/link';
import { Phone, Car, Percent, MessageCircle, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { isShowroomVehicleProduct } from '@/lib/storefront/autoDealership';
import { buildVehicleBookingHref } from '@/lib/storefront/dealershipBooking';
import { getTenantMeetingUrl, shouldOfferTenantMeetingLink } from '@/lib/storefront/storefrontBooking';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { resolveStoreContact } from '@/lib/storefront/businessContact';
import { cn } from '@/lib/utils';

/**
 * Vehicle listing actions on product detail (call, test drive, finance) vs standard add-to-cart flow.
 */
export function DealershipProductActions({
  product,
  businessDomain,
  business,
  settings,
  currency = 'PKR',
  className,
}) {
  const base = `/store/${businessDomain}`;
  const accent = getStoreAccentColor(settings, business?.category);
  const contact = resolveStoreContact({ business, settings });
  const isVehicle = isShowroomVehicleProduct(product);
  const price = Number(product.display_price ?? product.price ?? 0);
  const vehicleName = product.name || '';
  const callTel = contact.phone ? contact.phone.replace(/\D/g, '') : null;
  const highTicketVehicle = isVehicle && price >= 1000000;
  const meetingUrl = shouldOfferTenantMeetingLink(business, business?.category, settings)
    ? getTenantMeetingUrl(business, settings)
    : null;

  if (!isVehicle) return null;

  return (
    <div className={cn('space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4', className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Showroom options</p>

      {highTicketVehicle && callTel ? (
        <a
          href={`tel:${callTel}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-sm font-bold text-white transition hover:bg-neutral-800"
        >
          <Phone className="h-4 w-4" aria-hidden />
          Call {contact.phone}
        </a>
      ) : null}

      <Link
        href={buildVehicleBookingHref(base, 'testdrive', vehicleName)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition hover:bg-white"
        style={{ borderColor: accent, color: accent }}
      >
        <Car className="h-4 w-4" aria-hidden />
        Book test drive
      </Link>

      {meetingUrl ? (
        <a
          href={meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          <Calendar className="h-4 w-4" aria-hidden />
          Book online
        </a>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Link
          href={buildVehicleBookingHref(base, 'finance', vehicleName)}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white py-2.5 text-xs font-semibold text-neutral-800 transition hover:border-neutral-400"
        >
          <Percent className="h-3.5 w-3.5" aria-hidden />
          Finance
        </Link>
        <Link
          href={buildVehicleBookingHref(base, 'buy', vehicleName)}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white py-2.5 text-xs font-semibold text-neutral-800 transition hover:border-neutral-400"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          Enquire
        </Link>
      </div>

      {price > 0 ? (
        <p className="text-center text-xs text-neutral-500">
          Listed at{' '}
          <span className="font-semibold tabular-nums text-neutral-800">
            {formatCurrency(price, currency, { maximumFractionDigits: 0 })}
          </span>
          {highTicketVehicle ? ' · speak to sales for registration & delivery' : null}
        </p>
      ) : null}
    </div>
  );
}
