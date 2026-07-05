#!/usr/bin/env node
/**
 * Textile/Clothing Storefront Verification
 * Checks catalog, filters, order flow, and receipt support
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const TEXTILE_VERTICALS = ['garments', 'boutique-fashion', 'textile-wholesale', 'textile-mill'];
const REQUIRED_DOMAIN_FIELDS = ['fabrictype', 'sourcing', 'season', 'stitchingstatus'];
const PK_BRANDS = ['Khaadi', 'Gul Ahmed', 'Al-Karam', 'Junaid Jamshed'];

async function main() {
  console.log('🧵 Textile/Clothing Storefront Verification\n');

  const client = await pool.connect();
  try {
    // 1. Check textile businesses exist
    console.log('1️⃣ Checking textile businesses...');
    const bizResult = await client.query(
      `SELECT id, business_name, category, domain, country
       FROM businesses
       WHERE category = ANY($1)
       LIMIT 10`,
      [TEXTILE_VERTICALS]
    );

    if (bizResult.rows.length === 0) {
      console.log('   ⚠️  No textile businesses found. Register a garments/textile business first.');
      return;
    }

    console.log(`   ✅ Found ${bizResult.rows.length} textile businesses`);
    bizResult.rows.forEach((b) => {
      console.log(`      • ${b.business_name} (${b.category}) - ${b.domain || 'no domain'}`);
    });

    // 2. Check product catalog with domain_data
    console.log('\n2️⃣ Checking product catalog...');
    const prodResult = await client.query(
      `SELECT p.id, p.name, p.brand, p.category, p.domain_data, p.stock, b.category as business_category
       FROM products p
       JOIN businesses b ON p.business_id = b.id
       WHERE b.category = ANY($1)
       AND p.is_active = true
       LIMIT 20`,
      [TEXTILE_VERTICALS]
    );

    if (prodResult.rows.length === 0) {
      console.log('   ⚠️  No products found for textile businesses. Seed catalog first.');
    } else {
      console.log(`   ✅ Found ${prodResult.rows.length} textile products`);

      // Check domain_data richness
      let hasLocalImported = 0;
      let hasFabricType = 0;
      let hasBrands = 0;

      prodResult.rows.forEach((p) => {
        const dd = p.domain_data || {};
        if (dd.sourcing && ['local', 'imported'].includes(dd.sourcing.toLowerCase())) {
          hasLocalImported++;
        }
        if (dd.fabrictype || dd.fabric) {
          hasFabricType++;
        }
        if (PK_BRANDS.some((brand) => p.name.includes(brand) || p.brand?.includes(brand))) {
          hasBrands++;
        }
      });

      console.log(`      • ${hasLocalImported} have local/imported sourcing`);
      console.log(`      • ${hasFabricType} have fabric type`);
      console.log(`      • ${hasBrands} are branded (Khaadi, Gul Ahmed, etc.)`);

      if (hasLocalImported === 0) {
        console.log('   ⚠️  No products with sourcing (local/imported) detected. Seed PK clothing catalog.');
      }
      if (hasFabricType === 0) {
        console.log('   ⚠️  No products with fabric type detected.');
      }
    }

    // 3. Check storefront orders
    console.log('\n3️⃣ Checking storefront orders...');
    const orderResult = await client.query(
      `SELECT COUNT(*) as total, SUM(total_amount) as revenue
       FROM storefront_orders so
       JOIN businesses b ON so.business_id = b.id
       WHERE b.category = ANY($1)`,
      [TEXTILE_VERTICALS]
    );

    const orderCount = parseInt(orderResult.rows[0]?.total || '0', 10);
    const revenue = parseFloat(orderResult.rows[0]?.revenue || '0');

    if (orderCount === 0) {
      console.log('   ℹ️  No storefront orders yet (place test order to verify flow)');
    } else {
      console.log(`   ✅ ${orderCount} orders placed, ${revenue.toFixed(2)} revenue`);
    }

    // 4. Check business_settings storefront config
    console.log('\n4️⃣ Checking storefront settings...');
    const settingsResult = await client.query(
      `SELECT b.business_name, b.category,
              COALESCE(bs.is_storefront_enabled, true) AS is_storefront_enabled,
              bs.settings->'storefront' AS storefront_config
       FROM businesses b
       LEFT JOIN business_settings bs ON b.id = bs.business_id
       WHERE b.category = ANY($1)
       LIMIT 5`,
      [TEXTILE_VERTICALS]
    );

    settingsResult.rows.forEach((s) => {
      const sfEnabled = s.is_storefront_enabled !== false;
      const hasConfig = s.storefront_config && Object.keys(s.storefront_config).length > 0;
      console.log(
        `      • ${s.business_name}: ${sfEnabled ? '✅ enabled' : '❌ disabled'}, ${hasConfig ? 'has config' : 'default config'}`
      );
    });

    // 5. Check stock display (location qty support)
    console.log('\n5️⃣ Checking stock locations...');
    const stockResult = await client.query(
      `SELECT COUNT(*) as total
       FROM product_stock_locations psl
       JOIN products p ON psl.product_id = p.id
       JOIN businesses b ON p.business_id = b.id
       WHERE b.category = ANY($1)`,
      [TEXTILE_VERTICALS]
    );

    const stockCount = parseInt(stockResult.rows[0]?.total || '0', 10);
    if (stockCount > 0) {
      console.log(`   ✅ ${stockCount} warehouse stock rows (multi-location enabled)`);
    } else {
      console.log('   ℹ️  No warehouse stock rows (using headline stock only)');
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Businesses: ${bizResult.rows.length}`);
    console.log(`   Products: ${prodResult.rows.length}`);
    console.log(`   Orders: ${orderCount}`);
    console.log(`   Stock Locations: ${stockCount}`);

    console.log('\n✅ Textile storefront verification complete!');
    console.log('\n🧪 Manual QA:');
    console.log('   1. Visit /store/<domain> for a textile business');
    console.log('   2. Filter by fabric (Lawn, Cotton)');
    console.log('   3. Filter by sourcing (local, imported)');
    console.log('   4. Add to cart → checkout → place order');
    console.log('   5. Download receipt (58mm PDF)');
    console.log('   6. Track order via email');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
