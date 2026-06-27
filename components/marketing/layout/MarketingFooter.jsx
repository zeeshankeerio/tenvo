'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, CheckCircle2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trackEvent, EVENTS } from '@/lib/analytics/tracking';
import { validateEmail } from '@/lib/marketing/validation';
import { TenvoTextLogo } from '@/components/branding/TenvoTextLogo';
import { SupportWhatsAppLink } from '@/components/marketing/SupportWhatsAppLink';
import MarketingCtaLink from '@/components/marketing/ui/MarketingCtaLink';
import { getBookMeetingHref } from '@/lib/marketing/salesLinks';
import { cn } from '@/lib/utils';

const FOOTER_LINK = 'text-sm font-medium text-neutral-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 rounded-sm';

function FooterColumn({ title, children }) {
  return (
    <div className="min-w-0">
      <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500 sm:mb-5 sm:text-[11px] sm:tracking-[0.22em]">
        {title}
      </h4>
      <ul className="space-y-2.5 sm:space-y-3.5">{children}</ul>
    </div>
  );
}

/**
 * Marketing footer - dark shell aligned with the login page brand column (neutral-900 + brand border).
 */
export default function MarketingFooter({ variant = 'default' }) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    setNewsletterError('');
    const check = validateEmail(email);
    if (!check.isValid) {
      setNewsletterError(check.error);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/marketing/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setSubscribed(true);
        setEmail('');
        trackEvent(EVENTS.NEWSLETTER_SUBSCRIBE, { email });
      } else {
        setNewsletterError(data.message || 'Could not subscribe. Try again or use /contact.');
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setNewsletterError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'minimal') {
    return (
      <footer className="border-t border-brand-primary/20 bg-neutral-900">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-8 sm:flex-row sm:px-6 lg:px-12">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500 sm:text-left">
            © {new Date().getFullYear()} TENVO · Mindscape Analytics LLC · Pakistan launch; global roadmap
          </p>
          <nav
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] font-semibold uppercase tracking-[0.2em]"
            aria-label="Legal"
          >
            <Link href="/privacy" className="text-neutral-500 transition-colors hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="text-neutral-500 transition-colors hover:text-white">
              Terms
            </Link>
            <Link href="/contact" className="text-neutral-500 transition-colors hover:text-white">
              Contact
            </Link>
            <SupportWhatsAppLink variant="footerMuted" className="text-[10px] font-semibold" />
          </nav>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative overflow-x-clip border-t border-brand-primary/20 bg-neutral-900 text-neutral-300">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.07]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_90%,rgba(210,43,43,0.25),transparent_45%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 pb-8 pt-10 sm:px-7 sm:pb-10 sm:pt-14 lg:px-10 lg:pb-12 lg:pt-16 xl:px-14 2xl:px-16">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-6">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link href="/" className="inline-block rounded-lg outline-none ring-brand-primary/30 focus-visible:ring-2">
              <TenvoTextLogo
                textClassName="text-white"
                taglineClassName="text-neutral-500"
                iconClassName="shadow-lg shadow-black/25"
              />
            </Link>
            <p className="mt-6 max-w-sm text-sm font-medium leading-relaxed text-neutral-400">
              One connected workspace for inventory, commerce, finance, and growth
              scaling globally. A Mindscape Analytics LLC product (Sheridan, WY, USA).
            </p>
            <p className="mt-4 text-sm">
              <SupportWhatsAppLink variant="dark" className="text-sm font-semibold" iconClassName="h-4 w-4" />
            </p>
            <div className="mt-8 flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200/95">
                <Shield className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                PK tax configuration
              </span>
              <span className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-100/95">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" aria-hidden />
                SECP-ready narrative
              </span>
            </div>
          </div>

          {/* Link columns - aligned grid */}
          <nav
            className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:col-span-5 lg:gap-x-10 lg:gap-y-8"
            aria-label="Site footer"
          >
            <FooterColumn title="Platform">
              <li>
                <Link href="/why-tenvo" className={FOOTER_LINK}>
                  Why TENVO
                </Link>
              </li>
              <li>
                <Link href="/features" className={FOOTER_LINK}>
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className={FOOTER_LINK}>
                  Pricing
                </Link>
              </li>
              <li>
                <MarketingCtaLink href={getBookMeetingHref()} className={FOOTER_LINK}>
                  Book a meeting
                </MarketingCtaLink>
              </li>
              <li>
                <Link href="/integrations" className={FOOTER_LINK}>
                  Integrations
                </Link>
              </li>
              <li>
                <Link href="/solutions/marketing-crm" className={FOOTER_LINK}>
                  Marketing &amp; CRM
                </Link>
              </li>
              <li>
                <Link href="/industries" className={FOOTER_LINK}>
                  Industries
                </Link>
              </li>
              <li>
                <Link href="/login" className={FOOTER_LINK}>
                  Log in
                </Link>
              </li>
            </FooterColumn>

            <FooterColumn title="Product">
              <li>
                <Link href="/features#storefront" className={FOOTER_LINK}>
                  Storefront &amp; checkout
                </Link>
              </li>
              <li>
                <Link href="/features#compliance" className={FOOTER_LINK}>
                  Compliance
                </Link>
              </li>
              <li>
                <Link href="/features#accounting" className={FOOTER_LINK}>
                  Accounting
                </Link>
              </li>
              <li>
                <Link href="/features#security" className={FOOTER_LINK}>
                  Security
                </Link>
              </li>
              <li>
                <Link href="/register" className={FOOTER_LINK}>
                  Start free trial
                </Link>
              </li>
            </FooterColumn>

            <FooterColumn title="Company &amp; support">
              <li>
                <Link href="/about" className={FOOTER_LINK}>
                  About
                </Link>
              </li>
              <li>
                <Link href="/case-studies" className={FOOTER_LINK}>
                  Case studies
                </Link>
              </li>
              <li>
                <Link href="/careers" className={FOOTER_LINK}>
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/press" className={FOOTER_LINK}>
                  Press
                </Link>
              </li>
              <li>
                <Link href="/contact" className={FOOTER_LINK}>
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/help" className={FOOTER_LINK}>
                  Help center
                </Link>
              </li>
              <li>
                <Link href="/docs" className={FOOTER_LINK}>
                  Docs &amp; API
                </Link>
              </li>
              <li>
                <Link href="/status" className={FOOTER_LINK}>
                  System status
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={FOOTER_LINK}>
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className={FOOTER_LINK}>
                  Terms
                </Link>
              </li>
            </FooterColumn>
          </nav>

          {/* Newsletter - aligned with link columns; avoid mt-auto so the form sits under the intro copy */}
          <div className="flex min-w-0 flex-col lg:col-span-3">
            <h4 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Stay updated</h4>
            <p className="mb-5 text-sm font-medium leading-relaxed text-neutral-400">
              Product updates, compliance notes, and launch news, no spam.
            </p>

            {subscribed ? (
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
                <span>Thanks for subscribing.</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <div className="relative min-w-0 flex-1">
                    <Mail
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                      aria-hidden
                    />
                    <Input
                      type="email"
                      placeholder="Work email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (newsletterError) setNewsletterError('');
                      }}
                      required
                      disabled={loading}
                      aria-invalid={!!newsletterError}
                      className={cn(
                        'h-11 rounded-xl border-neutral-700 bg-neutral-950/80 pl-10 text-sm text-white placeholder:text-neutral-500',
                        'focus-visible:border-brand-primary/50 focus-visible:ring-brand-primary/25'
                      )}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="h-11 shrink-0 rounded-xl bg-brand-primary px-6 font-semibold text-white hover:bg-brand-primary-dark"
                    disabled={loading}
                  >
                    {loading ? '…' : 'Subscribe'}
                  </Button>
                </div>
                {newsletterError ? (
                  <p className="text-sm font-medium text-red-400" role="alert">
                    {newsletterError}
                  </p>
                ) : null}
              </form>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 sm:flex-row sm:items-end">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-600 sm:text-left">
            © {new Date().getFullYear()} TENVO · Mindscape Analytics LLC · All rights reserved
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-600">
            <Link href="/industries" className="transition-colors hover:text-neutral-300">
              Markets we serve
            </Link>
            <a
              href="https://www.mindscapeanalytics.com/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-neutral-300"
            >
              Mindscape contact
            </a>
            <SupportWhatsAppLink variant="footerMuted" className="text-[10px] font-semibold" />
          </div>
        </div>
      </div>
    </footer>
  );
}
