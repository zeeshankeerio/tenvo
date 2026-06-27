import fs from 'fs';

const filePath = 'lib/actions/storefront/business.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the primary query
content = content.replace(
  /SELECT[\s\S]*?FROM businesses b\s+LEFT JOIN business_settings bs ON b\.id = bs\.business_id\s+LEFT JOIN subscription_plans p ON bs\.plan_id = p\.id\s+WHERE LOWER\(b\.domain\) = ANY\(\$1\) AND b\.is_active = true/,
  `SELECT 
          b.id, b.business_name, b.domain, b.email, b.phone, b.description,
          b.logo_url, b.cover_image_url, b.website, b.category,
          b.address, b.city, b.country, b.postal_code,
          b.is_active, b.is_verified, b.created_at,
          b.plan_tier, 
          true as is_storefront_enabled, 
          bs.settings as store_settings,
          null as plan_features
        FROM businesses b
        LEFT JOIN business_settings bs ON b.id = bs.business_id
        WHERE LOWER(b.domain) = ANY($1) AND b.is_active = true`
);

// Replace the custom domain query
content = content.replace(
  /SELECT[\s\S]*?FROM business_custom_domains cd\s+JOIN businesses b ON cd\.business_id = b\.id\s+LEFT JOIN business_settings bs ON b\.id = bs\.business_id\s+LEFT JOIN subscription_plans p ON bs\.plan_id = p\.id\s+WHERE LOWER\(cd\.domain\) = ANY\(\$1\) AND cd\.is_active = true AND b\.is_active = true/,
  `SELECT 
            b.id, b.business_name, b.domain, b.email, b.phone, b.description,
            b.logo_url, b.cover_image_url, b.website, b.category,
            b.address, b.city, b.country, b.postal_code,
            b.is_active, b.is_verified, b.created_at,
            b.plan_tier, 
            true as is_storefront_enabled, 
            bs.settings as store_settings,
            null as plan_features
          FROM business_custom_domains cd
          JOIN businesses b ON cd.business_id = b.id
          LEFT JOIN business_settings bs ON b.id = bs.business_id
          WHERE LOWER(cd.domain) = ANY($1) AND cd.is_active = true AND b.is_active = true`
);

fs.writeFileSync(filePath, content);
console.log('Successfully updated getBusinessByDomain query!');
