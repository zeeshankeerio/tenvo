import * as React from 'react';

/**
 * Simple outreach email for campaign_messages (Resend / React Email compatible).
 */
export function CampaignOutreachEmail({ businessName, campaignName, body, customerName }) {
  const greeting = customerName ? `Hi ${customerName},` : 'Hello,';
  const text = body || `You have an update from ${businessName || 'your store'}.`;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#111827', lineHeight: 1.5 }}>
      <p style={{ fontSize: 16, margin: '0 0 12px' }}>{greeting}</p>
      <p style={{ fontSize: 14, margin: '0 0 16px' }}>{text}</p>
      {campaignName ? (
        <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
          Sent via {businessName || 'Tenvo'} campaigns ({campaignName})
        </p>
      ) : null}
    </div>
  );
}
