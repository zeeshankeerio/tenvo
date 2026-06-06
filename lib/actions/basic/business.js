'use server';

import { prismaBase } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { DEFAULT_COA } from '@/lib/config/accounting';
import { actionSuccess, actionFailure, getErrorMessage } from '@/lib/actions/_shared/result';
import { PLAN_TIERS, resolvePlanTier } from '@/lib/config/plans';
import { checkPlanLimit } from '@/lib/auth/planGuard';
import { domainKnowledge } from '@/lib/domainKnowledge';
import { getRegionalStandards } from '@/lib/utils/regionalHelpers';
import { ALL_ROLES } from '@/lib/rbac/permissions';
import { isPlatformOwner, TRIAL_CONFIG, getTrialExpiryDate } from '@/lib/config/platform';
import { withGuard } from '@/lib/rbac/serverGuard';
import { getServerSession } from '@/lib/auth/rbac';

const ASSIGNABLE_ROLES = new Set(ALL_ROLES.filter(role => role !== 'owner'));

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
    if (!domain || domain.length < 3) {
        return await actionFailure('VALIDATION_ERROR', 'Domain must be at least 3 characters');
    }

    try {
        const existing = await prismaBase.businesses.findFirst({
            where: { domain: domain.toLowerCase() },
            select: { id: true }
        });
        return await actionSuccess({
            available: !existing,
            message: !existing ? 'Available' : 'Taken'
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
        currency: currencyOverride,
        ntn,
        description,
    } = data;

    const userId = await resolveSessionUserId(data?.userId || null);
    const normalizedCategory = String(category || '').trim();
    const normalizedDomain = String(domain || '').trim().toLowerCase();
    const normalizedPlanTier = normalizePlanTier(planTier);

    if (!normalizedCategory || !domainKnowledge[normalizedCategory]) {
        return await actionFailure('INVALID_DOMAIN_CATEGORY', 'Selected business domain is not supported');
    }

    if (!normalizedDomain || normalizedDomain.length < 3) {
        return await actionFailure('INVALID_DOMAIN_HANDLE', 'Domain handle must be at least 3 characters');
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
    const regional = getRegionalStandards(country);
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

            // 1. Insert Business
            const biz = await tx.businesses.create({
                data: {
                    user_id: userId,
                    business_name: businessName,
                    email,
                    phone: phone != null && String(phone).trim() ? String(phone).trim() : null,
                    country: regional.countryName,
                    domain: normalizedDomain,
                    category: normalizedCategory,
                    plan_tier: effectivePlanTier,
                    plan_seats: effectivePlan.limits.max_users,
                    max_products: effectivePlan.limits.max_products,
                    max_warehouses: effectivePlan.limits.max_warehouses,
                    plan_expires_at: planExpiresAt,
                    currency: resolvedCurrency,
                    timezone: resolvedTimezone,
                    ntn: trimmedNtn || null,
                    description: trimmedDescription,
                }
            });

            // 1b. Default storefront settings (public catalog + branding)
            await tx.business_settings.create({
                data: {
                    business_id: biz.id,
                    is_storefront_enabled: true,
                    settings: {
                        storefront: {
                            enabled: true,
                            heroTitle: businessName,
                            heroSubtitle:
                                trimmedDescription ||
                                `Shop ${businessName} online — secure checkout and order updates.`,
                            publicRegion: regional.countryName,
                            currency: resolvedCurrency,
                            locale: regional.locale,
                            countryIso: regional.countryCode,
                        },
                        registration: {
                            completed_via: 'register_wizard',
                            country_iso: regional.countryCode,
                            country_name: regional.countryName,
                            tax_label: regional.taxLabel,
                            tax_id_label: regional.taxIdLabel,
                            default_tax_rate: regional.defaultTaxRate,
                            tax_strategy: regional.taxStrategy,
                            locale: regional.locale,
                            time_zone: regional.timeZone,
                        },
                    },
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

            // 3. Seed Standard Chart of Accounts (COA)
            const coaData = DEFAULT_COA.map(acc => ({
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

            return biz;
        });

        return await actionSuccess({
            businessId: result.id,
            domain: normalizedDomain,
            planTier: effectivePlanTier,
            isTrialActive: !!planExpiresAt,
            trialExpiresAt: planExpiresAt ? planExpiresAt.toISOString() : null,
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
 * Merge `settings` after signup (ownership check only — avoids RBAC timing after new business).
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
                businesses: true
            }
        });

        if (businessUser && businessUser.businesses) {
            return await actionSuccess({ 
                business: {
                    ...businessUser.businesses,
                    user_role: businessUser.role
                } 
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
                businesses: true,
            },
        });

        if (businessUser && businessUser.businesses) {
            return await actionSuccess({
                business: {
                    ...businessUser.businesses,
                    user_role: businessUser.role,
                },
            });
        }

        // SELF-HEALING MECHANISM
        const ownerCheck = await prismaBase.businesses.findFirst({
            where: {
                domain: normalizedDomain,
                user_id: effectiveUserId,
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

            return await actionSuccess({ business: { ...ownerCheck, user_role: 'owner' } });
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
        const { business_name, email, phone, address, city, ntn, settings } = updates;
        
        const updateData = {};
        if (business_name !== undefined) updateData.business_name = business_name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (address !== undefined) updateData.address = address;
        if (city !== undefined) updateData.city = city;
        if (ntn !== undefined) updateData.ntn = ntn;
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

        const targetUser = await prismaBase.user.findFirst({
            where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
            select: { id: true, email: true, name: true }
        });

        if (!targetUser) {
            return await actionFailure('USER_NOT_FOUND', 'No user found with this email. Ask them to register first.');
        }

        const seatCount = await prismaBase.business_users.count({
            where: {
                business_id: businessId,
                status: 'active'
            }
        });
        
        // This still uses the pg pool internally, which is fine since it's just a check
        await checkPlanLimit(businessId, 'max_users', seatCount);

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
        });
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
        await checkAuth(businessId, 'settings.billing');
        const normalizedPlanTier = normalizePlanTier(planTier);
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
