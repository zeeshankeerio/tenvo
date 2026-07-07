'use client';

import { businessAPI } from '@/lib/api/business';
import notify, { TOAST_IDS } from '@/lib/utils/appToast';

const BLOCKED_APPROVAL_STATUSES = new Set([
  'pending_approval',
  'info_requested',
  'rejected',
]);

function resolveOnboardingRegisterPath() {
  if (typeof window === 'undefined') return '/register';
  try {
    const savedStep = localStorage.getItem('tenvo_registration_step');
    if (savedStep === '3') return '/register?step=3';
    if (savedStep === '2') return '/register?step=2';
  } catch {
    /* ignore */
  }
  return '/register';
}

/**
 * Allow same-origin relative paths only (blocks open redirects).
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
function resolveSafeInternalPath(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  if (trimmed.startsWith('/login') || trimmed.startsWith('/register')) return null;
  return trimmed;
}

/**
 * Read post-login return path from ?next=, ?redirect=, or ?callbackUrl=.
 * @returns {string | null}
 */
export function readPostAuthReturnPath() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);

  for (const key of ['next', 'redirect', 'callbackUrl']) {
    const raw = params.get(key);
    if (!raw) continue;

    if (key === 'callbackUrl' && raw.includes('://')) {
      try {
        const parsed = new URL(raw);
        if (parsed.host === window.location.host) {
          const path = resolveSafeInternalPath(`${parsed.pathname}${parsed.search}`);
          if (path) return path;
        }
      } catch {
        /* ignore */
      }
      continue;
    }

    try {
      const path = resolveSafeInternalPath(decodeURIComponent(raw));
      if (path) return path;
    } catch {
      const path = resolveSafeInternalPath(raw);
      if (path) return path;
    }
  }

  return null;
}

function resolveDefaultBusinessPath(businesses) {
  if (!businesses?.length) return resolveOnboardingRegisterPath();
  if (businesses.length === 1) {
    const d = String(businesses[0].domain || '').trim().toLowerCase();
    return `/business/${encodeURIComponent(d)}`;
  }
  return '/multi-business';
}

function resolvePostAuthDestination(businesses, returnPath) {
  if (!returnPath) return resolveDefaultBusinessPath(businesses);

  if (!businesses?.length) {
    if (returnPath.startsWith('/admin')) return resolveOnboardingRegisterPath();
    return returnPath;
  }

  const primary = businesses[0];
  const approvalStatus = String(primary?.approval_status || '');
  const needsApproval = BLOCKED_APPROVAL_STATUSES.has(approvalStatus);

  if (needsApproval && returnPath.startsWith('/business/')) {
    return '/pending-approval';
  }

  if (returnPath.startsWith('/business/') && businesses.length > 1) {
    const segment = returnPath.split('/')[2]?.toLowerCase();
    const allowed = businesses.some(
      (biz) => String(biz.domain || '').trim().toLowerCase() === segment
    );
    if (!allowed) return '/multi-business';
  }

  return returnPath;
}

/**
 * After Better Auth session is established (password, OTP, or OAuth),
 * route the user to their workspace or onboarding.
 *
 * @param {import('next/navigation').AppRouterInstance} router
 * @param {{ id: string; name?: string | null; email?: string | null }} user
 */
export async function redirectAfterAuth(router, user) {
  if (!user?.id) return;

  const returnPath = readPostAuthReturnPath();

  const firstName =
    (typeof user.name === 'string' && user.name.trim().split(/\s+/)[0]) ||
    (typeof user.email === 'string' && user.email.split('@')[0]) ||
    'there';

  try {
    const businesses = await businessAPI.getByUserId(user.id);
    const destination = resolvePostAuthDestination(businesses, returnPath);

    if (!businesses?.length) {
      notify.success('Signed in. Let’s finish setting up your business.', { id: TOAST_IDS.AUTH_WELCOME });
      router.replace(destination);
      return;
    }

    notify.success(`Welcome back, ${firstName}!`, { id: TOAST_IDS.AUTH_WELCOME });
    router.replace(destination);
  } catch (e) {
    console.error('[redirectAfterAuth]', e);
    router.replace(resolveOnboardingRegisterPath());
  }
}
