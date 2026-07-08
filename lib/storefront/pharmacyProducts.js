/**
 * Pharmacy product classification for public storefront commerce.
 * Rx / Schedule H items route to prescription upload — not self-serve checkout.
 */

/**
 * @param {object | null | undefined} product
 */
function getPharmacyDomainData(product) {
  const raw = product?.domain_data;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
}

function truthyFlag(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

/**
 * Whether a product requires pharmacist verification before dispatch.
 * @param {object | null | undefined} product
 */
export function isPrescriptionRequiredProduct(product) {
  const dd = getPharmacyDomainData(product);
  if (truthyFlag(dd.scheduleh1) || truthyFlag(dd.schedule_h1) || truthyFlag(dd.scheduleH1)) {
    return true;
  }
  if (truthyFlag(dd.requires_prescription) || truthyFlag(dd.requiresprescription)) {
    return true;
  }

  const haystack = `${product?.name || ''} ${product?.description || ''}`.toLowerCase();
  return /\b(prescription required|valid rx required|schedule h|rx only|rx required)\b/.test(haystack);
}

/**
 * @param {object | null | undefined} product
 */
export function resolvePharmacyProductMeta(product) {
  const dd = getPharmacyDomainData(product);
  const requiresPrescription = isPrescriptionRequiredProduct(product);
  return {
    genericName: dd.genericname || dd.generic_name || dd.genericName || null,
    requiresPrescription,
    scheduleH: truthyFlag(dd.scheduleh1) || truthyFlag(dd.schedule_h1) || truthyFlag(dd.scheduleH1),
    storageConditions: dd.storageconditions || dd.storage_conditions || null,
  };
}

/**
 * Contact URL for ordering a specific Rx medicine.
 * @param {string} businessDomain
 * @param {object | null | undefined} product
 */
export function buildPharmacyPrescriptionContactHref(businessDomain, product) {
  const base = `/store/${businessDomain}/contact?prescription=1`;
  const name = String(product?.name || '').trim();
  if (!name) return base;
  return `${base}&medicine=${encodeURIComponent(name)}`;
}

/**
 * Prefill message for prescription contact when linked from a product.
 * @param {object | null | undefined} product
 */
export function buildPharmacyPrescriptionPrefillMessage(product) {
  const name = String(product?.name || '').trim();
  const meta = resolvePharmacyProductMeta(product);
  const lines = [];
  if (name) lines.push(`Medicine: ${name}`);
  if (meta.genericName) lines.push(`Generic: ${meta.genericName}`);
  lines.push('Quantity needed: ');
  lines.push('Dosage / instructions from your doctor: ');
  return lines.join('\n');
}
