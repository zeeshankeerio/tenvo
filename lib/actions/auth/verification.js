'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import pool, { prismaBase } from '@/lib/db';
import { randomBytes } from 'crypto';
import { sendTransactionalEmail } from '@/lib/email/resend';

const VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a verification token for email verification
 */
export async function generateVerificationToken(userId, email) {
  const client = await pool.connect();
  
  try {
    // Generate random token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY);

    // Store token in database
    await client.query(
      `INSERT INTO email_verifications (user_id, email, token, expires_at, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         token = EXCLUDED.token,
         expires_at = EXCLUDED.expires_at,
         created_at = EXCLUDED.created_at`,
      [userId, email, token, expiresAt]
    );

    return { success: true, token };
  } catch (error) {
    console.error('[generateVerificationToken] Error:', error);
    return { success: false, error: 'Failed to generate verification token' };
  } finally {
    client.release();
  }
}

/**
 * Send verification email to user
 */
export async function sendVerificationEmail(userId, email, name = '') {
  try {
    // Generate token
    const tokenResult = await generateVerificationToken(userId, email);
    if (!tokenResult.success) {
      return tokenResult;
    }

    const { token } = tokenResult;

    // Get base URL
    const headersList = await headers();
    const protocol = headersList.get('x-forwarded-proto') || 'https';
    const host = headersList.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Build verification URL
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

    const { AuthVerificationLinkEmail } = await import('@/lib/email/templates/AuthVerificationLinkEmail');
    const React = (await import('react')).default;
    const emailResult = await sendTransactionalEmail({
      to: email,
      subject: 'Verify your email, Tenvo',
      react: React.createElement(AuthVerificationLinkEmail, {
        verificationUrl,
        headline: 'Verify your email address',
        body: 'Click the button below to verify your email and continue registration. This link expires in 24 hours.',
      }),
    });

    if (!emailResult.success && !emailResult.skipped) {
      console.error('[sendVerificationEmail] Email send failed:', emailResult.error);
    }

    return { 
      success: true, 
      message: 'Verification email sent',
      ...(process.env.NODE_ENV !== 'production' ? { verificationUrl } : {})
    };
  } catch (error) {
    console.error('[sendVerificationEmail] Error:', error);
    return { success: false, error: 'Failed to send verification email' };
  }
}

/**
 * Verify email with token
 */
export async function verifyEmail(token) {
  const client = await pool.connect();
  
  try {
    // Find valid token
    const result = await client.query(
      `SELECT * FROM email_verifications 
       WHERE token = $1 
       AND expires_at > NOW()
       AND verified_at IS NULL`,
      [token]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Invalid or expired verification token' };
    }

    const verification = result.rows[0];

    // Mark as verified
    await client.query(
      `UPDATE email_verifications 
       SET verified_at = NOW()
       WHERE id = $1`,
      [verification.id]
    );

    // Update user's emailVerified status in Better Auth
    await auth.api.updateUser({
      userId: verification.user_id,
      data: { emailVerified: true }
    });

    return { success: true, message: 'Email verified successfully' };
  } catch (error) {
    console.error('[verifyEmail] Error:', error);
    return { success: false, error: 'Failed to verify email' };
  } finally {
    client.release();
  }
}

/**
 * Check if email is verified
 */
export async function isEmailVerified(userId) {
  try {
    const u = await prismaBase.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });
    if (u?.emailVerified) {
      return { success: true, isVerified: true };
    }
  } catch (error) {
    console.error('[isEmailVerified] prisma user lookup:', error);
    return { success: false, error: 'Failed to check verification status' };
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT verified_at FROM email_verifications 
       WHERE user_id = $1 
       AND verified_at IS NOT NULL`,
      [userId]
    );

    return { success: true, isVerified: result.rows.length > 0 };
  } catch (error) {
    console.error('[isEmailVerified] Error:', error);
    return { success: false, error: 'Failed to check verification status' };
  } finally {
    client.release();
  }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(userId, email, name = '') {
  try {
    // Check if already verified
    const checkResult = await isEmailVerified(userId);
    if (checkResult.success && checkResult.isVerified) {
      return { success: false, error: 'Email is already verified' };
    }

    // Check rate limiting (max 3 resends per hour)
    const canResend = await checkResendLimit(userId);
    if (!canResend) {
      return { 
        success: false, 
        error: 'Too many attempts. Please try again in an hour.' 
      };
    }

    return await sendVerificationEmail(userId, email, name);
  } catch (error) {
    console.error('[resendVerificationEmail] Error:', error);
    return { success: false, error: 'Failed to resend verification email' };
  }
}

/**
 * Check if user can resend verification (rate limiting)
 */
async function checkResendLimit(userId) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT COUNT(*) as count 
       FROM email_verifications 
       WHERE user_id = $1 
       AND created_at > NOW() - INTERVAL '1 hour'`,
      [userId]
    );

    return result.rows[0].count < 3;
  } catch (error) {
    console.error('[checkResendLimit] Error:', error);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Generate HTML email template for verification
 */
function generateVerificationEmailTemplate({ name, verificationUrl }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Tenvo</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: bold; color: #2563eb; }
    .content { background: #f9fafb; padding: 30px; border-radius: 8px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
    .link { color: #2563eb; word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Tenvo</div>
    </div>
    
    <div class="content">
      <h2>Verify Your Email Address</h2>
      
      <p>Hi ${name || 'there'},</p>
      
      <p>Thank you for signing up for Tenvo! To complete your registration and start managing your business, please verify your email address.</p>
      
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p><a href="${verificationUrl}" class="link">${verificationUrl}</a></p>
      
      <p>This link will expire in 24 hours for security reasons.</p>
      
      <p>If you didn't create an account with Tenvo, you can safely ignore this email.</p>
    </div>
    
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Tenvo. All rights reserved.</p>
      <p>Questions? Contact us at support@tenvo.app</p>
    </div>
  </div>
</body>
</html>
  `;
}
