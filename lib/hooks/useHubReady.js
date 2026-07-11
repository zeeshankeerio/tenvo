'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useBusiness } from '@/lib/context/BusinessContext';
import { useData } from '@/lib/context/DataContext';
import {
    hasValidOptimisticShell,
    readOptimisticBusinessShell,
    shellMatchesDomain,
} from '@/lib/utils/businessClientCache';

function resolveBusinessDomainFromPath(pathname) {
    const parts = (pathname || '').split('/');
    return parts[1] === 'business' ? parts[2] || null : null;
}

/**
 * Single source of truth for Enterprise Hub readiness.
 * - hubReady: auth + business context resolved (server-validated)
 * - navReady: hubReady OR valid optimistic/live shell (instant sidebar)
 * - contentReady: hubReady + initial shell data bootstrap complete
 * - workspaceBlocking: block main workspace only when no tenant context at all
 *
 * Progressive paint: once a tenant shell exists (cache or live), chrome + tabs
 * render immediately; widgets use their own skeletons for metrics.
 */
export function useHubReady() {
    const pathname = usePathname();
    const { loading: authLoading, serverHydrated, user: authUser } = useAuth();
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

    const cachedOptimisticShell = useMemo(() => {
        if (!clientReady) return { business: null, role: null };
        return readOptimisticBusinessShell(domainFromPath);
    }, [clientReady, domainFromPath]);

    const hasCachedOptimisticShell = clientReady && hasValidOptimisticShell(
        cachedOptimisticShell.business,
        cachedOptimisticShell.role,
        domainFromPath
    );

    const hasRole = isPlatformOwner || role != null;
    // Live React state after persist — does not depend on localStorage memo freshness.
    const hasLiveShell =
        Boolean(business?.id) &&
        hasRole &&
        shellMatchesDomain(business, domainFromPath);

    const hasOptimisticShell = hasCachedOptimisticShell || hasLiveShell;
    const optimisticShell = hasLiveShell
        ? { business, role: role ?? (isPlatformOwner ? 'owner' : null) }
        : cachedOptimisticShell;

    // Hub server hydrate (or any known user) must not block chrome on client session pending.
    const authBlocking = authLoading && !serverHydrated && !authUser;

    // Background revalidation (stale-while-revalidate) must not block the shell.
    const businessSettled = !businessLoading || isRevalidating;
    const hubReady = !authBlocking && businessSettled && !!business?.id && hasRole;

    const navReady =
        hubReady ||
        hasLiveShell ||
        (hasCachedOptimisticShell &&
            !!cachedOptimisticShell.business?.id &&
            !!cachedOptimisticShell.role);

    const hasWorkspaceContext = Boolean(business?.id) || hasCachedOptimisticShell;
    // Block only when there is nothing to paint: no live tenant and no matching cache.
    const workspaceBlocking =
        !hasWorkspaceContext && (authBlocking || (businessLoading && !isRevalidating));

    const contentReady = hubReady && isShellReady;

    return {
        authLoading: authBlocking,
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
