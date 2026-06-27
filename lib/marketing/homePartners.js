/**
 * Homepage integration marquee — honest labels from capabilities catalog.
 */
import {
  CAPABILITY_STATUS_LABEL,
  INTEGRATIONS_CATALOG,
} from '@/lib/marketing/capabilities';

/** Curated subset for homepage marquee (payments, commerce, local ops). */
const HOME_PARTNER_NAMES = [
  'Stripe',
  'Resend',
  'JazzCash & EasyPaisa',
  'Shopify',
  'Daraz',
  'WooCommerce',
  'WhatsApp',
  'NOWPayments',
  'REST API & webhooks',
];

/** @type {Array<{ name: string; category: string; status: string; statusLabel: string }>} */
export const HOME_INTEGRATION_PARTNERS = HOME_PARTNER_NAMES.map((partnerName) => {
  const item = INTEGRATIONS_CATALOG.find((entry) => entry.name === partnerName);
  if (!item) return null;
  return {
    name: item.name === 'JazzCash & EasyPaisa' ? 'JazzCash / EasyPaisa' : item.name,
    category: item.category,
    status: item.status,
    statusLabel: CAPABILITY_STATUS_LABEL[item.status],
  };
}).filter(Boolean);
