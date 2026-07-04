/**
 * Shared storefront shipping fee rules (checkout, cart, orders API).
 * Server is authoritative — client values are hints only.
 */

export const DEFAULT_STANDARD_SHIPPING_FEE = 150;
export const DEFAULT_EXPRESS_SHIPPING_FEE = 300;
export const DEFAULT_FREE_SHIPPING_THRESHOLD = 2000;

/**
 * Retail shipping for non-restaurant physical carts.
 * @param {{
 *   subtotal?: number,
 *   shippingMethod?: string,
 *   freeShippingThreshold?: number,
 *   standardFee?: number,
 *   expressFee?: number,
 * }} [opts]
 */
export function resolveRetailShippingCost({
  subtotal = 0,
  shippingMethod = 'standard',
  freeShippingThreshold = DEFAULT_FREE_SHIPPING_THRESHOLD,
  standardFee = DEFAULT_STANDARD_SHIPPING_FEE,
  expressFee = DEFAULT_EXPRESS_SHIPPING_FEE,
} = {}) {
  const method = String(shippingMethod || 'standard').trim().toLowerCase();
  if (method === 'pickup') return 0;
  if (method === 'express') return expressFee;
  return subtotal >= freeShippingThreshold ? 0 : standardFee;
}

/**
 * Read shipping settings from storefront business.settings.
 * @param {Record<string, unknown> | null | undefined} settings
 */
export function getStorefrontShippingSettings(settings) {
  const s = settings && typeof settings === 'object' ? settings : {};
  return {
    freeShippingThreshold:
      Number(s.freeShippingThreshold) > 0
        ? Number(s.freeShippingThreshold)
        : DEFAULT_FREE_SHIPPING_THRESHOLD,
    standardFee:
      Number(s.standardShippingFee) >= 0
        ? Number(s.standardShippingFee)
        : DEFAULT_STANDARD_SHIPPING_FEE,
    expressFee:
      Number(s.expressShippingFee) > 0
        ? Number(s.expressShippingFee)
        : DEFAULT_EXPRESS_SHIPPING_FEE,
  };
}

/**
 * Server-authoritative shipping for an order.
 * @param {{
 *   digitalOnlyOrder?: boolean,
 *   isRestaurant?: boolean,
 *   restaurantPickup?: boolean,
 *   normalizedRestaurantMode?: string | null,
 *   subtotal?: number,
 *   shippingMethod?: string,
 *   settings?: Record<string, unknown> | null,
 * }} params
 */
export function resolveStorefrontOrderShippingAmount({
  digitalOnlyOrder = false,
  isRestaurant = false,
  restaurantPickup = false,
  normalizedRestaurantMode = null,
  subtotal = 0,
  shippingMethod = 'standard',
  settings = null,
  resolveRestaurantShippingCost,
  restaurantOrderModeToShipping,
} = {}) {
  if (digitalOnlyOrder || restaurantPickup) return 0;

  const shipSettings = getStorefrontShippingSettings(settings);

  if (isRestaurant && normalizedRestaurantMode && resolveRestaurantShippingCost) {
    const modeShipping =
      typeof restaurantOrderModeToShipping === 'function'
        ? restaurantOrderModeToShipping(normalizedRestaurantMode)
        : shippingMethod;
    return resolveRestaurantShippingCost({
      orderMode: normalizedRestaurantMode,
      subtotal,
      freeShippingThreshold: shipSettings.freeShippingThreshold,
      shippingMethod: shippingMethod || modeShipping,
    });
  }

  return resolveRetailShippingCost({
    subtotal,
    shippingMethod,
    freeShippingThreshold: shipSettings.freeShippingThreshold,
    standardFee: shipSettings.standardFee,
    expressFee: shipSettings.expressFee,
  });
}
