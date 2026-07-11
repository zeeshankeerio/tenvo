/**
 * Vertical-aware packaging applied at registration so domain knowledge
 * (batch / multi-warehouse / manufacturing) is not blocked by starter plan defaults,
 * and suite packages do not force manufacturing onto pure traders (textile-wholesale).
 */

import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { getDomainKnowledge } from '@/lib/domainKnowledge';
import { mergePackagingIntoBusinessSettings } from '@/lib/utils/businessPackagingSettings';

/**
 * @param {string | null | undefined} domainKey
 * @returns {Record<string, boolean>}
 */
export function getRegistrationVerticalFeatureOverrides(domainKey) {
  const canonical = resolveDomainKey(domainKey);
  if (!canonical) return {};

  const knowledge = getDomainKnowledge(canonical);
  if (!knowledge) return {};

  /** @type {Record<string, boolean>} */
  const overrides = {};

  if (knowledge.batchTrackingEnabled) overrides.batch_tracking = true;
  if (knowledge.multiLocationEnabled) overrides.multi_warehouse = true;
  if (knowledge.serialTrackingEnabled) overrides.serial_tracking = true;

  if (knowledge.manufacturingEnabled === true) overrides.manufacturing = true;
  if (knowledge.manufacturingEnabled === false) overrides.manufacturing = false;

  // Jama Cloth traders: challans + price lists are day-one wholesale ops.
  if (canonical === 'textile-wholesale') {
    overrides.delivery_challans = true;
    overrides.price_lists = true;
  }

  return overrides;
}

/**
 * Merge vertical feature overrides into a registration settings patch.
 * Preserves existing package packaging keys; vertical flags win on conflict.
 *
 * @param {Record<string, unknown> | null | undefined} settingsPatch
 * @param {string | null | undefined} domainKey
 * @returns {Record<string, unknown>}
 */
export function applyRegistrationVerticalPackaging(settingsPatch, domainKey) {
  const verticalOverrides = getRegistrationVerticalFeatureOverrides(domainKey);
  if (!Object.keys(verticalOverrides).length) {
    return settingsPatch && typeof settingsPatch === 'object' ? { ...settingsPatch } : {};
  }

  const prev =
    settingsPatch && typeof settingsPatch === 'object' && !Array.isArray(settingsPatch)
      ? { ...settingsPatch }
      : {};
  const prevOverrides =
    prev.packaging &&
    typeof prev.packaging === 'object' &&
    prev.packaging.feature_overrides &&
    typeof prev.packaging.feature_overrides === 'object'
      ? { ...prev.packaging.feature_overrides }
      : {};

  const { nextSettings } = mergePackagingIntoBusinessSettings(prev, {
    mode: 'custom',
    featureOverrides: { ...prevOverrides, ...verticalOverrides },
  });

  return nextSettings;
}
