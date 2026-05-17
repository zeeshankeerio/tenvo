'use server';

import pool from '@/lib/db';
import { createModuleLogger } from '@/lib/services/logging/logger';

const log = createModuleLogger('audit');

/**
 * Persistent Audit Log Service
 * 
 * Records immutable audit trail entries for all significant business operations.
 * Stores who did what, when, and where -- with full before/after snapshots.
 * 
 * Uses the audit_logs table in PostgreSQL (created via migration).
 * Falls back gracefully if the table doesn't exist yet.
 * 
 * Usage:
 *   import { recordAuditLog, getAuditLogs } from '@/lib/services/audit/auditService';
 *   
 *   await recordAuditLog({
 *     businessId: 'xxx',
 *     userId: 'yyy',
 *     action: 'create',
 *     entityType: 'invoice',
 *     entityId: 'inv-123',
 *     description: 'Created invoice INV-2026-001',
 *     metadata: { invoiceNumber: 'INV-2026-001', total: 5000 },
 *   });
 */

// --- Table Auto-Creation ----------------------------------------------------
// Creates the audit_logs table if it doesn't exist (safe to run multiple times)
let tableChecked = false;

async function ensureAuditTable() {
    if (tableChecked) return;

    const client = await pool.connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL,
        user_id TEXT,
        user_email TEXT,
        user_name TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        description TEXT,
        changes JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_business ON audit_logs(business_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    `);
        tableChecked = true;
        log.info('Audit logs table verified/created');
    } catch (error) {
        log.error('Failed to create audit_logs table', { error });
        // Don't throw -- audit logging should never break business logic
    } finally {
        client.release();
    }
}

// --- Record Audit Log -------------------------------------------------------

/**
 * Record an immutable audit log entry
 * 
 * @param {object} params
 * @param {string} params.businessId - Business ID
 * @param {string} params.userId - User performing the action
 * @param {string} params.userEmail - User's email
 * @param {string} params.userName - User's display name
 * @param {string} params.action - Action type: 'create', 'update', 'delete', 'login', 'export', 'import', 'approve', 'reject'
 * @param {string} params.entityType - Entity type: 'invoice', 'product', 'customer', 'vendor', 'payment', 'stock', 'order', 'user', etc.
 * @param {string} params.entityId - ID of the affected entity
 * @param {string} params.description - Human-readable description
 * @param {object} params.changes - Before/after snapshot: { before: {...}, after: {...} }
 * @param {object} params.metadata - Additional metadata
 * @param {string} params.ipAddress - Client IP address
 * @param {string} params.userAgent - Client user agent
 * @returns {Promise<{success: boolean, auditId?: string}>}
 */
export async function recordAuditLog({
    businessId,
    userId = null,
    userEmail = null,
    userName = null,
    action,
    entityType,
    entityId = null,
    description = '',
    changes = {},
    metadata = {},
    ipAddress = null,
    userAgent = null,
}) {
    try {
        await ensureAuditTable();

        const client = await pool.connect();
        try {
            const res = await client.query(`
        INSERT INTO audit_logs 
          (business_id, user_id, user_email, user_name, action, entity_type, entity_id, 
           description, changes, metadata, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
                businessId,
                userId,
                userEmail,
                userName,
                action,
                entityType,
                entityId,
                description,
                JSON.stringify(changes),
                JSON.stringify(metadata),
                ipAddress,
                userAgent,
            ]);

            return { success: true, auditId: res.rows[0].id };
        } finally {
            client.release();
        }
    } catch (error) {
        // Audit logging should NEVER block or crash the main operation
        log.error('Failed to record audit log', {
            error,
            action,
            entityType,
            entityId,
            businessId,
        });
        return { success: false };
    }
}

// --- Query Audit Logs -------------------------------------------------------

/**
 * Get audit logs for a business with filters
 * 
 * @param {object} params
 * @param {string} params.businessId - Required
 * @param {string} params.entityType - Filter by entity type
 * @param {string} params.entityId - Filter by entity ID
 * @param {string} params.userId - Filter by user
 * @param {string} params.action - Filter by action type
 * @param {string} params.fromDate - ISO date string
 * @param {string} params.toDate - ISO date string
 * @param {number} params.limit - Max results (default: 50, max: 500)
 * @param {number} params.offset - Pagination offset
 * @returns {Promise<{success: boolean, logs: Array, total: number}>}
 */
export async function getAuditLogs({
    businessId,
    entityType = null,
    entityId = null,
    userId = null,
    action = null,
    fromDate = null,
    toDate = null,
    limit = 50,
    offset = 0,
}) {
    try {
        await ensureAuditTable();

        const client = await pool.connect();
        try {
            let whereClause = 'WHERE business_id = $1';
            const params = [businessId];
            let paramIndex = 2;

            if (entityType) {
                whereClause += ` AND entity_type = $${paramIndex++}`;
                params.push(entityType);
            }
            if (entityId) {
                whereClause += ` AND entity_id = $${paramIndex++}`;
                params.push(entityId);
            }
            if (userId) {
                whereClause += ` AND user_id = $${paramIndex++}`;
                params.push(userId);
            }
            if (action) {
                whereClause += ` AND action = $${paramIndex++}`;
                params.push(action);
            }
            if (fromDate) {
                whereClause += ` AND created_at >= $${paramIndex++}`;
                params.push(fromDate);
            }
            if (toDate) {
                whereClause += ` AND created_at <= $${paramIndex++}`;
                params.push(toDate);
            }

            // Get total count
            const countRes = await client.query(
                `SELECT COUNT(*) FROM audit_logs ${whereClause}`,
                params
            );

            // Get paginated results
            const safeLimit = Math.min(Math.max(1, limit), 500);
            const safeOffset = Math.max(0, offset);

            const logsRes = await client.query(
                `SELECT * FROM audit_logs ${whereClause} 
         ORDER BY created_at DESC 
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
                [...params, safeLimit, safeOffset]
            );

            return {
                success: true,
                logs: logsRes.rows,
                total: parseInt(countRes.rows[0].count, 10),
                limit: safeLimit,
                offset: safeOffset,
            };
        } finally {
            client.release();
        }
    } catch (error) {
        log.error('Failed to query audit logs', { error, businessId });
        return { success: false, error: error.message, logs: [], total: 0 };
    }
}

// --- Convenience Methods ----------------------------------------------------

/**
 * Record a change audit with before/after diff
 */
export async function recordChangeAudit({
    businessId, userId, userEmail, entityType, entityId, before, after, description,
}) {
    const changes = {};

    // Calculate diff between before and after
    if (before && after) {
        const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
        for (const key of allKeys) {
            if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
                changes[key] = { from: before[key], to: after[key] };
            }
        }
    }

    return recordAuditLog({
        businessId,
        userId,
        userEmail,
        action: 'update',
        entityType,
        entityId,
        description: description || `Updated ${entityType} ${entityId}`,
        changes: { before, after, diff: changes },
    });
}

/**
 * Get the audit trail for a specific entity
 */
export async function getEntityAuditTrail(businessId, entityType, entityId, limit = 20) {
    return getAuditLogs({ businessId, entityType, entityId, limit });
}
