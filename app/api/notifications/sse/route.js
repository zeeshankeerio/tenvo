import pool from '@/lib/db';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

// SSE endpoint for real-time notifications
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

  const encoder = new TextEncoder();
  let lastCheck = new Date();
  let isActive = true;

  /** Avoid ERR_INVALID_STATE when the client disconnects and the controller is already closed. */
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
      // Send initial connection message
      if (!safeEnqueue(controller, 'data: {"type":"connected"}\n\n')) {
        isActive = false;
        return;
      }

      // Check for new notifications every 3 seconds (SSE fallback)
      const interval = setInterval(async () => {
        if (!isActive) {
          clearInterval(interval);
          return;
        }

        try {
          const client = await pool.connect();
          
          try {
            // Get new notifications since last check
            const result = await client.query(
              `SELECT 
                id, type, title, message, metadata, action_url, created_at
              FROM notifications 
              WHERE business_id = $1 
                AND created_at > $2 
                AND is_dismissed = false
              ORDER BY created_at DESC`,
              [businessId, lastCheck]
            );

            if (result.rows.length > 0) {
              // Update last check time
              lastCheck = new Date();
              
              // Send notifications to client
              for (const notification of result.rows) {
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
            
          } finally {
            client.release();
          }
        } catch (error) {
          console.error('SSE error:', error);
          if (
            !safeEnqueue(
              controller,
              `data: {"type":"error","message":"${String(error?.message || 'error').replace(/"/g, "'")}"}\n\n`
            )
          ) {
            isActive = false;
            clearInterval(interval);
          }
        }
      }, 3000);

      // Clean up on close
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
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
