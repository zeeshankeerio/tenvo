'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useBusiness } from '@/lib/context/BusinessContext';

const SSE_DISABLED_KEY = 'tenvo:notifications-sse-disabled';

export function useNotifications() {
  const { business } = useBusiness();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const lastLoggedErrorRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  const fetchNotifications = useCallback(async () => {
    if (!business?.id) return;

    try {
      const response = await fetch(`/api/notifications?businessId=${business.id}&limit=50`);
      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setError(null);
    } catch (err) {
      console.warn('[Notifications] fetch failed:', err?.message || err);
      setError(err.message || 'Failed to load notifications');
    }
  }, [business?.id]);

  useEffect(() => {
    if (!business?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setIsConnected(false);
      return;
    }

    setNotifications([]);
    setUnreadCount(0);
    setError(null);

    if (typeof window !== 'undefined' && window.sessionStorage.getItem(SSE_DISABLED_KEY) === '1') {
      void fetchNotifications();
      return;
    }

    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(`/api/notifications/sse?businessId=${business.id}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'connected') {
            setIsConnected(true);
            setError(null);
            return;
          }

          if (data.type === 'notification') {
            setNotifications((prev) => [data.data, ...prev]);
            setUnreadCount((prev) => prev + 1);

            if (typeof window !== 'undefined' && window.Audio) {
              const audio = new Audio('/sounds/notification.mp3');
              audio.volume = 0.3;
              audio.play().catch(() => {});
            }
            return;
          }

          if (data.type === 'heartbeat') {
            return;
          }

          if (data.type === 'error') {
            setIsConnected(false);
            setError(data.message || 'Notification stream unavailable');

            if (lastLoggedErrorRef.current !== data.message) {
              lastLoggedErrorRef.current = data.message;
              console.warn('[Notifications SSE]', data.message);
            }

            if (data.fatal) {
              eventSource.close();
              if (typeof window !== 'undefined') {
                window.sessionStorage.setItem(SSE_DISABLED_KEY, '1');
              }
            }
          }
        } catch (err) {
          console.warn('[Notifications SSE] parse error:', err);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();

        reconnectAttemptsRef.current += 1;
        if (reconnectAttemptsRef.current >= 5) {
          setError('Live notifications unavailable, showing saved notifications only');
          if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(SSE_DISABLED_KEY, '1');
          }
          return;
        }

        const delay = Math.min(30000, 3000 * reconnectAttemptsRef.current);
        reconnectTimeoutRef.current = setTimeout(connectSSE, delay);
      };
    };

    connectSSE();
    void fetchNotifications();

    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [business?.id, fetchNotifications]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.warn('[Notifications] markAsRead failed:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!business?.id) return;

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, markAllRead: true }),
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.warn('[Notifications] markAllAsRead failed:', err);
    }
  }, [business?.id]);

  const dismissNotification = useCallback(async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotifications((prev) => {
          const target = prev.find((n) => n.id === notificationId);
          if (target && !target.is_read) {
            setUnreadCount((count) => Math.max(0, count - 1));
          }
          return prev.filter((n) => n.id !== notificationId);
        });
      }
    } catch (err) {
      console.warn('[Notifications] dismiss failed:', err);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    isConnected,
    error,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    refetch: fetchNotifications,
  };
}
