'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  Check,
  ShoppingCart,
  DollarSign,
  Package,
  AlertCircle,
  AlertTriangle,
  ClipboardList,
  Loader2,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useHubOperationalAlerts } from '@/lib/hooks/useHubOperationalAlerts';
import { useBusiness } from '@/lib/context/BusinessContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

function formatDistanceToNow(dateString) {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const notificationIcons = {
  order: ShoppingCart,
  storefront_order: ShoppingCart,
  payment: DollarSign,
  inventory: Package,
  low_stock: AlertTriangle,
  out_of_stock: AlertTriangle,
  storefront_contact: MessageSquare,
  system: AlertCircle,
};

const notificationColors = {
  order: 'bg-info-light text-info-dark',
  storefront_order: 'bg-info-light text-info-dark',
  payment: 'bg-success-light text-success-dark',
  inventory: 'bg-warning-light text-warning-dark',
  low_stock: 'bg-warning-light text-warning-dark',
  out_of_stock: 'bg-danger-light text-danger-dark',
  storefront_contact: 'bg-brand-50 text-brand-primary-dark',
  system: 'bg-brand-50 text-brand-primary-dark',
};

export function NotificationBell({ className }) {
  const router = useRouter();
  const { business, isLoading: businessLoading } = useBusiness();
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isConnected,
    error,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAll,
    refetch,
  } = useNotifications();
  const { alerts, alertCount, handleAlertClick } = useHubOperationalAlerts();

  const totalBadge = unreadCount + alertCount;

  const hasBusiness = Boolean(business?.id);

  const sortedNotifications = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [notifications]
  );

  const handlePersistedClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.action_url) {
      setIsOpen(false);
      router.push(notification.action_url);
    }
  };

  if (!hasBusiness && !businessLoading) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8 rounded-lg text-neutral-300', className)}
        disabled
        title="Notifications available after business setup"
        aria-label="Notifications unavailable"
      >
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8 rounded-lg text-neutral-500 hover:text-brand-primary hover:bg-brand-50"
        onClick={() => {
          setIsOpen((open) => {
            const next = !open;
            if (next && hasBusiness) refetch();
            return next;
          });
        }}
        aria-label={`Notifications${totalBadge > 0 ? `, ${totalBadge} items` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" />
        {totalBadge > 0 && (
          <Badge className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center border-2 border-white bg-brand-primary p-0 text-[10px] font-bold text-white">
            {totalBadge > 9 ? '9+' : totalBadge}
          </Badge>
        )}
        {!isConnected && hasBusiness && (
          <span
            className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white"
            title="Live updates paused, showing saved notifications"
          />
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 z-50 mt-2 w-[min(100vw-1.5rem,24rem)] overflow-hidden rounded-xl border border-neutral-200 bg-super-white shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 bg-half-white px-4 py-3">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Notifications</h3>
                  <p className="text-[11px] text-neutral-500">
                    {business?.business_name || business?.name || 'Your business'}
                    {isConnected ? ' · Live' : ' · Saved'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-7 text-[11px]">
                      <Check className="mr-1 h-3 w-3" />
                      Mark read
                    </Button>
                  )}
                  {sortedNotifications.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAll}
                      className="h-7 text-[11px] text-neutral-500 hover:text-danger-dark"
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {error && (
                <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-[11px] text-amber-800">
                  {error}
                </div>
              )}

              <ScrollArea className="max-h-80">
                {businessLoading ? (
                  <div className="flex items-center justify-center py-10 text-neutral-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : alerts.length === 0 && sortedNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-4 py-10 text-neutral-500">
                    <Bell className="mb-2 h-8 w-8 opacity-20" />
                    <p className="text-sm font-medium">All caught up</p>
                    <p className="mt-1 text-center text-xs text-neutral-400">
                      Orders, payments, and inventory alerts will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {alerts.length > 0 && (
                      <div className="p-2">
                        <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          Needs attention
                        </p>
                        {alerts.map((alert) => {
                          const Icon = alert.type === 'inventory' ? AlertTriangle : ClipboardList;
                          return (
                            <button
                              key={alert.id}
                              type="button"
                              onClick={() => {
                                handleAlertClick(alert.id);
                                setIsOpen(false);
                              }}
                              className="flex w-full gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-brand-50"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-primary">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-neutral-900">{alert.title}</p>
                                <p className="text-xs text-neutral-500">{alert.message}</p>
                              </div>
                              <Badge variant="secondary" className="shrink-0 bg-brand-100 text-brand-primary-dark">
                                {alert.count}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {sortedNotifications.length > 0 && (
                      <div className="p-2">
                        {alerts.length > 0 && (
                          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                            Activity
                          </p>
                        )}
                        {sortedNotifications.map((notification) => {
                          const Icon = notificationIcons[notification.type] || Bell;
                          const colorClass =
                            notificationColors[notification.type] || 'bg-neutral-100 text-neutral-600';

                          return (
                            <div
                              key={notification.id}
                              className={cn(
                                'group flex cursor-pointer gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-neutral-50',
                                !notification.is_read && 'bg-brand-50/40'
                              )}
                              onClick={() => handlePersistedClick(notification)}
                            >
                              <div
                                className={cn(
                                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                                  colorClass
                                )}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p
                                    className={cn(
                                      'text-sm font-medium',
                                      !notification.is_read ? 'text-neutral-900' : 'text-neutral-600'
                                    )}
                                  >
                                    {notification.title}
                                  </p>
                                  <span className="shrink-0 text-[10px] text-neutral-400">
                                    {formatDistanceToNow(notification.created_at)}
                                  </span>
                                </div>
                                <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">
                                  {notification.message}
                                </p>
                                {notification.action_url && (
                                  <span className="mt-1 inline-block text-[11px] font-semibold text-brand-primary">
                                    View details →
                                  </span>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dismissNotification(notification.id);
                                }}
                                aria-label="Dismiss"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {sortedNotifications.length > 0 && (
                <div className="border-t border-neutral-100 bg-half-white px-4 py-2">
                  <Link
                    href={business?.domain ? `/business/${business.domain}?tab=settings` : '/notifications'}
                    className="block text-center text-[11px] font-medium text-neutral-500 hover:text-brand-primary"
                    onClick={() => setIsOpen(false)}
                  >
                    Notification settings
                  </Link>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
