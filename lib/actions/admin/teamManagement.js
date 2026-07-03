'use server';

/**
 * Team Management Server Actions
 * Owner and admin actions for managing team member accounts
 */

import { prismaBase } from '@/lib/db';
import { actionSuccess, actionFailure, getErrorMessage } from '@/lib/actions/_shared/result';
import { auth } from '@/lib/auth';
import { getServerSession } from '@/lib/auth/rbac';
import { isPlatformLevel } from '@/lib/config/platform';
import { checkPlanLimit } from '@/lib/auth/planGuard';
import { headers } from 'next/headers';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Check if the current user may manage team members for a business.
 * Platform-level users (owner/admin) bypass membership and are treated as owner.
 * Otherwise the caller must be an active owner/admin member of the business.
 */
async function checkTeamManagementPermission(businessId) {
    const session = await getServerSession();

    if (!session?.user?.id) {
        throw new Error('Unauthorized');
    }

    if (isPlatformLevel(session.user)) {
        return { userId: session.user.id, role: 'owner', isPlatform: true };
    }

    const membership = await prismaBase.business_users.findFirst({
        where: {
            business_id: businessId,
            user_id: session.user.id,
            status: 'active'
        },
        select: { role: true }
    });

    if (!membership) {
        throw new Error('Not a member of this business');
    }

    // Only owner and admin can manage team members
    if (!['owner', 'admin'].includes(membership.role)) {
        throw new Error('Insufficient permissions. Only owners and admins can manage team members.');
    }

    return { userId: session.user.id, role: membership.role, isPlatform: false };
}

/**
 * Set (or reset) a Better Auth user's password server-side.
 *
 * Mirrors what Better Auth's admin `setUserPassword` route does internally, but we
 * gate access with our own business-level permission check instead of requiring the
 * caller to hold the platform `admin` role. If the user has no credential account
 * yet (e.g. Google/OAuth signup), `updatePassword` provisions one automatically.
 */
async function applyUserPassword(targetUserId, newPassword) {
    const ctx = await auth.$context;
    const hashed = await ctx.password.hash(newPassword);
    await ctx.internalAdapter.updatePassword(targetUserId, hashed);
}

/**
 * Set a team member's password directly (Owner/Admin only).
 *
 * This is the "email/OTP isn't working" escape hatch: the owner (or admin) chooses a
 * password and the member can sign in with it immediately. The new password is applied
 * through Better Auth so it is hashed exactly like a normal signup/reset.
 */
export async function resetTeamMemberPassword({ businessId, targetUserId, newPassword }) {
    try {
        const { role, isPlatform } = await checkTeamManagementPermission(businessId);

        if (!newPassword || newPassword.length < 8) {
            return await actionFailure('INVALID_PASSWORD', 'Password must be at least 8 characters');
        }

        // Verify target user is a member of this business
        const targetMembership = await prismaBase.business_users.findFirst({
            where: {
                business_id: businessId,
                user_id: targetUserId,
                status: 'active'
            },
            include: {
                user: {
                    select: { email: true, name: true, role: true }
                }
            }
        });

        if (!targetMembership) {
            return await actionFailure('USER_NOT_FOUND', 'User is not a member of this business');
        }

        // Never let a business-level actor rotate a platform (app-owner/admin) account's
        // credentials, even if that account happens to be a member of this workspace.
        if (!isPlatform && isPlatformLevel(targetMembership.user)) {
            return await actionFailure('INSUFFICIENT_PERMISSIONS', 'This account is managed at the platform level and cannot be modified here');
        }

        if (!isPlatform) {
            // Only owner can reset admin passwords; admins cannot touch owner/admin accounts
            if (role === 'admin' && ['owner', 'admin'].includes(targetMembership.role)) {
                return await actionFailure('INSUFFICIENT_PERMISSIONS', 'Admins cannot reset owner or admin passwords');
            }

            // The owner resets their own password via Settings → Security, not here
            if (targetMembership.role === 'owner') {
                return await actionFailure('INVALID_ACTION', 'Owners must reset their own password via Settings → Security');
            }
        }

        // Hash + store the new password through Better Auth (creates a credential
        // account if the member only had an OAuth login).
        await applyUserPassword(targetUserId, newPassword);

        // Best-effort heads-up email so the member knows their password changed.
        try {
            const business = await prismaBase.businesses.findFirst({
                where: { id: businessId },
                select: { business_name: true }
            });
            const { sendTransactionalEmail } = await import('@/lib/email/resend');
            const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.tenvo.app'}/login`;
            await sendTransactionalEmail({
                to: targetMembership.user.email,
                subject: `Your ${business?.business_name || 'Tenvo'} password was updated`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #7c2d47;">Your password was updated</h2>
                    <p>An administrator of <strong>${business?.business_name || 'your workspace'}</strong> set a new password for your account.</p>
                    <p>You can sign in now with the credentials your administrator shared with you.</p>
                    <div style="margin: 24px 0;">
                      <a href="${loginUrl}" style="background: #7c2d47; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Sign in</a>
                    </div>
                    <p style="color: #6b7280; font-size: 13px;">If you did not expect this change, contact your administrator right away.</p>
                  </div>
                `,
            });
        } catch (emailError) {
            console.error('[resetTeamMemberPassword] notice email failed (non-blocking):', emailError);
        }

        return await actionSuccess({
            message: `Password set for ${targetMembership.user.email}. Share it securely — they can sign in immediately.`,
        });
    } catch (error) {
        console.error('[resetTeamMemberPassword] error:', error);
        return await actionFailure('RESET_PASSWORD_FAILED', await getErrorMessage(error));
    }
}

/**
 * Create a team member account with a password (Owner/Admin only).
 *
 * Lets an owner onboard a user without relying on email delivery or OTP: the owner
 * provides the email, a temporary password, and role. The member can sign in right
 * away with email + password. If a user with that email already exists we simply
 * (re)set their password and attach them to the business.
 */
export async function createTeamMemberWithPassword({ businessId, email, password, name = '', role = 'salesperson' }) {
    try {
        const { userId: actorId, isPlatform } = await checkTeamManagementPermission(businessId);

        const normalizedEmail = String(email || '').trim().toLowerCase();
        const normalizedRole = String(role || '').trim().toLowerCase();
        const displayName = String(name || '').trim() || normalizedEmail.split('@')[0];

        if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
            return await actionFailure('INVALID_EMAIL', 'Please provide a valid email address');
        }
        if (!password || password.length < 8) {
            return await actionFailure('INVALID_PASSWORD', 'Password must be at least 8 characters');
        }
        if (normalizedRole === 'owner') {
            return await actionFailure('INVALID_ROLE', 'A workspace can only have one owner');
        }

        // Reuse an existing user if the email is already registered
        let user = await prismaBase.user.findFirst({
            where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
            select: { id: true, email: true, name: true, role: true }
        });
        let created = false;

        // A business-level actor must not (re)set the password of a platform account.
        if (user && !isPlatform && isPlatformLevel(user)) {
            return await actionFailure('INSUFFICIENT_PERMISSIONS', 'This email belongs to a platform-managed account and cannot be provisioned here');
        }

        // Only enforce the seat limit when we are actually consuming a new active seat
        // (i.e. this person is not already an active member of the business).
        const alreadyActiveMember = user
            ? await prismaBase.business_users.findFirst({
                where: { business_id: businessId, user_id: user.id, status: 'active' },
                select: { id: true },
            })
            : null;

        if (!alreadyActiveMember) {
            const seatCount = await prismaBase.business_users.count({
                where: { business_id: businessId, status: 'active' }
            });
            await checkPlanLimit(businessId, 'max_users', seatCount);
        }

        if (user) {
            await applyUserPassword(user.id, password);
        } else {
            // signUpEmail hashes the password + creates the credential account. We pass a
            // fresh Headers() so this never rotates the calling admin's own session cookie.
            const signUp = await auth.api.signUpEmail({
                body: { email: normalizedEmail, password, name: displayName },
                headers: new Headers(),
            });
            if (!signUp?.user?.id) {
                return await actionFailure('CREATE_USER_FAILED', 'Could not create the user account');
            }
            user = { id: signUp.user.id, email: normalizedEmail, name: displayName };
            created = true;

            // Admin-provisioned logins are trusted, so mark verified to skip OTP friction.
            try {
                await prismaBase.user.update({
                    where: { id: user.id },
                    data: { emailVerified: true },
                });
            } catch (verifyErr) {
                console.error('[createTeamMemberWithPassword] emailVerified update failed (non-blocking):', verifyErr);
            }
        }

        // Attach (or reactivate) the membership for this business
        const membership = await prismaBase.business_users.upsert({
            where: {
                business_id_user_id: {
                    business_id: businessId,
                    user_id: user.id,
                }
            },
            update: {
                role: normalizedRole,
                status: 'active',
                invited_by: actorId,
            },
            create: {
                business_id: businessId,
                user_id: user.id,
                role: normalizedRole,
                status: 'active',
                invited_by: actorId,
            },
        });

        return await actionSuccess({
            created,
            member: {
                ...membership,
                user: { email: user.email, name: user.name || displayName },
            },
            message: created
                ? `Account created for ${normalizedEmail}. They can sign in now with the password you set.`
                : `${normalizedEmail} was added and their password was updated.`,
        });
    } catch (error) {
        console.error('[createTeamMemberWithPassword] error:', error);
        return await actionFailure('CREATE_MEMBER_FAILED', await getErrorMessage(error));
    }
}

/**
 * Update team member email (Owner only)
 * Changes the email address for a team member
 */
export async function updateTeamMemberEmail({ businessId, targetUserId, newEmail }) {
    try {
        const { role, isPlatform } = await checkTeamManagementPermission(businessId);

        // Only owner can change emails
        if (role !== 'owner') {
            return await actionFailure('INSUFFICIENT_PERMISSIONS', 'Only business owners can change member email addresses');
        }

        const normalizedEmail = String(newEmail || '').trim().toLowerCase();
        if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return await actionFailure('INVALID_EMAIL', 'Please provide a valid email address');
        }

        // Verify target user is a member of this business
        const targetMembership = await prismaBase.business_users.findFirst({
            where: {
                business_id: businessId,
                user_id: targetUserId,
                status: 'active'
            },
            include: {
                user: {
                    select: { email: true, name: true, role: true }
                }
            }
        });

        if (!targetMembership) {
            return await actionFailure('USER_NOT_FOUND', 'User is not a member of this business');
        }

        // Business owners cannot rewrite the email of a platform-managed account.
        if (!isPlatform && isPlatformLevel(targetMembership.user)) {
            return await actionFailure('INSUFFICIENT_PERMISSIONS', 'This account is managed at the platform level and cannot be modified here');
        }

        // Check if new email already exists
        const existingUser = await prismaBase.user.findFirst({
            where: {
                email: { equals: normalizedEmail, mode: 'insensitive' },
                id: { not: targetUserId }
            }
        });

        if (existingUser) {
            return await actionFailure('EMAIL_EXISTS', 'This email address is already registered to another user');
        }

        // Update user email
        await prismaBase.user.update({
            where: { id: targetUserId },
            data: { email: normalizedEmail }
        });

        return await actionSuccess({
            message: `Email updated successfully from ${targetMembership.user.email} to ${normalizedEmail}`,
            newEmail: normalizedEmail,
        });
    } catch (error) {
        console.error('[updateTeamMemberEmail] error:', error);
        return await actionFailure('UPDATE_EMAIL_FAILED', await getErrorMessage(error));
    }
}

/**
 * Get pending invitations for a business
 */
export async function getPendingInvitations({ businessId }) {
    try {
        await checkTeamManagementPermission(businessId);

        const invitations = await prismaBase.$queryRaw`
            SELECT 
                ui.id,
                ui.email,
                ui.role,
                ui.status,
                ui.created_at,
                ui.expires_at,
                inviter.name as invited_by_name,
                inviter.email as invited_by_email
            FROM user_invitations ui
            LEFT JOIN "user" inviter ON ui.invited_by = inviter.id
            WHERE ui.business_id = ${businessId}
            AND ui.status = 'pending'
            AND ui.expires_at > NOW()
            ORDER BY ui.created_at DESC
        `;

        return await actionSuccess({ invitations });
    } catch (error) {
        console.error('[getPendingInvitations] error:', error);
        return await actionFailure('GET_INVITATIONS_FAILED', await getErrorMessage(error));
    }
}

/**
 * Resend invitation email
 */
export async function resendInvitation({ invitationId }) {
    try {
        const invitation = await prismaBase.$queryRaw`
            SELECT 
                ui.*,
                b.business_name,
                inviter.name as inviter_name
            FROM user_invitations ui
            JOIN businesses b ON ui.business_id = b.id
            LEFT JOIN "user" inviter ON ui.invited_by = inviter.id
            WHERE ui.id = ${invitationId}
            AND ui.status = 'pending'
            AND ui.expires_at > NOW()
        `;

        if (!invitation || invitation.length === 0) {
            return await actionFailure('INVITATION_NOT_FOUND', 'Invitation not found or expired');
        }

        const inv = invitation[0];

        await checkTeamManagementPermission(inv.business_id);

        // Resend invitation email
        const headersList = await headers();
        const protocol = headersList.get('x-forwarded-proto') || 'https';
        const host = headersList.get('host') || 'localhost:3000';
        const inviteUrl = `${protocol}://${host}/accept-invitation?token=${inv.token}`;

        const React = (await import('react')).default;
        const { TeamInvitationEmail } = await import('@/lib/email/templates/TeamInvitationEmail');
        const { sendTransactionalEmail } = await import('@/lib/email/resend');

        await sendTransactionalEmail({
            to: inv.email,
            subject: `Reminder: You've been invited to join ${inv.business_name} on Tenvo`,
            react: React.createElement(TeamInvitationEmail, {
                inviteUrl,
                businessName: inv.business_name,
                role: inv.role,
                inviterName: inv.inviter_name,
                customMessage: inv.custom_message,
            }),
        });

        return await actionSuccess({
            message: `Invitation resent to ${inv.email}`,
        });
    } catch (error) {
        console.error('[resendInvitation] error:', error);
        return await actionFailure('RESEND_INVITATION_FAILED', await getErrorMessage(error));
    }
}

/**
 * Cancel/revoke invitation
 */
export async function cancelInvitation({ invitationId }) {
    try {
        const invitation = await prismaBase.$queryRaw`
            SELECT business_id, email
            FROM user_invitations
            WHERE id = ${invitationId}
            AND status = 'pending'
        `;

        if (!invitation || invitation.length === 0) {
            return await actionFailure('INVITATION_NOT_FOUND', 'Invitation not found');
        }

        await checkTeamManagementPermission(invitation[0].business_id);

        await prismaBase.$executeRaw`
            UPDATE user_invitations
            SET status = 'revoked', updated_at = CURRENT_TIMESTAMP
            WHERE id = ${invitationId}
        `;

        return await actionSuccess({
            message: `Invitation to ${invitation[0].email} has been cancelled`,
        });
    } catch (error) {
        console.error('[cancelInvitation] error:', error);
        return await actionFailure('CANCEL_INVITATION_FAILED', await getErrorMessage(error));
    }
}
