'use client';

import { useAuth } from '@/lib/context/AuthContext';
import { useBusiness } from '@/lib/context/BusinessContext';
import { useData } from '@/lib/context/DataContext';

/**
 * Single source of truth for Enterprise Hub readiness.
 * - hubReady: auth + business context resolved (shell can render)
 * - contentReady: hubReady + initial shell data bootstrap complete
 */
export function useHubReady() {
    const { loading: authLoading } = useAuth();
    const { isLoading: businessLoading, business, role, isPlatformOwner } = useBusiness();
    const { isShellReady, isDataLoaded, loadingModules } = useData();

    const hasRole = isPlatformOwner || role != null;
    const hubReady = !authLoading && !businessLoading && !!business?.id && hasRole;
    const contentReady = hubReady && isShellReady;

    return {
        authLoading,
        businessLoading,
        hubReady,
        contentReady,
        isFullDataLoaded: isDataLoaded,
        loadingModules,
    };
}
