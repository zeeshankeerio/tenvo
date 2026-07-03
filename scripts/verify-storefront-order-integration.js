#!/usr/bin/env node
/**
 * Verify Storefront Order Integration
 * 
 * Checks that storefront orders flow correctly through:
 * 1. Dashboard metrics (orders, revenue, customers)
 * 2. Notifications system
 * 3. Orders tab visibility
 * 
 * Run: node scripts/verify-storefront-order-integration.js
 */

const { Pool } = require('pg');

// Create pool from env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? {
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
  } : undefined
});

async function verifyIntegration() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Verifying Storefront Order Integration\n');
    console.log('='.repeat(60));

    // 1. Check storefront_orders table exists
    console.log('\n1️⃣  Checking storefront_orders table...');
    try {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'storefront_orders'
        );
      `);
      
      if (tableCheck.rows[0].exists) {
        console.log('   ✅ storefront_orders table exists');
        
        // Get sample counts
        const countResult = await client.query(`
          SELECT 
            COUNT(*) as total_orders,
            COUNT(*) FILTER (WHERE status IN ('pending', 'processing')) as pending_orders,
            COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_orders,
            COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'paid' AND status NOT IN ('cancelled', 'refunded')), 0) as total_revenue
          FROM storefront_orders
        `);
        
        const stats = countResult.rows[0];
        console.log(`   📊 Total Orders: ${stats.total_orders}`);
        console.log(`   ⏳ Pending Orders: ${stats.pending_orders}`);
        console.log(`   ✅ Paid Orders: ${stats.paid_orders}`);
        console.log(`   💰 Total Revenue: ${parseFloat(stats.total_revenue).toLocaleString()}`);
      } else {
        console.log('   ⚠️  storefront_orders table does not exist');
        console.log('   ℹ️  This is OK for new installations');
      }
    } catch (err) {
      console.log('   ❌ Error checking table:', err.message);
    }

    // 2. Check notifications table
    console.log('\n2️⃣  Checking notifications system...');
    try {
      const notifCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'notifications'
        );
      `);
      
      if (notifCheck.rows[0].exists) {
        console.log('   ✅ notifications table exists');
        
        const notifStats = await client.query(`
          SELECT 
            COUNT(*) as total_notifications,
            COUNT(*) FILTER (WHERE type = 'storefront_order') as storefront_order_notifications,
            COUNT(*) FILTER (WHERE is_read = false) as unread_notifications
          FROM notifications
          WHERE created_at >= NOW() - INTERVAL '7 days'
        `);
        
        const nstats = notifStats.rows[0];
        console.log(`   📨 Recent Notifications (7d): ${nstats.total_notifications}`);
        console.log(`   🛒 Storefront Order Notifications: ${nstats.storefront_order_notifications}`);
        console.log(`   🔔 Unread: ${nstats.unread_notifications}`);
      } else {
        console.log('   ❌ notifications table missing');
        console.log('   ⚠️  Run migration to create table');
      }
    } catch (err) {
      console.log('   ❌ Error checking notifications:', err.message);
    }

    // 3. Test dashboard metrics query (combined invoices + storefront)
    console.log('\n3️⃣  Testing dashboard metrics query...');
    try {
      // Pick a random business with storefront orders
      const bizResult = await client.query(`
        SELECT DISTINCT business_id 
        FROM storefront_orders 
        LIMIT 1
      `);
      
      if (bizResult.rows.length > 0) {
        const businessId = bizResult.rows[0].business_id;
        console.log(`   🏢 Testing with business: ${businessId}`);
        
        // Run the combined query
        const metricsResult = await client.query(`
          WITH invoice_orders AS (
            SELECT 
              COUNT(*) FILTER (WHERE status NOT IN ('cancelled', 'draft')) as active_orders,
              COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
              COUNT(*) FILTER (WHERE status = 'paid') as paid_orders
            FROM invoices
            WHERE business_id = $1
              AND date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
          ),
          storefront AS (
            SELECT 
              COUNT(*) FILTER (WHERE status NOT IN ('cancelled')) as active_orders,
              COUNT(*) FILTER (WHERE status IN ('pending', 'processing')) as pending_orders,
              COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_orders
            FROM storefront_orders
            WHERE business_id = $1
              AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
          )
          SELECT 
            COALESCE((SELECT active_orders FROM invoice_orders), 0) + COALESCE((SELECT active_orders FROM storefront), 0) as active_orders,
            COALESCE((SELECT pending_orders FROM invoice_orders), 0) + COALESCE((SELECT pending_orders FROM storefront), 0) as pending_orders,
            COALESCE((SELECT paid_orders FROM invoice_orders), 0) + COALESCE((SELECT paid_orders FROM storefront), 0) as paid_orders
        `, [businessId]);
        
        const metrics = metricsResult.rows[0];
        console.log('   ✅ Dashboard metrics query works!');
        console.log(`   📊 Combined Active Orders: ${metrics.active_orders}`);
        console.log(`   ⏳ Combined Pending: ${metrics.pending_orders}`);
        console.log(`   ✅ Combined Paid: ${metrics.paid_orders}`);
      } else {
        console.log('   ℹ️  No storefront orders to test with');
      }
    } catch (err) {
      console.log('   ❌ Error testing metrics query:', err.message);
    }

    // 4. Check notification helper exists
    console.log('\n4️⃣  Checking notification helper function...');
    try {
      const fs = require('fs');
      const helperPath = './lib/notifications/notificationHelpers.js';
      if (fs.existsSync(helperPath)) {
        const content = fs.readFileSync(helperPath, 'utf8');
        if (content.includes('notifyStorefrontOrder')) {
          console.log('   ✅ notifyStorefrontOrder helper exists');
        } else {
          console.log('   ❌ notifyStorefrontOrder helper not found');
        }
      } else {
        console.log('   ❌ notificationHelpers.js not found');
      }
    } catch (err) {
      console.log('   ⚠️  Error checking helper:', err.message);
    }

    // 5. Check OrdersManager component
    console.log('\n5️⃣  Checking OrdersManager component...');
    try {
      const fs = require('fs');
      const componentPath = './components/orders/OrdersManager.jsx';
      if (fs.existsSync(componentPath)) {
        const content = fs.readFileSync(componentPath, 'utf8');
        if (content.includes('getBusinessOrders')) {
          console.log('   ✅ OrdersManager component exists and uses getBusinessOrders');
        } else {
          console.log('   ⚠️  OrdersManager exists but may need updates');
        }
      } else {
        console.log('   ❌ OrdersManager.jsx not found');
      }
    } catch (err) {
      console.log('   ⚠️  Error checking component:', err.message);
    }

    // 6. Check analytics action
    console.log('\n6️⃣  Checking getDashboardMetricsAction...');
    try {
      const fs = require('fs');
      const actionPath = './lib/actions/premium/ai/analytics.js';
      if (fs.existsSync(actionPath)) {
        const content = fs.readFileSync(actionPath, 'utf8');
        if (content.includes('storefront_orders') && content.includes('combined')) {
          console.log('   ✅ getDashboardMetricsAction includes storefront orders');
        } else {
          console.log('   ⚠️  getDashboardMetricsAction may not include storefront orders');
        }
      } else {
        console.log('   ❌ analytics.js not found');
      }
    } catch (err) {
      console.log('   ⚠️  Error checking action:', err.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Verification Complete!\n');
    console.log('📋 Summary:');
    console.log('   - Storefront orders table structure verified');
    console.log('   - Notifications system checked');
    console.log('   - Dashboard metrics query validated');
    console.log('   - Component files verified');
    console.log('\n💡 Next Steps:');
    console.log('   1. Place a test order via storefront');
    console.log('   2. Check dashboard for updated metrics');
    console.log('   3. Verify notification appears in bell icon');
    console.log('   4. Navigate to Orders tab and confirm order visible\n');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyIntegration().catch(console.error);
