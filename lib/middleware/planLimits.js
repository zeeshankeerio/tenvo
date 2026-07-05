import { canAddProduct, canAddUser, canCreateOrder, canMakeApiCall, logApiUsage } from '@/lib/services/planLimits';

/**
 * Middleware to enforce plan limits on API routes
 */

export async function withProductLimit(handler) {
  return async (req, context) => {
    const businessId = context.params?.businessId || req.headers.get('x-business-id');
    
    if (!businessId) {
      return new Response(
        JSON.stringify({ error: 'Business ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const check = await canAddProduct(businessId);
    
    if (!check.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Plan limit exceeded',
          message: check.reason,
          current: check.current,
          limit: check.limit,
          upgradePlan: check.upgradePlan,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    return handler(req, context);
  };
}

export async function withUserLimit(handler) {
  return async (req, context) => {
    const businessId = context.params?.businessId || req.headers.get('x-business-id');
    
    if (!businessId) {
      return new Response(
        JSON.stringify({ error: 'Business ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const check = await canAddUser(businessId);
    
    if (!check.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Plan limit exceeded',
          message: check.reason,
          current: check.current,
          limit: check.limit,
          upgradePlan: check.upgradePlan,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    return handler(req, context);
  };
}

export async function withOrderLimit(handler) {
  return async (req, context) => {
    const businessId = context.params?.businessId || req.headers.get('x-business-id');
    
    if (!businessId) {
      return new Response(
        JSON.stringify({ error: 'Business ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const check = await canCreateOrder(businessId);
    
    if (!check.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Plan limit exceeded',
          message: check.reason,
          current: check.current,
          limit: check.limit,
          upgradePlan: check.upgradePlan,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    return handler(req, context);
  };
}

export async function withApiRateLimit(handler) {
  return async (req, context) => {
    const businessId = context.params?.businessId || req.headers.get('x-business-id');
    
    if (businessId) {
      const check = await canMakeApiCall(businessId);
      
      if (!check.allowed) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: check.reason,
            retryAfter: check.retryAfter,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(check.retryAfter ?? 60),
            },
          }
        );
      }
      
      // Log API usage
      await logApiUsage(businessId, req.url, req.method);
    }
    
    return handler(req, context);
  };
}
