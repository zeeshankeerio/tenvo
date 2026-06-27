'use client';

import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import { MarketingSection } from '@/components/marketing/layout/MarketingSection';
import Hero from '@/components/marketing/sections/Hero';
import { ContactForm } from '@/components/marketing/forms/ContactForm';
import FAQSection from '@/components/marketing/sections/FAQSection';
import { Mail, MapPin, Clock, Building2, ExternalLink } from 'lucide-react';
import { TENVO_PARENT_COMPANY } from '@/lib/marketing/tenvo-assistant-knowledge';
import { SupportWhatsAppLink, SupportWhatsAppIcon } from '@/components/marketing/SupportWhatsAppLink';
import { getPublicSupportEmail } from '@/lib/marketing/site-url';
import { getBookMeetingHref } from '@/lib/marketing/salesLinks';
import { CONTACT_PAGE_FAQS } from '@/lib/marketing/structured-data';
import { MARKETING_H2, MARKETING_H3, MARKETING_LEAD } from '@/lib/utils/marketingLayout';
import MarketingCtaLink from '@/components/marketing/ui/MarketingCtaLink';
import { cn } from '@/lib/utils';

const SUPPORT_EMAIL = getPublicSupportEmail();

export default function ContactPage() {
  return (
    <MarketingLayout>
      <Hero
        variant="centered"
        badge="Contact TENVO"
        title={
          <>
            Sales, support & <br className="hidden sm:block" />
            <span className="text-brand-primary">partnership inquiries</span>
          </>
        }
        subtitle="Ask about inventory, POS, storefront checkout, warehouses, accounting, or Pakistan tax positioning. We route demos, billing, and technical threads to the right pod - typical first reply within one business day."
        primaryCTA={{ text: 'Book a meeting', href: getBookMeetingHref() }}
        secondaryCTA={{ text: 'View pricing', href: '/pricing' }}
      />

      <MarketingSection className="bg-white" padding="default">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="min-w-0">
            <h2 className={cn(MARKETING_H2, 'mb-3')}>Send us a message</h2>
            <p className={cn(MARKETING_LEAD, 'mb-6 sm:mb-8')}>
              Include your use case (retail, hospitality, wholesale, online store) and timeline. For plan-specific questions, start from{' '}
              <a href="/pricing" className="font-medium text-brand-primary hover:underline">Pricing</a>
              {' '}or open a thread with context from{' '}
              <a href="/register" className="font-medium text-brand-primary hover:underline">Register</a>.
            </p>
            <ContactForm />
          </div>

          <div className="min-w-0 space-y-6">
            <div>
              <h2 className={cn(MARKETING_H2, 'mb-3')}>Contact information</h2>
              <p className={MARKETING_LEAD}>Reach us through any of these channels</p>
            </div>

            <div className="rounded-2xl border border-brand-primary/20 bg-gradient-to-br from-brand-50/80 to-white p-5 shadow-sm sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-brand-primary sm:h-6 sm:w-6" aria-hidden />
                <h3 className={MARKETING_H3}>Parent company</h3>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-gray-600">
                TENVO is built by{' '}
                <span className="font-semibold text-gray-900">{TENVO_PARENT_COMPANY.name}</span>.
                For corporate, partnership, or press inquiries you can use the official Mindscape channels below.
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>
                  <a
                    href={TENVO_PARENT_COMPANY.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-brand-primary hover:underline"
                  >
                    mindscapeanalytics.com
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </li>
                <li>
                  <a
                    href={TENVO_PARENT_COMPANY.contactPage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-brand-primary hover:underline"
                  >
                    Mindscape contact page
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </li>
                <li>
                  <a href={`mailto:${TENVO_PARENT_COMPANY.email}`} className="break-all hover:underline">
                    {TENVO_PARENT_COMPANY.email}
                  </a>
                </li>
                <li>
                  <a href={`tel:${TENVO_PARENT_COMPANY.phone.replace(/\s/g, '')}`} className="hover:underline">
                    {TENVO_PARENT_COMPANY.phone}
                  </a>{' '}
                  · {TENVO_PARENT_COMPANY.hq}
                </li>
                <li className="flex flex-wrap items-center gap-1.5">
                  <SupportWhatsAppLink
                    variant="light"
                    className="inline-flex font-semibold text-brand-primary hover:text-brand-primary-dark"
                    iconClassName="h-4 w-4"
                  />
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-brand-primary/70" aria-hidden />
                </li>
              </ul>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <ContactInfoCard icon={<Mail className="h-5 w-5 sm:h-6 sm:w-6" />} title="Email" content={SUPPORT_EMAIL} link={`mailto:${SUPPORT_EMAIL}`} />
              <ContactInfoCard icon={<SupportWhatsAppIcon className="h-5 w-5 text-[#25D366] sm:h-6 sm:w-6" />} title="WhatsApp support" content={TENVO_PARENT_COMPANY.phone} link={TENVO_PARENT_COMPANY.whatsappUrl} external />
              <ContactInfoCard icon={<MapPin className="h-5 w-5 sm:h-6 sm:w-6" />} title="Office" content="Karachi, Pakistan" />
              <ContactInfoCard icon={<Clock className="h-5 w-5 sm:h-6 sm:w-6" />} title="Business hours" content="Monday - Friday: 9 AM - 6 PM PKT" />
            </div>

            <div className="mt-2 rounded-2xl bg-gray-50 p-5 sm:p-6">
              <h3 className={cn(MARKETING_H3, 'mb-3')}>Need immediate help?</h3>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 text-brand-primary" aria-hidden>•</span>
                  <span>
                    Check the <a href="#faq" className="font-medium text-brand-primary hover:underline">FAQ below</a> for response times, demos, and Mindscape corporate contact
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 text-brand-primary" aria-hidden>•</span>
                  <span>
                    Read <a href="/help" className="font-medium text-brand-primary hover:underline">Help</a>
                    {' '}and <a href="/docs" className="font-medium text-brand-primary hover:underline">Docs</a> for self-serve setup
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 text-brand-primary" aria-hidden>•</span>
                  <span>
                    Schedule a{' '}
                    <MarketingCtaLink href={getBookMeetingHref()} className="font-medium text-brand-primary hover:underline">
                      live meeting
                    </MarketingCtaLink>{' '}
                    with our team
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </MarketingSection>

      <MarketingSection className="border-y border-neutral-200 bg-neutral-50" padding="tight" width="narrow">
        <h2 className={cn(MARKETING_H3, 'mb-3 sm:text-xl')}>Intellectual property &amp; confidentiality</h2>
        <p className="mb-3 text-sm leading-relaxed text-neutral-700">
          TENVO, related marks, documentation, user interface, and this website are proprietary to{' '}
          <strong>Mindscape Analytics LLC</strong> and its licensors. All rights reserved. Unauthorised copying,
          redistribution, or derivative use of our software, designs, or marketing materials may violate applicable law
          and our{' '}
          <a href="/terms" className="font-medium text-brand-primary hover:underline">Terms of Service</a>.
          Nothing on this page grants a licence to our source code, trade secrets, or product roadmap.
        </p>
        <p className="text-sm leading-relaxed text-neutral-700">
          Enterprise AI and systems architecture by{' '}
          <a href={TENVO_PARENT_COMPANY.website} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-primary hover:underline">
            Mindscape Analytics
          </a>{' '}
          (Sheridan, WY, USA). Privacy practices:{' '}
          <a href="/privacy" className="font-medium text-brand-primary hover:underline">Privacy Policy</a>.
        </p>
      </MarketingSection>

      <section id="faq" className="bg-gray-50">
        <FAQSection
          title="Frequently asked questions"
          subtitle="Contact, demos, Mindscape corporate channels, and how we handle your information"
          faqs={CONTACT_PAGE_FAQS}
          showSearch
          showCategories
        />
      </section>
    </MarketingLayout>
  );
}

function ContactInfoCard({ icon, title, content, link, external }) {
  const CardContent = (
    <div className="group flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-primary/20 hover:shadow-lg sm:gap-4 sm:p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 shadow-md transition-all duration-300 group-hover:from-brand-100 group-hover:to-brand-200 sm:h-12 sm:w-12">
        <div className="text-brand-primary transition-transform duration-300 group-hover:scale-110">{icon}</div>
      </div>
      <div className="min-w-0">
        <h3 className={MARKETING_H3}>{title}</h3>
        <p className="break-all text-sm text-gray-600">{content}</p>
      </div>
    </div>
  );

  if (link) {
    return (
      <a href={link} className="block" {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {CardContent}
      </a>
    );
  }

  return CardContent;
}
