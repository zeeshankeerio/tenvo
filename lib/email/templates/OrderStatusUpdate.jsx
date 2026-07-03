import { Html, Head, Preview, Body, Container, Section, Text, Heading, Row, Column } from '@react-email/components';

const STATUS_META = {
  new_order: {
    accent: '#111827',
    heading: 'New order received',
    intro: (n, biz) => `A new order #${n} has just been placed on your ${biz} store. Review and fulfil it from your dashboard.`,
    closing: 'Log in to your Tenvo dashboard to confirm, pack, and ship this order.',
  },
  processing: {
    accent: '#2563eb',
    heading: 'Your order is being prepared',
    intro: (n, biz) => `Good news! Your order #${n} from ${biz} is now being processed and prepared for dispatch.`,
    closing: 'We will let you know as soon as it ships.',
  },
  shipped: {
    accent: '#22c55e',
    heading: 'Your order has shipped',
    intro: (n, biz) => `Great news! Your order #${n} from ${biz} has been shipped and is on its way.`,
    closing: 'Estimated delivery: 3-5 business days.',
  },
  delivered: {
    accent: '#16a34a',
    heading: 'Your order has been delivered',
    intro: (n, biz) => `Your order #${n} from ${biz} has been delivered. We hope you love it!`,
    closing: 'Thank you for shopping with us. We would love to hear your feedback.',
  },
  cancelled: {
    accent: '#dc2626',
    heading: 'Your order has been cancelled',
    intro: (n, biz) => `Your order #${n} from ${biz} has been cancelled. Any authorized payment will be refunded per our policy.`,
    closing: 'If this was unexpected, please reply to this email and we will help.',
  },
  refunded: {
    accent: '#7c3aed',
    heading: 'Your order has been refunded',
    intro: (n, biz) => `A refund has been issued for your order #${n} from ${biz}.`,
    closing: 'Refunds may take a few business days to appear on your statement.',
  },
};

/**
 * Generic, status-aware order update email for the public storefront.
 * @param {{ order: { orderNumber: string, items?: Array<{ name: string, quantity: number, variantName?: string }>, total?: number, currency?: string }, business: { name: string, email?: string }, status: string }} props
 */
export function OrderStatusUpdateEmail({ order, business, status }) {
  const meta = STATUS_META[status] || STATUS_META.processing;
  const currency = order.currency || 'PKR';
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <Html>
      <Head />
      <Preview>{meta.heading} — order #{order.orderNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ ...header, backgroundColor: meta.accent }}>
            <Heading style={headerTitle}>{meta.heading}</Heading>
          </Section>

          <Section style={content}>
            <Text style={paragraph}>{meta.intro(order.orderNumber, business.name)}</Text>

            {items.length > 0 && (
              <Section style={orderSection}>
                <Heading style={sectionTitle}>Order Summary</Heading>
                {items.map((item, index) => (
                  <Row key={index} style={itemRow}>
                    <Column style={itemNameColumn}>
                      <Text style={itemName}>{item.name}</Text>
                      {item.variantName && <Text style={itemVariant}>{item.variantName}</Text>}
                      <Text style={itemQuantity}>Qty: {item.quantity}</Text>
                    </Column>
                  </Row>
                ))}
                {typeof order.total === 'number' && (
                  <Row style={totalRow}>
                    <Column style={totalLabelColumn}>
                      <Text style={totalLabel}>Total</Text>
                    </Column>
                    <Column style={totalValueColumn}>
                      <Text style={totalValue}>
                        {new Intl.NumberFormat('en-PK', { style: 'currency', currency }).format(order.total)}
                      </Text>
                    </Column>
                  </Row>
                )}
              </Section>
            )}

            <Text style={paragraph}>{meta.closing}</Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Questions? Contact us at{' '}
              <a href={`mailto:${business.email}`} style={{ ...link, color: meta.accent }}>
                {business.email}
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px',
  maxWidth: '600px',
};

const header = {
  padding: '40px 20px',
  textAlign: 'center',
  borderRadius: '8px 8px 0 0',
};

const headerTitle = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const content = {
  padding: '40px 20px',
};

const paragraph = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const orderSection = {
  margin: '32px 0',
  padding: '24px 0',
  borderTop: '1px solid #e5e7eb',
  borderBottom: '1px solid #e5e7eb',
};

const sectionTitle = {
  color: '#111827',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 20px',
};

const itemRow = { marginBottom: '16px' };
const itemNameColumn = { width: '100%' };
const itemName = { color: '#111827', fontSize: '14px', fontWeight: '600', margin: '0 0 4px' };
const itemVariant = { color: '#6b7280', fontSize: '12px', margin: '0 0 4px' };
const itemQuantity = { color: '#9ca3af', fontSize: '12px', margin: '0' };
const totalRow = { marginTop: '16px', paddingTop: '16px', borderTop: '2px solid #e5e7eb' };
const totalLabelColumn = { width: '50%' };
const totalValueColumn = { width: '50%', textAlign: 'right' };
const totalLabel = { color: '#111827', fontSize: '18px', fontWeight: 'bold', margin: '0' };
const totalValue = { color: '#111827', fontSize: '20px', fontWeight: 'bold', margin: '0' };
const footer = { padding: '30px 20px', textAlign: 'center', borderTop: '1px solid #e5e7eb' };
const footerText = { color: '#6b7280', fontSize: '14px', margin: '0' };
const link = { textDecoration: 'none' };

export default OrderStatusUpdateEmail;
