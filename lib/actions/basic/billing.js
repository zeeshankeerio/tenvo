'use server';

import { prismaBase } from '@/lib/db';
import { actionSuccess, actionFailure, getErrorMessage } from '@/lib/actions/_shared/result';
import { withGuard } from '@/lib/rbac/serverGuard';
import { resolvePlanTier } from '@/lib/config/plans';
import { resolveBillableSku, listDomainPackageBillableSkus } from '@/lib/payments/billingSku';
import {
  buildPendingManualPaymentRequest,
  getManualPaymentRequestState,
  mergePendingManualPaymentRequest,
  getManualPaymentPayeeInstructions,
  isPaymentReferenceAlreadyUsed,
} from '@/lib/payments/manualPaymentRequests';
import {
  sendManualPaymentSubmittedToPlatformEmail,
} from '@/lib/email/manualBillingEmails';

/**
 * Owner: submit offline payment proof (txn ID) for platform review.
 */
export async function submitManualSubscriptionPaymentRequestAction({
  businessId,
  planTier,
  domainPackageKey,
  paymentReference,
  paymentMethod = 'other',
  amountMajor,
  currency = 'PKR',
  notes = '',
}) {
  try {
    const guard = await withGuard(businessId, { permission: 'settings.billing' });

    const ref = String(paymentReference || '').trim();
    if (ref.length < 4) {
      return await actionFailure(
        'INVALID_REFERENCE',
        'Enter a valid transaction or bank reference (at least 4 characters).'
      );
    }

    if (amountMajor != null && amountMajor !== '' && Number(amountMajor) <= 0) {
      return await actionFailure('INVALID_AMOUNT', 'Amount must be greater than zero when provided.');
    }

    if (!planTier && !domainPackageKey) {
      return await actionFailure(
        'MISSING_BILLING_SKU',
        'Select a plan tier or domain package for this payment.'
      );
    }

    const billable = resolveBillableSku({
      planTier,
      domainPackageKey,
      currency,
    });
    if (!billable) {
      return await actionFailure('INVALID_BILLING_SKU', 'Unknown plan or package.');
    }
    const { catalog: catalogItem } = billable;

    const biz = await prismaBase.businesses.findFirst({
      where: { id: businessId },
      select: { settings: true, business_name: true, domain: true, email: true },
    });
    if (!biz) {
      return await actionFailure('NOT_FOUND', 'Business not found.');
    }

    const paymentState = getManualPaymentRequestState(biz.settings);
    if (paymentState.pending?.status === 'pending') {
      return await actionFailure(
        'PENDING_EXISTS',
        'You already have a payment under review. Wait for approval or contact support.'
      );
    }

    if (isPaymentReferenceAlreadyUsed(paymentState, ref)) {
      return await actionFailure(
        'DUPLICATE_REFERENCE',
        'This transaction reference was already used for an approved payment. Contact support if this is an error.'
      );
    }

    const request = buildPendingManualPaymentRequest({
      planTier: catalogItem.planTier,
      domainPackageKey: catalogItem.domainPackageKey,
      paymentReference: ref,
      paymentMethod,
      amountMajor,
      currency,
      notes,
      submittedByUserId: guard?.user?.id,
      submittedByEmail: guard?.user?.email,
    });

    const nextSettings = mergePendingManualPaymentRequest(biz.settings, request);

    await prismaBase.businesses.update({
      where: { id: businessId },
      data: { settings: nextSettings, updated_at: new Date() },
    });

    void sendManualPaymentSubmittedToPlatformEmail({
      businessName: biz.business_name,
      businessDomain: biz.domain,
      businessId,
      paymentReference: ref,
      paymentMethod,
      planTier: catalogItem.planTier,
      domainPackageKey: catalogItem.domainPackageKey,
      amountMajor,
      currency,
      submittedByEmail: guard?.user?.email,
    });

    return await actionSuccess({ request, message: 'Payment submitted for review.' });
  } catch (error) {
    const code = /** @type {{ code?: string }} */ (error)?.code;
    if (code === 'UNAUTHENTICATED' || code === 'PERMISSION_DENIED' || code === 'BUSINESS_ACCESS_DENIED') {
      return await actionFailure(code === 'UNAUTHENTICATED' ? 'UNAUTHENTICATED' : 'FORBIDDEN', await getErrorMessage(error));
    }
    console.error('submitManualSubscriptionPaymentRequestAction:', error);
    return await actionFailure('MANUAL_PAYMENT_REQUEST_FAILED', await getErrorMessage(error));
  }
}

/**
 * Owner: read pending/history + payee instructions for offline billing UI.
 */
export async function getManualSubscriptionPaymentContextAction(businessId) {
  try {
    await withGuard(businessId, { permission: 'settings.billing' });

    const biz = await prismaBase.businesses.findFirst({
      where: { id: businessId },
      select: { settings: true, plan_tier: true },
    });
    if (!biz) {
      return await actionFailure('NOT_FOUND', 'Business not found.');
    }

    const { pending, history } = getManualPaymentRequestState(biz.settings);

    return await actionSuccess({
      pending,
      history,
      payeeInstructions: getManualPaymentPayeeInstructions(),
      domainPackages: listDomainPackageBillableSkus({ currency: 'pkr' }),
      currentPlanTier: resolvePlanTier(biz.plan_tier || 'free'),
    });
  } catch (error) {
    const code = /** @type {{ code?: string }} */ (error)?.code;
    if (code === 'UNAUTHENTICATED' || code === 'PERMISSION_DENIED') {
      return await actionFailure(code === 'UNAUTHENTICATED' ? 'UNAUTHENTICATED' : 'FORBIDDEN', await getErrorMessage(error));
    }
    return await actionFailure('MANUAL_PAYMENT_CONTEXT_FAILED', await getErrorMessage(error));
  }
}

/**
 * Validate owner-selected SKU exists (used by client before submit).
 */
export async function validateManualPaymentSkuAction({ planTier, domainPackageKey, currency = 'pkr' }) {
  const billable = resolveBillableSku({ planTier, domainPackageKey, currency });
  if (!billable) {
    return await actionFailure('INVALID_BILLING_SKU', 'Invalid plan or package.');
  }
  const { catalog: item, amountMajor } = billable;
  return await actionSuccess({
    planTier: item.planTier,
    domainPackageKey: item.domainPackageKey,
    productName: item.productName,
    billingKind: item.kind,
    amountMajor,
    currency: item.currency,
  });
}
