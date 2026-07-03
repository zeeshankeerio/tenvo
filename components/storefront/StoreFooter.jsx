'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin,
  CreditCard, Shield, Truck, RotateCcw, Send, ExternalLink, Clock,
  Star, Leaf, Tag, Gift, Lock, User, Zap, HelpCircle,
} from 'lucide-react';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { toast } from 'react-hot-toast';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { resolveStoreContact } from '@/lib/storefront/businessContact';
import { getStoreFooterCopy } from '@/lib/storefront/storeFooterCopy';
import { isAutoDealershipStore, getDealershipFooterColumns } from '@/lib/storefront/autoDealership';
import { isAutoMarketplaceStore, getMarketplaceFooterColumns } from '@/lib/storefront/autoMarketplace';
import { isPharmacyElevatedStore, getPharmacyFooterColumns, formatPharmacyStoreName } from '@/lib/storefront/pharmacyStorefront';
import { isFitnessElevatedStore, getFitnessFooterColumns, formatFitnessStoreName } from '@/lib/storefront/fitnessStorefront';
import { getTenantMeetingUrl, shouldOfferTenantMeetingLink } from '@/lib/storefront/storefrontBooking';
import { resolveStorefrontLogo } from '@/lib/storefront/resolveStorefrontLogo';

const TRUST_ICONS = {
  truck: Truck,
  shield: Shield,
  refresh: RotateCcw,
  star: Star,
  zap: Zap,
  leaf: Leaf,
  clock: Clock,
  gift: Gift,
  lock: Lock,
  tag: Tag,
  user: User,
  credit: CreditCard,
};

function FooterLinkColumn({ title, links, dark, compact }) {
  return (
    <div>
      <h4 className={cn(
        'font-bold uppercase tracking-wider',
        compact ? 'mb-2 text-[10px] sm:text-xs' : 'mb-3 text-xs',
        dark ? 'text-neutral-400' : compact ? 'text-emerald-800/80' : 'text-slate-500'
      )}>
        {title}
      </h4>
      <ul className={cn(compact ? 'space-y-1.5' : 'space-y-2')}>
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className={cn(
                'transition-colors hover:text-[var(--store-accent)]',
                compact ? 'text-xs sm:text-sm' : 'text-sm',
                dark ? 'text-neutral-300' : 'text-slate-600'
              )}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StoreFooter({ business, settings }) {
  const { businessDomain, currency, categories } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const contact = resolveStoreContact({ business, settings });
  const footerCopy = getStoreFooterCopy({ business, settings, currency });
  const storeName = footerCopy.storeName;
  const dealershipFooter = isAutoDealershipStore(business?.category);
  const marketplaceFooter = isAutoMarketplaceStore(business?.category);
  const pharmacyFooter = isPharmacyElevatedStore(business?.category);
  const fitnessFooter = isFitnessElevatedStore(business?.category);
  const fitnessMeetingUrl =
    fitnessFooter && shouldOfferTenantMeetingLink(business, business?.category, settings)
      ? getTenantMeetingUrl(business, settings)
      : null;
  const dealershipColumns = dealershipFooter
    ? getDealershipFooterColumns(`/store/${businessDomain}`, { country: business?.country, settings })
    : [];
  const marketplaceColumns = marketplaceFooter
    ? getMarketplaceFooterColumns(`/store/${businessDomain}`)
    : [];
  const pharmacyColumns = pharmacyFooter
    ? getPharmacyFooterColumns(`/store/${businessDomain}`)
    : [];
  const fitnessColumns = fitnessFooter
    ? getFitnessFooterColumns(`/store/${businessDomain}`, categories || [])
    : [];
  const darkPortalFooter = dealershipFooter || marketplaceFooter || fitnessFooter;
  // Generic trust badges (Fast delivery, secure payment, etc.) removed from all storefront footers.
  const skipFooterTrustStrip = true;
  const portalColumns = dealershipFooter
    ? dealershipColumns
    : marketplaceFooter
      ? marketplaceColumns
      : fitnessFooter
        ? fitnessColumns
        : pharmacyColumns;
  const displayStoreName = pharmacyFooter
    ? formatPharmacyStoreName(storeName)
    : fitnessFooter
      ? formatFitnessStoreName(storeName)
      : storeName;
  const storeLogoUrl = resolveStorefrontLogo(business, settings);

  const handleNewsletter = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/storefront/${businessDomain}/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        toast.success('Thanks for subscribing!');
        setEmail('');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to subscribe. Try again.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const socialLinks = [
    { icon: Facebook, href: settings?.socialLinks?.facebook || settings?.social?.facebook, label: 'Facebook' },
    { icon: Instagram, href: settings?.socialLinks?.instagram || settings?.social?.instagram, label: 'Instagram' },
    { icon: Twitter, href: settings?.socialLinks?.twitter || settings?.social?.twitter, label: 'Twitter / X' },
    { icon: Youtube, href: settings?.socialLinks?.youtube || settings?.social?.youtube, label: 'YouTube' },
  ].filter((s) => s.href);

  const shopLinks = [
    { label: 'All Products', href: `/store/${businessDomain}/products` },
    { label: 'New Arrivals', href: `/store/${businessDomain}/products?sort=newest` },
    { label: 'On Sale', href: `/store/${businessDomain}/products?onSale=true` },
    { label: 'Featured', href: `/store/${businessDomain}/products?sort=featured` },
  ];

  const categoryLinks = (categories || [])
    .slice(0, 6)
    .map((cat) => ({
      label: cat.name,
      href: `/store/${businessDomain}/products?category=${encodeURIComponent(cat.slug || cat.name)}`,
    }));

  const supportLinks = [
    { label: 'Track Order', href: `/store/${businessDomain}/orders` },
    { label: 'Shipping Info', href: `/store/${businessDomain}/shipping` },
    { label: 'Returns', href: `/store/${businessDomain}/returns` },
    { label: 'FAQs', href: `/store/${businessDomain}/faqs` },
    { label: 'Contact Us', href: `/store/${businessDomain}/contact` },
  ];

  const locationLine = [contact.city, contact.country].filter(Boolean).join(', ');

  return (
    <footer
      className={cn(
        'pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0',
        fitnessFooter && 'border-t border-white/10 bg-black text-neutral-300',
        darkPortalFooter && !fitnessFooter && 'border-t border-neutral-800 bg-neutral-950 text-neutral-300',
        pharmacyFooter && !fitnessFooter && 'border-t border-emerald-100 bg-white text-slate-600',
        !darkPortalFooter && !pharmacyFooter && !fitnessFooter && 'border-t border-[var(--store-footer-border)] bg-[var(--store-footer-bg)] text-slate-600'
      )}
    >
      {fitnessFooter ? (
        <div className="border-b border-white/10 bg-black">
          <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
            <div className="flex flex-col items-center gap-6 text-center lg:flex-row lg:justify-between lg:text-left">
              <div className="max-w-xl">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">Train wild today</h2>
                <p className="mt-2 text-sm text-white/60 sm:text-base">
                  Shop supplements online or book a session to start your workout journey.
                </p>
              </div>
              <div className="flex w-full flex-wrap items-center justify-center gap-3 sm:w-auto lg:justify-end">
                <Link
                  href={`/store/${businessDomain}/products`}
                  className="inline-flex min-w-[140px] flex-1 items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 sm:flex-none"
                  style={{ backgroundColor: '#fff' }}
                >
                  Shop the store
                </Link>
                {fitnessMeetingUrl ? (
                  <a
                    href={fitnessMeetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-rose-500/40 hover:bg-white/5 sm:flex-none"
                  >
                    Schedule online
                    <ExternalLink className="h-4 w-4 opacity-70" aria-hidden />
                  </a>
                ) : (
                  <Link
                    href={`/store/${businessDomain}/contact`}
                    className="inline-flex min-w-[140px] flex-1 items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-rose-500/40 hover:bg-white/5 sm:flex-none"
                  >
                    Contact us
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {/* Trust strip — skipped on template verticals (homepage already has trust blocks) */}
      {!skipFooterTrustStrip ? (
      <div
        className={cn(
          'border-b',
          pharmacyFooter
            ? 'border-emerald-100 bg-emerald-50/50'
            : 'border-[var(--store-footer-border)] bg-[var(--store-footer-surface)]'
        )}
      >
        <div
          className={cn(
            'mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8',
            pharmacyFooter ? 'py-3.5 lg:py-4' : 'py-5 lg:py-6'
          )}
        >
          <div
            className={cn(
              'grid gap-3',
              pharmacyFooter
                ? 'grid-cols-2 sm:grid-cols-4 sm:gap-4'
                : 'grid-cols-2 gap-4 md:grid-cols-4 md:gap-6'
            )}
          >
            {footerCopy.trustBadges.map((item) => {
              const Icon = TRUST_ICONS[item.icon] || Shield;
              return (
                <div key={item.title} className="flex items-center gap-2.5 sm:gap-3">
                  <div
                    className={cn(
                      'flex shrink-0 items-center justify-center rounded-lg',
                      pharmacyFooter ? 'h-8 w-8 rounded-full bg-white text-emerald-600 shadow-sm' : 'h-10 w-10 rounded-xl'
                    )}
                    style={pharmacyFooter ? undefined : { backgroundColor: 'var(--store-accent-light)', color: accent }}
                  >
                    <Icon className={cn(pharmacyFooter ? 'h-3.5 w-3.5' : 'h-5 w-5')} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className={cn('font-semibold text-slate-900', pharmacyFooter ? 'text-xs sm:text-sm' : 'text-sm')}>
                      {item.title}
                    </p>
                    {item.subtitle ? (
                      <p className={cn('leading-snug text-slate-500', pharmacyFooter ? 'mt-0.5 text-[10px] sm:text-xs' : 'mt-0.5 text-xs')}>
                        {item.subtitle}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      ) : null}

      <div
        className={cn(
          'mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8',
          pharmacyFooter ? 'py-6 lg:py-8' : darkPortalFooter ? 'py-5 lg:py-6' : 'py-8 lg:py-12'
        )}
      >
        {/* Mobile trust pills — skipped on template verticals (homepage trust blocks) */}
        <div className={cn(
          'mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 pb-5 text-[11px] text-slate-500 md:hidden',
          (pharmacyFooter || skipFooterTrustStrip) && 'hidden'
        )}>
          {footerCopy.freeShippingThreshold > 0 && (
            <span className="inline-flex items-center gap-1">
              <Truck className="h-3 w-3 shrink-0" style={{ color: accent }} aria-hidden />
              Free over {formatCurrency(footerCopy.freeShippingThreshold, currency, { maximumFractionDigits: 0 })}
            </span>
          )}
          {footerCopy.returnDays > 0 && (
            <>
              <span className="text-slate-300" aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <RotateCcw className="h-3 w-3 shrink-0" style={{ color: accent }} aria-hidden />
                {footerCopy.returnDays}-day returns
              </span>
            </>
          )}
          <span className="text-slate-300" aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Shield className="h-3 w-3 shrink-0" style={{ color: accent }} aria-hidden />
            Secure checkout
          </span>
        </div>

        <div
          className={cn(
            'grid gap-x-6 gap-y-6',
            pharmacyFooter
              ? 'grid-cols-2 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-4'
              : 'grid-cols-2 gap-y-8 lg:grid-cols-12 lg:gap-10'
          )}
        >
          {/* Brand */}
          <div className={cn('col-span-2 space-y-3', pharmacyFooter ? 'lg:col-span-3' : fitnessFooter ? 'lg:col-span-4' : 'space-y-4 lg:col-span-4')}>
            <div className="flex items-center gap-2.5">
              {storeLogoUrl ? (
                <SmartProductImage
                  src={storeLogoUrl}
                  alt={displayStoreName}
                  width={120}
                  height={36}
                  className="h-9 w-9 shrink-0 object-contain sm:h-8 sm:w-auto"
                />
              ) : (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {displayStoreName.charAt(0)?.toUpperCase()}
                </div>
              )}
              <span className={cn(
                'truncate font-semibold',
                pharmacyFooter ? 'text-base text-emerald-900' : 'text-lg',
                darkPortalFooter ? 'text-white' : 'text-slate-900'
              )}>
                {displayStoreName}
              </span>
            </div>

            <p className={cn(
              'max-w-sm text-sm leading-relaxed',
              darkPortalFooter ? 'text-neutral-400 line-clamp-2' : 'text-slate-500',
              pharmacyFooter && 'line-clamp-2 text-xs sm:text-sm'
            )}>
              {footerCopy.tagline}
            </p>

            <div className={cn('space-y-1.5 text-sm', (pharmacyFooter || fitnessFooter) && 'hidden sm:block')}>
              {contact.phone ? (
                <a
                  href={`tel:${contact.phone}`}
                  className={cn(
                    'flex items-center gap-2 transition-colors hover:text-[var(--store-accent)]',
                    darkPortalFooter ? 'text-neutral-300' : 'text-slate-600'
                  )}
                >
                  <Phone className={cn('h-4 w-4 shrink-0', darkPortalFooter ? 'text-neutral-500' : 'text-slate-400')} />
                  <span>{contact.phone}</span>
                </a>
              ) : null}
              {contact.email ? (
                <a
                  href={`mailto:${contact.email}`}
                  className={cn(
                    'flex items-center gap-2 transition-colors hover:text-[var(--store-accent)]',
                    darkPortalFooter ? 'text-neutral-300' : 'text-slate-600'
                  )}
                >
                  <Mail className={cn('h-4 w-4 shrink-0', darkPortalFooter ? 'text-neutral-500' : 'text-slate-400')} />
                  <span className="break-all">{contact.email}</span>
                </a>
              ) : null}
              {contact.showContactPageCta ? (
                <Link
                  href={`/store/${businessDomain}/contact`}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-white"
                >
                  <HelpCircle className="h-4 w-4" style={{ color: accent }} />
                  Get in touch
                </Link>
              ) : null}
              {contact.whatsappUrl ? (
                <a
                  href={contact.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-slate-600 transition-colors hover:text-[var(--store-accent)]"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">WhatsApp</span>
                  <span>Chat with us</span>
                </a>
              ) : null}
              {contact.fullAddress ? (
                <div className={cn(
                  'flex items-start gap-2',
                  darkPortalFooter ? 'text-neutral-300' : 'text-slate-600'
                )}>
                  <MapPin className={cn('mt-0.5 h-4 w-4 shrink-0', darkPortalFooter ? 'text-neutral-500' : 'text-slate-400')} />
                  <span>{contact.fullAddress}</span>
                </div>
              ) : locationLine ? (
                <div className={cn(
                  'flex items-start gap-2',
                  darkPortalFooter ? 'text-neutral-300' : 'text-slate-600'
                )}>
                  <MapPin className={cn('mt-0.5 h-4 w-4 shrink-0', darkPortalFooter ? 'text-neutral-500' : 'text-slate-400')} />
                  <span>{locationLine}</span>
                </div>
              ) : null}
              {contact.businessHours && !fitnessFooter ? (
                <div className={cn(
                  'flex items-start gap-2',
                  darkPortalFooter ? 'text-neutral-300' : 'text-slate-600'
                )}>
                  <Clock className={cn('mt-0.5 h-4 w-4 shrink-0', darkPortalFooter ? 'text-neutral-500' : 'text-slate-400')} />
                  <span>{contact.businessHours}</span>
                </div>
              ) : null}
            </div>

            {socialLinks.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                {socialLinks.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors',
                      darkPortalFooter
                        ? 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500 hover:text-white'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-[var(--store-accent)]'
                    )}
                  >
                    <s.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {(darkPortalFooter || pharmacyFooter) ? (
            portalColumns.map((col) => (
              <div key={col.title} className={cn('self-start', pharmacyFooter ? 'col-span-1 lg:col-span-2' : fitnessFooter ? 'col-span-1 lg:col-span-2' : 'lg:col-span-2')}>
                <FooterLinkColumn title={col.title} links={col.links} dark={darkPortalFooter} compact={pharmacyFooter || fitnessFooter} />
              </div>
            ))
          ) : (
          <div className="lg:col-span-2">
            <FooterLinkColumn title={footerCopy.shopHeading} links={shopLinks} />
          </div>
          )}

          {!darkPortalFooter && categoryLinks.length > 0 ? (
            <div className="lg:col-span-2">
              <FooterLinkColumn title="Categories" links={categoryLinks} />
            </div>
          ) : null}

          {!darkPortalFooter ? (
          <div className="lg:col-span-2">
            <FooterLinkColumn title={footerCopy.supportHeading} links={supportLinks} />
          </div>
          ) : null}

          {/* Newsletter, dealership & pharmacy portal includes signup; marketplace omits */}
          {(!darkPortalFooter || dealershipFooter || pharmacyFooter) && !fitnessFooter ? (
          <div className={cn('col-span-2', pharmacyFooter ? 'lg:col-span-3' : 'lg:col-span-2')}>
            <h4 className={cn(
              'mb-2 text-xs font-semibold uppercase tracking-wider',
              darkPortalFooter ? 'text-neutral-400' : 'text-slate-500',
              pharmacyFooter && 'text-emerald-800'
            )}>
              {footerCopy.newsletterTitle}
            </h4>
            <p className={cn(
              'mb-3 text-sm leading-relaxed',
              darkPortalFooter ? 'text-neutral-500' : 'text-slate-500',
              pharmacyFooter && 'text-xs sm:text-sm'
            )}>
              {footerCopy.newsletterBody}
            </p>
            <form onSubmit={handleNewsletter} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={cn(
                    'w-full rounded-xl border px-4 py-2.5 pr-12 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--store-accent)]',
                    darkPortalFooter
                      ? 'border-neutral-700 bg-neutral-900 text-white placeholder:text-neutral-500'
                      : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400',
                    pharmacyFooter && 'border-emerald-200 py-2 text-sm focus:ring-emerald-100'
                  )}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: accent }}
                  aria-label="Subscribe"
                >
                  {submitting ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <p className={cn('text-xs', darkPortalFooter ? 'text-neutral-600' : 'text-slate-400')}>
                No spam. Unsubscribe anytime.
              </p>
            </form>

            {!darkPortalFooter ? (
            <p className="mt-4 text-xs text-slate-400">
              {footerCopy.paymentLabel}
            </p>
            ) : null}
          </div>
          ) : null}
        </div>

        {marketplaceFooter ? (
          <div className="mt-8 flex flex-col items-center gap-4 border-t border-neutral-800 pt-8 sm:flex-row sm:justify-center">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-neutral-500">
              <Link href={`/store/${businessDomain}/terms`} className="hover:text-[#E30613]">Terms of Service</Link>
              <Link href={`/store/${businessDomain}/privacy`} className="hover:text-[#E30613]">Privacy Policy</Link>
              <Link href={`/store/${businessDomain}/contact`} className="hover:text-[#E30613]">Report Error</Link>
            </div>
          </div>
        ) : null}

        {/* Bottom bar */}
        <div className={cn(
          'flex flex-col items-center gap-3 border-t pt-5 text-center lg:flex-row lg:justify-between lg:text-left',
          fitnessFooter ? 'border-white/10' : darkPortalFooter ? 'border-neutral-800' : pharmacyFooter ? 'border-emerald-100' : 'border-slate-100',
          pharmacyFooter ? 'mt-6' : fitnessFooter ? 'mt-8' : 'mt-10'
        )}>
          <p className={cn('text-xs', darkPortalFooter ? 'text-neutral-500' : 'text-slate-500')}>
            © {new Date().getFullYear()}{' '}
            <span className={cn('font-medium', darkPortalFooter ? 'text-neutral-300' : 'text-slate-700')}>
              {displayStoreName}
            </span>
            {contact.country ? (
              <span className="text-slate-400"> · {contact.country}</span>
            ) : null}
          </p>

          <div className={cn(
            'flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs',
            darkPortalFooter ? 'text-neutral-500' : 'text-slate-500'
          )}>
            <Link
              href={`/store/${businessDomain}/privacy`}
              className="transition-colors hover:text-[var(--store-accent)]"
            >
              Privacy Policy
            </Link>
            <Link
              href={`/store/${businessDomain}/terms`}
              className="transition-colors hover:text-[var(--store-accent)]"
            >
              Terms of Service
            </Link>
            {business?.website ? (
              <a
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 transition-colors hover:text-[var(--store-accent)]"
              >
                Website <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
