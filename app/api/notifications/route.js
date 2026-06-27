import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import pool from '@/lib/db';
import { auth } from '@/lib/auth';
import { verifyBusinessAccess } from '@/lib/auth/access';

async function assertNotificationBusinessAccess(session, businessId, client = null) {
  await verifyBusinessAccess(session.user.id, businessId, [], client, session.user);
}

// GET /api/notifications - Get notifications for business
export async function GET(request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      await assertNotificationBusinessAccess(session, businessId, client);
      let query = `
        SELECT 
          id,
          type,
          title,
          message,
          metadata,
          is_read,
          action_url,
          created_at
        FROM notifications
        WHERE business_id = $1 AND is_dismissed = false
      `;
      
      const params = [businessId];
      
      if (unreadOnly) {
        query += ' AND is_read = false';
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const result = await client.query(query, params);
      
      // Get unread count
      const countResult = await client.query(
        'SELECT COUNT(*) as unread_count FROM notifications WHERE business_id = $1 AND is_read = false AND is_dismissed = false',
        [businessId]
      );
      
      return NextResponse.json({
        notifications: result.rows,
        unreadCount: parseInt(countResult.rows[0].unread_count)
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, businessId, markAllRead } = body;

    const client = await pool.connect();

    try {
      if (markAllRead && businessId) {
        await assertNotificationBusinessAccess(session, businessId, client);
        await client.query(
          'UPDATE notifications SET is_read = true WHERE business_id = $1',
          [businessId]
        );
      } else if (notificationId) {
        const owned = await client.query(
          'SELECT business_id FROM notifications WHERE id = $1',
          [notificationId]
        );
        if (!owned.rows.length) {
          return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
        }
        await assertNotificationBusinessAccess(session, owned.rows[0].business_id, client);
        await client.query(
          'UPDATE notifications SET is_read = true WHERE id = $1',
          [notificationId]
        );
      }
      
      return NextResponse.json({ success: true });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/notifications - Dismiss notification
export async function DELETE(request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      const owned = await client.query(
        'SELECT business_id FROM notifications WHERE id = $1',
        [notificationId]
      );
      if (!owned.rows.length) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }
      await assertNotificationBusinessAccess(session, owned.rows[0].business_id, client);

      await client.query(
        'UPDATE notifications SET is_dismissed = true WHERE id = $1',
        [notificationId]
      );
      
      return NextResponse.json({ success: true });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error dismissing notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
