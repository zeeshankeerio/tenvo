/**
 * Hub layout — server-side session guard before client shell renders.
 * Hydrates AuthContext with the already-validated session so tenant sync
 * does not wait on a second Better Auth client round-trip.
 */
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/rbac';
import { BusinessShellLayout } from '@/components/layout/BusinessShellLayout';
import {
  HubSessionHydrator,
  toHubSessionHint,
} from '@/components/guards/HubSessionHydrator';

export default async function BusinessLayout({ children }) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/login');
  }

  const initialSession = toHubSessionHint(session);

  return (
    <HubSessionHydrator initialSession={initialSession}>
      <BusinessShellLayout>{children}</BusinessShellLayout>
    </HubSessionHydrator>
  );
}
