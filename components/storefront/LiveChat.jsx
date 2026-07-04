'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Minimize2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { isPharmacyElevatedStore } from '@/lib/storefront/pharmacyStorefront';
import {
  STOREFRONT_FLOAT_BOTTOM,
  STOREFRONT_FLOAT_RIGHT,
  STOREFRONT_CHAT_Z,
} from '@/lib/utils/mobileLayout';

const GENERIC_QUICK_PROMPTS = ['Shipping info', 'Return policy', 'Track order', 'Payment methods'];

const PHARMACY_QUICK_PROMPTS = [
  'I have a headache',
  'Cold and cough',
  'Upload prescription',
  'Set refill reminder',
];

function openStoreChatEventName() {
  return 'tenvo:open-store-chat';
}

const SHELL_CLASS = cn(
  'fixed flex flex-col items-end',
  STOREFRONT_FLOAT_RIGHT,
  STOREFRONT_FLOAT_BOTTOM,
  STOREFRONT_CHAT_Z
);

function ChatFab({ accent, onClick, showPulse = true }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-2xl transition-transform hover:scale-110 active:scale-95"
      style={{ backgroundColor: accent }}
      aria-label="Open chat"
    >
      <MessageCircle className="h-6 w-6" aria-hidden />
      {showPulse ? (
        <span className="absolute -right-1 -top-1 h-4 w-4 animate-pulse rounded-full border-2 border-white bg-green-400" />
      ) : null}
    </button>
  );
}

export function LiveChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { settings, business, businessDomain } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);
  const storeName = business?.business_name || 'Support';
  const pharmacyStore = isPharmacyElevatedStore(business?.category);
  const quickPrompts = pharmacyStore ? PHARMACY_QUICK_PROMPTS : GENERIC_QUICK_PROMPTS;
  const assistantSubtitle = pharmacyStore
    ? 'AI health assistant · Not a substitute for professional care'
    : 'Store assistant · Public help only';

  const fetchReply = useCallback(
    async (message, { greeting = false } = {}) => {
      const res = await fetch(`/api/storefront/${encodeURIComponent(businessDomain)}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(greeting ? { greeting: true } : { message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.reply) {
        throw new Error(data?.error || 'Unable to reach store assistant');
      }
      return data.reply;
    },
    [businessDomain]
  );

  const seedGreetingIfEmpty = useCallback(async () => {
    if (messages.length > 0) return;
    try {
      const reply = await fetchReply('', { greeting: true });
      setMessages([
        {
          id: 1,
          type: 'bot',
          text: reply,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages([
        {
          id: 1,
          type: 'bot',
          text: `Hi there! Welcome to ${storeName}. How can I help you today?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [fetchReply, messages.length, storeName]);

  const handleOpen = useCallback(() => {
    setIsMinimized(false);
    setIsOpen(true);
    void seedGreetingIfEmpty();
  }, [seedGreetingIfEmpty]);

  useEffect(() => {
    const onOpenChat = () => handleOpen();
    window.addEventListener(openStoreChatEventName(), onOpenChat);
    return () => window.removeEventListener(openStoreChatEventName(), onOpenChat);
  }, [handleOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const sendUserMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), type: 'user', text: trimmed, timestamp: new Date() },
    ]);
    setInput('');
    setIsTyping(true);

    try {
      const reply = await fetchReply(trimmed);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, type: 'bot', text: reply, timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: 'bot',
          text: `Sorry, I could not respond right now. Visit /store/${businessDomain}/contact for help.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    void sendUserMessage(input);
  };

  const fmt = (d) =>
    new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  if (!isOpen) {
    return (
      <div className={SHELL_CLASS}>
        <ChatFab accent={accent} onClick={handleOpen} />
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div className={SHELL_CLASS}>
        <ChatFab accent={accent} onClick={() => setIsMinimized(false)} showPulse={false} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        SHELL_CLASS,
        'w-[calc(100vw-2rem)] max-w-[360px]',
        'h-[min(520px,calc(100vh-6rem-env(safe-area-inset-bottom)))] lg:h-[520px]'
      )}
    >
      <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
        <div
          className="flex flex-shrink-0 items-center justify-between px-4 py-3"
          style={{ backgroundColor: accent }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-400" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none text-white">{storeName}</p>
              <p className="mt-0.5 text-xs text-white/70">{assistantSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="rounded-lg p-1.5 text-white transition-colors hover:bg-white/15"
              aria-label="Minimise"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-white transition-colors hover:bg-white/15"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex', msg.type === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  msg.type === 'user'
                    ? 'rounded-br-sm text-white'
                    : 'rounded-bl-sm border border-gray-100 bg-white text-gray-800 shadow-sm'
                )}
                style={msg.type === 'user' ? { backgroundColor: accent } : {}}
              >
                <p className="whitespace-pre-line">{msg.text}</p>
                <span
                  className={cn(
                    'mt-1 block text-[10px]',
                    msg.type === 'user' ? 'text-right text-white/60' : 'text-gray-400'
                  )}
                >
                  {fmt(msg.timestamp)}
                </span>
              </div>
            </div>
          ))}

          {isTyping ? (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-gray-100 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 1 ? (
          <div className="flex flex-wrap gap-1.5 bg-gray-50 px-4 pb-2">
            {quickPrompts.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void sendUserMessage(q)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-gray-400"
              >
                {q}
              </button>
            ))}
          </div>
        ) : null}

        <form onSubmit={handleSend} className="flex gap-2 border-t border-gray-100 bg-white px-4 py-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={pharmacyStore ? 'Describe symptoms or ask about medicines…' : 'Type a message…'}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': accent }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: accent }}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
