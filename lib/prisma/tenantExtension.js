import { AsyncLocalStorage } from 'node:async_hooks';

/** @type {AsyncLocalStorage<{ businessId: string } | null>} */
const tenantAls = new AsyncLocalStorage();

/**
 * Models that must never receive automatic `business_id` filtering or injection.
 * (Auth tables, tenant root, global catalog rows, join tables without direct business_id.)
 *
 * Platform billing tables such as `stripe_webhook_events` are NOT listed here: they are
 * never queried via `db` under tenant context today — use `prismaBase` if you add admin UIs
 * so rows with `business_id` null remain visible where intended.
 */
const MODELS_EXCLUDED_FROM_TENANT_SCOPE = new Set([
  'user',
  'session',
  'account',
  'verification',
  'twoFactor',
  'businesses',
  'subscription_plans',
  'invoice_payments',
]);

/**
 * @returns {string | null}
 */
export function getTenantBusinessId() {
  const store = tenantAls.getStore();
  return store?.businessId ?? null;
}

/**
 * Run async work with tenant context so Prisma extension can auto-scope queries.
 * `assertEntityBelongsToBusiness(..., null, ...)` wraps the global `db` client with this
 * so `findFirst({ where: { id } })` still merges `business_id` when the extension is active.
 * @param {string} businessId
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 * @template T
 */
export function withBusinessContext(businessId, fn) {
  if (!businessId || typeof businessId !== 'string') {
    throw new Error('withBusinessContext: businessId is required');
  }
  return tenantAls.run({ businessId }, fn);
}

/**
 * @param {import('@prisma/client').Prisma.WhereInput | undefined} where
 * @param {string} businessId
 */
function mergeBusinessWhere(where, businessId) {
  if (!where) {
    return { business_id: businessId };
  }
  return { AND: [where, { business_id: businessId }] };
}

/**
 * @param {import('@prisma/client').Prisma.InputJsonValue | object | undefined} data
 * @param {string} businessId
 */
function injectBusinessIdOnCreate(data, businessId) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { business_id: businessId };
  }
  if (/** @type {Record<string, unknown>} */(data).business_id != null) {
    return data;
  }
  return { ...data, business_id: businessId };
}

/**
 * Prisma extension: when `withBusinessContext` is active, read queries and mutating bulk ops
 * on tenant tables automatically include `business_id`.
 *
 * `findUnique` / `findUniqueOrThrow` are intentionally NOT modified.
 */
export function createTenantExtension() {
  return {
    name: 'tenant_scope',
    query: {
      $allModels: {
        findMany({ model, args, query }) {
          if (MODELS_EXCLUDED_FROM_TENANT_SCOPE.has(model)) {
            return query(args);
          }
          const bid = getTenantBusinessId();
          if (!bid) return query(args);
          const nextArgs = {
            ...args,
            where: mergeBusinessWhere(args.where, bid),
          };
          return query(nextArgs);
        },

        findFirst({ model, args, query }) {
          if (MODELS_EXCLUDED_FROM_TENANT_SCOPE.has(model)) {
            return query(args);
          }
          const bid = getTenantBusinessId();
          if (!bid) return query(args);
          const nextArgs = {
            ...args,
            where: mergeBusinessWhere(args.where, bid),
          };
          return query(nextArgs);
        },

        findFirstOrThrow({ model, args, query }) {
          if (MODELS_EXCLUDED_FROM_TENANT_SCOPE.has(model)) {
            return query(args);
          }
          const bid = getTenantBusinessId();
          if (!bid) return query(args);
          const nextArgs = {
            ...args,
            where: mergeBusinessWhere(args.where, bid),
          };
          return query(nextArgs);
        },

        count({ model, args, query }) {
          if (MODELS_EXCLUDED_FROM_TENANT_SCOPE.has(model)) {
            return query(args);
          }
          const bid = getTenantBusinessId();
          if (!bid) return query(args);
          const nextArgs = {
            ...args,
            where: mergeBusinessWhere(args.where, bid),
          };
          return query(nextArgs);
        },

        aggregate({ model, args, query }) {
          if (MODELS_EXCLUDED_FROM_TENANT_SCOPE.has(model)) {
            return query(args);
          }
          const bid = getTenantBusinessId();
          if (!bid) return query(args);
          const nextArgs = {
            ...args,
            where: mergeBusinessWhere(args.where, bid),
          };
          return query(nextArgs);
        },

        groupBy({ model, args, query }) {
          if (MODELS_EXCLUDED_FROM_TENANT_SCOPE.has(model)) {
            return query(args);
          }
          const bid = getTenantBusinessId();
          if (!bid) return query(args);
          const nextArgs = {
            ...args,
            where: mergeBusinessWhere(args.where, bid),
          };
          return query(nextArgs);
        },

        updateMany({ model, args, query }) {
          if (MODELS_EXCLUDED_FROM_TENANT_SCOPE.has(model)) {
            return query(args);
          }
          const bid = getTenantBusinessId();
          if (!bid) return query(args);
          const nextArgs = {
            ...args,
            where: mergeBusinessWhere(args.where, bid),
          };
          return query(nextArgs);
        },

        deleteMany({ model, args, query }) {
          if (MODELS_EXCLUDED_FROM_TENANT_SCOPE.has(model)) {
            return query(args);
          }
          const bid = getTenantBusinessId();
          if (!bid) return query(args);
          const nextArgs = {
            ...args,
            where: mergeBusinessWhere(args.where, bid),
          };
          return query(nextArgs);
        },

        update({ model, args, query }) {
          if (MODELS_EXCLUDED_FROM_TENANT_SCOPE.has(model)) {
            return query(args);
          }
          const bid = getTenantBusinessId();
          if (!bid) return query(args);
          const nextArgs = {
            ...args,
            where: mergeBusinessWhere(args.where, bid),
          };
          return query(nextArgs);
        },

        delete({ model, args, query }) {
          if (MODELS_EXCLUDED_FROM_TENANT_SCOPE.has(model)) {
            return query(args);
          }
          const bid = getTenantBusinessId();
          if (!bid) return query(args);
          const nextArgs = {
            ...args,
            where: mergeBusinessWhere(args.where, bid),
          };
          return query(nextArgs);
        },

        create({ model, args, query }) {
          if (MODELS_EXCLUDED_FROM_TENANT_SCOPE.has(model)) {
            return query(args);
          }
          const bid = getTenantBusinessId();
          if (!bid) return query(args);
          const nextArgs = {
            ...args,
            data: injectBusinessIdOnCreate(args.data, bid),
          };
          return query(nextArgs);
        },

        createMany({ model, args, query }) {
          if (MODELS_EXCLUDED_FROM_TENANT_SCOPE.has(model)) {
            return query(args);
          }
          const bid = getTenantBusinessId();
          if (!bid) return query(args);
          const data = args.data;
          if (Array.isArray(data)) {
            const nextData = data.map((row) =>
              row && typeof row === 'object' && row.business_id == null
                ? { ...row, business_id: bid }
                : row
            );
            return query({ ...args, data: nextData });
          }
          return query({
            ...args,
            data: injectBusinessIdOnCreate(data, bid),
          });
        },

        upsert({ model, args, query }) {
          if (MODELS_EXCLUDED_FROM_TENANT_SCOPE.has(model)) {
            return query(args);
          }
          const bid = getTenantBusinessId();
          if (!bid) return query(args);
          const nextArgs = {
            ...args,
            where: mergeBusinessWhere(args.where, bid),
            create: injectBusinessIdOnCreate(args.create, bid),
            update: args.update,
          };
          return query(nextArgs);
        },
      },
    },
  };
}
