/**
 * 58mm thermal receipt — aligned HTML print + jsPDF download.
 */

import { getBusinessRegionalPack } from '@/lib/utils/businessRegionalContext';

function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(amount, currencyCode = 'PKR', locale) {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currencyCode} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

function moneyNum(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function lineAmount(item) {
  const qty = Number(item.quantity) || 1;
  const unit = Number(item.unitPrice) || 0;
  if (item.lineTotal != null && Number.isFinite(Number(item.lineTotal))) {
    return Number(item.lineTotal);
  }
  return Math.round(unit * qty * 100) / 100;
}

/** @returns {object} Normalized receipt payload */
export function normalizeReceiptData({
  business = {},
  documentLabel = 'Receipt',
  category = '',
  sale = {},
  lineItems = [],
  currencyCode,
}) {
  const pack = getBusinessRegionalPack(business);
  const settings =
    business?.settings && typeof business.settings === 'object'
      ? business.settings
      : {};
  const tax = settings?.tax || settings?.compliance || {};

  const resolvedCurrency = currencyCode || pack.currency || 'PKR';
  const taxId = business?.ntn || tax.ntn || tax.tax_id;
  const taxLineParts = [];
  if (taxId) taxLineParts.push(`${pack.taxIdLabel}: ${taxId}`);
  if (pack.countryIso === 'PK' && tax.srn) taxLineParts.push(`SRN: ${tax.srn}`);

  const ref =
    sale.invoice_number ||
    sale.transaction_number ||
    sale.saleNumber ||
    sale.invoiceNumber ||
    (sale.isDraft ? 'DRAFT' : 'N/A');

  const rows = (lineItems || []).map((item) => ({
    name: item.name || 'Item',
    sku: item.sku || null,
    quantity: Number(item.quantity) || 1,
    unitPrice: Number(item.unitPrice) || 0,
    amount: lineAmount(item),
  }));

  const computedSubtotal = rows.reduce(
    (s, r) => s + r.unitPrice * r.quantity,
    0
  );
  const subtotal = sale.subtotal != null ? Number(sale.subtotal) : computedSubtotal;
  const taxAmount = Number(sale.taxAmount ?? sale.tax_amount ?? 0);
  const discountAmount = Number(sale.discountAmount ?? sale.discount_amount ?? 0);
  const total =
    sale.total != null
      ? Number(sale.total)
      : Math.round((subtotal + taxAmount - discountAmount) * 100) / 100;

  return {
    businessName: business?.business_name || business?.name || 'Tenvo Business',
    address: business?.address || '',
    phone: business?.phone || '',
    taxLine: taxLineParts.join(' · '),
    documentLabel: String(documentLabel || 'Receipt'),
    categoryLabel: category ? category.replace(/-/g, ' ') : '',
    currencyCode: resolvedCurrency,
    taxLabel: pack.taxLabel || 'Tax',
    locale: pack.locale || 'en',
    ref,
    date: new Date(sale.date || Date.now()).toLocaleString(pack.locale || undefined),
    customerName: sale.customerName || sale.customer_name || null,
    paymentMethod: String(sale.paymentMethod || sale.payment_method || 'cash').toUpperCase(),
    rows,
    subtotal,
    taxAmount,
    discountAmount,
    total,
    amountTendered:
      sale.amountTendered != null && sale.amountTendered !== ''
        ? Number(sale.amountTendered)
        : null,
    changeDue: sale.changeDue != null ? Number(sale.changeDue) : null,
    isDraft: Boolean(sale.isDraft),
  };
}

export function buildReceiptFilename(data, ext = 'pdf') {
  const slug = String(data.ref || 'receipt')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
  return `${slug || 'receipt'}.${ext}`;
}

const RECEIPT_STYLES = `
  @page { size: 58mm auto; margin: 2mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 54mm;
    max-width: 54mm;
    margin: 0 auto;
    padding: 3mm 2.5mm 5mm;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 9px;
    line-height: 1.4;
    color: #111;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .title { font-size: 11px; margin-bottom: 1mm; }
  .small { font-size: 8px; color: #444; }
  .muted { color: #666; }
  .meta { margin: 2mm 0; }
  .meta-row { display: flex; justify-content: space-between; gap: 2mm; font-size: 8.5px; }
  .meta-row span:first-child { color: #555; flex-shrink: 0; }
  .meta-row span:last-child { text-align: right; word-break: break-word; }
  hr {
    border: none;
    border-top: 1px dashed #999;
    margin: 2.5mm 0;
  }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .items thead th {
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    padding: 1mm 0 1.5mm;
    border-bottom: 1px solid #333;
  }
  .items th.col-item, .items td.col-item { text-align: left; width: 58%; }
  .items th.col-qty, .items td.col-qty { text-align: right; width: 14%; }
  .items th.col-amt, .items td.col-amt { text-align: right; width: 28%; }
  .items tbody td {
    vertical-align: top;
    padding: 1.5mm 0;
    font-size: 8.5px;
    border-bottom: 1px dotted #ddd;
  }
  .items tbody tr:last-child td { border-bottom: none; }
  .item-name { font-weight: 600; line-height: 1.25; word-wrap: break-word; }
  .item-sku { font-size: 7.5px; color: #666; margin-top: 0.5mm; }
  .totals { margin-top: 2mm; font-size: 8.5px; }
  .totals td { padding: 0.8mm 0; vertical-align: top; }
  .totals td.label { text-align: left; color: #444; width: 55%; }
  .totals td.value { text-align: right; width: 45%; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .totals tr.grand td { font-weight: 800; font-size: 11px; padding-top: 2mm; border-top: 1px solid #333; }
  .totals tr.grand td.value { color: #111; }
  .footer { margin-top: 3mm; text-align: center; font-size: 8.5px; }
  .footer .thanks { font-weight: 600; margin-bottom: 1mm; }
`;

/**
 * @param {object} opts — same as normalizeReceiptData
 */
export function buildThermalReceiptHtml(opts) {
  const d = normalizeReceiptData(opts);

  const itemRows = d.rows
    .map(
      (row) => `
    <tr>
      <td class="col-item">
        <div class="item-name">${esc(row.name)}</div>
        ${row.sku ? `<div class="item-sku">${esc(row.sku)}</div>` : ''}
      </td>
      <td class="col-qty">${esc(String(row.quantity))}</td>
      <td class="col-amt">${esc(moneyNum(row.amount))}</td>
    </tr>`
    )
    .join('');

  const totalRows = [
    d.subtotal != null
      ? `<tr><td class="label">Subtotal</td><td class="value">${esc(money(d.subtotal, d.currencyCode, d.locale))}</td></tr>`
      : '',
    d.taxAmount > 0
      ? `<tr><td class="label">${esc(d.taxLabel)}</td><td class="value">${esc(money(d.taxAmount, d.currencyCode, d.locale))}</td></tr>`
      : '',
    d.discountAmount > 0
      ? `<tr><td class="label">Discount</td><td class="value">-${esc(money(d.discountAmount, d.currencyCode, d.locale))}</td></tr>`
      : '',
    `<tr class="grand"><td class="label">TOTAL</td><td class="value">${esc(money(d.total, d.currencyCode, d.locale))}</td></tr>`,
    d.amountTendered != null
      ? `<tr><td class="label">Tendered</td><td class="value">${esc(money(d.amountTendered, d.currencyCode, d.locale))}</td></tr>`
      : '',
    d.changeDue != null && d.changeDue >= 0
      ? `<tr><td class="label">Change</td><td class="value">${esc(money(d.changeDue, d.currencyCode, d.locale))}</td></tr>`
      : '',
  ]
    .filter(Boolean)
    .join('');

  const metaRows = [
    ['Ref', d.ref],
    ['Date', d.date],
    d.customerName ? ['Customer', d.customerName] : null,
    ['Payment', d.paymentMethod],
  ]
    .filter(Boolean)
    .map(
      ([label, value]) =>
        `<div class="meta-row"><span>${esc(label)}</span><span>${esc(value)}</span></div>`
    )
    .join('');

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<title>${esc(d.documentLabel)}</title>
<style>${RECEIPT_STYLES}</style>
</head><body>
  <div class="center bold title">${esc(d.businessName)}</div>
  ${d.address ? `<div class="center small">${esc(d.address)}</div>` : ''}
  ${d.taxLine ? `<div class="center small">${esc(d.taxLine)}</div>` : ''}
  ${d.phone ? `<div class="center small">${esc(d.phone)}</div>` : ''}
  <hr/>
  <div class="center bold">${esc(d.documentLabel.toUpperCase())}</div>
  ${d.categoryLabel ? `<div class="center small muted">${esc(d.categoryLabel)}</div>` : ''}
  <div class="meta">${metaRows}</div>
  <hr/>
  <table class="items">
    <thead>
      <tr>
        <th class="col-item">Item</th>
        <th class="col-qty">Qty</th>
        <th class="col-amt">Amt</th>
      </tr>
    </thead>
    <tbody>${itemRows || '<tr><td colspan="3" class="center muted">No items</td></tr>'}</tbody>
  </table>
  <hr/>
  <table class="totals"><tbody>${totalRows}</tbody></table>
  <hr/>
  <div class="footer">
    <div class="thanks">Thank you for your business!</div>
    <div class="small muted">Powered by Tenvo</div>
  </div>
</body></html>`;
}

const PRINT_FRAME_ID = 'tenvo-receipt-print-frame';

/** Print via hidden iframe — no pop-up blocker. */
export function printThermalReceiptHtml(html) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  let iframe = document.getElementById(PRINT_FRAME_ID);
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = PRINT_FRAME_ID;
    iframe.setAttribute('title', 'Receipt print');
    iframe.style.cssText =
      'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(iframe);
  }

  const win = iframe.contentWindow;
  if (!win) return false;

  const doc = win.document;
  doc.open();
  doc.write(html);
  doc.close();

  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      /* ignore */
    }
  };

  if (win.document.readyState === 'complete') {
    setTimeout(triggerPrint, 120);
  } else {
    iframe.onload = () => setTimeout(triggerPrint, 120);
  }

  return true;
}

/** Direct PDF download (58mm thermal layout). */
export async function downloadThermalReceiptPdf(opts) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const d = normalizeReceiptData(opts);
  const margin = 2;
  const pageW = 58;
  const contentW = pageW - margin * 2;

  let estHeight = 48 + d.rows.length * 8 + 28;
  estHeight = Math.min(Math.max(estHeight, 55), 280);

  const doc = new jsPDF({
    unit: 'mm',
    format: [pageW, estHeight],
    orientation: 'portrait',
    compress: true,
  });

  let y = margin + 2;

  const line = (text, opts2 = {}) => {
    const { size = 7, style = 'normal', align = 'left', bold = false } = opts2;
    doc.setFont('courier', bold ? 'bold' : style);
    doc.setFontSize(size);
    const x = align === 'center' ? pageW / 2 : align === 'right' ? pageW - margin : margin;
    doc.text(String(text), x, y, { align, maxWidth: contentW });
    y += size * 0.42 + 1.2;
  };

  line(d.businessName, { size: 10, align: 'center', bold: true });
  if (d.address) line(d.address, { size: 7, align: 'center' });
  if (d.taxLine) line(d.taxLine, { size: 7, align: 'center' });
  if (d.phone) line(d.phone, { size: 7, align: 'center' });

  y += 1;
  doc.setDrawColor(160);
  doc.line(margin, y, pageW - margin, y);
  y += 3.5;

  line(d.documentLabel.toUpperCase(), { size: 9, align: 'center', bold: true });
  if (d.categoryLabel) line(d.categoryLabel, { size: 7, align: 'center' });

  y += 0.5;
  for (const [label, value] of [
    ['Ref', d.ref],
    ['Date', d.date],
    ...(d.customerName ? [['Customer', d.customerName]] : []),
    ['Payment', d.paymentMethod],
  ]) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.text(`${label}:`, margin, y);
    doc.text(String(value), pageW - margin, y, { align: 'right', maxWidth: contentW * 0.62 });
    y += 3.2;
  }

  y += 1;
  doc.line(margin, y, pageW - margin, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    head: [['Item', 'Qty', 'Amt']],
    body: d.rows.map((row) => [
      row.sku ? `${row.name}\n${row.sku}` : row.name,
      String(row.quantity),
      moneyNum(row.amount),
    ]),
    theme: 'plain',
    styles: {
      font: 'courier',
      fontSize: 7,
      cellPadding: 0.7,
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      fontStyle: 'bold',
      fillColor: false,
      textColor: 20,
      lineWidth: { bottom: 0.15 },
      lineColor: [0, 0, 0],
    },
    bodyStyles: { fillColor: false, textColor: 20 },
    columnStyles: {
      0: { cellWidth: contentW * 0.56, halign: 'left' },
      1: { cellWidth: contentW * 0.14, halign: 'right' },
      2: { cellWidth: contentW * 0.30, halign: 'right' },
    },
  });

  y = doc.lastAutoTable.finalY + 3;
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  for (const [label, value] of [
    ['Subtotal', money(d.subtotal, d.currencyCode, d.locale)],
    ...(d.taxAmount > 0 ? [[d.taxLabel, money(d.taxAmount, d.currencyCode, d.locale)]] : []),
    ...(d.discountAmount > 0 ? [['Discount', `-${money(d.discountAmount, d.currencyCode, d.locale)}`]] : []),
    ['TOTAL', money(d.total, d.currencyCode, d.locale)],
    ...(d.amountTendered != null ? [['Tendered', money(d.amountTendered, d.currencyCode, d.locale)]] : []),
    ...(d.changeDue != null && d.changeDue >= 0 ? [['Change', money(d.changeDue, d.currencyCode, d.locale)]] : []),
  ]) {
    const isGrand = label === 'TOTAL';
    doc.setFont('courier', isGrand ? 'bold' : 'normal');
    doc.setFontSize(isGrand ? 9 : 7.5);
    doc.text(label, margin, y);
    doc.text(String(value), pageW - margin, y, { align: 'right' });
    y += isGrand ? 5 : 3.5;
  }

  y += 2;
  doc.line(margin, y, pageW - margin, y);
  y += 4;
  line('Thank you for your business!', { size: 8, align: 'center', bold: true });
  line('Powered by Tenvo', { size: 7, align: 'center' });

  doc.save(buildReceiptFilename(d, 'pdf'));
  return true;
}

/**
 * @param {object} opts — receipt build options
 * @param {'print'|'pdf'} [mode='print']
 */
export async function dispatchThermalReceipt(opts, mode = 'print') {
  if (mode === 'pdf') {
    if (typeof window === 'undefined') return false;
    await downloadThermalReceiptPdf(opts);
    return true;
  }
  const html = buildThermalReceiptHtml(opts);
  return printThermalReceiptHtml(html);
}
