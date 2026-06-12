/**
 * Builds a BUSINESS_DOMAINS-shaped entry for any key present in {@link ../domainKnowledge.js}
 * when no explicit row exists in `BUSINESS_DOMAINS`. Keeps module matrix + admin pickers aligned
 * with the full vertical library (59+ domains).
 */

import { domainKnowledge } from '../domainKnowledge.js';

function slugToTitle(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const RETAIL_CORE = {
  tax_config: {
    default_tax_rate: 17,
    tax_label: 'GST',
    withholding_enabled: false,
    input_tax_claimable: true,
  },
  required_modules: ['invoicing', 'purchases', 'customers', 'vendors', 'basic_accounting'],
  recommended_modules: ['pos', 'batch_tracking', 'expense_tracking', 'delivery_challans', 'multi_warehouse'],
};

const SERVICE_CORE = {
  tax_config: {
    default_tax_rate: 16,
    tax_label: 'SST',
    withholding_enabled: true,
    input_tax_claimable: true,
  },
  required_modules: ['invoicing', 'customers', 'basic_accounting'],
  recommended_modules: ['expense_tracking', 'quotations', 'promotions_crm', 'credit_notes'],
};

const MFG_CORE = {
  tax_config: {
    default_tax_rate: 17,
    tax_label: 'GST',
    withholding_enabled: true,
    input_tax_claimable: true,
  },
  required_modules: ['invoicing', 'purchases', 'vendors', 'basic_accounting', 'manufacturing'],
  recommended_modules: ['batch_tracking', 'multi_warehouse', 'expense_tracking', 'delivery_challans', 'quotations'],
};

const BATCH_EXPIRY_RETAIL = {
  tax_config: {
    default_tax_rate: 0,
    tax_label: 'GST',
    withholding_enabled: false,
    input_tax_claimable: false,
  },
  required_modules: ['invoicing', 'purchases', 'customers', 'vendors', 'basic_accounting', 'batch_tracking'],
  recommended_modules: ['serial_tracking', 'pos', 'expense_tracking'],
};

/**
 * @param {string} domainKey
 * @returns {object|null}
 */
export function buildSyntheticBusinessDomain(domainKey) {
  const dk = domainKnowledge[domainKey];
  if (!dk) return null;

  const manufacturing = !!dk.manufacturingEnabled;
  const batch = !!dk.batchTrackingEnabled;
  const serial = !!dk.serialTrackingEnabled;
  const expiry = !!dk.expiryTrackingEnabled;

  let core = RETAIL_CORE;
  if (manufacturing) core = MFG_CORE;
  else if (batch && expiry) {
    core = {
      ...BATCH_EXPIRY_RETAIL,
      tax_config: {
        ...BATCH_EXPIRY_RETAIL.tax_config,
        default_tax_rate:
          typeof dk.defaultTax === 'number' ? dk.defaultTax : BATCH_EXPIRY_RETAIL.tax_config.default_tax_rate,
      },
    };
  } else if (serial) {
    core = {
      ...RETAIL_CORE,
      recommended_modules: [
        'pos',
        'serial_tracking',
        'batch_tracking',
        'expense_tracking',
        'delivery_challans',
        'multi_warehouse',
      ],
    };
  } else if (
    /travel|clinic|dental|veterinary|salon|gym|rent-a-car|event|logistics|courier|real-estate|workshop|lab|library|education/i.test(
      domainKey
    )
  ) {
    core = SERVICE_CORE;
  }

  const taxRate =
    typeof dk.defaultTax === 'number' ? dk.defaultTax : core.tax_config.default_tax_rate;

  return {
    key: domainKey,
    name: slugToTitle(domainKey),
    name_ur: slugToTitle(domainKey),
    icon: dk.icon || 'Store',
    description: `TENVO vertical preset for ${slugToTitle(domainKey)} — inventory, billing, and tax defaults tuned for Pakistan-first operations.`,
    tax_config: { ...core.tax_config, default_tax_rate: taxRate },
    default_units: Array.isArray(dk.units) && dk.units.length ? dk.units : ['pcs', 'pack', 'carton'],
    default_categories:
      dk.setupTemplate?.categories?.length > 0
        ? dk.setupTemplate.categories.slice(0, 12)
        : ['General', 'Fast Moving', 'Seasonal', 'Other'],
    required_modules: [...core.required_modules],
    recommended_modules: [...new Set([...core.recommended_modules, ...(serial ? ['serial_tracking'] : [])])],
    label_overrides: {
      product: manufacturing ? 'Material / SKU' : 'Product / Item',
      invoice: manufacturing ? 'Tax Invoice' : 'Sales Invoice',
      customer: 'Customer',
    },
  };
}
