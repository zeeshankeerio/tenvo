'use server';

import { recordAuditLog } from '@/lib/services/audit/auditService';
import { getServerSession } from '@/lib/auth/rbac';

/**
 * Fire-and-forget audit helper for server actions.
 * 
 * Call AFTER a successful COMMIT so it never blocks or breaks the main operation.
 * Resolves the current session automatically if userId/userEmail are not provided.
 * 
 * Usage:
 *   await auditWrite({ businessId, action: 'create', entityType: 'invoice', entityId: inv.id,
 *     description: 'Created invoice INV-001', metadata: { total: 5000 } });
 *
 * @param {object} params
 * @param {string} params.businessId
 * @param {string} params.action    - 'create' | 'update' | 'delete' | 'void' | 'process' | 'approve' | 'reject'
 * @param {string} params.entityType - 'invoice' | 'expense' | 'stock_adjustment' | 'payroll_run' | 'approval' | ...
 * @param {string} [params.entityId]
 * @param {string} [params.description]
 * @param {object} [params.metadata] - Any extra context (amounts, quantities, etc.)
 * @param {object} [params.changes]  - { before, after } for update audits
 * @param {string} [params.userId]   - Override: skip session lookup
 * @param {string} [params.userEmail]
 */
export async function auditWrite({
    businessId,
    action,
    entityType,
    entityId = null,
    description = '',
    metadata = {},
    changes = {},
    userId = null,
    userEmail = null,
}) {
    try {
        // Resolve session if caller didn't pass user info
        if (!userId) {
            try {
                const session = await getServerSession();
                if (session) {
                    userId = session.user.id;
                    userEmail = session.user.email;
                }
            } catch {
                // Session lookup failed -- still record the audit without user info
            }
        }

        // Fire and forget -- never throw to the caller
        recordAuditLog({
            businessId,
            userId,
            userEmail,
            action,
            entityType,
            entityId: entityId ? String(entityId) : null,
            description,
            changes,
            metadata,
        }).catch(() => {
            // Swallow -- audit must never break business logic
        });
    } catch {
        // Swallow all errors
    }
}
