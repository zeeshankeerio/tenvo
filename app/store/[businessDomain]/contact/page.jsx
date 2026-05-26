'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle } from 'lucide-react';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';

export default function ContactPage() {
  const { business, settings } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSubmitted(true);
    setSubmitting(false);
  };

  const contactInfo = [
    business?.email && { icon: Mail, label: 'Email', value: business.email, href: `mailto:${business.email}` },
    business?.phone && { icon: Phone, label: 'Phone', value: business.phone, href: `tel:${business.phone}` },
    business?.city && { icon: MapPin, label: 'Location', value: [business.city, business.country].filter(Boolean).join(', '), href: null },
    { icon: Clock, label: 'Business Hours', value: settings?.businessHours || 'Mon – Sat, 9 AM – 6 PM', href: null },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <Link href={`/store/${businessDomain}`} className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
          ← Back to Store
        </Link>

        <h1 className="text-3xl font-black text-gray-900 mb-2">Contact Us</h1>
        <p className="text-gray-500 mb-10">We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-4">
            {contactInfo.map((info) => (
              <div key={info.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: accent + '20' }}>
                  <info.icon className="w-5 h-5" style={{ color: accent }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{info.label}</p>
                  {info.href ? (
                    <a href={info.href} className="text-sm font-medium text-gray-900 hover:underline mt-0.5 block">{info.value}</a>
                  ) : (
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{info.value}</p>
                  )}
                </div>
              </div>
            ))}

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick Links</p>
              <div className="space-y-2 text-sm">
                <Link href={`/store/${businessDomain}/orders`} className="block text-gray-600 hover:text-gray-900">Track my order →</Link>
                <Link href={`/store/${businessDomain}/returns`} className="block text-gray-600 hover:text-gray-900">Returns & Exchanges →</Link>
                <Link href={`/store/${businessDomain}/faqs`} className="block text-gray-600 hover:text-gray-900">FAQs →</Link>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            {submitted ? (
              <div className="text-center py-16">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h2>
                <p className="text-gray-500 mb-6">Thanks for reaching out. We'll get back to you within 1–2 business days.</p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                  className="text-sm font-semibold" style={{ color: accent }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-400">*</span></label>
                    <input
                      type="text" required value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                      style={{ '--tw-ring-color': accent }}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-400">*</span></label>
                    <input
                      type="email" required value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject <span className="text-red-400">*</span></label>
                  <input
                    type="text" required value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                    placeholder="How can we help?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message <span className="text-red-400">*</span></label>
                  <textarea
                    required rows={5} value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 resize-none"
                    placeholder="Tell us more about your question or issue…"
                  />
                </div>
                <button
                  type="submit" disabled={submitting}
                  className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: accent }}
                >
                  {submitting ? 'Sending…' : (<><Send className="w-4 h-4" /> Send Message</>)}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
