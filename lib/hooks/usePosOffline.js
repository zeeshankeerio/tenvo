'use client';

import { useCallback, useEffect, useState } from 'react';
import { posAPI } from '@/lib/api/pos';
import {
    countPendingPosSales,
    enqueueOfflinePosSale,
    incrementPosSaleAttempt,
    listPendingPosSales,
    markPosSaleSynced,
} from '@/lib/utils/posOfflineQueue';

/**
 * Offline POS detection + queue sync when back online.
 */
export function usePosOffline(businessId, { enabled = false } = {}) {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    const refreshPending = useCallback(async () => {
        if (!businessId || !enabled) {
            setPendingCount(0);
            return;
        }
        try {
            setPendingCount(await countPendingPosSales(businessId));
        } catch {
            setPendingCount(0);
        }
    }, [businessId, enabled]);

    const syncPending = useCallback(async () => {
        if (!businessId || !enabled || isSyncing) return { synced: 0 };
        setIsSyncing(true);
        let synced = 0;
        try {
            const pending = await listPendingPosSales(businessId);
            for (const row of pending) {
                try {
                    const res = await posAPI.checkout(row.payload);
                    if (res?.success) {
                        await markPosSaleSynced(row.id);
                        synced += 1;
                    } else {
                        await incrementPosSaleAttempt(row.id, res?.error);
                    }
                } catch (err) {
                    await incrementPosSaleAttempt(row.id, err?.message);
                }
            }
            await refreshPending();
        } finally {
            setIsSyncing(false);
        }
        return { synced };
    }, [businessId, enabled, isSyncing, refreshPending]);

    const queueSale = useCallback(async (payload) => {
        if (!businessId) throw new Error('Business required');
        await enqueueOfflinePosSale({ businessId, payload });
        await refreshPending();
    }, [businessId, refreshPending]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const onOnline = () => setIsOnline(true);
        const onOffline = () => setIsOnline(false);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    useEffect(() => {
        refreshPending();
    }, [refreshPending]);

    useEffect(() => {
        if (!enabled || !isOnline || pendingCount <= 0 || isSyncing) return;
        syncPending();
    }, [enabled, isOnline, pendingCount, isSyncing, syncPending]);

    return {
        isOnline,
        pendingCount,
        isSyncing,
        queueSale,
        syncPending,
        refreshPending,
    };
}
