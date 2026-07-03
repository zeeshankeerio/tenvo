import { Resend } from 'resend';
import { OrderConfirmationEmail } from './templates/OrderConfirmation';
import { WelcomeEmail } from './templates/Welcome';
import { PasswordResetEmail } from './templates/PasswordReset';
import { LowStockAlertEmail } from './templates/LowStockAlert';
import { ShipmentNotificationEmail } from './templates/ShipmentNotification';
import { OrderStatusUpdateEmail } from './templates/OrderStatusUpdate';
import { assertEmailDeliveryReady } from './emailDeliveryConfig';

const FALLBACK_FROM = 'Tenvo <notifications@tenvo.app>';

function resolveFrom(explicit) {
  if (explicit) return explicit;
  const env = process.env.RESEND_FROM?.trim();
  if (env) return env;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('RESEND_FROM must be set in production to a verified sender address.');
  }
  return FALLBACK_FROM;
}

// Lazy initialization of Resend - only create instance when needed
let resendInstance = null;
function getResend() {
  if (!resendInstance && process.env.RESEND_API_KEY) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

/**
 * Send transactional email
 */
export async function sendTransactionalEmail({
  to,
  subject,
  react,
  html,
  from,
  replyTo,
  attachments,
  bcc,
}) {
  const fromAddress = resolveFrom(from);
  assertEmailDeliveryReady();
  // Skip if no Resend API key (development mode)
  const resend = getResend();
  if (!resend) {
    console.log('[Email] Resend not configured, skipping email:', { to, subject });
    return { success: true, skipped: true };
  }

  const bccList =
    bcc === undefined || bcc === null
      ? undefined
      : (Array.isArray(bcc) ? bcc : [bcc]).filter(Boolean);

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      ...(react ? { react } : {}),
      ...(html ? { html } : {}),
      replyTo,
      attachments,
      ...(bccList?.length ? { bcc: bccList } : {}),
    });
    
    if (error) {
      console.error('[Email] Send failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('[Email] Sent successfully:', { to, subject, id: data.id });
    return { success: true, id: data.id };
    
  } catch (err) {
    console.error('[Email] Exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail({ to, order, business }) {
  return sendTransactionalEmail({
    to,
    subject: `Order Confirmation #${order.orderNumber} - ${business.name}`,
    react: OrderConfirmationEmail({ order, business }),
    replyTo: business.email,
  });
}

/**
 * Send welcome email to new customer
 */
export async function sendWelcomeEmail({ to, customer, business }) {
  return sendTransactionalEmail({
    to,
    subject: `Welcome to ${business.name}!`,
    react: WelcomeEmail({ customer, business }),
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail({ to, resetUrl, business }) {
  return sendTransactionalEmail({
    to,
    subject: 'Reset Your Password',
    react: PasswordResetEmail({ resetUrl, business }),
  });
}

/**
 * Send low stock alert to business owner
 */
export async function sendLowStockAlert({ to, products, business }) {
  return sendTransactionalEmail({
    to,
    subject: `Low Stock Alert - ${products.length} Products`,
    react: LowStockAlertEmail({ products, business }),
  });
}

/**
 * Send shipment notification
 */
export async function sendShipmentNotification({ to, order, tracking, business }) {
  return sendTransactionalEmail({
    to,
    subject: `Your Order #${order.orderNumber} Has Shipped!`,
    react: ShipmentNotificationEmail({ order, tracking, business }),
    replyTo: business?.email,
  });
}

const ORDER_STATUS_SUBJECTS = {
  processing: (n, biz) => `Order #${n} is being prepared - ${biz}`,
  shipped: (n) => `Your Order #${n} Has Shipped!`,
  delivered: (n, biz) => `Order #${n} delivered - ${biz}`,
  cancelled: (n, biz) => `Order #${n} cancelled - ${biz}`,
  refunded: (n, biz) => `Order #${n} refunded - ${biz}`,
};

/**
 * Send a generic, status-aware order update email to the customer.
 */
export async function sendOrderStatusUpdateEmail({ to, order, business, status }) {
  const subjectFn = ORDER_STATUS_SUBJECTS[status] || ORDER_STATUS_SUBJECTS.processing;
  return sendTransactionalEmail({
    to,
    subject: subjectFn(order.orderNumber, business.name),
    react: OrderStatusUpdateEmail({ order, business, status }),
    replyTo: business?.email,
  });
}

/**
 * Notify the merchant that a new online order was received.
 */
export async function sendNewOrderMerchantEmail({ to, order, business }) {
  return sendTransactionalEmail({
    to,
    subject: `New order #${order.orderNumber} - ${business.name}`,
    react: OrderStatusUpdateEmail({
      order,
      business,
      status: 'new_order',
    }),
    replyTo: order?.customerEmail,
  });
}

/**
 * Send abandoned cart reminder
 */
export async function sendAbandonedCartEmail({ to, cart, business }) {
  return sendTransactionalEmail({
    to,
    subject: 'You left something in your cart...',
    react: AbandonedCartEmail({ cart, business }),
  });
}

// Template components
function AbandonedCartEmail({ cart, business }) {
  return (
    <div>
      <h1>Don't forget about your cart!</h1>
      <p>You have {cart.items.length} items waiting in your cart at {business.name}.</p>
      {/* Cart items and CTA */}
    </div>
  );
}
