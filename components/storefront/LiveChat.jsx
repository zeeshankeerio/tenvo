'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minimize2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { formatCurrency } from '@/lib/currency';

export function LiveChat({ businessId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { settings, business, businessDomain, currency } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);
  const storeName = business?.business_name || 'Support';
  const freeShipping = settings?.freeShippingThreshold || 2000;
  const returnDays = settings?.returnPolicyDays || 7;

  // Initialise greeting when first opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 1,
        type: 'bot',
        text: `Hi there! 👋 Welcome to ${storeName}. How can I help you today?`,
        timestamp: new Date(),
      }]);
    }
  }, [isOpen, messages.length, storeName]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const getBotResponse = (msg) => {
    const m = msg.toLowerCase();
    if (/\b(hi|hello|hey|salaam|salam)\b/.test(m))
      return `Hello! 😊 How can I assist you at ${storeName} today?`;
    if (/\b(price|cost|how much|rate)\b/.test(m))
      return 'You can find prices on each product page. Use the search bar to find specific items quickly!';
    if (/\b(ship|deliver|delivery|shipping)\b/.test(m))
      return `We offer free shipping on orders over ${formatCurrency(freeShipping, currency)}! Standard delivery takes 3–5 business days. Express delivery is also available.`;
    if (/\b(return|refund|exchange|replace)\b/.test(m))
      return `We have a ${returnDays}-day return policy. Items must be unused and in original packaging. Contact us to initiate a return.`;
    if (/\b(pay|payment|cod|card|jazzcash|easypaisa)\b/.test(m))
      return 'We accept Credit/Debit cards, Cash on Delivery (COD), JazzCash, and EasyPaisa. All payments are 100% secure.';
    if (/\b(order|track|status|where)\b/.test(m))
      return `You can track your order at /store/${businessDomain}/orders. Enter your email to view all your orders.`;
    if (/\b(stock|available|in stock)\b/.test(m))
      return 'Stock availability is shown on each product page. If an item shows "Out of Stock", you can check back later or contact us.';
    if (/\b(discount|promo|coupon|offer|sale)\b/.test(m))
      return 'Check our Sale section for current deals! We regularly run promotions — subscribe to our newsletter to never miss an offer.';
    if (/\b(contact|human|agent|speak|talk)\b/.test(m))
      return business?.phone
        ? `You can reach us at ${business.phone} or ${business.email || 'via email'}. We're happy to help!`
        : `Please email us at ${business?.email || 'our support team'} and we'll get back to you shortly.`;
    if (/\b(thank|thanks|thx)\b/.test(m))
      return "You're welcome! Is there anything else I can help you with? 😊";
    if (/\b(bye|goodbye|ciao)\b/.test(m))
      return 'Goodbye! Have a great day! Feel free to chat anytime. 👋';
    return "I'm here to help! Ask me about:\n• Shipping & delivery\n• Returns & refunds\n• Payment methods\n• Order tracking\n• Product availability\n\nOr type 'contact' to reach our team directly.";
  };

  const handleSend = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const userMsg = { id: Date.now(), type: 'user', text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, type: 'bot', text: getBotResponse(text), timestamp: new Date() },
      ]);
      setIsTyping(false);
    }, 900 + Math.random() * 400);
  };

  const fmt = (d) =>
    new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // ── Closed state — floating button ──────────────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full text-white shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{ backgroundColor: accent }}
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />
      </button>
    );
  }

  // ── Minimised state ──────────────────────────────────────────────────
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full text-white shadow-2xl flex items-center justify-center transition-all hover:scale-110"
        style={{ backgroundColor: accent }}
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  // ── Open state ───────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[360px] h-[520px] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ backgroundColor: accent }}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">{storeName}</p>
            <p className="text-xs text-white/70 mt-0.5">Support · Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors text-white"
            aria-label="Minimise"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors text-white"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex', msg.type === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                msg.type === 'user'
                  ? 'text-white rounded-br-sm'
                  : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
              )}
              style={msg.type === 'user' ? { backgroundColor: accent } : {}}
            >
              <p className="whitespace-pre-line">{msg.text}</p>
              <span
                className={cn(
                  'text-[10px] mt-1 block',
                  msg.type === 'user' ? 'text-white/60 text-right' : 'text-gray-400'
                )}
              >
                {fmt(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5 bg-gray-50">
          {['Shipping info', 'Return policy', 'Track order', 'Payment methods'].map((q) => (
            <button
              key={q}
              onClick={() => {
                setInput(q);
                setTimeout(() => {
                  const fakeEvent = { preventDefault: () => {} };
                  setMessages((prev) => [
                    ...prev,
                    { id: Date.now(), type: 'user', text: q, timestamp: new Date() },
                  ]);
                  setIsTyping(true);
                  setTimeout(() => {
                    setMessages((prev) => [
                      ...prev,
                      { id: Date.now() + 1, type: 'bot', text: getBotResponse(q), timestamp: new Date() },
                    ]);
                    setIsTyping(false);
                  }, 900);
                  setInput('');
                }, 0);
              }}
              className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:border-gray-400 transition-colors text-gray-600"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="px-4 py-3 bg-white border-t border-gray-100 flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:border-transparent"
          style={{ '--tw-ring-color': accent }}
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40 hover:opacity-90 active:scale-95 flex-shrink-0"
          style={{ backgroundColor: accent }}
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
