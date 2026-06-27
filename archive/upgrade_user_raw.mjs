import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const email = 'zeeshan.keerio@mindscapeanalytics.com';
  
  // 1. Find user by email
  // Assuming the user table is named "user" (case-sensitive) or "User"
  // Let's check both
  let userResult;
  try {
    userResult = await pool.query('SELECT id FROM "user" WHERE email = $1', [email]);
  } catch (e) {
    userResult = await pool.query('SELECT id FROM "User" WHERE email = $1', [email]);
  }
  
  if (userResult.rows.length === 0) {
    console.log(`User ${email} not found.`);
    return;
  }
  
  const userId = userResult.rows[0].id;
  console.log(`Found user: ${userId}`);
  
  // Update user role
  try {
    await pool.query('UPDATE "user" SET role = $1 WHERE id = $2', ['owner', userId]);
  } catch (e) {
    await pool.query('UPDATE "User" SET role = $1 WHERE id = $2', ['owner', userId]);
  }
  
  // Find businesses for this user
  const businessUsersResult = await pool.query('SELECT id, business_id FROM business_users WHERE user_id = $1', [userId]);
  
  for (const bu of businessUsersResult.rows) {
    console.log(`Upgrading business_user ${bu.id} to owner for business ${bu.business_id}`);
    
    const permissions = JSON.stringify({
      all: true,
      admin: true,
      inventory: true,
      sales: true,
      purchases: true,
      finance: true,
      manufacturing: true,
      storefront: true
    });
    
    await pool.query('UPDATE business_users SET role = $1, permissions = $2::jsonb WHERE id = $3::uuid', ['owner', permissions, bu.id]);
    
    console.log(`Upgrading business ${bu.business_id} to enterprise plan`);
    await pool.query(
      `UPDATE businesses SET 
        plan_tier = $1, 
        max_products = $2, 
        max_warehouses = $3, 
        plan_seats = $4 
      WHERE id = $5::uuid`,
      ['enterprise', 999999, 999999, 999999, bu.business_id]
    );
    
    // Check business_settings
    const settingsResult = await pool.query('SELECT id, settings FROM business_settings WHERE business_id = $1::uuid', [bu.business_id]);
    
    const defaultSettings = {
      storefront: {
        enabled: true,
        theme: 'modern'
      },
      features: {
        inventory: true,
        pos: true,
        manufacturing: true,
        accounting: true,
        ecommerce: true,
        loyalty: true
      }
    };
    
    if (settingsResult.rows.length > 0) {
      const currentSettings = settingsResult.rows[0].settings || {};
      const newSettings = { ...currentSettings, ...defaultSettings };
      
      await pool.query(
        'UPDATE business_settings SET settings = $1::jsonb WHERE id = $2::uuid',
        [JSON.stringify(newSettings), settingsResult.rows[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO business_settings (business_id, settings) VALUES ($1::uuid, $2::jsonb)',
        [bu.business_id, JSON.stringify(defaultSettings)]
      );
    }
  }
  
  console.log('Successfully upgraded user and all associated businesses to enterprise owner!');
}

main()
  .catch(console.error)
  .finally(() => pool.end());
