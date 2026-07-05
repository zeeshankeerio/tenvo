export const dynamic = 'force-dynamic';

import { prismaBase } from '@/lib/db';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { verifyBusinessAccess } from '@/lib/auth/access';

/** Poll interval — longer cadence reduces DB load (was 5s). */
const POLL_MS = 15000;

function isMissingNotificationsTable(error) {
  const code = error?.code;
  const message = String(error?.message || '');
  return (
    code === 'P2021' ||
    code === '42P01' ||
    /relation "notifications" does not exist/i.test(message)
  );
}

/** SSE endpoint for real-time notifications (poll fallback). */
export async function GET(request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('businessId');

  if (!businessId) {
    return new Response('Business ID required', { status: 400 });
  }

  try {
    await verifyBusinessAccess(session.user.id, businessId, [], null, session.user);
  } catch {
    return new Response('Forbidden', { status: 403 });
  }

  const encoder = new TextEncoder();
  let lastCheck = new Date();
  let isActive = true;
  let consecutiveErrors = 0;
  /** @type {string | null} */
  let lastNotificationSignature = null;

  function safeEnqueue(controllerRef, text) {
    try {
      controllerRef.enqueue(encoder.encode(text));
      return true;
    } catch {
      return false;
    }
  }

  const stream = new ReadableStream({
    start(controller) {
      if (!safeEnqueue(controller, 'data: {"type":"connected"}\n\n')) {
        isActive = false;
        return;
      }

      const interval = setInterval(async () => {
        if (!isActive) {
          clearInterval(interval);
          return;
        }

        try {
          const latest = await prismaBase.notifications.findFirst({
            where: {
              business_id: businessId,
              is_dismissed: false,
            },
            orderBy: { created_at: 'desc' },
            select: { id: true, created_at: true },
          });

          const signature = latest
            ? `${latest.id}:${latest.created_at?.getTime?.() ?? latest.created_at}`
            : 'none';

          if (signature === lastNotificationSignature) {
            if (!safeEnqueue(controller, 'data: {"type":"heartbeat"}\n\n')) {
              isActive = false;
              clearInterval(interval);
            }
            consecutiveErrors = 0;
            return;
          }

          lastNotificationSignature = signature;

          const rows = await prismaBase.notifications.findMany({
            where: {
              business_id: businessId,
              is_dismissed: false,
              created_at: { gt: lastCheck },
            },
            orderBy: { created_at: 'desc' },
            select: {
              id: true,
              type: true,
              title: true,
              message: true,
              metadata: true,
              action_url: true,
              created_at: true,
              is_read: true,
            },
          });

          consecutiveErrors = 0;

          if (rows.length > 0) {
            lastCheck = new Date();
            for (const notification of rows) {
              if (
                !safeEnqueue(
                  controller,
                  `data: ${JSON.stringify({ type: 'notification', data: notification })}\n\n`
                )
              ) {
                isActive = false;
                clearInterval(interval);
                return;
              }
            }
          }

          if (!safeEnqueue(controller, 'data: {"type":"heartbeat"}\n\n')) {
            isActive = false;
            clearInterval(interval);
          }
        } catch (error) {
          consecutiveErrors += 1;
          const fatal = isMissingNotificationsTable(error);
          const message = fatal
            ? 'Notifications table is not available on this database'
            : (error?.message || 'Notification stream unavailable');

          console.error('[Notifications SSE]', message);

          safeEnqueue(
            controller,
            `data: ${JSON.stringify({
              type: 'error',
              message,
              fatal,
              retryable: !fatal && consecutiveErrors < 3,
            })}\n\n`
          );

          if (fatal || consecutiveErrors >= 5) {
            isActive = false;
            clearInterval(interval);
            try {
              controller.close();
            } catch {
              // already closed
            }
          }
        }
      }, POLL_MS);

      request.signal.addEventListener('abort', () => {
        isActive = false;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
