/**
 * PDF-safe invoice formatting (ASCII-only — jsPDF Helvetica cannot render ₨, ₹, Arabic symbols).
 */

import { getRegionalStandards } from '@/lib/utils/regionalHelpers';
import { getBusinessRegionalPack } from '@/lib/utils/businessRegionalContext';
import { getDomainConfig } from '@/lib/config/domains';

const PAGE_MARGIN = 14;
const CONTENT_WIDTH = 182; // A4 210 - 2*14
const WINE = [139, 21, 56];

/** @param {number} amount */
export function formatPdfAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * ASCII-safe money string for PDF output.
 * @param {number} amount
 * @param {string} [currencyCode]
 */
export function formatPdfMoney(amount, currencyCode = 'PKR') {
  const code = String(currencyCode || 'PKR').toUpperCase();
  const formatted = formatPdfAmount(amount);

  switch (code) {
    case 'PKR':
      return `Rs. ${formatted}`;
    case 'INR':
      return `INR ${formatted}`;
    case 'USD':
    case 'CAD':
    case 'AUD':
      return `$${formatted}`;
    case 'EUR':
      return `EUR ${formatted}`;
    case 'GBP':
      return `GBP ${formatted}`;
    case 'AED':
      return `AED ${formatted}`;
    case 'SAR':
      return `SAR ${formatted}`;
    case 'CNY':
      return `CNY ${formatted}`;
    default:
      return `${code} ${formatted}`;
  }
}

/**
 * @param {object} business
 * @param {object} [settingsParsed]
 */
export function resolveBusinessRegistrationLines(business = {}, settingsParsed = {}) {
  const lines = [];
  const tax = settingsParsed?.tax || settingsParsed?.compliance || {};
  const pack = getBusinessRegionalPack({
    ...business,
    settings: {
      ...(business?.settings && typeof business.settings === 'object' ? business.settings : {}),
      ...settingsParsed,
    },
  });
  const standards = getRegionalStandards(pack.countryIso);

  const ntn = business.ntn || tax.ntn || settingsParsed?.ntn;
  const srn = business.srn || tax.srn || settingsParsed?.srn;
  const trn = tax.trn || tax.vat_number || business.trn;
  const gstin = tax.gstin || tax.gst;

  if (pack.countryIso === 'PK') {
    if (ntn) lines.push(`NTN: ${ntn}`);
    if (srn) lines.push(`SRN: ${srn}`);
  } else if (standards.countryCode === 'AE' && trn) {
    lines.push(`TRN: ${trn}`);
  } else if (gstin) {
    lines.push(`GSTIN: ${gstin}`);
  } else if (trn) {
    lines.push(`${standards.taxIdLabel}: ${trn}`);
  } else if (ntn) {
    lines.push(`${standards.taxIdLabel}: ${ntn}`);
  }

  return lines;
}

/**
 * @param {object} business
 */
export function formatBusinessAddressBlock(business = {}) {
  const parts = [];
  if (business.address) parts.push(String(business.address).trim());

  const cityLine = [business.city, business.state, business.postal_code || business.postalCode]
    .filter(Boolean)
    .join(', ');
  if (cityLine) parts.push(cityLine);

  if (business.country) parts.push(String(business.country).trim());

  return parts;
}

/**
 * @param {object} params
 */
export function resolveInvoiceDocumentTitle({ category, invoiceType, standards, isPakistaniDomain }) {
  const domainLabel = getDomainConfig(category)?.label_overrides?.invoice;
  if (invoiceType === 'export') return 'EXPORT INVOICE';
  if (invoiceType === 'retail') return domainLabel ? String(domainLabel).toUpperCase() : 'RETAIL INVOICE';
  if (isPakistaniDomain || standards?.countryCode === 'PK') return 'TAX INVOICE';
  if (domainLabel) return String(domainLabel).toUpperCase();
  return 'INVOICE';
}

/**
 * Normalize totals from builder or DB shape.
 * @param {object} totals
 * @param {object} [invoice]
 */
export function normalizePdfTotals(totals = {}, invoice = {}) {
  const pakistaniTax = invoice.pakistaniTax || {};
  const taxDetails = totals.taxDetails || invoice.tax_details || {};

  const subtotal = Number(
    totals.subtotal ?? totals.rawSubtotal ?? invoice.subtotal ?? 0
  );
  const totalTax = Number(
    totals.totalTax ?? totals.tax_total ?? invoice.tax_total ?? pakistaniTax.totalTax ?? 0
  );
  const discount = Number(
    totals.discount ?? totals.discount_total ?? invoice.discount_total ?? 0
  );
  const seasonalDiscount = Number(totals.seasonalDiscount ?? 0);
  const roundOff = Number(totals.roundOff ?? invoice.roundOff ?? 0);
  const total = Number(
    totals.total ?? totals.grand_total ?? invoice.grand_total ?? invoice.amount ?? subtotal + totalTax - discount
  );

  const federalSalesTax = Number(
    totals.federalSalesTax ?? pakistaniTax.federalSalesTax ?? taxDetails.federalSalesTax ?? taxDetails.fst ?? 0
  );
  const provincialSalesTax = Number(
    totals.provincialSalesTax ?? pakistaniTax.provincialSalesTax ?? taxDetails.provincialSalesTax ?? taxDetails.pst ?? 0
  );

  /** @type {{ label: string, amount: number }[]} */
  const taxLines = [];

  if (taxDetails && typeof taxDetails === 'object' && !Array.isArray(taxDetails)) {
    for (const [label, detail] of Object.entries(taxDetails)) {
      const amt = Number(detail?.amount ?? detail?.tax ?? detail ?? 0);
      if (amt > 0) taxLines.push({ label: String(label), amount: amt });
    }
  }

  if (!taxLines.length && totalTax > 0) {
    if (federalSalesTax > 0) taxLines.push({ label: 'Federal Sales Tax', amount: federalSalesTax });
    if (provincialSalesTax > 0) taxLines.push({ label: 'Provincial Sales Tax', amount: provincialSalesTax });
    if (!federalSalesTax && !provincialSalesTax) taxLines.push({ label: 'Tax', amount: totalTax });
  }

  return {
    subtotal,
    discount,
    seasonalDiscount,
    roundOff,
    total,
    totalTax,
    taxLines,
  };
}

/**
 * @param {object} item
 */
export function normalizePdfLineItem(item) {
  const qty = Number(item.quantity ?? 0);
  const rate = Number(item.rate ?? item.unit_price ?? item.price ?? 0);
  const amount = Number(item.amount ?? item.total_amount ?? qty * rate);
  return {
    name: item.name || item.product_name || item.description || 'Item',
    description: item.description || '',
    quantity: qty,
    unit: item.unit || 'pcs',
    rate,
    amount,
    taxPercent: Number(item.taxPercent ?? item.tax_percent ?? 0),
    discount: Number(item.discount ?? 0),
  };
}

export { PAGE_MARGIN, CONTENT_WIDTH, WINE };
