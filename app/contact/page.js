'use client';

import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import Hero from '@/components/marketing/sections/Hero';
import { ContactForm } from '@/components/marketing/forms/ContactForm';
import FAQSection from '@/components/marketing/sections/FAQSection';
import { Mail, MapPin, Clock, Building2, ExternalLink } from 'lucide-react';
import { TENVO_PARENT_COMPANY } from '@/lib/marketing/tenvo-assistant-knowledge';
import { SupportWhatsAppLink, SupportWhatsAppIcon } from '@/components/marketing/SupportWhatsAppLink';
import { getPublicSupportEmail } from '@/lib/marketing/site-url';
import { CONTACT_PAGE_FAQS } from '@/lib/marketing/structured-data';

const SUPPORT_EMAIL = getPublicSupportEmail();

export default function ContactPage() {
  return (
    <MarketingLayout>
      {/* Hero Section — intent-led copy for SEO + lead gen */}
      <Hero 
        variant="centered"
        badge="Contact TENVO"
        title={
          <>
            Sales, support & <br />
            <span className="text-brand-primary">partnership inquiries</span>
          </>
        }
        subtitle="Ask about inventory, POS, storefront checkout, warehouses, accounting, or Pakistan tax positioning. We route demos, billing, and technical threads to the right pod — typical first reply within one business day."
        primaryCTA={{
          text: 'Book a demo',
          href: '/demo'
        }}
        secondaryCTA={{
          text: 'View pricing',
          href: '/pricing'
        }}
      />

      {/* Contact Form and Info */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Send us a message
              </h2>
              <p className="text-gray-600 mb-8">
                Include your use case (retail, hospitality, wholesale, online store) and timeline. For plan-specific questions, start from{' '}
                <a href="/pricing" className="text-brand-primary font-medium hover:underline">Pricing</a>
                {' '}or open a thread with context from{' '}
                <a href="/register" className="text-brand-primary font-medium hover:underline">Register</a>.
              </p>
              <ContactForm />
            </div>

            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Contact Information
                </h2>
                <p className="text-gray-600 mb-8">
                  Reach out to us through any of these channels
                </p>
              </div>

              <div className="rounded-2xl border border-brand-primary/20 bg-gradient-to-br from-brand-50/80 to-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-brand-primary" aria-hidden />
                  <h3 className="text-lg font-bold text-gray-900">Parent company</h3>
                </div>
                <p className="mb-4 text-sm text-gray-600">
                  TENVO is built by{' '}
                  <span className="font-semibold text-gray-900">{TENVO_PARENT_COMPANY.name}</span>.
                  For corporate, partnership, or press inquiries you can use the official Mindscape
                  channels below.
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
                    <a href={`mailto:${TENVO_PARENT_COMPANY.email}`} className="hover:underline">
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

              <div className="space-y-6">
                <ContactInfoCard
                  icon={<Mail className="w-6 h-6" />}
                  title="Email"
                  content={SUPPORT_EMAIL}
                  link={`mailto:${SUPPORT_EMAIL}`}
                />
                <ContactInfoCard
                  icon={<SupportWhatsAppIcon className="h-6 w-6 text-[#25D366]" />}
                  title="WhatsApp support"
                  content={TENVO_PARENT_COMPANY.phone}
                  link={TENVO_PARENT_COMPANY.whatsappUrl}
                  external
                />
                <ContactInfoCard
                  icon={<MapPin className="w-6 h-6" />}
                  title="Office"
                  content="Karachi, Pakistan"
                />
                <ContactInfoCard
                  icon={<Clock className="w-6 h-6" />}
                  title="Business Hours"
                  content="Monday - Friday: 9 AM - 6 PM PKT"
                />
              </div>

              {/* Support Options */}
              <div className="bg-gray-50 rounded-2xl p-8 mt-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Need Immediate Help?
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">
                      Check the <a href="#faq" className="text-brand-primary hover:underline">FAQ below</a> for response times, demos, and Mindscape corporate contact
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">
                      Read <a href="/help" className="text-brand-primary hover:underline">Help</a>
                      {' '}and <a href="/docs" className="text-brand-primary hover:underline">Docs</a> for self-serve setup
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">
                      Schedule a <a href="/demo" className="text-brand-primary hover:underline">live demo</a> with our team
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-neutral-50 border-y border-neutral-200" aria-labelledby="contact-legal-heading">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-sm text-neutral-700 leading-relaxed">
          <h2 id="contact-legal-heading" className="text-lg font-bold text-neutral-900 mb-3">
            Intellectual property &amp; confidentiality
          </h2>
          <p className="mb-3">
            TENVO, related marks, documentation, user interface, and this website are proprietary to{' '}
            <strong>Mindscape Analytics LLC</strong> and its licensors. All rights reserved. Unauthorised copying,
            redistribution, or derivative use of our software, designs, or marketing materials may violate applicable law
            and our{' '}
            <a href="/terms" className="text-brand-primary font-medium hover:underline">Terms of Service</a>.
            Nothing on this page grants a licence to our source code, trade secrets, or product roadmap.
          </p>
          <p>
            Enterprise AI and systems architecture by{' '}
            <a
              href={TENVO_PARENT_COMPANY.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-primary font-medium hover:underline"
            >
              Mindscape Analytics
            </a>
            {' '}(Sheridan, WY, USA). Privacy practices:{' '}
            <a href="/privacy" className="text-brand-primary font-medium hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 bg-gray-50">
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
    <div className="group flex items-start gap-4 p-6 bg-white border border-gray-100 rounded-2xl hover:shadow-xl hover:shadow-brand-primary/10 hover:border-brand-primary/20 transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 shadow-md group-hover:shadow-lg group-hover:from-brand-100 group-hover:to-brand-200 transition-all duration-300 flex-shrink-0">
        <div className="text-brand-primary group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
      </div>
      <div>
        <h3 className="font-bold text-gray-900 mb-1 group-hover:text-brand-primary transition-colors duration-300">{title}</h3>
        <p className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300">{content}</p>
      </div>
    </div>
  );

  if (link) {
    return (
      <a
        href={link}
        className="block"
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {CardContent}
      </a>
    );
  }

  return CardContent;
}
