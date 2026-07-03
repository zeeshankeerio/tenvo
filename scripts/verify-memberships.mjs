/**
 * Static verification for tenant membership management wiring.
 * Run: bun run verify:memberships
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function assertIncludes(rel, needle, msg) {
  const text = read(rel);
  if (!text.includes(needle)) errors.push(`${rel}: ${msg}`);
}

function assertFile(rel, msg) {
  if (!fs.existsSync(path.join(root, rel))) errors.push(`Missing ${rel}: ${msg}`);
}

// Schema
assertFile('prisma/schema.prisma', 'membership models');
assertIncludes('prisma/schema.prisma', 'model membership_plans', 'membership_plans model');
assertIncludes('prisma/schema.prisma', 'model customer_memberships', 'customer_memberships model');
assertIncludes('prisma/schema.prisma', 'model membership_events', 'membership_events model');
assertIncludes('prisma/schema.prisma', 'model membership_benefits', 'membership_benefits model');

// Migration mirror
assertFile('prisma/migrations/20260629_membership_management/migration.sql', 'prisma migration');
assertFile('lib/db/migrations/044_membership_management.sql', 'manual SQL mirror');

// Core lib
assertFile('lib/memberships/membershipConstants.js', 'constants');
assertFile('lib/memberships/membershipVertical.js', 'vertical resolver');
assertFile('lib/memberships/membershipProductDetection.js', 'product detection');
assertFile('lib/memberships/membershipDuration.js', 'duration helpers');
assertFile('lib/memberships/membershipFeatureGate.js', 'plan feature gate');
assertFile('lib/memberships/membershipOrderHooks.js', 'order lifecycle hooks');
assertFile('lib/memberships/membershipEvents.js', 'audit events');
assertFile('lib/memberships/membershipOrderSql.js', 'order SQL helpers');
assertFile('lib/memberships/membershipBenefits.js', 'benefits helpers');
assertFile('lib/memberships/membershipStorefrontDiscount.js', 'storefront member discount');
assertFile('lib/memberships/loadMembershipBusinessConfig.js', 'tenant membership settings loader');
assertFile('app/api/storefront/[businessDomain]/promo/member-discount/route.js', 'member discount API');
assertFile('components/crm/CustomerMembershipBadge.tsx', 'customer badge');
assertFile('lib/hooks/useCustomerMembershipMap.ts', 'customer membership map hook');
assertFile('lib/memberships/membershipTypes.ts', 'membership UI types');
assertFile('lib/hooks/useMembershipHubAccess.js', 'client plan + domain gate');
assertFile('lib/services/MembershipService.js', 'MembershipService');
assertFile('lib/services/MembershipRenewalService.js', 'MembershipRenewalService');
assertFile('lib/actions/standard/memberships.js', 'server actions');

// Checkout / POS hooks
assertIncludes(
  'app/api/storefront/[businessDomain]/orders/route.js',
  'MembershipService.enrollFromLineItems',
  'storefront order enrollment hook'
);
assertIncludes('lib/services/POSService.js', 'MembershipService.enrollFromLineItems', 'POS enrollment hook');

// Order payment → activation
assertIncludes('lib/actions/storefront/payments.js', 'onStorefrontOrderPaid', 'payment status activation hook');
assertIncludes('lib/actions/storefront/orders.js', 'onStorefrontOrderPaid', 'delivered COD activation hook');
assertIncludes('lib/actions/storefront/orders.js', 'onStorefrontOrderCancelled', 'order cancel hook');
assertIncludes('lib/actions/storefront/orders.js', 'onStorefrontOrderRefunded', 'refund revoke hook');
assertIncludes('lib/actions/storefront/payments.js', 'onStorefrontOrderRefunded', 'payment refund hook');
assertIncludes('lib/services/POSService.js', 'onPosTransactionFullyRefunded', 'POS refund revoke hook');
assertIncludes('lib/services/MembershipService.js', 'syncBenefitsForPlan', 'plan benefits sync');
assertIncludes('lib/services/MembershipService.js', 'revokeEnrollmentsForStorefrontOrder', 'order revoke service');
assertIncludes('lib/memberships/membershipOrderHooks.js', 'onStorefrontOrderRefunded', 'refund hook export');
assertIncludes('app/api/storefront/[businessDomain]/promo/validate/route.js', 'isMemberOnlyPromo', 'member-only promos');
assertIncludes('lib/actions/dashboard/domainOperationsSnapshot.js', 'payload.memberships', 'ops snapshot KPIs');
assertIncludes('lib/dashboard/domainOperationsIntelligence.js', 'showMembership', 'ops profile membership flag');
assertIncludes('lib/dashboard/easyDomainIntelligence.js', 'membershipVertical', 'easy dashboard membership flag');
assertIncludes('app/store/[businessDomain]/cart/page.jsx', 'promo/member-discount', 'cart member pricing');
assertIncludes('app/store/[businessDomain]/cart/page.jsx', 'setCheckoutAdjustments', 'cart persists checkout discounts');
assertIncludes('app/store/[businessDomain]/checkout/page.jsx', 'memberPricingRequested', 'checkout passes member pricing flag');
assertIncludes('lib/storefront/storefrontOrderDiscount.js', 'resolveStorefrontOrderDiscount', 'server checkout discount resolver');
assertIncludes('app/api/storefront/[businessDomain]/orders/route.js', 'resolveStorefrontOrderDiscount', 'orders persist discount_amount');
assertIncludes('lib/actions/storefront/orders.js', 'membershipEnrollments', 'order detail enrollments');
assertIncludes('lib/actions/storefront/orders.js', 'membership_items_count', 'order list membership count');
assertIncludes('components/orders/OrdersManager.jsx', 'MembershipOrderBadge', 'orders membership badge');
assertIncludes('app/business/[category]/components/tabs/CustomersTab.tsx', 'countActiveMembersInList', 'customers active member count');
assertIncludes('app/business/[category]/components/tabs/CustomersTab.tsx', 'CustomerMembershipBadge', 'customers membership badge');
assertIncludes('lib/hooks/useHubMobileNav.js', 'membershipRelevant', 'mobile nav membership gating');
assertIncludes('components/layout/Sidebar.jsx', "key: 'memberships'", 'easy mode sidebar memberships');
assertIncludes('components/layout/CommandPalette.jsx', "goTab('memberships')", 'command palette memberships');
assertIncludes('app/api/webhooks/stripe/route.js', 'onStorefrontOrderPaidAsync', 'stripe paid hook');
assertIncludes('lib/services/MembershipService.js', 'activatePendingForStorefrontOrder', 'activation service');
assertIncludes('lib/services/MembershipService.js', 'expireLapsedMemberships', 'expiry maintenance');
assertIncludes('lib/services/MembershipService.js', 'processOverdueRenewalFailures', 'overdue renewal pause');
assertIncludes('lib/services/MembershipService.js', 'getMembershipInsights', 'hub intelligence');
assertIncludes('lib/services/MembershipService.js', 'handleMembershipInvoicePaid', 'invoice paid resume');
assertIncludes('lib/memberships/membershipIntelligence.js', 'buildMembershipInsights', 'intelligence builder');
assertIncludes('lib/memberships/membershipInvoiceHooks.js', 'onMembershipInvoicePaid', 'invoice hook export');
assertIncludes('lib/services/InvoicePaymentService.js', 'onMembershipInvoicePaid', 'invoice payment wiring');
assertIncludes('lib/actions/standard/memberships.js', 'getMembershipInsightsAction', 'insights action');
assertIncludes('lib/actions/standard/memberships.js', 'updatePlanBenefitsAction', 'benefits editor action');
assertIncludes('components/crm/MembershipManager.jsx', 'getMembershipInsightsAction', 'hub intelligence UI');
assertIncludes('components/crm/MembershipManager.jsx', 'updatePlanBenefitsAction', 'benefits editor UI');
assertIncludes('app/api/internal/memberships/process-renewals/route.js', 'processOverdueRenewalFailures', 'cron overdue pause');
assertIncludes('lib/actions/dashboard/domainOperationsSnapshot.js', 'overdueRenewals', 'ops overdue KPI');
assertIncludes('lib/services/MembershipService.js', 'MEMBERSHIP_EVENT.RESUMED', 'resume event on hub activate');
assertIncludes('lib/actions/basic/business.js', 'syncPlansFromInventory', 'registration plan bootstrap');
assertIncludes('components/crm/MembershipManager.jsx', 'enrollCustomerMembershipAction', 'hub enroll UI');
assertIncludes('lib/config/domains.js', 'MEMBERSHIP_VERTICAL_KEYS', 'single vertical list source');
assertIncludes('lib/services/MembershipService.js', 'isMembershipEnabledSafe', 'enrollment feature gate');

// Hub UI
assertFile('components/crm/MembershipManager.jsx', 'hub manager');
assertIncludes('app/business/[category]/components/DashboardTabs.jsx', 'value="memberships"', 'memberships tab');
assertIncludes('lib/config/tabs.js', "'memberships'", 'tab registry');

// RBAC + plans
assertIncludes('lib/rbac/permissions.js', 'memberships:', 'tab permission');
assertIncludes('lib/rbac/permissions.js', 'crm.manage_memberships', 'permission key');
assertIncludes('lib/config/plans.js', 'membership_management', 'plan feature flag');
assertIncludes('lib/config/domainPackageFeatures.js', 'membership_management', 'fitness package feature');

// Domain gating
assertIncludes('lib/config/domains.js', 'isMembershipRelevant', 'domain helper');

// Cron route
assertFile('app/api/internal/memberships/process-renewals/route.js', 'renewal cron');
assertIncludes('app/api/internal/memberships/process-renewals/route.js', 'expireLapsedMemberships', 'cron expiry');

if (errors.length) {
  console.error('verify:memberships FAILED\n');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}

console.log('verify:memberships OK');
