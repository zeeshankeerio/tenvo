const DEFAULT_MAX_ATTEMPTS = 1;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST checkout — server retries transient order-number conflicts internally.
 * Client does not re-POST on 409 to avoid retry storms in the network tab.
 * @param {string} businessDomain
 * @param {object} payload — order body for POST /api/storefront/[domain]/orders
 * @param {{ maxAttempts?: number }} [opts]
 */
export async function placeStorefrontOrder(businessDomain, payload, opts = {}) {
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  let lastError = 'Failed to create order';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(`/api/storefront/${businessDomain}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok && result.success) {
      return { response, result };
    }

    lastError = result.error || 'Failed to create order';

    if (response.status >= 500 && attempt < maxAttempts) {
      await sleep(250 * attempt);
      continue;
    }

    const err = new Error(lastError);
    err.status = response.status;
    err.retryable = Boolean(result.retryable);
    err.result = result;
    throw err;
  }

  throw new Error(lastError);
}

/**
 * Validate cart lines before placing an order.
 * @param {string} businessDomain
 * @param {Array<{ productId: string, variantId?: string | null, quantity: number, name?: string }>} items
 */
export async function validateStorefrontCheckoutCart(businessDomain, items) {
  const response = await fetch(`/api/storefront/${businessDomain}/cart/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    const err = new Error(result.error || 'Some items in your cart are no longer available');
    err.status = response.status;
    err.issues = result.issues || [];
    throw err;
  }

  return result;
}
