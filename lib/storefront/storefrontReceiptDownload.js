/**
 * Storefront order receipt download (58mm thermal PDF for customers).
 * Used after order placement to provide printable purchase receipt.
 */
import { downloadThermalReceiptPdf } from '@/lib/print/thermalReceipt';

/**
 * Download 58mm thermal receipt PDF for a storefront order.
 * @param {object} params
 * @param {object} params.order - storefront_orders row with order details
 * @param {Array<object>} params.items - storefront_order_items rows
 * @param {object} params.business - businesses row with store info
 * @returns {Promise<boolean>} true if download succeeded
 */
export async function downloadStorefrontOrderReceipt({ order, items, business }) {
  if (!order || !business) {
    throw new Error('Order and business data required for receipt');
  }

  const lineItems = (items || []).map((item) => ({
    name: item.product_name || 'Item',
    sku: item.product_sku || item.metadata?.sku || null,
    quantity: Number(item.quantity) || 1,
    unitPrice: Number(item.unit_price) || 0,
    lineTotal: Number(item.total_price) || 0,
  }));

  const metadata = order.metadata && typeof order.metadata === 'object' ? order.metadata : {};

  await downloadThermalReceiptPdf({
    business: {
      business_name: business.business_name || business.name || 'Store',
      address: business.address || '',
      phone: business.phone || '',
      ntn: business.ntn || null,
      settings: business.settings || {},
      country: business.country || 'PK',
    },
    documentLabel: 'Order Receipt',
    category: business.category || 'retail-shop',
    sale: {
      invoice_number: order.order_number || 'N/A',
      date: order.created_at || new Date(),
      customerName: order.customer_name || null,
      subtotal: Number(order.subtotal) || 0,
      tax_amount: Number(order.tax_amount) || 0,
      discount_amount: Number(order.discount_amount) || 0,
      total: Number(order.total_amount) || 0,
      paymentMethod: metadata.payment_method || order.payment_method || 'cod',
      isDraft: false,
    },
    lineItems,
    currencyCode: order.currency || business.currency || 'PKR',
  });

  return true;
}

/**
 * Build receipt filename from order number.
 * @param {string} orderNumber
 * @returns {string}
 */
export function buildOrderReceiptFilename(orderNumber) {
  const slug = String(orderNumber || 'order')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
  return `${slug || 'order'}-receipt.pdf`;
}
