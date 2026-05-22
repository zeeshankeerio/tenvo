'use client';

import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import Hero from '@/components/marketing/sections/Hero';
import { ContactForm } from '@/components/marketing/forms/ContactForm';
import FAQSection from '@/components/marketing/sections/FAQSection';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export default function ContactPage() {
  return (
    <MarketingLayout>
      {/* Hero Section */}
      <Hero 
        variant="centered"
        badge="Get in Touch"
        title={
          <>
            We're Here to <br />
            <span className="text-brand-primary">Help You Succeed</span>
          </>
        }
        subtitle="Have questions about TENVO? Our team is ready to help you find the right solution for your business."
        primaryCTA={{
          text: 'Schedule Demo',
          href: '/demo'
        }}
        secondaryCTA={{
          text: 'View Pricing',
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
                Send Us a Message
              </h2>
              <p className="text-gray-600 mb-8">
                Fill out the form below and we'll get back to you within 24 hours.
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

              <div className="space-y-6">
                <ContactInfoCard
                  icon={<Mail className="w-6 h-6" />}
                  title="Email"
                  content="support@tenvo.pk"
                  link="mailto:support@tenvo.pk"
                />
                <ContactInfoCard
                  icon={<Phone className="w-6 h-6" />}
                  title="Phone"
                  content="+92 300 1234567"
                  link="tel:+923001234567"
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
                      Check our <a href="#faq" className="text-brand-primary hover:underline">FAQ section</a> for quick answers
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">
                      Browse our documentation and guides
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

      {/* FAQ Section */}
      <section id="faq" className="py-16 bg-gray-50">
        <FAQSection 
          title="Frequently Asked Questions"
          subtitle="Find answers to common questions about TENVO"
        />
      </section>
    </MarketingLayout>
  );
}

function ContactInfoCard({ icon, title, content, link }) {
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
      <a href={link} className="block">
        {CardContent}
      </a>
    );
  }

  return CardContent;
}
