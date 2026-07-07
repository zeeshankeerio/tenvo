import 'server-only';
import { prismaBase } from '@/lib/db';
import { isPlatformLevel } from '@/lib/config/platform';

/**
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.businessId
 * @param {object} [params.sessionUser] - Better Auth user for platform bypass
 * @returns {Promise<boolean>}
 */
export async function assertUserHasBusinessAccess({ userId, businessId, sessionUser }) {
  if (!userId || !businessId) return false;
  if (sessionUser && isPlatformLevel(sessionUser)) return true;

  const membership = await prismaBase.business_users.findFirst({
    where: {
      user_id: userId,
      business_id: businessId,
    },
    select: { id: true },
  });
  if (membership) return true;

  const owned = await prismaBase.businesses.findFirst({
    where: { id: businessId, user_id: userId },
    select: { id: true },
  });
  return !!owned;
}

/**
 * @param {string} domain
 * @returns {Promise<{ id: string; business_name: string; email: string; domain: string; plan_tier: string | null } | null>}
 */
export async function resolveBusinessFromDomain(domain) {
  if (!domain || typeof domain !== 'string') return null;
  const normalized = domain.trim().toLowerCase();
  if (!normalized) return null;

  const row = await prismaBase.businesses.findFirst({
    where: {
      domain: normalized,
      is_active: true,
    },
    select: {
      id: true,
      business_name: true,
      email: true,
      domain: true,
      plan_tier: true,
    },
  });
  return row;
}

/**
 * Same as resolveBusinessFromDomain but keeps original casing match on `domain` column.
 * Storefront routes pass path segment as stored in DB.
 * @param {string} businessDomain
 */
export async function resolveBusinessFromStorefrontDomain(businessDomain) {
  if (!businessDomain || typeof businessDomain !== 'string') return null;
  const clean = businessDomain.trim().toLowerCase();
  const row = await prismaBase.businesses.findFirst({
    where: {
      domain: { equals: clean, mode: 'insensitive' },
      is_active: true,
    },
    select: {
      id: true,
      business_name: true,
      email: true,
      domain: true,
      plan_tier: true,
      settings: true,
    },
  });
  return row;
}
