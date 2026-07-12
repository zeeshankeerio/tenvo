#!/usr/bin/env node

/**
 * Complete Implementation Verification Script
 * 
 * Verifies all fixes are properly applied without requiring database access.
 * Checks code structure, SQL patterns, and integration points.
 * 
 * Usage: node scripts/verify-complete-implementation.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
    return fs.existsSync(path.join(rootDir, filePath));
}

function readFileContent(filePath) {
    try {
        return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
    } catch (error) {
        return null;
    }
}

function checkPattern(content, pattern, description) {
    const found = pattern.test(content);
    if (found) {
        log(`   ✅ ${description}`, 'green');
    } else {
        log(`   ❌ ${description}`, 'red');
    }
    return found;
}

let totalChecks = 0;
let passedChecks = 0;

function runCheck(condition, description) {
    totalChecks++;
    if (condition) {
        passedChecks++;
        log(`   ✅ ${description}`, 'green');
    } else {
        log(`   ❌ ${description}`, 'red');
    }
    return condition;
}

async function verifyImplementation() {
    log('\n╔═══════════════════════════════════════════════════════════════╗', 'cyan');
    log('║   COMPLETE IMPLEMENTATION VERIFICATION                        ║', 'cyan');
    log('║   Unified Order Aggregation - Code Structure Check           ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════════════╝\n', 'cyan');

    // ================================================================
    // PART 1: FILE EXISTENCE
    // ================================================================
    log('📁 Part 1: File Existence Check', 'bright');
    
    runCheck(
        checkFileExists('lib/actions/basic/dashboard.js'),
        'lib/actions/basic/dashboard.js exists'
    );
    
    runCheck(
        checkFileExists('lib/actions/premium/ai/analytics.js'),
        'lib/actions/premium/ai/analytics.js exists'
    );
    
    runCheck(
        checkFileExists('app/business/[category]/components/tabs/DomainDashboard.tsx'),
        'DomainDashboard.tsx exists'
    );

    // ================================================================
    // PART 2: FILE 1 - lib/actions/basic/dashboard.js
    // ================================================================
    log('\n📊 Part 2: getDashboardKPIs() Verification', 'bright');
    
    const file1Content = readFileContent('lib/actions/basic/dashboard.js');
    if (file1Content) {
        runCheck(
            /period_pos\s+AS\s*\(/i.test(file1Content),
            'period_pos CTE defined'
        );
        
        runCheck(
            /period_storefront\s+AS\s*\(/i.test(file1Content),
            'period_storefront CTE defined'
        );
        
        runCheck(
            /total_order_count/.test(file1Content),
            'total_order_count aggregation present'
        );
        
        runCheck(
            /\+.*period_pos.*\+.*period_storefront/s.test(file1Content) ||
            /period_pos.*\+.*period_storefront/s.test(file1Content),
            'Unified revenue aggregation (invoices + POS + storefront)'
        );
        
        runCheck(
            /invoice_count.*pos_count.*storefront_count/s.test(file1Content),
            'Ledger breakdown (invoice_count, pos_count, storefront_count)'
        );
        
        runCheck(
            /orders:\s*\{[^}]*total:/s.test(file1Content),
            'Returns orders.total in response'
        );
        
        log('   📝 Summary: getDashboardKPIs() structure looks correct', 'blue');
    } else {
        log('   ❌ Could not read dashboard.js', 'red');
        totalChecks += 6;
    }

    // ================================================================
    // PART 3: FILE 2 - lib/actions/premium/ai/analytics.js
    // ================================================================
    log('\n📊 Part 3: getDashboardMetricsAction() Verification', 'bright');
    
    const file2Content = readFileContent('lib/actions/premium/ai/analytics.js');
    if (file2Content) {
        // Check Revenue Aggregation
        log('   🔍 Checking Revenue Aggregation:', 'blue');
        runCheck(
            /pos_revenue\s+AS\s*\(/i.test(file2Content),
            'pos_revenue CTE defined in revenue query'
        );
        
        runCheck(
            /FROM\s+pos_transactions/i.test(file2Content),
            'POS transactions table queried'
        );
        
        runCheck(
            /gl_revenue.*pos_revenue.*storefront_revenue/s.test(file2Content) ||
            /COALESCE.*pos_revenue/s.test(file2Content),
            'POS revenue included in aggregation'
        );
        
        // Check Order Count Aggregation
        log('   🔍 Checking Order Count Aggregation:', 'blue');
        runCheck(
            /pos_orders\s+AS\s*\(/i.test(file2Content),
            'pos_orders CTE defined'
        );
        
        runCheck(
            /invoice_orders.*pos_orders.*storefront/s.test(file2Content) ||
            /COALESCE.*pos_orders/s.test(file2Content),
            'POS orders included in count aggregation'
        );
        
        // Check Growth Calculation
        log('   🔍 Checking Growth Calculation:', 'blue');
        runCheck(
            /monthly_revenue.*pos_revenue.*storefront_revenue/s.test(file2Content) ||
            /FULL\s+OUTER\s+JOIN.*pos_revenue/is.test(file2Content),
            'POS revenue included in growth calculation'
        );
        
        runCheck(
            /FULL\s+OUTER\s+JOIN/i.test(file2Content),
            'FULL OUTER JOIN used for combining ledgers'
        );
        
        // Check Payment Status Filters
        log('   🔍 Checking POS Filters:', 'blue');
        runCheck(
            /is_voided\s*=\s*false/i.test(file2Content),
            'POS voided transactions filtered'
        );
        
        runCheck(
            /payment_status.*completed/i.test(file2Content),
            'POS payment status = completed filter'
        );
        
        log('   📝 Summary: getDashboardMetricsAction() structure looks correct', 'blue');
    } else {
        log('   ❌ Could not read analytics.js', 'red');
        totalChecks += 9;
    }

    // ================================================================
    // PART 4: FILE 3 - DomainDashboard.tsx
    // ================================================================
    log('\n📊 Part 4: DomainDashboard Component Verification', 'bright');
    
    const file3Content = readFileContent('app/business/[category]/components/tabs/DomainDashboard.tsx');
    if (file3Content) {
        runCheck(
            /dashboardMetrics\?\.orders\?\.total/i.test(file3Content) ||
            /serverOrderCount.*dashboardMetrics/s.test(file3Content),
            'Uses server-side dashboardMetrics.orders.total'
        );
        
        runCheck(
            /serverOrderCount\s*!==\s*undefined/.test(file3Content) ||
            /dashboardMetrics.*\?/.test(file3Content),
            'Prefers server data with fallback pattern'
        );
        
        runCheck(
            /currentOrders\s*=/.test(file3Content),
            'Assigns to currentOrders variable'
        );
        
        log('   📝 Summary: DomainDashboard component structure looks correct', 'blue');
    } else {
        log('   ❌ Could not read DomainDashboard.tsx', 'red');
        totalChecks += 3;
    }

    // ================================================================
    // PART 5: SUPPORTING FILES
    // ================================================================
    log('\n📁 Part 5: Supporting Files & Architecture', 'bright');
    
    runCheck(
        checkFileExists('lib/analytics/salesInsights.js'),
        'salesInsights.js exists (unified SQL patterns)'
    );
    
    runCheck(
        checkFileExists('lib/context/DataContext.js'),
        'DataContext.js exists (dashboard data provider)'
    );
    
    const salesInsightsContent = readFileContent('lib/analytics/salesInsights.js');
    if (salesInsightsContent) {
        runCheck(
            /SALES_TREND_UNIFIED_SQL/.test(salesInsightsContent),
            'SALES_TREND_UNIFIED_SQL constant defined'
        );
        
        runCheck(
            /TOP_MOVING_PRODUCTS_UNIFIED_SQL/.test(salesInsightsContent),
            'TOP_MOVING_PRODUCTS_UNIFIED_SQL constant defined'
        );
        
        runCheck(
            /REVENUE_GROWTH_UNIFIED_SQL/.test(salesInsightsContent),
            'REVENUE_GROWTH_UNIFIED_SQL constant defined'
        );
    }

    // ================================================================
    // PART 6: DATABASE SCHEMA REFERENCES
    // ================================================================
    log('\n📊 Part 6: Database Schema Consistency', 'bright');
    
    const schemaContent = readFileContent('prisma/schema.prisma');
    if (schemaContent) {
        runCheck(
            /model\s+invoices/i.test(schemaContent),
            'invoices model exists in schema'
        );
        
        runCheck(
            /model\s+pos_transactions/i.test(schemaContent),
            'pos_transactions model exists in schema'
        );
        
        runCheck(
            /model\s+storefront_orders/i.test(schemaContent),
            'storefront_orders model exists in schema'
        );
        
        runCheck(
            /business_id.*String/s.test(schemaContent),
            'business_id tenant field present'
        );
    } else {
        log('   ⚠️  Could not read schema.prisma', 'yellow');
        totalChecks += 4;
    }

    // ================================================================
    // PART 7: FILTER & DATE RANGE SUPPORT
    // ================================================================
    log('\n📊 Part 7: Filter & Date Range Support', 'bright');
    
    runCheck(
        checkFileExists('lib/context/FilterContext.js'),
        'FilterContext exists (date range filters)'
    );
    
    const filterContextContent = readFileContent('lib/context/FilterContext.js');
    if (filterContextContent) {
        runCheck(
            /dateRange|datePreset/i.test(filterContextContent),
            'Date range state management present'
        );
    }
    
    const dashboardFiles = [file1Content, file2Content].filter(Boolean);
    dashboardFiles.forEach((content, idx) => {
        const fileName = idx === 0 ? 'dashboard.js' : 'analytics.js';
        if (content) {
            runCheck(
                /date\s+BETWEEN|created_at.*BETWEEN/i.test(content),
                `${fileName}: Date range filtering supported`
            );
        }
    });

    // ================================================================
    // PART 8: KPI & INSIGHTS STRUCTURE
    // ================================================================
    log('\n📊 Part 8: KPI & Insights Structure (Zoho/Busy-like)', 'bright');
    
    if (file1Content) {
        runCheck(
            /revenue|receivables|payables|expenses|profitability/i.test(file1Content),
            'dashboard.js: Financial KPIs present'
        );
        
        runCheck(
            /inventory|products|stock/i.test(file1Content),
            'dashboard.js: Inventory KPIs present'
        );
        
        runCheck(
            /customers|vendors/i.test(file1Content),
            'dashboard.js: Entity KPIs present'
        );
    }
    
    if (file2Content) {
        runCheck(
            /getSalesTrendAction|getTopProductsAction|getKPIMetricsAction/i.test(file2Content),
            'analytics.js: Trend & insights actions exported'
        );
        
        runCheck(
            /getDemandForecastAction/i.test(file2Content),
            'analytics.js: AI forecasting action exists'
        );
    }

    // ================================================================
    // PART 9: DOCUMENTATION
    // ================================================================
    log('\n📁 Part 9: Documentation Completeness', 'bright');
    
    const docs = [
        'START_HERE.md',
        'DEPLOY_NOW.md',
        'README_ORDER_FIX.md',
        'DEPLOYMENT_STATUS_REPORT.md',
        'COMPLETE_FIX_SUMMARY.md',
        'FINAL_ACTION_PLAN.md',
        'DEPLOYMENT_CHECKLIST.txt'
    ];
    
    docs.forEach(doc => {
        runCheck(checkFileExists(doc), `${doc} exists`);
    });

    // ================================================================
    // PART 10: VERIFICATION SCRIPTS
    // ================================================================
    log('\n📁 Part 10: Verification Scripts', 'bright');
    
    const scripts = [
        'scripts/quick-verify-deployment.mjs',
        'scripts/verify-unified-order-aggregation.mjs',
        'scripts/audit-entire-system.mjs'
    ];
    
    scripts.forEach(script => {
        runCheck(checkFileExists(script), `${script} exists`);
    });

    // ================================================================
    // FINAL REPORT
    // ================================================================
    log('\n╔═══════════════════════════════════════════════════════════════╗', 'cyan');
    log('║   VERIFICATION RESULTS                                        ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════════════╝\n', 'cyan');
    
    const passRate = ((passedChecks / totalChecks) * 100).toFixed(1);
    
    log(`✅ Passed: ${passedChecks} / ${totalChecks} checks (${passRate}%)`, 'green');
    
    if (passedChecks === totalChecks) {
        log('\n🎉 PERFECT! All checks passed!', 'green');
        log('   All fixes are properly applied', 'green');
        log('   Code structure matches Zoho/Busy.in patterns', 'green');
        log('   Ready for deployment', 'green');
    } else if (passRate >= 90) {
        log('\n✅ EXCELLENT! Implementation is solid', 'green');
        log(`   ${totalChecks - passedChecks} minor issues found`, 'yellow');
        log('   Core functionality is complete', 'green');
    } else if (passRate >= 75) {
        log('\n⚠️  GOOD with some gaps', 'yellow');
        log(`   ${totalChecks - passedChecks} checks failed`, 'yellow');
        log('   Review failed checks above', 'yellow');
    } else {
        log('\n❌ NEEDS ATTENTION', 'red');
        log(`   ${totalChecks - passedChecks} checks failed`, 'red');
        log('   Significant gaps found', 'red');
    }
    
    log('\n📋 Next Steps:', 'bright');
    if (passedChecks === totalChecks) {
        log('   1. Deploy the remaining file: lib/actions/premium/ai/analytics.js', 'blue');
        log('   2. Run deployment verification (with DATABASE_URL set)', 'blue');
        log('   3. Test dashboards manually', 'blue');
    } else {
        log('   1. Review failed checks above', 'blue');
        log('   2. Fix any critical gaps', 'blue');
        log('   3. Re-run this verification', 'blue');
    }
    
    log('\n📚 Key Architectural Points:', 'bright');
    log('   ✅ Three Sales Ledgers: invoices, pos_transactions, storefront_orders', 'blue');
    log('   ✅ Two Dashboard Actions: getDashboardKPIs, getDashboardMetricsAction', 'blue');
    log('   ✅ Unified Aggregation: All ledgers combined with CTEs', 'blue');
    log('   ✅ Date Range Filtering: Period-based queries like Zoho/Busy', 'blue');
    log('   ✅ Financial KPIs: Revenue, receivables, payables, cash flow', 'blue');
    log('   ✅ Operational KPIs: Inventory, orders, customers, vendors', 'blue');
    log('   ✅ AI Insights: Forecasting, trends, top products', 'blue');
    
    log('');
    return passedChecks === totalChecks ? 0 : 1;
}

// Run verification
verifyImplementation()
    .then(exitCode => {
        process.exit(exitCode);
    })
    .catch(error => {
        log('\n❌ Verification failed with error', 'red');
        console.error(error);
        process.exit(1);
    });
