'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

const FAQS = [
  {
    category: 'Orders',
    items: [
      { q: 'How do I track my order?', a: 'Visit the Order History page and enter your email address. You\'ll see all orders placed with that email and their current status.' },
      { q: 'Can I modify or cancel my order?', a: 'Orders can be modified or cancelled within 1 hour of placement. After that, the order enters processing and cannot be changed. Contact us immediately if you need help.' },
      { q: 'What happens if an item is out of stock?', a: 'If an item goes out of stock after you order, we will notify you by email and offer a full refund or a suitable replacement.' },
    ],
  },
  {
    category: 'Shipping',
    items: [
      { q: 'How long does delivery take?', a: 'Standard delivery takes 3-5 business days. Express delivery takes 1-2 business days. Store pickup is available same day during business hours.' },
      { q: 'Do you offer free shipping?', a: 'Yes! Orders above the free shipping threshold qualify for free standard delivery. The threshold is displayed during checkout.' },
      { q: 'Do you ship internationally?', a: 'Currently we only ship within Pakistan. We hope to expand internationally in the future.' },
    ],
  },
  {
    category: 'Returns & Refunds',
    items: [
      { q: 'What is your return policy?', a: 'We accept returns on eligible items within the return window from the date of delivery. Items must be unused and in original packaging.' },
      { q: 'How long does a refund take?', a: 'Once we receive and inspect the returned item, refunds are processed within 5-7 business days to your original payment method.' },
      { q: 'Who pays for return shipping?', a: 'If the return is due to a defective or incorrect item we sent, we cover return shipping. For change-of-mind returns, the customer is responsible for return shipping costs.' },
    ],
  },
  {
    category: 'Payments',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept Cash on Delivery (COD), credit/debit cards, EasyPaisa, JazzCash, and bank transfer. Available methods are shown at checkout.' },
      { q: 'Is it safe to pay online?', a: 'Absolutely. All transactions are encrypted with SSL and we never store your card details on our servers.' },
      { q: 'When am I charged for my order?', a: 'For card payments you are charged immediately upon order confirmation. For COD, you pay at the time of delivery.' },
    ],
  },
  {
    category: 'Products',
    items: [
      { q: 'Are your products genuine?', a: 'Yes, all products listed in our store are 100% authentic and sourced directly from verified suppliers.' },
      { q: 'How do I know if a product is in stock?', a: 'Product pages show live stock status. If a product is out of stock it will be clearly labelled and you can sign up for a back-in-stock notification.' },
      { q: 'Can I request a product that isn\'t listed?', a: 'Yes! Use the Contact page to send us a product request. We review all requests regularly.' },
    ],
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
      >
        <span className="font-semibold text-gray-900 text-sm">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <p className="text-sm text-gray-600 pb-4 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function FaqsPage({ params }) {
  const { businessDomain } = use(params);
  const [search, setSearch] = useState('');

  const filtered = FAQS.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        !search ||
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href={`/store/${businessDomain}`} className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
          ← Back to Store
        </Link>

        <h1 className="text-3xl font-black text-gray-900 mb-2">Frequently Asked Questions</h1>
        <p className="text-gray-500 mb-8">
          {"Can't find what you're looking for? "}
          <Link href={`/store/${businessDomain}/contact`} className="text-blue-600 hover:underline">Contact us</Link>
        </p>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search FAQs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="space-y-6">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-16">No results found for &ldquo;{search}&rdquo;</p>
          ) : (
            filtered.map((cat) => (
              <div key={cat.category} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-2">{cat.category}</h2>
                {cat.items.map((item) => (
                  <FaqItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
