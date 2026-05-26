'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin,
  CreditCard, Shield, Truck, RotateCcw, Send, ExternalLink
} from 'lucide-react';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { toast } from 'react-hot-toast';

export function StoreFooter({ business, settings }) {
  const { businessDomain } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const freeShippingThreshold = settings?.freeShippingThreshold || 2000;
  const returnDays = settings?.returnPolicyDays || 7;

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
        toast.success('Thanks for subscribing! 🎉');
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
    { icon: Facebook, href: settings?.socialLinks?.facebook || settings?.social?.facebook, label: 'Facebook', color: '#1877F2' },
    { icon: Instagram, href: settings?.socialLinks?.instagram || settings?.social?.instagram, label: 'Instagram', color: '#E1306C' },
    { icon: Twitter, href: settings?.socialLinks?.twitter || settings?.social?.twitter, label: 'Twitter / X', color: '#1DA1F2' },
    { icon: Youtube, href: settings?.socialLinks?.youtube || settings?.social?.youtube, label: 'YouTube', color: '#FF0000' },
  ].filter((s) => s.href);

  const shopLinks = [
    { label: 'All Products', href: `/store/${businessDomain}/products` },
    { label: 'New Arrivals', href: `/store/${businessDomain}/products?sort=newest` },
    { label: 'On Sale', href: `/store/${businessDomain}/products?onSale=true` },
    { label: 'Best Sellers', href: `/store/${businessDomain}/products?sort=popularity` },
  ];

  const supportLinks = [
    { label: 'Track My Order', href: `/store/${businessDomain}/orders` },
    { label: 'Shipping Info', href: `/store/${businessDomain}/shipping` },
    { label: 'Returns & Exchanges', href: `/store/${businessDomain}/returns` },
    { label: 'FAQs', href: `/store/${businessDomain}/faqs` },
    { label: 'Contact Us', href: `/store/${businessDomain}/contact` },
  ];

  return (
    <footer className="bg-gray-950 text-gray-400">
      {/* ── Trust Strip ──────────────────────────────────────────────── */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Truck, color: 'text-blue-400', title: 'Free Shipping', sub: `Orders over Rs. ${freeShippingThreshold.toLocaleString()}` },
              { icon: Shield, color: 'text-green-400', title: 'Secure Payment', sub: '256-bit SSL encryption' },
              { icon: RotateCcw, color: 'text-orange-400', title: `${returnDays}-Day Returns`, sub: 'Hassle-free returns' },
              { icon: CreditCard, color: 'text-purple-400', title: 'Multiple Payments', sub: 'Cards, COD, Wallets' },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-3">
                <item.icon className={`w-7 h-7 flex-shrink-0 ${item.color}`} />
                <div>
                  <p className="font-semibold text-white text-sm">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Footer ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">

          {/* Brand column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Logo + name */}
            <div className="flex items-center gap-3">
              {business?.logo_url ? (
                <img
                  src={business.logo_url}
                  alt={business.business_name}
                  className="h-9 w-auto object-contain"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-base"
                  style={{ backgroundColor: accent }}
                >
                  {business?.business_name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <span className="text-lg font-black text-white">{business?.business_name}</span>
            </div>

            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              {business?.description ||
                'Your trusted online store for quality products. Shop with confidence.'}
            </p>

            {/* Contact */}
            <div className="space-y-2 text-sm">
              {business?.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  {business.phone}
                </a>
              )}
              {business?.email && (
                <a
                  href={`mailto:${business.email}`}
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  {business.email}
                </a>
              )}
              {(business?.address || business?.city) && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    {[business.address, business.city, business.country]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Social links */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                {socialLinks.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                  >
                    <s.icon className="w-4 h-4 text-gray-300" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Shop links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Shop</h4>
            <ul className="space-y-2.5">
              {shopLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Support</h4>
            <ul className="space-y-2.5">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Stay Updated
            </h4>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              Get exclusive deals, new arrivals, and updates straight to your inbox.
            </p>
            <form onSubmit={handleNewsletter} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder:text-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent pr-12"
                  style={{ '--tw-ring-color': accent }}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: accent }}
                  aria-label="Subscribe"
                >
                  {submitting
                    ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-xs text-gray-600">
                No spam. Unsubscribe anytime.
              </p>
            </form>
          </div>
        </div>

        {/* ── Bottom bar ───────────────────────────────────────────────── */}
        <div className="mt-12 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            © {currentYear}{' '}
            <span className="text-gray-400 font-medium">{business?.business_name}</span>
            . All rights reserved.
          </p>

          <div className="flex items-center gap-4 text-xs text-gray-600">
            <Link href={`/store/${businessDomain}/privacy`} className="hover:text-gray-400 transition-colors">
              Privacy Policy
            </Link>
            <span>·</span>
            <Link href={`/store/${businessDomain}/terms`} className="hover:text-gray-400 transition-colors">
              Terms of Service
            </Link>
            {business?.website && (
              <>
                <span>·</span>
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-400 transition-colors flex items-center gap-1"
                >
                  Website <ExternalLink className="w-3 h-3" />
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
