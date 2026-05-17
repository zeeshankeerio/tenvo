'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { getBusinessByUserId, getBusinessByDomainAndUser } from '@/lib/actions/basic/business';
import { getRegionalStandards } from '@/lib/utils/regionalHelpers';
import { PLATFORM_OWNER_EMAIL, TRIAL_CONFIG, getTrialDaysRemaining, isTrialActive } from '@/lib/config/platform';

const BusinessContext = createContext(undefined);

/**
 * Business Context Provider
 * Syncs Better Auth User with their Business record using Server Actions
 */
export function BusinessProvider({ children }) {
    const pathname = usePathname();
    const { data: sessionData, isPending } = authClient.useSession();
    const [business, setBusiness] = useState(null);
    const [role, setRole] = useState(null); // Default to null to prevent layout shifts
    const [isLoading, setIsLoading] = useState(true);
    const [regionalStandards, setRegionalStandards] = useState(null);

    // Optimistic Load from LocalStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedRole = localStorage.getItem('userRole');
            if (storedRole) setRole(storedRole);

            const storedBiz = localStorage.getItem('businessData');
            if (storedBiz) {
                try {
                    const parsedBiz = JSON.parse(storedBiz);
                    setBusiness(parsedBiz);
                    setRegionalStandards(getRegionalStandards(parsedBiz.city || parsedBiz.country || 'Pakistan'));
                } catch {
                    console.error('Failed to parse cached business data');
                }
            }
        }
    }, []);

    // Sync business record with logged in user
    useEffect(() => {
        let isActive = true;

        const syncBusiness = async () => {
            // Wait for session to load
            if (isPending) return;

            if (isActive) setIsLoading(true);
            try {
                const user = sessionData?.user;

                if (user) {
                    // 1. Check if URL specifies a business domain: /business/[domain]
                    const pathParts = pathname.split('/');
                    const domainFromUrl = pathParts[1] === 'business' ? pathParts[2] : null;

                    let result;
                    let domainAuthFailed = false;

                    if (domainFromUrl) {
                        // Use the specific business from URL if authorized
                        result = await getBusinessByDomainAndUser(domainFromUrl);
                        if (!result?.success) {
                            console.warn(`[BusinessContext] Not authorized for domain '${domainFromUrl}' or it doesn't exist. Falling back to default.`);
                            domainAuthFailed = true;
                        }
                    }

                    // 2. Fallback to latest business ONLY if no domain in URL or fetch failed
                    if (!result || !result.success) {
                        result = await getBusinessByUserId();

                        // Let's also update the URL if we fell back, to avoid loops where 
                        // the URL says '/business/bakery-confectionery' but the business is 'my-bakery'.
                        // However, we wait until we actually establish the business context successfully below.
                    }

                    if (result?.success && result.business) {
                        const biz = result.business;
                        if (!isActive) return;

                        if (domainAuthFailed && typeof window !== 'undefined') {
                            // If we hit an access denied on the domain from URL but found a fallback business,
                            // silently correct the URL to reflect the actual business we are accessing.
                            window.history.replaceState(null, '', `/business/${biz.domain}`);
                        }

                        setBusiness(biz);
                        setRegionalStandards(getRegionalStandards(biz.city || biz.country || 'Pakistan'));

                        // Critical: Prioritize the 'user_role' returned by the fetch (from business_users table)
                        const userRole = biz.user_role || 'salesperson';
                        setRole(userRole);

                        localStorage.setItem('lastBusinessDomain', biz.domain);
                        localStorage.setItem('userRole', userRole);
                    } else {
                        if (!isActive) return;
                        setBusiness(null);
                        setRole(null); // Clear role if no business found
                    }
                } else {
                    // Not logged in - clear it
                    if (!isActive) return;
                    setBusiness(null);
                    setRole(null);
                    localStorage.removeItem('userRole');
                }
            } catch (error) {
                console.error('Business sync error:', error);
            } finally {
                if (isActive) setIsLoading(false);
            }
        };

        syncBusiness();

        return () => {
            isActive = false;
        };
    }, [sessionData, isPending, pathname]);

    // Helper to get settings safely
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

    // Helper to get currency from settings or regional defaults
    const getCurrency = () => {
        if (!business) return regionalStandards?.currency || 'PKR';
        return getSetting('financials.currency', regionalStandards?.currency || 'PKR');
    };

    const currency = getCurrency();
    const currencySymbol = getSetting('financials.currencySymbol', regionalStandards?.currencySymbol || '₨');

    const updateBusiness = (data) => {
        setBusiness(prev => {
            const updated = { ...prev, ...data };
            localStorage.setItem('businessData', JSON.stringify(updated));
            return updated;
        });
    };

    const clearBusiness = () => {
        setBusiness(null);
        setRole(null);
        localStorage.removeItem('businessData');
        localStorage.removeItem('userRole');
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
                const userRole = biz.user_role || 'salesperson';
                setRole(userRole);

                localStorage.setItem('businessData', JSON.stringify(biz));
                localStorage.setItem('userRole', userRole);
                return { success: true };
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

    // --- Platform Owner Detection ----------------------------------------
    const userEmail = sessionData?.user?.email;
    const isPlatformOwnerUser = userEmail
        ? userEmail.toLowerCase() === PLATFORM_OWNER_EMAIL.toLowerCase()
        : false;

    // Platform owner always gets enterprise-level access
    const effectivePlanTier = isPlatformOwnerUser ? 'enterprise' : planTier;
    const effectiveRole = isPlatformOwnerUser ? 'owner' : role;

    // --- Trial Detection -------------------------------------------------
    const planExpiresAt = business?.plan_expires_at || null;
    const trialActive = planExpiresAt ? isTrialActive(planExpiresAt) : false;
    const trialDaysRemaining = planExpiresAt ? getTrialDaysRemaining(planExpiresAt) : 0;
    const isOnTrial = trialActive && !isPlatformOwnerUser && planTier !== 'free';

    const value = {
        business,
        role: effectiveRole,
        planTier: effectivePlanTier,
        // Raw values (before platform override)
        rawRole: role,
        rawPlanTier: planTier,
        // Platform owner
        isPlatformOwner: isPlatformOwnerUser,
        // Trial info
        isOnTrial,
        trialDaysRemaining,
        trialActive,
        planExpiresAt,
        // Business ops
        updateBusiness,
        clearBusiness,
        getSetting,
        isLoading,
        currency,
        currencySymbol,
        regionalStandards,
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
