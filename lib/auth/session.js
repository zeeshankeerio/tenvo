import 'server-only';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

/**
 * Resolve the current Better Auth session for Route Handlers and Server Actions.
 * @returns {Promise<{ user: { id: string; email?: string | null; name?: string | null; role?: string | null; [key: string]: unknown }; session: unknown } | null>}
 */
export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return { user: session.user, session };
}
