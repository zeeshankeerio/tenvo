'use client';

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { getBusinessByUserId, getBusinessByDomainAndUser } from '@/lib/actions/basic/business';
import {
    getRegionalStandardsForBusiness,
    getBusinessRegionalPack,
} from '@/lib/utils/businessRegionalContext';
import { isPlatformOwner, TRIAL_CONFIG, getTrialDaysRemaining, isTrialActive } from '@/lib/config/platform';
import {
    readOptimisticBusinessShell,
    hasValidOptimisticShell,
    persistBusinessShell,
    clearBusinessShell,
    restoreCachedRoleForBusiness,
} from '@/lib/utils/businessClientCache';

const BusinessContext = createContext(undefined);

/** Max wait before unblocking the hub shell with cached context (stale-while-revalidate). */
const BUSINESS_SYNC_TIMEOUT_MS = 10_000;

/** Routes that need tenant business resolution — skip on marketing/storefront for faster loads. */
function pathNeedsBusinessSync(pathname) {
  if (!pathname) return false;
  return (
    pathname.startsWith('/business/') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/purchases') ||
    pathname === '/multi-business' ||
    pathname.startsWith('/pending-approval')
  );
}

/**
 * Apply cached shell into React state (client-only, post-mount).
 */
function applyOptimisticShell(setters, domainFromPath) {
    const shell = readOptimisticBusinessShell(domainFromPath);
    const { setBusiness, setRole, setRegionalStandards, setIsLoading } = setters;

    if (shell.business) {
        setBusiness((prev) => prev ?? shell.business);
        setRegionalStandards((prev) => prev ?? getRegionalStandardsForBusiness(shell.business));
    }
    if (shell.role) {
        setRole((prev) => prev ?? shell.role);
    }
    if (hasValidOptimisticShell(shell.business, shell.role, domainFromPath)) {
        setIsLoading(false);
    }

    return shell;
}

/**
 * Business Context Provider
 * Syncs Better Auth User with their Business record using Server Actions
 */
export function BusinessProvider({ children }) {
    const pathname = usePathname();
    const { data: sessionData, isPending } = authClient.useSession();
    const businessDomainFromPath = useMemo(() => {
        const pathParts = pathname.split('/');
        return pathParts[1] === 'business' ? pathParts[2] || null : null;
    }, [pathname]);

    const [business, setBusiness] = useState(null);
    const [role, setRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRevalidating, setIsRevalidating] = useState(false);
    const [regionalStandards, setRegionalStandards] = useState(null);

    // Optimistic shell from localStorage — UI-only; server re-validates on every action.
    useEffect(() => {
        applyOptimisticShell(
            { setBusiness, setRole, setRegionalStandards, setIsLoading },
            businessDomainFromPath
        );
    }, [businessDomainFromPath]);

    // Sync business record with logged in user (background revalidate when cache exists).
    useEffect(() => {
        let isActive = true;
        let timeoutId;

        if (!pathNeedsBusinessSync(pathname)) {
            if (!isPending) {
                setIsLoading(false);
                setIsRevalidating(false);
            }
            return () => {
                isActive = false;
            };
        }

        const syncBusiness = async () => {
            if (isPending) {
                return;
            }

            const cachedShell = readOptimisticBusinessShell(businessDomainFromPath);
            const shellBusiness = cachedShell.business;
            const shellRole = cachedShell.role;

            const domainMismatch =
                businessDomainFromPath &&
                shellBusiness?.domain &&
                shellBusiness.domain !== businessDomainFromPath;

            const optimisticShell = hasValidOptimisticShell(
                shellBusiness,
                shellRole,
                businessDomainFromPath
            );

            if (isActive) {
                if (optimisticShell && !domainMismatch) {
                    setIsRevalidating(true);
                    setIsLoading(false);
                    if (cachedShell.business) {
                        setBusiness((prev) => prev ?? cachedShell.business);
                        setRegionalStandards((prev) =>
                            prev ?? getRegionalStandardsForBusiness(cachedShell.business)
                        );
                    }
                    if (cachedShell.role) {
                        setRole((prev) => prev ?? cachedShell.role);
                    }
                } else if (!shellBusiness || domainMismatch) {
                    setIsLoading(true);
                    setIsRevalidating(false);
                }
            }

            timeoutId = setTimeout(() => {
                if (!isActive) return;
                if (process.env.NODE_ENV !== 'production') {
                    console.warn('[BusinessContext] Business sync timed out — using cached shell');
                }
                setIsLoading(false);
                setIsRevalidating(false);
            }, BUSINESS_SYNC_TIMEOUT_MS);

            try {
                const user = sessionData?.user;

                if (user) {
                    const domainFromUrl = businessDomainFromPath;

                    let result;
                    let domainAuthFailed = false;

                    if (domainFromUrl) {
                        result = await getBusinessByDomainAndUser(domainFromUrl);
                        if (!result?.success) {
                            console.warn(
                                `[BusinessContext] Not authorized for domain '${domainFromUrl}' or it doesn't exist. Falling back to default.`
                            );
                            domainAuthFailed = true;
                        }
                    }

                    if (!result || !result.success) {
                        result = await getBusinessByUserId();
                    }

                    if (!isActive) return;

                    if (result?.success && result.business) {
                        const biz = result.business;

                        // CRITICAL: Check approval status before loading business into context
                        if (pathname.startsWith('/business/')) {
                            const approvalStatus = biz.approval_status;
                            const needsApproval = 
                                approvalStatus === 'pending_approval' || 
                                approvalStatus === 'info_requested' ||
                                approvalStatus === 'rejected';
                            
                            if (needsApproval && typeof window !== 'undefined') {
                                console.warn('[BusinessContext] Business not approved - redirecting to pending-approval');
                                clearBusinessShell();
                                window.location.href = '/pending-approval';
                                return;
                            }
                        }

                        if (domainAuthFailed && typeof window !== 'undefined') {
                            window.history.replaceState(null, '', `/business/${biz.domain}`);
                        }

                        setBusiness(biz);
                        setRegionalStandards(getRegionalStandardsForBusiness(biz));

                        const userRole = biz.user_role || 'salesperson';
                        setRole(userRole);
                        persistBusinessShell(biz, userRole);
                    } else {
                        setBusiness(null);
                        setRole(null);
                        clearBusinessShell();
                    }
                } else {
                    setBusiness(null);
                    setRole(null);
                    clearBusinessShell();
                }
            } catch (error) {
                console.error('Business sync error:', error);
                if (!isActive) return;

                const cachedRole = restoreCachedRoleForBusiness(shellBusiness);
                if (shellBusiness?.id && cachedRole) {
                    setRole((prev) => prev ?? cachedRole);
                    setBusiness((prev) => prev ?? shellBusiness);
                    setRegionalStandards((prev) =>
                        prev ?? getRegionalStandardsForBusiness(shellBusiness)
                    );
                } else if (!sessionData?.user) {
                    setBusiness(null);
                    setRole(null);
                    clearBusinessShell();
                }
            } finally {
                clearTimeout(timeoutId);
                if (isActive) {
                    setIsLoading(false);
                    setIsRevalidating(false);
                }
            }
        };

        syncBusiness();

        return () => {
            isActive = false;
            clearTimeout(timeoutId);
        };
    }, [sessionData?.user?.id, isPending, businessDomainFromPath, pathname]);

    const getSetting = (path, defaultValue) => {
        if (!business?.settings) return defaultValue;

        const keys = path.split('.');
        let current = business.settings;

        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }

        return current;
    };

    const regionalPack = business
        ? getBusinessRegionalPack(business)
        : regionalStandards
            ? {
                currency: regionalStandards.currency,
                currencySymbol: regionalStandards.currencySymbol,
                taxLabel: regionalStandards.taxLabel,
                taxIdLabel: regionalStandards.taxIdLabel,
                defaultTaxRate: regionalStandards.defaultTaxRate,
                locale: regionalStandards.locale,
                countryIso: regionalStandards.countryCode,
            }
            : null;

    const currency = regionalPack?.currency || 'PKR';
    const currencySymbol = regionalPack?.currencySymbol || '₨';

    const isPlatformOwnerUser = sessionData?.user ? isPlatformOwner(sessionData.user) : false;
    const isPlatformLevelUser = sessionData?.user
        ? (isPlatformOwnerUser || sessionData.user.role === 'admin')
        : false;

    const updateBusiness = (data) => {
        setBusiness(prev => {
            const updated = { ...prev, ...data };
            try {
                localStorage.setItem('businessData', JSON.stringify(updated));
            } catch {
                // localStorage may be unavailable (private browsing quota exceeded)
            }
            return updated;
        });
    };

    const clearBusiness = () => {
        setBusiness(null);
        setRole(null);
        clearBusinessShell();
    };

    const switchBusinessByDomain = async (domain) => {
        const user = sessionData?.user;
        if (!user || !domain) return { success: false, error: 'Missing business context' };

        setIsLoading(true);
        try {
            const result = await getBusinessByDomainAndUser(domain);
            if (result.success && result.business) {
                const biz = result.business;
                setBusiness(biz);
                setRegionalStandards(getRegionalStandardsForBusiness(biz));
                const userRole = biz.user_role || 'salesperson';
                setRole(userRole);
                persistBusinessShell(biz, userRole);
                return { success: true, business: biz };
            }
            const fallbackMessage = result.code === 'BUSINESS_ACCESS_DENIED'
                ? 'You do not have access to this business'
                : 'Unable to switch business';
            return { success: false, error: result.error || fallbackMessage };
        } catch (error) {
            console.error('Switch business error:', error);
            return { success: false, error: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    const planTier = business?.plan_tier || 'free';
    const effectivePlanTier = isPlatformOwnerUser ? 'enterprise' : planTier;
    const effectiveRole = isPlatformOwnerUser ? 'owner' : role;

    const planExpiresAt = business?.plan_expires_at || null;
    const trialActive = planExpiresAt ? isTrialActive(planExpiresAt) : false;
    const trialDaysRemaining = planExpiresAt ? getTrialDaysRemaining(planExpiresAt) : 0;
    const isOnTrial = trialActive
      && !isPlatformOwnerUser
      && (planTier === TRIAL_CONFIG.trialPlanTier || planTier === 'starter')
      && business?.stripe_subscription_status !== 'manual_payment_active'
      && business?.stripe_subscription_status !== 'manual_dev';

    const value = {
        business,
        role: effectiveRole,
        planTier: effectivePlanTier,
        rawRole: role,
        rawPlanTier: planTier,
        isPlatformOwner: isPlatformOwnerUser,
        isPlatformAdmin: isPlatformLevelUser,
        isOnTrial,
        trialDaysRemaining,
        trialActive,
        planExpiresAt,
        updateBusiness,
        clearBusiness,
        getSetting,
        isLoading,
        isRevalidating,
        currency,
        currencySymbol,
        regionalStandards,
        regionalPack,
        switchBusinessByDomain
    };

    return (
        <BusinessContext.Provider value={value}>
            {children}
        </BusinessContext.Provider>
    );
}

export function useBusiness() {
    const context = useContext(BusinessContext);
    if (context === undefined) {
        throw new Error('useBusiness must be used within a BusinessProvider');
    }
    return context;
}
