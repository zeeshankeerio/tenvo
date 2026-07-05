import { createPool, withTransaction } from './pool.mjs';
import { getDefaultCoaForCountry } from '../config/regionalCoa.js';
import { getRegionalStandards } from '../utils/regionalHelpers';
import { resolveStorefrontCurrency, resolveStorefrontLocale } from '../storefront/storefrontRegional.js';
import { buildDemoCatalogPayload, buildRegistrationDomainProfile, slugifyCategoryName } from '../utils/registrationSeed.js';
import { resolveDomainKey } from '../config/domainKeyAliases.js';
import { getDomainKnowledge, DOMAIN_KNOWLEDGE_KEYS } from '../domainKnowledge.js';
import { seedCategories, seedProducts } from './catalogSeed.mjs';
import { getDemoStorefrontProfile } from './demoStoreProfiles.js';
import { getDemoDomainHandle } from './domains.mjs';
import { buildFullFashionStorefrontSeed } from '../storefront/fashionStorefrontSeed.js';

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

/* seedCategories + seedProducts live in catalogSeed.mjs */

/**
 * Bootstrap one demo business (COA, settings, owner membership, catalog).
 * @param {{
 *   userId: string,
 *   ownerEmail: string,
 *   domainKey: string,
 *   businessName: string,
 *   domainHandle: string,
 *   country?: string,
 *   planTier?: string,
 *   refreshCatalog?: boolean,
 * }} spec
 */
export async function bootstrapDemoBusiness(spec) {
  const pool = createPool();
  const client = await pool.connect();

  const country = spec.country || 'Pakistan';
  const regional = getRegionalStandards(country);
  const domainKey = spec.domainKey;
  const domainHandle = String(spec.domainHandle).trim().toLowerCase();

  try {
    return await withTransaction(client, async (tx) => {
      const existing = await tx.query(
        'SELECT id FROM businesses WHERE LOWER(domain) = $1',
        [domainHandle]
      );

      let businessId;
      let created = false;

      const domainProfile = buildRegistrationDomainProfile({
        domainKey: resolveDomainKey(domainKey),
        countryIso: regional.countryCode,
      });
      const storefrontProfile = getDemoStorefrontProfile(
        domainKey,
        { countryName: regional.countryName, currency: regional.currency },
        spec.businessName
      );
      const canonicalCategory = resolveDomainKey(domainKey);
      const fashionStorefrontSeed = buildFullFashionStorefrontSeed(canonicalCategory);
      const storefrontSettingsPayload = {
        storefront: {
          enabled: true,
          heroTitle: spec.businessName,
          currency: regional.currency,
          countryIso: regional.countryCode,
          ...(storefrontProfile.storefront || {}),
          ...(fashionStorefrontSeed || {}),
        },
        contact: {
          ...storefrontProfile.contact,
          published: true,
        },
        businessHours: storefrontProfile.businessHours,
        freeShippingThreshold: storefrontProfile.freeShippingThreshold,
        returnPolicyDays: storefrontProfile.returnPolicyDays,
        announcement: storefrontProfile.announcement,
        ...(storefrontProfile.keywords
          ? { seo: { keywords: storefrontProfile.keywords } }
          : {}),
        ...(storefrontProfile.accentColor
          ? { brand: { primaryColor: storefrontProfile.accentColor } }
          : {}),
      };
      const demoSettings = {
        currency: regional.currency,
        locale: resolveStorefrontLocale({ financials: { currency: regional.currency } }, { country: regional.countryName }),
        registration: {
          country_iso: regional.countryCode,
          country_name: regional.countryName,
          domain_vertical: domainKey,
        },
        financials: { currency: regional.currency, defaultTaxRate: regional.defaultTaxRate },
        domain: domainProfile.domainSnapshot,
        intelligence: domainProfile.intelligence,
        automation: domainProfile.automation,
        domain_defaults: domainProfile.domainDefaults,
        demo_lab: {
          is_demo: true,
          handle: domainHandle,
          seeded_via: 'data-lab',
        },
      };

      if (existing.rows.length > 0) {
        businessId = existing.rows[0].id;
        await tx.query(
          `UPDATE businesses SET user_id = $2, email = $3, category = $11,
            business_name = COALESCE(NULLIF($8, ''), business_name),
            description = COALESCE(NULLIF(description, ''), $5),
            address = COALESCE($6, address),
            city = COALESCE($7, city),
            logo_url = COALESCE(NULLIF($9, ''), logo_url),
            cover_image_url = COALESCE(NULLIF($10, ''), cover_image_url),
            is_active = true,
            settings = COALESCE(settings, '{}'::jsonb) || $4::jsonb, updated_at = NOW()
           WHERE id = $1::uuid`,
          [
            businessId,
            spec.userId,
            spec.ownerEmail,
            JSON.stringify(demoSettings),
            storefrontProfile.description,
            storefrontProfile.address,
            storefrontProfile.city,
            spec.businessName,
            storefrontProfile.logo_url || null,
            storefrontProfile.cover_image_url || null,
            canonicalCategory,
          ]
        );
        await tx.query(
          `INSERT INTO business_settings (business_id, is_storefront_enabled, settings)
           VALUES ($1::uuid, true, $2::jsonb)
           ON CONFLICT (business_id) DO UPDATE SET
             is_storefront_enabled = true,
             settings = COALESCE(business_settings.settings, '{}'::jsonb) || $2::jsonb`,
          [
            businessId,
            JSON.stringify(storefrontSettingsPayload),
          ]
        );
        await tx.query(
          `INSERT INTO business_users (business_id, user_id, role, status)
           VALUES ($1::uuid, $2, 'owner', 'active')
           ON CONFLICT (business_id, user_id) DO UPDATE SET role = 'owner', status = 'active'`,
          [businessId, spec.userId]
        );

        const coa = getDefaultCoaForCountry(regional.countryCode);
        for (const acc of coa) {
          const has = await tx.query(
            `SELECT id FROM gl_accounts WHERE business_id = $1::uuid AND code = $2 LIMIT 1`,
            [businessId, acc.code]
          );
          if (has.rows[0]) continue;
          await tx.query(
            `INSERT INTO gl_accounts (business_id, code, name, type, is_system, is_active)
             VALUES ($1::uuid, $2, $3, $4, true, true)`,
            [businessId, acc.code, acc.name, acc.type]
          );
        }
      } else {
        const bizRes = await tx.query(
          `INSERT INTO businesses (
            user_id, business_name, email, phone, country, domain, category,
            plan_tier, plan_seats, max_products, max_warehouses, currency, timezone,
            is_active, is_verified, settings, description, address, city,
            logo_url, cover_image_url
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, 999, 999999, 99, $9, $10,
            true, true, $11::jsonb, $12, $13, $14,
            $15, $16
          ) RETURNING id`,
          [
            spec.userId,
            spec.businessName,
            spec.ownerEmail,
            storefrontProfile.phone || null,
            regional.countryName,
            domainHandle,
            canonicalCategory,
            spec.planTier || 'enterprise',
            regional.currency,
            regional.timeZone,
            JSON.stringify(demoSettings),
            storefrontProfile.description,
            storefrontProfile.address,
            storefrontProfile.city,
            storefrontProfile.logo_url || null,
            storefrontProfile.cover_image_url || null,
          ]
        );
        businessId = bizRes.rows[0].id;
        created = true;

        await tx.query(
          `INSERT INTO business_settings (business_id, is_storefront_enabled, settings)
           VALUES ($1::uuid, true, $2::jsonb)
           ON CONFLICT (business_id) DO UPDATE SET is_storefront_enabled = true, settings = COALESCE(business_settings.settings, '{}'::jsonb) || $2::jsonb`,
          [
            businessId,
            JSON.stringify({
              ...storefrontSettingsPayload,
              ...demoSettings,
            }),
          ]
        );

        await tx.query(
          `INSERT INTO business_users (business_id, user_id, role, status)
           VALUES ($1::uuid, $2, 'owner', 'active')
           ON CONFLICT (business_id, user_id) DO UPDATE SET role = 'owner', status = 'active'`,
          [businessId, spec.userId]
        );

        const coa = getDefaultCoaForCountry(regional.countryCode);
        for (const acc of coa) {
          const has = await tx.query(
            `SELECT id FROM gl_accounts WHERE business_id = $1::uuid AND code = $2 LIMIT 1`,
            [businessId, acc.code]
          );
          if (has.rows[0]) continue;
          await tx.query(
            `INSERT INTO gl_accounts (business_id, code, name, type, is_system, is_active)
             VALUES ($1::uuid, $2, $3, $4, true, true)`,
            [businessId, acc.code, acc.name, acc.type]
          );
        }

        await tx.query(
          `INSERT INTO store_payment_settings (business_id, allow_cod, allow_prepaid, default_currency)
           VALUES ($1::uuid, true, true, $2)
           ON CONFLICT (business_id) DO NOTHING`,
          [businessId, regional.currency]
        );
      }

      const payload = buildDemoCatalogPayload({
        businessId,
        domainKey: resolveDomainKey(domainKey),
        countryIso: regional.countryCode,
      });

      await seedCategories(tx, businessId, payload.categories, {
        refresh: Boolean(spec.refreshCatalog),
      });
      await seedProducts(tx, businessId, payload.items, {
        refresh: Boolean(spec.refreshCatalog),
      });

      const countRes = await tx.query(
        `SELECT COUNT(*)::int AS n FROM products
         WHERE business_id = $1::uuid AND (is_deleted = false OR is_deleted IS NULL)`,
        [businessId]
      );

      return {
        businessId,
        domain: domainHandle,
        domainKey,
        created,
        productCount: countRes.rows[0]?.n ?? 0,
        categoryCount: payload.categories.length,
        catalogItems: payload.items.length,
      };
    });
  } finally {
    client.release();
    await pool.end();
  }
}

/**
 * Minimal catalog-only business for `--all-domains` sweep.
 * @param {{ userId: string, ownerEmail: string, domainKey: string, country?: string, domainHandle?: string }} spec
 */
export async function bootstrapMinimalDomainBusiness(spec) {
  const domainHandle = spec.domainHandle || getDemoDomainHandle(spec.domainKey);
  return bootstrapDemoBusiness({
    userId: spec.userId,
    ownerEmail: spec.ownerEmail,
    domainKey: spec.domainKey,
    businessName: `Demo ${getDomainKnowledge(spec.domainKey).name || spec.domainKey}`,
    domainHandle,
    country: spec.country || 'Pakistan',
    planTier: 'professional',
  });
}

export { DOMAIN_KNOWLEDGE_KEYS };
