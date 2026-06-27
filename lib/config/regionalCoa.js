/**
 * Country-aware Chart of Accounts labels, same GL codes, localized tax account names.
 */
import { DEFAULT_COA, ACCOUNT_CODES } from './accounting.js';
import { getRegionalStandards } from '../utils/regionalHelpers';

/** Tax-related liability accounts keyed by country ISO */
const TAX_ACCOUNT_LABELS = Object.freeze({
  PK: {
    [ACCOUNT_CODES.SALES_TAX_PAYABLE]: 'Sales Tax Payable (FBR)',
    [ACCOUNT_CODES.PROVINCIAL_TAX_PAYABLE]: 'Provincial Tax Payable',
    [ACCOUNT_CODES.WITHHOLDING_TAX_PAYABLE]: 'Withholding Tax Payable',
    [ACCOUNT_CODES.INPUT_TAX_CREDIT]: 'Input Tax Credit (GST)',
  },
  AE: {
    [ACCOUNT_CODES.SALES_TAX_PAYABLE]: 'VAT Payable',
    [ACCOUNT_CODES.PROVINCIAL_TAX_PAYABLE]: 'VAT Payable (Adjustments)',
    [ACCOUNT_CODES.WITHHOLDING_TAX_PAYABLE]: 'Corporate Tax Payable',
    [ACCOUNT_CODES.INPUT_TAX_CREDIT]: 'Input VAT Recoverable',
  },
  SA: {
    [ACCOUNT_CODES.SALES_TAX_PAYABLE]: 'VAT Payable',
    [ACCOUNT_CODES.PROVINCIAL_TAX_PAYABLE]: 'VAT Payable (Adjustments)',
    [ACCOUNT_CODES.WITHHOLDING_TAX_PAYABLE]: 'Withholding Tax Payable',
    [ACCOUNT_CODES.INPUT_TAX_CREDIT]: 'Input VAT Recoverable',
  },
  US: {
    [ACCOUNT_CODES.SALES_TAX_PAYABLE]: 'Sales Tax Payable',
    [ACCOUNT_CODES.PROVINCIAL_TAX_PAYABLE]: 'State Sales Tax Payable',
    [ACCOUNT_CODES.WITHHOLDING_TAX_PAYABLE]: 'Payroll Tax Payable',
    [ACCOUNT_CODES.INPUT_TAX_CREDIT]: 'Sales Tax Receivable',
  },
  CN: {
    [ACCOUNT_CODES.SALES_TAX_PAYABLE]: 'VAT Payable',
    [ACCOUNT_CODES.PROVINCIAL_TAX_PAYABLE]: 'VAT Payable (Local)',
    [ACCOUNT_CODES.WITHHOLDING_TAX_PAYABLE]: 'Withholding Tax Payable',
    [ACCOUNT_CODES.INPUT_TAX_CREDIT]: 'Input VAT Credit',
  },
  IN: {
    [ACCOUNT_CODES.SALES_TAX_PAYABLE]: 'Output GST Payable',
    [ACCOUNT_CODES.PROVINCIAL_TAX_PAYABLE]: 'IGST / CGST Payable',
    [ACCOUNT_CODES.WITHHOLDING_TAX_PAYABLE]: 'TDS Payable',
    [ACCOUNT_CODES.INPUT_TAX_CREDIT]: 'Input GST Credit',
  },
  GB: {
    [ACCOUNT_CODES.SALES_TAX_PAYABLE]: 'VAT Payable',
    [ACCOUNT_CODES.PROVINCIAL_TAX_PAYABLE]: 'VAT Payable (Adjustments)',
    [ACCOUNT_CODES.WITHHOLDING_TAX_PAYABLE]: 'PAYE / NIC Payable',
    [ACCOUNT_CODES.INPUT_TAX_CREDIT]: 'VAT Reclaimable',
  },
});

const GENERIC_TAX_LABELS = {
  [ACCOUNT_CODES.SALES_TAX_PAYABLE]: 'Sales / VAT Tax Payable',
  [ACCOUNT_CODES.PROVINCIAL_TAX_PAYABLE]: 'Regional Tax Payable',
  [ACCOUNT_CODES.WITHHOLDING_TAX_PAYABLE]: 'Withholding Tax Payable',
  [ACCOUNT_CODES.INPUT_TAX_CREDIT]: 'Input Tax Credit',
};

/**
 * @param {string} [countryIso]
 * @returns {typeof DEFAULT_COA}
 */
export function getDefaultCoaForCountry(countryIso) {
  const iso = getRegionalStandards(countryIso).countryCode;
  const labels = TAX_ACCOUNT_LABELS[iso] || GENERIC_TAX_LABELS;

  return DEFAULT_COA.map((acc) => ({
    ...acc,
    name: labels[acc.code] || acc.name.replace(/\s*\(FBR\)/i, '').replace(/\s*\(GST\)/i, ' Tax'),
  }));
}
