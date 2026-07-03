/**
 * Unified billable SKU resolution for Stripe Checkout, manual payments, and admin record.
 * Single path: catalog item + activation payload must both resolve.
 */

import { listDomainPackages } from '@/lib/config/domainPackages';
import {
  resolveBillingCatalogItem,
  normalizeBillingCurrency,
} from '@/lib/payments/stripeCatalog';
import { getBillingActivationPayload } from '@/lib/payments/billingActivation';

/**
 * @param {{
 *   planTier?: string | null,
 *   domainPackageKey?: string | null,
 *   currency?: string,
 * }} params
 * @returns {{
 *   catalog: import('@/lib/payments/stripeCatalog').BillingCatalogItem,
 *   activation: NonNullable<ReturnType<typeof getBillingActivationPayload>>,
 *   amountMajor: number,
 *   currency: string,
 * } | null}
 */
export function resolveBillableSku({ planTier, domainPackageKey, currency = 'pkr' } = {}) {
  const cur = normalizeBillingCurrency(currency);
  const catalog = resolveBillingCatalogItem({
    planTier,
    domainPackageKey,
    currency: cur,
  });
  if (!catalog) return null;

  const activation = getBillingActivationPayload({
    planTier: catalog.planTier,
    domainPackageKey: catalog.domainPackageKey,
  });
  if (!activation) return null;

  return {
    catalog,
    activation,
    amountMajor: catalog.unitAmountMinor / 100,
    currency: catalog.currency,
  };
}

/**
 * Domain packages with catalog-resolved prices (PKR + USD) for billing UI.
 * @param {{ currency?: string }} [options]
 */
export function listDomainPackageBillableSkus(options = {}) {
  const pkr = normalizeBillingCurrency(options.currency || 'pkr');
  return listDomainPackages()
    .map((pkg) => {
      const pkrSku = resolveBillableSku({ domainPackageKey: pkg.key, currency: pkr });
      const usdSku = resolveBillableSku({ domainPackageKey: pkg.key, currency: 'usd' });
      if (!pkrSku) return null;
      return {
        key: pkg.key,
        name: pkg.name,
        recommendedPlanTier: pkg.recommendedPlanTier,
        billingKind: pkrSku.catalog.kind,
        planTier: pkrSku.catalog.planTier,
        productName: pkrSku.catalog.productName,
        pricePkr: pkrSku.amountMajor,
        priceUsd: usdSku?.amountMajor ?? pkg.pricing?.price_usd ?? null,
        lookupKey: pkrSku.catalog.lookupKey,
      };
    })
    .filter(Boolean);
}

/**
 * Assert all catalog domain packages bill through Stripe + manual paths.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function verifyAllDomainPackagesBillable() {
  const errors = [];
  for (const pkg of listDomainPackages()) {
    const pkr = resolveBillableSku({ domainPackageKey: pkg.key, currency: 'pkr' });
    const usd = resolveBillableSku({ domainPackageKey: pkg.key, currency: 'usd' });
    if (!pkr) errors.push(`${pkg.key}: PKR catalog/activation failed`);
    if (!usd) errors.push(`${pkg.key}: USD catalog/activation failed`);
    if (pkr && !pkr.catalog.lookupKey.startsWith('tenvo_pkg_')) {
      errors.push(`${pkg.key}: missing stable Stripe lookup_key`);
    }
    if (pkr && pkr.catalog.kind !== 'domain_package') {
      errors.push(`${pkg.key}: expected domain_package billing kind`);
    }
  }
  return { ok: errors.length === 0, errors };
}
