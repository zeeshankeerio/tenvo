'use server';

/**
 * User Management Server Actions
 * Invitations, activity logs, impersonation
 */

import pool from '@/lib/db';
import { requirePlatformAccess } from './platform';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';
import { randomBytes } from 'crypto';
import { sendTransactionalEmail } from '@/lib/email/resend';

// ============================================
// USER INVITATIONS
// ============================================

/**
 * Create user invitation
 */
export async function createUserInvitation({
    email,
    businessId,
    role,
    customMessage
}) {
    await requirePlatformAccess();
    const client = await pool.connect();
    
    try {
        // Get admin user ID
        const { user } = await requirePlatformAccess();
        
        // Generate secure token
        const token = randomBytes(32).toString('hex');
        
        // Set expiration (7 days)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        const result = await client.query(`
            INSERT INTO user_invitations 
            (email, business_id, role, invited_by, token, expires_at, custom_message, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
            RETURNING *
        `, [email, businessId, role, user.id, token, expiresAt, customMessage]);
        
        // Send invitation email (non-blocking, failure does not roll back the row)
        const { headers } = await import('next/headers');
        const headersList = await headers();
        const protocol = headersList.get('x-forwarded-proto') || 'https';
        const host = headersList.get('host') || 'localhost:3000';
        const inviteUrl = `${protocol}://${host}/accept-invitation?token=${token}`;
        const React = (await import('react')).default;
        const { AuthOtpEmail } = await import('@/lib/email/templates/AuthOtpEmail');
        sendTransactionalEmail({
            to: email,
            subject: "You've been invited to Tenvo",
            react: React.createElement(AuthOtpEmail, {
                otp: inviteUrl,
                headline: "You're invited to join Tenvo",
                body: customMessage || `You have been invited to join a business on Tenvo with the role: ${role}. Click the link below to accept your invitation (valid for 7 days).`,
            }),
        }).catch(err => console.error('[createUserInvitation] Email send failed:', err));

        return actionSuccess({ invitation: result.rows[0] });
    } catch (error) {
        console.error('[Admin] createUserInvitation error:', error);
        return actionFailure('CREATE_INVITATION_FAILED', error.message);
    } finally {
        client.release();
    }
}

/**
 * List invitations for a business
 */
export async function listInvitations(businessId, { status = null, page = 1, limit = 50 } = {}) {
    await requirePlatformAccess();
    const client = await pool.connect();
    
    try {
        let whereClause = 'WHERE i.business_id = $1';
        const params = [businessId];
        
        if (status) {
            whereClause += ' AND i.status = $2';
            params.push(status);
        }
        
        const result = await client.query(`
            SELECT 
                i.*,
                inviter.name as invited_by_name,
                inviter.email as invited_by_email,
                accepter.name as accepted_by_name
            FROM user_invitations i
            LEFT JOIN "user" inviter ON i.invited_by = inviter.id
            LEFT JOIN "user" accepter ON i.accepted_by = accepter.id
            ${whereClause}
            ORDER BY i.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `, [...params, limit, (page - 1) * limit]);
        
        const countResult = await client.query(
            `SELECT COUNT(*) FROM user_invitations i ${whereClause}`,
            params
        );
        
        return actionSuccess({
            invitations: result.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            limit
        });
    } catch (error) {
        console.error('[Admin] listInvitations error:', error);
        return actionFailure('LIST_INVITATIONS_FAILED', error.message);
    } finally {
        client.release();
    }
}

/**
 * Revoke invitation
 */
export async function revokeInvitation(invitationId) {
    await requirePlatformAccess();
    const client = await pool.connect();
    
    try {
        const result = await client.query(`
            UPDATE user_invitations
            SET status = 'revoked', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND status = 'pending'
            RETURNING *
        `, [invitationId]);
        
        if (result.rows.length === 0) {
            return actionFailure('NOT_FOUND', 'Invitation not found or already processed');
        }
        
        return actionSuccess({ invitation: result.rows[0] });
    } catch (error) {
        console.error('[Admin] revokeInvitation error:', error);
        return actionFailure('REVOKE_INVITATION_FAILED', error.message);
    } finally {
        client.release();
    }
}

/**
 * Validate invitation token (for public API)
 */
export async function validateInvitationToken(token) {
    const client = await pool.connect();
    
    try {
        const result = await client.query(`
            SELECT i.*, b.business_name
            FROM user_invitations i
            JOIN businesses b ON i.business_id = b.id
            WHERE i.token = $1
            AND i.status = 'pending'
            AND i.expires_at > NOW()
        `, [token]);
        
        if (result.rows.length === 0) {
            return actionFailure('INVALID_TOKEN', 'Invitation not found or expired');
        }
        
        return actionSuccess({ invitation: result.rows[0] });
    } catch (error) {
        console.error('[Admin] validateInvitationToken error:', error);
        return actionFailure('VALIDATE_TOKEN_FAILED', error.message);
    } finally {
        client.release();
    }
}

/**
 * Accept invitation (for public API)
 */
export async function acceptInvitation(token, userId) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Get and lock invitation
        const invitationResult = await client.query(`
            SELECT * FROM user_invitations
            WHERE token = $1 AND status = 'pending' AND expires_at > NOW()
            FOR UPDATE
        `, [token]);
        
        if (invitationResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return actionFailure('INVALID_TOKEN', 'Invitation not found or expired');
        }
        
        const invitation = invitationResult.rows[0];
        
        // Update invitation status
        await client.query(`
            UPDATE user_invitations
            SET status = 'accepted', accepted_by = $1, accepted_at = NOW(), updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [userId, invitation.id]);
        
        // Add user to business
        await client.query(`
            INSERT INTO business_users (business_id, user_id, role, status)
            VALUES ($1, $2, $3, 'active')
            ON CONFLICT (business_id, user_id) DO UPDATE SET
            role = EXCLUDED.role,
            status = 'active'
        `, [invitation.business_id, userId, invitation.role]);
        
        await client.query('COMMIT');
        
        return actionSuccess({ 
            message: 'Invitation accepted successfully',
            business_id: invitation.business_id,
            role: invitation.role
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Admin] acceptInvitation error:', error);
        return actionFailure('ACCEPT_INVITATION_FAILED', error.message);
    } finally {
        client.release();
    }
}

// ============================================
// ACTIVITY LOGS
// ============================================

/**
 * Log user activity
 */
export async function logUserActivity({
    userId,
    businessId,
    sessionId,
    action,
    module,
    details = {},
    ipAddress,
    userAgent
}) {
    const client = await pool.connect();
    
    try {
        await client.query(`
            INSERT INTO user_activity_logs 
            (user_id, business_id, session_id, action, module, details, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [userId, businessId, sessionId, action, module, JSON.stringify(details), ipAddress, userAgent]);
        
        return actionSuccess({ logged: true });
    } catch (error) {
        console.error('[Admin] logUserActivity error:', error);
        // Don't throw - logging failures shouldn't break functionality
        return actionFailure('LOG_ACTIVITY_FAILED', error.message);
    } finally {
        client.release();
    }
}

/**
 * Get activity logs for a business
 */
export async function getActivityLogs(businessId, { 
    userId = null, 
    action = null, 
    module = null,
    startDate = null,
    endDate = null,
    page = 1,
    limit = 50
} = {}) {
    await requirePlatformAccess();
    const client = await pool.connect();
    
    try {
        let whereClause = 'WHERE l.business_id = $1';
        const params = [businessId];
        let paramCount = 1;
        
        if (userId) {
            whereClause += ` AND l.user_id = $${++paramCount}`;
            params.push(userId);
        }
        if (action) {
            whereClause += ` AND l.action = $${++paramCount}`;
            params.push(action);
        }
        if (module) {
            whereClause += ` AND l.module = $${++paramCount}`;
            params.push(module);
        }
        if (startDate) {
            whereClause += ` AND l.created_at >= $${++paramCount}`;
            params.push(startDate);
        }
        if (endDate) {
            whereClause += ` AND l.created_at <= $${++paramCount}`;
            params.push(endDate);
        }
        
        const result = await client.query(`
            SELECT 
                l.*,
                u.name as user_name,
                u.email as user_email
            FROM user_activity_logs l
            LEFT JOIN "user" u ON l.user_id = u.id
            ${whereClause}
            ORDER BY l.created_at DESC
            LIMIT $${++paramCount} OFFSET $${++paramCount}
        `, [...params, limit, (page - 1) * limit]);
        
        const countResult = await client.query(
            `SELECT COUNT(*) FROM user_activity_logs l ${whereClause}`,
            params.slice(0, -2)
        );
        
        return actionSuccess({
            logs: result.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            limit
        });
    } catch (error) {
        console.error('[Admin] getActivityLogs error:', error);
        return actionFailure('GET_ACTIVITY_LOGS_FAILED', error.message);
    } finally {
        client.release();
    }
}

/**
 * Get activity summary for dashboard
 */
export async function getActivitySummary(businessId, days = 30) {
    await requirePlatformAccess();
    const client = await pool.connect();
    
    try {
        const result = await client.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as total_actions,
                COUNT(DISTINCT user_id) as unique_users,
                action,
                COUNT(*) as action_count
            FROM user_activity_logs
            WHERE business_id = $1
            AND created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY DATE(created_at), action
            ORDER BY date DESC, action_count DESC
        `, [businessId]);
        
        return actionSuccess({ summary: result.rows });
    } catch (error) {
        console.error('[Admin] getActivitySummary error:', error);
        return actionFailure('GET_ACTIVITY_SUMMARY_FAILED', error.message);
    } finally {
        client.release();
    }
}

// ============================================
// IMPERSONATION
// ============================================

/**
 * Start impersonation session
 */
export async function startImpersonation(targetUserId, reason, { ipAddress, userAgent }) {
    await requirePlatformAccess();
    const client = await pool.connect();
    
    try {
        // Get admin user
        const { user: admin } = await requirePlatformAccess();
        
        // Get target user's business
        const businessResult = await client.query(`
            SELECT business_id FROM business_users
            WHERE user_id = $1 AND status = 'active'
            LIMIT 1
        `, [targetUserId]);
        
        const businessId = businessResult.rows[0]?.business_id;
        
        // Create impersonation session
        const result = await client.query(`
            INSERT INTO impersonation_sessions 
            (admin_id, target_user_id, business_id, reason, ip_address, is_active)
            VALUES ($1, $2, $3, $4, $5, true)
            RETURNING *
        `, [admin.id, targetUserId, businessId, reason, ipAddress]);
        
        // Log the impersonation start
        await client.query(`
            INSERT INTO user_activity_logs 
            (user_id, business_id, action, module, details, ip_address, user_agent)
            VALUES ($1, $2, 'impersonation_started', 'admin', $3, $4, $5)
        `, [admin.id, businessId, JSON.stringify({ 
            target_user_id: targetUserId,
            impersonation_session_id: result.rows[0].id,
            reason 
        }), ipAddress, userAgent]);
        
        return actionSuccess({ 
            session: result.rows[0],
            message: 'Impersonation session started'
        });
    } catch (error) {
        console.error('[Admin] startImpersonation error:', error);
        return actionFailure('START_IMPERSONATION_FAILED', error.message);
    } finally {
        client.release();
    }
}

/**
 * End impersonation session
 */
export async function endImpersonation(sessionId, { actionsTaken = [] } = {}) {
    await requirePlatformAccess();
    const client = await pool.connect();
    
    try {
        const result = await client.query(`
            UPDATE impersonation_sessions
            SET ended_at = NOW(), is_active = false, actions_taken = $2
            WHERE id = $1 AND is_active = true
            RETURNING *
        `, [sessionId, JSON.stringify(actionsTaken)]);
        
        if (result.rows.length === 0) {
            return actionFailure('NOT_FOUND', 'Active impersonation session not found');
        }
        
        const session = result.rows[0];
        
        // Log the impersonation end
        await client.query(`
            INSERT INTO user_activity_logs 
            (user_id, business_id, action, module, details)
            VALUES ($1, $2, 'impersonation_ended', 'admin', $3)
        `, [session.admin_id, session.business_id, JSON.stringify({
            target_user_id: session.target_user_id,
            session_id: sessionId,
            duration_minutes: Math.round((new Date() - new Date(session.started_at)) / 60000),
            actions_taken: actionsTaken.length
        })]);
        
        return actionSuccess({ session: result.rows[0] });
    } catch (error) {
        console.error('[Admin] endImpersonation error:', error);
        return actionFailure('END_IMPERSONATION_FAILED', error.message);
    } finally {
        client.release();
    }
}

/**
 * List impersonation sessions
 */
export async function listImpersonationSessions({ page = 1, limit = 50, activeOnly = false } = {}) {
    await requirePlatformAccess();
    const client = await pool.connect();
    
    try {
        let whereClause = '';
        const params = [];
        
        if (activeOnly) {
            whereClause = 'WHERE s.is_active = true';
        }
        
        const result = await client.query(`
            SELECT 
                s.*,
                admin.name as admin_name,
                admin.email as admin_email,
                target.name as target_name,
                target.email as target_email,
                b.business_name
            FROM impersonation_sessions s
            LEFT JOIN "user" admin ON s.admin_id = admin.id
            LEFT JOIN "user" target ON s.target_user_id = target.id
            LEFT JOIN businesses b ON s.business_id = b.id
            ${whereClause}
            ORDER BY s.started_at DESC
            LIMIT $1 OFFSET $2
        `, [...params, limit, (page - 1) * limit]);
        
        return actionSuccess({ sessions: result.rows });
    } catch (error) {
        console.error('[Admin] listImpersonationSessions error:', error);
        return actionFailure('LIST_IMPERSONATION_FAILED', error.message);
    } finally {
        client.release();
    }
}
