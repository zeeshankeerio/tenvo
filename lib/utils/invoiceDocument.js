/**
 * Normalize DB / API invoice rows for PDF and thermal print.
 */

import { getRegionalStandards } from '@/lib/utils/regionalHelpers';
import { getBusinessRegionalPack } from '@/lib/utils/businessRegionalContext';

function formatDate(value) {
  if (!value) return new Date().toLocaleDateString('en-GB');
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-GB');
}

function parseTaxDetails(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function parseSettings(raw) {
  if (raw == null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return { ...raw };
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * @param {object} invoice - invoices row (snake_case)
 * @param {object[]} [items] - invoice_items rows
 * @param {object} [business] - businesses row or hub business object
 */
export function normalizeInvoiceForDocument(invoice, items = [], business = {}) {
  if (!invoice) return null;

  const taxDetails = parseTaxDetails(invoice.tax_details);
  const subtotal = Number(invoice.subtotal ?? 0);
  const taxTotal = Number(invoice.tax_total ?? 0);
  const discountTotal = Number(invoice.discount_total ?? 0);
  const grandTotal = Number(invoice.grand_total ?? invoice.amount ?? 0);

  const settingsParsed = parseSettings(business?.settings);
  const taxIds = settingsParsed?.tax || settingsParsed?.compliance || {};
  const pack = getBusinessRegionalPack({ ...business, settings: settingsParsed });
  const standards = getRegionalStandards(pack.countryIso);

  return {
    invoiceNumber: invoice.invoice_number || invoice.invoiceNumber || 'DRAFT',
    date: formatDate(invoice.date || invoice.created_at),
    dueDate: invoice.due_date ? formatDate(invoice.due_date) : null,
    invoiceType: invoice.invoice_type || invoice.invoiceType || 'tax',
    paymentMethod: invoice.payment_method || invoice.paymentMethod || null,
    paymentStatus: invoice.payment_status || invoice.paymentStatus || 'unpaid',
    paymentTerms: business?.default_payment_terms ?? settingsParsed?.default_payment_terms,
    notes: invoice.notes || '',
    currency: business?.currency || pack.currency || standards.currency || 'PKR',
    standards,
    category: business?.category || invoice.category || null,
    customer: {
      name: invoice.customer_name || invoice.customer?.name || 'Customer',
      ntn: invoice.customer_ntn || invoice.customer?.ntn || null,
      address: invoice.customer_address || invoice.customer?.address || null,
      city: invoice.customer_city || invoice.customer?.city || null,
      province: invoice.customer_province || invoice.customer?.province || null,
      phone: invoice.customer_phone || invoice.customer?.phone || null,
      email: invoice.customer_email || invoice.customer?.email || null,
    },
    items: (items || []).map((item) => ({
      name: item.name || item.product_name || item.description || 'Item',
      description: item.description || '',
      quantity: Number(item.quantity ?? 0),
      unit: item.unit || 'pcs',
      rate: Number(item.unit_price ?? item.rate ?? 0),
      amount: Number(item.total_amount ?? item.amount ?? 0),
      taxPercent: Number(item.tax_percent ?? item.taxPercent ?? 0),
      discount: Number(item.discount ?? 0),
    })),
    totals: {
      subtotal,
      totalTax: taxTotal,
      federalSalesTax: Number(taxDetails.federalSalesTax ?? taxDetails.fst ?? 0),
      provincialSalesTax: Number(taxDetails.provincialSalesTax ?? taxDetails.pst ?? 0),
      withholdingTax: Number(taxDetails.withholdingTax ?? taxDetails.wht ?? 0),
      roundOff: Number(taxDetails.roundOff ?? 0),
      discount: discountTotal,
      total: grandTotal,
      taxDetails,
    },
    business: {
      name: business.business_name || business.name || 'Business',
      address: business.address || business.business_address || '',
      city: business.city || '',
      state: business.state || '',
      postal_code: business.postal_code || business.postalCode || '',
      country: business.country || pack.countryName || standards.countryName || 'Pakistan',
      phone: business.phone || business.business_phone || '',
      email: business.email || business.business_email || '',
      ntn: business.ntn || taxIds.ntn || settingsParsed?.ntn || null,
      srn: business.srn || taxIds.srn || settingsParsed?.srn || null,
      trn: taxIds.trn || taxIds.vat_number || null,
      currency: business.currency || standards.currency || 'PKR',
      default_payment_terms: business.default_payment_terms,
      settingsParsed,
    },
  };
}

export function isPakistaniBusiness(business) {
  const country = String(business?.country || business?.business?.country || 'Pakistan').toLowerCase();
  return country.includes('pakistan') || country === 'pk';
}

/**
 * Normalize live builder invoice + totals for PDF.
 */
export function normalizeBuilderInvoiceForDocument(invoice, totals = {}, business = {}) {
  const settingsParsed = parseSettings(business?.settings);
  const pack = getBusinessRegionalPack({ ...business, settings: settingsParsed });
  const standards = getRegionalStandards(pack.countryIso);

  return {
    invoiceNumber: invoice.invoiceNumber || invoice.invoice_number || 'DRAFT',
    date: invoice.date ? formatDate(invoice.date) : formatDate(new Date()),
    dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : null,
    invoiceType: invoice.invoiceType || 'tax',
    paymentMethod: invoice.payment?.method || invoice.paymentMethod || null,
    notes: invoice.notes || '',
    currency: business?.currency || pack.currency || standards.currency || 'PKR',
    standards,
    category: business?.category || invoice.category || null,
    pakistaniTax: invoice.pakistaniTax || null,
    customer: {
      name: invoice.customer?.name || invoice.customerName || 'Customer',
      ntn: invoice.customer?.ntn || null,
      address: invoice.customer?.address || null,
      city: invoice.customer?.city || null,
      province: invoice.customer?.province || null,
      phone: invoice.customer?.phone || null,
      email: invoice.customer?.email || null,
    },
    items: (invoice.items || []).map((item) => ({
      name: item.name || item.description || 'Item',
      description: item.description || '',
      quantity: Number(item.quantity ?? 0),
      unit: item.unit || 'pcs',
      rate: Number(item.rate ?? item.price ?? 0),
      amount: Number(item.amount ?? 0),
      taxPercent: Number(item.taxPercent ?? item.tax_percent ?? 0),
      discount: Number(item.discount ?? 0),
    })),
    totals: {
      ...totals,
      subtotal: totals.subtotal ?? totals.rawSubtotal,
      totalTax: totals.totalTax ?? totals.tax_total,
      taxDetails: totals.taxDetails,
    },
    business: {
      name: business.business_name || business.name || 'Business',
      address: business.address || '',
      city: business.city || '',
      state: business.state || '',
      postal_code: business.postal_code || '',
      country: business.country || pack.countryName || standards.countryName || 'Pakistan',
      phone: business.phone || '',
      email: business.email || '',
      ntn: business.ntn || settingsParsed?.tax?.ntn || settingsParsed?.ntn || null,
      srn: business.srn || settingsParsed?.tax?.srn || settingsParsed?.srn || null,
      trn: settingsParsed?.tax?.trn || null,
      currency: business.currency || standards.currency || 'PKR',
      default_payment_terms: business.default_payment_terms,
      settingsParsed,
    },
  };
}
