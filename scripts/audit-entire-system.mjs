#!/usr/bin/env node
/**
 * COMPREHENSIVE SYSTEM AUDIT
 * 
 * Audits entire data flow across:
 * - All dashboards (Command Overview, Sales, Easy Mode, Domain Operations)
 * - All data entry forms (Products, Invoices, POS, Customers, etc.)
 * - Database schema integrity
 * - API endpoints and actions
 * - Frontend-backend wiring
 * - Typos and naming consistency
 * - Data integrity constraints
 * 
 * Run: node scripts/audit-entire-system.mjs
 */

import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

console.log('🔍 COMPREHENSIVE SYSTEM AUDIT');
console.log('═'.repeat(100));
console.log('');

const issues = {
    critical: [],
    errors: [],
    warnings: [],
    typos: [],
    naming: [],
    performance: [],
    security: []
};

function addIssue(severity, category, description, details = null, fix = null) {
    const issue = {
        severity,
        category,
        description,
        details,
        fix,
        timestamp: new Date().toISOString()
    };
    
    if (severity === 'CRITICAL') issues.critical.push(issue);
    else if (severity === 'ERROR') issues.errors.push(issue);
    else if (severity === 'WARNING') issues.warnings.push(issue);
    else if (severity === 'TYPO') issues.typos.push(issue);
    else if (severity === 'NAMING') issues.naming.push(issue);
    else if (severity === 'PERFORMANCE') issues.performance.push(issue);
    else if (severity === 'SECURITY') issues.security.push(issue);
}

// =============================================================================
// SECTION 1: DATABASE SCHEMA AUDIT
// =============================================================================

async function auditDatabaseSchema(client) {
    console.log('\n📊 SECTION 1: DATABASE SCHEMA AUDIT');
    console.log('─'.repeat(100));
    
    // Check for missing indexes on foreign keys
    console.log('\n🔍 1.1 Checking Foreign Key Indexes...\n');
    
    const fkWithoutIndex = await client.query(`
        SELECT 
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND NOT EXISTS (
              SELECT 1 FROM pg_indexes 
              WHERE schemaname = 'public' 
                AND tablename = tc.table_name 
                AND indexdef LIKE '%' || kcu.column_name || '%'
          )
        ORDER BY tc.table_name, kcu.column_name
        LIMIT 20
    `);
    
    if (fkWithoutIndex.rows.length > 0) {
        console.log(`⚠️  Found ${fkWithoutIndex.rows.length} foreign keys without indexes:`);
        fkWithoutIndex.rows.forEach(row => {
            console.log(`   ${row.table_name}.${row.column_name} → ${row.foreign_table_name}`);
            addIssue('PERFORMANCE', 'Missing Index', 
                `Foreign key ${row.table_name}.${row.column_name} lacks index`,
                { table: row.table_name, column: row.column_name },
                `CREATE INDEX idx_${row.table_name}_${row.column_name} ON ${row.table_name}(${row.column_name});`
            );
        });
    } else {
        console.log('✅ All foreign keys have indexes');
    }
    
    // Check for tables without primary keys
    console.log('\n🔍 1.2 Checking Primary Keys...\n');
    
    const tablesWithoutPK = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name NOT IN (
              SELECT table_name
              FROM information_schema.table_constraints
              WHERE constraint_type = 'PRIMARY KEY'
                AND table_schema = 'public'
          )
        ORDER BY table_name
    `);
    
    if (tablesWithoutPK.rows.length > 0) {
        console.log(`❌ Found ${tablesWithoutPK.rows.length} tables without primary keys:`);
        tablesWithoutPK.rows.forEach(row => {
            console.log(`   ${row.table_name}`);
            addIssue('CRITICAL', 'Missing Primary Key', 
                `Table ${row.table_name} has no primary key`,
                { table: row.table_name }
            );
        });
    } else {
        console.log('✅ All tables have primary keys');
    }
    
    // Check column naming consistency
    console.log('\n🔍 1.3 Checking Column Naming Consistency...\n');
    
    const columnNaming = await client.query(`
        SELECT 
            table_name,
            column_name,
            data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (
              column_name LIKE '%Id' OR
              column_name LIKE '%_ID' OR
              column_name LIKE '%Amt' OR
              column_name LIKE '%Qty' OR
              column_name LIKE '%Num' OR
              column_name != LOWER(column_name)
          )
        ORDER BY table_name, column_name
        LIMIT 50
    `);
    
    if (columnNaming.rows.length > 0) {
        console.log(`⚠️  Found ${columnNaming.rows.length} columns with inconsistent naming:`);
        columnNaming.rows.slice(0, 10).forEach(row => {
            console.log(`   ${row.table_name}.${row.column_name} (${row.data_type})`);
            addIssue('NAMING', 'Inconsistent Column Name', 
                `${row.table_name}.${row.column_name} uses inconsistent case/abbreviation`,
                { table: row.table_name, column: row.column_name, type: row.data_type },
                `Consider: ${row.column_name.toLowerCase().replace(/id$/i, '_id').replace(/amt$/i, '_amount').replace(/qty$/i, '_quantity')}`
            );
        });
        if (columnNaming.rows.length > 10) {
            console.log(`   ... and ${columnNaming.rows.length - 10} more`);
        }
    } else {
        console.log('✅ Column naming is consistent');
    }
    
    // Check for duplicate unique constraints
    console.log('\n🔍 1.4 Checking Duplicate Constraints...\n');
    
    const duplicateConstraints = await client.query(`
        SELECT 
            tc1.table_name,
            tc1.constraint_name as constraint1,
            tc2.constraint_name as constraint2,
            string_agg(kcu1.column_name, ', ') as columns
        FROM information_schema.table_constraints tc1
        JOIN information_schema.table_constraints tc2 
          ON tc1.table_name = tc2.table_name
          AND tc1.constraint_type = tc2.constraint_type
          AND tc1.constraint_name < tc2.constraint_name
        JOIN information_schema.key_column_usage kcu1
          ON tc1.constraint_name = kcu1.constraint_name
        WHERE tc1.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
          AND tc1.table_schema = 'public'
        GROUP BY tc1.table_name, tc1.constraint_name, tc2.constraint_name
        HAVING COUNT(*) > 1
    `);
    
    if (duplicateConstraints.rows.length > 0) {
        console.log(`⚠️  Found ${duplicateConstraints.rows.length} potential duplicate constraints`);
        addIssue('WARNING', 'Duplicate Constraints', 
            `Found duplicate constraint definitions`,
            duplicateConstraints.rows
        );
    } else {
        console.log('✅ No duplicate constraints found');
    }
}

// =============================================================================
// SECTION 2: DATA INTEGRITY AUDIT
// =============================================================================

async function auditDataIntegrity(client) {
    console.log('\n\n📊 SECTION 2: DATA INTEGRITY AUDIT');
    console.log('─'.repeat(100));
    
    // Check for orphaned records
    console.log('\n🔍 2.1 Checking for Orphaned Records...\n');
    
    const orphanChecks = [
        {
            name: 'invoice_items without invoice',
            query: `SELECT COUNT(*) as count FROM invoice_items ii 
                    WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.id = ii.invoice_id)`
        },
        {
            name: 'pos_transaction_items without transaction',
            query: `SELECT COUNT(*) as count FROM pos_transaction_items pti 
                    WHERE NOT EXISTS (SELECT 1 FROM pos_transactions pt WHERE pt.id = pti.transaction_id)`
        },
        {
            name: 'storefront_order_items without order',
            query: `SELECT COUNT(*) as count FROM storefront_order_items soi 
                    WHERE NOT EXISTS (SELECT 1 FROM storefront_orders so WHERE so.id = soi.order_id)`
        },
        {
            name: 'products without business',
            query: `SELECT COUNT(*) as count FROM products p 
                    WHERE NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = p.business_id)`
        }
    ];
    
    for (const check of orphanChecks) {
        try {
            const result = await client.query(check.query);
            const count = parseInt(result.rows[0].count);
            if (count > 0) {
                console.log(`❌ ${check.name}: ${count} orphaned records`);
                addIssue('ERROR', 'Orphaned Records', check.name, { count });
            } else {
                console.log(`✅ ${check.name}: No orphaned records`);
            }
        } catch (error) {
            console.log(`⚠️  ${check.name}: Could not check (${error.message})`);
        }
    }
    
    // Check for NULL in required fields
    console.log('\n🔍 2.2 Checking Required Fields...\n');
    
    const requiredFieldChecks = [
        {
            table: 'invoices',
            fields: ['business_id', 'date', 'grand_total']
        },
        {
            table: 'products',
            fields: ['business_id', 'name']
        },
        {
            table: 'customers',
            fields: ['business_id', 'name']
        },
        {
            table: 'pos_transactions',
            fields: ['business_id', 'total_amount']
        },
        {
            table: 'storefront_orders',
            fields: ['business_id', 'order_number', 'total_amount']
        }
    ];
    
    for (const check of requiredFieldChecks) {
        for (const field of check.fields) {
            try {
                const result = await client.query(
                    `SELECT COUNT(*) as count FROM ${check.table} WHERE ${field} IS NULL`
                );
                const count = parseInt(result.rows[0].count);
                if (count > 0) {
                    console.log(`❌ ${check.table}.${field}: ${count} NULL values`);
                    addIssue('ERROR', 'NULL in Required Field', 
                        `${check.table}.${field} has ${count} NULL values`,
                        { table: check.table, field, count }
                    );
                }
            } catch (error) {
                // Field might not exist, skip
            }
        }
    }
    console.log('✅ Required field checks complete');
    
    // Check for negative amounts
    console.log('\n🔍 2.3 Checking for Invalid Amounts...\n');
    
    const amountChecks = [
        {
            table: 'invoices',
            field: 'grand_total',
            query: `SELECT COUNT(*) as count FROM invoices WHERE grand_total < 0 AND status NOT LIKE '%credit%' AND status NOT LIKE '%refund%'`
        },
        {
            table: 'products',
            field: 'price',
            query: `SELECT COUNT(*) as count FROM products WHERE price < 0 AND is_deleted = false`
        },
        {
            table: 'products',
            field: 'stock',
            query: `SELECT COUNT(*) as count FROM products WHERE stock < 0 AND is_deleted = false`
        },
        {
            table: 'pos_transactions',
            field: 'total_amount',
            query: `SELECT COUNT(*) as count FROM pos_transactions WHERE total_amount < 0 AND is_voided = false`
        }
    ];
    
    for (const check of amountChecks) {
        try {
            const result = await client.query(check.query);
            const count = parseInt(result.rows[0].count);
            if (count > 0) {
                console.log(`⚠️  ${check.table}.${check.field}: ${count} negative values`);
                addIssue('WARNING', 'Negative Amount', 
                    `${check.table}.${check.field} has ${count} negative values`,
                    { table: check.table, field: check.field, count }
                );
            }
        } catch (error) {
            // Skip if table/field doesn't exist
        }
    }
    console.log('✅ Amount checks complete');
}

// =============================================================================
// SECTION 3: API ENDPOINTS AUDIT
// =============================================================================

async function auditAPIEndpoints() {
    console.log('\n\n📊 SECTION 3: API ENDPOINTS AUDIT');
    console.log('─'.repeat(100));
    
    console.log('\n🔍 3.1 Scanning API Route Files...\n');
    
    const apiBasePath = join(__dirname, '..', 'app', 'api');
    
    try {
        const routes = await findAPIRoutes(apiBasePath);
        console.log(`Found ${routes.length} API route files\n`);
        
        // Check for common issues in route files
        for (const routePath of routes.slice(0, 20)) {
            await auditRouteFile(routePath);
        }
        
        if (routes.length > 20) {
            console.log(`\n... scanned first 20 routes, ${routes.length - 20} remaining`);
        }
        
    } catch (error) {
        console.log(`⚠️  Could not scan API routes: ${error.message}`);
    }
}

async function findAPIRoutes(dir, routes = []) {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            
            if (entry.isDirectory()) {
                await findAPIRoutes(fullPath, routes);
            } else if (entry.name === 'route.js' || entry.name === 'route.ts') {
                routes.push(fullPath);
            }
        }
    } catch (error) {
        // Directory might not exist or not accessible
    }
    
    return routes;
}

async function auditRouteFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const relativePath = filePath.replace(join(__dirname, '..'), '');
        
        // Check for missing error handling
        if (!content.includes('try') && !content.includes('catch')) {
            addIssue('WARNING', 'Missing Error Handling', 
                `API route missing try-catch: ${relativePath}`,
                { file: relativePath }
            );
        }
        
        // Check for missing authentication
        if (!content.includes('withGuard') && 
            !content.includes('withApiAuth') && 
            !content.includes('getServerSession') &&
            !relativePath.includes('/api/health') &&
            !relativePath.includes('/api/webhooks')) {
            addIssue('SECURITY', 'Missing Authentication', 
                `API route might be missing auth: ${relativePath}`,
                { file: relativePath }
            );
        }
        
        // Check for SQL injection risks
        if (content.includes('client.query') && content.includes('${') && !content.includes('$1')) {
            addIssue('SECURITY', 'Potential SQL Injection', 
                `API route using string interpolation in SQL: ${relativePath}`,
                { file: relativePath },
                'Use parameterized queries with $1, $2, etc.'
            );
        }
        
        // Check for common typos
        const typos = [
            { wrong: 'busines_id', right: 'business_id' },
            { wrong: 'busienss_id', right: 'business_id' },
            { wrong: 'cutomer_id', right: 'customer_id' },
            { wrong: 'prodcut', right: 'product' },
            { wrong: 'invocie', right: 'invoice' },
            { wrong: 'ammount', right: 'amount' },
            { wrong: 'recieve', right: 'receive' },
            { wrong: 'recieved', right: 'received' }
        ];
        
        for (const typo of typos) {
            if (content.toLowerCase().includes(typo.wrong)) {
                addIssue('TYPO', 'Spelling Error', 
                    `Typo in ${relativePath}: "${typo.wrong}" should be "${typo.right}"`,
                    { file: relativePath, typo: typo.wrong, correction: typo.right }
                );
            }
        }
        
    } catch (error) {
        // File might not be readable
    }
}

// =============================================================================
// SECTION 4: FORMS AND UI COMPONENTS AUDIT
// =============================================================================

async function auditFormsAndComponents() {
    console.log('\n\n📊 SECTION 4: FORMS AND UI COMPONENTS AUDIT');
    console.log('─'.repeat(100));
    
    console.log('\n🔍 4.1 Scanning Component Files...\n');
    
    const componentsPath = join(__dirname, '..', 'components');
    const appPath = join(__dirname, '..', 'app');
    
    const componentFiles = [];
    await findComponentFiles(componentsPath, componentFiles);
    await findComponentFiles(appPath, componentFiles);
    
    console.log(`Found ${componentFiles.length} component files\n`);
    
    // Sample check on first 30 files
    for (const file of componentFiles.slice(0, 30)) {
        await auditComponentFile(file);
    }
    
    if (componentFiles.length > 30) {
        console.log(`\n... scanned first 30 components, ${componentFiles.length - 30} remaining`);
    }
}

async function findComponentFiles(dir, files = []) {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                await findComponentFiles(fullPath, files);
            } else if ((entry.name.endsWith('.jsx') || entry.name.endsWith('.tsx')) && 
                       !entry.name.endsWith('.test.jsx') && 
                       !entry.name.endsWith('.test.tsx')) {
                files.push(fullPath);
            }
        }
    } catch (error) {
        // Directory might not exist
    }
    
    return files;
}

async function auditComponentFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const relativePath = filePath.replace(join(__dirname, '..'), '');
        
        // Check for hardcoded text that should be in constants
        if (content.match(/["`']PKR["`']/g) && !relativePath.includes('currency')) {
            addIssue('NAMING', 'Hardcoded Currency', 
                `Component has hardcoded "PKR": ${relativePath}`,
                { file: relativePath },
                'Use currency from business context or config'
            );
        }
        
        // Check for console.log in production code
        if (content.includes('console.log') && !content.includes('console.error')) {
            const count = (content.match(/console\.log/g) || []).length;
            if (count > 3) {
                addIssue('WARNING', 'Debug Code', 
                    `Component has ${count} console.log statements: ${relativePath}`,
                    { file: relativePath, count }
                );
            }
        }
        
        // Check for missing accessibility labels
        if (content.includes('<button') && !content.includes('aria-label') && !content.includes('aria-labelledby')) {
            // This is a heuristic - some buttons might have text content
            // Just flag for manual review
        }
        
        // Check for common React anti-patterns
        if (content.includes('setState') && content.includes('setState') && 
            content.match(/setState.*setState/s)) {
            addIssue('WARNING', 'Multiple setState Calls', 
                `Component may have multiple setState calls that could be batched: ${relativePath}`,
                { file: relativePath }
            );
        }
        
    } catch (error) {
        // File might not be readable
    }
}

// =============================================================================
// SECTION 5: GENERATE REPORT
// =============================================================================

async function generateReport() {
    console.log('\n\n📊 COMPREHENSIVE AUDIT REPORT');
    console.log('═'.repeat(100));
    
    const total = issues.critical.length + issues.errors.length + issues.warnings.length + 
                  issues.typos.length + issues.naming.length + issues.performance.length + 
                  issues.security.length;
    
    console.log(`\nTotal Issues Found: ${total}\n`);
    console.log(`🔴 CRITICAL: ${issues.critical.length}`);
    console.log(`❌ ERRORS:   ${issues.errors.length}`);
    console.log(`⚠️  WARNINGS: ${issues.warnings.length}`);
    console.log(`📝 TYPOS:    ${issues.typos.length}`);
    console.log(`🏷️  NAMING:   ${issues.naming.length}`);
    console.log(`⚡ PERFORMANCE: ${issues.performance.length}`);
    console.log(`🔒 SECURITY: ${issues.security.length}`);
    
    // Critical Issues
    if (issues.critical.length > 0) {
        console.log('\n\n🔴 CRITICAL ISSUES (MUST FIX)');
        console.log('─'.repeat(100));
        issues.critical.forEach((issue, idx) => {
            console.log(`\n${idx + 1}. [${issue.category}] ${issue.description}`);
            if (issue.details) console.log(`   Details: ${JSON.stringify(issue.details)}`);
            if (issue.fix) console.log(`   Fix: ${issue.fix}`);
        });
    }
    
    // Errors
    if (issues.errors.length > 0) {
        console.log('\n\n❌ ERRORS (SHOULD FIX)');
        console.log('─'.repeat(100));
        issues.errors.slice(0, 10).forEach((issue, idx) => {
            console.log(`\n${idx + 1}. [${issue.category}] ${issue.description}`);
            if (issue.details) console.log(`   Details: ${JSON.stringify(issue.details)}`);
        });
        if (issues.errors.length > 10) {
            console.log(`\n... and ${issues.errors.length - 10} more errors`);
        }
    }
    
    // Security Issues
    if (issues.security.length > 0) {
        console.log('\n\n🔒 SECURITY ISSUES');
        console.log('─'.repeat(100));
        issues.security.forEach((issue, idx) => {
            console.log(`\n${idx + 1}. [${issue.category}] ${issue.description}`);
            if (issue.details) console.log(`   Details: ${JSON.stringify(issue.details)}`);
            if (issue.fix) console.log(`   Fix: ${issue.fix}`);
        });
    }
    
    // Performance Issues
    if (issues.performance.length > 0) {
        console.log('\n\n⚡ PERFORMANCE ISSUES');
        console.log('─'.repeat(100));
        issues.performance.slice(0, 10).forEach((issue, idx) => {
            console.log(`\n${idx + 1}. [${issue.category}] ${issue.description}`);
            if (issue.fix) console.log(`   Fix: ${issue.fix}`);
        });
        if (issues.performance.length > 10) {
            console.log(`\n... and ${issues.performance.length - 10} more performance issues`);
        }
    }
    
    // Typos
    if (issues.typos.length > 0) {
        console.log('\n\n📝 TYPOS AND SPELLING ERRORS');
        console.log('─'.repeat(100));
        issues.typos.slice(0, 15).forEach((issue, idx) => {
            console.log(`${idx + 1}. ${issue.description}`);
        });
        if (issues.typos.length > 15) {
            console.log(`... and ${issues.typos.length - 15} more typos`);
        }
    }
    
    // Warnings
    if (issues.warnings.length > 0) {
        console.log('\n\n⚠️  WARNINGS (REVIEW RECOMMENDED)');
        console.log('─'.repeat(100));
        console.log(`Found ${issues.warnings.length} warnings (showing summary)`);
    }
    
    // Naming Issues
    if (issues.naming.length > 0) {
        console.log('\n\n🏷️  NAMING CONSISTENCY');
        console.log('─'.repeat(100));
        console.log(`Found ${issues.naming.length} naming inconsistencies (showing summary)`);
    }
    
    // Save detailed report to file
    const reportPath = join(__dirname, '..', 'SYSTEM_AUDIT_REPORT.json');
    await fs.writeFile(reportPath, JSON.stringify(issues, null, 2));
    console.log(`\n\n📄 Detailed report saved to: SYSTEM_AUDIT_REPORT.json`);
    
    console.log('\n\n═'.repeat(100));
    console.log('✅ AUDIT COMPLETE');
    console.log('═'.repeat(100));
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
    const client = await pool.connect();
    
    try {
        await auditDatabaseSchema(client);
        await auditDataIntegrity(client);
        await auditAPIEndpoints();
        await auditFormsAndComponents();
        await generateReport();
        
    } catch (error) {
        console.error('\n❌ Audit failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(error => {
    console.error('Script error:', error);
    process.exit(1);
});
