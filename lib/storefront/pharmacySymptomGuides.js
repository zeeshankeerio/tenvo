/**
 * Symptom → category routing for pharmacy storefront assistant.
 * Rule-based only — not a clinical diagnosis engine.
 *
 * @typedef {{
 *   id: string,
 *   label: string,
 *   slug: string,
 *   patterns: RegExp[],
 *   reply: string,
 *   rxNote?: string,
 * }} PharmacySymptomGuide
 */

/** @type {PharmacySymptomGuide[]} */
export const PHARMACY_SYMPTOM_GUIDES = [
  {
    id: 'pain-fever',
    label: 'Headache & fever',
    slug: 'pain-relief',
    patterns: [/\b(headache|migraine|fever|body ache|pain|panadol|paracetamol|ibuprofen)\b/],
    reply:
      'For headache, fever, or general pain, OTC analgesics such as paracetamol or ibuprofen are commonly used. Choose a product suited to your age and medical history.',
  },
  {
    id: 'cold-flu',
    label: 'Cold & flu',
    slug: 'cough-cold',
    patterns: [/\b(cold|flu|cough|sneeze|runny nose|congestion|blocked nose|sore throat)\b/],
    reply:
      'Cold and flu relief products can help with congestion, cough, and fever symptoms. Rest and hydration are important too.',
  },
  {
    id: 'stomach',
    label: 'Stomach & digestion',
    slug: 'personal-care',
    patterns: [/\b(stomach|nausea|vomit|diarrhea|diarrhoea|indigestion|heartburn|acidity|gas)\b/],
    reply:
      'Digestive discomfort may respond to antacids or ORS products. If symptoms persist beyond 48 hours or include blood, seek medical care promptly.',
  },
  {
    id: 'skin',
    label: 'Skin & acne',
    slug: 'skincare',
    patterns: [/\b(acne|pimple|rash|eczema|dry skin|itch|derma|sunburn)\b/],
    reply:
      'Skincare and derma products can support acne, dryness, and daily sun protection. Patch-test new products if you have sensitive skin.',
  },
  {
    id: 'diabetes',
    label: 'Diabetes care',
    slug: 'diabetes-care',
    patterns: [/\b(diabetes|blood sugar|glucose|metformin|insulin|hba1c)\b/],
    reply:
      'Diabetes care includes glucose monitors, test strips, and prescribed medicines. Regular monitoring helps you stay on track.',
    rxNote: 'Prescription diabetes medicines require a valid Rx upload before dispatch.',
  },
  {
    id: 'bp-heart',
    label: 'Blood pressure & heart',
    slug: 'chronic-care',
    patterns: [/\b(blood pressure|hypertension|bp\b|heart|cholesterol|cardiac)\b/],
    reply:
      'Chronic care medicines for blood pressure or heart conditions should be taken only as prescribed. Never stop or change dose without your doctor.',
    rxNote: 'These medicines require a valid prescription and pharmacist verification.',
  },
  {
    id: 'baby',
    label: 'Mother & baby',
    slug: 'mother-baby',
    patterns: [/\b(baby|infant|newborn|diaper|formula|pregnancy|breastfeed|mother)\b/],
    reply:
      'Mother and baby products include gentle cleansers, diapers, and formula. Choose age-appropriate items and follow paediatric guidance when unsure.',
  },
  {
    id: 'immunity',
    label: 'Vitamins & immunity',
    slug: 'vitamins',
    patterns: [/\b(vitamin|immunity|multivitamin|supplement|iron|calcium|zinc|b12)\b/],
    reply:
      'Vitamins and supplements can support daily nutrition. Blood tests help identify specific deficiencies before high-dose supplementation.',
  },
  {
    id: 'sleep',
    label: 'Sleep & rest',
    slug: 'sleep',
    patterns: [/\b(sleep|insomnia|can.?t sleep|restless|melatonin)\b/],
    reply:
      'Sleep support products may help mild restlessness. Persistent insomnia warrants a medical review rather than long-term self-medication.',
  },
  {
    id: 'first-aid',
    label: 'First aid',
    slug: 'first-aid',
    patterns: [/\b(cut|wound|burn|plaster|bandage|first aid|minor injury)\b/],
    reply:
      'First aid essentials include antiseptics, plasters, and dressings for minor cuts and grazes. Seek urgent care for deep wounds or severe burns.',
  },
];
