/**
 * Fashion-specific seasonality intelligence for AI restock and forecasting.
 * Enhances demand prediction for clothing/textile verticals with Pakistani market context.
 */

import { resolveDomainKey } from '../config/domainKeyAliases.js';

/** Fashion/textile canonical keys that benefit from enhanced seasonality. */
export const FASHION_SEASONALITY_DOMAINS = new Set([
  'garments',
  'boutique-fashion',
  'textile-wholesale',
  'textile-mill',
  'leather-footwear',
  'gems-jewellery',
]);

/**
 * @typedef {Object} SeasonalPeriod
 * @property {string} name
 * @property {number} startMonth - 1-indexed (1=January)
 * @property {number} endMonth
 * @property {number} demandMultiplier - 1.0 = baseline, 2.5 = 150% increase
 * @property {string[]} categories - Affected product categories
 * @property {string} insight
 */

/** @type {SeasonalPeriod[]} */
export const FASHION_SEASONAL_PERIODS = [
  {
    name: 'Eid ul-Fitr Peak',
    startMonth: 4, // April
    endMonth: 5, // May
    demandMultiplier: 2.5, // 150% increase
    categories: ['Lawn', 'Cotton', 'Unstitched', 'Ready-to-Wear', 'Kids Wear', 'Accessories'],
    insight: 'Eid ul-Fitr drives peak demand for lawn, cotton suits, and ready-to-wear. Stock up 6-8 weeks early.'
  },
  {
    name: 'Eid ul-Adha Peak',
    startMonth: 6, // June
    endMonth: 7, // July
    demandMultiplier: 2.2, // 120% increase
    categories: ['Formal', 'Traditional', 'Unstitched', 'Mens Wear', 'Bridal Collection'],
    insight: 'Second Eid peak for formals and traditional wear. Demand is strong but slightly lower than Eid ul-Fitr.'
  },
  {
    name: 'Wedding Season Peak',
    startMonth: 11, // November
    endMonth: 1, // January (wraps to next year)
    demandMultiplier: 3.0, // 200% increase
    categories: ['Bridal Collection', 'Formal', 'Chiffon', 'Silk', 'Embroidered', 'Mens Wear', 'Jewelry'],
    insight: 'Peak wedding season in Pakistan. Bridal and luxury formals see highest demand. Pre-orders start in October.'
  },
  {
    name: 'Summer Collection Launch',
    startMonth: 3, // March
    endMonth: 3, // March
    demandMultiplier: 1.5, // 50% increase
    categories: ['Lawn', 'Cotton', 'Summer Collection', 'Light Fabrics'],
    insight: 'Summer collection launches drive demand for light fabrics and lawn. Retailers stock up ahead of Eid.'
  },
  {
    name: 'Winter Collection Launch',
    startMonth: 10, // October
    endMonth: 10, // October
    demandMultiplier: 1.6, // 60% increase
    categories: ['Khaddar', 'Karandi', 'Wool', 'Winter Collection', 'Outerwear', 'Formal'],
    insight: 'Winter collection launch coincides with wedding season prep. Khaddar and karandi fabrics in high demand.'
  },
  {
    name: 'Ramadan Prep',
    startMonth: 3, // March (typically)
    endMonth: 4, // April
    demandMultiplier: 2.0, // 100% increase
    categories: ['Unstitched', 'Lawn', 'Cotton', 'Formal', 'Traditional', 'Kids Wear'],
    insight: 'Ramadan and Eid shopping combined. Families purchase multiple outfits for the month and Eid.'
  },
];

/**
 * Check if a given date falls within a seasonal peak for fashion.
 * @param {Date} date
 * @param {string} [category] - Product category to check (optional)
 * @returns {{ inPeak: boolean; period: SeasonalPeriod | null; multiplier: number }}
 */
export function getFashionSeasonalMultiplier(date, category = null) {
  const month = date.getMonth() + 1; // 1-indexed
  
  for (const period of FASHION_SEASONAL_PERIODS) {
    let inRange = false;
    
    // Handle year-wrap (e.g., November to January)
    if (period.endMonth < period.startMonth) {
      inRange = month >= period.startMonth || month <= period.endMonth;
    } else {
      inRange = month >= period.startMonth && month <= period.endMonth;
    }
    
    if (inRange) {
      // If category provided, check if it's affected
      if (category) {
        const normalizedCat = String(category || '').trim();
        const matchesCategory = period.categories.some(c => 
          normalizedCat.toLowerCase().includes(c.toLowerCase())
        );
        if (!matchesCategory) continue;
      }
      
      return {
        inPeak: true,
        period,
        multiplier: period.demandMultiplier,
      };
    }
  }
  
  return { inPeak: false, period: null, multiplier: 1.0 };
}

/**
 * Get the next upcoming seasonal peak for planning purposes.
 * @param {Date} currentDate
 * @returns {{ nextPeriod: SeasonalPeriod | null; weeksUntil: number; shouldPrepare: boolean }}
 */
export function getNextFashionPeak(currentDate) {
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  let nearestPeriod = null;
  let minWeeks = Infinity;
  
  for (const period of FASHION_SEASONAL_PERIODS) {
    // Calculate weeks until this period starts
    let targetDate = new Date(currentYear, period.startMonth - 1, 1);
    
    // If the period has already passed this year, check next year
    if (targetDate < currentDate) {
      targetDate = new Date(currentYear + 1, period.startMonth - 1, 1);
    }
    
    const weeksUntil = Math.ceil((targetDate - currentDate) / (7 * 24 * 60 * 60 * 1000));
    
    if (weeksUntil < minWeeks) {
      minWeeks = weeksUntil;
      nearestPeriod = period;
    }
  }
  
  return {
    nextPeriod: nearestPeriod,
    weeksUntil: minWeeks,
    shouldPrepare: minWeeks <= 8, // Start preparing 8 weeks before peak
  };
}

/**
 * Enhance AI restock recommendations with fashion seasonality context.
 * @param {string} domainKey
 * @param {string} [category]
 * @param {number} baseQuantity
 * @param {Date} [forecastDate]
 * @returns {{ adjustedQuantity: number; insight: string; multiplier: number }}
 */
export function applyFashionSeasonalityToRestock(
  domainKey,
  category = null,
  baseQuantity,
  forecastDate = new Date()
) {
  const canonical = resolveDomainKey(domainKey);
  
  // Only apply to fashion domains
  if (!FASHION_SEASONALITY_DOMAINS.has(canonical)) {
    return {
      adjustedQuantity: baseQuantity,
      insight: '',
      multiplier: 1.0,
    };
  }
  
  // Check current seasonal multiplier
  const current = getFashionSeasonalMultiplier(forecastDate, category);
  
  // Check upcoming peak
  const next = getNextFashionPeak(forecastDate);
  
  let finalMultiplier = 1.0;
  let insight = '';
  
  if (current.inPeak) {
    finalMultiplier = current.multiplier;
    insight = `Currently in ${current.period.name}. ${current.period.insight}`;
  } else if (next.shouldPrepare && next.nextPeriod) {
    // Ramp up stock as we approach peak
    const rampMultiplier = 1.0 + ((next.nextPeriod.demandMultiplier - 1.0) * 0.5);
    finalMultiplier = rampMultiplier;
    insight = `Prepare for ${next.nextPeriod.name} in ${next.weeksUntil} weeks. ${next.nextPeriod.insight}`;
  }
  
  const adjustedQuantity = Math.ceil(baseQuantity * finalMultiplier);
  
  return {
    adjustedQuantity,
    insight,
    multiplier: finalMultiplier,
  };
}

/**
 * Get all relevant seasonal insights for a fashion business.
 * Used in Industry Insights dashboard.
 * @param {string} domainKey
 * @returns {{ currentPeriod: SeasonalPeriod | null; nextPeriod: SeasonalPeriod | null; weeksUntilNext: number; recommendations: string[] }}
 */
export function getFashionSeasonalInsights(domainKey) {
  const canonical = resolveDomainKey(domainKey);
  
  if (!FASHION_SEASONALITY_DOMAINS.has(canonical)) {
    return {
      currentPeriod: null,
      nextPeriod: null,
      weeksUntilNext: 0,
      recommendations: [],
    };
  }
  
  const now = new Date();
  const current = getFashionSeasonalMultiplier(now);
  const next = getNextFashionPeak(now);
  
  const recommendations = [];
  
  if (current.inPeak && current.period) {
    recommendations.push(
      `🔥 Peak Season Active: ${current.period.name}`,
      `Stock levels should be ${Math.round((current.multiplier - 1) * 100)}% higher than baseline`,
      current.period.insight
    );
  }
  
  if (next.shouldPrepare && next.nextPeriod) {
    recommendations.push(
      `📅 Upcoming: ${next.nextPeriod.name} in ${next.weeksUntilNext} weeks`,
      `Start stocking up now for affected categories: ${next.nextPeriod.categories.slice(0, 3).join(', ')}`,
      next.nextPeriod.insight
    );
  }
  
  // General fashion retail advice
  if (canonical === 'garments' || canonical === 'boutique-fashion') {
    recommendations.push(
      '💡 Launch pre-orders for seasonal collections 8-10 weeks before peak',
      '📦 Maintain 2x safety stock for fast-moving sizes (M, L) during peak seasons'
    );
  }
  
  if (canonical === 'textile-wholesale') {
    recommendations.push(
      '🏭 Lock in fabric prices from mills 10-12 weeks before Eid peaks',
      '📊 Monitor retailer orders for early demand signals'
    );
  }
  
  return {
    currentPeriod: current.period,
    nextPeriod: next.nextPeriod,
    weeksUntilNext: next.weeksUntil,
    recommendations,
  };
}

/**
 * Calculate fashion-aware safety stock multiplier.
 * Higher safety stock during volatile seasonal periods.
 * @param {string} domainKey
 * @param {string} [category]
 * @returns {number} Safety stock multiplier (1.5 = baseline, up to 2.5 for high season)
 */
export function getFashionSafetyStockMultiplier(domainKey, category = null) {
  const canonical = resolveDomainKey(domainKey);
  
  if (!FASHION_SEASONALITY_DOMAINS.has(canonical)) {
    return 1.5; // Standard safety stock
  }
  
  const now = new Date();
  const current = getFashionSeasonalMultiplier(now, category);
  const next = getNextFashionPeak(now);
  
  // During peak season: higher safety stock to avoid stockouts
  if (current.inPeak) {
    return 2.5;
  }
  
  // Approaching peak (within 8 weeks): ramp up safety stock
  if (next.shouldPrepare) {
    return 2.0;
  }
  
  // Off-season: standard safety stock
  return 1.5;
}

