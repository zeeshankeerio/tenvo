'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useBusiness } from '@/lib/context/BusinessContext';
import { useData } from '@/lib/context/DataContext';
import {
    hasValidOptimisticShell,
    readOptimisticBusinessShell,
} from '@/lib/utils/businessClientCache';

function resolveBusinessDomainFromPath(pathname) {
    const parts = (pathname || '').split('/');
    return parts[1] === 'business' ? parts[2] || null : null;
}

/**
 * Single source of truth for Enterprise Hub readiness.
 * - hubReady: auth + business context resolved (server-validated)
 * - navReady: hubReady OR valid optimistic localStorage shell (instant sidebar)
 * - contentReady: hubReady + initial shell data bootstrap complete
 * - workspaceBlocking: block main workspace only when no tenant context at all
 */
export function useHubReady() {
    const pathname = usePathname();
    const { loading: authLoading } = useAuth();
    const {
        isLoading: businessLoading,
        isRevalidating,
        business,
        role,
        isPlatformOwner,
    } = useBusiness();
    const { isShellReady, isDataLoaded, loadingModules } = useData();

    const [clientReady, setClientReady] = useState(false);
    useEffect(() => {
        setClientReady(true);
    }, []);

    const domainFromPath = resolveBusinessDomainFromPath(pathname);

    const optimisticShell = useMemo(() => {
        if (!clientReady) return { business: null, role: null };
        return readOptimisticBusinessShell(domainFromPath);
    }, [clientReady, domainFromPath]);

    const hasOptimisticShell = clientReady && hasValidOptimisticShell(
        optimisticShell.business,
        optimisticShell.role,
        domainFromPath
    );

    const hasRole = isPlatformOwner || role != null;
    // Background revalidation (stale-while-revalidate) must not block the shell.
    const businessSettled = !businessLoading || isRevalidating;
    const hubReady = !authLoading && businessSettled && !!business?.id && hasRole;

    const navReady =
        hubReady ||
        (hasOptimisticShell && !!optimisticShell.business?.id && !!optimisticShell.role);

    const hasWorkspaceContext = Boolean(business?.id) || hasOptimisticShell;
    const workspaceBlocking = authLoading && !hasWorkspaceContext;

    const contentReady = hubReady && isShellReady;

    return {
        authLoading,
        businessLoading,
        hubReady,
        navReady,
        hasOptimisticShell,
        workspaceBlocking,
        contentReady,
        isFullDataLoaded: isDataLoaded,
        loadingModules,
        isRevalidating,
        optimisticShell,
    };
}
