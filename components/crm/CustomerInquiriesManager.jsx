'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Inbox,
  Mail,
  Phone,
  Search,
  RefreshCw,
  Check,
  RotateCcw,
  Loader2,
  MessageSquare,
  Copy,
  ShoppingBag,
  ChevronLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/lib/context/BusinessContext';
import {
  getStorefrontContactMessagesAction,
  updateStorefrontContactStatusAction,
} from '@/lib/actions/dashboard/storefrontContactMessages';
import { CONTACT_PENDING_STATUSES } from '@/lib/dashboard/domainOperationsSubjects';

const PENDING_SET = new Set(CONTACT_PENDING_STATUSES);

const SUBJECT_LABELS = {
  general: 'General enquiry',
  order: 'Order help',
  product: 'Product question',
  return: 'Return / exchange',
  wholesale: 'Wholesale enquiry',
  other: 'Other',
  prescription: 'Prescription',
  refill: 'Refill request',
  appointment: 'Appointment',
  visit: 'Visit request',
  booking: 'Booking',
  showroom: 'Showroom visit',
  consultation: 'Consultation',
  testdrive: 'Test drive',
  'test-drive': 'Test drive',
  sell: 'Sell / trade-in',
  finance: 'Financing',
  leasing: 'Leasing',
  insurance: 'Insurance',
  buy: 'Purchase enquiry',
  ppf: 'PPF / detailing',
  conversion: 'Conversion',
  service: 'Service request',
};

const STATUS_STYLES = {
  new: 'bg-brand-100 text-brand-primary-dark',
  pending: 'bg-amber-100 text-amber-700',
  open: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  handled: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-neutral-200 text-neutral-600',
  resolved: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-neutral-200 text-neutral-500',
};

const FILTERS = [
  { key: 'pending', label: 'Open' },
  { key: 'all', label: 'All' },
  { key: 'handled', label: 'Handled' },
];

function subjectLabel(subject) {
  const key = String(subject || 'general').toLowerCase();
  return SUBJECT_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

function statusLabel(status) {
  const key = String(status || 'new').toLowerCase();
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function isPending(status) {
  return PENDING_SET.has(String(status || '').toLowerCase());
}

function formatWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function initialsFor(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('') || '?';
}

export function CustomerInquiriesManager({ business: businessProp }) {
  const { business: businessCtx } = useBusiness();
  const business = businessProp || businessCtx;
  const businessId = business?.id;
  const searchParams = useSearchParams();
  const requestedContactId = searchParams?.get('contact');

  const [messages, setMessages] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const autoSelectedRef = useRef(false);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await getStorefrontContactMessagesAction(businessId, { status: filter });
      if (res?.success) {
        setMessages(res.data.messages || []);
        setCounts({ total: res.data.total || 0, pending: res.data.pending || 0 });
      } else {
        toast.error(res?.error || 'Could not load inquiries');
      }
    } catch (err) {
      toast.error('Could not load inquiries');
    } finally {
      setLoading(false);
    }
  }, [businessId, filter]);

  useEffect(() => {
    load();
  }, [load]);

  // Deep-link: auto-open the inquiry referenced by ?contact=<id> once.
  useEffect(() => {
    if (autoSelectedRef.current || !requestedContactId || messages.length === 0) return;
    const target = messages.find((m) => String(m.id) === String(requestedContactId));
    if (target) {
      setSelectedId(target.id);
      autoSelectedRef.current = true;
    }
  }, [requestedContactId, messages]);

  const filteredMessages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) =>
      [m.customerName, m.customerEmail, m.customerPhone, m.subject, m.message, m.orderNumber]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [messages, search]);

  const selected = useMemo(
    () => messages.find((m) => m.id === selectedId) || null,
    [messages, selectedId]
  );

  const handleStatusChange = useCallback(
    async (message, nextStatus) => {
      if (!businessId || !message) return;
      setUpdatingId(message.id);
      try {
        const res = await updateStorefrontContactStatusAction(businessId, message.id, nextStatus);
        if (res?.success) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === message.id
                ? { ...m, status: res.data.status, handledAt: res.data.handledAt }
                : m
            )
          );
          setCounts((prev) => {
            const wasPending = isPending(message.status);
            const nowPending = isPending(res.data.status);
            if (wasPending && !nowPending) return { ...prev, pending: Math.max(0, prev.pending - 1) };
            if (!wasPending && nowPending) return { ...prev, pending: prev.pending + 1 };
            return prev;
          });
          toast.success(nowPendingText(res.data.status));
        } else {
          toast.error(res?.error || 'Could not update inquiry');
        }
      } catch (err) {
        toast.error('Could not update inquiry');
      } finally {
        setUpdatingId(null);
      }
    },
    [businessId]
  );

  const copyEmail = useCallback((email) => {
    if (!email || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(email).then(
      () => toast.success('Email copied'),
      () => {}
    );
  }, []);

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-primary">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold uppercase tracking-tight text-gray-900 lg:text-xl">
              Customer Inquiries
            </h2>
            <p className="text-xs text-gray-500">
              Messages from your public store contact and booking forms.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* List pane */}
        <div
          className={cn(
            'flex flex-col rounded-xl border border-neutral-200 bg-white',
            selected && 'hidden lg:flex'
          )}
        >
          <div className="space-y-3 border-b border-neutral-100 p-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, order..."
                  className="h-9 pl-8 text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={load}
                disabled={loading}
                aria-label="Refresh"
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-0.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    'flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors',
                    filter === f.key
                      ? 'bg-white text-brand-primary shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-800'
                  )}
                >
                  {f.label}
                  {f.key === 'pending' && counts.pending > 0 ? (
                    <span className="ml-1 rounded-full bg-brand-primary px-1.5 text-[10px] font-bold text-white">
                      {counts.pending}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="h-[26rem] lg:h-[32rem]">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-neutral-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-neutral-500">
                <Inbox className="mb-2 h-8 w-8 opacity-20" />
                <p className="text-sm font-medium">No inquiries here</p>
                <p className="mt-1 text-xs text-neutral-400">
                  {filter === 'pending'
                    ? 'You are all caught up. New messages will show here.'
                    : 'Customer messages from your store will appear here.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {filteredMessages.map((m) => {
                  const active = m.id === selectedId;
                  const pending = isPending(m.status);
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(m.id)}
                        className={cn(
                          'flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-neutral-50',
                          active && 'bg-brand-50/60'
                        )}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-600">
                          {initialsFor(m.customerName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={cn(
                                'truncate text-sm',
                                pending ? 'font-semibold text-neutral-900' : 'font-medium text-neutral-700'
                              )}
                            >
                              {m.customerName}
                            </p>
                            <span className="shrink-0 text-[10px] text-neutral-400">
                              {formatWhen(m.createdAt)}
                            </span>
                          </div>
                          <p className="truncate text-xs text-neutral-500">{subjectLabel(m.subject)}</p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-neutral-400">{m.message}</p>
                        </div>
                        {pending ? (
                          <span
                            className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-primary"
                            aria-label="Unhandled"
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </div>

        {/* Detail pane */}
        <div
          className={cn(
            'rounded-xl border border-neutral-200 bg-white',
            !selected && 'hidden lg:block'
          )}
        >
          {selected ? (
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-neutral-100 p-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="mt-0.5 rounded-md p-1 text-neutral-500 hover:bg-neutral-100 lg:hidden"
                    aria-label="Back to list"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-primary">
                    {initialsFor(selected.customerName)}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900">{selected.customerName}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn('text-[11px]', STATUS_STYLES[String(selected.status).toLowerCase()] || 'bg-neutral-100 text-neutral-600')}
                      >
                        {statusLabel(selected.status)}
                      </Badge>
                      <span className="text-xs text-neutral-400">{formatWhen(selected.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isPending(selected.status) ? (
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={() => handleStatusChange(selected, 'handled')}
                      disabled={updatingId === selected.id}
                    >
                      {updatingId === selected.id ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="mr-1 h-3.5 w-3.5" />
                      )}
                      Mark handled
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => handleStatusChange(selected, 'new')}
                      disabled={updatingId === selected.id}
                    >
                      {updatingId === selected.id ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                      )}
                      Reopen
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 border-b border-neutral-100 p-4 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 shrink-0 text-neutral-400" />
                  <a
                    href={`mailto:${selected.customerEmail}`}
                    className="truncate font-medium text-brand-primary hover:underline"
                  >
                    {selected.customerEmail}
                  </a>
                  <button
                    type="button"
                    onClick={() => copyEmail(selected.customerEmail)}
                    className="shrink-0 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                    aria-label="Copy email"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                {selected.customerPhone ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 shrink-0 text-neutral-400" />
                    <a
                      href={`tel:${selected.customerPhone}`}
                      className="font-medium text-neutral-700 hover:underline"
                    >
                      {selected.customerPhone}
                    </a>
                  </div>
                ) : null}
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4 shrink-0 text-neutral-400" />
                  <span className="text-neutral-600">{subjectLabel(selected.subject)}</span>
                </div>
                {selected.orderNumber ? (
                  <div className="flex items-center gap-2 text-sm">
                    <ShoppingBag className="h-4 w-4 shrink-0 text-neutral-400" />
                    <span className="text-neutral-600">Order #{selected.orderNumber}</span>
                  </div>
                ) : null}
              </div>

              <div className="flex-1 p-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Message
                </p>
                <div className="whitespace-pre-wrap rounded-lg bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-800">
                  {selected.message}
                </div>
              </div>

              <div className="border-t border-neutral-100 p-4">
                <a
                  href={`mailto:${selected.customerEmail}?subject=${encodeURIComponent(
                    `Re: ${subjectLabel(selected.subject)}`
                  )}`}
                >
                  <Button className="w-full sm:w-auto">
                    <Mail className="mr-2 h-4 w-4" />
                    Reply by email
                  </Button>
                </a>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[20rem] flex-col items-center justify-center px-6 py-16 text-center text-neutral-500">
              <MessageSquare className="mb-3 h-10 w-10 opacity-20" />
              <p className="text-sm font-medium">Select an inquiry</p>
              <p className="mt-1 max-w-xs text-xs text-neutral-400">
                Choose a message from the list to read the full details and reply to the customer.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function nowPendingText(status) {
  return isPending(status) ? 'Inquiry reopened' : 'Inquiry marked handled';
}

export default CustomerInquiriesManager;
