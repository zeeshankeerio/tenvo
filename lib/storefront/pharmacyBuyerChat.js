import { formatCurrency } from '@/lib/currency';
import { resolveStoreContact } from '@/lib/storefront/businessContact';
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { PHARMACY_SYMPTOM_GUIDES } from '@/lib/storefront/pharmacySymptomGuides';

const PHARMACY_CANONICAL = 'pharmacy';

const PHARMACY_DISCLAIMER =
  'This assistant shares general wellness guidance only — not a diagnosis. For emergencies or serious symptoms, contact a doctor or visit the nearest hospital.';

function clipMessage(text, max = 500) {
  if (typeof text !== 'string') return '';
  return text.trim().slice(0, max);
}

/**
 * @param {string | null | undefined} category
 */
export function isPharmacyStoreCategory(category) {
  return resolveDomainKey(category) === PHARMACY_CANONICAL;
}

/**
 * @param {string} storeName
 */
export function buildPharmacyBuyerChatGreeting(storeName) {
  const name = storeName || 'our pharmacy';
  return [
    `Hello! I'm the ${name} health assistant.`,
    'Tell me your symptoms or ask about medicines, prescriptions, refills, or delivery.',
    '',
    PHARMACY_DISCLAIMER,
  ].join('\n');
}

function matchSymptomGuide(message) {
  const m = message.toLowerCase();
  for (const guide of PHARMACY_SYMPTOM_GUIDES) {
    if (guide.patterns.some((pattern) => pattern.test(m))) {
      return guide;
    }
  }
  return null;
}

/**
 * Pharmacy-aware public buyer chat — rule-based, tenant-scoped, no cross-tenant DB access.
 *
 * @param {{
 *   business: Record<string, unknown>,
 *   settings: Record<string, unknown>,
 *   businessDomain: string,
 *   message: string,
 * }} args
 */
export function buildPharmacyBuyerChatReply({ business, settings, businessDomain, message }) {
  const contact = resolveStoreContact({ business, settings });
  const storeName = contact.storeName;
  const currency = settings?.currency || business?.currency || 'PKR';
  const freeShipping = settings?.freeShippingThreshold || 2000;
  const returnDays = settings?.returnPolicyDays || 7;
  const productsPath = `/store/${businessDomain}/products`;
  const ordersPath = `/store/${businessDomain}/orders`;
  const contactPath = `/store/${businessDomain}/contact`;

  const m = clipMessage(message).toLowerCase();
  if (!m) {
    return buildPharmacyBuyerChatGreeting(storeName);
  }

  if (/\b(hi|hello|hey|salaam|salam|assalam)\b/.test(m)) {
    return `Hello! How can I help with your health or order at ${storeName} today?\n\n${PHARMACY_DISCLAIMER}`;
  }

  const symptomGuide = matchSymptomGuide(m);
  if (symptomGuide) {
    const categoryUrl = `${productsPath}?category=${encodeURIComponent(symptomGuide.slug)}`;
    const lines = [
      symptomGuide.reply,
      '',
      `Browse suggested products: ${categoryUrl}`,
    ];
    if (symptomGuide.rxNote) {
      lines.push('', symptomGuide.rxNote);
    }
    lines.push('', PHARMACY_DISCLAIMER);
    return lines.join('\n');
  }

  if (/\b(prescription|rx\b|schedule h|upload rx|doctor note)\b/.test(m)) {
    return [
      'Prescription medicines require a valid Rx before dispatch.',
      `Upload your prescription securely: ${contactPath}?prescription=1`,
      'Our licensed pharmacists verify every Rx order, usually within about 2 hours on business days.',
      '',
      PHARMACY_DISCLAIMER,
    ].join('\n');
  }

  if (/\b(refill|repeat order|monthly medicine|chronic)\b/.test(m)) {
    return [
      'We can set refill reminders for chronic care medicines.',
      `Start here: ${contactPath}?refill=1`,
      'Share medicine names, quantity, and how often you refill so our team can follow up.',
      '',
      PHARMACY_DISCLAIMER,
    ].join('\n');
  }

  if (/\b(generic|alternative|substitute|cheaper)\b/.test(m)) {
    return [
      'Many brands have generic alternatives with the same active ingredient.',
      `Search by generic name on ${productsPath} or message our pharmacist via ${contactPath}`,
      'We can suggest options that match your prescription when applicable.',
    ].join('\n');
  }

  if (/\b(interaction|mix|combine|take together|safe with)\b/.test(m)) {
    return [
      'Medicine interactions depend on your full prescription history and health profile.',
      `Please contact our pharmacist: ${contactPath}`,
      'Share all medicines you take so we can review before you order.',
      '',
      PHARMACY_DISCLAIMER,
    ].join('\n');
  }

  if (/\b(vitamin|supplement|immunity|multivitamin)\b/.test(m)) {
    return [
      'Browse vitamins and supplements on our store.',
      `${productsPath}?category=${encodeURIComponent('vitamins')}`,
      'For chronic deficiency or prescription supplements, ask our pharmacist for guidance.',
    ].join('\n');
  }

  if (/\b(baby|infant|diaper|formula|pregnancy|mother)\b/.test(m)) {
    return [
      'Explore mother and baby care essentials.',
      `${productsPath}?category=${encodeURIComponent('mother-baby')}`,
    ].join('\n');
  }

  if (/\b(diabetes|blood sugar|glucose|metformin|insulin)\b/.test(m)) {
    return [
      'Diabetes care products include monitors, strips, and prescription medicines.',
      `${productsPath}?category=${encodeURIComponent('diabetes-care')}`,
      'Prescription items such as metformin require a valid Rx upload before dispatch.',
      '',
      PHARMACY_DISCLAIMER,
    ].join('\n');
  }

  if (/\b(skin|acne|derma|sunscreen|rash|eczema)\b/.test(m)) {
    return [
      'Browse skincare and derma essentials.',
      `${productsPath}?category=${encodeURIComponent('skincare')}`,
    ].join('\n');
  }

  if (/\b(antibiotic|infection|augmentin|amoxicillin)\b/.test(m)) {
    return [
      'Antibiotics are prescription-only in most cases.',
      `Browse the category: ${productsPath}?category=${encodeURIComponent('antibiotics')}`,
      `Upload your Rx: ${contactPath}?prescription=1`,
      '',
      PHARMACY_DISCLAIMER,
    ].join('\n');
  }

  if (/\b(price|cost|how much|rate|mrp)\b/.test(m)) {
    return 'Prices are listed on each product page. Search by brand or generic name to compare options.';
  }

  if (/\b(ship|deliver|delivery|shipping)\b/.test(m)) {
    return `Free shipping may apply over ${formatCurrency(freeShipping, currency)}. Standard delivery is typically 3–5 business days. See /store/${businessDomain}/shipping for details.`;
  }

  if (/\b(return|refund|exchange|replace)\b/.test(m)) {
    return `${returnDays}-day returns on unopened, non-prescription items in original packaging where policy allows. Prescription medicines may not be returnable once dispensed — contact us for help.`;
  }

  if (/\b(pay|payment|cod|card|jazzcash|easypaisa)\b/.test(m)) {
    return 'We accept card payments and cash on delivery where enabled. Payment options appear at checkout.';
  }

  if (/\b(order|track|status|where is my)\b/.test(m)) {
    return `Track your order at ${ordersPath} using the email from checkout.`;
  }

  if (/\b(stock|available|in stock|out of stock)\b/.test(m)) {
    return 'Stock status is shown on each product page. If an item is unavailable, check back later or contact us for alternatives.';
  }

  if (/\b(contact|human|agent|pharmacist|speak|talk|email|phone|whatsapp)\b/.test(m)) {
    const parts = [];
    if (contact.phone) parts.push(`call ${contact.phone}`);
    if (contact.email) parts.push(`email ${contact.email}`);
    if (contact.whatsappUrl) parts.push('WhatsApp (link on our contact page)');
    if (parts.length) {
      return `Reach ${storeName}: ${parts.join(', ')}. Full details: ${contactPath}`;
    }
    return `Message our pharmacist: ${contactPath}`;
  }

  if (/\b(thank|thanks|thx|shukriya)\b/.test(m)) {
    return "You're welcome! Stay well — ask anytime about symptoms, refills, or orders.";
  }

  if (/\b(bye|goodbye)\b/.test(m)) {
    return 'Thanks for visiting. Take care!';
  }

  const quickTopics = PHARMACY_SYMPTOM_GUIDES.slice(0, 4)
    .map((g) => `• ${g.label}`)
    .join('\n');

  return [
    `I'm the ${storeName} health assistant. I can help with:`,
    quickTopics,
    '• Prescription upload & refills',
    '• Delivery, returns, and order tracking',
    '• Speaking with a pharmacist',
    '',
    `Shop: ${productsPath}`,
    `Pharmacist: ${contactPath}`,
    '',
    PHARMACY_DISCLAIMER,
  ].join('\n');
}
