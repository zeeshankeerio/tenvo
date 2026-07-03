import { isGymMembershipProduct, isFitnessServiceProduct } from '@/lib/storefront/fitnessStorefront';
import { resolveMembershipVerticalKey } from '@/lib/memberships/membershipVertical';

function productCategory(p) {
  return String(p?.category_name || p?.category || '').toLowerCase();
}

/**
 * Generic membership SKU heuristics (vertical-aware).
 * @param {object} product
 * @param {string | null | undefined} [verticalKey]
 */
export function isMembershipProduct(product, verticalKey) {
  if (!product) return false;
  const vertical = verticalKey || null;

  if (vertical === 'gym-fitness' || !vertical) {
    if (isGymMembershipProduct(product)) return true;
  }

  const cat = productCategory(product);
  const name = String(product?.name || '').toLowerCase();
  const dd = product?.domain_data || {};

  if (cat.includes('membership') || /\bmembership\b/.test(name)) return true;
  if (dd.membershiptype || dd.membership_type) return true;

  if (vertical === 'spa-wellness' || vertical === 'beauty-salon' || vertical === 'dental-clinic') {
    if (/\b(session pack|package|monthly plan|annual plan)\b/i.test(name)) return true;
    if (cat.includes('package') || cat.includes('session')) return true;
  }

  if (vertical === 'hotel-guesthouse') {
    if (product?.unit === 'night' && /\b(club|member|loyalty)\b/i.test(name)) return true;
  }

  return false;
}

/**
 * Session packs / PT — enrollable but not auto-renew facility access.
 * @param {object} product
 * @param {string | null | undefined} [verticalKey]
 */
export function isSessionPackProduct(product, verticalKey) {
  if (!product) return false;
  if (verticalKey === 'gym-fitness' && isFitnessServiceProduct(product)) return true;
  const unit = String(product?.unit || '').toLowerCase();
  if (unit === 'session') return true;
  const name = String(product?.name || '').toLowerCase();
  return /\b(session pack|\d+-session|pt pack|class pack)\b/i.test(name);
}

/**
 * @param {object} product
 * @param {string | null | undefined} category
 */
export function classifyMembershipProduct(product, category) {
  const verticalKey = resolveMembershipVerticalKey(category);
  const isMembership = isMembershipProduct(product, verticalKey);
  const isSessionPack = isSessionPackProduct(product, verticalKey);
  return {
    verticalKey,
    isMembership: isMembership || isSessionPack,
    isSessionPack,
    autoRenewEligible: isMembership && !isSessionPack,
  };
}
