'use server';

import { prismaBase } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { actionSuccess, actionFailure, getErrorMessage } from '@/lib/actions/_shared/result';
import { PLAN_TIERS, resolvePlanTier, PLAN_ORDER } from '@/lib/config/plans';
import { checkPlanLimit } from '@/lib/auth/planGuard';
import { domainKnowledge } from '@/lib/domainKnowledge';
import { getRegionalStandards } from '@/lib/utils/regionalHelpers';
import { ALL_ROLES } from '@/lib/rbac/permissions';
import { isPlatformOwner, TRIAL_CONFIG, getTrialExpiryDate, isPlatformLevel } from '@/lib/config/platform';
import { isStripeBillingMode } from '@/lib/config/billingMode';
import { loadPlatformFeatureOverridesForBusiness } from '@/lib/subscription/platformFeatureOverrides';
import { withGuard } from '@/lib/rbac/serverGuard';
import { getServerSession } from '@/lib/auth/rbac';
import { mergePackagingIntoBusinessSettings } from '@/lib/utils/businessPackagingSettings';
import {
  buildRegistrationSettingsSnapshot,
  buildRegistrationFinancialsSnapshot,
  buildRegistrationDomainProfile,
} from '@/lib/utils/registrationSeed';
import { enrichBusinessForClient } from '@/lib/utils/businessRegionalContext';
import { provisionRegistrationSeed } from '@/lib/services/RegistrationSeedService';
import { resolveRegistrationStorefrontDefaults } from '@/lib/onboarding/registrationStorefrontDefaults';
import { StorefrontSyncService } from '@/lib/services/StorefrontSyncService';
import { getDefaultCoaForCountry } from '@/lib/config/regionalCoa';
import {
  getRegistrationSeedState,
  markRegistrationInventorySeeded,
} from '@/lib/utils/registrationInventoryState';
import {
  getBusinessSampleDataState,
  markBusinessSampleDataLoaded,
  clearBusinessSampleDataState,
} from '@/lib/utils/businessSampleDataState';
import { isValidStoreHandleUsername } from '@/lib/auth/store-handle-validator';
import { buildRegistrationFromDomainPackage } from '@/lib/config/domainPackages';
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { isMembershipRelevant } from '@/lib/config/domains';
import { MembershipService } from '@/lib/services/MembershipService';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { getRegistrationApprovalNotifyEmails } from '@/lib/config/platform';

const ASSIGNABLE_ROLES = new Set(ALL_ROLES.filter(role => role !== 'owner'));

function resolveRegistrationCategoryKey(rawCategory) {
    if (!rawCategory) return null;
    const trimmed = String(rawCategory).trim();
    const canonical = resolveDomainKey(trimmed);
    if (domainKnowledge[canonical]) return canonical;
    if (domainKnowledge[trimmed]) return trimmed;
    return null;
}

function resolveBusinessDomainPackageKey(business) {
    const fromRequest = business?.registration_requests?.[0]?.domain_package_key;
    if (typeof fromRequest === 'string' && fromRequest.trim()) {
        return fromRequest.trim();
    }
    const settings = business?.settings;
    const fromSettings =
        settings && typeof settings === 'object' && !Array.isArray(settings)
            ? settings.domain_package?.key
            : null;
    if (typeof fromSettings === 'string' && fromSettings.trim()) {
        return fromSettings.trim();
    }
    return null;
}

function normalizePlanTier(planTier) {
    if (!planTier) return 'free';
    const normalized = String(planTier).trim().toLowerCase();
    return resolvePlanTier(normalized);
}

// Helper
async function checkAuth(businessId, permission = 'sales.view', client = null) {
    const { session } = await withGuard(businessId, {
        permission,
        client,
    });
    return session;
}

async function resolveSessionUserId(requestedUserId = null) {
    const session = await getServerSession();
    if (!session) throw new Error('Unauthorized');
    if (requestedUserId && requestedUserId !== session.user.id) {
        throw new Error('Unauthorized: User context mismatch');
    }
    return session.user.id;
}

/**
 * Checks if a domain handle is available for use
 */
export async function checkDomainAvailabilityAction(domain) {
    const normalized = String(domain || '').trim().toLowerCase();
    if (!normalized || normalized.length < 3) {
        return await actionFailure('VALIDATION_ERROR', 'Domain must be at least 3 characters');
    }

    if (!isValidStoreHandleUsername(normalized)) {
        return await actionSuccess({
            available: false,
            message: 'Reserved or invalid handle',
        });
    }

    try {
        const [existingBusiness, existingUsername] = await Promise.all([
            prismaBase.businesses.findFirst({
                where: { domain: normalized },
                select: { id: true },
            }),
            prismaBase.user.findFirst({
                where: { username: normalized },
                select: { id: true },
            }),
        ]);

        const taken = Boolean(existingBusiness || existingUsername);
        return await actionSuccess({
            available: !taken,
            message: !taken ? 'Available' : 'Taken',
        });
    } catch (error) {
        console.error('Check Domain Availability Error:', error);
        return await actionFailure('DOMAIN_CHECK_FAILED', await getErrorMessage(error));
    }
}

export async function createBusiness(data) {
    const {
        businessName,
        email,
        phone,
        country,
        domain,
        category,
        planTier,
        domainPackageKey,
        currency: currencyOverride,
        ntn,
        description,
    } = data;

    const userId = await resolveSessionUserId(data?.userId || null);
    const normalizedCategory = String(category || '').trim();
    const normalizedDomain = String(domain || '').trim().toLowerCase();
    const normalizedPlanTier = normalizePlanTier(planTier);

    const domainPkgRegistration = buildRegistrationFromDomainPackage(
        typeof domainPackageKey === 'string' ? domainPackageKey : '',
        {
            planTier: normalizedPlanTier,
            verticalKey: resolveDomainKey(normalizedCategory) || normalizedCategory || undefined,
        }
    );
    const registrationCategoryRaw =
        domainPkgRegistration.package &&
        domainPkgRegistration.category &&
        domainKnowledge[domainPkgRegistration.category]
            ? domainPkgRegistration.category
            : normalizedCategory;

    const registrationCategory = resolveRegistrationCategoryKey(registrationCategoryRaw);

    if (!registrationCategory) {
        return await actionFailure('INVALID_DOMAIN_CATEGORY', 'Selected business domain is not supported');
    }

    if (!normalizedDomain || normalizedDomain.length < 3) {
        return await actionFailure('INVALID_DOMAIN_HANDLE', 'Domain handle must be at least 3 characters');
    }

    if (!isValidStoreHandleUsername(normalizedDomain)) {
        return await actionFailure(
            'INVALID_DOMAIN_HANDLE',
            'Store handle is reserved or invalid. Use letters, numbers, and hyphens (3-63 characters).'
        );
    }

    // --- Platform Owner & Trial Detection --------------------------------
    const ownerIsplatform = isPlatformOwner(email);
    let effectivePlanTier = normalizedPlanTier;
    let planExpiresAt = null;

    if (ownerIsplatform) {
        effectivePlanTier = 'enterprise';
        planExpiresAt = null;
    } else if (normalizedPlanTier === 'free') {
        effectivePlanTier = TRIAL_CONFIG.trialPlanTier;
        planExpiresAt = getTrialExpiryDate();
    }

    const effectivePlan = PLAN_TIERS[effectivePlanTier] || PLAN_TIERS.free;

    const effectiveLimits =
        domainPkgRegistration.package && domainPkgRegistration.limits
            ? domainPkgRegistration.limits
            : effectivePlan.limits;

    const regional = getRegionalStandards(country);
    const registrationSnapshot = buildRegistrationSettingsSnapshot(country, regional, {
        domainVertical: registrationCategory,
    });
    const financialsSnapshot = buildRegistrationFinancialsSnapshot(regional);
    const domainProfile = buildRegistrationDomainProfile({
        domainKey: registrationCategory,
        countryIso: regional.countryCode,
    });
    const resolvedCurrency =
        (typeof currencyOverride === 'string' && currencyOverride.trim()) || regional.currency;
    const resolvedTimezone = regional.timeZone;
    const trimmedNtn = typeof ntn === 'string' ? ntn.trim() : '';
    const trimmedDescription =
        typeof description === 'string' && description.trim().length > 0
            ? description.trim().slice(0, 500)
            : null;

    try {
        const result = await prismaBase.$transaction(async (tx) => {
            // 0. Domain Uniqueness Guard
            const domainCheck = await tx.businesses.findFirst({
                where: { domain: normalizedDomain },
                select: { id: true }
            });
            if (domainCheck) {
                throw new Error(`Domain Handle "${normalizedDomain}" is already taken. Please choose a different unique identifier.`);
            }

            const usernameCheck = await tx.user.findFirst({
                where: { username: normalizedDomain },
                select: { id: true },
            });
            if (usernameCheck && usernameCheck.id !== userId) {
                throw new Error(`Domain Handle "${normalizedDomain}" is already taken. Please choose a different unique identifier.`);
            }

            // 0.1 Duplicate Entity Prevention
            const duplicateCheck = await tx.businesses.findFirst({
                where: {
                    user_id: userId,
                    business_name: { equals: businessName, mode: 'insensitive' }
                },
                select: { id: true }
            });

            if (duplicateCheck) {
                throw new Error(`You already have a business named "${businessName}". Please choose a different name or manage your existing entity.`);
            }

            const registrationStorefront = resolveRegistrationStorefrontDefaults({
                domainKey: registrationCategory,
                businessName,
                regional: {
                    countryName: regional.countryName,
                    countryCode: regional.countryCode,
                    currency: resolvedCurrency,
                    locale: regional.locale,
                },
                trimmedDescription,
                domainPackageKey: typeof domainPackageKey === 'string' ? domainPackageKey : null,
            });
            const { storefrontExtras } = registrationStorefront;

            // 1. Insert Business
            const biz = await tx.businesses.create({
                data: {
                    user_id: userId,
                    business_name: businessName,
                    email,
                    phone: phone != null && String(phone).trim() ? String(phone).trim() : null,
                    country: regional.countryName,
                    domain: normalizedDomain,
                    category: registrationCategory,
                    plan_tier: effectivePlanTier,
                    plan_seats: effectiveLimits.max_users,
                    max_products: effectiveLimits.max_products,
                    max_warehouses: effectiveLimits.max_warehouses,
                    plan_expires_at: planExpiresAt,
                    currency: resolvedCurrency,
                    timezone: resolvedTimezone,
                    ntn: trimmedNtn || null,
                    description: registrationStorefront.businessDescription,
                    ...registrationStorefront.businessMedia,
                    settings: {
                        registration: registrationSnapshot,
                        financials: financialsSnapshot,
                        domain: domainProfile.domainSnapshot,
                        intelligence: domainProfile.intelligence,
                        automation: domainProfile.automation,
                        domain_defaults: domainProfile.domainDefaults,
                        ...(domainPkgRegistration.settingsPatch || {}),
                    },
                }
            });

            const registrationPhone =
                phone != null && String(phone).trim() ? String(phone).trim() : null;

            // 1b. Default storefront settings (public catalog + branding)
            await tx.business_settings.create({
                data: {
                    business_id: biz.id,
                    is_storefront_enabled: true,
                    settings: {
                        storefront: {
                            enabled: true,
                            heroTitle: businessName,
                            heroSubtitle: registrationStorefront.heroSubtitle,
                            publicRegion: regional.countryName,
                            currency: resolvedCurrency,
                            locale: regional.locale,
                            countryIso: regional.countryCode,
                            ...(storefrontExtras.storefront || {}),
                        },
                        announcement: storefrontExtras.announcement,
                        brand: storefrontExtras.brand,
                        ...(storefrontExtras.freeShippingThreshold != null
                            ? { freeShippingThreshold: storefrontExtras.freeShippingThreshold }
                            : {}),
                        ...(storefrontExtras.returnPolicyDays != null
                            ? { returnPolicyDays: storefrontExtras.returnPolicyDays }
                            : {}),
                        ...(storefrontExtras.businessHours
                            ? { businessHours: storefrontExtras.businessHours }
                            : {}),
                        contact: {
                            country: regional.countryName,
                            ...(registrationPhone
                                ? { phone: registrationPhone, published: true }
                                : { published: false }),
                        },
                        registration: registrationSnapshot,
                        financials: financialsSnapshot,
                        domain: domainProfile.domainSnapshot,
                        intelligence: domainProfile.intelligence,
                        automation: domainProfile.automation,
                        domain_defaults: domainProfile.domainDefaults,
                    },
                },
            });

            // 1c. Storefront checkout defaults (COD + currency per tenant)
            await tx.store_payment_settings.create({
                data: {
                    business_id: biz.id,
                    allow_cod: true,
                    allow_prepaid: true,
                    default_currency: resolvedCurrency,
                    ...(registrationStorefront.paymentCodInstructions
                        ? { cod_instructions: registrationStorefront.paymentCodInstructions }
                        : {}),
                },
            });

            // 2. Insert Business User (Owner)
            await tx.business_users.create({
                data: {
                    business_id: biz.id,
                    user_id: userId,
                    role: 'owner',
                    status: 'active'
                }
            });

            // 3. Seed Chart of Accounts (country-aware tax labels, shared GL codes)
            const coaTemplate = getDefaultCoaForCountry(regional.countryCode);
            const coaData = coaTemplate.map(acc => ({
                business_id: biz.id,
                code: acc.code,
                name: acc.name,
                type: acc.type,
                is_system: true,
                is_active: true
            }));
            
            await tx.gl_accounts.createMany({
                data: coaData
            });

            // 4. Registration Approval Logic (Zoho/Busy-style workflow)
            // Platform owners get auto-approved, others wait for approval
            const approvalStatus = ownerIsplatform ? 'auto_approved' : 'pending_approval';
            const now = new Date();

            await tx.businesses.update({
                where: { id: biz.id },
                data: {
                    approval_status: approvalStatus,
                    approval_requested_at: now,
                    ...(ownerIsplatform ? {
                        approval_decided_at: now,
                        approval_decided_by: userId,
                        approval_notes: 'Auto-approved - Platform owner',
                    } : {}),
                },
            });

            // 5. Create registration request audit trail
            await tx.registration_requests.create({
                data: {
                    business_id: biz.id,
                    user_id: userId,
                    user_email: email,
                    user_name: businessName,
                    business_name: businessName,
                    domain: normalizedDomain,
                    category: registrationCategory,
                    country: regional.countryName,
                    phone: phone != null && String(phone).trim() ? String(phone).trim() : null,
                    plan_tier: effectivePlanTier,
                    domain_package_key: typeof domainPackageKey === 'string' ? domainPackageKey : null,
                    status: ownerIsplatform ? 'auto_approved' : 'pending',
                    ...(ownerIsplatform ? {
                        status_updated_at: now,
                        decided_by: userId,
                        decided_at: now,
                        decision_notes: 'Auto-approved - Platform owner',
                    } : {}),
                },
            });

            return biz;
        });

        let seedSummary = { productCount: 0, categoryCount: 0 };
        try {
            seedSummary = await provisionRegistrationSeed({
                businessId: result.id,
                domainKey: registrationCategory,
                countryIso: regional.countryCode,
                domainPackageKey: typeof domainPackageKey === 'string' ? domainPackageKey : null,
            });
            if (seedSummary.categoryCount > 0 || seedSummary.productCount > 0) {
                await markRegistrationInventorySeeded(result.id, seedSummary);
            }
        } catch (seedErr) {
            console.error('[createBusiness] registration seed failed:', seedErr);
        }

        if (isMembershipRelevant(registrationCategory)) {
            try {
                await MembershipService.syncPlansFromInventory(result.id, registrationCategory);
            } catch (membershipPlanErr) {
                if (membershipPlanErr?.code !== '42P01') {
                    console.warn('[createBusiness] membership plan sync skipped:', membershipPlanErr?.message);
                }
            }
        }

        // Send notification to platform owners for pending registrations (non-blocking)
        if (!ownerIsplatform) {
            try {
                const registrantEmail = String(email || '').trim().toLowerCase();
                const platformOwnerEmails = getRegistrationApprovalNotifyEmails().filter(
                    (ownerEmail) => ownerEmail !== registrantEmail
                );

                const approvalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.tenvo.app'}/admin/registrations`;

                for (const ownerEmail of platformOwnerEmails) {
                    await sendTransactionalEmail({
                        to: ownerEmail,
                        subject: `Action needed: ${businessName} is awaiting access`,
                        html: `
                          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #7c2d47;">🔔 New Registration Request</h2>

                            <p>A new business has registered and is waiting for you to <strong>grant access</strong> or <strong>schedule a demo</strong> before they can use their dashboard.</p>

                            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                              <p style="margin: 0 0 8px 0;"><strong>Business Name:</strong> ${businessName}</p>
                              <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
                              <p style="margin: 0 0 8px 0;"><strong>Category:</strong> ${registrationCategory}</p>
                              <p style="margin: 0 0 8px 0;"><strong>Country:</strong> ${regional.countryName}</p>
                              <p style="margin: 0 0 8px 0;"><strong>Plan:</strong> ${effectivePlanTier}</p>
                              <p style="margin: 0;"><strong>Workspace:</strong> ${normalizedDomain}</p>
                            </div>

                            <p style="margin: 0 0 12px 0; font-weight: 600; color: #374151;">Choose how to proceed:</p>
                            <ul style="margin: 0 0 20px 0; padding-left: 18px; color: #374151;">
                              <li style="margin-bottom: 6px;"><strong>Grant access</strong> — approve the workspace so they can log in right away.</li>
                              <li style="margin-bottom: 6px;"><strong>Book a demo / meeting</strong> — reach out and qualify them before approving.</li>
                              <li><strong>Request more info</strong> — ask for details while they stay in review.</li>
                            </ul>

                            <div style="margin: 24px 0;">
                              <a href="${approvalUrl}" style="background: #7c2d47; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                                Review &amp; grant access →
                              </a>
                            </div>

                            <p style="color: #6b7280; font-size: 14px;">
                              This business stays in a pending state and cannot access their dashboard until you approve it.
                            </p>
                          </div>
                        `,
                    });
                }
            } catch (notifError) {
                console.error('[createBusiness] Platform owner notification failed (non-blocking):', notifError);
            }
        }

        try {
            await StorefrontSyncService.initializeStorefront(result.id, normalizedDomain);
        } catch (storefrontErr) {
            console.error('[createBusiness] storefront init failed:', storefrontErr);
        }

        const approvalStatus = ownerIsplatform ? 'auto_approved' : 'pending_approval';

        return await actionSuccess({
            businessId: result.id,
            domain: normalizedDomain,
            planTier: effectivePlanTier,
            isTrialActive: !!planExpiresAt,
            trialExpiresAt: planExpiresAt ? planExpiresAt.toISOString() : null,
            countryIso: regional.countryCode,
            approvalStatus,
            requiresApproval: !ownerIsplatform,
            seeded: seedSummary.categoryCount > 0 || seedSummary.productCount > 0,
            seedSummary,
        });
    } catch (error) {
        console.error('Error in createBusiness:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
            return await actionFailure(
                'DATABASE_SCHEMA_OUT_OF_DATE',
                'The database is missing columns required by this app version (for example SaaS billing fields). Run: bunx prisma migrate deploy'
            );
        }
        const msg = await getErrorMessage(error);
        if (msg.includes('does not exist in the current database')) {
            return await actionFailure(
                'DATABASE_SCHEMA_OUT_OF_DATE',
                'Apply pending migrations so the database matches the Prisma schema. From the project root run: bunx prisma migrate deploy'
            );
        }
        return await actionFailure('CREATE_BUSINESS_FAILED', msg);
    }
}

/**
 * Merge `settings` after signup (ownership check only, avoids RBAC timing after new business).
 * @param {string} businessId
 * @param {{ settings?: Record<string, unknown> }} patch
 */
export async function completeRegistrationSetupAction(businessId, patch = {}) {
    try {
        const userId = await resolveSessionUserId();
        if (!businessId) {
            return await actionFailure('VALIDATION_ERROR', 'businessId is required');
        }

        const memberOk = await prismaBase.business_users.findFirst({
            where: {
                business_id: businessId,
                user_id: userId,
                status: 'active',
            },
            select: { id: true },
        });
        const ownerRow = await prismaBase.businesses.findFirst({
            where: { id: businessId, user_id: userId },
            select: { id: true },
        });
        if (!memberOk && !ownerRow) {
            return await actionFailure('FORBIDDEN', 'You cannot update this business');
        }

        const incoming = patch.settings;
        if (!incoming || typeof incoming !== 'object') {
            return await actionSuccess({ message: 'No settings to merge' });
        }

        const current = await prismaBase.businesses.findUnique({
            where: { id: businessId },
            select: { settings: true },
        });
        const prev =
            current?.settings && typeof current.settings === 'object' && !Array.isArray(current.settings)
                ? current.settings
                : {};
        const nextSettings = { ...prev, ...incoming };

        await prismaBase.businesses.update({
            where: { id: businessId },
            data: { settings: nextSettings },
        });

        return await actionSuccess({ ok: true });
    } catch (error) {
        console.error('completeRegistrationSetupAction:', error);
        return await actionFailure('SETUP_UPDATE_FAILED', await getErrorMessage(error));
    }
}

/**
 * Seed starter inventory after registration, owner-only, bypasses inventory RBAC timing.
 * @param {{ businessId: string, domainKey: string, countryIso: string, itemNames?: string[], force?: boolean }} params
 */
export async function seedRegistrationInventoryAction({ businessId, domainKey, countryIso, itemNames = null, force = false }) {
    try {
        const userId = await resolveSessionUserId();
        if (!businessId) {
            return await actionFailure('VALIDATION_ERROR', 'businessId is required');
        }

        const owned = await prismaBase.businesses.findFirst({
            where: {
                id: businessId,
                OR: [
                    { user_id: userId },
                    { business_users: { some: { user_id: userId, status: 'active', role: 'owner' } } },
                ],
            },
            select: {
                id: true,
                category: true,
                country: true,
                settings: true,
                registration_requests: {
                    select: { domain_package_key: true },
                    orderBy: { requested_at: 'desc' },
                    take: 1,
                },
            },
        });
        if (!owned) {
            return await actionFailure('FORBIDDEN', 'You cannot seed this business');
        }

        if (!force) {
            const seedState = await getRegistrationSeedState(businessId);
            if (seedState.alreadySeeded) {
                return await actionSuccess({
                    count: seedState.productCount ?? 0,
                    categoryCount: seedState.categoryCount ?? 0,
                    skipped: true,
                    message:
                        seedState.productCount > 0
                            ? 'Starter catalog is already loaded for this business'
                            : 'Category templates are already loaded for this business',
                });
            }
        }

        const vertical = resolveRegistrationCategoryKey(domainKey || owned.category || 'retail-shop') || 'retail-shop';
        const resolvedCountryIso =
            countryIso ||
            getRegionalStandards(owned.country || 'Pakistan').countryCode ||
            'PK';
        const resolvedPackageKey = resolveBusinessDomainPackageKey(owned);
        const result = await provisionRegistrationSeed({
            businessId,
            domainKey: vertical,
            countryIso: resolvedCountryIso,
            domainPackageKey: resolvedPackageKey,
            itemNames,
        });

        if (!result.categoryCount) {
            return await actionSuccess({ count: 0, categoryCount: 0, message: 'No category template for this vertical' });
        }

        await markRegistrationInventorySeeded(businessId, result);

        try {
            const biz = await prismaBase.businesses.findUnique({
                where: { id: businessId },
                select: { domain: true },
            });
            if (biz?.domain) {
                await StorefrontSyncService.initializeStorefront(businessId, biz.domain);
            }
        } catch (syncErr) {
            console.error('[seedRegistrationInventoryAction] storefront sync failed:', syncErr);
        }

        return await actionSuccess({
            count: result.productCount,
            categoryCount: result.categoryCount,
            warehouseId: result.warehouseId ?? null,
            locationRows: result.locationRows ?? 0,
            message:
                result.productCount > 0
                    ? `Loaded ${result.productCount} starter products across ${result.categoryCount} categories`
                    : `Loaded ${result.categoryCount} inventory categories (add your own products in hub)`,
        });
    } catch (error) {
        console.error('seedRegistrationInventoryAction:', error);
        return await actionFailure('SEED_FAILED', await getErrorMessage(error));
    }
}

/**
 * Sample workspace state for Settings → Learning / demo data panel.
 * @param {string} businessId
 */
export async function getBusinessSampleDataStateAction(businessId) {
    try {
        const userId = await resolveSessionUserId();
        if (!businessId) {
            return await actionFailure('VALIDATION_ERROR', 'businessId is required');
        }

        const owned = await prismaBase.businesses.findFirst({
            where: {
                id: businessId,
                OR: [
                    { user_id: userId },
                    { business_users: { some: { user_id: userId, status: 'active', role: 'owner' } } },
                ],
            },
            select: { id: true },
        });
        if (!owned) {
            return await actionFailure('FORBIDDEN', 'You cannot view this business');
        }

        const state = await getBusinessSampleDataState(businessId);
        return await actionSuccess(state);
    } catch (error) {
        return await actionFailure('SAMPLE_STATE_FAILED', await getErrorMessage(error));
    }
}

/**
 * Load full sample workspace, products, customers, warehouses, finance, HR, etc.
 * @param {{ businessId: string, domainKey?: string, countryIso?: string, replace?: boolean }} params
 */
export async function loadBusinessSampleDataAction({ businessId, domainKey, countryIso, replace = false }) {
    try {
        const userId = await resolveSessionUserId();
        if (!businessId) {
            return await actionFailure('VALIDATION_ERROR', 'businessId is required');
        }

        const owned = await prismaBase.businesses.findFirst({
            where: {
                id: businessId,
                OR: [
                    { user_id: userId },
                    { business_users: { some: { user_id: userId, status: 'active', role: 'owner' } } },
                ],
            },
            select: { id: true, category: true, country: true, settings: true, domain: true },
        });
        if (!owned) {
            return await actionFailure('FORBIDDEN', 'You cannot seed this business');
        }

        if (String(owned.domain || '').startsWith('demo-')) {
            return await actionFailure('NOT_ALLOWED', 'Platform demo businesses are managed separately.');
        }

        const state = await getBusinessSampleDataState(businessId);
        if (state.loaded && !replace) {
            return await actionSuccess({
                skipped: true,
                message: 'Sample data is already loaded. Remove it first or choose Replace.',
                ...state,
            });
        }

        const { loadBusinessSampleData } = await import('@/lib/dataLab/sampleDataLoader.mjs');
        const { removeBusinessSampleData } = await import('@/lib/dataLab/sampleDataRemover.mjs');

        if (replace && state.loaded) {
            await removeBusinessSampleData({ businessId, batchId: state.batchId });
            await clearBusinessSampleDataState(businessId);
        }

        const regional = getRegionalStandards(countryIso || owned.country);
        const vertical = resolveRegistrationCategoryKey(domainKey || owned.category || 'retail-shop') || 'retail-shop';

        const result = await loadBusinessSampleData({
            businessId,
            userId,
            domainKey: vertical,
            countryIso: regional.countryCode,
            replace,
        });

        await markBusinessSampleDataLoaded(businessId, result.batchId, {
            productCount: result.productCount,
            categoryCount: result.categoryCount,
            warehouses: result.warehouses,
            invoices: result.invoices,
            payrollEmployees: result.payrollEmployees,
        });

        return await actionSuccess({
            loaded: true,
            batchId: result.batchId,
            productCount: result.productCount,
            categoryCount: result.categoryCount,
            summary: result,
            message: `Sample workspace loaded, ${result.productCount} products, ${result.customers ?? 3} customers, warehouses, invoices, and payroll.`,
        });
    } catch (error) {
        console.error('loadBusinessSampleDataAction:', error);
        return await actionFailure('SAMPLE_LOAD_FAILED', await getErrorMessage(error));
    }
}

/**
 * Remove sample/dummy data and return to an empty workspace (keeps COA, settings, categories).
 * @param {{ businessId: string }} params
 */
export async function removeBusinessSampleDataAction({ businessId }) {
    try {
        const userId = await resolveSessionUserId();
        if (!businessId) {
            return await actionFailure('VALIDATION_ERROR', 'businessId is required');
        }

        const owned = await prismaBase.businesses.findFirst({
            where: {
                id: businessId,
                OR: [
                    { user_id: userId },
                    { business_users: { some: { user_id: userId, status: 'active', role: 'owner' } } },
                ],
            },
            select: { id: true, domain: true },
        });
        if (!owned) {
            return await actionFailure('FORBIDDEN', 'You cannot modify this business');
        }

        if (String(owned.domain || '').startsWith('demo-')) {
            return await actionFailure('NOT_ALLOWED', 'Platform demo businesses cannot be cleared from here.');
        }

        const state = await getBusinessSampleDataState(businessId);
        if (!state.canRemove) {
            return await actionSuccess({
                skipped: true,
                message: 'No sample data is loaded for this business.',
            });
        }

        const { removeBusinessSampleData } = await import('@/lib/dataLab/sampleDataRemover.mjs');
        await removeBusinessSampleData({ businessId, batchId: state.batchId });
        await clearBusinessSampleDataState(businessId);

        return await actionSuccess({
            removed: true,
            message: 'Sample data removed. Your category templates and settings are unchanged, add your own products anytime.',
        });
    } catch (error) {
        console.error('removeBusinessSampleDataAction:', error);
        return await actionFailure('SAMPLE_REMOVE_FAILED', await getErrorMessage(error));
    }
}

export async function getBusinessByUserId(userId) {
    try {
        const effectiveUserId = await resolveSessionUserId(userId);
        
        const businessUser = await prismaBase.business_users.findFirst({
            where: {
                user_id: effectiveUserId,
                status: 'active'
            },
            orderBy: { created_at: 'desc' },
            include: {
                businesses: {
                    include: {
                        business_settings: {
                            select: { settings: true },
                        },
                    },
                },
            }
        });

        if (businessUser && businessUser.businesses) {
            const bizId = businessUser.businesses.id;
            const platformFeatureOverrides = await loadPlatformFeatureOverridesForBusiness(bizId);
            return await actionSuccess({ 
                business: enrichBusinessForClient({
                    ...businessUser.businesses,
                    user_role: businessUser.role,
                    platformFeatureOverrides,
                })
            });
        }
        return await actionSuccess({ business: null });
    } catch (error) {
        console.error('Error in getBusinessByUserId:', error);
        return await actionFailure('GET_BUSINESS_BY_USER_FAILED', await getErrorMessage(error));
    }
}

/**
 * Fetch a specific business by domain and user ID
 */
export async function getBusinessByDomainAndUser(domain, userId) {
    try {
        const effectiveUserId = await resolveSessionUserId(userId);
        const normalizedDomain = String(domain || '').trim().toLowerCase();

        const businessUser = await prismaBase.business_users.findFirst({
            where: {
                user_id: effectiveUserId,
                status: 'active',
                businesses: {
                    domain: normalizedDomain,
                },
            },
            include: {
                businesses: {
                    include: {
                        business_settings: {
                            select: { settings: true },
                        },
                    },
                },
            },
        });

        if (businessUser && businessUser.businesses) {
            const bizId = businessUser.businesses.id;
            const platformFeatureOverrides = await loadPlatformFeatureOverridesForBusiness(bizId);
            return await actionSuccess({
                business: enrichBusinessForClient({
                    ...businessUser.businesses,
                    user_role: businessUser.role,
                    platformFeatureOverrides,
                }),
            });
        }

        // SELF-HEALING MECHANISM
        const ownerCheck = await prismaBase.businesses.findFirst({
            where: {
                domain: normalizedDomain,
                user_id: effectiveUserId,
            },
            include: {
                business_settings: {
                    select: { settings: true },
                },
            },
        });

        if (ownerCheck) {
            console.log(`[Self-Healing] Restoring lost access for verified owner: ${effectiveUserId} -> ${ownerCheck.domain}`);

            // Automatically restore the link
            await prismaBase.business_users.upsert({
                where: {
                    business_id_user_id: {
                        business_id: ownerCheck.id,
                        user_id: effectiveUserId
                    }
                },
                update: {
                    role: 'owner',
                    status: 'active'
                },
                create: {
                    business_id: ownerCheck.id,
                    user_id: effectiveUserId,
                    role: 'owner',
                    status: 'active'
                }
            });

            const platformFeatureOverrides = await loadPlatformFeatureOverridesForBusiness(ownerCheck.id);
            return await actionSuccess({
                business: enrichBusinessForClient({
                    ...ownerCheck,
                    user_role: 'owner',
                    platformFeatureOverrides,
                }),
            });
        }

        return await actionFailure('BUSINESS_ACCESS_DENIED', 'Business not found or access denied');

    } catch (error) {
        console.error('Error in getBusinessByDomainAndUser:', error);
        return await actionFailure('GET_BUSINESS_BY_DOMAIN_FAILED', await getErrorMessage(error));
    }
}

export async function updateBusinessAction(businessId, updates) {
    try {
        await checkAuth(businessId, 'settings.edit');

        // Filter allowed fields for security
        const { business_name, email, phone, address, city, ntn, srn, cnic, settings } = updates;

        const updateData = {};
        if (business_name !== undefined) updateData.business_name = business_name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (address !== undefined) updateData.address = address;
        if (city !== undefined) updateData.city = city;
        if (ntn !== undefined) updateData.ntn = ntn;
        if (srn !== undefined) updateData.srn = srn;
        if (cnic !== undefined) updateData.cnic = cnic;
        if (settings !== undefined) updateData.settings = settings;

        if (Object.keys(updateData).length === 0) {
            return await actionSuccess({ message: 'No changes' });
        }

        const updatedBiz = await prismaBase.businesses.update({
            where: { id: businessId },
            data: updateData
        });

        return await actionSuccess({ business: updatedBiz });
    } catch (error) {
        console.error('Update Business Error:', error);
        return await actionFailure('UPDATE_BUSINESS_FAILED', await getErrorMessage(error));
    }
}

/**
 * Owner-only: set `businesses.settings.packaging` (tier vs custom per-feature overrides).
 * Mirrors platform `updateBusinessPackaging` but scoped to the signed-in business owner.
 *
 * @param {{ businessId: string, mode?: 'tier'|'custom', featureOverrides?: Record<string, boolean>|null }} params
 */
export async function updateOwnerBusinessPackagingAction({ businessId, mode = 'tier', featureOverrides = undefined }) {
    try {
        await withGuard(businessId, { permission: 'settings.packaging' });

        const biz = await prismaBase.businesses.findFirst({
            where: { id: businessId },
            select: { settings: true },
        });
        if (!biz) {
            return await actionFailure('NOT_FOUND', 'Business not found.');
        }

        const normalizedMode = mode === 'custom' ? 'custom' : 'tier';
        const { nextSettings } = mergePackagingIntoBusinessSettings(biz.settings, {
            mode: normalizedMode,
            featureOverrides: normalizedMode === 'custom' ? featureOverrides : undefined,
        });

        const updated = await prismaBase.businesses.update({
            where: { id: businessId },
            data: { settings: nextSettings, updated_at: new Date() },
        });

        return await actionSuccess({ business: enrichBusinessForClient(updated) });
    } catch (error) {
        const code = /** @type {{ code?: string }} */ (error)?.code;
        if (code === 'UNAUTHENTICATED' || code === 'PERMISSION_DENIED' || code === 'BUSINESS_ACCESS_DENIED' || code === 'MISSING_BUSINESS_ID') {
            return await actionFailure(code === 'UNAUTHENTICATED' ? 'UNAUTHENTICATED' : 'FORBIDDEN', await getErrorMessage(error));
        }
        console.error('updateOwnerBusinessPackagingAction:', error);
        return await actionFailure('PACKAGING_UPDATE_FAILED', await getErrorMessage(error));
    }
}

export async function getBusinessTeamAction(businessId) {
    try {
        await checkAuth(businessId, 'settings.manage_users');

        const team = await prismaBase.business_users.findMany({
            where: { business_id: businessId },
            include: {
                user: {
                    select: {
                        email: true,
                        name: true
                    }
                }
            }
        });

        const formattedTeam = team.map(member => ({
            ...member,
            user_email: member.user?.email,
            user_name: member.user?.name
        }));

        return await actionSuccess({ team: formattedTeam });
    } catch (error) {
        console.error('Get Team Error:', error);
        return await actionFailure('GET_BUSINESS_TEAM_FAILED', await getErrorMessage(error));
    }
}

export async function getBusinessByIdAction(id) {
    try {
        await checkAuth(id, 'sales.view');
        const biz = await prismaBase.businesses.findUnique({
            where: { id }
        });
        
        if (!biz) return await actionFailure('BUSINESS_NOT_FOUND', 'Not found');
        return await actionSuccess({ business: biz });
    } catch (error) {
        return await actionFailure('GET_BUSINESS_BY_ID_FAILED', await getErrorMessage(error));
    }
}

export async function getJoinedBusinessesAction(userId) {
    try {
        const effectiveUserId = await resolveSessionUserId(userId);
        
        const businessUsers = await prismaBase.business_users.findMany({
            where: {
                user_id: effectiveUserId,
                status: 'active'
            },
            orderBy: { created_at: 'desc' },
            include: {
                businesses: true
            }
        });

        const businesses = businessUsers.map(bu => ({
            ...bu.businesses,
            user_role: bu.role,
            user_status: bu.status
        }));

        return await actionSuccess({ businesses });
    } catch (error) {
        return await actionFailure('GET_JOINED_BUSINESSES_FAILED', await getErrorMessage(error));
    }
}

export async function getUserBusinessRoleAction(businessId, userId) {
    try {
        const effectiveUserId = await resolveSessionUserId(userId);
        const bu = await prismaBase.business_users.findFirst({
            where: {
                business_id: businessId,
                user_id: effectiveUserId
            },
            select: { role: true }
        });

        if (!bu) return await actionSuccess({ role: 'salesperson' }); // Default
        return await actionSuccess({ role: bu.role });
    } catch (error) {
        return await actionFailure('GET_USER_ROLE_FAILED', await getErrorMessage(error));
    }
}

export async function updateUserRoleAction(userId, businessId, role) {
    try {
        await checkAuth(businessId, 'settings.manage_roles');

        const normalizedRole = String(role || '').trim().toLowerCase();
        if (!ASSIGNABLE_ROLES.has(normalizedRole)) {
            return actionFailure('INVALID_ROLE', 'Selected role is not assignable');
        }

        const targetMembership = await prismaBase.business_users.findFirst({
            where: {
                user_id: userId,
                business_id: businessId
            }
        });

        if (!targetMembership) {
            return actionFailure('MEMBER_NOT_FOUND', 'Member not found in this business');
        }

        if (targetMembership.role === 'owner') {
            return actionFailure('OWNER_ROLE_LOCKED', 'Owner role cannot be reassigned');
        }

        const updated = await prismaBase.business_users.update({
            where: { id: targetMembership.id },
            data: { role: normalizedRole }
        });

        return await actionSuccess({ membership: updated });
    } catch (error) {
        return await actionFailure('UPDATE_USER_ROLE_FAILED', await getErrorMessage(error));
    }
}

export async function addBusinessMemberAction({ businessId, email, role = 'salesperson' }) {
    try {
        const session = await checkAuth(businessId, 'settings.manage_users');
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const normalizedRole = String(role || '').trim().toLowerCase();

        if (!normalizedEmail) {
            return await actionFailure('VALIDATION_ERROR', 'Member email is required');
        }

        if (!ASSIGNABLE_ROLES.has(normalizedRole)) {
            return await actionFailure('INVALID_ROLE', 'Selected role is not assignable');
        }

        const seatCount = await prismaBase.business_users.count({
            where: {
                business_id: businessId,
                status: 'active'
            }
        });
        
        await checkPlanLimit(businessId, 'max_users', seatCount);

        // Check if user already exists
        const targetUser = await prismaBase.user.findFirst({
            where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
            select: { id: true, email: true, name: true }
        });

        if (targetUser) {
            // User exists - add them directly
            const membership = await prismaBase.business_users.upsert({
                where: {
                    business_id_user_id: {
                        business_id: businessId,
                        user_id: targetUser.id
                    }
                },
                update: {
                    role: normalizedRole,
                    status: 'active',
                    invited_by: session.user.id
                },
                create: {
                    business_id: businessId,
                    user_id: targetUser.id,
                    role: normalizedRole,
                    status: 'active',
                    invited_by: session.user.id
                }
            });

            return await actionSuccess({
                membership: {
                    ...membership,
                    user: {
                        email: targetUser.email,
                        name: targetUser.name,
                    },
                },
                message: 'Member added successfully',
            });
        } else {
            const { createUserInvitationForBusiness } = await import('@/lib/invitations/userInvitationService');
            const business = await prismaBase.businesses.findUnique({
                where: { id: businessId },
                select: { business_name: true }
            });

            let invitation;
            try {
                invitation = await createUserInvitationForBusiness({
                    email: normalizedEmail,
                    businessId,
                    role: normalizedRole,
                    invitedByUserId: session.user.id,
                    customMessage: `You have been invited to join ${business?.business_name || 'our business'} as ${normalizedRole}. Click the link below to create your account and accept the invitation.`,
                });
            } catch (inviteErr) {
                return await actionFailure('INVITATION_FAILED', await getErrorMessage(inviteErr));
            }

            return await actionSuccess({
                membership: null,
                invitation,
                message: 'Invitation sent successfully. The user will join once they accept.',
            });
        }
    } catch (error) {
        return await actionFailure('ADD_MEMBER_FAILED', await getErrorMessage(error));
    }
}

export async function removeBusinessMemberAction({ businessId, userId }) {
    try {
        await checkAuth(businessId, 'settings.manage_users');

        const membership = await prismaBase.business_users.findFirst({
            where: {
                business_id: businessId,
                user_id: userId
            }
        });

        if (!membership) {
            return await actionFailure('MEMBER_NOT_FOUND', 'Member not found');
        }

        if (membership.role === 'owner') {
            return await actionFailure('OWNER_REMOVAL_BLOCKED', 'Owner membership cannot be removed');
        }

        await prismaBase.business_users.update({
            where: { id: membership.id },
            data: { status: 'inactive' }
        });

        return await actionSuccess();
    } catch (error) {
        return await actionFailure('REMOVE_MEMBER_FAILED', await getErrorMessage(error));
    }
}

export async function updateBusinessPlanAction({ businessId, planTier }) {
    try {
        const session = await checkAuth(businessId, 'settings.billing');
        const normalizedPlanTier = normalizePlanTier(planTier);

        const existing = await prismaBase.businesses.findFirst({
            where: { id: businessId },
            select: { plan_tier: true },
        });
        if (!existing) {
            return await actionFailure('NOT_FOUND', 'Business not found.');
        }

        const currentTier = normalizePlanTier(existing.plan_tier);
        const isElevation = (PLAN_ORDER[normalizedPlanTier] ?? 0) > (PLAN_ORDER[currentTier] ?? 0);
        const elevatesToPaid = isElevation && normalizedPlanTier !== 'free';

        if (
            elevatesToPaid &&
            isStripeBillingMode() &&
            !isPlatformLevel(session?.user)
        ) {
            return await actionFailure(
                'BILLING_CHECKOUT_REQUIRED',
                'Upgrading to a paid plan requires Stripe checkout. Use Settings → Billing or contact support.'
            );
        }

        const plan = PLAN_TIERS[normalizedPlanTier] || PLAN_TIERS.free;

        const updatedBiz = await prismaBase.businesses.update({
            where: { id: businessId },
            data: {
                plan_tier: normalizedPlanTier,
                plan_seats: plan.limits.max_users,
                max_products: plan.limits.max_products,
                max_warehouses: plan.limits.max_warehouses
            }
        });

        return await actionSuccess({ business: updatedBiz });
    } catch (error) {
        return await actionFailure('UPDATE_PLAN_FAILED', await getErrorMessage(error));
    }
}
