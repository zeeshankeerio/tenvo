'use server';

import pool from '@/lib/db';
import { DEFAULT_COA } from '@/lib/config/accounting';
import { actionSuccess, actionFailure, getErrorMessage } from '@/lib/actions/_shared/result';
import { PLAN_TIERS, resolvePlanTier } from '@/lib/config/plans';
import { checkPlanLimit } from '@/lib/auth/planGuard';
import { domainKnowledge } from '@/lib/domainKnowledge';
import { ALL_ROLES } from '@/lib/rbac/permissions';
import { isPlatformOwner, TRIAL_CONFIG, getTrialExpiryDate } from '@/lib/config/platform';
import { withGuard } from '@/lib/rbac/serverGuard';
import { getServerSession } from '@/lib/auth/rbac';

const ASSIGNABLE_ROLES = new Set(ALL_ROLES.filter(role => role !== 'owner'));

function normalizePlanTier(planTier) {
    if (!planTier) return 'free';
    const normalized = String(planTier).trim().toLowerCase();
    // Support legacy aliases via resolvePlanTier
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

    const client = await pool.connect();
    try {
        const res = await client.query('SELECT id FROM businesses WHERE domain = $1', [domain.toLowerCase()]);
        return await actionSuccess({
            available: res.rows.length === 0,
            message: res.rows.length === 0 ? 'Available' : 'Taken'
        });
    } catch (error) {
        console.error('Check Domain Availability Error:', error);
        return await actionFailure('DOMAIN_CHECK_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
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
        planTier
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
    // Platform owner: always gets enterprise, no expiry
    // Everyone else: gets 7-day trial on starter tier
    const ownerIsplatform = isPlatformOwner(email);
    let effectivePlanTier = normalizedPlanTier;
    let planExpiresAt = null;

    if (ownerIsplatform) {
        // Platform owner always gets enterprise, never expires
        effectivePlanTier = 'enterprise';
        planExpiresAt = null;
    } else if (normalizedPlanTier === 'free') {
        // New free-tier signups get a 7-day starter trial
        effectivePlanTier = TRIAL_CONFIG.trialPlanTier;
        planExpiresAt = getTrialExpiryDate();
    }

    const effectivePlan = PLAN_TIERS[effectivePlanTier] || PLAN_TIERS.free;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 0. Domain Uniqueness Guard (Critical for Multi-Tenant)
        const domainCheck = await client.query('SELECT id FROM businesses WHERE domain = $1', [normalizedDomain]);
        if (domainCheck.rows.length > 0) {
            throw new Error(`Domain Handle "${normalizedDomain}" is already taken. Please choose a different unique identifier.`);
        }

        // 0.1 Duplicate Entity Prevention (Enterprise Standard)
        // Prevent the same owner from creating the exact same business name multiple times
        const duplicateCheck = await client.query(`
            SELECT id FROM businesses 
            WHERE user_id = $1 AND LOWER(business_name) = LOWER($2)
        `, [userId, businessName]);

        if (duplicateCheck.rows.length > 0) {
            throw new Error(`You already have a business named "${businessName}". Please choose a different name or manage your existing entity.`);
        }

        // 1. Insert Business (with trial period or platform owner override)
        const bizRes = await client.query(`
            INSERT INTO businesses (
                user_id, business_name, email, phone, country, domain, category,
                plan_tier, plan_seats, max_products, max_warehouses, plan_expires_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id
        `, [
            userId,
            businessName,
            email,
            phone,
            country,
            normalizedDomain,
            normalizedCategory,
            effectivePlanTier,
            effectivePlan.limits.max_users,
            effectivePlan.limits.max_products,
            effectivePlan.limits.max_warehouses,
            planExpiresAt,
        ]);

        const businessId = bizRes.rows[0].id;

        // 2. Insert Business User (Owner)
        await client.query(`
            INSERT INTO business_users (
                business_id, user_id, role, status
            ) VALUES ($1, $2, $3, $4)
        `, [businessId, userId, 'owner', 'active']);

        // 3. Seed Standard Chart of Accounts (COA)
        for (const acc of DEFAULT_COA) {
            await client.query(`
                INSERT INTO gl_accounts (business_id, code, name, type, is_system)
                VALUES ($1, $2, $3, $4, true)
            `, [businessId, acc.code, acc.name, acc.type]);
        }

        await client.query('COMMIT');

        return await actionSuccess({
            businessId,
            domain: normalizedDomain,
            planTier: effectivePlanTier,
            isTrialActive: !!planExpiresAt,
            trialExpiresAt: planExpiresAt ? planExpiresAt.toISOString() : null,
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in createBusiness:', error);
        return await actionFailure('CREATE_BUSINESS_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

export async function getBusinessByUserId(userId) {
    const client = await pool.connect();
    try {
        const effectiveUserId = await resolveSessionUserId(userId);
        const res = await client.query(`
            SELECT b.*, bu.role as user_role
            FROM businesses b
            JOIN business_users bu ON b.id = bu.business_id
            WHERE bu.user_id = $1 AND bu.status = 'active'
            ORDER BY bu.created_at DESC
            LIMIT 1
        `, [effectiveUserId]);

        if (res.rows.length > 0) {
            return await actionSuccess({ business: res.rows[0] });
        }
        return await actionSuccess({ business: null });
    } catch (error) {
        console.error('Error in getBusinessByUserId:', error);
        return await actionFailure('GET_BUSINESS_BY_USER_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

/**
 * Fetch a specific business by domain and user ID
 */
export async function getBusinessByDomainAndUser(domain, userId) {
    const client = await pool.connect();
    try {
        const effectiveUserId = await resolveSessionUserId(userId);
        const res = await client.query(`
            SELECT b.*, bu.role as user_role
            FROM businesses b
            JOIN business_users bu ON b.id = bu.business_id
            WHERE bu.user_id = $1 AND b.domain = $2 AND bu.status = 'active'
            LIMIT 1
        `, [effectiveUserId, domain]);

        if (res.rows.length > 0) {
            return await actionSuccess({ business: res.rows[0] });
        }

        // SELF-HEALING MECHANISM
        // If standard access check fails, check if user is the actual CREATOR of the business.
        // This covers cases where the business_users link might be missing or inactive.
        const ownerCheck = await client.query(`
            SELECT * FROM businesses WHERE domain = $1 AND user_id = $2
        `, [domain, effectiveUserId]);

        if (ownerCheck.rows.length > 0) {
            const biz = ownerCheck.rows[0];
            console.log(`[Self-Healing] Restoring lost access for verified owner: ${effectiveUserId} -> ${biz.domain}`);

            // Automatically restore the link
            await client.query(`
                INSERT INTO business_users (business_id, user_id, role, status)
                VALUES ($1, $2, 'owner', 'active')
                ON CONFLICT (business_id, user_id) 
                DO UPDATE SET role = 'owner', status = 'active'
            `, [biz.id, effectiveUserId]);

            return await actionSuccess({ business: { ...biz, user_role: 'owner' } });
        }

        return await actionFailure('BUSINESS_ACCESS_DENIED', 'Business not found or access denied');

    } catch (error) {
        console.error('Error in getBusinessByDomainAndUser:', error);
        return await actionFailure('GET_BUSINESS_BY_DOMAIN_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

export async function updateBusinessAction(businessId, updates) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'settings.edit', client);

        // Filter allowed fields for security
        const { business_name, email, phone, address, city, ntn, settings } = updates;

        // Build dynamic query
        const fields = [];
        const values = [];
        let idx = 1;

        if (business_name !== undefined) { fields.push(`business_name = $${idx++}`); values.push(business_name); }
        if (email !== undefined) { fields.push(`email = $${idx++}`); values.push(email); }
        if (phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(phone); }
        if (address !== undefined) { fields.push(`address = $${idx++}`); values.push(address); }
        if (city !== undefined) { fields.push(`city = $${idx++}`); values.push(city); }
        if (ntn !== undefined) { fields.push(`ntn = $${idx++}`); values.push(ntn); }
        if (settings !== undefined) { fields.push(`settings = $${idx++}`); values.push(settings); }

        if (fields.length === 0) return await actionSuccess({ message: 'No changes' });

        values.push(businessId);

        const result = await client.query(`
            UPDATE businesses 
            SET ${fields.join(', ')}, updated_at = NOW()
            WHERE id = $${idx}
            RETURNING *
        `, values);

        return await actionSuccess({ business: result.rows[0] });
    } catch (error) {
        console.error('Update Business Error:', error);
        return await actionFailure('UPDATE_BUSINESS_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

export async function getBusinessTeamAction(businessId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'settings.manage_users', client);

        const result = await client.query(`
            SELECT bu.*, u.email as user_email, u.name as user_name
            FROM business_users bu
            LEFT JOIN "user" u ON bu.user_id = u.id
            WHERE bu.business_id = $1
        `, [businessId]);

        const team = result.rows.map(row => ({
            ...row,
            user: {
                email: row.user_email,
                name: row.user_name
            }
        }));

        return await actionSuccess({ team });
    } catch (error) {
        console.error('Get Team Error:', error);
        return await actionFailure('GET_BUSINESS_TEAM_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

export async function getBusinessByIdAction(id) {
    const client = await pool.connect();
    try {
        await checkAuth(id, 'sales.view', client);
        const result = await client.query('SELECT * FROM businesses WHERE id = $1', [id]);
        if (result.rows.length === 0) return await actionFailure('BUSINESS_NOT_FOUND', 'Not found');
        return await actionSuccess({ business: result.rows[0] });
    } catch (error) {
        return await actionFailure('GET_BUSINESS_BY_ID_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

export async function getJoinedBusinessesAction(userId) {
    const client = await pool.connect();
    try {
        const effectiveUserId = await resolveSessionUserId(userId);
        const result = await client.query(`
            SELECT b.*, bu.role as user_role, bu.status as user_status
            FROM businesses b
            JOIN business_users bu ON b.id = bu.business_id
            WHERE bu.user_id = $1 AND bu.status = 'active'
            ORDER BY bu.created_at DESC
        `, [effectiveUserId]);

        return await actionSuccess({ businesses: result.rows });
    } catch (error) {
        return await actionFailure('GET_JOINED_BUSINESSES_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

export async function getUserBusinessRoleAction(businessId, userId) {
    const client = await pool.connect();
    try {
        const effectiveUserId = await resolveSessionUserId(userId);
        const result = await client.query(`
            SELECT role FROM business_users 
            WHERE business_id = $1 AND user_id = $2
        `, [businessId, effectiveUserId]);

        if (result.rows.length === 0) return await actionSuccess({ role: 'salesperson' }); // Default
        return await actionSuccess({ role: result.rows[0].role });
    } catch (error) {
        return await actionFailure('GET_USER_ROLE_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

export async function updateUserRoleAction(userId, businessId, role) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'settings.manage_roles', client);

        const normalizedRole = String(role || '').trim().toLowerCase();
        if (!ASSIGNABLE_ROLES.has(normalizedRole)) {
            return actionFailure('INVALID_ROLE', 'Selected role is not assignable');
        }

        const targetMembership = await client.query(
            `SELECT id, role FROM business_users WHERE user_id = $1 AND business_id = $2 LIMIT 1`,
            [userId, businessId]
        );

        if (targetMembership.rows.length === 0) {
            return actionFailure('MEMBER_NOT_FOUND', 'Member not found in this business');
        }

        if (targetMembership.rows[0].role === 'owner') {
            return actionFailure('OWNER_ROLE_LOCKED', 'Owner role cannot be reassigned');
        }

        const result = await client.query(`
            UPDATE business_users 
            SET role = $1, updated_at = NOW()
            WHERE user_id = $2 AND business_id = $3
            RETURNING *
        `, [normalizedRole, userId, businessId]);

        if (result.rows.length === 0) {
            return await actionFailure('MEMBER_NOT_FOUND', 'Member not found in this business');
        }

        return await actionSuccess({ membership: result.rows[0] });
    } catch (error) {
        return await actionFailure('UPDATE_USER_ROLE_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

export async function addBusinessMemberAction({ businessId, email, role = 'salesperson' }) {
    const client = await pool.connect();
    try {
        const session = await checkAuth(businessId, 'settings.manage_users', client);
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const normalizedRole = String(role || '').trim().toLowerCase();

        if (!normalizedEmail) {
            return await actionFailure('VALIDATION_ERROR', 'Member email is required');
        }

        if (!ASSIGNABLE_ROLES.has(normalizedRole)) {
            return await actionFailure('INVALID_ROLE', 'Selected role is not assignable');
        }

        const userRes = await client.query(
            `SELECT id, email, name FROM "user" WHERE LOWER(email) = $1 LIMIT 1`,
            [normalizedEmail]
        );

        if (userRes.rows.length === 0) {
            return await actionFailure('USER_NOT_FOUND', 'No user found with this email. Ask them to register first.');
        }

        const targetUser = userRes.rows[0];

        const seatCountRes = await client.query(
            `SELECT COUNT(*)::int AS count FROM business_users WHERE business_id = $1 AND status = 'active'`,
            [businessId]
        );
        await checkPlanLimit(businessId, 'max_users', seatCountRes.rows[0].count, client);

        const membershipRes = await client.query(
            `INSERT INTO business_users (business_id, user_id, role, status, invited_by)
             VALUES ($1, $2, $3, 'active', $4)
             ON CONFLICT (business_id, user_id)
             DO UPDATE SET role = EXCLUDED.role, status = 'active', invited_by = EXCLUDED.invited_by, updated_at = NOW()
             RETURNING *`,
            [businessId, targetUser.id, normalizedRole, session.user.id]
        );

        return await actionSuccess({
            membership: {
                ...membershipRes.rows[0],
                user: {
                    email: targetUser.email,
                    name: targetUser.name,
                },
            },
        });
    } catch (error) {
        return await actionFailure('ADD_MEMBER_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

export async function removeBusinessMemberAction({ businessId, userId }) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'settings.manage_users', client);

        const membershipRes = await client.query(
            `SELECT id, role FROM business_users WHERE business_id = $1 AND user_id = $2 LIMIT 1`,
            [businessId, userId]
        );

        if (membershipRes.rows.length === 0) {
            return await actionFailure('MEMBER_NOT_FOUND', 'Member not found');
        }

        if (membershipRes.rows[0].role === 'owner') {
            return await actionFailure('OWNER_REMOVAL_BLOCKED', 'Owner membership cannot be removed');
        }

        await client.query(
            `UPDATE business_users SET status = 'inactive', updated_at = NOW() WHERE business_id = $1 AND user_id = $2`,
            [businessId, userId]
        );

        return await actionSuccess();
    } catch (error) {
        return await actionFailure('REMOVE_MEMBER_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

export async function updateBusinessPlanAction({ businessId, planTier }) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'settings.billing', client);
        const normalizedPlanTier = normalizePlanTier(planTier);
        const plan = PLAN_TIERS[normalizedPlanTier] || PLAN_TIERS.basic;

        const result = await client.query(
            `UPDATE businesses
             SET plan_tier = $1,
                 plan_seats = $2,
                 max_products = $3,
                 max_warehouses = $4,
                 updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [
                normalizedPlanTier,
                plan.limits.max_users,
                plan.limits.max_products,
                plan.limits.max_warehouses,
                businessId,
            ]
        );

        if (result.rows.length === 0) {
            return await actionFailure('BUSINESS_NOT_FOUND', 'Business not found');
        }

        return await actionSuccess({ business: result.rows[0] });
    } catch (error) {
        return await actionFailure('UPDATE_PLAN_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}
