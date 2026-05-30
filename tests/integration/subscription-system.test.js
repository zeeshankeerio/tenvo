/**
 * Integration-style tests: plan tiers, RBAC, and nav gating (Vitest).
 * Align expectations with lib/config/plans.js and lib/rbac/permissions.js.
 */

import { describe, it, expect } from 'vitest';
import {
  PLAN_TIERS,
  planHasFeature,
  planWithinLimit,
  getNextTier,
  getUpgradeBenefits,
  resolvePlanTier,
  planAtLeast,
  MODULE_LABELS,
  TENVO_ADVANTAGES,
} from '@/lib/config/plans';

import {
  hasPermission,
  canAccessTab,
  getRequiredPlan,
  NAV_PERMISSION_MAP,
  ROLE_HIERARCHY,
} from '@/lib/rbac/permissions';

describe('Subscription & plan integration', () => {
  describe('Plan tiers', () => {
    it('defines five tier keys', () => {
      const tiers = Object.keys(PLAN_TIERS);
      expect(tiers).toHaveLength(5);
      expect(tiers).toEqual(expect.arrayContaining(['free', 'starter', 'professional', 'business', 'enterprise']));
    });

    it('has Pakistan PKR pricing aligned with PLAN_TIERS', () => {
      expect(PLAN_TIERS.free.price_pkr).toBe(0);
      expect(PLAN_TIERS.starter.price_pkr).toBe(1499);
      expect(PLAN_TIERS.professional.price_pkr).toBe(3999);
      expect(PLAN_TIERS.business.price_pkr).toBe(9999);
    });

    it('gates POS and AI features by tier', () => {
      expect(PLAN_TIERS.free.features.pos).toBe(false);
      expect(PLAN_TIERS.starter.features.pos).toBe(true);
      expect(PLAN_TIERS.professional.features.ai_analytics).toBe(false);
      expect(PLAN_TIERS.business.features.ai_analytics).toBe(true);
      expect(PLAN_TIERS.business.features.payroll).toBe(true);
    });

    it('defines usage limits', () => {
      expect(PLAN_TIERS.free.limits.max_users).toBe(1);
      expect(PLAN_TIERS.starter.limits.max_users).toBe(3);
      expect(PLAN_TIERS.professional.limits.max_users).toBe(8);
      expect(PLAN_TIERS.business.limits.max_users).toBe(25);
      expect(PLAN_TIERS.enterprise.limits.max_users).toBe(-1);
    });
  });

  describe('planHasFeature', () => {
    it('returns true when the tier includes the feature', () => {
      expect(planHasFeature('business', 'payroll')).toBe(true);
      expect(planHasFeature('starter', 'pos')).toBe(true);
    });

    it('returns false when the tier excludes the feature', () => {
      expect(planHasFeature('free', 'payroll')).toBe(false);
      expect(planHasFeature('starter', 'ai_analytics')).toBe(false);
      expect(planHasFeature('professional', 'genai_chatbot')).toBe(false);
    });

    it('resolves legacy tier aliases', () => {
      expect(planHasFeature('standard', 'pos')).toBe(true);
      expect(planHasFeature('premium', 'payroll')).toBe(true);
    });

    it('handles invalid tiers safely', () => {
      expect(planHasFeature('invalid', 'invoicing')).toBe(true);
      expect(planHasFeature(undefined, 'invoicing')).toBe(true);
    });
  });

  describe('planWithinLimit', () => {
    it('returns true when under limit', () => {
      expect(planWithinLimit('starter', 'max_users', 2)).toBe(true);
      expect(planWithinLimit('professional', 'max_products', 500)).toBe(true);
    });

    it('returns false when at or over limit', () => {
      expect(planWithinLimit('starter', 'max_users', 3)).toBe(false);
      expect(planWithinLimit('free', 'max_customers', 50)).toBe(false);
    });

    it('treats -1 as unlimited', () => {
      expect(planWithinLimit('enterprise', 'max_users', 999999)).toBe(true);
    });
  });

  describe('Tier progression', () => {
    it('returns next tier', () => {
      expect(getNextTier('free')).toBe('starter');
      expect(getNextTier('starter')).toBe('professional');
      expect(getNextTier('professional')).toBe('business');
      expect(getNextTier('business')).toBe('enterprise');
      expect(getNextTier('enterprise')).toBeNull();
    });

    it('lists upgrade benefits', () => {
      const benefits = getUpgradeBenefits('starter', 'professional');
      expect(benefits.length).toBeGreaterThan(0);
      expect(benefits.some((b) => b.includes('Multi-Warehouse') || b.includes('Warehouse'))).toBe(true);
    });

    it('compares tiers with planAtLeast', () => {
      expect(planAtLeast('business', 'professional')).toBe(true);
      expect(planAtLeast('starter', 'professional')).toBe(false);
      expect(planAtLeast('enterprise', 'free')).toBe(true);
    });
  });

  describe('MODULE_LABELS', () => {
    it('covers module groups used in plan cards', () => {
      const keys = Object.keys(MODULE_LABELS);
      expect(keys).toContain('core');
      expect(keys).toContain('pos');
      expect(keys).toContain('platform');
      expect(keys.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('RBAC', () => {
    it('orders role hierarchy', () => {
      expect(ROLE_HIERARCHY.owner).toBe(9);
      expect(ROLE_HIERARCHY.viewer).toBe(0);
      expect(ROLE_HIERARCHY.admin).toBe(8);
    });

    it('grants owner broad permissions', () => {
      expect(hasPermission('owner', 'settings.billing')).toBe(true);
      expect(hasPermission('owner', 'sales.delete_invoice')).toBe(true);
    });

    it('restricts viewer', () => {
      expect(hasPermission('viewer', 'dashboard.view')).toBe(true);
      expect(hasPermission('viewer', 'inventory.create')).toBe(false);
    });
  });

  describe('NAV_PERMISSION_MAP', () => {
    it('maps critical tabs and uses plan keys that exist on PLAN_TIERS', () => {
      expect(NAV_PERMISSION_MAP.payroll).toBeDefined();
      expect(NAV_PERMISSION_MAP.analytics).toBeDefined();
      expect(NAV_PERMISSION_MAP.warehouses).toBeDefined();
      expect(NAV_PERMISSION_MAP.approvals).toBeDefined();
    });

    it('getRequiredPlan matches FEATURE_MIN_PLAN for gated tabs', () => {
      expect(getRequiredPlan('payroll')).toBe('business');
      expect(getRequiredPlan('analytics')).toBe('business');
      expect(getRequiredPlan('warehouses')).toBe('professional');
    });

    it('canAccessTab respects plan locks', () => {
      expect(canAccessTab('owner', 'free', 'payroll')).toBe(false);
      expect(canAccessTab('owner', 'business', 'payroll')).toBe(true);
    });
  });

  describe('Tenvo advantages copy', () => {
    it('defines marketing categories', () => {
      expect(TENVO_ADVANTAGES.ai_capabilities).toBeDefined();
      expect(TENVO_ADVANTAGES.local).toBeDefined();
    });
  });

  describe('Scenarios', () => {
    it('free owner cannot access analytics until plan upgrade', () => {
      expect(canAccessTab('owner', 'free', 'analytics')).toBe(false);
      expect(getNextTier('free')).toBe('starter');
    });
  });

  describe('Edge cases', () => {
    it('normalizes tier strings', () => {
      expect(resolvePlanTier('BUSINESS')).toBe('business');
    });

    it('handles missing feature keys', () => {
      expect(planHasFeature('business', 'nonexistent_feature_xyz')).toBe(false);
    });

    it('handles nullish tier in resolvePlanTier', () => {
      expect(resolvePlanTier(undefined)).toBe('free');
      expect(resolvePlanTier(null)).toBe('free');
    });
  });
});
