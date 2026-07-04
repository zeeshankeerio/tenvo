import { resolveStoreContact } from '@/lib/storefront/businessContact';
import { formatCurrency } from '@/lib/currency';
import {
  buildPharmacyBuyerChatGreeting,
  buildPharmacyBuyerChatReply,
  isPharmacyStoreCategory,
} from '@/lib/storefront/pharmacyBuyerChat';

function clipMessage(text, max = 500) {
  if (typeof text !== 'string') return '';
  return text.trim().slice(0, max);
}

/**
 * Public storefront buyer chat, rule-based, no ERP/tenant DB access.
 * Business is resolved server-side from URL domain only.
 *
 * @param {{
 *   business: Record<string, unknown>,
 *   settings: Record<string, unknown>,
 *   businessDomain: string,
 *   message: string,
 * }} args
 */
export function buildPublicBuyerChatReply({ business, settings, businessDomain, message }) {
  if (isPharmacyStoreCategory(business?.category)) {
    return buildPharmacyBuyerChatReply({ business, settings, businessDomain, message });
  }

  const contact = resolveStoreContact({ business, settings });
  const storeName = contact.storeName;
  const currency = settings?.currency || business?.currency || 'PKR';
  const freeShipping = settings?.freeShippingThreshold || 2000;
  const returnDays = settings?.returnPolicyDays || 7;
  const ordersPath = `/store/${businessDomain}/orders`;
  const contactPath = `/store/${businessDomain}/contact`;

  const m = clipMessage(message).toLowerCase();
  if (!m) {
    return `Hi! I'm the ${storeName} assistant. Ask about shipping, returns, orders, or how to reach us.`;
  }

  if (/\b(hi|hello|hey|salaam|salam)\b/.test(m)) {
    return `Hello! How can I help you at ${storeName} today?`;
  }
  if (/\b(price|cost|how much|rate)\b/.test(m)) {
    return 'Prices are on each product page. Use search or browse categories to find items.';
  }
  if (/\b(ship|deliver|delivery|shipping)\b/.test(m)) {
    return `Free shipping on orders over ${formatCurrency(freeShipping, currency)}. Standard delivery is typically 3-5 business days. See /store/${businessDomain}/shipping for details.`;
  }
  if (/\b(return|refund|exchange|replace)\b/.test(m)) {
    return `${returnDays}-day returns on unused items in original packaging. Visit our returns page or contact us to start a return.`;
  }
  if (/\b(pay|payment|cod|card|jazzcash|easypaisa)\b/.test(m)) {
    return 'We accept card payments and cash on delivery where enabled. Payment options appear at checkout.';
  }
  if (/\b(order|track|status|where)\b/.test(m)) {
    return `Track your order at ${ordersPath}, enter the email you used at checkout.`;
  }
  if (/\b(stock|available|in stock)\b/.test(m)) {
    return 'Stock status is shown on each product page. If something is out of stock, check back later or message us.';
  }
  if (/\b(discount|promo|coupon|offer|sale)\b/.test(m)) {
    return 'See our Sale section for current deals. Promotions apply automatically at checkout when eligible.';
  }
  if (/\b(contact|human|agent|speak|talk|email|phone|whatsapp)\b/.test(m)) {
    const parts = [];
    if (contact.phone) parts.push(`call ${contact.phone}`);
    if (contact.email) parts.push(`email ${contact.email}`);
    if (contact.whatsappUrl) parts.push('WhatsApp (link on our contact page)');
    if (parts.length) {
      return `Reach ${storeName}: ${parts.join(', ')}. Full details: ${contactPath}`;
    }
    return `Message us via our contact form: ${contactPath}`;
  }
  if (/\b(thank|thanks|thx)\b/.test(m)) {
    return "You're welcome! Anything else I can help with?";
  }
  if (/\b(bye|goodbye|ciao)\b/.test(m)) {
    return 'Thanks for visiting. Come back anytime!';
  }

  return [
    `I'm the ${storeName} shopping assistant, I can help with:`,
    '• Shipping & delivery',
    '• Returns & refunds',
    '• Payment methods',
    '• Order tracking',
    '• Contacting the store',
    '',
    `For order lookup: ${ordersPath}`,
    `For direct help: ${contactPath}`,
  ].join('\n');
}

export function buildPublicBuyerChatGreeting(storeName, businessCategory) {
  if (isPharmacyStoreCategory(businessCategory)) {
    return buildPharmacyBuyerChatGreeting(storeName);
  }
  const name = storeName || 'our store';
  return `Hi there! Welcome to ${name}. How can I help you today?`;
}
