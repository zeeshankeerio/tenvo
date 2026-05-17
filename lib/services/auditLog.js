import { recordAuditLog } from './audit/auditService';

/**
 * Proxy for the audit log service to maintain legacy import compatibility
 * while migrating to the standardized audit service.
 */
export const auditLog = recordAuditLog;

export default auditLog;
