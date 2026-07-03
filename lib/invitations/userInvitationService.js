/**
 * Shared user invitation insert + email — used by platform admin and tenant team flows.
 */

import pool from '@/lib/db';
import { randomBytes } from 'crypto';
import { sendTransactionalEmail } from '@/lib/email/resend';

/**
 * @param {import('pg').PoolClient} client
 * @param {{ email: string, businessId: string, role: string, invitedByUserId: string, customMessage?: string }} params
 */
export async function insertUserInvitationRow(client, {
  email,
  businessId,
  role,
  invitedByUserId,
  customMessage,
}) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const result = await client.query(
    `INSERT INTO user_invitations
     (email, business_id, role, invited_by, token, expires_at, custom_message, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
     RETURNING *`,
    [email, businessId, role, invitedByUserId, token, expiresAt, customMessage ?? null]
  );

  return { invitation: result.rows[0], token, expiresAt };
}

/**
 * @param {{ to: string, token: string, businessName: string, role: string, inviterName: string, customMessage?: string }} params
 */
export async function sendUserInvitationEmail({
  to,
  token,
  businessName,
  role,
  inviterName,
  customMessage,
}) {
  const { headers } = await import('next/headers');
  const headersList = await headers();
  const protocol = headersList.get('x-forwarded-proto') || 'https';
  const host = headersList.get('host') || 'localhost:3000';
  const inviteUrl = `${protocol}://${host}/accept-invitation?token=${token}`;

  const React = (await import('react')).default;
  const { TeamInvitationEmail } = await import('@/lib/email/templates/TeamInvitationEmail');

  await sendTransactionalEmail({
    to,
    subject: `You've been invited to join ${businessName} on Tenvo`,
    react: React.createElement(TeamInvitationEmail, {
      inviteUrl,
      businessName,
      role,
      inviterName,
      customMessage,
    }),
  });
}

/**
 * Create invitation row and send email (caller must enforce auth).
 */
export async function createUserInvitationForBusiness({
  email,
  businessId,
  role,
  invitedByUserId,
  customMessage,
}) {
  const client = await pool.connect();

  try {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Email is required');
    }

    const { invitation, token } = await insertUserInvitationRow(client, {
      email: normalizedEmail,
      businessId,
      role,
      invitedByUserId,
      customMessage,
    });

    const businessResult = await client.query(
      `SELECT business_name FROM businesses WHERE id = $1`,
      [businessId]
    );
    const businessName = businessResult.rows[0]?.business_name || 'Unknown Business';

    const inviterResult = await client.query(
      `SELECT name FROM "user" WHERE id = $1`,
      [invitedByUserId]
    );
    const inviterName = inviterResult.rows[0]?.name || 'Team member';

    sendUserInvitationEmail({
      to: normalizedEmail,
      token,
      businessName,
      role,
      inviterName,
      customMessage,
    }).catch((err) => console.error('[createUserInvitationForBusiness] Email send failed:', err));

    return invitation;
  } finally {
    client.release();
  }
}
