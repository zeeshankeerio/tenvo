/**
 * Tenvo Configuration Exports
 * Centralized exports for all configuration modules
 *
 * Usage:
 *   import { PLAN_TIERS, planHasFeature, TENVO_ADVANTAGES } from '@/lib/config';
 */

// ============================================
// Plan & Subscription Configuration
// ============================================

export * from './plans';

// ============================================
// Tab & Navigation Configuration
// ============================================

export {
  VALID_DASHBOARD_TABS,
  normalizeDashboardTab,
  resolveDashboardTab,
  isValidDashboardTab,
} from './tabs';

// ============================================
// RBAC & Permissions
// ============================================

export {
  ROLE_HIERARCHY,
  ALL_ROLES,
  hasPermission,
  canAccessTab,
  getRequiredPlan,
  getRequiredPermission,
  checkAccess,
  getNavItemAccess,
  requirePermission,
  isRoleAtLeast,
  getPermissionsForRole,
  getPermissionsByModule,
  getSuggestedRoles,
  NAV_PERMISSION_MAP,
  DOMAIN_DEFAULT_ROLES,
} from '../rbac/permissions';

// ============================================
// Platform & Admin Configuration
// ============================================

export {
  PLATFORM_OWNER_EMAIL,
  isPlatformOwner,
  isPlatformLevel,
  TRIAL_CONFIG,
  getTrialExpiryDate,
  isTrialActive,
  getTrialDaysRemaining,
  ROLE_DESCRIPTIONS,
} from './platform';

// ============================================
// Domain & Category Configuration
// ============================================

export { isPosRelevant, isHospitality, isCampaignRelevant } from './domains';

// Canonical domain knowledge API lives in lib/domainKnowledge.js (used across UI).
export { getDomainKnowledge } from '../domainKnowledge';
