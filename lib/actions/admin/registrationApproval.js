'use server';

/**
 * Registration Approval Actions
 * 
 * Platform owner workflow for approving/rejecting new business registrations.
 * Similar to Zoho/Busy approval workflow where users must wait for access approval.
 * 
 * Features:
 * - Pending registration list with metadata
 * - Approve/reject/request info workflows
 * - Demo request tracking
 * - Email notifications on approval/rejection
 * - Audit trail in registration_requests table
 */

import { prismaBase } from '@/lib/db';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { isPlatformOwner, isPlatformLevel } from '@/lib/config/platform';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { createNotification, NOTIFICATION_TYPES, NOTIFICATION_PRIORITY } from '@/lib/notifications/notificationHelpers';
import { actionSuccess, actionFailure, getErrorMessage } from '@/lib/actions/_shared/result';
import { getServerSession } from '@/lib/auth/rbac';
import { applyManualSubscriptionPaymentTx } from '@/lib/payments/manualSubscriptionPayment';

/**
 * Decide whether an approval call also carries an offline payment to record.
 * A payment is only applied when a paid plan tier or a domain package is supplied.
 * @param {object|null} payment
 * @returns {boolean}
 */
function hasPaymentToRecord(payment) {
  if (!payment || typeof payment !== 'object') return false;
  const tier = String(payment.planTier || '').trim().toLowerCase();
  const pkg = String(payment.domainPackageKey || '').trim();
  return Boolean(pkg) || (Boolean(tier) && tier !== 'free');
}

/**
 * Require platform-level access for all registration approval actions.
 * Covers both the platform owner (by email) and BetterAuth admin-role users.
 */
async function requirePlatformOwnerAccess() {
  const session = await getServerSession();

  if (!session?.user) {
    throw new Error('Unauthorized - Please log in');
  }

  if (!isPlatformLevel(session.user)) {
    throw new Error('Forbidden - Platform administrator access required');
  }

  return session;
}

/**
 * Get all pending registration requests (Platform Owner Only)
 * Returns requests waiting for approval, recently approved/rejected for context
 * 
 * @returns {Promise<Object>} { success, requests: [], stats: {} }
 */
export async function getPendingRegistrations() {
  try {
    const session = await requirePlatformOwnerAccess();

    const requests = await prismaBase.registration_requests.findMany({
      where: {
        status: {
          in: ['pending', 'info_requested']
        }
      },
      orderBy: {
        requested_at: 'desc'
      },
      take: 100,
    });

    // Get quick stats for admin dashboard
    const stats = await prismaBase.registration_requests.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    const statsMap = Object.fromEntries(
      stats.map(s => [s.status, s._count.id])
    );

    return await actionSuccess({
      requests,
      stats: statsMap,
      total: requests.length,
    });
  } catch (error) {
    console.error('[getPendingRegistrations] Error:', error);
    return await actionFailure('GET_PENDING_FAILED', await getErrorMessage(error));
  }
}

/**
 * Get all registration requests (with filters) for admin panel
 * 
 * @param {Object} options - Filter options
 * @param {string} [options.status] - Filter by status
 * @param {number} [options.page] - Page number (1-indexed)
 * @param {number} [options.limit] - Results per page
 * @returns {Promise<Object>} Paginated results
 */
export async function getAllRegistrationRequests({ status = null, page = 1, limit = 50 } = {}) {
  try {
    const session = await requirePlatformOwnerAccess();

    const where = status ? { status } : {};
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      prismaBase.registration_requests.findMany({
        where,
        orderBy: {
          requested_at: 'desc'
        },
        skip,
        take: limit,
      }),
      prismaBase.registration_requests.count({ where }),
    ]);

    return await actionSuccess({
      requests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[getAllRegistrationRequests] Error:', error);
    return await actionFailure('GET_REQUESTS_FAILED', await getErrorMessage(error));
  }
}

/**
 * Approve a registration request
 * - Updates business approval_status to 'approved'
 * - Updates business is_active to true
 * - Records decision in audit trail
 * - Sends approval email to business owner
 * - Creates in-app notification
 * 
 * Optionally records an offline/manual subscription payment in the SAME transaction,
 * so the platform owner can grant access and activate a paid plan/package in one step.
 * Whether to enable access is always the platform owner's decision — payment is optional.
 *
 * @param {Object} params
 * @param {string} params.businessId - Business ID to approve
 * @param {string} [params.notes] - Optional approval notes
 * @param {Object|null} [params.payment] - Optional manual payment to record on approval
 * @param {string} [params.payment.planTier] - Paid tier to activate
 * @param {string} [params.payment.domainPackageKey] - Domain package to activate
 * @param {number} [params.payment.extendDays] - Access days from now (default 30)
 * @param {number} [params.payment.amountMajor] - Amount received (major units)
 * @param {string} [params.payment.currency] - Currency code (default PKR)
 * @param {string} [params.payment.paymentReference] - Bank/wallet transaction id
 * @param {string} [params.payment.paymentMethod] - e.g. bank_transfer, jazzcash
 * @param {string} [params.payment.notes] - Payment notes
 * @returns {Promise<Object>} Result with business details
 */
export async function approveRegistration({ businessId, notes = '', payment = null }) {
  try {
    const session = await requirePlatformOwnerAccess();

    if (!businessId) {
      return await actionFailure('MISSING_BUSINESS_ID', 'Business ID is required');
    }

    const recordPayment = hasPaymentToRecord(payment);
    let paymentApplied = null;

    const result = await prismaBase.$transaction(async (tx) => {
      // Record the offline payment first (sets plan tier, quotas, and plan_expires_at)
      if (recordPayment) {
        paymentApplied = await applyManualSubscriptionPaymentTx(tx, {
          businessId,
          planTier: payment.planTier ?? null,
          domainPackageKey: payment.domainPackageKey ?? null,
          extendDays: payment.extendDays ?? 30,
          amountMajor: payment.amountMajor ?? null,
          amountMinor: payment.amountMinor ?? null,
          currency: payment.currency || 'PKR',
          paymentReference: payment.paymentReference || '',
          paymentMethod: payment.paymentMethod || '',
          notes: payment.notes || '',
          recordedByUserId: session.user.id,
          recordedByEmail: session.user.email,
          source: 'registration_approval_manual_payment',
        });
      }

      // Update business status (enable dashboard access)
      const business = await tx.businesses.update({
        where: { id: businessId },
        data: {
          approval_status: 'approved',
          approval_decided_at: new Date(),
          approval_decided_by: session.user.id,
          approval_notes: notes || null,
          is_active: true,
        },
        select: {
          id: true,
          business_name: true,
          email: true,
          domain: true,
          user_id: true,
          category: true,
          plan_tier: true,
          plan_expires_at: true,
        }
      });

      // Update registration request audit trail
      await tx.registration_requests.updateMany({
        where: { business_id: businessId },
        data: {
          status: 'approved',
          status_updated_at: new Date(),
          decided_by: session.user.id,
          decided_at: new Date(),
          decision_notes: notes || null,
        }
      });

      return business;
    });

    // Send approval email (non-blocking)
    try {
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.tenvo.app'}/business/${result.domain}`;
      const supportEmail = process.env.SUPPORT_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@tenvo.app';

      await sendTransactionalEmail({
        to: result.email,
        subject: `Welcome to Tenvo - Your ${result.business_name} workspace is ready!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c2d47;">✅ Registration Approved!</h2>
            
            <p>Great news! Your registration for <strong>${result.business_name}</strong> has been approved.</p>
            
            <p>You can now access your dashboard and start managing your ${result.category} business:</p>
            
            <div style="margin: 30px 0;">
              <a href="${dashboardUrl}" style="background: #7c2d47; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                Open Dashboard →
              </a>
            </div>
            
            <p><strong>Your Plan:</strong> ${result.plan_tier}</p>
            <p><strong>Dashboard URL:</strong> <a href="${dashboardUrl}">${dashboardUrl}</a></p>
            
            ${notes ? `<div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;"><strong>Note from our team:</strong></p>
              <p style="margin: 8px 0 0 0;">${notes}</p>
            </div>` : ''}
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #6b7280; font-size: 14px;">
              Need help getting started? Check out our <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.tenvo.app'}/docs" style="color: #7c2d47;">documentation</a> or contact us at <a href="mailto:${supportEmail}" style="color: #7c2d47;">${supportEmail}</a>
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('[approveRegistration] Email send failed (non-blocking):', emailError);
    }

    // Create in-app notification (non-blocking)
    try {
      await createNotification({
        businessId: result.id,
        userId: result.user_id,
        type: NOTIFICATION_TYPES.SYSTEM,
        title: 'Registration Approved! 🎉',
        message: paymentApplied
          ? `Your ${result.business_name} workspace is approved and your ${paymentApplied.planTier} plan is now active. Welcome to Tenvo!`
          : `Your ${result.business_name} workspace has been approved and is now active. Welcome to Tenvo!`,
        actionUrl: `/business/${result.domain}?tab=dashboard`,
        priority: NOTIFICATION_PRIORITY.HIGH,
        metadata: {
          approval_type: 'registration',
          approved_by: session.user.email,
          payment_recorded: Boolean(paymentApplied),
          plan_tier: paymentApplied?.planTier || result.plan_tier,
        },
      });
    } catch (notifError) {
      console.error('[approveRegistration] Notification creation failed (non-blocking):', notifError);
    }

    return await actionSuccess({
      business: result,
      paymentApplied,
      message: paymentApplied
        ? `Access granted for ${result.business_name} and payment recorded (${paymentApplied.planTier}).`
        : `Registration approved for ${result.business_name}`,
    });
  } catch (error) {
    console.error('[approveRegistration] Error:', error);
    return await actionFailure('APPROVE_FAILED', await getErrorMessage(error));
  }
}

/**
 * Reject a registration request
 * - Updates business approval_status to 'rejected'
 * - Sets is_active to false
 * - Records rejection reason
 * - Sends rejection email (professional, helpful)
 * 
 * @param {Object} params
 * @param {string} params.businessId - Business ID to reject
 * @param {string} [params.reason] - Rejection reason (sent to user)
 * @returns {Promise<Object>} Result with business details
 */
export async function rejectRegistration({ businessId, reason = '' }) {
  try {
    const session = await requirePlatformOwnerAccess();

    if (!businessId) {
      return await actionFailure('MISSING_BUSINESS_ID', 'Business ID is required');
    }

    const result = await prismaBase.$transaction(async (tx) => {
      // Update business status
      const business = await tx.businesses.update({
        where: { id: businessId },
        data: {
          approval_status: 'rejected',
          approval_decided_at: new Date(),
          approval_decided_by: session.user.id,
          approval_notes: reason || null,
          is_active: false,
        },
        select: {
          id: true,
          business_name: true,
          email: true,
          user_id: true,
        }
      });

      // Update registration request
      await tx.registration_requests.updateMany({
        where: { business_id: businessId },
        data: {
          status: 'rejected',
          status_updated_at: new Date(),
          decided_by: session.user.id,
          decided_at: new Date(),
          decision_notes: reason || null,
        }
      });

      return business;
    });

    // Send rejection email (professional, helpful tone)
    try {
      const supportEmail = process.env.SUPPORT_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@tenvo.app';
      const homeUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.tenvo.app';

      await sendTransactionalEmail({
        to: result.email,
        subject: 'Tenvo Registration Update',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c2d47;">Registration Update</h2>
            
            <p>Thank you for your interest in Tenvo for <strong>${result.business_name}</strong>.</p>
            
            <p>After reviewing your registration, we're unable to approve your account at this time.</p>
            
            ${reason ? `<div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; font-weight: 600; color: #991b1b;">Reason:</p>
              <p style="margin: 8px 0 0 0; color: #7f1d1d;">${reason}</p>
            </div>` : ''}
            
            <p>If you believe this was a mistake or have questions about your registration, please don't hesitate to contact our support team.</p>
            
            <div style="margin: 30px 0;">
              <a href="mailto:${supportEmail}" style="background: #7c2d47; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                Contact Support
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #6b7280; font-size: 14px;">
              Email us at <a href="mailto:${supportEmail}" style="color: #7c2d47;">${supportEmail}</a> or visit <a href="${homeUrl}" style="color: #7c2d47;">our website</a> for more information.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('[rejectRegistration] Email send failed (non-blocking):', emailError);
    }

    return await actionSuccess({
      business: result,
      message: `Registration rejected for ${result.business_name}`,
    });
  } catch (error) {
    console.error('[rejectRegistration] Error:', error);
    return await actionFailure('REJECT_FAILED', await getErrorMessage(error));
  }
}

/**
 * Request more information from user
 * - Sets status to 'info_requested'
 * - Sends message to user via in-app notification
 * - User remains in pending state until they respond or admin approves
 * 
 * @param {Object} params
 * @param {string} params.businessId - Business ID
 * @param {string} params.message - What information is needed
 * @returns {Promise<Object>} Result
 */
export async function requestMoreInfo({ businessId, message }) {
  try {
    const session = await requirePlatformOwnerAccess();

    if (!businessId || !message) {
      return await actionFailure('MISSING_PARAMS', 'Business ID and message are required');
    }

    const business = await prismaBase.businesses.update({
      where: { id: businessId },
      data: {
        approval_status: 'info_requested',
        approval_notes: message,
      },
      select: {
        id: true,
        business_name: true,
        email: true,
        domain: true,
        user_id: true,
      }
    });

    // Update registration request
    await prismaBase.registration_requests.updateMany({
      where: { business_id: businessId },
      data: {
        status: 'info_requested',
        status_updated_at: new Date(),
        decision_notes: message,
      }
    });

    // Create in-app notification
    try {
      await createNotification({
        businessId: business.id,
        userId: business.user_id,
        type: NOTIFICATION_TYPES.SYSTEM,
        title: 'More Information Needed',
        message: message || 'We need additional information to complete your registration.',
        priority: NOTIFICATION_PRIORITY.HIGH,
        metadata: {
          requested_by: session.user.email,
        },
      });
    } catch (notifError) {
      console.error('[requestMoreInfo] Notification failed (non-blocking):', notifError);
    }

    // Send email notification
    try {
      const supportEmail = process.env.SUPPORT_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@tenvo.app';

      await sendTransactionalEmail({
        to: business.email,
        subject: 'Additional Information Needed - Tenvo Registration',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c2d47;">Additional Information Needed</h2>
            
            <p>We're reviewing your registration for <strong>${business.business_name}</strong> and need some additional information to proceed.</p>
            
            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; font-weight: 600; color: #1e40af;">What we need:</p>
              <p style="margin: 8px 0 0 0; color: #1e3a8a;">${message}</p>
            </div>
            
            <p>Please reply to this email with the requested information, or contact us directly:</p>
            
            <div style="margin: 30px 0;">
              <a href="mailto:${supportEmail}" style="background: #7c2d47; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                Reply to Support
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              Once we receive the information, we'll complete your registration review promptly.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('[requestMoreInfo] Email failed (non-blocking):', emailError);
    }

    return await actionSuccess({
      business,
      message: 'Information request sent',
    });
  } catch (error) {
    console.error('[requestMoreInfo] Error:', error);
    return await actionFailure('REQUEST_INFO_FAILED', await getErrorMessage(error));
  }
}

/**
 * Record demo request (when user clicks "Book a Demo" during pending approval)
 * - Updates business is_demo_requested flag
 * - Records timestamp for sales pipeline tracking
 * - Does NOT send emails (separate Calendly integration handles scheduling)
 * 
 * @param {Object} params
 * @param {string} params.businessId - Business ID
 * @returns {Promise<Object>} Result
 */
export async function recordDemoRequest({ businessId }) {
  try {
    if (!businessId) {
      return await actionFailure('MISSING_BUSINESS_ID', 'Business ID is required');
    }

    // This is a self-serve action from the pending-approval screen, so the caller
    // must be signed in and either a member of the business or a platform user.
    // Prevents anonymous callers from flipping the demo flag on arbitrary businesses.
    const session = await getServerSession();
    if (!session?.user?.id) {
      return await actionFailure('UNAUTHORIZED', 'Please log in to request a demo');
    }

    if (!isPlatformLevel(session.user)) {
      const membership = await prismaBase.business_users.findFirst({
        where: { business_id: businessId, user_id: session.user.id },
        select: { id: true },
      });
      if (!membership) {
        return await actionFailure('FORBIDDEN', 'You do not have access to this business');
      }
    }

    await prismaBase.$transaction(async (tx) => {
      // Update business
      await tx.businesses.update({
        where: { id: businessId },
        data: {
          is_demo_requested: true,
          demo_requested_at: new Date(),
        }
      });

      // Update registration request
      await tx.registration_requests.updateMany({
        where: { business_id: businessId },
        data: {
          demo_requested: true,
          demo_requested_at: new Date(),
        }
      });
    });

    return await actionSuccess({
      businessId,
      demoRequested: true,
      message: 'Demo request recorded',
    });
  } catch (error) {
    console.error('[recordDemoRequest] Error:', error);
    return await actionFailure('RECORD_DEMO_FAILED', await getErrorMessage(error));
  }
}

/**
 * Bulk approve multiple registrations (for platform owner efficiency)
 * 
 * @param {Object} params
 * @param {string[]} params.businessIds - Array of business IDs
 * @param {string} [params.notes] - Optional notes for all
 * @returns {Promise<Object>} Results with success/failure counts
 */
export async function bulkApproveRegistrations({ businessIds, notes = '' }) {
  try {
    const session = await requirePlatformOwnerAccess();

    if (!Array.isArray(businessIds) || businessIds.length === 0) {
      return await actionFailure('MISSING_BUSINESS_IDS', 'Business IDs array is required');
    }

    const results = {
      successful: [],
      failed: [],
    };

    for (const businessId of businessIds) {
      try {
        const result = await approveRegistration({ businessId, notes });
        if (result.success) {
          results.successful.push(businessId);
        } else {
          results.failed.push({ businessId, error: result.error });
        }
      } catch (error) {
        results.failed.push({ businessId, error: error.message });
      }
    }

    return await actionSuccess({
      approved: results.successful.length,
      failed: results.failed.length,
      results,
      message: `Approved ${results.successful.length} of ${businessIds.length} registrations`,
    });
  } catch (error) {
    console.error('[bulkApproveRegistrations] Error:', error);
    return await actionFailure('BULK_APPROVE_FAILED', await getErrorMessage(error));
  }
}
