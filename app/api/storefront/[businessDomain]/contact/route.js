import { NextResponse } from 'next/server';
import { getBusinessByDomain } from '@/lib/actions/storefront/business';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { StorefrontContactNotification } from '@/lib/email/templates/StorefrontContactNotification';
import { resolveStoreContact } from '@/lib/storefront/businessContact';
import { STOREFRONT_CONTACT_SUBJECTS } from '@/lib/dashboard/domainOperationsSubjects';
import { notifyStorefrontContact } from '@/lib/notifications/notificationHelpers';
import pool from '@/lib/db';

const SUBJECTS = new Set(STOREFRONT_CONTACT_SUBJECTS);

function clip(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export async function POST(request, { params }) {
  const { businessDomain } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const name = clip(body.name, 120);
  const email = clip(body.email, 320);
  const phone = clip(body.phone, 40);
  const subjectKey = clip(body.subject, 64) || 'general';
  const message = clip(body.message, 2000);
  const orderNumber = clip(body.orderNumber, 64);
  const preferredDate = clip(body.preferredDate, 32);
  const preferredTime = clip(body.preferredTime, 32);
  const showroomLocation = clip(body.showroomLocation, 64);
  const vehicleInterest = clip(body.vehicleInterest, 200);

  let storedMessage = message;
  const extras = [];
  if (preferredDate) extras.push(`Preferred date: ${preferredDate}`);
  if (preferredTime) extras.push(`Preferred time: ${preferredTime}`);
  if (showroomLocation) extras.push(`Showroom branch: ${showroomLocation}`);
  if (vehicleInterest) extras.push(`Vehicle interest: ${vehicleInterest}`);
  if (extras.length) {
    storedMessage = `${extras.join('\n')}\n\n${message}`;
  }

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Please enter your name' }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 });
  }
  if (!SUBJECTS.has(subjectKey)) {
    return NextResponse.json({ error: 'Please select a valid subject' }, { status: 400 });
  }
  if (!message || message.length < 10) {
    return NextResponse.json({ error: 'Message must be at least 10 characters' }, { status: 400 });
  }

  const bizResult = await getBusinessByDomain(businessDomain);
  if (!bizResult.success) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  const { business, settings } = bizResult;
  const contact = resolveStoreContact({ business, settings });
  const ownerEmail = contact.email;

  const client = await pool.connect();
  let contactId = null;
  try {
    const insertResult = await client.query(
      `INSERT INTO storefront_contact_messages (
        business_id, customer_name, customer_email, customer_phone,
        subject, message, order_number, status, created_at, updated_at
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, 'new', NOW(), NOW())
      RETURNING id`,
      [
        business.id,
        name,
        email.toLowerCase(),
        phone || null,
        subjectKey,
        storedMessage,
        orderNumber || null,
      ]
    );
    contactId = insertResult.rows[0]?.id;
    
    // Create notification for business
    if (contactId) {
      try {
        await notifyStorefrontContact({
          businessId: business.id,
          business,
          contactId,
          customerName: name,
          customerEmail: email,
          subject: subjectKey,
          client,
        });
      } catch (notifyErr) {
        console.warn('[storefront/contact] notification skipped:', notifyErr?.message || notifyErr);
      }
    }
  } catch (dbErr) {
    if (dbErr.code === '42P01') {
      console.error('[storefront/contact] storefront_contact_messages missing — run bun run db:migrate');
    } else {
      console.error('[storefront/contact] insert failed:', dbErr.message);
    }
    return NextResponse.json(
      { error: 'Contact form is temporarily unavailable. Please call or email the store directly.' },
      { status: 503 }
    );
  } finally {
    client.release();
  }

  if (ownerEmail) {
    const subjectLabel = subjectKey.charAt(0).toUpperCase() + subjectKey.slice(1);
    const mail = await sendTransactionalEmail({
      to: ownerEmail,
      replyTo: email,
      subject: `[${contact.storeName}] ${subjectLabel}, ${name}`,
      react: StorefrontContactNotification({
        storeName: contact.storeName,
        name,
        email,
        phone,
        orderNumber,
        subjectLabel,
        message: storedMessage,
      }),
    });

    if (!mail.success && !mail.skipped) {
      return NextResponse.json(
        { error: 'Could not deliver your message right now. Please call or email the store directly.' },
        { status: 503 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    message: ownerEmail
      ? 'Your message was sent. The store will reply soon.'
      : 'Your message was received.',
  });
}
