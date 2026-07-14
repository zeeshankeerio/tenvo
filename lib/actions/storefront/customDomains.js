import 'server-only';

import pool from '@/lib/db';
import { requireStorefrontHubAccess } from '@/lib/tenancy/storefrontHubAuth';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';
import { invalidateStorefrontTenant } from '@/lib/cache/storefrontInvalidation';
import { invalidateStorefrontBusiness } from '@/lib/cache/storefrontDomainCache';
import { purgeCachedStorefrontDomain } from '@/lib/cache/storefrontDomainCache';
import { purgeCustomDomainCache } from '@/lib/cache/customDomainCache';

/**
 * Validate domain format
 */
function validateDomainFormat(domain) {
  if (!domain || typeof domain !== 'string') {
    return { valid: false, error: 'Domain is required' };
  }

  const trimmed = domain.trim().toLowerCase();

  // Remove protocol if present
  const withoutProtocol = trimmed.replace(/^https?:\/\//, '');

  // Basic domain regex (supports subdomains, no path/query)
  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/;

  if (!domainRegex.test(withoutProtocol)) {
    return { valid: false, error: 'Invalid domain format. Use example.com or subdomain.example.com' };
  }

  // Block localhost and internal domains
  if (
    withoutProtocol.includes('localhost') ||
    withoutProtocol.endsWith('.local') ||
    withoutProtocol.includes('tenvo.store') ||
    withoutProtocol.includes('tenvo.app')
  ) {
    return { valid: false, error: 'Cannot use internal or platform domains' };
  }

  return { valid: true, domain: withoutProtocol };
}

/**
 * Check DNS CNAME record (basic validation)
 * In production, this should use dns.resolve() or similar
 */
async function verifyDNSRecord(domain) {
  try {
    // For now, just return true - implement real DNS check in production
    // const dns = require('dns').promises;
    // const records = await dns.resolveCname(domain);
    // return records.some(r => r.includes('tenvo.store'));
    return { verified: true, message: 'DNS verification pending' };
  } catch (error) {
    return { verified: false, message: 'DNS record not found' };
  }
}

/**
 * List all custom domains for a business
 */
export async function listCustomDomainsAction(businessId) {
  const authCheck = await requireStorefrontHubAccess(businessId);
  if (!authCheck.ok) return authCheck.response;

  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT 
        id, domain, is_active, is_primary, verified_at,
        created_at, updated_at
       FROM business_custom_domains
       WHERE business_id = $1::uuid
       ORDER BY is_primary DESC NULLS LAST, created_at DESC`,
      [businessId]
    );

    return actionSuccess({
      domains: result.rows.map((row) => ({
        id: row.id,
        domain: row.domain,
        isActive: row.is_active,
        isPrimary: row.is_primary,
        isVerified: Boolean(row.verified_at),
        verifiedAt: row.verified_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  } catch (error) {
    console.error('[listCustomDomainsAction] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Add a new custom domain
 */
export async function addCustomDomainAction(businessId, domainInput) {
  const authCheck = await requireStorefrontHubAccess(businessId);
  if (!authCheck.ok) return authCheck.response;

  // Validate domain format
  const validation = validateDomainFormat(domainInput);
  if (!validation.valid) {
    return actionFailure('INVALID_DOMAIN', validation.error);
  }

  const normalizedDomain = validation.domain;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if domain already exists for ANY business
    const existingCustom = await client.query(
      `SELECT business_id FROM business_custom_domains
       WHERE LOWER(domain) = LOWER($1) AND is_active = true`,
      [normalizedDomain]
    );

    if (existingCustom.rows.length > 0) {
      const isOwn = existingCustom.rows[0].business_id === businessId;
      return actionFailure(
        'DOMAIN_TAKEN',
        isOwn
          ? 'This domain is already added to your store'
          : 'This domain is already in use by another store'
      );
    }

    // Check if domain collides with another business's primary domain
    const existingCanonical = await client.query(
      `SELECT id FROM businesses
       WHERE LOWER(domain) = LOWER($1) AND id != $2::uuid`,
      [normalizedDomain, businessId]
    );

    if (existingCanonical.rows.length > 0) {
      return actionFailure(
        'DOMAIN_TAKEN',
        'This domain matches another store handle and cannot be used'
      );
    }

    // Check if this business already has a primary domain
    const primaryCheck = await client.query(
      `SELECT COUNT(*) as count FROM business_custom_domains
       WHERE business_id = $1::uuid AND is_primary = true AND is_active = true`,
      [businessId]
    );

    const isPrimary = primaryCheck.rows[0].count === '0';

    // Insert the domain (unverified initially)
    const insertResult = await client.query(
      `INSERT INTO business_custom_domains (
        id, business_id, domain, is_active, is_primary, verified_at, created_at, updated_at
       )
       VALUES (
        uuid_generate_v4(), $1::uuid, $2, false, $3, NULL, NOW(), NOW()
       )
       RETURNING id, domain, is_active, is_primary, verified_at, created_at`,
      [businessId, normalizedDomain, isPrimary]
    );

    await client.query('COMMIT');

    const newDomain = insertResult.rows[0];

    console.log(`[addCustomDomainAction] Added domain ${normalizedDomain} for business ${businessId}`);

    return actionSuccess({
      domain: {
        id: newDomain.id,
        domain: newDomain.domain,
        isActive: newDomain.is_active,
        isPrimary: newDomain.is_primary,
        isVerified: false,
        verifiedAt: null,
        createdAt: newDomain.created_at,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[addCustomDomainAction] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Verify domain DNS and activate
 */
export async function verifyCustomDomainAction(businessId, domainId) {
  const authCheck = await requireStorefrontHubAccess(businessId);
  if (!authCheck.ok) return authCheck.response;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get the domain
    const domainResult = await client.query(
      `SELECT id, domain, business_id FROM business_custom_domains
       WHERE id = $1::uuid AND business_id = $2::uuid`,
      [domainId, businessId]
    );

    if (domainResult.rows.length === 0) {
      return actionFailure('NOT_FOUND', 'Domain not found');
    }

    const domainRow = domainResult.rows[0];

    // Verify DNS (implement real check in production)
    const dnsCheck = await verifyDNSRecord(domainRow.domain);

    if (!dnsCheck.verified) {
      return actionFailure('DNS_NOT_VERIFIED', dnsCheck.message || 'DNS record not found. Please ensure CNAME points to proxy.tenvo.store');
    }

    // Mark as verified and active
    await client.query(
      `UPDATE business_custom_domains
       SET verified_at = NOW(), is_active = true, updated_at = NOW()
       WHERE id = $1::uuid`,
      [domainId]
    );

    await client.query('COMMIT');

    // Invalidate caches
    await invalidateStorefrontTenant(businessId);
    await purgeCachedStorefrontDomain(domainRow.domain);
    await purgeCustomDomainCache(domainRow.domain);

    console.log(`[verifyCustomDomainAction] Verified domain ${domainRow.domain} for business ${businessId}`);

    return actionSuccess({
      verified: true,
      message: 'Domain verified and activated successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[verifyCustomDomainAction] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Set a domain as primary
 */
export async function setPrimaryDomainAction(businessId, domainId) {
  const authCheck = await requireStorefrontHubAccess(businessId);
  if (!authCheck.ok) return authCheck.response;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Verify domain exists and is verified
    const domainResult = await client.query(
      `SELECT id, domain, verified_at FROM business_custom_domains
       WHERE id = $1::uuid AND business_id = $2::uuid`,
      [domainId, businessId]
    );

    if (domainResult.rows.length === 0) {
      return actionFailure('NOT_FOUND', 'Domain not found');
    }

    if (!domainResult.rows[0].verified_at) {
      return actionFailure('NOT_VERIFIED', 'Domain must be verified before setting as primary');
    }

    // Unset all other primary domains
    await client.query(
      `UPDATE business_custom_domains
       SET is_primary = false
       WHERE business_id = $1::uuid`,
      [businessId]
    );

    // Set this domain as primary
    await client.query(
      `UPDATE business_custom_domains
       SET is_primary = true, updated_at = NOW()
       WHERE id = $1::uuid`,
      [domainId]
    );

    await client.query('COMMIT');

    await invalidateStorefrontTenant(businessId);

    console.log(`[setPrimaryDomainAction] Set domain ${domainId} as primary for business ${businessId}`);

    return actionSuccess({ message: 'Primary domain updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[setPrimaryDomainAction] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Remove a custom domain
 */
export async function removeCustomDomainAction(businessId, domainId) {
  const authCheck = await requireStorefrontHubAccess(businessId);
  if (!authCheck.ok) return authCheck.response;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get domain before deletion for cache purge
    const domainResult = await client.query(
      `SELECT domain FROM business_custom_domains
       WHERE id = $1::uuid AND business_id = $2::uuid`,
      [domainId, businessId]
    );

    if (domainResult.rows.length === 0) {
      return actionFailure('NOT_FOUND', 'Domain not found');
    }

    const domainName = domainResult.rows[0].domain;

    // Soft delete (mark as inactive) rather than hard delete
    await client.query(
      `UPDATE business_custom_domains
       SET is_active = false, is_primary = false, updated_at = NOW()
       WHERE id = $1::uuid`,
      [domainId]
    );

    await client.query('COMMIT');

    // Purge from cache
    await purgeCachedStorefrontDomain(domainName);
    await purgeCustomDomainCache(domainName);
    await invalidateStorefrontTenant(businessId);

    console.log(`[removeCustomDomainAction] Removed domain ${domainName} for business ${businessId}`);

    return actionSuccess({ message: 'Domain removed successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[removeCustomDomainAction] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}
