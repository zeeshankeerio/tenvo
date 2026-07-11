'use client';

import { useLayoutEffect, useRef } from 'react';
import { useAuth } from '@/lib/context/AuthContext';

/**
 * Apply a server-validated session hint on hub routes so AuthContext / tenant
 * sync do not wait on authClient.useSession() after the layout already
 * called getServerSession().
 *
 * Uses useLayoutEffect so hydration lands before browser paint.
 * Client session remains source of truth once Better Auth finishes revalidating.
 */
export function HubSessionHydrator({ initialSession, children }) {
  const { hydrateFromServer } = useAuth();
  const appliedKeyRef = useRef(null);

  useLayoutEffect(() => {
    const userId = initialSession?.user?.id;
    if (!userId) return;
    if (appliedKeyRef.current === userId) return;
    appliedKeyRef.current = userId;
    hydrateFromServer(initialSession);
  }, [initialSession, hydrateFromServer]);

  return children;
}

/**
 * Strip non-serializable fields for the client boundary.
 * @param {{ user?: Record<string, unknown>, session?: Record<string, unknown> } | null} session
 */
export function toHubSessionHint(session) {
  if (!session?.user?.id) return null;
  const user = session.user;
  const rawSession = session.session;

  let expiresAt = null;
  if (rawSession?.expiresAt) {
    expiresAt =
      typeof rawSession.expiresAt === 'string'
        ? rawSession.expiresAt
        : new Date(rawSession.expiresAt).toISOString();
  }

  return {
    user: {
      id: String(user.id),
      email: user.email != null ? String(user.email) : null,
      name: user.name != null ? String(user.name) : null,
      image: user.image != null ? String(user.image) : null,
      role: user.role != null ? String(user.role) : null,
    },
    session: {
      id: rawSession?.id != null ? String(rawSession.id) : null,
      userId: String(rawSession?.userId || user.id),
      expiresAt,
    },
  };
}

export default HubSessionHydrator;
